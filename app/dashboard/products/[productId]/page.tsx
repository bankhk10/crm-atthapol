import { notFound } from "next/navigation";
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  Grid,
} from "@mui/material";
import { getProduct } from "../data";
import ProductImagesViewer from "../_components/product-images-viewer";

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
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1024 }}>
        {/* ข้อมูลสินค้า */}
        <Section title="ข้อมูลสินค้า">
          <Stack spacing={1.5}>
            <Grid container>
              <Grid size={{ xs: 5, sm: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  ชื่อ (TH)
                </Typography>
              </Grid>
              <Grid size={{ xs: 7, sm: 9 }}>
                <Typography fontWeight={700}>{product.nameTH}</Typography>
              </Grid>
            </Grid>
            <Info label="ชื่อ (EN)" value={product.nameEN ?? "-"} />
            <Info label="รหัสสินค้า" value={product.productCode} />
            <Info label="หมวดหมู่" value={product.category ?? "-"} />
            <Info label="ยี่ห้อ" value={product.brand ?? "-"} />
            <Info label="หน่วยนับ" value={product.unit ?? "-"} />
            <Info label="ราคา" value={product.price ?? "-"} />
            <Info
              label="สถานะ"
              value={<Chip size="small" label={product.status} />}
            />
            <Info label="เลขที่ผลิต" value={product.lotNumber ?? "-"} />
            <Info
              label="วันที่ผลิต"
              value={
                product.mfgDate
                  ? new Date(product.mfgDate).toISOString().slice(0, 10)
                  : "-"
              }
            />
            <Info
              label="วันหมดอายุ"
              value={
                product.expDate
                  ? new Date(product.expDate).toISOString().slice(0, 10)
                  : "-"
              }
            />
            {product.description && (
              <Info label="รายละเอียด" value={product.description} />
            )}
          </Stack>
        </Section>
        {/* รูปภาพสินค้า */}
        <Section title="รูปภาพสินค้า">
          <ProductImagesViewer
            images={(product.images ?? []).map((img: any) => ({
              id: img.id,
              url: img.url,
              alt: product.nameTH,
            }))}
          />
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
