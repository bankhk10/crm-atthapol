import { Box, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { CustomerEditClient } from "../../_components/customer-edit-client";
import { getCustomer } from "../../data";
import { getEmployees } from "@/app/dashboard/employees/data";

export default async function CustomerEditPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const customer = await getCustomer(customerId);
  if (!customer) return notFound();
  const employees = await getEmployees();
  const employeeOptions = employees
    .filter((e) => !e.deletedAt)
    .map((e) => ({
      id: e.id,
      label:
        [e.prefix, e.firstName, e.lastName]
          .filter(Boolean)
          .join(" ") || e.user?.name || e.user?.email || e.id,
    }));

  const initialValues = {
    type: customer.type,
    prefix: customer.prefix ?? "",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    gender: (customer.gender === 'FEMALE' ? 'FEMALE' : 'MALE') as any,
    birthDate: customer.birthDate ? new Date(customer.birthDate).toISOString().slice(0, 10) : "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    taxId: customer.taxId ?? "",
    address: customer.address ?? "",
    province: customer.province ?? undefined,
    district: customer.district ?? undefined,
    subdistrict: customer.subdistrict ?? undefined,
    postalCode: customer.postalCode ?? undefined,
    latitude: customer.latitude ?? "",
    longitude: customer.longitude ?? "",
    code: customer.code ?? "",
    responsibleEmployeeId: customer.responsibleEmployeeId ?? null,
    companyName: (customer as any).companyName ?? "",
    contactPerson: (customer as any).contactPerson ?? "",
    contactPhone: (customer as any).contactPhone ?? "",
    contactEmail: (customer as any).contactEmail ?? "",
    creditLimit: (customer as any).creditLimit ?? "",
    parentDealer: (customer as any).parentDealer ?? "",
    subDealerCode: (customer as any).subDealerCode ?? "",
    farmName: (customer as any).farmName ?? "",
    farmSize: (customer as any).farmSize ?? "",
    cropType: (customer as any).cropType ?? "",
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
        <CustomerEditClient customerId={customer.id} initialValues={initialValues} employeeOptions={employeeOptions} />
      </Stack>
    </Box>
  );
}
