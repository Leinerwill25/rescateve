"use client";

import { useEffect, useState } from "react";
import LocationPicker from "@/components/LocationPicker";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onConfirm: () => void;
};

/**
 * Mapa embebido en Ash — import estático (evita ChunkLoadError de next/dynamic en dev)
 * y montaje diferido para que Leaflet calcule bien el tamaño del contenedor.
 */
export default function AshLocationStep({ lat, lng, onChange, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="ash-widget">
      <p className="ash-widget__label">Marca dónde se necesita la ayuda</p>
      {mounted ? (
        <LocationPicker key="ash-location-picker" lat={lat} lng={lng} onChange={onChange} />
      ) : (
        <p className="ash-widget__loading">Cargando mapa…</p>
      )}
      <button type="button" className="ash-btn ash-btn--primary" onClick={onConfirm}>
        Confirmar ubicación
      </button>
    </div>
  );
}
