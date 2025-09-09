"use client";
import { useEffect, useMemo, useState } from "react";
import { useDevices, type SceneDef, type TimelineStep } from "@homegraph/devices";

export function openSceneEditor() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('scene-editor:open'));
}

export function SceneEditorDrawer() {
  const [open, setOpen] = useState(false);
  const scenes = useDevices((s) => s.scenes);
  const setScenes = useDevices((s) => s.setScenes);
  const devices = useDevices((s) => s.devices);
  const preview = useDevices((s) => s.previewScene);
  const apply = useDevices((s) => s.applyScene);
  const cancel = useDevices((s) => s.cancelPreview);

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const selected = useMemo(() => scenes.find((s) => s.name === selectedName) ?? scenes[0], [scenes, selectedName]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('scene-editor:open', onOpen);
    return () => window.removeEventListener('scene-editor:open', onOpen);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function updateSelected(mutator: (s: SceneDef) => SceneDef) {
    const idx = scenes.findIndex((s) => s.name === selected?.name);
    if (idx < 0 || !selected) return;
    const next = [...scenes];
    next[idx] = mutator(selected);
    setScenes(next);
  }

  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-[480px] glass p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="scene-editor-title" tabIndex={-1}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" id="scene-editor-title">Scene Editor</div>
        <button className="text-xs underline opacity-70" onClick={() => { setOpen(false); cancel(); }} autoFocus>Close</button>
      </div>

      <div className="space-y-2">
        <label className="text-xs opacity-70">Scene
          <select className="glass rounded px-2 py-1 w-full" value={selected?.name ?? ''} onChange={(e)=> setSelectedName(e.target.value)}>
            {scenes.map((s) => (<option key={s.name} value={s.name}>{s.name}</option>))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="glass rounded px-2 py-1" onClick={() => selected && preview(selected.name)}>Preview</button>
          <button className="glass rounded px-2 py-1" onClick={() => selected && apply(selected.name)}>Apply</button>
          <button className="text-xs underline opacity-70" onClick={() => cancel()}>Cancel Preview</button>
        </div>
      </div>

      <div className="h-px bg-white/10 my-3" />

      <div className="space-y-2">
        <div className="font-semibold">Timeline Steps</div>
        {(selected?.steps ?? []).map((st, i) => (
          <div key={i} className="glass rounded p-2 space-y-2">
            <div className="text-xs opacity-70">Target
              <div className="grid grid-cols-3 gap-2 mt-1">
                <select className="glass rounded px-2 py-1" value={JSON.stringify(st.selector)} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, selector: JSON.parse(e.target.value) }: x) }))}>
                  {devices.map((d)=> <option key={d.id} value={JSON.stringify({ type:'device', id:d.id })}>{d.name}</option>)}
                  <option value={JSON.stringify({ type:'type', deviceType:'light' })}>All lights</option>
                </select>
                <input className="glass rounded px-2 py-1" type="number" placeholder="Delay ms" value={st.step.delayMs ?? '' as any} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, step: { ...x.step, delayMs: e.target.value===''? undefined: Number(e.target.value) } }: x) }))} />
                <input className="glass rounded px-2 py-1" type="number" placeholder="Duration ms" value={st.step.durationMs ?? '' as any} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, step: { ...x.step, durationMs: e.target.value===''? undefined: Number(e.target.value) } }: x) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2">On
                <input type="checkbox" checked={!!st.step.on} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, step: { ...x.step, on: e.target.checked } }: x) }))} />
              </label>
              <label>Brightness
                <input className="glass rounded px-2 py-1 w-full" type="number" step={0.01} min={0} max={1} value={st.step.brightness ?? '' as any} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, step: { ...x.step, brightness: e.target.value===''? undefined: Number(e.target.value) } }: x) }))} />
              </label>
              <label>Color temp (K)
                <input className="glass rounded px-2 py-1 w-full" type="number" min={1500} max={6500} value={st.step.colorTempK ?? '' as any} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, step: { ...x.step, colorTempK: e.target.value===''? undefined: Number(e.target.value) } }: x) }))} />
              </label>
              <label>Easing
                <select className="glass rounded px-2 py-1 w-full" value={st.step.easing ?? 'easeOutCubic'} onChange={(e)=> updateSelected((s)=> ({...s, steps: s.steps.map((x,idx)=> idx===i? { ...x, step: { ...x.step, easing: e.target.value as TimelineStep['easing'] } }: x) }))}>
                  <option value="easeOutCubic">easeOutCubic</option>
                  <option value="linear">linear</option>
                </select>
              </label>
            </div>
            <div className="text-right">
              <button className="text-xs underline opacity-70" onClick={()=> updateSelected((s)=> ({...s, steps: s.steps.filter((_,idx)=> idx!==i) }))}>Remove</button>
            </div>
          </div>
        ))}
        <button className="glass rounded px-3 py-2" onClick={()=> updateSelected((s)=> ({...s, steps: [...s.steps, { selector: { type:'type', deviceType:'light' }, step: { on: true, brightness: 0.5, durationMs: 700, easing: 'easeOutCubic' } }] }))}>Add Step</button>
      </div>
    </div>
  );
}
