"use client";

type Tier = "Ultra" | "High" | "Balanced" | "Battery";

export function PerformanceToggle({ value, onChange }: { value: Tier; onChange: (v: Tier) => void }) {
  const tiers: Tier[] = ["Ultra", "High", "Balanced", "Battery"];
  return (
    <div className="flex gap-1">
      {tiers.map((t) => (
        <button
          key={t}
          className={`px-2 py-1 rounded text-xs ${value === t ? "bg-sky-500" : "glass"}`}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

