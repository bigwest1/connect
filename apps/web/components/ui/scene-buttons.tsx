"use client";
import { useScenes } from "@homegraph/devices";

const defaultScenes = ["Evening", "Away", "Movie", "Clean Up", "All Off"] as const;

export function SceneButtons({ perf, onPerfChange }: { perf?: "Ultra" | "High" | "Balanced" | "Battery"; onPerfChange?: (p: any) => void }) {
  const run = useScenes((s) => s.apply);
  const preview = useScenes((s) => s.preview);
  const cancel = useScenes((s) => s.cancel);
  return (
    <div className="space-y-2" aria-labelledby="scenes-heading">
      <h3 id="scenes-heading" className="sr-only">Scenes</h3>
      <div className="grid grid-cols-2 gap-2" role="list" aria-label="Scene presets">
        {defaultScenes.map((s) => (
          <button
            key={s}
            className="glass rounded px-2 py-1 text-left hover:bg-white/10 focus-ring"
            onMouseEnter={() => preview(s)}
            onMouseLeave={() => cancel()}
            onClick={() => run(s)}
            title="Hover to preview • Click to apply"
            role="listitem"
            aria-label={`Apply ${s} scene`}
          >
            {s}
          </button>
        ))}
      </div>
      {onPerfChange && (
        <div className="flex flex-wrap gap-2 text-[11px] items-center">
          <div className="opacity-60">Performance:</div>
          {["Ultra", "High", "Balanced", "Battery"].map((p) => (
            <button key={p} className={`px-2 py-0.5 rounded ${perf === p ? "bg-sky-500" : "glass"}`} onClick={() => onPerfChange(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
