"use client";

import { useEffect, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import SessionExpiryWatcher from "@/components/SessionExpiryWatcher";

export function Providers({ children }: { children: ReactNode }) {
  // Prevent mouse wheel from changing any input[type=number] globally
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
      // Block value change via wheel; blur to allow page scroll
      e.preventDefault();
      if (document.activeElement === input) input.blur();
    };
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel as EventListener);
  }, []);

  return (
    <SessionProvider>
      {children}
      <SessionExpiryWatcher />
    </SessionProvider>
  );
}
