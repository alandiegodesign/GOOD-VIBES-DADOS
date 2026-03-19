
-- Recreate the trigger for generating validation codes on new order_items
CREATE OR REPLACE TRIGGER trg_generate_validation_code
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_validation_code();

-- Backfill any existing order_items with empty or null validation_code
UPDATE public.order_items
SET validation_code = upper(substr(md5(random()::text || id::text), 1, 8))
WHERE validation_code IS NULL OR validation_code = '';
