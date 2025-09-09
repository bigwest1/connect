"use client";
import { useEffect, useMemo, useState } from "react";
import { useDevices } from "@homegraph/devices";

export function openGroupManager() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('group-manager:open'));
}

export function GroupManagerDrawer() {
  const [open, setOpen] = useState(false);
  const devices = useDevices((s) => s.devices);
  const groups = useDevices((s) => s.groups);
  const addGroup = useDevices((s) => s.addGroup);
  const removeGroup = useDevices((s) => s.removeGroup);
  const assign = useDevices((s) => s.assignToGroup);
  const rename = useDevices((s) => s.renameGroup);
  const preview = useDevices((s) => s.previewScene);
  const apply = useDevices((s) => s.applyScene);
  const cancel = useDevices((s) => s.cancelPreview);
  const scenes = useDevices((s) => s.scenes);

  const [sceneName, setSceneName] = useState<string>(scenes[0]?.name ?? 'Evening');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('group-manager:open', onOpen);
    return () => window.removeEventListener('group-manager:open', onOpen);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === selectedGroupId) ?? groups[0], [groups, selectedGroupId]);

  if (!open) return null;

  const groupDevices = devices.filter((d) => selectedGroup ? (d.groupIds ?? []).includes(selectedGroup.id) : false);

  return (
    <div className="absolute right-0 top-0 h-full w-[420px] glass p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="group-manager-title" tabIndex={-1}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" id="group-manager-title">Group Manager</div>
        <button className="text-xs underline opacity-70" onClick={() => { setOpen(false); cancel(); }} autoFocus>Close</button>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <button className="glass rounded px-2 py-1" onClick={() => addGroup({ id: `g-${Math.random().toString(36).slice(2, 8)}`, name: `Group ${groups.length + 1}`, kind: 'room' })}>Add Group</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {groups.map((g) => (
            <div key={g.id} className={`glass rounded p-2 ${selectedGroup?.id===g.id? 'ring-1 ring-white/30': ''}`}> 
              <div className="flex items-center justify-between">
                <input className="glass rounded px-2 py-1 text-sm" value={g.name} onChange={(e)=> rename(g.id, e.target.value)} />
                <div className="flex items-center gap-2">
                  <button className="text-xs underline opacity-70" onClick={()=> setSelectedGroupId(g.id)}>Select</button>
                  <button className="text-xs underline opacity-70" onClick={()=> removeGroup(g.id)}>Remove</button>
                </div>
              </div>
              <div className="text-xs opacity-70 mt-1">{g.kind}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/10 my-3" />

      <div className="space-y-2">
        <div className="font-semibold">Membership</div>
        <div className="space-y-1 text-sm">
          {devices.map((d) => (
            <label key={d.id} className="flex items-center justify-between glass rounded px-2 py-1">
              <span>{d.name}</span>
              <input type="checkbox" checked={selectedGroup? (d.groupIds ?? []).includes(selectedGroup.id) : false} onChange={(e)=> selectedGroup && assign(d.id, selectedGroup.id, e.target.checked)} />
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/10 my-3" />

      <div className="space-y-2">
        <div className="font-semibold">Bulk Apply Scene</div>
        <div className="grid grid-cols-2 gap-2">
          <select className="glass rounded px-2 py-1" value={sceneName} onChange={(e)=> setSceneName(e.target.value)}>
            {scenes.map((s)=> <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className="glass rounded px-2 py-1" onMouseEnter={()=> selectedGroup && preview(sceneName, (d)=> (d.groupIds ?? []).includes(selectedGroup.id))} onMouseLeave={()=> cancel()} onClick={()=> selectedGroup && apply(sceneName, (d)=> (d.groupIds ?? []).includes(selectedGroup.id))}>Apply</button>
            <button className="glass rounded px-2 py-1" onClick={()=> cancel()}>Cancel Preview</button>
          </div>
        </div>
        <div className="text-xs opacity-60">Hover or hold to preview; release/cancel to revert.</div>
      </div>
    </div>
  );
}
