import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Box,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  Button,
} from "@mui/material";

import { getEmployeeById } from "../data";
import { ActionButtons } from "../../_components/action-buttons";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const employee = await getEmployeeById(employeeId);
  if (!employee || !employee.user) {
    notFound();
  }

  const fullName = employee.firstName || employee.lastName
    ? [employee.firstName, employee.lastName].filter(Boolean).join(" ")
    : employee.user.name ?? "-";
  const empExtra = employee as unknown as {
    address?: string | null;
    province?: string | null;
    district?: string | null;
    subdistrict?: string | null;
    postalCode?: string | null;
  };

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
        <ActionButtons resource="employees" />

        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={2} alignItems="center">
                <Box sx={{ position: "relative", width: 128, height: 128, borderRadius: "50%", overflow: "hidden" }}>
                  <Image src="/images/man-avatar.png" alt={fullName} fill style={{ objectFit: "cover" }} />
                </Box>
                <Stack spacing={0.5} alignItems="center">
                  <Typography variant="h5" fontWeight={800}>
                    {fullName}
                  </Typography>
                  <Typography color="text.secondary">{employee.position}</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <StatusChip status={employee.status} />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button href={`/dashboard/employees/${employee.id}/edit`} variant="outlined">
                    แก้ไขข้อมูล
                  </Button>
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={2}>
                <Section title="ข้อมูลติดต่อ">
                  <Info label="อีเมล" value={employee.user.email ?? "-"} />
                  <Info label="เบอร์โทรศัพท์" value={employee.phone} />
                </Section>

                <Section title="ข้อมูลงาน">
                  <Info label="ตำแหน่ง" value={employee.position} />
                  <Info label="แผนก" value={employee.department} />
                  <Info label="รหัสพนักงาน" value={employee.employeeCode} />
                  <Info label="วันที่เริ่มงาน" value={employee.startDate.toLocaleDateString("th-TH")} />
                </Section>

                <Section title="ที่อยู่">
                  <Info label="ที่อยู่" value={empExtra.address ?? "-"} />
                  <Info label="จังหวัด" value={empExtra.province ?? "-"} />
                  <Info label="อำเภอ" value={empExtra.district ?? "-"} />
                  <Info label="ตำบล" value={empExtra.subdistrict ?? "-"} />
                  <Info label="รหัสไปรษณีย์" value={empExtra.postalCode ?? "-"} />
                </Section>

                <Section title="บัญชีผู้ใช้งาน">
                  <Info label="บทบาท" value={employee.user.role ?? "USER"} />
                </Section>
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
    <Grid size={{ xs: 12, sm: 6 }}>
      <Stack spacing={0.25}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {typeof value === "string" || typeof value === "number" ? (
          <Typography fontWeight={600}>{value}</Typography>
        ) : (
          value
        )}
      </Stack>
    </Grid>
  );
}

function StatusChip({ status }: { status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" }) {
  if (status === "ACTIVE") return <Chip label="ปฏิบัติงาน" color="success" variant="outlined" />;
  if (status === "ON_LEAVE") return <Chip label="ลาพัก" color="warning" variant="outlined" />;
  return <Chip label="ออกจากงาน" color="default" variant="outlined" />;
}
