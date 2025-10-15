import { Box, Stack } from "@mui/material";
import { notFound } from "next/navigation";
import { CustomerEditClient } from "../../_components/customer-edit-client";
import { getCustomer } from "../../data";
import { getDealerOptions } from "../../data";
import { getEmployees } from "@/app/dashboard/employees/data";
import type { Employee, User } from "@prisma/client";
import type { CustomerFormValues } from "../../types";

export default async function CustomerEditPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const customer = await getCustomer(customerId);
  if (!customer) return notFound();
  const employees = (await getEmployees()) as (Employee & { user: User | null })[];
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

  const initialValues: CustomerFormValues = {
    type: customer.type,
    prefix: customer.prefix ?? "",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    gender: (customer.gender === "FEMALE" ? "FEMALE" : "MALE") as "MALE" | "FEMALE",
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
    dealerId: (customer as any).dealerId ?? undefined,
    competitor: (customer as any).competitor ?? "",
    cropsInArea: (customer as any).cropsInArea ?? "",
    averageMonthlyPurchase: (customer as any).averageMonthlyPurchase ?? "",
    mainProducts: (customer as any).mainProducts ?? "",
    brandsSold: (customer as any).brandsSold ?? "",
    areaType: (customer as any).areaType ?? "",
    relationshipScore: (customer as any).relationshipScore ?? undefined,
    businessNotes: (customer as any).businessNotes ?? "",
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
        <CustomerEditClient customerId={customer.id} initialValues={initialValues} employeeOptions={employeeOptions} dealerOptions={dealers} />
      </Stack>
    </Box>
  );
}
