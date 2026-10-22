import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { pinIcon, homeIcon, useMapTiles } from './mapSetup';

/**
 * MapPreview
 * A small, still map of a chosen spot, shown in forms instead of the full
 * picker. It cannot be dragged or zoomed: clicking it calls onClick (which
 * opens the map pop-up).
 *
 * Props: latitude, longitude, onClick, label (for screen readers), home (house pin)
 */
export default function MapPreview({ latitude, longitude, onClick, label = 'Change the spot on the map', home = false }) {
  const tiles = useMapTiles();
  const position = [Number(latitude), Number(longitude)];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative isolate block w-full h-32 sm:h-36 rounded-2xl overflow-hidden border border-border shadow-xs cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <MapContainer
        // A new map for a new spot: the preview never pans by itself.
        key={position.join(',')}
        center={position}
        zoom={16}
        className={`h-full w-full pointer-events-none ${tiles.styled ? 'cf-styled' : ''}`}
        dragging={false}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        {/* The map credit stays: the tile providers require it on every map. */}
        <TileLayer key={tiles.url} url={tiles.url} attribution={tiles.attribution} />
        <Marker position={position} icon={home ? homeIcon : pinIcon()} interactive={false} keyboard={false} />
      </MapContainer>
      <span className="absolute inset-0 z-[500] bg-transparent group-hover:bg-stone-900/10 transition-colors" aria-hidden="true" />
    </button>
  );
}
