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

function typeLabel(type: "DEALER" | "SUBDEALER" | "FARMER") {
  if (type === "DEALER") return "Dealer";
  if (type === "SUBDEALER") return "SubDealer";
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

  const profile = (customer.profile as any) ?? {};
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
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200 }}>
        <ActionButtons resource="customers" />

        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={1.5} alignItems={{ xs: "flex-start", md: "center" }}>
                <Typography variant="h5" fontWeight={800}>
                  {customer.name}
                </Typography>
                <Chip
                  label={typeLabel(customer.type)}
                  color={
                    customer.type === "FARMER"
                      ? "success"
                      : customer.type === "SUBDEALER"
                      ? "secondary"
                      : "primary"
                  }
                  variant="outlined"
                />
                <Typography color="text.secondary" variant="body2">
                  สร้างเมื่อ {new Date(customer.createdAt).toLocaleDateString("th-TH")}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} md={8}>
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
                    <Info label="ชื่อบริษัท/ร้านค้า" value={profile.companyName ?? "-"} />
                    <Info label="ผู้ติดต่อหลัก" value={profile.contactPerson ?? "-"} />
                    <Info label="วงเงินเครดิต (บาท)" value={profile.creditLimit ?? "-"} />
                  </Section>
                )}

                {customer.type === "SUBDEALER" && (
                  <Section title="ข้อมูล SubDealer">
                    <Info label="ร้านค้าตัวแทน (แม่ข่าย)" value={profile.parentDealer ?? "-"} />
                    <Info label="รหัส SubDealer" value={profile.subDealerCode ?? "-"} />
                  </Section>
                )}

                {customer.type === "FARMER" && (
                  <Section title="ข้อมูลเกษตรกร">
                    <Info label="ชื่อฟาร์ม" value={profile.farmName ?? "-"} />
                    <Info label="ขนาดพื้นที่ (ไร่)" value={profile.farmSize ?? "-"} />
                    <Info label="พืชหลัก" value={profile.cropType ?? "-"} />
                  </Section>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Stack>
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
    <Grid item xs={12} sm={6}>
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

