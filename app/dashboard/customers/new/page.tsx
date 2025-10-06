import { Box, Stack } from "@mui/material";
import { CustomerCreateClient } from "../_components/customer-create-client";
import { getEmployees } from "@/app/dashboard/employees/data";
import { getDealerOptions } from "../data";

export default async function CustomerCreatePage() {
  const employees = await getEmployees();
  const dealers = await getDealerOptions();
  const employeeOptions = employees
    .filter((e) => !e.deletedAt)
    .map((e) => ({
      id: e.id,
      label:
        [e.prefix, e.firstName, e.lastName]
          .filter(Boolean)
          .join(" ") || e.user?.name || e.user?.email || e.id,
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

