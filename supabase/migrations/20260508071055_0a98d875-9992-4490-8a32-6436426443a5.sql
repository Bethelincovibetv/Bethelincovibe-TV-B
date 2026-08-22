
-- 1. Featured blog posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(is_featured) WHERE is_featured = true;

-- 2. Business Coach
CREATE TABLE public.coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New consultation',
  business_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage conversations" ON public.coach_conversations FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage messages" ON public.coach_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coach_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR has_role(auth.uid(),'admin'))));

CREATE TABLE public.coach_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.coach_conversations(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage coach tasks" ON public.coach_tasks FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- 3. Inventory
CREATE TABLE public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sku text,
  stock numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  low_stock_threshold numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage products" ON public.inventory_products FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE TABLE public.inventory_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage customers" ON public.inventory_customers FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE TABLE public.inventory_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.inventory_products(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.inventory_customers(id) ON DELETE SET NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  note text,
  sold_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage sales" ON public.inventory_sales FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE TABLE public.inventory_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  spent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage expenses" ON public.inventory_expenses FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- 4. Decrement stock on sale
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.inventory_products
      SET stock = GREATEST(stock - NEW.qty, 0), updated_at = now()
      WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_decrement_stock_on_sale
  AFTER INSERT ON public.inventory_sales
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();

-- Updated_at triggers
CREATE TRIGGER trg_coach_conv_updated BEFORE UPDATE ON public.coach_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_coach_tasks_updated BEFORE UPDATE ON public.coach_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inv_products_updated BEFORE UPDATE ON public.inventory_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
