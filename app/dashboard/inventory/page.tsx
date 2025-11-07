import {
  Box,
  Paper,
  Stack,
  Typography,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

type Row = {
  id: string;
  productCode: string;
  nameTH: string;
  unit?: string | null;
  onHand: number;
  reserved: number;
  available: number;
};

async function getInventory(): Promise<Row[]> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      productCode: true,
      nameTH: true,
      unit: true,
      stocks: {
        where: { deletedAt: null },
        select: { qtyOnHand: true, qtyReserved: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((p) => {
    const onHand = (p.stocks || []).reduce((acc, s) => acc + (s.qtyOnHand || 0), 0);
    const reserved = (p.stocks || []).reduce((acc, s) => acc + (s.qtyReserved || 0), 0);
    return {
      id: p.id,
      productCode: p.productCode,
      nameTH: p.nameTH,
      unit: p.unit,
      onHand,
      reserved,
      available: Math.max(0, onHand - reserved),
    };
  });
}

export default async function InventoryOverviewPage() {
  await requirePermission("products", "view");
  const rows = await getInventory();
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4, px: { xs: 2, md: 0 } }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1100 }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={800}>
              ภาพรวมสต็อก (Inventory)
            </Typography>
            <Divider />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รหัสสินค้า</TableCell>
                  <TableCell>สินค้า</TableCell>
                  <TableCell>หน่วย</TableCell>
                  <TableCell align="right">คงเหลือ</TableCell>
                  <TableCell align="right">จอง</TableCell>
                  <TableCell align="right">พร้อมขาย</TableCell>
                  <TableCell align="center">การทำงาน</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: "monospace" }}>{r.productCode}</TableCell>
                    <TableCell>{r.nameTH}</TableCell>
                    <TableCell>{r.unit || "-"}</TableCell>
                    <TableCell align="right">{r.onHand}</TableCell>
                    <TableCell align="right">{r.reserved}</TableCell>
                    <TableCell align="right">{r.available}</TableCell>
                    <TableCell align="center">
                      <Button
                        component={Link}
                        href={`/dashboard/products/${r.id}/inventory`}
                        variant="outlined"
                        size="small"
                      >
                        จัดการล็อต
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
