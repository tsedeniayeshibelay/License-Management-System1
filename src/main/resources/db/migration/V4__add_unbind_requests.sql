CREATE TABLE IF NOT EXISTS unbind_requests (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    license_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    CONSTRAINT fk_unbind_device FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_unbind_license FOREIGN KEY(license_id) REFERENCES licenses(id) ON DELETE CASCADE,
    CONSTRAINT fk_unbind_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
