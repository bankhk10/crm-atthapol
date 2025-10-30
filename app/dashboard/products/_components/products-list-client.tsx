"use client";

import { useState } from "react";
import { Box, Button, Stack, TextField, Toolbar } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import type { ProductListItem } from "../data";
import { ProductsTable } from "./products-table";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export default function ProductsListClient({ products }: { products: ProductListItem[] }) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");

  return (
    <Stack spacing={2}>
      {/* 🔍 Toolbar */}
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 2, sm: 2 },
          // py: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* 🔎 ค้นหาฝั่งซ้าย */}
        <Box sx={{ position: "relative", width: { xs: 200, sm: 260, md: 360 } }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา (รหัส/ชื่อ/แบรนด์/จำนวน/พร้อมขาย)"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
            }}
            size="small"
          />
        </Box>

        {/* ➕ ปุ่มเพิ่มสินค้าฝั่งขวา */}
        {hasPermission(session?.user?.permissions, "products", "create") && (
          <Button
            component={Link}
            href="/dashboard/products/new"
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            เพิ่มสินค้า
          </Button>
        )}
      </Toolbar>

      {/* 🧾 ตารางสินค้า */}
      <ProductsTable products={products} query={query} />
    </Stack>
  );
}
