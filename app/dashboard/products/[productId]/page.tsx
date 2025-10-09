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
  const plants: PlantData[] = Array.isArray(product.plants)
    ? product.plants
    : [];

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
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
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
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ mb: 1 }}
                    >
                      รายละเอียดสินค้า
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography color="text.secondary">
                      {product.description}
                    </Typography>
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
                  <Typography variant="h5" fontWeight={800}>
                    {product.nameTH}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={800}>
                      {product.price != null ? `฿${product.price}` : "-"}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        product.status === "ACTIVE"
                          ? "ใช้งานอยู่"
                          : product.status === "INACTIVE"
                          ? "ไม่ใช้งาน"
                          : product.status === "EXPIRED"
                          ? "หมดอายุ"
                          : "ใกล้หมดอายุ"
                      }
                      sx={{
                        fontWeight: 800,
                        px: 2,
                        py: 2,
                        borderRadius: "9999px",
                        color:
                          product.status === "ACTIVE"
                            ? "#fff"
                            : product.status === "INACTIVE"
                            ? "#424242"
                            : product.status === "EXPIRED"
                            ? "#fff"
                            : "#000",
                        bgcolor:
                          product.status === "ACTIVE"
                            ? "#22C55E"
                            : product.status === "INACTIVE"
                            ? "#E0E0E0"
                            : product.status === "EXPIRED"
                            ? "#EF4444"
                            : "#FACC15",
                      }}
                    />
                  </Stack>

                  <Divider />

                  <Stack spacing={1.5}>
                    {/* --- START: EDIT HERE --- */}
                    <Grid container>
                      <Grid size={{ xs: 5, sm: 3 }}>
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          component="div"
                        >
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
                    {/* --- END: EDIT HERE --- */}

                    <Info
                      label="หมวดหมู่ : "
                      value={product.category ?? "-"}
                    />
                    <Info label="แบรนด์ : " value={product.brand ?? "-"} />
                    <Info label="หน่วยนับ : " value={product.unit ?? "-"} />
                    {product.features && (
                      <Info label="คุณสมบัติ : " value={product.features} />
                    )}
                    {product.packagingSize && (
                      <Info label="ขนาดบรรจุ : " value={product.packagingSize} />
                    )}

                    {plants.length > 0 && (
                      <Info
                        label="ใช้กับพืช : "
                        value={
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                          >
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

                    {(product.stocks || []).flatMap((s: any) => [
                      <Info
                        key={`${s.id}-onhand`}
                        label="สต็อกคงเหลือ : "
                        value={s.qtyOnHand ?? "-"}
                      />,
                      <Info
                        key={`${s.id}-reserved`}
                        label="สต็อกจอง : "
                        value={s.qtyReserved ?? "-"}
                      />,
                    ])}

                    <Info
                      label="วันที่ผลิต : "
                      value={
                        product.mfgDate
                          ? new Date(product.mfgDate).toISOString().slice(0, 10)
                          : "-"
                      }
                    />
                    <Info
                      label="วันหมดอายุ : "
                      value={
                        product.expDate
                          ? new Date(product.expDate).toISOString().slice(0, 10)
                          : "-"
                      }
                    />
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

// --- Helper Components (No Changes) ---

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
