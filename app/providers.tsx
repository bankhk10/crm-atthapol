"use client";
import { ThemeProvider } from "@mui/material/styles";
import { SessionProvider } from "next-auth/react";
import { SnackbarProvider } from "notistack";
import { useEffect, type ReactNode } from "react";

import SessionExpiryWatcher from "@/components/SessionExpiryWatcher";
import { theme } from "@/lib/theme"; //

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const findNumberInput = (target: EventTarget | null): HTMLInputElement | null => {
      let el: HTMLElement | null = target as HTMLElement | null;
      while (el && el !== document.body) {
        if (el instanceof HTMLInputElement && el.type === "number") return el;
        el = el.parentElement;
      }
      return null;
    };
    const onWheel = (e: WheelEvent) => {
      const input = findNumberInput(e.target);
      if (!input) return;
      e.preventDefault();
      if (document.activeElement === input) input.blur();
    };
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel as EventListener);
  }, []);

  return (
    <SessionProvider>
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </SnackbarProvider>
      <SessionExpiryWatcher />
    </SessionProvider>
  );
}
