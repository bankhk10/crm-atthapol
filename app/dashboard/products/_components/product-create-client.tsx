"use client";

import { Stack } from "@mui/material";
import { useRouter } from "next/navigation";

import { ProductForm } from "./product-form";
import { createProduct } from "../actions";

import type { ProductFormValues } from "../validation";

type Plant = {
  id: string;
  name: string;
};

type Props = {
  plants: Plant[];
};

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
  features: "",
  packagingSize: "",
  packagingPerCarton: undefined,
  qtyOnHand: 0,
  qtyReserved: 0,
  qtyVirtual: 0,
  stockNote: "",
};

export function ProductCreateClient({ plants }: Props) {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <ProductForm
        initialValues={defaultValues}
        title="เพิ่มข้อมูลสินค้าใหม่"
        existingImages={[]}
        plants={plants}
        mode="create"
        onSubmit={async (values: ProductFormValues) => {
          await createProduct(values);
          router.push("/dashboard/products");
          router.refresh();
        }}
      />
    </Stack>
  );
}
