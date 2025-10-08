import { notFound } from "next/navigation";
import { Box, Chip, Divider, Grid, Paper, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { ActionButtons } from "../../_components/action-buttons";
import { getProduct } from "../data";

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) return notFound();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1200 }}>
        <ActionButtons resource="products" />

        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={1.5}>
                <Typography variant="h5" fontWeight={800}>{product.nameTH}</Typography>
                <Typography color="text.secondary">รหัส: {product.productCode}</Typography>
                <Chip size="small" label={product.status} color={product.status === "ACTIVE" ? "success" : product.status === "EXPIRED" ? "warning" : "default"} variant="outlined" />
                <Typography color="text.secondary">หมวดหมู่: {product.category}</Typography>
                {product.brand && (<Typography color="text.secondary">ยี่ห้อ: {product.brand}</Typography>)}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={2}>
                <Section title="ข้อมูลสินค้า">
                  <Info label="ชื่อ (EN)" value={product.nameEN ?? "-"} />
                  <Info label="หน่วยนับ" value={product.unit ?? "-"} />
                  <Info label="ราคา" value={product.price ?? "-"} />
                  <Info label="เลขที่ผลิต" value={product.lotNumber ?? "-"} />
                  <Info label="วันที่ผลิต" value={product.mfgDate ? new Date(product.mfgDate).toISOString().slice(0,10) : "-"} />
                  <Info label="วันหมดอายุ" value={product.expDate ? new Date(product.expDate).toISOString().slice(0,10) : "-"} />
                </Section>

                <Section title="สต็อก">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>คงเหลือ</TableCell>
                        <TableCell>จอง</TableCell>
                        <TableCell>เสมือน</TableCell>
                        <TableCell>ล็อต</TableCell>
                        <TableCell>ผลิต</TableCell>
                        <TableCell>หมดอายุ</TableCell>
                        <TableCell>หมายเหตุ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(product.stocks || []).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.qtyOnHand}</TableCell>
                          <TableCell>{s.qtyReserved}</TableCell>
                          <TableCell>{s.qtyVirtual}</TableCell>
                          <TableCell>{s.lotNumber ?? '-'}</TableCell>
                          <TableCell>{s.mfgDate ? new Date(s.mfgDate).toISOString().slice(0,10) : '-'}</TableCell>
                          <TableCell>{s.expDate ? new Date(s.expDate).toISOString().slice(0,10) : '-'}</TableCell>
                          <TableCell>{s.note ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Section>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Stack>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        <Divider />
        {children}
      </Stack>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container>
      <Grid size={{ xs: 5, sm: 3 }}><Typography variant="body2" color="text.secondary">{label}</Typography></Grid>
      <Grid size={{ xs: 7, sm: 9 }}><Typography fontWeight={600}>{typeof value === 'string' || typeof value === 'number' ? String(value) : value}</Typography></Grid>
    </Grid>
  );
}
