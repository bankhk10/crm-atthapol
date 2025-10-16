export type MonthlyPoint = { month: string; value: number };

export const overviewMock = {
  kpis: {
    revenue: { label: "ยอดขายรวม", value: 1200000, delta: 12.4, help: "เทียบกับเดือนก่อนหน้า" },
    orders: { label: "ออเดอร์", value: 845, delta: 5.1, help: "จำนวนรายการสั่งซื้อทั้งหมด" },
    aov: { label: "มูลค่าออเดอร์เฉลี่ย", value: 1420, delta: -2.2, help: "บาทต่อออเดอร์" },
    newCustomers: { label: "ลูกค้าใหม่", value: 68, delta: 8.6, help: "ลงทะเบียนในเดือนนี้" },
  },
  trend: [
    82000, 91000, 87000, 94000, 102000, 98000, 108000, 120000, 114000, 126000, 134000, 142000,
  ],
  topProducts: [
    { name: "ปุ๋ยสูตร 15-15-15", category: "ปุ๋ยเคมี", units: 540, revenue: 320000 },
    { name: "สารกำจัดแมลง X1", category: "สารเคมี", units: 420, revenue: 210000 },
    { name: "ปุ๋ยอินทรีย์ A", category: "ปุ๋ยอินทรีย์", units: 380, revenue: 150000 },
    { name: "ฮอร์โมนเร่งดอก B", category: "ฮอร์โมน", units: 240, revenue: 98000 },
    { name: "เมล็ดพันธุ์ข้าว C", category: "เมล็ดพันธุ์", units: 190, revenue: 87000 },
  ],
  recentActivities: [
    { type: "meeting", title: "พบลูกค้า SubDealer อุบลฯ", owner: "สมชาย", when: "2 ชม.ที่แล้ว" },
    { type: "call", title: "ติดตามใบเสนอราคา #Q-1021", owner: "วราภรณ์", when: "เมื่อวาน" },
    { type: "order", title: "ออเดอร์ใหม่ #SO-2033", owner: "ศิริพร", when: "เมื่อวาน" },
    { type: "task", title: "เตรียมสื่อการตลาด ฤดูฝน", owner: "ปิยะ", when: "2 วันก่อน" },
  ],
};

export const salesMock = {
  periodLabel: "ไตรมาส 3 / 2025",
  channels: [
    { label: "ออนไลน์", value: 420000, color: "#1976d2" },
    { label: "ดีลเลอร์", value: 520000, color: "#2e7d32" },
    { label: "ขายตรง", value: 260000, color: "#ed6c02" },
  ],
  byCategory: [
    { category: "ปุ๋ยเคมี", revenue: 520000, units: 1100, avg: 472 },
    { category: "สารเคมี", revenue: 310000, units: 540, avg: 574 },
    { category: "ปุ๋ยอินทรีย์", revenue: 220000, units: 630, avg: 349 },
    { category: "เมล็ดพันธุ์", revenue: 130000, units: 290, avg: 448 },
  ],
  topCustomers: [
    { name: "หจก.เกษตรรุ่งเรือง", revenue: 180000, orders: 14 },
    { name: "ร้านโชคดีการเกษตร", revenue: 152000, orders: 11 },
    { name: "วิสาหกิจชุมชนทุ่งกุลา", revenue: 99000, orders: 8 },
    { name: "ฟาร์มสุขใจ", revenue: 76000, orders: 6 },
  ],
  funnel: {
    leads: 1450,
    opportunities: 620,
    quotations: 410,
    orders: 280,
    winRate: 45.2,
  },
};

export const marketingMock = {
  kpis: {
    leads: { label: "จำนวนลีด", value: 760, delta: 9.1 },
    spend: { label: "งบประมาณใช้ไป", value: 185000, delta: -4.2 },
    cpl: { label: "ค่าใช้จ่ายต่อ 1 ลีด", value: 243.4, delta: -12.3 },
    ctr: { label: "CTR เฉลี่ย", value: 3.7, delta: 0.6 },
  },
  channels: [
    { label: "Facebook", impressions: 480000, clicks: 17200, leads: 360 },
    { label: "Google Ads", impressions: 260000, clicks: 9400, leads: 220 },
    { label: "LINE OA", impressions: 180000, clicks: 5100, leads: 110 },
    { label: "อีเวนต์/บูธ", impressions: 22000, clicks: 2200, leads: 52 },
    { label: "แนะนำต่อ", impressions: 12000, clicks: 1800, leads: 18 },
  ],
  campaigns: [
    { name: "ฤดูเพาะปลูก Q3", channel: "Facebook", spend: 68000, leads: 168, roi: 238 },
    { name: "พืชไร่กลางปี", channel: "Google Ads", spend: 54000, leads: 132, roi: 186 },
    { name: "LINE OA โปรสมาชิก", channel: "LINE OA", spend: 28000, leads: 74, roi: 124 },
    { name: "Roadshow ภาคอีสาน", channel: "อีเวนต์/บูธ", spend: 21000, leads: 34, roi: 88 },
  ],
  funnel: [
    { label: "Visits", value: 770000 },
    { label: "Leads", value: 760 },
    { label: "MQL", value: 480 },
    { label: "SQL", value: 320 },
    { label: "Opp", value: 210 },
    { label: "Customers", value: 92 },
  ],
};

export const activityMock = {
  kpis: {
    total: { label: "กิจกรรมทั้งหมด", value: 1240, delta: 6.4 },
    meetings: { label: "นัดหมาย/ประชุม", value: 310, delta: 3.2 },
    calls: { label: "โทร/ติดตาม", value: 540, delta: 7.8 },
    tasks: { label: "งานที่เสร็จ", value: 390, delta: 11.5 },
  },
  byWeek: [42, 55, 48, 62, 70, 64, 58, 76, 81, 74, 68, 72],
  recent: [
    { type: "meeting", title: "สรุปแผนงานเดือนหน้า", owner: "เกียรติศักดิ์", when: "1 ชม.ที่แล้ว" },
    { type: "call", title: "โทรติดตาม Dealer โคราช", owner: "นภา", when: "2 ชม.ที่แล้ว" },
    { type: "task", title: "อัปเดตข้อมูลลูกค้าใหม่", owner: "วชิระ", when: "เมื่อวาน" },
    { type: "visit", title: "เยี่ยมฟาร์ม อ.บ้านไผ่", owner: "ปณิดา", when: "เมื่อวาน" },
  ],
  team: [
    { name: "ศิริพร", done: 86, ontime: 92 },
    { name: "สมชาย", done: 74, ontime: 88 },
    { name: "วราภรณ์", done: 69, ontime: 90 },
    { name: "ปิยะ", done: 63, ontime: 84 },
  ],
};

