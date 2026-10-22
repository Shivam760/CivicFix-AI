import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';

/**
 * EvidencePhoto
 * Shows one protected photo. Photo files need the Authorization header, so a
 * plain <img src="/api/v1/..."> cannot load them. Instead `load()` downloads
 * the file and returns an object URL, which we put in <img src>.
 *
 * Props:
 *   load:  () => Promise<{ ok, url } | { ok: false, error }>
 *   alt, className
 */
export default function EvidencePhoto({ load, alt, className = '' }) {
  const [state, setState] = useState({ status: 'loading', url: null, message: '' });

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    load().then((res) => {
      if (cancelled) {
        if (res.ok) URL.revokeObjectURL(res.url);
        return;
      }
      if (res.ok) {
        objectUrl = res.url;
        setState({ status: 'ready', url: res.url, message: '' });
      } else {
        setState({ status: 'error', url: null, message: res.error.message });
      }
    });

    // Cleanup: free the downloaded image when the component goes away.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // load is recreated on each render by callers; the photo ID is in alt/key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === 'loading') {
    return (
      <div className={`flex items-center justify-center bg-surface-canvas border border-border ${className}`}>
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-surface-canvas border border-dashed border-border text-muted text-[10px] text-center p-2 ${className}`}
        title={state.message}
      >
        <ImageOff className="w-5 h-5" />
        <span>Photo unavailable</span>
      </div>
    );
  }

  return <img src={state.url} alt={alt} className={`object-cover ${className}`} />;
}
