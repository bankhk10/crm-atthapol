import { overviewMock, salesMock, marketingMock, activityMock } from "./index";
import type { ReportPeriod } from "@/lib/report-period";

const QUARTER_MONTHS: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

function avg(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function periodMonths(p: ReportPeriod): number[] {
  if (p.type === "month") return [p.month ?? 1];
  return QUARTER_MONTHS[p.quarter ?? 1] ?? [1, 2, 3];
}

function previousPeriod(p: ReportPeriod): ReportPeriod {
  if (p.type === "month") {
    const m = (p.month ?? 1) - 1;
    if (m >= 1) return { type: "month", year: p.year, month: m };
    return { type: "month", year: p.year - 1, month: 12 };
  }
  const q = (p.quarter ?? 1) - 1;
  if (q >= 1) return { type: "quarter", year: p.year, quarter: q };
  return { type: "quarter", year: p.year - 1, quarter: 4 };
}

// Compute multipliers from the 12-month trend in overviewMock
function multipliersFromTrend(p: ReportPeriod) {
  const trend = overviewMock.trend;
  const baseAvg = avg(trend);
  const months = periodMonths(p);
  const monthFactors = months.map((m) => trend[(m - 1) % 12] / baseAvg);
  const meanFactor = avg(monthFactors);

  // Totals multiplier: for month use factor; for quarter approximate 3x of monthly average
  const totalMult = p.type === "month" ? meanFactor : meanFactor * months.length;
  // Rate multiplier (e.g., AOV, CTR): dampen changes
  const rateMult = 1 + (meanFactor - 1) * 0.25;
  return { totalMult, rateMult };
}

function percentDelta(current: number, prev: number) {
  if (!isFinite(prev) || prev === 0) return 0;
  return ((current - prev) / prev) * 100;
}

export function getOverviewForPeriod(p: ReportPeriod) {
  const { totalMult, rateMult } = multipliersFromTrend(p);
  const prev = previousPeriod(p);
  const { totalMult: prevTotal, rateMult: prevRate } = multipliersFromTrend(prev);

  const revenueBase = overviewMock.kpis.revenue.value;
  const ordersBase = overviewMock.kpis.orders.value;
  const aovBase = overviewMock.kpis.aov.value;
  const newCustBase = overviewMock.kpis.newCustomers.value;

  const revenue = Math.round(revenueBase * totalMult);
  const revenuePrev = Math.round(revenueBase * prevTotal);
  const orders = Math.round(ordersBase * totalMult);
  const ordersPrev = Math.round(ordersBase * prevTotal);
  const aov = Math.round(aovBase * rateMult);
  const aovPrev = Math.round(aovBase * prevRate);
  const newCustomers = Math.round(newCustBase * totalMult);
  const newCustomersPrev = Math.round(newCustBase * prevTotal);

  const productScale = totalMult;
  const topProducts = overviewMock.topProducts.map((p) => ({
    ...p,
    units: Math.max(1, Math.round(p.units * productScale)),
    revenue: Math.max(1, Math.round(p.revenue * productScale)),
  }));

  return {
    kpis: {
      revenue: {
        label: overviewMock.kpis.revenue.label,
        value: revenue,
        delta: clamp(percentDelta(revenue, revenuePrev), -99, 999),
        help: overviewMock.kpis.revenue.help,
      },
      orders: {
        label: overviewMock.kpis.orders.label,
        value: orders,
        delta: clamp(percentDelta(orders, ordersPrev), -99, 999),
        help: overviewMock.kpis.orders.help,
      },
      aov: {
        label: overviewMock.kpis.aov.label,
        value: aov,
        delta: clamp(percentDelta(aov, aovPrev), -99, 999),
        help: overviewMock.kpis.aov.help,
      },
      newCustomers: {
        label: overviewMock.kpis.newCustomers.label,
        value: newCustomers,
        delta: clamp(percentDelta(newCustomers, newCustomersPrev), -99, 999),
        help: overviewMock.kpis.newCustomers.help,
      },
    },
    trend: overviewMock.trend,
    topProducts,
    recentActivities: overviewMock.recentActivities,
  };
}

export function getSalesForPeriod(p: ReportPeriod) {
  const { totalMult, rateMult } = multipliersFromTrend(p);

  const channels = salesMock.channels.map((c) => ({ ...c, value: Math.max(1, Math.round(c.value * totalMult)) }));
  const byCategory = salesMock.byCategory.map((c) => ({
    ...c,
    revenue: Math.max(1, Math.round(c.revenue * totalMult)),
    units: Math.max(1, Math.round(c.units * totalMult)),
    avg: Math.max(1, Math.round(c.avg * rateMult)),
  }));
  const topCustomers = salesMock.topCustomers.map((c) => ({
    ...c,
    revenue: Math.max(1, Math.round(c.revenue * totalMult)),
    orders: Math.max(1, Math.round(c.orders * totalMult)),
  }));
  const funnel = {
    leads: Math.max(1, Math.round(salesMock.funnel.leads * totalMult)),
    opportunities: Math.max(1, Math.round(salesMock.funnel.opportunities * totalMult)),
    quotations: Math.max(1, Math.round(salesMock.funnel.quotations * totalMult)),
    orders: Math.max(1, Math.round(salesMock.funnel.orders * totalMult)),
    winRate: clamp(salesMock.funnel.winRate * (1 + (rateMult - 1) * 0.5), 5, 95),
  };

  return { channels, byCategory, topCustomers, funnel };
}

export function getMarketingForPeriod(p: ReportPeriod) {
  const { totalMult, rateMult } = multipliersFromTrend(p);

  const leads = Math.max(1, Math.round(marketingMock.kpis.leads.value * totalMult));
  const spend = Math.max(1, Math.round(marketingMock.kpis.spend.value * totalMult));
  const cpl = Math.max(1, Math.round((spend / Math.max(1, leads)) * 10) / 10);
  const ctr = clamp(Math.round(marketingMock.kpis.ctr.value * rateMult * 10) / 10, 0.5, 25);

  const channels = marketingMock.channels.map((ch) => {
    const impressions = Math.max(1, Math.round(ch.impressions * totalMult));
    const clicks = Math.max(1, Math.round(ch.clicks * totalMult));
    const leadsC = Math.max(1, Math.round(ch.leads * totalMult));
    return { ...ch, impressions, clicks, leads: leadsC };
  });

  const campaigns = marketingMock.campaigns.map((c) => {
    const spendC = Math.max(1, Math.round(c.spend * totalMult));
    const leadsC = Math.max(1, Math.round(c.leads * totalMult));
    return { ...c, spend: spendC, leads: leadsC };
  });

  const funnel = marketingMock.funnel.map((f, i) => ({
    ...f,
    value: Math.max(1, Math.round(f.value * (i === 0 ? totalMult : totalMult))),
  }));

  return {
    kpis: {
      leads: { ...marketingMock.kpis.leads, value: leads, delta: 0 },
      spend: { ...marketingMock.kpis.spend, value: spend, delta: 0 },
      cpl: { ...marketingMock.kpis.cpl, value: cpl, delta: 0 },
      ctr: { ...marketingMock.kpis.ctr, value: ctr, delta: 0 },
    },
    channels,
    campaigns,
    funnel,
  };
}

export function getActivityForPeriod(p: ReportPeriod) {
  const { totalMult, rateMult } = multipliersFromTrend(p);

  const total = Math.max(1, Math.round(activityMock.kpis.total.value * totalMult));
  const meetings = Math.max(1, Math.round(activityMock.kpis.meetings.value * totalMult));
  const calls = Math.max(1, Math.round(activityMock.kpis.calls.value * totalMult));
  const tasks = Math.max(1, Math.round(activityMock.kpis.tasks.value * totalMult));

  const byWeek = activityMock.byWeek.map((v) => Math.max(1, Math.round(v * rateMult)));

  return {
    kpis: {
      total: { ...activityMock.kpis.total, value: total, delta: 0 },
      meetings: { ...activityMock.kpis.meetings, value: meetings, delta: 0 },
      calls: { ...activityMock.kpis.calls, value: calls, delta: 0 },
      tasks: { ...activityMock.kpis.tasks, value: tasks, delta: 0 },
    },
    byWeek,
    recent: activityMock.recent,
    team: activityMock.team,
  };
}

