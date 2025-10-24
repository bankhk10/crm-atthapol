import { notFound } from "next/navigation";
import {
  Box,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { ActionButtons } from "../../_components/action-buttons";
import { getCustomer } from "../../customers/data";

function typeLabel(type: "DEALER" | "SUBDEALER" | "FARMER" | "BROKER") {
  if (type === "DEALER") return "Dealer";
  if (type === "SUBDEALER") return "SubDealer";
  if (type === "BROKER") return "Broker";
  return "Farmer";
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const customer = await getCustomer(customerId);
  if (!customer) {
    notFound();
  }

  const birthDateStr = customer.birthDate
    ? new Date(customer.birthDate).toISOString().slice(0, 10)
    : "";
  const age = customer.birthDate
    ? Math.floor((Date.now() - new Date(customer.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;
  const addressLine = [
    customer.address,
    customer.subdistrict,
    customer.district,
    customer.province,
    customer.postalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      {/* <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200 }}> */}
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={3}>
            {/* <Grid size={{ xs: 12, md: 8 }}> */}
              <Stack spacing={2}>
                <Section title="ข้อมูลลูกค้า">
                  <Info label="คำนำหน้า" value={customer.prefix ?? "-"} />
                  <Info label="ชื่อ" value={customer.firstName ?? "-"} />
                  <Info label="นามสกุล" value={customer.lastName ?? "-"} />
                  <Info label="เพศ" value={customer.gender ?? "-"} />
                  <Info label="วันเกิด" value={birthDateStr || "-"} />
                  <Info label="อายุ" value={age !== null ? age : "-"} />
                </Section>

                <Section title="ข้อมูลติดต่อ">
                  <Info label="เบอร์โทรศัพท์" value={customer.phone} />
                  <Info label="อีเมล" value={customer.email ?? "-"} />
                  <Info label="เลขผู้เสียภาษี" value={customer.taxId ?? "-"} />
                </Section>

                <Section title="ที่อยู่">
                  <Info label="ที่อยู่" value={customer.address ?? "-"} />
                  <Info label="ตำบล" value={customer.subdistrict ?? "-"} />
                  <Info label="อำเภอ" value={customer.district ?? "-"} />
                  <Info label="จังหวัด" value={customer.province ?? "-"} />
                  <Info label="รหัสไปรษณีย์" value={customer.postalCode ?? "-"} />
                </Section>

                {customer.type === "DEALER" && (
                  <Section title="ข้อมูล Dealer">
                    <Info label="ชื่อบริษัท/ร้านค้า" value={(customer as any).companyName ?? "-"} />
                    <Info label="ผู้ติดต่อหลัก" value={(customer as any).contactPerson ?? "-"} />
                    <Info label="วงเงินเครดิต (บาท)" value={(customer as any).creditLimit ?? "-"} />
                    <Info label="วงเงินส่งเสริมการขาย (บาท)" value={(customer as any).promotionBudget ?? "-"} />
                    <Info label="ยอดซื้อเฉลี่ย/เดือน" value={(customer as any).averageMonthlyPurchase ?? "-"} />
                    <Info label="สินค้าหลักที่ขาย" value={(customer as any).mainProducts ?? "-"} />
                    <Info label="ยี่ห้อที่จำหน่าย" value={(customer as any).brandsSold ?? "-"} />
                    <Info label="คะแนนความสัมพันธ์" value={(customer as any).relationshipScore ?? "-"} />
                    <Info label="หมายเหตุทางธุรกิจ" value={(customer as any).businessNotes ?? "-"} />
                  </Section>
                )}

                {customer.type === "SUBDEALER" && (
                  <Section title="ข้อมูล SubDealer">
                    <Info label="ร้านค้าตัวแทน (แม่ข่าย)" value={(customer as any).parentDealer ?? "-"} />
                    <Info label="รหัส SubDealer" value={(customer as any).subDealerCode ?? "-"} />
                    <Info label="คู่แข่งหลัก" value={(customer as any).competitor ?? "-"} />
                    <Info label="พืชในพื้นที่" value={(customer as any).cropsInArea ?? "-"} />
                    <Info label="ยอดซื้อเฉลี่ย/เดือน" value={(customer as any).averageMonthlyPurchase ?? "-"} />
                    <Info label="สินค้าหลักที่ขาย" value={(customer as any).mainProducts ?? "-"} />
                    <Info label="ยี่ห้อที่จำหน่าย" value={(customer as any).brandsSold ?? "-"} />
                    <Info label="ประเภทพื้นที่" value={(customer as any).areaType ?? "-"} />
                    <Info label="คะแนนความสัมพันธ์" value={(customer as any).relationshipScore ?? "-"} />
                    <Info label="หมายเหตุทางธุรกิจ" value={(customer as any).businessNotes ?? "-"} />
                  </Section>
                )}

                {customer.type === "FARMER" && (
                  <Section title="ข้อมูลเกษตรกร">
                    <Info label="ชื่อฟาร์ม" value={(customer as any).farmName ?? "-"} />
                    <Info label="ขนาดพื้นที่ (ไร่)" value={(customer as any).farmSize ?? "-"} />
                    <Info label="พืชหลัก" value={(customer as any).cropType ?? "-"} />
                  </Section>
                )}

                {customer.type === "BROKER" && (
                  <Section title="ข้อมูล Broker">
                    <Info label="พืชหลัก (Crop Types)" value={(customer as any).cropType ?? "-"} />
                    <Info label="ปริมาณผลผลิตปัจจุบัน" value={(customer as any).currentCropVolume ?? "-"} />
                    <Info label="จำนวนเกษตรกรในเครือ" value={(customer as any).farmerNetworkCount ?? "-"} />
                    <Info label="จำนวนแปลง" value={(customer as any).plotCount ?? "-"} />
                    <Info label="ขนาดพื้นที่รวม (ไร่)" value={(customer as any).farmSize ?? "-"} />
                    <Info label="รอบปลูกต่อปี" value={(customer as any).plantingCyclesPerYear ?? "-"} />
                    <Info label="เครดิตให้เกษตรกร (วัน)" value={(customer as any).creditTermForFarmers ?? "-"} />
                    <Info label="มูลค่าสารเคมี/รอบ (บาท)" value={(customer as any).agriChemValuePerCycle ?? "-"} />
                    <Info label="ปริมาณสารเคมี/รอบ" value={(customer as any).agriChemQtyPerCycle ?? "-"} />
                    <Info label="ร้านค้าประจำ" value={(customer as any).regularStore ?? "-"} />
                    <Info label="ประเภทบริการที่ให้" value={(customer as any).serviceTypes ?? "-"} />
                    <Info label="ยี่ห้อที่ใช้" value={(customer as any).brandsUsed ?? "-"} />
                  </Section>
                )}
              </Stack>
            {/* </Grid> */}
          </Grid>
        </Paper>
      {/* </Stack> */}
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Divider />
        <Grid container spacing={2}>
          {children}
        </Grid>
      </Stack>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Stack spacing={0.25}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {typeof value === "string" || typeof value === "number" ? (
          <Typography fontWeight={600}>{String(value)}</Typography>
        ) : (
          value
        )}
      </Stack>
    </Grid>
  );
}

