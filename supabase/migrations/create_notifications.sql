-- ============================================================
-- NOTIFICATIONS TABLE + RLS + AUTO-INSERT TRIGGERS
-- ============================================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow inserts from triggers (SECURITY DEFINER functions bypass RLS,
-- but we also allow admin inserts)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- 4. Helper function to insert a notification (SECURITY DEFINER so triggers can use it)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info'
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (_user_id, _title, _message, _type);
END;
$$;

-- 5. Ensure seller_id column exists on orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id);

-- 6. Trigger: new order → notify seller
CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL THEN
    PERFORM create_notification(
      NEW.seller_id,
      'New Order Received',
      'You have received a new order worth ₹' || NEW.total || '.',
      'order'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't let notification failure block the order
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_new_order ON public.orders;
CREATE TRIGGER trg_notify_seller_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_new_order();

-- 6. Trigger: order delivered → notify buyer
CREATE OR REPLACE FUNCTION public.notify_buyer_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    PERFORM create_notification(
      NEW.buyer_id,
      'Order Delivered',
      'Your order has been delivered!',
      'order'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_buyer_order_delivered ON public.orders;
CREATE TRIGGER trg_notify_buyer_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_buyer_order_delivered();

-- 7. Trigger: payment received → notify seller
CREATE OR REPLACE FUNCTION public.notify_seller_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'paid' THEN
    IF NEW.seller_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.seller_id,
        'Payment Received',
        'Payment of ₹' || NEW.total || ' has been received for your order.',
        'payment'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_seller_payment_received ON public.orders;
CREATE TRIGGER trg_notify_seller_payment_received
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_seller_payment_received();
