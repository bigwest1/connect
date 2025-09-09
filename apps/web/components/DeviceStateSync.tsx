"use client";
import { useEffect, useRef } from "react";
import { useDevices } from "@homegraph/devices";

export function DeviceStateSync() {
  const devices = useDevices((s) => s.devices);
  const updateState = useDevices((s) => s.updateState);
  const timers = useRef<Map<string, any>>(new Map());

  // Hydrate on mount (batched)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/devices/state`);
        const all = await res.json();
        devices.forEach((d) => {
          if (all[d.id]) updateState(d.id, all[d.id]);
        });
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on changes (debounced per device)
  useEffect(() => {
    const t = setTimeout(() => {
      const payload: Record<string, any> = {};
      devices.forEach((d) => { payload[d.id] = d.state ?? {}; });
      fetch(`/api/devices/state`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ states: payload })
      }).catch(() => {});
    }, 300);
    return () => { timers.current.forEach((t) => clearTimeout(t)); };
  }, [devices]);

  return null;
}
