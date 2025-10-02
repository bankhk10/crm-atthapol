import { AuditAction, Prisma, PrismaClient } from "@prisma/client";

type GlobalPrismaStore = {
  prisma: PrismaClient | undefined;
  prismaHelper: PrismaClient | undefined;
};

const globalForPrisma = global as unknown as GlobalPrismaStore;

type ReadDelegate = {
  findFirst?: (args: Record<string, unknown>) => Promise<unknown>;
  findMany?: (args: Record<string, unknown>) => Promise<unknown>;
};

const SOFT_DELETE_MODELS = new Set<Prisma.ModelName>([
  "User",
  "Employee",
  "Account",
  "Session",
  "VerificationToken",
  "RoleDefinition",
  "Permission",
  "RolePermission",
  "AuditLog",
]);

const STATUS_KEYS = ["status", "approvalStatus", "state"];

const ensureHelperClient = () => {
  if (!globalForPrisma.prismaHelper) {
    globalForPrisma.prismaHelper = new PrismaClient();
  }
  return globalForPrisma.prismaHelper;
};

const getDelegate = (client: PrismaClient, model: Prisma.ModelName) => {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (client as Record<string, unknown>)[key] as ReadDelegate | undefined;
};

const sanitizeData = (data: unknown): unknown => {
  if (data === null || data === undefined) return null;
  if (data instanceof Date) return data.toISOString();
  if (typeof data === "bigint") return data.toString();
  if (Array.isArray(data)) return data.map((item) => sanitizeData(item));
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, sanitizeData(value)]);
    return Object.fromEntries(entries);
  }
  return data;
};

const extractStatusValue = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;

  const payload = data as Record<string, unknown>;

  for (const key of STATUS_KEYS) {
    if (!(key in payload)) continue;
    const value = payload[key];

    if (value && typeof value === "object" && "set" in (value as Record<string, unknown>)) {
      const setValue = (value as Record<string, unknown>).set;
      if (typeof setValue === "string") return setValue;
    }

    if (typeof value === "string") return value;
  }

  return undefined;
};

const resolveAuditAction = (
  defaultAction: AuditAction,
  paramsAction: Prisma.MiddlewareParams["action"],
  data: unknown,
): AuditAction => {
  if (paramsAction === "update" || paramsAction === "updateMany") {
    const statusValue = extractStatusValue(data);
    if (statusValue) {
      const normalized = statusValue.toUpperCase();
      if (normalized === "APPROVED") return AuditAction.APPROVE;
      if (normalized === "REJECTED") return AuditAction.REJECT;
    }
  }

  return defaultAction;
};

const buildRecordIdentifier = (
  model: Prisma.ModelName,
  args: Prisma.MiddlewareParams["args"],
  result: unknown,
): string | null => {
  if (result && typeof result === "object" && "id" in (result as Record<string, unknown>)) {
    const idValue = (result as Record<string, unknown>).id;
    if (typeof idValue === "string" || typeof idValue === "number") {
      return String(idValue);
    }
  }

  if (args && typeof args === "object" && "where" in args) {
    try {
      return JSON.stringify((args as Record<string, unknown>).where ?? {});
    } catch (error) {
      console.warn(`[prisma] Unable to serialize record identifier for ${model}`, error);
    }
  }

  return null;
};

const createPrismaClient = () => {
  const helperClient = ensureHelperClient();
  const client = new PrismaClient();

  client.$use(async (params, next) => {
    if (!params.model || !SOFT_DELETE_MODELS.has(params.model as Prisma.ModelName)) {
      return next(params);
    }

    const modelName = params.model as Prisma.ModelName;
    const delegate = getDelegate(helperClient, modelName);
    const shouldLog = modelName !== "AuditLog" && Boolean(delegate);

    const ensureWhere = () => {
      if (!params.args) params.args = {};
      if (!("where" in params.args)) {
        (params.args as Record<string, unknown>).where = {};
      }
      return (params.args as Record<string, unknown>).where as Record<string, unknown>;
    };

    const cloneWhere = () => {
      const where = ensureWhere();
      return JSON.parse(JSON.stringify(where));
    };

    if (params.action === "findUnique") {
      params.action = "findFirst";
      const where = ensureWhere();
      if (!("deletedAt" in where)) where.deletedAt = null;
    } else if (["findFirst", "findMany", "count"].includes(params.action)) {
      const where = ensureWhere();
      if (!("deletedAt" in where)) where.deletedAt = null;
    } else if (params.action === "update" || params.action === "updateMany") {
      const where = ensureWhere();
      if (!("deletedAt" in where)) where.deletedAt = null;
    }

    let auditAction: AuditAction | null = null;
    let beforeData: unknown;
    let afterData: unknown;
    let whereForLogging: Record<string, unknown> | undefined;

    const now = new Date();

    if (params.action === "delete" || params.action === "deleteMany") {
      const where = ensureWhere();
      if (!("deletedAt" in where)) where.deletedAt = null;
      whereForLogging = cloneWhere();

      if (shouldLog && delegate) {
        if (params.action === "delete" && delegate.findFirst) {
          beforeData = await delegate.findFirst({ where: whereForLogging });
        }
        if (params.action === "deleteMany" && delegate.findMany) {
          beforeData = await delegate.findMany({ where: whereForLogging });
        }
      }

      params.action = params.action === "delete" ? "update" : "updateMany";
      params.args = {
        where,
        data: { deletedAt: now },
      };
      auditAction = AuditAction.DELETE;
    } else if (params.action === "update" || params.action === "updateMany") {
      whereForLogging = cloneWhere();
      if (shouldLog && delegate) {
        if (params.action === "update" && delegate.findFirst) {
          beforeData = await delegate.findFirst({ where: whereForLogging });
        }
        if (params.action === "updateMany" && delegate.findMany) {
          beforeData = await delegate.findMany({ where: whereForLogging });
        }
      }
      auditAction = AuditAction.UPDATE;
    } else if (params.action === "create" || params.action === "createMany") {
      auditAction = AuditAction.CREATE;
    }

    const result = await next(params);

    if (!shouldLog || !auditAction) {
      return result;
    }

    const currentAction = params.action;

    if (currentAction === "update" || currentAction === "updateMany" || auditAction === AuditAction.DELETE) {
      const where = whereForLogging ?? cloneWhere();
      if (delegate) {
        if (currentAction === "update" && delegate.findFirst) {
          afterData = await delegate.findFirst({ where });
        } else if (delegate.findMany) {
          afterData = await delegate.findMany({ where });
        }
      }
    } else if (currentAction === "create") {
      afterData = result;
    } else if (currentAction === "createMany") {
      afterData = (params.args as Record<string, unknown>)?.data ?? result;
    }

    if (!afterData && (currentAction === "updateMany" || currentAction === "createMany")) {
      const where = whereForLogging ?? cloneWhere();
      if (delegate?.findMany) {
        afterData = await delegate.findMany({ where });
      }
    }

    const action = resolveAuditAction(auditAction, currentAction, (params.args as Record<string, unknown>)?.data);
    const recordId = buildRecordIdentifier(modelName, params.args, result);

    try {
      await helperClient.auditLog.create({
        data: {
          model: modelName,
          action,
          recordId: recordId ?? undefined,
          before: sanitizeData(beforeData) as Prisma.JsonValue,
          after: sanitizeData(afterData ?? result) as Prisma.JsonValue,
        },
      });
    } catch (error) {
      console.error(`[prisma] Failed to record audit log for ${modelName}`, error);
    }

    return result;
  });

  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  ensureHelperClient();
}
