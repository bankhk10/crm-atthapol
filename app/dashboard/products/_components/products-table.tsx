"use client";

import { useMemo, useState } from "react";
import { Box, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Link from "next/link";
import type { ProductListItem } from "../data";
import { deleteProduct } from "../delete";

type Props = { products: ProductListItem[] };

export function ProductsTable({ products }: Props) {
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [
      p.productCode,
      p.nameTH,
      p.category,
      p.brand ?? "",
      p.status,
    ].join(" ").toLowerCase().includes(q));
  }, [products, query]);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Box sx={{ position: "relative", width: { xs: "100%", md: 360 } }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา (รหัส/ชื่อ/หมวด/ยี่ห้อ/สถานะ)"
            InputProps={{ startAdornment: (<SearchIcon fontSize="small" style={{ marginRight: 8 }} />) }}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: "100%", overflowX: "auto" }}>
          <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>รหัส</TableCell>
                <TableCell>ชื่อสินค้า</TableCell>
                <TableCell>หมวดหมู่</TableCell>
                <TableCell>ยี่ห้อ</TableCell>
                <TableCell>สต็อก</TableCell>
                <TableCell>ราคา</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">การกระทำ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Link href={`/dashboard/products/${p.id}`}>{p.productCode}</Link>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.nameTH}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {p.category || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {p.brand || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.stockOnHand}</TableCell>
                  <TableCell>{p.price ?? "-"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={p.status} color={p.status === "ACTIVE" ? "success" : p.status === "EXPIRED" ? "warning" : "default"} variant="outlined" />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton component={Link} href={`/dashboard/products/${p.id}/edit`} aria-label="edit" size="small">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="delete" size="small" onClick={() => setDeleteTarget(p)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">ไม่พบข้อมูลสินค้า</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
          <DialogTitle>ลบสินค้า</DialogTitle>
          <DialogContent>
            <DialogContentText>
              ยืนยันการลบ {deleteTarget?.productCode ?? "สินค้า"}? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)} color="inherit">ยกเลิก</Button>
            <Button
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteProduct(deleteTarget.id);
                  setDeleteTarget(null);
                } catch (e) {
                  setDeleteTarget(null);
                }
              }}
              color="error"
              variant="contained"
              startIcon={<DeleteOutlineIcon />}
            >
              ลบ
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
}

