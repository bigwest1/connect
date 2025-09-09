"use client";
import { Slider } from "./slider";

export function DayNight({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Slider value={value} onValueChange={onChange} />
      <div className="text-xs opacity-60 mt-1">{Math.round(value * 100)}% daylight</div>
    </div>
  );
}

