import { Prisma, PrismaClient } from "@prisma/client";

// Use string literals for audit actions at runtime to avoid issues
// when the generated enum is not available during bundling.
const AUDIT = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
} as const;
type AuditAction = typeof AUDIT[keyof typeof AUDIT];

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
  return (client as unknown as Record<string, unknown>)[key] as ReadDelegate | undefined;
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
  paramsAction: string,
  data: unknown,
): AuditAction => {
  if (paramsAction === "update" || paramsAction === "updateMany") {
    const statusValue = extractStatusValue(data);
    if (statusValue) {
      const normalized = statusValue.toUpperCase();
      if (normalized === "APPROVED") return AUDIT.APPROVE;
      if (normalized === "REJECTED") return AUDIT.REJECT;
    }
  }

  return defaultAction;
};

const buildRecordIdentifier = (
  model: Prisma.ModelName,
  args: Record<string, unknown>,
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

const createPrismaClient = (): PrismaClient => {
  const helperClient = ensureHelperClient();
  const baseClient = new PrismaClient();

  const extendedClient = baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SOFT_DELETE_MODELS.has(model as Prisma.ModelName)) {
            return query(args);
          }

          const modelName = model as Prisma.ModelName;
          const delegate = getDelegate(helperClient, modelName);
          const shouldLog = modelName !== "AuditLog" && Boolean(delegate);

          const normalizedArgs = (args ?? {}) as Record<string, unknown>;
          const ensureWhere = () => {
            if (!("where" in normalizedArgs) || normalizedArgs.where === undefined) {
              normalizedArgs.where = {};
            }
            return normalizedArgs.where as Record<string, unknown>;
          };
          const setDeletedFilter = () => {
            const where = ensureWhere();
            if (!("deletedAt" in where)) {
              where.deletedAt = null;
            }
            return where;
          };
          const cloneWhere = () => {
            const where = ensureWhere();
            return JSON.parse(JSON.stringify(where));
          };

          const now = new Date();

          let auditAction: AuditAction | null = null;
          let beforeData: unknown;
          let afterData: unknown;
          let whereForLogging: Record<string, unknown> | undefined;

          if (
            operation === "findFirst" ||
            operation === "findFirstOrThrow" ||
            operation === "findMany" ||
            operation === "count"
          ) {
            setDeletedFilter();
          } else if (operation === "update" || operation === "updateMany") {
            setDeletedFilter();
            whereForLogging = cloneWhere();
            if (shouldLog && delegate) {
              if (operation === "update" && delegate.findFirst) {
                beforeData = await delegate.findFirst({ where: whereForLogging });
              }
              if (operation === "updateMany" && delegate.findMany) {
                beforeData = await delegate.findMany({ where: whereForLogging });
              }
            }
            auditAction = AUDIT.UPDATE;
          } else if (operation === "delete" || operation === "deleteMany") {
            const where = setDeletedFilter();
            whereForLogging = cloneWhere();

            if (shouldLog && delegate) {
              if (operation === "delete" && delegate.findFirst) {
                beforeData = await delegate.findFirst({ where: whereForLogging });
              }
              if (operation === "deleteMany" && delegate.findMany) {
                beforeData = await delegate.findMany({ where: whereForLogging });
              }
            }

            auditAction = AUDIT.DELETE;

            if (operation === "delete") {
              const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
              const modelDelegate = (helperClient as unknown as Record<string, unknown>)[key] as
                | { update: (payload: Record<string, unknown>) => Promise<unknown> }
                | undefined;
              if (!modelDelegate?.update) {
                console.warn(`[prisma] Missing update delegate for ${modelName}`);
                return null;
              }

              const updateArgs = {
                where,
                data: { deletedAt: now },
              };
              const result = await modelDelegate.update(updateArgs);
              afterData = result;

              if (shouldLog) {
                await maybeWriteAuditLog({
                  action: auditAction,
                  helperClient,
                  modelName,
                  operation,
                  args: normalizedArgs,
                  beforeData,
                  afterData,
                  result,
                });
              }

              return result;
            }

            if (operation === "deleteMany") {
              const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
              const modelDelegate = (helperClient as unknown as Record<string, unknown>)[key] as
                | { updateMany: (payload: Record<string, unknown>) => Promise<unknown> }
                | undefined;
              if (!modelDelegate?.updateMany) {
                console.warn(`[prisma] Missing updateMany delegate for ${modelName}`);
                return null;
              }

              const updateArgs = {
                where,
                data: { deletedAt: now },
              };
              const result = await modelDelegate.updateMany(updateArgs);

              if (shouldLog && delegate?.findMany) {
                afterData = await delegate.findMany({ where: whereForLogging });
              }

              if (shouldLog) {
                await maybeWriteAuditLog({
                  action: auditAction,
                  helperClient,
                  modelName,
                  operation,
                  args: normalizedArgs,
                  beforeData,
                  afterData,
                  result,
                });
              }

              return result;
            }
          } else if (operation === "create" || operation === "createMany") {
            auditAction = AUDIT.CREATE;
          }

          const result = await query(normalizedArgs);

          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            if (
              result &&
              typeof result === "object" &&
              "deletedAt" in (result as Record<string, unknown>) &&
              (result as Record<string, unknown>).deletedAt !== null
            ) {
              if (operation === "findUniqueOrThrow") {
                throw createNotFoundError(modelName);
              }
              return null;
            }
            return result;
          }

          if (!shouldLog || !auditAction) {
            return result;
          }

          if (operation === "update" || operation === "updateMany" || auditAction === AUDIT.DELETE) {
            const where = whereForLogging ?? cloneWhere();
            if (delegate) {
              if (operation === "update" && delegate.findFirst) {
                afterData = await delegate.findFirst({ where });
              } else if (delegate.findMany) {
                afterData = await delegate.findMany({ where });
              }
            }
          } else if (operation === "create") {
            afterData = result;
          } else if (operation === "createMany") {
            afterData = normalizedArgs.data ?? result;
          }

          if (!afterData && (operation === "updateMany" || operation === "createMany")) {
            const where = whereForLogging ?? cloneWhere();
            if (delegate?.findMany) {
              afterData = await delegate.findMany({ where });
            }
          }

          await maybeWriteAuditLog({
            action: auditAction,
            helperClient,
            modelName,
            operation,
            args: normalizedArgs,
            beforeData,
            afterData,
            result,
          });

          return result;
        },
      },
    },
  });

  return extendedClient as unknown as PrismaClient;
};

