-- Schema dump for ayudaparavenezuela
-- Generated 2026-06-26T01:39:18Z

-- ==================== ENUMS ====================
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.venezuela_state AS ENUM ('Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Yaracuy', 'Zulia');
CREATE TYPE public.report_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.help_point_status AS ENUM ('urgent', 'partial', 'covered');

-- ==================== TABLES ====================
CREATE TABLE public.center_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text,
  address text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  latitude double precision,
  longitude double precision,
  phone text,
  schedule text,
  supply_types text[] NOT NULL DEFAULT '{}'::text[],
  accepts_volunteers boolean NOT NULL DEFAULT false,
  notes text,
  photo_url text,
  reporter_name text NOT NULL,
  reporter_contact text NOT NULL,
  status report_status NOT NULL DEFAULT 'pending'::report_status,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  country text NOT NULL DEFAULT 'Venezuela'::text
);

CREATE TABLE public.collection_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  phone text,
  schedule text,
  supply_types text[] NOT NULL DEFAULT '{}'::text[],
  accepts_volunteers boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  country text NOT NULL DEFAULT 'Venezuela'::text
);

CREATE TABLE public.help_point_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  help_point_id uuid NOT NULL,
  status_reported help_point_status NOT NULL,
  note text,
  visitor_fingerprint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.help_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  address text NOT NULL,
  state venezuela_state NOT NULL,
  city text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  needs text[] NOT NULL DEFAULT '{}'::text[],
  status help_point_status NOT NULL DEFAULT 'urgent'::help_point_status,
  people_affected integer,
  notes text,
  reporter_name text NOT NULL,
  reporter_contact text,
  photo_url text,
  visit_count integer NOT NULL DEFAULT 0,
  last_visit_status help_point_status,
  last_visit_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ==================== CONSTRAINTS ====================
ALTER TABLE ONLY public.center_reports ADD CONSTRAINT center_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.collection_centers ADD CONSTRAINT collection_centers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.collection_centers ADD CONSTRAINT collection_centers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.help_point_visits ADD CONSTRAINT help_point_visits_help_point_id_fkey FOREIGN KEY (help_point_id) REFERENCES help_points(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.help_point_visits ADD CONSTRAINT help_point_visits_help_point_id_visitor_fingerprint_key UNIQUE (help_point_id, visitor_fingerprint);
ALTER TABLE ONLY public.help_point_visits ADD CONSTRAINT help_point_visits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.help_points ADD CONSTRAINT help_points_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- ==================== INDEXES ====================
CREATE INDEX center_reports_status_idx ON public.center_reports USING btree (status, created_at DESC);
CREATE INDEX center_reports_country_idx ON public.center_reports USING btree (country);
CREATE INDEX idx_collection_centers_active ON public.collection_centers USING btree (is_active);
CREATE INDEX collection_centers_country_idx ON public.collection_centers USING btree (country);
CREATE INDEX idx_collection_centers_state ON public.collection_centers USING btree (state);
CREATE INDEX help_points_state_idx ON public.help_points USING btree (state);
CREATE INDEX help_points_active_idx ON public.help_points USING btree (is_active);
CREATE INDEX help_point_visits_point_idx ON public.help_point_visits USING btree (help_point_id);

-- ==================== FUNCTIONS ====================
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

-- ==================== RLS ====================
ALTER TABLE public.center_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_point_visits ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- TABLA: solicitudes_gasolina
-- ================================================================
CREATE TABLE IF NOT EXISTS public.solicitudes_gasolina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    cedula TEXT NOT NULL,
    placa TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    motivo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    litros NUMERIC NOT NULL,
    estado TEXT CHECK (estado IN ('pendiente', 'suministrado')) NOT NULL DEFAULT 'pendiente'
);

ALTER TABLE public.solicitudes_gasolina ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert solicitudes gasolina" ON public.solicitudes_gasolina AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read solicitudes gasolina" ON public.solicitudes_gasolina AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update solicitudes gasolina" ON public.solicitudes_gasolina AS PERMISSIVE FOR UPDATE TO anon, authenticated USING (true);

-- ==================== POLICIES ====================
CREATE POLICY "Admins can delete reports" ON public.center_reports AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update reports" ON public.center_reports AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read reports" ON public.center_reports AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can submit a report" ON public.center_reports AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can read their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admins can delete centers" ON public.collection_centers AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update centers" ON public.collection_centers AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert centers" ON public.collection_centers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read all centers" ON public.collection_centers AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can read active centers" ON public.collection_centers AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_active = true));
CREATE POLICY "Admins can delete help points" ON public.help_points AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update help points" ON public.help_points AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read all help points" ON public.help_points AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create help points" ON public.help_points AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can read active help points" ON public.help_points AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_active = true));
CREATE POLICY "Admins can delete visits" ON public.help_point_visits AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can record a visit" ON public.help_point_visits AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can read visits" ON public.help_point_visits AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
