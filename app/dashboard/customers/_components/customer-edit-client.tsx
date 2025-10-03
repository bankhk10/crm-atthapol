"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import { CustomerForm } from "./customer-form";
import type { CustomerFormValues } from "../types";
import { updateCustomer } from "../actions";

type CustomerEditClientProps = {
  customerId: string;
  initialValues: CustomerFormValues;
};

export function CustomerEditClient({ customerId, initialValues }: CustomerEditClientProps) {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <CustomerForm
        title="แก้ไขข้อมูลลูกค้า"
        description=""
        initialValues={initialValues}
        submitLabel="บันทึกการแก้ไข"
        onSubmit={async (values) => {
          await updateCustomer(customerId, values);
          router.push("/dashboard/customers");
          router.refresh();
        }}
      />
    </Stack>
  );
}

