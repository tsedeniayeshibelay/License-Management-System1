CREATE TABLE pending_qr_activations (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL UNIQUE,
    public_approval_token_hash VARCHAR(255) NOT NULL UNIQUE,
    app_polling_secret_hash VARCHAR(255) NOT NULL,
    product_id BIGINT NOT NULL,
    machine_id VARCHAR(255) NOT NULL,
    installation_id VARCHAR(255),
    device_name VARCHAR(255),
    os VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    license_id BIGINT,
    approved_at TIMESTAMP,
    activation_id BIGINT,
    created_at TIMESTAMP
);

CREATE TABLE offline_request_logs (
    id BIGSERIAL PRIMARY KEY,
    request_digest VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP
);
