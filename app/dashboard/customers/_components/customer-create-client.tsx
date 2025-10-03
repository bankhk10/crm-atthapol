"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { CustomerForm } from "./customer-form";
import type { CustomerFormValues } from "../types";

const defaultInitialValues: CustomerFormValues = {
  name: "",
  email: "",
  phone: "",
  taxId: "",
  address: "",
  province: undefined,
  district: undefined,
  subdistrict: undefined,
  postalCode: undefined,
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
        onSubmit={async () => {
          // TODO: บันทึกข้อมูลลูกค้าเมื่อมีโมเดลในฐานข้อมูล
          router.push("/dashboard/customers");
          router.refresh();
        }}
      />
    </Stack>
  );
}

