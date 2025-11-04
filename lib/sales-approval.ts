import {
  PaymentCondition,
  SaleOrderStatus,
  SaleOrderWorkflowStatus,
} from "@prisma/client";

const DEFAULT_AUTO_APPROVE_MAX_AMOUNT = Number(
  process.env.SALES_AUTO_APPROVE_MAX_AMOUNT ?? 100000,
);
const DEFAULT_AUTO_APPROVE_MAX_PERCENT = Number(
  process.env.SALES_AUTO_APPROVE_MAX_PERCENT ?? 30,
);

export type EvaluateWorkflowInput = {
  paymentCondition: PaymentCondition;
  grandTotal: number;
  upfrontPaymentPercent?: number | null;
  creditLimit?: number | null;
  relationshipScore?: number | null;
};

export type EvaluateWorkflowResult = {
  workflowStatus: SaleOrderWorkflowStatus;
  baseStatus: SaleOrderStatus;
  autoApprovedBySystem: boolean;
  creditEvaluationNote?: string;
};

export function mapWorkflowStatusToBaseStatus(
  workflow: SaleOrderWorkflowStatus,
): SaleOrderStatus {
  switch (workflow) {
    case "WAITING_MANAGER_APPROVAL":
    case "WAITING_CREDIT_EXTENSION":
      return "CONFIRMED";
    case "WAITING_PAYMENT_CONFIRMATION":
    case "AUTO_APPROVED":
    case "APPROVED":
    case "PENDING_SHIPMENT":
      return "APPROVED";
    case "SHIPPED":
      return "SHIPPED";
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

export function evaluateSaleOrderWorkflow(
  input: EvaluateWorkflowInput,
): EvaluateWorkflowResult {
  const {
    paymentCondition,
    grandTotal,
    upfrontPaymentPercent = 0,
    creditLimit,
    relationshipScore,
  } = input;

  let workflowStatus: SaleOrderWorkflowStatus = "DRAFT";
  let autoApprovedBySystem = false;
  let note: string | undefined;

  if (paymentCondition === "PREPAID") {
    workflowStatus = "WAITING_MANAGER_APPROVAL";
    note = "PREPAID: awaiting sales manager approval.";
  } else {
    if (typeof creditLimit === "number" && !Number.isNaN(creditLimit)) {
      if (grandTotal <= creditLimit) {
        workflowStatus = "WAITING_MANAGER_APPROVAL";
        note = `เครดิตเพียงพอ วงเงินคงเหลือ ${creditLimit.toLocaleString()}`;
      } else {
        const maxAmount =
          Number.isFinite(DEFAULT_AUTO_APPROVE_MAX_AMOUNT) &&
          DEFAULT_AUTO_APPROVE_MAX_AMOUNT > 0
            ? DEFAULT_AUTO_APPROVE_MAX_AMOUNT
            : 100000;
        const maxPercent =
          Number.isFinite(DEFAULT_AUTO_APPROVE_MAX_PERCENT) &&
          DEFAULT_AUTO_APPROVE_MAX_PERCENT >= 0
            ? DEFAULT_AUTO_APPROVE_MAX_PERCENT
            : 30;

        if (grandTotal <= maxAmount && upfrontPaymentPercent <= maxPercent) {
          workflowStatus = "AUTO_APPROVED";
          autoApprovedBySystem = true;
          note =
            "ระบบอนุมัติอัตโนมัติ: วงเงินไม่เกินเกณฑ์และเปอร์เซ็นต์ชำระเงินอยู่ในช่วงที่กำหนด";
        } else {
          workflowStatus = "WAITING_CREDIT_EXTENSION";
          note =
            relationshipScore && relationshipScore < 3
              ? "เครดิตไม่เพียงพอ คะแนนความสัมพันธ์ต่ำ ต้องขอเพิ่มวงเงิน"
              : "เครดิตไม่เพียงพอ ต้องให้ธุรการขายดำเนินการขอเพิ่มวงเงิน";
        }
      }
    } else {
      // ไม่มีข้อมูลเครดิต ให้ผู้จัดการตรวจสอบ
      workflowStatus = "WAITING_MANAGER_APPROVAL";
      note = "ไม่พบวงเงินเครดิตลูกค้า ส่งให้ผู้จัดการตรวจสอบ";
    }
  }

  const baseStatus = mapWorkflowStatusToBaseStatus(workflowStatus);

  return {
    workflowStatus,
    baseStatus,
    autoApprovedBySystem,
    creditEvaluationNote: note,
  };
}

export function shouldCommitStock(
  workflowStatus: SaleOrderWorkflowStatus,
): boolean {
  switch (workflowStatus) {
    case "WAITING_PAYMENT_CONFIRMATION":
    case "AUTO_APPROVED":
    case "APPROVED":
    case "PENDING_SHIPMENT":
    case "SHIPPED":
      return true;
    default:
      return false;
  }
}
