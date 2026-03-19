INSERT INTO public.user_roles (user_id, role)
VALUES ('e6939533-cf31-48e4-9d2f-1035adfdf67c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;