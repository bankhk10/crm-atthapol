"use client";

import Image from "next/image";
import { Prompt } from "next/font/google";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";

// ฟอนต์ Prompt
const prompt = Prompt({
  weight: ["400", "500", "700"],
  subsets: ["thai", "latin"],
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();
      const password = String(formData.get("password") ?? "");
      const remember = formData.get("remember") === "on";

      if (!email || !password) {
        setError("กรุณากรอกอีเมลและรหัสผ่าน");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        remember: remember ? "on" : "off",
        callbackUrl: "/dashboard",
      });

      setIsSubmitting(false);

      if (result?.error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      router.push(result?.url ?? "/dashboard");
    },
    [router]
  );

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, md: 4 },
        py: { xs: 6, md: 10 },
        backgroundColor: "#e0e0e0",
        position: "relative",
        overflow: "hidden",
        fontFamily: prompt.style.fontFamily,
      }}
    >
      {/* SVG background ขวาบน */}
      <Box
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 600"
        preserveAspectRatio="none"
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <path
          d="M250,0 C300,100 600,100 700,200 C800,300 450,500 800,600 L800,0 Z"
          fill="#b92626"
        />
      </Box>

      {/* วงกลมซ้อนกัน ล่างซ้าย */}
      <Box
        sx={{
          position: "absolute",
          bottom: { xs: "-120px", md: "-180px" },
          left: { xs: "-120px", md: "-180px" },
          width: { xs: 300, md: 500 },
          height: { xs: 300, md: 500 },
          borderRadius: "50%",
          backgroundColor: "#b92626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            width: { xs: 220, md: 400 },
            height: { xs: 220, md: 400 },
            borderRadius: "50%",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: { xs: 160, md: 300 },
              height: { xs: 160, md: 300 },
              borderRadius: "50%",
              backgroundColor: "#9ca3af",
            }}
          />
        </Box>
      </Box>

      {/* กล่องฟอร์ม */}
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper
          elevation={12}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: { xs: 4, md: 6 },
            backdropFilter: "blur(6px)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
          }}
        >
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                {/* โลโก้ */}
                <Box
                  sx={{
                    width: { xs: 140, md: 180 },
                    height: { xs: 140, md: 180 },
                    position: "relative",
                    borderRadius: "8%",
                    overflow: "hidden",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  <Image
                    src="/images/logo.png"
                    alt="CS ONE"
                    fill
                    priority
                    sizes="(max-width: 800px) 140px, 180px"
                    style={{
                      objectFit: "contain",
                      opacity: logoLoaded ? 1 : 0,
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    onLoadingComplete={() => setLogoLoaded(true)}
                  />
                </Box>

                <Box>
                  <Typography
                    component="p"
                    variant="h4"
                    fontWeight={800}
                    sx={{ textTransform: "uppercase", letterSpacing: 2.4 }}
                  >
                    ระบบ{" "}
                    <Box component="span" color="#c62828">
                      CS ONE
                    </Box>
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={600}
                    sx={{ position: "relative", top: 2 }}
                  >
                    Smart Crop Smart Solutions
                  </Typography>
                </Box>
              </Stack>

              <Stack spacing={1} textAlign="center">
                <Typography
                  variant="h5"
                  fontWeight={600}
                  sx={{ letterSpacing: 1.5, position: "relative", top: 12 }}
                >
                  เข้าสู่ระบบ
                </Typography>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                autoComplete="email"
                fullWidth
                label="USERNAME"
                name="email"
                placeholder="name@example.com"
                required
                type="email"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    height: { xs: 44, md: 50 },
                    "& input": {
                      paddingLeft: "14px",
                      paddingY: { xs: "6px", md: "10px" },
                      fontSize: { xs: "0.85rem", md: "1rem" },
                      fontFamily: prompt.style.fontFamily,

                      // ✅ ปรับ autofill ให้สีอ่อน
                      "&:-webkit-autofill": {
                        boxShadow: "0 0 0 1000px #f3f4f6 inset", // สีเทาอ่อน
                        WebkitTextFillColor: "#000", // สีตัวอักษร
                        caretColor: "#000", // สี cursor
                        borderRadius: "20px",
                      },
                    },
                  },
                }}
              />

              <TextField
                autoComplete="current-password"
                fullWidth
                label="PASSWORD"
                name="password"
                placeholder="••••••••"
                required
                type="password"
                InputLabelProps={{
                  sx: { fontSize: { xs: "0.8rem", md: "0.95rem" } },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    height: { xs: 44, md: 50 },
                    "& input": {
                      paddingLeft: "14px",
                      paddingY: { xs: "6px", md: "10px" },
                      fontSize: { xs: "0.85rem", md: "1rem" },
                    },
                  },
                  top: 12,
                }}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      name="remember"
                      color="primary"
                      sx={{ borderRadius: 1 }}
                    />
                  }
                  label="บันทึกรหัส"
                />
              </Stack>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 999,
                  py: { xs: 1, md: 1.2 },
                  px: { xs: 3, md: 4 },
                  width: { xs: "100%", sm: "70%", md: "40%" },
                  alignSelf: "center",
                  backgroundColor: "#757575",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                  "&:hover": {
                    backgroundColor: "#424242",
                    boxShadow: "0 10px 18px rgba(0,0,0,0.2)",
                  },
                  fontSize: { xs: "0.9rem", md: "1rem" },
                }}
              >
                {isSubmitting ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
