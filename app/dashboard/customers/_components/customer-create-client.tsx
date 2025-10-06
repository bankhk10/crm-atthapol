"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { CustomerForm } from "./customer-form";
import type { CustomerFormValues, CustomerType } from "../types";
import { createCustomer } from "../actions";

type CustomerCreateClientProps = {
  employeeOptions: { id: string; label: string }[];
  defaultType?: CustomerType;
};

const defaultInitialValues: CustomerFormValues = {
  type: "DEALER",
  prefix: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  birthDate: "",
  email: "",
  phone: "",
  taxId: "",
  address: "",
  province: undefined,
  district: undefined,
  subdistrict: undefined,
  postalCode: undefined,
  latitude: "",
  longitude: "",
  code: "",
  responsibleEmployeeId: null,
  companyName: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  creditLimit: "",
  parentDealer: "",
  subDealerCode: "",
  farmName: "",
  farmSize: "",
  cropType: "",
};

export function CustomerCreateClient({ employeeOptions, defaultType = "DEALER" }: CustomerCreateClientProps) {
  const router = useRouter();

  const initialValues: CustomerFormValues = {
    ...defaultInitialValues,
    type: defaultType,
  };

  return (
    <Stack spacing={3}>
      <CustomerForm
        title="เพิ่มลูกค้า"
        description=""
        initialValues={initialValues}
        submitLabel="เพิ่มลูกค้า"
        employeeOptions={employeeOptions}
        hideTypeSelect
        onSubmit={async (values) => {
          await createCustomer(values);
          router.push("/dashboard/customers");
          router.refresh();
        }}
      />
    </Stack>
  );
}
