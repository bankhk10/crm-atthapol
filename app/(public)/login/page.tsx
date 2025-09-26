"use client";
import { useState } from "react";
import { Box, Button, Stack, TextField, Typography, Alert, Paper } from "@mui/material";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    else window.location.href = "/dashboard";
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: 420, maxWidth: "100%" }}>
        <Typography variant="h5" fontWeight={700} mb={2}>เข้าสู่ระบบ</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack component="form" gap={2} onSubmit={onSubmit}>
          <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Button type="submit" variant="contained">เข้าสู่ระบบ</Button>
        </Stack>
        <Stack direction="row" justifyContent="space-between" mt={2}>
          <Link href="#">ลืมรหัสผ่าน</Link>
        </Stack>
      </Paper>
    </Box>
  );
}
