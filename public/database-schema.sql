-- ============================================================
-- Good Vibes Ingressos — Complete Database Schema
-- Generated: 2026-03-19
-- ============================================================

-- 1. ENUM TYPES
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'atendente', 'desenvolvedor');

-- 2. TABLES
-- ============================================================

-- Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT ''::text,
  email text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  cpf text,
  user_type text NOT NULL DEFAULT 'cliente'::text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

-- Events
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  date date NOT NULL,
  time text NOT NULL DEFAULT '00:00'::text,
  end_date date,
  end_time text DEFAULT ''::text,
  location_name text DEFAULT ''::text,
  location_address text DEFAULT ''::text,
  banner_image text DEFAULT ''::text,
  map_image text DEFAULT ''::text,
  policies jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  sales_end_time text,
  is_visible boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- Ticket Locations
CREATE TABLE public.ticket_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  location_type text NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text,
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  available_quantity integer NOT NULL DEFAULT 0,
  group_size integer NOT NULL DEFAULT 1,
  color text DEFAULT '#9D4EDD'::text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_sold_out boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_locations_pkey PRIMARY KEY (id)
);

-- Orders
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  total_amount numeric NOT NULL DEFAULT 0,
  stripe_session_id text,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id)
);

-- Order Items
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_location_id uuid NOT NULL REFERENCES public.ticket_locations(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  validation_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id)
);

-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User Roles policies
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Events policies
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Producers can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Producers can update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Producers can delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Ticket Locations policies
CREATE POLICY "Anyone can view ticket locations" ON public.ticket_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Event creator can insert locations" ON public.ticket_locations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_locations.event_id AND events.created_by = auth.uid()));
CREATE POLICY "Event creator can update locations" ON public.ticket_locations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_locations.event_id AND events.created_by = auth.uid()));
CREATE POLICY "Event creator can delete locations" ON public.ticket_locations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = ticket_locations.event_id AND events.created_by = auth.uid()));

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Order Items policies
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- 4. FUNCTIONS
-- ============================================================

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, user_type, phone, cpf, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'cliente'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'cpf', '')), ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = CASE WHEN profiles.name = '' OR profiles.name IS NULL THEN COALESCE(EXCLUDED.name, profiles.name) ELSE profiles.name END,
    email = COALESCE(EXCLUDED.email, profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$;

-- assign_default_role (trigger function)
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'atendente') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- generate_validation_code
CREATE OR REPLACE FUNCTION public.generate_validation_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.validation_code IS NULL OR btrim(NEW.validation_code) = '' THEN
    LOOP
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text || COALESCE(NEW.id::text, '')), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.validation_code = v_code);
    END LOOP;
    NEW.validation_code := v_code;
  ELSE
    NEW.validation_code := upper(btrim(NEW.validation_code));
  END IF;
  RETURN NEW;
END;
$$;

