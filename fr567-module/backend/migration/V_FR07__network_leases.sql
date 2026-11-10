-- FR-07: Network license server — pooled seat checkout with time-limited leases.
-- This table is self-contained; it references licenses, devices, and users
-- by their integer IDs but does not enforce FK constraints (the module is
-- designed to work regardless of your friends' table definitions).

CREATE TABLE IF NOT EXISTS network_leases (
    id           BIGSERIAL    PRIMARY KEY,
    license_id   BIGINT       NOT NULL,
    device_id    BIGINT       NOT NULL,
    user_id      BIGINT       NOT NULL,
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
