-- Migration: 20260901120000_promotion_order_messages.sql
-- Purpose: Step 12 In-Order Contextual Collaboration, Creative Asset Exchange & Delivery SLA Monitoring

-- 1. Create promotion_order_messages table
CREATE TABLE IF NOT EXISTS public.promotion_order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.promotion_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('business', 'promoter', 'admin', 'system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'attachment', 'flyer', 'draft_preview', 'schedule_confirmation', 'system_event')),
  message_content TEXT NOT NULL CHECK (length(trim(message_content)) > 0 AND length(message_content) <= 5000),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_event BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for rapid chronological thread querying & user lookups
CREATE INDEX IF NOT EXISTS idx_order_messages_order_created ON public.promotion_order_messages(order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender ON public.promotion_order_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_type ON public.promotion_order_messages(message_type);

-- Enable RLS
ALTER TABLE public.promotion_order_messages ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies
-- SELECT: Order buyer, assigned promoter, or system admin
CREATE POLICY "Authorized participants and admins can read order messages"
  ON public.promotion_order_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.promotion_orders o
      LEFT JOIN public.promoter_profiles p ON p.id = o.promoter_id
      WHERE o.id = promotion_order_messages.order_id
        AND (
          o.business_user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );

-- INSERT: Authorized participants can send messages with verified sender identity
CREATE POLICY "Authorized participants can insert messages into their order"
  ON public.promotion_order_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.promotion_orders o
      LEFT JOIN public.promoter_profiles p ON p.id = o.promoter_id
      WHERE o.id = promotion_order_messages.order_id
        AND (
          o.business_user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  );

-- UPDATE: Immutability policy - only read state may be updated by authorized participants
CREATE POLICY "Authorized participants can mark messages as read"
  ON public.promotion_order_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.promotion_orders o
      LEFT JOIN public.promoter_profiles p ON p.id = o.promoter_id
      WHERE o.id = promotion_order_messages.order_id
        AND (
          o.business_user_id = auth.uid()
          OR p.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    -- Content and sender must never change
    sender_id = promotion_order_messages.sender_id
    AND order_id = promotion_order_messages.order_id
    AND message_content = promotion_order_messages.message_content
  );

-- DELETE: Strictly prohibited for regular users (only admins for compliance/emergency)
CREATE POLICY "Only admins can delete messages in emergency"
  ON public.promotion_order_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );
