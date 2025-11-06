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
                      จุดขายสินค้า
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography color="text.secondary">{product.features}</Typography>
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

                  <Stack spacing={3}>
                    {/* กลุ่ม: ข้อมูลทั่วไป */}
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1" fontWeight={700}>ข้อมูลทั่วไป</Typography>
                      <Divider />
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
                      <Info label="ชื่อสินค้า : " value={product.nameTH ?? "-"} />
                      <Info label="กลุ่มสินค้า : " value={product.category ?? "-"} />
                      <Info label="แบรนด์ : " value={product.brand ?? "-"} />
                      <Info label="ชื่อสามัญ : " value={product.nameEN ?? "-"} />
                      <Info label="ขนาดบรรจุ : " value={product.packagingSize ?? "-"} />
                      <Info label="หน่วยนับ : " value={product.unit ?? "-"} />
                      <Info label="สถานะ : " value={<StatusChip status={product.status} />} />
                      {typeof product.price === 'number' && (
                        <Info
                          label="ราคา : "
                          value={`฿${Number(product.price).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`}
                        />
                      )}
                      {product.mfgDate && (
                        <Info label="วันที่ผลิต : " value={new Date(product.mfgDate).toISOString().slice(0, 10)} />
                      )}
                      {product.expDate && (
                        <Info label="วันหมดอายุ (สินค้า) : " value={new Date(product.expDate).toISOString().slice(0, 10)} />
                      )}
                    </Stack>

                    {/* กลุ่ม: การใช้งานกับพืช */}
                    {plants.length > 0 && (
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle1" fontWeight={700}>การใช้งานกับพืช</Typography>
                        <Divider />
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
                      </Stack>
                    )}


                    {/* กลุ่ม: ภาพรวมสต็อก */}
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1" fontWeight={700}>ภาพรวมสต็อก</Typography>
                      <Divider />
                      <Info label="จำนวนสินค้าทั้งหมด : " value={Number(totals.onHand).toLocaleString('th-TH')} />
                      <Info label="พร้อมขาย : " value={Number(Math.max(0, totals.onHand - totals.reserved)).toLocaleString('th-TH')} />
                      <Info label="สต็อกจอง : " value={Number(totals.reserved).toLocaleString('th-TH')} />
                    </Stack>

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
              <Grid size={{ xs: 6, sm: 2 }}>เลขล็อต</Grid>
              <Grid size={{ xs: 6, sm: 2 }} sx={{ textAlign: { sm: "center" } }}>
                คงเหลือ
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                คลังสินค้า
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                สถานที่จัดเก็บ
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                วันที่นำเข้า
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                วันหมดอายุ
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
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <Typography fontWeight={700}>{s.lotNumber}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ textAlign: { sm: "center" } }}>
                      <Typography>{Number(s.qtyOnHand ?? 0).toLocaleString('th-TH')}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography noWrap>
                        {s.warehouseRef?.name ?? s.warehouse ?? "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography noWrap>
                        {s.locationRef?.name ?? s.storageLocation ?? "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography>
                        {s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 2 }} sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography>
                        {s.expDate ? new Date(s.expDate).toISOString().slice(0, 10) : "-"}
                      </Typography>
                    </Grid>
                  </Grid>
                ))}
            </Stack>
          </Paper>
        )}

        {/* รายละเอียดการจัดเก็บ (สรุปตามคลัง/ตำแหน่ง) */}
        {Array.isArray(product.stocks) && product.stocks.length > 0 && (
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={800}>รายละเอียดการจัดเก็บ</Typography>
              <Divider />
              {(() => {
                const whMap = new Map<string, { name: string; totalQty: number; lotCount: number; locMap: Map<string, { name: string; totalQty: number; lotCount: number }> }>();
                for (const s of product.stocks as any[]) {
                  const whName = s.warehouseRef?.name ?? s.warehouse ?? "ไม่ระบุ";
                  const locName = s.locationRef?.name ?? s.storageLocation ?? "ไม่ระบุ";
                  const qty = Number(s.qtyOnHand ?? 0);
                  if (!whMap.has(whName)) whMap.set(whName, { name: whName, totalQty: 0, lotCount: 0, locMap: new Map() });
                  const wh = whMap.get(whName)!;
                  wh.totalQty += qty;
                  wh.lotCount += 1;
                  if (!wh.locMap.has(locName)) wh.locMap.set(locName, { name: locName, totalQty: 0, lotCount: 0 });
                  const loc = wh.locMap.get(locName)!;
                  loc.totalQty += qty;
                  loc.lotCount += 1;
                }
                const warehouses = Array.from(whMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                return (
                  <Stack spacing={2}>
                    {warehouses.map((w) => (
                      <Stack key={w.name} spacing={1.25}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" fontWeight={700}>{w.name}</Typography>
                          <Chip label={`${w.lotCount} ล็อต`} size="small" />
                          <Chip label={`${w.totalQty.toLocaleString('th-TH')} ชิ้น`} size="small" color="primary" variant="outlined" />
                        </Stack>
                        <Grid container sx={{ fontSize: 14, color: 'text.secondary', mb: 0.5, px: 1 }}>
                          <Grid size={{ xs: 6, sm: 6 }}>สถานที่จัดเก็บ</Grid>
                          <Grid size={{ xs: 6, sm: 6 }}>คงเหลือ/ล็อต</Grid>
                        </Grid>
                        <Stack>
                          {Array.from(w.locMap.values()).sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
                            <Grid key={l.name} container alignItems="center" sx={{ px: 1, py: 0.5 }}>
                              <Grid size={{ xs: 6, sm: 6 }}>
                                <Typography>{l.name}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 6 }}>
                                <Typography>{`${l.totalQty.toLocaleString('th-TH')} ชิ้น / ${l.lotCount} ล็อต`}</Typography>
                              </Grid>
                            </Grid>
                          ))}
                        </Stack>
                        <Divider />
                      </Stack>
                    ))}
                  </Stack>
                );
              })()}
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
