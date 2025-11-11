"use client";

import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Chip,
  Stack,
  Typography,
  Snackbar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import { CreditLimitEditDialog } from "./credit-limit-edit-dialog";
import type { CustomerWithDetails } from "../types";

type DealerWithDetails = CustomerWithDetails;

export function ManageAllCreditLimitsClient() {
  const [dealers, setDealers] = useState<DealerWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  // Sorting & pagination
  type Order = "asc" | "desc";
  type SortKey = "name" | "creditLimit" | "promotionBudgetLimit";

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<SortKey>("name");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Edit dialog state
  const [editCustomer, setEditCustomer] = useState<DealerWithDetails | null>(null);

  const loadDealers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(rowsPerPage),
        type: "DEALER",
      });
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/customers/dealers?${params.toString()}`);
      const data = await res.json();
      setDealers(data.items || []);
    } catch (err) {
      console.error("Failed to load dealers", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(0);
      setQ(qInput.trim());
    }, 350);
    return () => clearTimeout(h);
  }, [qInput]);

  // Load when page, q, or rowsPerPage changes
  useEffect(() => {
    loadDealers();
  }, [page, q, rowsPerPage]);

  const getValue = (dealer: DealerWithDetails, key: SortKey) => {
    const dd = dealer.dealerDetail;
    switch (key) {
      case "name":
        return dealer.companyName || `${dealer.firstName || ""} ${dealer.lastName || ""}`.trim() || "";
      case "creditLimit":
        return dd?.creditLimit ?? 0;
      case "promotionBudgetLimit":
        return dd?.promotionBudgetLimit ?? 0;
    }
  };

  const descendingComparator = (a: DealerWithDetails, b: DealerWithDetails, key: SortKey) => {
    const av = getValue(a, key);
    const bv = getValue(b, key);
    const as = typeof av === "number" ? av : String(av).toLowerCase();
    const bs = typeof bv === "number" ? bv : String(bv).toLowerCase();
    if (bs < as) return -1;
    if (bs > as) return 1;
    return 0;
  };

  const getComparator = (ord: Order, key: SortKey) =>
    ord === "asc"
      ? (a: DealerWithDetails, b: DealerWithDetails) => descendingComparator(a, b, key)
      : (a: DealerWithDetails, b: DealerWithDetails) => -descendingComparator(a, b, key);

  const headCells = [
    { id: "name" as SortKey, label: "ชื่อร้าน", width: 300, align: "left" as const },
    { id: "creditLimit" as SortKey, label: "วงเงินเครดิต", width: 200, align: "right" as const },
  { id: "promotionBudgetLimit" as SortKey, label: "วงเงินส่งเสริมการขาย", width: 250, align: "right" as const },
  ];

  const filteredSorted = useMemo(() => {
    return [...dealers].sort(getComparator(order, orderBy));
  }, [dealers, order, orderBy]);

  const handleRequestSort = (_: React.MouseEvent<unknown>, property: SortKey) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  return (
    <>
      {/* Search bar */}
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
        <Box sx={{ width: 360 }}>
          <TextField
            fullWidth
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ค้นหาชื่อร้าน"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
            }}
            size="small"
          />
        </Box>
      </Stack>

      {/* Table */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          borderColor: "#ddd",
          fontFamily: "Prompt, sans-serif",
          mt: 2,
        }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <TableContainer
            sx={{
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              "&::-webkit-scrollbar": { width: 8 },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#ccc", borderRadius: 6 },
            }}
          >
            <Table aria-labelledby="tableTitle" sx={{ minWidth: 750, tableLayout: "fixed" }} size="small">
              <TableHead
                sx={{
                  bgcolor: "#ccccceff",
                  "& .MuiTableCell-root": {
                    bgcolor: "#ccccceff",
                    color: "#1a1919ff",
                    fontFamily: "Prompt, sans-serif",
                    fontSize: "1rem",
                    fontWeight: 800,
                    borderBottom: "none",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableRow>
                  {headCells.map((h) => (
                    <TableCell key={h.id} align={h.align} sx={{ width: h.width }}>
                      <TableSortLabel
                        active={orderBy === h.id}
                        direction={orderBy === h.id ? order : "asc"}
                        sx={{
                          color: "inherit !important",
                          "& .MuiTableSortLabel-icon": { color: "inherit !important" },
                        }}
                        onClick={(e) => handleRequestSort(e, h.id)}
                      >
                        {h.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ width: 150 }}>การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSorted.map((dealer) => {
                  const dd = dealer.dealerDetail;
                  const name = dealer.companyName || `${dealer.firstName || ""} ${dealer.lastName || ""}`.trim() || "-";
                  return (
                    <TableRow key={dealer.id} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}>
                      <TableCell sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
                      </TableCell>
                      <TableCell align="right">
                        {dd?.creditLimit != null ? formatNumber(dd.creditLimit) : "-"}
                      </TableCell>
                      <TableCell align="right">
                        {dd?.promotionBudgetLimit != null ? formatNumber(dd.promotionBudgetLimit) : "-"}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setEditCustomer(dealer)}
                        >
                          แก้ไขวงเงิน
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredSorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={headCells.length + 1} align="center">
                      <Typography color="text.secondary">
                        {loading ? "กำลังโหลด..." : "ไม่พบข้อมูลร้านค้า"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={dealers.length} // Note: This is simplified, should use total from API
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Edit dialog */}
      {editCustomer && (
        <CreditLimitEditDialog
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => {
            setEditCustomer(null);
            setShowSaved(true);
            loadDealers();
          }}
        />
      )}

      {/* Success snackbar */}
      <Snackbar
        open={showSaved}
        message="บันทึกสำเร็จ"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setShowSaved(false)}
        autoHideDuration={3000}
      />
    </>
  );
}