-- decrease_availability
CREATE OR REPLACE FUNCTION public.decrease_availability(loc_id uuid, qty integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE rows_affected INTEGER;
BEGIN
  UPDATE public.ticket_locations SET available_quantity = available_quantity - qty WHERE id = loc_id AND available_quantity >= qty;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- validate_order
CREATE OR REPLACE FUNCTION public.validate_order(p_order_id uuid, p_producer_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE rows_affected INTEGER;
BEGIN
  UPDATE public.orders SET validated_at = now() WHERE id = p_order_id AND validated_at IS NULL
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = orders.event_id AND e.created_by = p_producer_id);
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- admin_validate_order
CREATE OR REPLACE FUNCTION public.admin_validate_order(p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE rows_affected INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN false; END IF;
  UPDATE public.orders SET validated_at = now() WHERE id = p_order_id AND validated_at IS NULL;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- transfer_order
CREATE OR REPLACE FUNCTION public.transfer_order(p_order_id uuid, p_from_user_id uuid, p_to_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE rows_affected INTEGER;
BEGIN
  UPDATE public.orders SET user_id = p_to_user_id, updated_at = now()
  WHERE id = p_order_id AND user_id = p_from_user_id AND status = 'confirmed' AND validated_at IS NULL;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- find_user_by_email_or_cpf
CREATE OR REPLACE FUNCTION public.find_user_by_email_or_cpf(p_identifier text)
RETURNS TABLE(user_id uuid, user_name text, user_email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT p.user_id, p.name as user_name, u.email as user_email
  FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE u.email = p_identifier OR p.cpf = p_identifier LIMIT 1;
$$;

-- get_email_by_cpf
CREATE OR REPLACE FUNCTION public.get_email_by_cpf(p_cpf text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT u.email FROM auth.users u JOIN public.profiles p ON p.user_id = u.id WHERE p.cpf = p_cpf LIMIT 1;
$$;

-- get_events_list
CREATE OR REPLACE FUNCTION public.get_events_list(p_creator_id uuid DEFAULT NULL)
RETURNS SETOF events LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT * FROM public.events WHERE deleted_at IS NULL AND (p_creator_id IS NULL OR created_by = p_creator_id) ORDER BY date ASC;
$$;

-- get_my_ticket_codes
CREATE OR REPLACE FUNCTION public.get_my_ticket_codes(p_order_id uuid, p_user_id uuid)
RETURNS TABLE(item_id uuid, validation_code text, location_name text, quantity integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT oi.id, oi.validation_code, tl.name, oi.quantity
  FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id JOIN public.ticket_locations tl ON tl.id = oi.ticket_location_id
  WHERE oi.order_id = p_order_id AND o.user_id = p_user_id;
$$;

-- get_producer_sales
CREATE OR REPLACE FUNCTION public.get_producer_sales(p_user_id uuid)
RETURNS TABLE(order_id uuid, event_id uuid, event_title text, event_date date, buyer_id uuid, order_status text, total_amount numeric, order_created_at timestamptz, item_id uuid, location_name text, location_type text, item_quantity integer, item_unit_price numeric, item_subtotal numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT o.id, e.id, e.title, e.date, o.user_id, o.status, o.total_amount, o.created_at, oi.id, tl.name, tl.location_type, oi.quantity, oi.unit_price, oi.subtotal
  FROM orders o JOIN events e ON e.id = o.event_id JOIN order_items oi ON oi.order_id = o.id JOIN ticket_locations tl ON tl.id = oi.ticket_location_id
  WHERE e.created_by = p_user_id ORDER BY o.created_at DESC;
$$;

-- get_producer_tickets
CREATE OR REPLACE FUNCTION public.get_producer_tickets(p_user_id uuid)
RETURNS TABLE(order_id uuid, event_id uuid, event_title text, event_date date, buyer_id uuid, buyer_name text, buyer_email text, buyer_phone text, buyer_cpf text, order_status text, validated_at timestamptz, total_amount numeric, order_created_at timestamptz, order_updated_at timestamptz, item_id uuid, location_name text, location_type text, item_quantity integer, item_unit_price numeric, item_subtotal numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT o.id, e.id, e.title, e.date, o.user_id, p.name, u.email, p.phone, p.cpf, o.status, o.validated_at, o.total_amount, o.created_at, o.updated_at, oi.id, tl.name, tl.location_type, oi.quantity, oi.unit_price, oi.subtotal
  FROM orders o JOIN events e ON e.id = o.event_id JOIN order_items oi ON oi.order_id = o.id JOIN ticket_locations tl ON tl.id = oi.ticket_location_id
  LEFT JOIN profiles p ON p.user_id = o.user_id LEFT JOIN auth.users u ON u.id = o.user_id
  WHERE e.created_by = p_user_id ORDER BY o.created_at DESC;
$$;

-- lookup_ticket_by_code
CREATE OR REPLACE FUNCTION public.lookup_ticket_by_code(p_code text, p_producer_id uuid)
RETURNS TABLE(is_valid boolean, order_id uuid, event_title text, location_name text, buyer_name text, item_quantity integer, is_already_validated boolean, validation_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE v_item record; v_order record;
BEGIN
  SELECT * INTO v_item FROM public.order_items WHERE order_items.validation_code = upper(trim(p_code));
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text; RETURN; END IF;
  SELECT * INTO v_order FROM public.orders WHERE orders.id = v_item.order_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text; RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE events.id = v_order.event_id AND events.created_by = p_producer_id) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text; RETURN;
  END IF;
  RETURN QUERY SELECT (v_order.status = 'confirmed'), v_order.id, e.title, tl.name, COALESCE(p.name, '—'), v_item.quantity, (v_order.validated_at IS NOT NULL), v_item.validation_code
  FROM public.events e LEFT JOIN public.ticket_locations tl ON tl.id = v_item.ticket_location_id LEFT JOIN public.profiles p ON p.user_id = v_order.user_id WHERE e.id = v_order.event_id;
END;
$$;

-- admin_lookup_ticket_by_code
CREATE OR REPLACE FUNCTION public.admin_lookup_ticket_by_code(p_code text)
RETURNS TABLE(is_valid boolean, order_id uuid, event_title text, location_name text, buyer_name text, item_quantity integer, is_already_validated boolean, validation_code text, producer_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE v_item record; v_order record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text, NULL::text; RETURN; END IF;
  SELECT * INTO v_item FROM public.order_items WHERE order_items.validation_code = upper(trim(p_code));
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text, NULL::text; RETURN; END IF;
  SELECT * INTO v_order FROM public.orders WHERE orders.id = v_item.order_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::integer, false, NULL::text, NULL::text; RETURN; END IF;
  RETURN QUERY SELECT (v_order.status = 'confirmed'), v_order.id, e.title, tl.name, COALESCE(p.name, '—'), v_item.quantity, (v_order.validated_at IS NOT NULL), v_item.validation_code, COALESCE(prod.name, '—')
  FROM public.events e LEFT JOIN public.ticket_locations tl ON tl.id = v_item.ticket_location_id LEFT JOIN public.profiles p ON p.user_id = v_order.user_id LEFT JOIN public.profiles prod ON prod.user_id = e.created_by WHERE e.id = v_order.event_id;
END;
$$;

-- admin_get_all_producers
CREATE OR REPLACE FUNCTION public.admin_get_all_producers()
RETURNS TABLE(producer_id uuid, producer_name text, producer_email text, producer_phone text, total_events bigint, total_revenue numeric, total_tickets_sold bigint, total_orders bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT p.user_id, p.name, COALESCE(p.email, ''), COALESCE(p.phone, ''), COUNT(DISTINCT e.id), COALESCE(SUM(oi.subtotal), 0), COALESCE(SUM(oi.quantity), 0), COUNT(DISTINCT o.id)
  FROM profiles p LEFT JOIN events e ON e.created_by = p.user_id AND e.deleted_at IS NULL LEFT JOIN orders o ON o.event_id = e.id AND o.status = 'confirmed' LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE p.user_type = 'produtor' GROUP BY p.user_id, p.name, p.email, p.phone;
$$;

-- admin_get_all_events
CREATE OR REPLACE FUNCTION public.admin_get_all_events()
RETURNS TABLE(event_id uuid, event_title text, event_date date, producer_id uuid, producer_name text, is_visible boolean, total_revenue numeric, total_tickets_sold bigint, total_orders bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT e.id, e.title, e.date, e.created_by, COALESCE(p.name, '—'), e.is_visible, COALESCE(SUM(oi.subtotal), 0), COALESCE(SUM(oi.quantity), 0)::bigint, COUNT(DISTINCT o.id), e.created_at
  FROM events e LEFT JOIN profiles p ON p.user_id = e.created_by LEFT JOIN orders o ON o.event_id = e.id AND o.status = 'confirmed' LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE e.deleted_at IS NULL GROUP BY e.id, e.title, e.date, e.created_by, p.name, e.is_visible, e.created_at ORDER BY e.created_at DESC;
$$;

-- admin_get_producer_sales
CREATE OR REPLACE FUNCTION public.admin_get_producer_sales(p_producer_id uuid)
RETURNS TABLE(order_id uuid, event_id uuid, event_title text, event_date date, buyer_name text, order_status text, total_amount numeric, order_created_at timestamptz, item_id uuid, location_name text, location_type text, item_quantity integer, item_unit_price numeric, item_subtotal numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT o.id, e.id, e.title, e.date, COALESCE(bp.name, '—'), o.status, o.total_amount, o.created_at, oi.id, tl.name, tl.location_type, oi.quantity, oi.unit_price, oi.subtotal
  FROM orders o JOIN events e ON e.id = o.event_id JOIN order_items oi ON oi.order_id = o.id JOIN ticket_locations tl ON tl.id = oi.ticket_location_id LEFT JOIN profiles bp ON bp.user_id = o.user_id
  WHERE e.created_by = p_producer_id ORDER BY o.created_at DESC;
$$;

-- admin_get_events_ticket_summary
CREATE OR REPLACE FUNCTION public.admin_get_events_ticket_summary()
RETURNS TABLE(event_id uuid, event_title text, event_date date, producer_id uuid, producer_name text, is_visible boolean, location_type text, location_name text, total_quantity integer, sold_quantity bigint, revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT e.id, e.title, e.date, e.created_by, COALESCE(p.name, '—'), e.is_visible, tl.location_type, tl.name, tl.quantity, COALESCE(SUM(oi.quantity), 0)::bigint, COALESCE(SUM(oi.subtotal), 0)
  FROM events e LEFT JOIN profiles p ON p.user_id = e.created_by LEFT JOIN ticket_locations tl ON tl.event_id = e.id LEFT JOIN order_items oi ON oi.ticket_location_id = tl.id AND EXISTS (SELECT 1 FROM orders o WHERE o.id = oi.order_id AND o.status = 'confirmed')
  WHERE e.deleted_at IS NULL GROUP BY e.id, e.title, e.date, e.created_by, p.name, e.is_visible, e.created_at, tl.location_type, tl.name, tl.quantity, tl.sort_order ORDER BY e.created_at DESC, tl.sort_order;
$$;

-- exec_sql (admin only)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog', 'information_schema', 'auth', 'storage' AS $$
DECLARE result json; caller_role text; clean_query text;
BEGIN
  caller_role := current_setting('request.jwt.claims', true)::json->>'role';
  IF caller_role IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Acesso negado: apenas service_role pode executar esta função.'; END IF;
  clean_query := rtrim(sql_query, '; ');
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || clean_query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- 5. TRIGGERS
-- ============================================================

-- Auto-create profile on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign default role on new user signup
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Auto-generate validation code for order items
CREATE TRIGGER trg_generate_validation_code
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.generate_validation_code();

-- Auto-update updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ticket_locations_updated_at BEFORE UPDATE ON public.ticket_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- END OF SCHEMA
-- ============================================================
