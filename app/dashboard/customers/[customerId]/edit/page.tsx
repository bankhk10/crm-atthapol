import { Box, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { CustomerEditClient } from "../../_components/customer-edit-client";
import { getCustomer } from "../../data";

export default async function CustomerEditPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const customer = await getCustomer(customerId);
  if (!customer) return notFound();

  const initialValues = {
    type: customer.type,
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    taxId: customer.taxId ?? "",
    address: customer.address ?? "",
    province: customer.province ?? undefined,
    district: customer.district ?? undefined,
    subdistrict: customer.subdistrict ?? undefined,
    postalCode: customer.postalCode ?? undefined,
    profile: (customer.profile as any) ?? {},
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
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 960 }}>
        <CustomerEditClient customerId={customer.id} initialValues={initialValues} />
      </Stack>
    </Box>
  );
}
