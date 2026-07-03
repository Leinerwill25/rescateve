"use client";

import { useEffect, useState } from "react";
import LocationPicker from "@/components/LocationPicker";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onConfirm: (referencia: string) => void;
  confirming?: boolean;
};

export default function AshLocationStep({ lat, lng, onChange, onConfirm, confirming }: Props) {
  const [mounted, setMounted] = useState(false);
  const [referencia, setReferencia] = useState("");

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
      <input
        type="text"
        className="ash-input"
        placeholder="Referencia del lugar (ej. Polideportivo Chacao, Av. Principal)"
        value={referencia}
        onChange={(e) => setReferencia(e.target.value)}
      />
      <p className="ash-widget__hint">
        Opcional: escribe el nombre del lugar. Si lo dejas vacío, usamos la dirección del mapa.
      </p>
      <button
        type="button"
        className="ash-btn ash-btn--primary"
        onClick={() => onConfirm(referencia)}
        disabled={confirming || lat == null || lng == null}
      >
        {confirming ? "Obteniendo dirección…" : "Confirmar ubicación"}
      </button>
    </div>
  );
}
