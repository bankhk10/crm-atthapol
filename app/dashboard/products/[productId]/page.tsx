import { notFound } from "next/navigation";
import { Box, Chip, Divider, Paper, Stack, Typography, Grid, Button } from "@mui/material";
import { getProduct } from "../data";
import Link from "next/link";
import ProductGallery from "../_components/product-gallery";

// Define a more accurate type for Plant based on the log
type PlantData = {
  plant: {
    id: string;
    name: string;
    description?: string;
  };
  plantId: string;
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) return notFound();

  // Safely get the plants array
  const plants: PlantData[] = Array.isArray(product.plants) ? product.plants : [];

  // Stock totals summary
  const totals = (product.stocks || []).reduce(
    (acc: { onHand: number; reserved: number }, s: any) => {
      acc.onHand += Number(s.qtyOnHand || 0);
      acc.reserved += Number(s.qtyReserved || 0);
      return acc;
    },
    { onHand: 0, reserved: 0 },
  );
  const available = Math.max(0, totals.onHand - totals.reserved);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        py: 4,
        px: { xs: 2, md: 0 },
      }}
    >
      <Stack
        spacing={3}
        sx={{
          width: "100%",
          maxWidth: 1100,
        }}
      >
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          {/* Header */}
          <Grid container spacing={3}>
            {/* Product Gallery & Description Column */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <ProductGallery
                  images={(product.images ?? []).map((img: any) => ({
                    id: img.id,
                    url: img.url,
                    alt: product.nameTH,
                  }))}
                  productCode={product.productCode}
                  name={product.nameTH}
                />
                {product.description && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: "grey.50",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                      รายละเอียดสินค้า
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography color="text.secondary">{product.description}</Typography>
                  </Paper>
                )}
              </Stack>
            </Grid>

            {/* Product Info Column */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: "grey.50",
                  height: "100%",
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={800}>
                    ข้อมูลสินค้า
                  </Typography>
                  <Divider />

                  <Stack spacing={1.5}>
                    {/* --- START: EDIT HERE --- */}
                    <Grid container>
                      <Grid size={{ xs: 5, sm: 3 }}>
                        <Typography variant="body1" color="text.secondary" component="div">
                          รหัสสินค้า :
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 7, sm: 9 }}>
                        <Typography
                          variant="body1"
                          fontWeight={600}
                          component="div"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {product.productCode}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Info label="หมวดหมู่ : " value={product.category ?? "-"} />
                    <Info label="แบรนด์ : " value={product.brand ?? "-"} />
                    <Info label="หน่วยนับ : " value={product.unit ?? "-"} />
                    {product.features && <Info label="คุณสมบัติ : " value={product.features} />}
                    {product.packagingSize && (
                      <Info label="ขนาดบรรจุ : " value={product.packagingSize} />
                    )}

                    {plants.length > 0 && (
                      <Info
                        label="ใช้กับพืช : "
                        value={
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {plants.map((plantData) => (
                              <Chip
                                key={plantData.plantId}
                                label={plantData.plant.name}
                                size="small"
                              />
                            ))}
                          </Box>
                        }
                      />
                    )}
            
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        {Array.isArray(product.stocks) && product.stocks.length > 0 && (
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              sx={{ mb: 1 }}
            >
              <Typography variant="h6" fontWeight={800}>
                ล็อตล่าสุด
              </Typography>
              <Button
                component={Link}
                href={`/dashboard/products/${product.id}/inventory`}
                variant="outlined"
                size="small"
              >
                ดูทั้งหมด
              </Button>
            </Stack>
            <Grid container sx={{ fontSize: 14, color: "text.secondary", mb: 1, px: 1 }}>
              <Grid size={{ xs: 4, sm: 2 }}>เลขล็อต</Grid>
              <Grid size={{ xs: 4, sm: 2 }} sx={{ textAlign: { sm: "center" } }}>
                คงเหลือ
              </Grid>
              <Grid size={{ xs: 4, sm: 3 }} sx={{ display: { xs: "none", sm: "block" } }}>
                วันที่นำเข้า
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }} sx={{ display: { xs: "none", sm: "block" } }}>
                วันหมดอายุ
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                หมายเหตุ
              </Grid>
            </Grid>
            <Stack spacing={1}>
              {[...product.stocks]
                .sort(
                  (a: any, b: any) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .slice(0, 6)
                .map((s: any) => (
                  <Grid
                    key={s.id}
                    container
                    alignItems="center"
                    sx={{
                      px: 1,
                      py: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Grid size={{ xs: 4, sm: 2 }}>
                      <Typography fontWeight={700}>{s.lotNumber}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4, sm: 2 }} sx={{ textAlign: { sm: "center" } }}>
                      <Typography>{s.qtyOnHand ?? 0}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4, sm: 3 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography>
                        {s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography>
                        {s.expDate ? new Date(s.expDate).toISOString().slice(0, 10) : "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography noWrap title={s.note || ""}>
                        {s.note || ""}
                      </Typography>
                    </Grid>
                  </Grid>
                ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

// --- Helper Components (No Changes) ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

function StatusChip({ status }: { status: "ACTIVE" | "INACTIVE" | "EXPIRED" }) {
  if (status === "ACTIVE")
    return <Chip label="ใช้งานอยู่" color="success" variant="outlined" size="small" />;
  if (status === "INACTIVE")
    return <Chip label="ไม่ใช้งาน" color="default" variant="outlined" size="small" />;
  return <Chip label="หมดอายุ" color="warning" variant="outlined" size="small" />;
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
          {typeof value === "string" || typeof value === "number" ? String(value) : value}
        </Typography>
      </Grid>
    </Grid>
  );
}
