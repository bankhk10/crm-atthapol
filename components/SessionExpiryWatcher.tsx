"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
} from "@mui/material";

const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // เตือน 5 นาทีสุดท้าย (โหมดใช้งานจริง)

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function SessionExpiryWatcher() {
  const { data: session, update } = useSession();
  const [now, setNow] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const expiresAt = useMemo(() => {
    if (!session?.expires) return null;
    const t = Date.parse(session.expires);
    return Number.isFinite(t) ? t : null;
  }, [session?.expires]);

  const timeLeftMs = useMemo(() => {
    if (!expiresAt) return null;
    return expiresAt - now;
  }, [expiresAt, now]);

  const shouldWarn = Boolean(
    timeLeftMs !== null && timeLeftMs > 0 && timeLeftMs <= WARNING_THRESHOLD_MS,
  );

  useEffect(() => {
    // Use a fast tick while modal is visible, slower otherwise
    const interval = setInterval(() => setNow(Date.now()), shouldWarn ? 1000 : 30000);
    return () => clearInterval(interval);
  }, [shouldWarn]);

  // Auto logout when countdown reaches zero (no action taken)
  useEffect(() => {
    if (!shouldWarn || typeof timeLeftMs !== "number") return;
    const timer = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, Math.max(0, timeLeftMs));
    return () => clearTimeout(timer);
  }, [shouldWarn, timeLeftMs]);

  if (!shouldWarn) return null;

  return (
    <Dialog open>
      <DialogTitle>เซสชันของคุณใกล้หมดอายุ</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Typography>ต้องการต่ออายุไหม?</Typography>
          {typeof timeLeftMs === "number" && (
            <Typography color="text.secondary">
              จะออกจากระบบอัตโนมัติในอีก {formatDuration(timeLeftMs)}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => signOut({ callbackUrl: "/login" })} color="inherit" variant="outlined">
          ออกจากระบบ
        </Button>
        <Button
          onClick={async () => {
            try {
              setRefreshing(true);
              // Triggers NextAuth to re-issue the session cookie/JWT (refresh)
              await update();
            } finally {
              setRefreshing(false);
            }
          }}
          autoFocus
          variant="contained"
          disabled={refreshing}
        >
          {refreshing ? "กำลังต่ออายุ..." : "ต่ออายุ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
