-- Postgres trigger: auto-sync orders.delivery_status when delivery_batches.status changes
-- This ensures all orders in a batch always reflect the batch's current status.

CREATE OR REPLACE FUNCTION sync_batch_order_status()
RETURNS trigger AS $$
BEGIN
  -- Update delivery_status on all orders belonging to this batch
  UPDATE orders
  SET delivery_status = NEW.status
  WHERE batch_id = NEW.id;

  -- Also mark orders.status = 'delivered' when the batch is delivered
  IF NEW.status = 'delivered' THEN
    UPDATE orders
    SET status = 'delivered'
    WHERE batch_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire after any status change on delivery_batches
CREATE TRIGGER batch_status_update
AFTER UPDATE ON delivery_batches
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_batch_order_status();
