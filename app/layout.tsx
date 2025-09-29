import type { Metadata } from "next";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = { title: "Next15 + MUI + Auth + Prisma" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
