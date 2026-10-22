import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ThumbsUp, ExternalLink } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { btnPrimary } from './ui';
import { listAround, addSupport } from '../../services/nearbyService';
import { distanceKm, formatDistance } from '../../utils/location';
import { errorText } from '../../services/apiClient';

const RADIUS_KM = 0.2; // the backend's AROUND_RADIUS_KM

/**
 * AlreadyReportedPanel
 * While reporting: open reports within 200 m of the pin, so the citizen can
 * say "Me too" instead of filing the same problem twice. Shows the citizen's
 * own open reports (checked here, from the list they already have) and
 * other people's shared reports (GET /nearby/around). It never blocks saving.
 *
 * Props: latitude, longitude ('' or numbers), ownReports (the user's reports)
 */
export default function AlreadyReportedPanel({ latitude, longitude, ownReports }) {
  const [others, setOthers] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const hasPin = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const lat = Number(latitude);
  const lng = Number(longitude);

  // Ask the backend 600 ms after the pin stops moving.
  useEffect(() => {
    if (!hasPin) return undefined;
    let current = true;
    const timer = setTimeout(async () => {
      const res = await listAround(lat, lng);
      if (current) setOthers(res.ok ? res.data.items : []);
    }, 600);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [hasPin, lat, lng]);

  if (!hasPin) return null;

  const own = ownReports
    .filter((r) => r.status !== 'closed' && r.latitude != null && r.longitude != null)
    .map((r) => ({ ...r, distance: distanceKm(lat, lng, r.latitude, r.longitude) }))
    .filter((r) => r.distance <= RADIUS_KM)
    .sort((a, b) => a.distance - b.distance);

  if (own.length === 0 && others.length === 0) return null;

  const meToo = async (item) => {
    setBusyId(item.report_id);
    setError('');
    const res = await addSupport(item.report_id);
    setBusyId('');
    if (res.ok) setOthers((prev) => prev.map((it) => (it.report_id === item.report_id ? { ...it, ...res.data } : it)));
    else setError(errorText(res.error));
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3" role="status">
      <div className="flex items-start gap-2">
        <Copy className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-900">Already reported nearby?</p>
          <p className="text-[11px] text-amber-800">
            These open reports are within 200 m of your pin. If one is the same problem, you don't need a new report.
            Otherwise, just continue.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {own.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface border border-border">
            <div className="min-w-0">
              <p className="text-xs font-bold text-navy truncate">{r.title}</p>
              <p className="text-[11px] text-muted">Your report · {formatDistance(r.distance)} away</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              <Link to={`/citizen/reports/${r.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-primary underline">
                Open <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </li>
        ))}
        {others.map((item) => (
          <li key={item.report_id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface border border-border">
            <div className="min-w-0">
              <p className="text-xs font-bold text-navy truncate">{item.title}</p>
              <p className="text-[11px] text-muted">
                {formatDistance(item.distance_km)} away · {item.support_count} resident{item.support_count === 1 ? '' : 's'} see
                {item.support_count === 1 ? 's' : ''} this
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={item.status} />
              {item.my_support ? (
                <span className="text-[11px] font-bold text-primary">You said Me too</span>
              ) : item.can_support ? (
                <button type="button" className={btnPrimary} onClick={() => meToo(item)} disabled={busyId === item.report_id}>
                  <ThumbsUp className="w-3.5 h-3.5" /> Me too
                </button>
              ) : (
                <span className="text-[11px] text-muted max-w-[11rem]">"Me too" needs your saved home within 2 km.</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="text-[11px] text-rose-700">{error}</p>}
    </div>
  );
}
