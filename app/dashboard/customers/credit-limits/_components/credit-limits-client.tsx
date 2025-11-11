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
  TextField,
  Stack,
  Pagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import { Snackbar } from "@mui/material";
import { EmptyTableMessage } from "@/components/ui/EmptyTableMessage";
import { formatNumber } from "@/lib/format";

export function CreditLimitsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const canApprove = hasPermission(session?.user?.permissions, "customers", "approve");
  const canReject = hasPermission(session?.user?.permissions, "customers", "reject") || canApprove;

  const pageSize = rowsPerPage;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/credit-requests?${params.toString()}`);
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

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const openDetails = (req: any) => {
    setSelected(req);
    setDetailOpen(true);
  };

  const openReject = (req: any) => {
    setSelected(req);
    setRejectNote(req.rejectReason || "");
    setRejectOpen(true);
  };

  const closeReject = () => {
    setSelected(null);
    setRejectNote("");
    setRejectOpen(false);
  };

  const closeDetails = () => {
    setSelected(null);
    setDetailOpen(false);
  };

  const renderStatusChip = (status: string) => {
    if (status === "PENDING") return <Chip label="รออนุมัติ" color="warning" size="small" />;
    if (status === "APPROVED") return <Chip label="อนุมัติ" color="success" size="small" />;
    if (status === "REJECTED") return <Chip label="ปฏิเสธ" color="error" size="small" />;
    return <Chip label={status} size="small" />;
  };

  return (
    <>
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
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ค้นหาร้าน (ชื่อ/ผู้ติดต่อ)"
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" style={{ marginRight: 8 }} />,
            }}
            size="small"
          />
        </Box>

        {/* action buttons group */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            component={Link}
            href="/dashboard/customers/credit-limits/create"
            variant="contained"
            color="primary"
          >
            ขอวงเงินเครดิตชั่วคราว
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>รหัสคำขอ</TableCell>
              <TableCell>ร้าน</TableCell>
              <TableCell>ผู้ติดต่อ</TableCell>
              <TableCell align="right">จำนวน (THB)</TableCell>
              <TableCell align="right">วันหมดอายุ</TableCell>
              <TableCell>สถานะ</TableCell>
              <TableCell>สร้างเมื่อ</TableCell>
              <TableCell align="center">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyTableMessage colSpan={8} message={loading ? "กำลังโหลด..." : "ไม่พบคำขอ"} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.id}</TableCell>
                  <TableCell>{req.customer?.companyName || req.customer?.name || "-"}</TableCell>
                  <TableCell>{req.customer?.dealerDetail?.contactName || "-"}</TableCell>
                  <TableCell align="right">{req.amount ? formatNumber(req.amount) : "-"}</TableCell>
                  <TableCell align="right">{req.expiryDate ? new Date(req.expiryDate).toLocaleDateString("th-TH") : "-"}</TableCell>
                  <TableCell>{renderStatusChip(req.status)}</TableCell>
                  <TableCell>{req.createdAt ? new Date(req.createdAt).toLocaleString("th-TH") : "-"}</TableCell>
                  <TableCell align="center">
                    <Button size="small" onClick={() => openDetails(req)}>
                      ดู
                    </Button>
                    {req.status === "PENDING" && (
                      <>
                        {canApprove && (
                          <Button size="small" color="success" onClick={async () => {
                            if (!confirm("ยืนยันอนุมัติคำขอ?")) return;
                            try {
                              await fetch(`/api/credit-requests/${req.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
                              load();
                            } catch (err) { console.error(err); }
                          }}>อนุมัติ</Button>
                        )}
                        {canReject && (
                          <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => openReject(req)}>ปฏิเสธ</Button>
                        )}
                        {!(canApprove || canReject) && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>ไม่มีสิทธิ์</Typography>
                        )}
                      </>
                    )}
                    {req.status !== "PENDING" && <span>-</span>}
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
      <Dialog open={detailOpen} onClose={closeDetails} fullWidth maxWidth="sm">
        <DialogTitle>รายละเอียดคำขอ</DialogTitle>
        <DialogContent>
          {selected ? (
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Typography><strong>รหัสคำขอ:</strong> {selected.id}</Typography>
              <Typography><strong>ร้าน:</strong> {selected.customer?.companyName || selected.customer?.name || '-'}</Typography>
              <Typography><strong>จำนวน:</strong> {selected.amount ? formatNumber(selected.amount) : '-'}</Typography>
              <Typography><strong>วันหมดอายุ:</strong> {selected.expiryDate ? new Date(selected.expiryDate).toLocaleDateString('th-TH') : '-'}</Typography>
              <Typography><strong>สถานะ:</strong> {selected.status}</Typography>
              <Typography><strong>ผู้ขอ:</strong> {selected.requestedByUserId || '-'}</Typography>
              <Typography><strong>เหตุผล / หมายเหตุ:</strong></Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selected.reason || '-'}</Typography>
              {selected.processedByUserId && <Typography><strong>ดำเนินการโดย:</strong> {selected.processedByUserId}</Typography>}
              {selected.processedAt && <Typography><strong>ดำเนินการเมื่อ:</strong> {new Date(selected.processedAt).toLocaleString('th-TH')}</Typography>}
              {selected.rejectReason && (
                <>
                  <Typography><strong>หมายเหตุการปฏิเสธ:</strong></Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{selected.rejectReason}</Typography>
                </>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetails}>ปิด</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={closeReject} fullWidth maxWidth="sm">
        <DialogTitle>ปฏิเสธคำขอ พร้อมหมายเหตุ</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography>กรุณากรอกเหตุผลการปฏิเสธ (ไม่บังคับ)</Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="หมายเหตุสำหรับผู้ขอ"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReject}>ยกเลิก</Button>
          <Button color="error" onClick={async () => {
            if (!selected) return;
            try {
              await fetch(`/api/credit-requests/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', note: rejectNote }) });
              closeReject();
              load();
            } catch (err) {
              console.error(err);
            }
          }}>ยืนยันปฏิเสธ</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
