"use client";
import * as React from "react";

export function Switch({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={`w-10 h-6 rounded-full transition-colors focus-ring ${checked ? "bg-sky-500" : "bg-white/20"}`}
    >
      <span
        className={`block w-5 h-5 bg-white rounded-full transform transition-transform translate-y-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

