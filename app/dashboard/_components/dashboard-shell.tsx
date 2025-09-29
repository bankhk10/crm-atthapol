"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  displayName?: string | null;
};

export function DashboardShell({ children, displayName }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,

        display: "flex",
        minHeight: "100vh",
        bgcolor: "#b92626", // 🔴 ทำเหมือนของเก่า
      }}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: "#b92626",
            color: "common.white",
            flexShrink: 0,
          }}
        >
          <Header
            onMenuClick={() => setIsSidebarOpen(true)}
            displayName={displayName}
          />
        </Box>

        {/* Main มีขอบโค้ง */}
        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowX: "hidden",
            overflowY: "auto",
            bgcolor: "grey.100", // 🔘 กล่องเทา
            borderTopLeftRadius: 24, // ⬅ โค้งด้านบนซ้าย
            // borderTopRightRadius: 24, // ⬅ ถ้าอยากให้โค้งทั้ง 2 ข้าง
            p: { xs: 2, md: 4 },
          }}
        >
          <Stack spacing={3}>{children}</Stack>
        </Box>
      </Box>
    </Box>
  );
}
