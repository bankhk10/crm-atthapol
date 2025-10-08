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
                images={(product.images ?? []).map((img: any) => ({
                  id: img.id,
                  url: img.url,
                  alt: product.nameTH,
                }))}
                // productCode={product.productCode}
                // name={product.nameTH}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {/* ครอบทั้งหมดด้วย Paper */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "grey.50",
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="body1" color="text.secondary">
                    {product.category || "สินค้า"}
                  </Typography>

                  <Typography variant="h5" fontWeight={800}>
                    {product.nameTH}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={800}>
                      {product.price != null ? `฿${product.price}` : "-"}
                    </Typography>
                    <Chip size="small" label={product.status} />
                  </Stack>

                  <Divider />

                  <Stack spacing={1.5}>
                    <Info label="รหัสสินค้า" value={product.productCode} />
                    <Info
                      label="หมวดหมู่สินค้า"
                      value={product.category ?? "-"}
                    />
                    <Info label="ยี่ห้อ" value={product.brand ?? "-"} />
                    <Info label="หน่วยนับ" value={product.unit ?? "-"} />

                    {/* 🔹 กล่องสต็อกย่อย */}
                    {(product.stocks || []).map((s: any) => (
                      <Paper
                        key={s.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "white",
                        }}
                      >
                        <Stack spacing={0.75}>
                          <Info
                            label="สต็อกคงเหลือ"
                            value={s.qtyOnHand ?? "-"}
                          />
                          <Info label="สต็อกจอง" value={s.qtyReserved ?? "-"} />
                        </Stack>
                      </Paper>
                    ))}

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
                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{ mb: 0.5 }}
                        >
                          รายละเอียดสินค้า
                        </Typography>
                        <Typography color="text.secondary">
                          {product.description}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
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
        <Typography variant="body1" fontWeight={700}>
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
        <Typography variant="body1" color="text.secondary" component="div">
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 7, sm: 9 }}>
        <Typography variant="body1" fontWeight={600} component="div">
          {typeof value === "string" || typeof value === "number"
            ? String(value)
            : value}
        </Typography>
      </Grid>
    </Grid>
  );
}
