export type PeriodType = "month" | "quarter";

export type ReportPeriod = {
  type: PeriodType;
  year: number;
  month?: number; // 1-12 (when type === 'month')
  quarter?: number; // 1-4 (when type === 'quarter')
};

const TH_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function getCurrentPeriod(): ReportPeriod {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return { type: "month", year: y, month: m };
}

export function parseSearchParams(searchParams?: Record<string, string | string[] | undefined>): ReportPeriod {
  const current = getCurrentPeriod();
  const get = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const type = (get("periodType") as PeriodType) ?? current.type;
  const year = Number(get("year") ?? current.year);
  const month = Number(get("month") ?? current.month);
  const quarter = Number(get("quarter") || Math.floor(((month || 1) - 1) / 3) + 1);

  if (type === "quarter") {
    const q = Math.min(4, Math.max(1, isFinite(quarter) ? quarter : 1));
    return { type: "quarter", year: isFinite(year) ? year : current.year, quarter: q };
  }

  const m = Math.min(12, Math.max(1, isFinite(month) ? month : current.month ?? 1));
  return { type: "month", year: isFinite(year) ? year : current.year, month: m };
}

export function formatPeriodLabel(p: ReportPeriod): string {
  if (p.type === "quarter") {
    const q = p.quarter ?? 1;
    return `ไตรมาส ${q} / ${p.year}`;
  }
  const m = (p.month ?? 1) - 1;
  const name = TH_MONTHS[m] ?? "";
  return `${name} ${p.year}`;
}

