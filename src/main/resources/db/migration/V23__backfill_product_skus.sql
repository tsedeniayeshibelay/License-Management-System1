-- Backfill any products with null or blank product_id_sku using stable immutable database id
UPDATE products
SET product_id_sku = CONCAT('LS-PRODUCT-', id)
WHERE product_id_sku IS NULL OR TRIM(product_id_sku) = '';
