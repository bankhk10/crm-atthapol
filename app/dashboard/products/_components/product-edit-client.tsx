"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";
import { ProductForm } from "./product-form";
import type { ProductFormValues } from "../validation";
import { updateProduct } from "../actions";

type Props = {
  productId: string;
  initialValues: ProductFormValues;
};

export function ProductEditClient({ productId, initialValues }: Props) {
  const router = useRouter();
  return (
    <Stack spacing={3}>
      <ProductForm
        initialValues={initialValues}
        onSubmit={async (values) => {
          await updateProduct(productId, values);
          router.push(`/dashboard/products/${productId}`);
          router.refresh();
        }}
      />
    </Stack>
  );
}
