"use client";
import { useEffect, useState } from 'react';
import { DiscoverDrawer } from './drawer/DiscoverDrawer';

export function DiscoverPrompt() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const seen = localStorage.getItem('homegraph.discover.seen');
      if (!seen) setShow(true);
    } catch {}
  }, []);
  function dismiss() {
    setShow(false);
    try { localStorage.setItem('homegraph.discover.seen', '1'); } catch {}
  }
  if (!show) return null;
  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded px-3 py-2 flex items-center gap-2">
        <span className="text-sm">Discover Devices on your network</span>
        <button className="glass rounded px-2 py-1 text-xs" onClick={() => setOpen(true)}>Discover</button>
        <button className="text-xs opacity-60 underline" onClick={dismiss}>Dismiss</button>
      </div>
      {open ? <DiscoverDrawer onClose={() => { setOpen(false); dismiss(); }} /> : null}
    </>
  );
}

