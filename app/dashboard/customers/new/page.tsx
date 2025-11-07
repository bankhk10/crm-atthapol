import { Box, Stack } from "@mui/material";

import { getEmployees } from "@/app/dashboard/employees/data";
import { requirePermission } from "@/lib/require-permission";

import { CustomerCreateClient } from "../_components/customer-create-client";
import { getDealerOptions } from "../data";

export default async function CustomerCreatePage() {
  await requirePermission("customers", "create");
  const employees = await getEmployees();
  const dealers = await getDealerOptions();
  const employeeOptions = employees
    .filter((e) => !e.deletedAt)
    .map((e) => ({
      id: e.id,
      label:
        [e.prefix, e.firstName, e.lastName].filter(Boolean).join(" ") ||
        e.user?.name ||
        e.user?.email ||
        e.id,
    }));

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
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <CustomerCreateClient employeeOptions={employeeOptions} dealerOptions={dealers} />
      </Stack>
    </Box>
  );
}
