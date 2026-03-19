
-- Attach the handle_new_user trigger to auth.users so profiles are created on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Attach the validation code trigger to order_items
DROP TRIGGER IF EXISTS trg_generate_validation_code ON public.order_items;
CREATE TRIGGER trg_generate_validation_code
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.generate_validation_code();
