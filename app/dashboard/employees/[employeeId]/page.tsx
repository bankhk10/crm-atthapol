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
  TextField,
} from "@mui/material";

import { getEmployeeById } from "../data";
import { ActionButtons } from "../../_components/action-buttons";
import { EmployeeActivity } from "./_components/employee-activity";
import { getEmployeeActivities } from "../data";

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

  const birthDateText = employee.birthDate
    ? new Date(employee.birthDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  const initialActivities = await getEmployeeActivities(employeeId);

  return (
    <Box sx={{ minHeight: "100%" }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200, mx: "auto" }}>
        <ActionButtons resource="employees" />

        <Grid container spacing={3}>
          {/* Left: Profile card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4 }}>
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    overflow: "hidden",
                  }}
                >
                  <Image src="/images/man-avatar.png" alt={fullName} fill style={{ objectFit: "cover" }} />
                </Box>
                <Stack spacing={0.25} alignItems="center">
                  <Typography variant="h6" fontWeight={800}>
                    {fullName}
                  </Typography>
                  <Typography color="text.secondary">{employee.position}</Typography>
                </Stack>
                <StatusChip status={employee.status} />

                <Divider sx={{ width: "100%", my: 1 }} />

                <Stack spacing={1} sx={{ width: "100%" }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    รายละเอียด
                  </Typography>
                  <TextField label="ตำแหน่ง" value={employee.position} InputProps={{ readOnly: true }} />
                  <TextField label="บริษัท" value={employee.company ?? "-"} InputProps={{ readOnly: true }} />
                  <TextField label="วันเกิด" value={birthDateText} InputProps={{ readOnly: true }} />
                </Stack>

                <Stack spacing={1} sx={{ width: "100%", mt: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    ติดต่อ
                  </Typography>
                  <TextField label="Email" value={employee.user.email ?? "-"} InputProps={{ readOnly: true }} />
                  <TextField label="เบอร์โทรศัพท์" value={employee.phone} InputProps={{ readOnly: true }} />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ width: "100%", mt: 1 }} justifyContent="center">
                  <Button href={`/dashboard/employees/${employee.id}/edit`} variant="outlined">
                    แก้ไขข้อมูล
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* Right: Activity list + filter */}
          <Grid size={{ xs: 12, md: 8 }}>
            <EmployeeActivity initialItems={initialActivities} />
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

function StatusChip({ status }: { status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" }) {
  if (status === "ACTIVE") return <Chip label="ปฏิบัติงาน" color="success" variant="outlined" />;
  if (status === "ON_LEAVE") return <Chip label="ลาพัก" color="warning" variant="outlined" />;
  return <Chip label="ออกจากงาน" color="default" variant="outlined" />;
}
