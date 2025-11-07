import { Stack, Typography } from "@mui/material";
import { Box } from "@mui/material";

import { getCustomers } from "@/app/dashboard/customers/data";
import { getEmployees } from "@/app/dashboard/employees/data";
import { getProducts } from "@/app/dashboard/products/data";
import { requirePermission } from "@/lib/require-permission";

import { OrdersClient } from "./_components/orders-client";

export default async function SalesOrdersPage() {
  await requirePermission("sales", "view");
  const [customers, employees, products] = await Promise.all([
    getCustomers(),
    getEmployees(),
    getProducts(),
  ]);
  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    address: c.address ?? null,
    province: c.province ?? null,
    district: c.district ?? null,
    subdistrict: c.subdistrict ?? null,
    postalCode: c.postalCode ?? null,
  }));
  const employeeOptions = employees.map((e) => ({
    id: e.id,
    label: ([e.prefix, e.firstName, e.lastName].filter(Boolean).join(" ") ||
      e.user?.name ||
      e.user?.email ||
      e.id) as string,
  }));
  const productOptions = products.map((p) => ({
    id: p.id,
    productCode: p.productCode,
    nameTH: p.nameTH,
    unit: p.unit ?? null,
    price: p.price ?? null,
    // Use available stock for ordering (on-hand minus reserved)
    stockOnHand: p.stockAvailable,
  }));

  return (
    <>
      {/* <ActionButtons resource="sales" /> */}
      <Stack>
        <Typography variant="h4" fontWeight={700} align="center">
          รายการขาย
        </Typography>

        <Box sx={{ my: 4 }}>
          <OrdersClient
            customerOptions={customerOptions}
            employeeOptions={employeeOptions}
            productOptions={productOptions}
          />
        </Box>
      </Stack>
    </>
  );
}
