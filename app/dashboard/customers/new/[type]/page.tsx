import { Box, Stack } from "@mui/material";
import { CustomerCreateClient } from "../../_components/customer-create-client";
import { getEmployees } from "@/app/dashboard/employees/data";

type PageProps = { params: Promise<{ type: string }> };

const toCustomerType = (param: string) => {
  const key = String(param || "").toUpperCase();
  if (key === "DEALER" || key === "SUBDEALER" || key === "FARMER") return key as "DEALER" | "SUBDEALER" | "FARMER";
  return "DEALER" as const;
};

export default async function CustomerCreateByTypePage({ params }: PageProps) {
  const { type } = await params;
  const customerType = toCustomerType(type);

  const employees = await getEmployees();
  const employeeOptions = employees
    .filter((e) => !e.deletedAt)
    .map((e) => ({
      id: e.id,
      label: [e.prefix, e.firstName, e.lastName].filter(Boolean).join(" ") || e.user?.name || e.user?.email || e.id,
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
        <CustomerCreateClient employeeOptions={employeeOptions} defaultType={customerType} />
      </Stack>
    </Box>
  );
}
