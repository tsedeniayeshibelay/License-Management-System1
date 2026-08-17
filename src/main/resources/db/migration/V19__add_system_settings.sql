CREATE TABLE system_settings (
    id BIGSERIAL PRIMARY KEY,
    platform_name VARCHAR(255) NOT NULL DEFAULT 'LockStrata Enterprise',
    support_email VARCHAR(255) NOT NULL DEFAULT 'support@lockstrata.com',
    admin_portal_url VARCHAR(255) NOT NULL DEFAULT 'https://admin.lockstrata.com',
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    debug_logging BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (platform_name, support_email, admin_portal_url, maintenance_mode, debug_logging, updated_at)
VALUES ('LockStrata Enterprise', 'support@lockstrata.com', 'https://admin.lockstrata.com', FALSE, FALSE, CURRENT_TIMESTAMP);
