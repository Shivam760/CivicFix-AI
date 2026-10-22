import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPinned, MapPin, RefreshCw, ThumbsUp, UserRound, History } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import StatusBadge from '../../components/common/StatusBadge';
import CategoryIcon from '../../components/icons3d/CategoryIcon';
import EvidencePhoto from '../../components/reports/EvidencePhoto';
import HomeLocationCard from '../../components/reports/HomeLocationCard';
import { pinIcon, homeIcon, useMapTiles, STATUS_PIN_COLORS } from '../../components/reports/mapSetup';
import { Section, ErrorBox, NoteBox, btnPrimary, btnSecondary } from '../../components/reports/ui';
import { useToast } from '../../context/ToastContext';
import { errorText } from '../../services/apiClient';
import { fetchCurrentUser, getCurrentUser } from '../../services/authService';
import { listNearby, fetchNearbyPhoto, addSupport, removeSupport } from '../../services/nearbyService';
import { ROLES } from '../../constants/roles';
import { categoryLabel } from '../../constants/civicCategories';
import { STATUS_CONFIG } from '../../constants/complaintStatuses';
import { formatDate } from '../../utils/formatters';

const RADIUS_M = 2000; // matches the backend's 2 km

/**
 * NearbyMap
 * Your home (with the 2 km circle) and every nearby issue as a pin coloured
 * by its status. Clicking a pin's title scrolls to its card.
 */
