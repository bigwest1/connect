"use client";
import * as React from "react";

type Props = {
  value?: number;
  onValueChange?: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
};

export function Slider({ value = 0, onValueChange, min = 0, max = 1, step = 0.01, ariaLabel }: Props) {
  return (
    <input
      type="range"
      className="w-full accent-sky-400"
      min={min}
      max={max}
      step={step}
      value={value}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
    />
  );
}
