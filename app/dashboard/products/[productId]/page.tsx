import { notFound } from "next/navigation";
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { getProduct } from "../data";
import ProductGallery from "../_components/product-gallery";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) return notFound();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1100 }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <ProductGallery
                images={(product.images ?? []).map((img: any) => ({ id: img.id, url: img.url, alt: product.nameTH }))}
                productCode={product.productCode}
                name={product.nameTH}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Typography variant="overline" color="text.secondary" component="div">
                  {product.category || "สินค้า"}
                </Typography>
                <Typography variant="h4" fontWeight={800} component="div">
                  {product.nameTH}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5" fontWeight={800} component="div">
                    {product.price != null ? `฿${product.price}` : "-"}
                  </Typography>
                  <Chip size="small" label={product.status} />
                </Stack>
                <Info label="รหัสสินค้า" value={product.productCode} />
                <Info label="ยี่ห้อ" value={product.brand ?? "-"} />
                <Info label="หน่วยนับ" value={product.unit ?? "-"} />
                <Info label="เลขที่ผลิต" value={product.lotNumber ?? "-"} />
                <Info label="วันที่ผลิต" value={product.mfgDate ? new Date(product.mfgDate).toISOString().slice(0,10) : '-'} />
                <Info label="วันหมดอายุ" value={product.expDate ? new Date(product.expDate).toISOString().slice(0,10) : '-'} />
                {product.description && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} component="div" sx={{ mb: 0.5 }}>
                      รายละเอียดสินค้า
                    </Typography>
                    <Typography color="text.secondary" component="div">
                      {product.description}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* สต็อก */}
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
              {(product.stocks || []).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.qtyOnHand}</TableCell>
                  <TableCell>{s.qtyReserved}</TableCell>
                  <TableCell>{s.qtyVirtual}</TableCell>
                  <TableCell>{s.lotNumber ?? "-"}</TableCell>
                  <TableCell>
                    {s.mfgDate
                      ? new Date(s.mfgDate).toISOString().slice(0, 10)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {s.expDate
                      ? new Date(s.expDate).toISOString().slice(0, 10)
                      : "-"}
                  </TableCell>
                  <TableCell>{s.note ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        
      </Stack>
    </Box>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Divider />
        {children}
      </Stack>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container>
      <Grid size={{ xs: 5, sm: 3 }}>
        <Typography variant="body2" color="text.secondary" component="div">
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 7, sm: 9 }}>
        <Typography fontWeight={600} component="div">
          {typeof value === "string" || typeof value === "number"
            ? String(value)
            : value}
        </Typography>
      </Grid>
    </Grid>
  );
}
