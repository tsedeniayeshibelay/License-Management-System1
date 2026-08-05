CREATE TABLE activity_logs (
    id BIGSERIAL NOT NULL,
    company_id BIGINT,
    action VARCHAR(255),
    description TEXT,
    user_id BIGINT,
    license_id BIGINT,
    created_at TIMESTAMP(6),
    PRIMARY KEY (id)
);

CREATE TABLE license_assignments (
    id BIGSERIAL NOT NULL,
    license_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    device_id BIGINT,
    assigned_at TIMESTAMP(6),
    revoked_at TIMESTAMP(6),
    status VARCHAR(255),
    PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS license_assignments 
    ADD CONSTRAINT fk_license_assignments_license 
    FOREIGN KEY (license_id) 
    REFERENCES licenses;

ALTER TABLE IF EXISTS license_assignments 
    ADD CONSTRAINT fk_license_assignments_user 
    FOREIGN KEY (user_id) 
    REFERENCES users;

ALTER TABLE IF EXISTS license_assignments 
    ADD CONSTRAINT fk_license_assignments_device 
    FOREIGN KEY (device_id) 
    REFERENCES devices;
