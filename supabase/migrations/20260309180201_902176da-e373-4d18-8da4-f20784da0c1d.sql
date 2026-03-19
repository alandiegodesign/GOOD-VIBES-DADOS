
-- Create admin role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: only admins can view user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: only admins can manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin function: get all producers with their stats
CREATE OR REPLACE FUNCTION public.admin_get_all_producers()
RETURNS TABLE(
  producer_id uuid,
  producer_name text,
  producer_email text,
  producer_phone text,
  total_events bigint,
  total_revenue numeric,
  total_tickets_sold bigint,
  total_orders bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id as producer_id,
    p.name as producer_name,
    COALESCE(p.email, '') as producer_email,
    COALESCE(p.phone, '') as producer_phone,
    COUNT(DISTINCT e.id) as total_events,
    COALESCE(SUM(oi.subtotal), 0) as total_revenue,
    COALESCE(SUM(oi.quantity), 0) as total_tickets_sold,
    COUNT(DISTINCT o.id) as total_orders
  FROM profiles p
  LEFT JOIN events e ON e.created_by = p.user_id AND e.deleted_at IS NULL
  LEFT JOIN orders o ON o.event_id = e.id AND o.status = 'confirmed'
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE p.user_type = 'produtor'
  GROUP BY p.user_id, p.name, p.email, p.phone;
$$;

-- Admin function: get sales for a specific producer
CREATE OR REPLACE FUNCTION public.admin_get_producer_sales(p_producer_id uuid)
RETURNS TABLE(
  order_id uuid,
  event_id uuid,
  event_title text,
  event_date date,
  buyer_name text,
  order_status text,
  total_amount numeric,
  order_created_at timestamptz,
  item_id uuid,
  location_name text,
  location_type text,
  item_quantity integer,
  item_unit_price numeric,
  item_subtotal numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id as order_id,
    e.id as event_id,
    e.title as event_title,
    e.date as event_date,
    COALESCE(bp.name, '—') as buyer_name,
    o.status as order_status,
    o.total_amount,
    o.created_at as order_created_at,
    oi.id as item_id,
    tl.name as location_name,
    tl.location_type,
    oi.quantity as item_quantity,
    oi.unit_price as item_unit_price,
    oi.subtotal as item_subtotal
  FROM orders o
  JOIN events e ON e.id = o.event_id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN ticket_locations tl ON tl.id = oi.ticket_location_id
  LEFT JOIN profiles bp ON bp.user_id = o.user_id
  WHERE e.created_by = p_producer_id
  ORDER BY o.created_at DESC;
$$;

-- Admin function: get all events with producer info
CREATE OR REPLACE FUNCTION public.admin_get_all_events()
RETURNS TABLE(
  event_id uuid,
  event_title text,
  event_date date,
  producer_id uuid,
  producer_name text,
  is_visible boolean,
  total_revenue numeric,
  total_tickets_sold bigint,
  total_orders bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id as event_id,
    e.title as event_title,
    e.date as event_date,
    e.created_by as producer_id,
    COALESCE(p.name, '—') as producer_name,
    e.is_visible,
    COALESCE(SUM(oi.subtotal), 0) as total_revenue,
    COALESCE(SUM(oi.quantity), 0)::bigint as total_tickets_sold,
    COUNT(DISTINCT o.id) as total_orders,
    e.created_at
  FROM events e
  LEFT JOIN profiles p ON p.user_id = e.created_by
  LEFT JOIN orders o ON o.event_id = e.id AND o.status = 'confirmed'
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE e.deleted_at IS NULL
  GROUP BY e.id, e.title, e.date, e.created_by, p.name, e.is_visible, e.created_at
  ORDER BY e.created_at DESC;
$$;
