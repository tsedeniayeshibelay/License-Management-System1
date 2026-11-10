-- FR-07: Network license server — pooled seat checkout with time-limited leases
CREATE TABLE IF NOT EXISTS network_leases (
    id           BIGSERIAL    PRIMARY KEY,
    license_id   BIGINT       NOT NULL REFERENCES licenses(id),
    device_id    BIGINT       NOT NULL REFERENCES devices(id),
    user_id      BIGINT       NOT NULL REFERENCES users(id),
    lease_token  VARCHAR(64)  NOT NULL UNIQUE,
    machine_id   VARCHAR(255),
    issued_at    TIMESTAMP(6) NOT NULL,
    expires_at   TIMESTAMP(6) NOT NULL,
    returned     BOOLEAN      DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_network_leases_license_active
    ON network_leases (license_id, returned, expires_at);

CREATE INDEX IF NOT EXISTS idx_network_leases_token
    ON network_leases (lease_token);
