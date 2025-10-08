"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";
import { ProductForm } from "./product-form";
import type { ProductFormValues } from "../validation";
import { updateProduct } from "../actions";

type Props = {
  productId: string;
  initialValues: ProductFormValues;
  existingImages: { id: string; url: string }[];
};

export function ProductEditClient({ productId, initialValues, existingImages }: Props) {
  const router = useRouter();
  return (
    <Stack spacing={3}>
      <ProductForm
        initialValues={initialValues}
        title="แก้ไขข้อมูลสินค้า"
        existingImages={existingImages}
        onSubmit={async (values) => {
          await updateProduct(productId, values);
          router.push("/dashboard/products");
          router.refresh();
        }}
      />
    </Stack>
  );
}