type AuditContext = {
  action: AuditAction;
  helperClient: PrismaClient;
  modelName: Prisma.ModelName;
  operation: string;
  args: Record<string, unknown>;
  beforeData: unknown;
  afterData: unknown;
  result: unknown;
};

const maybeWriteAuditLog = async ({
  action,
  helperClient,
  modelName,
  operation,
  args,
  beforeData,
  afterData,
  result,
}: AuditContext) => {
  if (modelName === "AuditLog") {
    return;
  }

  // If the generated client doesn't include AuditLog (out-of-date generation),
  // or it has been tree-shaken in certain bundles, skip gracefully.
  const auditDelegate = (helperClient as unknown as Record<string, unknown>)["auditLog"] as
    | { create: (payload: Record<string, unknown>) => Promise<unknown> }
    | undefined;
  if (!auditDelegate?.create) {
    // Avoid noisy errors in dev when client isn't regenerated to include AuditLog
    // or when the AuditLog model/table is intentionally absent.
    return;
  }

  const { data } = args as { data?: unknown };
  const resolvedAction = resolveAuditAction(action, operation, data);
  const recordId = buildRecordIdentifier(modelName, args, result);

  try {
    await auditDelegate.create({
      data: {
        model: modelName,
        action: resolvedAction as unknown as Prisma.AuditAction,
        recordId: recordId ?? undefined,
        before: sanitizeData(beforeData) as Prisma.InputJsonValue,
        after: sanitizeData(afterData ?? result) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error(`[prisma] Failed to record audit log for ${modelName}`);
    console.error(error);
  }
};

type NotFoundErrorLike = Error & { code?: string; meta?: Record<string, unknown> };

const createNotFoundError = (modelName: Prisma.ModelName) => {
  const error = new Error(`No ${modelName} found`) as NotFoundErrorLike;
  error.name = "NotFoundError";
  error.code = "P2025";
  error.meta = { modelName };
  return error;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  ensureHelperClient();
}
