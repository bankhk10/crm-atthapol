"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { CustomerForm } from "./customer-form";
import type { CustomerFormValues } from "../types";
import { createCustomer } from "../actions";

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
  profile: {},
};

export function CustomerCreateClient() {
  const router = useRouter();

  const initialValues: CustomerFormValues = {
    ...defaultInitialValues,
  };

  return (
    <Stack spacing={3}>
      <CustomerForm
        title="เพิ่มข้อมูลลูกค้าใหม่"
        description=""
        initialValues={initialValues}
        submitLabel="เพิ่มลูกค้า"
        onSubmit={async (values) => {
          await createCustomer(values);
          router.push("/dashboard/customers");
          router.refresh();
        }}
      />
    </Stack>
  );
}
