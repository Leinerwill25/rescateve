# 🆘 Rescate VE — Mapa colaborativo de emergencia

App para reportar, sobre un mapa en tiempo real:
- **Lugares que necesitan ayuda** (rescate, paramédicos, ambulancias, Protección Civil, bomberos, agua, alimentos, refugio).
- **Personas desaparecidas**, con el último lugar donde fueron vistas.

Cualquiera reporta desde el teléfono con un toque (GPS) o moviendo un pin en el mapa. Los rescatistas ven todos los puntos y pueden tocar **"Cómo llegar"** para abrir la ruta en Google Maps.

Stack: **Next.js 15 (App Router) + Supabase + Leaflet/OpenStreetMap**. Sin API keys de mapas.

---

## 🚀 Desplegar en ~10 minutos

### 1. Supabase
1. Crea un proyecto en https://supabase.com
2. **SQL Editor → New query** → pega todo `supabase/schema.sql` → **Run**.
3. (Opcional, para fotos de desaparecidos) **Storage → New bucket** → nombre `desaparecidos` → marca **Public bucket**. Si no lo creas, la app igual funciona, solo sin fotos.
4. **Project Settings → API**: copia `Project URL` y `anon public key`.

### 2. Variables de entorno
Copia `.env.local.example` a `.env.local` y rellena:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Local
```bash
npm install
npm run dev
```
Abre http://localhost:3000

### 4. Vercel
- Sube el repo a GitHub e impórtalo en Vercel (es tu flujo de siempre), o `vercel`.
- En Vercel añade las dos variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Deploy.

---

## ⚠️ 3 decisiones que dejé tomadas por ti (cámbialas si quieres)

1. **Mapa = Leaflet + OpenStreetMap, NO Google Maps.**
   Google Maps JS necesita API key + facturación activa → es un bloqueante en plena emergencia. Leaflet/OSM funciona sin nada. El selector usa **GPS del dispositivo** (lo más exacto para quien reporta estando en el sitio) + pin arrastrable + toque en el mapa. Igual guardo lat/lng. Si luego quieres Google Maps, solo se cambia `LocationPicker.tsx`.

2. **Reportes anónimos (sin login).**
   En una catástrofe, pedir cuenta mata el uso. RLS permite insertar/leer sin autenticación. **Riesgo:** spam o reportes falsos. Mitigaciones rápidas si hace falta (ver abajo).

3. **Cualquiera puede marcar "atendido" / "encontrado".**
   Para que los rescatistas en terreno limpien el mapa. Es abusable. Si crece, conviene restringirlo a usuarios verificados.

---

## 🔒 Si aparece abuso (mitigaciones rápidas, en orden)
- Añade un **hCaptcha/Turnstile** antes de insertar.
- Limita inserciones por IP con un Edge Function.
- Campo `verificado boolean default false` y un panel simple con login (Supabase Auth) para que voluntarios confirmen reportes; el mapa público muestra primero los verificados.
- Modera vía Supabase Table Editor (puedes borrar/editar a mano en tiempo real).

## 🧭 Mejoras siguientes (cuando haya aire)
- Filtro por tipo y por zona en el mapa.
- Botón de WhatsApp directo al contacto.
- Conteo de "confirmaciones" por reporte (varias personas confirman el mismo punto → sube prioridad).
- Exportar puntos a GeoJSON/CSV para Protección Civil / bomberos.
- PWA para que abra offline y cachee el último estado del mapa.

## 📁 Estructura
```
app/
  layout.tsx        layout + metadatos
  page.tsx          tabs, carga de datos, realtime, vista lista
  globals.css       estilos (mobile-first, alto contraste)
components/
  MapView.tsx       mapa con todos los puntos + "cómo llegar"
  LocationPicker.tsx GPS + pin arrastrable (devuelve lat/lng)
  ReportForm.tsx    formulario de solicitud de ayuda
  MissingForm.tsx   formulario de persona desaparecida
lib/
  supabase.ts       cliente
  types.ts          tipos + catálogo de tipos de ayuda
supabase/
  schema.sql        tablas, RLS, realtime
```
