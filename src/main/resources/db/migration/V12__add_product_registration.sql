-- Add new columns to products
ALTER TABLE products
ADD COLUMN product_id_sku VARCHAR(100),
ADD COLUMN category VARCHAR(100),
ADD COLUMN publisher VARCHAR(255),
ADD COLUMN supported_os VARCHAR(255),
ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT',
ADD COLUMN customer_price DECIMAL(10, 2),
ADD COLUMN bulk_buyer_price DECIMAL(10, 2),
ADD COLUMN min_bulk_quantity INT DEFAULT 1,
ADD COLUMN available_to_customers BOOLEAN DEFAULT true,
ADD COLUMN available_to_bulk_buyers BOOLEAN DEFAULT false;

-- Add new columns to software_releases
ALTER TABLE software_releases
ADD COLUMN file_size BIGINT,
ADD COLUMN sha256_hash VARCHAR(255),
ADD COLUMN distribution_method VARCHAR(50) DEFAULT 'EXTERNAL',
ADD COLUMN status VARCHAR(50) DEFAULT 'DRAFT',
ADD COLUMN original_filename VARCHAR(255),
ADD COLUMN mime_type VARCHAR(100),
ADD COLUMN internal_storage_path VARCHAR(500);

-- Make download_url nullable, since LockStrata hosted files won't have an external URL until accessed
ALTER TABLE software_releases ALTER COLUMN download_url DROP NOT NULL;

-- Create product_license_configs table
CREATE TABLE product_license_configs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    license_type VARCHAR(50) NOT NULL,
    max_devices INT,
    max_users INT,
    duration_days INT,
    billing_period VARCHAR(50),
    grace_period_days INT,
    activation_limit INT,
    volume_min_quantity INT,
    volume_max_quantity INT,
    volume_discount DECIMAL(5, 2),
    device_unbinding_policy VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plc_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
