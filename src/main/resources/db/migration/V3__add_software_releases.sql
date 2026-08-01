CREATE TABLE IF NOT EXISTS software_releases (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    version VARCHAR(255) NOT NULL,
    release_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    download_url VARCHAR(1024) NOT NULL,
    release_notes TEXT,
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_software_releases_product
        FOREIGN KEY(product_id) 
        REFERENCES products(id)
        ON DELETE CASCADE
);
