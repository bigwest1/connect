"use client";
import { useEffect, useMemo, useState } from 'react';
import { useHouse } from '@homegraph/engine';
import { idbGet, idbSet } from '../../lib/idb';

type Pos = { x: number; y: number };

export default function AssistFromPhotos() {
  const { spec, openingsLayout, setOpeningsLayout } = useHouse() as any;
  const [layout, setLayout] = useState<Record<string, Pos[]>>({});
  const facets: Array<{ id: string; openings: number }> = useMemo(() => {
    const list: Array<{ id: string; openings: number }> = (spec?.siding_facets || []).map((f: any) => ({ id: String(f.id), openings: Number(f.openings || 0) }));
    return list.filter((f) => f.openings > 0);
  }, [spec]);
  const [facetId, setFacetId] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const saved = await idbGet<Record<string, Pos[]>>('openings:layout');
      if (saved) { setLayout(saved); setOpeningsLayout?.(saved); }
    })();
  }, [setOpeningsLayout]);

  useEffect(() => {
    if (!facetId && facets.length) setFacetId(facets[0].id);
  }, [facets, facetId]);

  const current = facets.find((f) => f.id === facetId);
  const list = layout[facetId || ''] || (current ? new Array(current.openings).fill(0).map(() => ({ x: 0, y: 0 })) : []);

  function update(idx: number, patch: Partial<Pos>) {
    const key = facetId!;
    const arr = [...list];
    arr[idx] = { ...arr[idx], ...patch } as Pos;
    const next = { ...layout, [key]: arr };
    setLayout(next);
    setOpeningsLayout?.(next);
    idbSet('openings:layout', next);
  }

  return (
    <div className="h-screen grid grid-cols-[minmax(320px,420px)_1fr]">
      <aside className="glass p-4 overflow-y-auto space-y-3">
        <h1 className="text-lg font-semibold">Assist from Photos</h1>
        <div className="space-y-1">
          <div className="text-xs uppercase opacity-70">Facet</div>
          <select className="glass rounded px-2 py-1 text-sm w-full" value={facetId} onChange={(e)=> setFacetId(e.target.value)}>
            {facets.map(f => <option key={f.id} value={f.id}>{f.id} ({f.openings})</option>)}
          </select>
        </div>
        <div className="space-y-2">
          {list.map((p, idx) => (
            <div key={idx} className="glass rounded p-2">
              <div className="text-xs opacity-70 mb-1">Opening #{idx+1}</div>
              <label className="block text-xs">X
                <input type="range" min={-1} max={1} step={0.01} value={p.x} onChange={(e)=> update(idx, { x: parseFloat(e.target.value) })} className="w-full" />
              </label>
              <label className="block text-xs mt-1">Y
                <input type="range" min={-1} max={1} step={0.01} value={p.y} onChange={(e)=> update(idx, { y: parseFloat(e.target.value) })} className="w-full" />
              </label>
            </div>
          ))}
          {!list.length && <div className="text-xs opacity-70">No openings for this facet.</div>}
        </div>
        <div className="text-xs opacity-70">Positions are relative to the panel center (−1..1). Saved locally and applied live.</div>
      </aside>
      <main className="p-4 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <object key={i} data={`/docs/photos/p${i}.pdf`} type="application/pdf" className="w-full h-[75vh] glass rounded">
              <div className="p-4 text-xs opacity-70">PDF not found: /docs/photos/p{i}.pdf</div>
            </object>
          ))}
        </div>
      </main>
    </div>
  );
}

