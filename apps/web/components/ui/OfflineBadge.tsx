"use client";
import { useEffect, useState } from "react";

export function OfflineBadge() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queued, setQueued] = useState<number>(0);

  useEffect(() => {
    const onOnline = () => { setOnline(true); navigator.serviceWorker?.controller?.postMessage({ type: 'flushQueue' }); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    navigator.serviceWorker?.controller?.postMessage({ type: 'getQueueSize' });
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data || {};
      if (data.type === 'queueSize') setQueued(data.size || 0);
    };
    navigator.serviceWorker?.addEventListener('message', onMsg as any);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg as any);
  }, []);

  if (online && queued === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="glass rounded-full px-3 py-1 text-xs flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${online? 'bg-green-500':'bg-yellow-500'}`} />
        <span>{online? 'Online':''}{!online? 'Offline':''}{queued? ` • queued ${queued}`: ''}</span>
        {queued>0 && (
          <button className="text-[11px] underline opacity-80" onClick={()=> navigator.serviceWorker?.controller?.postMessage({ type: 'flushQueue' })}>Retry now</button>
        )}
      </div>
    </div>
  );
}

