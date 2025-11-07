"use client";

import { Stack } from "@mui/material";
import { useRouter } from "next/navigation";

import { ProductForm } from "./product-form";
import { updateProduct } from "../actions";

import type { ProductFormValues } from "../validation";

type Plant = {
  id: string;
  name: string;
};

type Props = {
  productId: string;
  initialValues: ProductFormValues;
  existingImages: { id: string; url: string }[];
  plants: Plant[];
};

export function ProductEditClient({ productId, initialValues, existingImages, plants }: Props) {
  const router = useRouter();
  return (
    <Stack spacing={3}>
      <ProductForm
        initialValues={initialValues}
        title="แก้ไขข้อมูลสินค้า"
        existingImages={existingImages}
        plants={plants}
        mode="edit"
        onSubmit={async (values) => {
          await updateProduct(productId, values);
          router.push("/dashboard/products");
          router.refresh();
        }}
      />
    </Stack>
  );
}
