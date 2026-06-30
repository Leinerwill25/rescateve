"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Ambulance, ArrowRight, Car, MapPin, Package, Truck, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TIPO_VEHICULO_LABEL, type VoluntarioPublico } from "@/lib/kpis-logistica";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import Kicker from "./Kicker";
import Reveal from "./Reveal";

const VISIBLE_INITIAL = 12;

const VEHICLE_ICONS: Record<string, typeof Truck> = {
  pasajeros: Car,
  carga: Package,
  ambulancia: Ambulance,
  grua: Truck,
  tecnico: Wrench,
};

const PREVIEW_PLACEHOLDERS = [
  { initial: "M", tipo: "carga" as const },
  { initial: "J", tipo: "pasajeros" as const },
  { initial: "A", tipo: "ambulancia" as const },
];

function VehicleIcon({ tipo, muted }: { tipo: string; muted?: boolean }) {
  const Icon = VEHICLE_ICONS[tipo] ?? Truck;
  return (
    <Icon
      size={14}
      strokeWidth={1.75}
      aria-hidden="true"
      className={muted ? "volunteer-card__vehicle--muted" : undefined}
    />
  );
}

function VolunteerCard({
  voluntario,
  toneIndex,
  cardIndex,
}: {
  voluntario: VoluntarioPublico;
  toneIndex: number;
  cardIndex: number;
}) {
  return (
    <li className="volunteer-card" style={{ "--card-i": cardIndex } as CSSProperties}>
      <div
        className={`volunteer-card__avatar volunteer-card__avatar--tone-${toneIndex % 4}`}
        aria-hidden="true"
      >
        {voluntario.nombre_publico.charAt(0).toUpperCase()}
      </div>
      <div className="volunteer-card__body">
        <span className="volunteer-card__name">{voluntario.nombre_publico}</span>
        <span className="volunteer-card__meta">
          <VehicleIcon tipo={voluntario.tipo} />
          <span>{TIPO_VEHICULO_LABEL[voluntario.tipo] ?? voluntario.tipo}</span>
        </span>
        {voluntario.ciudad && (
          <span className="volunteer-card__city">
            <MapPin size={12} aria-hidden="true" />
            {voluntario.ciudad}
          </span>
        )}
      </div>
    </li>
  );
}

function PreviewCard({
  initial,
  tipo,
  cardIndex,
  toneIndex,
}: {
  initial: string;
  tipo: keyof typeof VEHICLE_ICONS;
  cardIndex: number;
  toneIndex: number;
}) {
  return (
    <li
      className="volunteer-card volunteer-card--preview"
      style={{ "--card-i": cardIndex } as CSSProperties}
      aria-hidden="true"
    >
      <div
        className={`volunteer-card__avatar volunteer-card__avatar--tone-${toneIndex % 4} volunteer-card__avatar--muted`}
      >
        {initial}
      </div>
      <div className="volunteer-card__body">
        <span className="volunteer-card__line volunteer-card__line--name" />
        <span className="volunteer-card__line volunteer-card__line--meta">
          <VehicleIcon tipo={tipo} muted />
        </span>
        <span className="volunteer-card__line volunteer-card__line--city" />
      </div>
    </li>
  );
}

export default function VolunteersSection() {
  const [voluntarios, setVoluntarios] = useState<VoluntarioPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { ref: gridRef, visible: gridVisible } = useScrollReveal(0.08);

  const cargar = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("list_voluntarios_publicos");
      if (!error && data) {
        setVoluntarios((data as VoluntarioPublico[]) ?? []);
        return;
      }

      const fallback = await supabase
        .from("voluntarios_publicos")
        .select("id, nombre_publico, tipo, ciudad, created_at")
        .order("created_at", { ascending: false });
      if (fallback.error) throw fallback.error;
      setVoluntarios((fallback.data as VoluntarioPublico[]) ?? []);
    } catch {
      setVoluntarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel("voluntarios_publicos")
      .on("postgres_changes", { event: "*", schema: "public", table: "transportes" }, cargar)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [cargar]);

  const visibles = showAll ? voluntarios : voluntarios.slice(0, VISIBLE_INITIAL);
  const hayMas = voluntarios.length > VISIBLE_INITIAL;
  const isEmpty = !loading && voluntarios.length === 0;

  return (
    <section
      className="volunteers-section"
      id="voluntarios"
      aria-labelledby="volunteers-title"
    >
      <div className="volunteers-section__inner">
        <Reveal>
          <header className="volunteers-section__header">
            <Kicker className="volunteers-section__kicker">Quienes mueven la ayuda</Kicker>
            <h2 id="volunteers-title" className="volunteers-section__title">
              Gente común, ruta extraordinaria
            </h2>
            <p className="volunteers-section__lead">
              Detrás de cada traslado hay personas que ponen su vehículo y su tiempo para que la ayuda llegue.
            </p>
          </header>
        </Reveal>

        {isEmpty && (
          <Reveal delay={50}>
            <div className="volunteers-invite">
              <div className="volunteers-invite__content">
                <p className="volunteers-invite__eyebrow">Únete a la red</p>
                <h3 className="volunteers-invite__title">Sé el primero en sumarte</h3>
                <p className="volunteers-invite__desc">
                  Registra tu vehículo. Cuando operaciones te active, aparecerás aquí con tu nombre, vehículo y ciudad.
                </p>
              </div>
              <Link href="/voluntarios" className="volunteers-invite__btn">
                Registrarme
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        )}

        <div
          ref={gridRef}
          className={`volunteers-section__grid${gridVisible ? " volunteers-section__grid--visible" : ""}${loading ? " volunteers-section__grid--loading" : ""}`}
        >
          <ul
            className={`volunteers-grid${isEmpty || loading ? " volunteers-grid--preview" : ""}`}
            aria-label="Voluntarios de transporte"
          >
            {loading &&
              PREVIEW_PLACEHOLDERS.map((g, i) => (
                <PreviewCard
                  key={`load-${g.initial}`}
                  initial={g.initial}
                  tipo={g.tipo}
                  cardIndex={i}
                  toneIndex={i}
                />
              ))}

            {isEmpty &&
              PREVIEW_PLACEHOLDERS.map((g, i) => (
                <PreviewCard
                  key={g.initial}
                  initial={g.initial}
                  tipo={g.tipo}
                  cardIndex={i}
                  toneIndex={i}
                />
              ))}

            {!loading &&
              voluntarios.length > 0 &&
              visibles.map((v, i) => (
                <VolunteerCard key={v.id} voluntario={v} toneIndex={i} cardIndex={i} />
              ))}
          </ul>

          {(isEmpty || loading) && (
            <p className="volunteers-section__preview-note">
              Voluntarios verificados con consentimiento público aparecerán en esta lista.
            </p>
          )}

          {hayMas && !showAll && (
            <div className="volunteers-section__more">
              <button type="button" className="btn btn--outline" onClick={() => setShowAll(true)}>
                Ver {voluntarios.length - VISIBLE_INITIAL} más
              </button>
            </div>
          )}
        </div>

        {!isEmpty && !loading && (
          <div className="volunteers-section__cta">
            <Link href="/voluntarios" className="volunteers-section__cta-link">
              ¿Tienes vehículo? Súmate
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