function NearbyMap({ home, items }) {
  const tiles = useMapTiles();
  const statuses = [...new Set(items.map((item) => item.status))];
  return (
    <div className="relative isolate h-72 sm:h-80 rounded-2xl overflow-hidden border border-border shadow-xs">
      <MapContainer center={home} zoom={14} className={`h-full w-full ${tiles.styled ? 'cf-styled' : ''}`} scrollWheelZoom={false}>
        <TileLayer key={tiles.url} url={tiles.url} attribution={tiles.attribution} />
        <FitArea home={home} />
        <Circle
          center={home}
          radius={RADIUS_M}
          pathOptions={{ color: '#059669', weight: 2, dashArray: '6 6', fillColor: '#10b981', fillOpacity: 0.07 }}
        />
        <Marker position={home} icon={homeIcon} interactive={false} keyboard={false} />
        {items.map((item) => (
          <Marker key={item.report_id} position={[item.latitude, item.longitude]} icon={pinIcon(STATUS_PIN_COLORS[item.status])}>
            <Popup>
              <button
                type="button"
                className="font-bold text-[13px] text-left hover:underline cursor-pointer"
                onClick={() => document.getElementById(`nearby-${item.report_id}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {item.title}
              </button>
              <div className="text-muted mt-0.5">
                {STATUS_CONFIG[item.status]?.label} · {item.distance_km} km away
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend: your home, the 2 km area, and the statuses shown. */}
      <div className="absolute top-3 right-3 z-[1000] max-w-[60%] rounded-xl bg-surface/90 backdrop-blur border border-border shadow-md px-3 py-2 space-y-1 text-[11px] text-navy">
        <div className="flex items-center gap-2 font-semibold">
          <span className="w-3 h-3 rounded-full bg-navy ring-2 ring-surface shrink-0" /> Your home · 2 km area
        </div>
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_PIN_COLORS[status] }} />
            {STATUS_CONFIG[status]?.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Zooms the map so the whole 2 km area around home is visible.
function FitArea({ home }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(home).toBounds(RADIUS_M * 2), { padding: [16, 16] });
  }, [map, home]);
  return null;
}

/**
 * NearbyIssueCard
 * One shared report in the limited view (api-contract.md section 12): no
 * owner ID, drafts or notes; the name only if the reporter chose to show it.
 */
function NearbyIssueCard({ item, onToggleSupport, busy }) {
  return (
    <div id={`nearby-${item.report_id}`} className="scroll-mt-24">
      <Section>
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CategoryIcon category={item.category || 'other'} size={26} />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-navy">{item.title}</h3>
                <p className="text-[11px] text-muted">
                  {categoryLabel(item.category)} · {item.distance_km} km from your home
                </p>
              </div>
            </div>
            <StatusBadge status={item.status} />
          </div>

          <p className="text-xs text-navy leading-relaxed whitespace-pre-wrap">{item.description}</p>
          <div className="space-y-1 text-xs text-muted">
            {item.location_text && (
              <p className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 mt-px shrink-0" /> {item.location_text}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5 shrink-0" />
              Reported by {item.reporter_name || 'an anonymous resident'} on {formatDate(item.created_at)}
            </p>
          </div>

          {item.photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {item.photos.map((photo) => (
                <EvidencePhoto
                  key={photo.id}
                  load={() => fetchNearbyPhoto(item.report_id, photo.id)}
                  alt={photo.description || 'Photo of the problem'}
                  className="w-full aspect-square rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Status changes with dates only; notes stay private. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <History className="w-3.5 h-3.5" />
            {item.status_history.map((step, i) => (
              <span key={`${step.status}-${step.at}`} className="tabular-nums">
                {i > 0 && '→ '}
                <span className="font-semibold text-navy">{STATUS_CONFIG[step.status]?.label || step.status}</span>{' '}
                {formatDate(step.at)}
              </span>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">
              {item.support_count === 0
                ? 'Nobody else has confirmed this yet.'
                : `${item.support_count} resident${item.support_count === 1 ? '' : 's'} see${item.support_count === 1 ? 's' : ''} this too.`}
            </span>
            <button
              type="button"
              className={item.my_support ? btnSecondary : btnPrimary}
              onClick={() => onToggleSupport(item)}
              disabled={busy}
              aria-pressed={item.my_support}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {item.my_support ? 'You see this too (undo)' : 'Me too'}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function NearbyPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { code, message }
  const [busyId, setBusyId] = useState('');
  const [home, setHome] = useState(null);

  const load = useCallback(async () => {
    const user = getCurrentUser();
    setHome(user?.home_latitude != null ? [user.home_latitude, user.home_longitude] : null);
    const res = await listNearby();
    if (res.ok) {
      setItems(res.data.items);
      setError(null);
    } else {
      setItems([]);
      setError({ code: res.error.code, message: errorText(res.error) });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Refresh the saved home location first, so the map uses the latest one.
    fetchCurrentUser().finally(load);
  }, [load]);

  // "Me too" on/off. The answer has the new count, so only this card changes.
  const toggleSupport = async (item) => {
    setBusyId(item.report_id);
    const res = item.my_support ? await removeSupport(item.report_id) : await addSupport(item.report_id);
    setBusyId('');
    if (res.ok) {
      setItems((prev) => prev.map((it) => (it.report_id === item.report_id ? { ...it, ...res.data } : it)));
    } else {
      showToast({ type: 'error', title: 'Not saved', message: errorText(res.error) });
      load();
    }
  };

  const needsHome = error?.code === 'HOME_LOCATION_REQUIRED';

  return (
    <DashboardLayout
      activeRole={ROLES.CITIZEN}
      title="Nearby issues"
      subtitle="Problems your neighbours shared, within 2 km of your home."
      primaryAction={
        <button type="button" className={btnSecondary} onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      }
    >
      <div className="space-y-5">
        <HomeLocationCard onSaved={() => fetchCurrentUser().finally(load)} />

        <NoteBox tone="info">
          Reports appear here only when their reporter shares them. Press "Me too" if you see the same problem: officials
          see how many residents are affected, but not who.
        </NoteBox>

        {!needsHome && <ErrorBox>{error?.message}</ErrorBox>}

        {loading ? (
          <LoadingState message="Loading nearby issues..." cardsCount={2} />
        ) : needsHome ? (
          <EmptyState
            title="Save your home location first"
            description="Place the pin on your home above. Then you'll see issues your neighbours shared within 2 km."
            icon={MapPinned}
          />
        ) : !error && items.length === 0 ? (
          <>
            {home && <NearbyMap home={home} items={[]} />}
            <EmptyState
              title="No shared issues near you"
              description="Nobody within 2 km of your home has shared a report yet. Your own reports are under My reports."
              icon={MapPinned}
            />
          </>
        ) : (
          <>
            {home && <NearbyMap home={home} items={items} />}
            <div className="space-y-4">
              {items.map((item) => (
                <NearbyIssueCard
                  key={item.report_id}
                  item={item}
                  busy={busyId === item.report_id}
                  onToggleSupport={toggleSupport}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
