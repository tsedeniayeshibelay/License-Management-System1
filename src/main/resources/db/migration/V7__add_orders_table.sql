CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    company_id BIGINT,
    product_id BIGINT NOT NULL,
    license_id BIGINT,
    quantity INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_number VARCHAR(100) NOT NULL UNIQUE
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_company_id ON orders(company_id);
