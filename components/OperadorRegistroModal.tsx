"use client";

import { OperadorData } from "@/lib/operador";

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  data: OperadorData;
  onChange: (data: OperadorData) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
};

export default function OperadorRegistroModal({
  open,
  title = "¿Quién toma este traslado?",
  subtitle = "Ingresa los datos del conductor, voluntario o entidad que realizará este traslado.",
  data,
  onChange,
  onClose,
  onSave,
  saving = false,
  saveLabel = "Guardar conductor",
}: Props) {
  if (!open) return null;

  const set = (patch: Partial<OperadorData>) => onChange({ ...data, ...patch });

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="modal__title" style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="modal__icon-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal__body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--s4)" }}>
            {subtitle}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--s3)" }}>
            <div>
              <label className="form__label">Nombre completo / Entidad</label>
              <input
                type="text"
                className="form__input"
                placeholder="Ej. Yummy, Ridery, Voluntario Carlos"
                value={data.nombre}
                onChange={(e) => set({ nombre: e.target.value })}
                autoFocus
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
              <div>
                <label className="form__label">Cédula</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="V-12345678"
                  value={data.cedula}
                  onChange={(e) => set({ cedula: e.target.value })}
                />
              </div>
              <div>
                <label className="form__label">Teléfono</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="0414-0000000"
                  value={data.telefono}
                  onChange={(e) => set({ telefono: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
              <div>
                <label className="form__label">Modelo del vehículo</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="Toyota Corolla"
                  value={data.modelo}
                  onChange={(e) => set({ modelo: e.target.value })}
                />
              </div>
              <div>
                <label className="form__label">Placa</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="AB123CD"
                  value={data.placa}
                  onChange={(e) => set({ placa: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
              <div>
                <label className="form__label">Nº de Unidad</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="001"
                  value={data.unidad}
                  onChange={(e) => set({ unidad: e.target.value })}
                />
              </div>
              <div>
                <label className="form__label">Puestos</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="4"
                  value={data.puestos}
                  onChange={(e) => set({ puestos: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="form__label">Línea (si aplica)</label>
              <input
                type="text"
                className="form__input"
                placeholder="Ej. Línea Los Rápidos, Yummy Rides"
                value={data.linea}
                onChange={(e) => set({ linea: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
              <div>
                <label className="form__label">Estado</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="Miranda"
                  value={data.estado}
                  onChange={(e) => set({ estado: e.target.value })}
                />
              </div>
              <div>
                <label className="form__label">Ciudad</label>
                <input
                  type="text"
                  className="form__input"
                  placeholder="Caracas"
                  value={data.ciudad}
                  onChange={(e) => set({ ciudad: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="modal__footer" style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s4)" }}>
          <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" style={{ flex: 1 }} onClick={onSave} disabled={saving}>
            {saving ? "Guardando..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
