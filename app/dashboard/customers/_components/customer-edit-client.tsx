"use client";

import { Stack } from "@mui/material";
import { useRouter } from "next/navigation";

import CustomerFormByType from "./customer-form-by-type";
import { updateCustomer } from "../actions";

import type { CustomerFormValues } from "../types";

type CustomerEditClientProps = {
  customerId: string;
  initialValues: CustomerFormValues;
  employeeOptions: { id: string; label: string }[];
  dealerOptions: { id: string; label: string }[];
};

export function CustomerEditClient({
  customerId,
  initialValues,
  employeeOptions,
  dealerOptions,
}: CustomerEditClientProps) {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <CustomerFormByType
        title="แก้ไขข้อมูลลูกค้า"
        description=""
        initialValues={initialValues}
        submitLabel="บันทึกการแก้ไข"
        employeeOptions={employeeOptions}
        dealerOptions={dealerOptions}
        onSubmit={async (values) => {
          await updateCustomer(customerId, values);
          router.push("/dashboard/customers");
          router.refresh();
        }}
      />
    </Stack>
  );
}
