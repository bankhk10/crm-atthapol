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
  IconButton,
  TextField,
  Stack,
  Pagination,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Snackbar } from "@mui/material";
import { EmptyTableMessage } from "@/components/ui/EmptyTableMessage";
import type { CustomerWithDetails } from "../types";
import { formatNumber } from "@/lib/format";
import { CreditLimitEditDialog } from "./credit-limit-edit-dialog";
import { CreditRequestDialog } from "./credit-request-dialog";

export function CreditLimitsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CustomerWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerWithDetails | null>(null);
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

  const pageSize = rowsPerPage;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/customers/dealers?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      // ignore for now
    } finally {
      setLoading(false);
    }
  };

  // Initialize from URL search params on mount
  useEffect(() => {
    const sp = searchParams;
    const p = Number(sp?.get("page") || "");
    if (Number.isFinite(p) && p > 0) setPage(p);
    const q0 = (sp?.get("q") || "").trim();
    if (q0) {
      setQInput(q0);
      setQ(q0);
    }
    // show saved banner if present
    const saved = sp?.get("saved");
    if (saved) {
      setShowSaved(true);
      // remove saved param from URL
      const nxt = new URLSearchParams(sp.toString());
      nxt.delete("saved");
      router.replace(`${pathname}${nxt.toString() ? `?${nxt.toString()}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce input -> q
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(1);
      setQ(qInput.trim());
    }, 350);
    return () => clearTimeout(h);
  }, [qInput]);

  // Load when page or q changes
  useEffect(() => {
    load();
    // reflect into URL
    const next = new URLSearchParams(searchParams?.toString() || "");
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.set("page", String(page));
    next.set("pageSize", String(pageSize));
    router.replace(`${pathname}?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  return (
    <>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <TextField
            placeholder="ค้นหาร้าน (ชื่อ/ผู้ติดต่อ)"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={() => router.push('/dashboard/customers/credit-limits/create')}
          >
            ขอวงเงินเครดิตชั่วคราว
          </Button>
        </Box>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>รหัส/ชื่อร้าน</TableCell>
              <TableCell>ชื่อผู้ติดต่อ</TableCell>
              <TableCell align="right">วงเงินเครดิต</TableCell>
              <TableCell align="right">วงเงินเครดิตชั่วคราว</TableCell>
              <TableCell align="right">วันหมดอายุ</TableCell>
              <TableCell align="right">วงเงินส่งเสริมการขาย</TableCell>
              <TableCell align="right">วงเงินคงเหลือ</TableCell>
              <TableCell align="center">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyTableMessage colSpan={8} message={loading ? "กำลังโหลด..." : "ไม่พบข้อมูลลูกค้า"} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Box>{customer.companyName}</Box>
                  </TableCell>
                  <TableCell>{customer.dealerDetail?.contactName || "-"}</TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.creditLimit ? formatNumber(customer.dealerDetail.creditLimit) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.temporaryCreditLimit ? formatNumber(customer.dealerDetail.temporaryCreditLimit) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.temporaryCreditExpiry
                      ? new Date(customer.dealerDetail.temporaryCreditExpiry).toLocaleDateString("th-TH")
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.promotionBudgetLimit ? formatNumber(customer.dealerDetail.promotionBudgetLimit) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.creditLimit ? formatNumber(customer.dealerDetail.creditLimit) : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => setEditCustomer(customer)}>
                      <EditIcon />
                    </IconButton>
                    <Button size="small" sx={{ ml: 1 }} onClick={() => setRequestingFor(customer.id)}>
                      ขอวงเงินชั่วคราว
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
        <Pagination
          count={Math.max(1, Math.ceil(total / pageSize))}
          page={page}
          onChange={(_, p) => setPage(p)}
        />
      </Box>

      <Snackbar
        open={showSaved}
        message="บันทึกสำเร็จ"
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setShowSaved(false)}
        autoHideDuration={3000}
      />

      {editCustomer && (
        <CreditLimitEditDialog
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => {
            // reload list and show saved banner via URL param
            load();
            const sp = new URLSearchParams(searchParams?.toString() || "");
            sp.set("saved", "1");
            router.replace(`${pathname}?${sp.toString()}`);
            setShowSaved(true);
          }}
        />
      )}
      {requestingFor && (
        <CreditRequestDialog open={Boolean(requestingFor)} customerId={requestingFor} onClose={() => setRequestingFor(null)} />
      )}
    </>
  );
}
