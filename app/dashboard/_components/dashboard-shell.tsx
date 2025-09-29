"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
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
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f1f5f9" }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Paper
          elevation={0}
          square
          sx={{
            bgcolor: "#b92626",
            color: "common.white",
            borderRadius: 0,
          }}
        >
          <Header onMenuClick={() => setIsSidebarOpen(true)} displayName={displayName} />
        </Paper>

        <Stack component="main" spacing={3} sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
          {children}
        </Stack>
      </Box>
    </Box>
  );
}
