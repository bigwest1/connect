"use client";
import { useEffect, useState } from "react";

type Toast = { id: number; message: string };

export function emitToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("toast", { detail: { message } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let idCounter = 0;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string };
      const t: Toast = { id: ++idCounter, message: detail.message };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200);
    };
    window.addEventListener("toast", onToast);
    return () => window.removeEventListener("toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed left-4 bottom-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div key={t.id} className="glass px-3 py-2 rounded text-sm pointer-events-auto">
          {t.message}
        </div>
      ))}
    </div>
  );
}

