import { Box, Stack } from "@mui/material";

import { requirePermission } from "@/lib/require-permission";

import { EmployeeCreateClient } from "../_components/employee-create-client";
import { employeeRoleOptions, getRoleDefinitionOptions } from "../data";

export default async function EmployeeCreatePage() {
  await requirePermission("employees", "create");
  const roleDefinitions = await getRoleDefinitionOptions();

  return (
    <Box
      sx={{
        minHeight: "100vh", // ให้สูงเต็มจอ
        display: "flex",
        flexDirection: "column",
        alignItems: "center", // จัดกึ่งกลางแนวนอน
        justifyContent: "center", // จัดกึ่งกลางแนวตั้ง
        // bgcolor: "#f7f8fa",
        py: 4,
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        {/* <ActionButtons resource="employees" /> */}
        <EmployeeCreateClient roleOptions={employeeRoleOptions} roleDefinitions={roleDefinitions} />
      </Stack>
    </Box>
  );
}
