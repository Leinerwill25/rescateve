"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Search } from "lucide-react";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
};

// Caracas como centro por defecto
const DEFAULT: [number, number] = [10.4806, -66.9036];

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletMap  = useRef<any>(null);
  const markerRef   = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || leafletMap.current) return;

      const start: [number, number] =
        lat != null && lng != null ? [lat, lng] : DEFAULT;

      const map = L.map(mapRef.current).setView(start, lat != null ? 16 : 12);
      leafletMap.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="font-size:34px;line-height:34px;transform:translate(-50%,-100%)">📍</div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker(start, { draggable: true, icon }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChange(+p.lat.toFixed(6), +p.lng.toFixed(6));
      });

      // Tocar el mapa mueve el pin
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onChange(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el lat/lng cambia por GPS, mover mapa y pin
  useEffect(() => {
    if (lat != null && lng != null && leafletMap.current && markerRef.current) {
      leafletMap.current.setView([lat, lng], 16);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  const useGPS = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Tu dispositivo no permite ubicación. Mueve el pin en el mapa.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange(
          +pos.coords.latitude.toFixed(6),
          +pos.coords.longitude.toFixed(6)
        );
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1
            ? "Permiso de ubicación denegado. Activa el GPS en tu teléfono o mueve el pin en el mapa."
            : "No se pudo obtener tu ubicación. Mueve el pin a mano en el mapa."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Venezuela")}&limit=1`, {
        headers: { "Accept-Language": "es" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat: rLat, lon: rLng } = data[0];
        onChange(+parseFloat(rLat).toFixed(6), +parseFloat(rLng).toFixed(6));
        setSearchQuery(""); // Limpiar tras el éxito
      } else {
        setError("No se encontró la ubicación. Intenta con un nombre más general.");
      }
    } catch (err) {
      setError("Error buscando la ubicación. Verifica tu conexión.");
    }
    setSearching(false);
  };

  return (
    <div>
      {/* Acción primaria: GPS */}
      <button
        type="button"
        onClick={useGPS}
        disabled={locating}
        className="btn btn--gps"
        aria-label="Usar mi ubicación GPS actual"
      >
        {locating ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Obteniendo ubicación…
          </>
        ) : (
          "📡 Usar mi ubicación actual (GPS)"
        )}
      </button>

      {/* Buscador de ubicación por texto */}
      <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s2)", marginBottom: "var(--s2)" }}>
        <input 
          type="text" 
          className="form__input" 
          placeholder="O busca un sector (Ej: Chacao, Caracas)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          style={{ flex: 1, padding: "10px" }}
        />
        <button 
          type="button" 
          className="btn btn--secondary" 
          onClick={handleSearch} 
          disabled={searching}
          style={{ padding: "0 var(--s3)", minHeight: "auto", height: "42px" }}
        >
          {searching ? <span className="spinner" style={{ width: "16px", height: "16px", borderTopColor: "var(--text)" }} /> : <Search size={18} />}
        </button>
      </div>

      {/* Confirmación de ubicación */}
      {lat != null && lng != null && (
        <div className="location-confirmed" role="status">
          <span aria-hidden="true">✅</span>
          <span>
            Ubicación marcada — {lat}, {lng}
          </span>
        </div>
      )}

      <p className="form__hint" style={{ margin: "var(--s2) 0" }}>
        También puedes tocar el mapa o arrastrar el 📍 para ajustar el lugar exacto.
      </p>

      <div
        ref={mapRef}
        className="picker-map"
        role="application"
        aria-label="Mapa para seleccionar ubicación"
      />

      {error && (
        <div className="form__error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
