-- Registro de accesos a la API pública de reportes operacionales
CREATE TABLE IF NOT EXISTS public.reportes_api_accesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_agent text,
  endpoint text NOT NULL,
  metodo text NOT NULL DEFAULT 'GET',
  autorizado boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reportes_api_accesos_created_at
  ON public.reportes_api_accesos (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reportes_api_accesos_ip
  ON public.reportes_api_accesos (ip_address);

ALTER TABLE public.reportes_api_accesos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.reportes_api_accesos IS
  'Auditoría de consultas a /api/public/reportes. Solo accesible vía service role desde el servidor.';
