"use client";

import { useState } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import type { CustomerListItem } from "../data";
import { CustomersTable } from "./customers-table";

export default function CustomersListClient({ customers }: { customers: CustomerListItem[] }) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");

  const canCreate = hasPermission(session?.user?.permissions, "customers", "create");

  return (
    <Stack spacing={2}>
      {/* Toolbar combined: search left, add-buttons right */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: { sm: 2 }, py: 1 }}
      >
        {/* search */}
        <Box sx={{ width: { xs: "100%", sm: 260, md: 360 } }}>
          <TextField
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา (ชื่อ/โทร/อีเมล/ที่อยู่)"
            InputProps={{ startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} /> }}
            size="small"
          />
        </Box>

        {/* add buttons group */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Button component={Link} href="/dashboard/customers/new/dealer" variant="contained" color="primary">
            เพิ่ม Dealer
          </Button>
          <Button component={Link} href="/dashboard/customers/new/subdealer" variant="contained" color="secondary">
            เพิ่ม SubDealer
          </Button>
          <Button component={Link} href="/dashboard/customers/new/farmer" variant="contained" color="success">
            เพิ่ม Farmer
          </Button>
        </Stack>
      </Stack>

      {/* table */}
      <CustomersTable customers={customers} query={query} />
    </Stack>
  );
}