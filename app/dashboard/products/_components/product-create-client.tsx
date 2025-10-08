"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";
import { ProductForm } from "./product-form";
import type { ProductFormValues } from "../validation";
import { createProduct } from "../actions";

const defaultValues: ProductFormValues = {
  productCode: "",
  lotNumber: "",
  nameTH: "",
  nameEN: "",
  category: "",
  brand: "",
  unit: "ชิ้น",
  price: undefined,
  mfgDate: undefined,
  expDate: undefined,
  status: "ACTIVE",
  imageUrl: "",
  description: "",
  qtyOnHand: 0,
  qtyReserved: 0,
  qtyVirtual: 0,
  stockNote: "",
};

export function ProductCreateClient() {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <ProductForm
        initialValues={defaultValues}
        title="เพิ่มข้อมูลสินค้าใหม่"
        existingImages={[]}
        onSubmit={async (values: ProductFormValues) => {
          await createProduct(values);
          router.push("/dashboard/products");
          router.refresh();
        }}
      />
    </Stack>
  );
}
