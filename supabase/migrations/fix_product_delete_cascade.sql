-- Fix: Allow product deletion by changing the foreign key constraint
-- on order_items.product_id to SET NULL on delete instead of RESTRICT.
-- This preserves order history (the order_item row remains) but clears the product reference.

-- Drop the existing foreign key constraint
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- Make product_id nullable (if not already)
ALTER TABLE order_items
  ALTER COLUMN product_id DROP NOT NULL;

-- Re-add the constraint with ON DELETE SET NULL
ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id)
  ON DELETE SET NULL;
