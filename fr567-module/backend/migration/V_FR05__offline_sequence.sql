-- FR-05: Add sequence number, receipt nonce, and receipt confirmation
-- to the offline_request_logs table. If the table doesn't exist yet,
-- create it with these columns included.

DO $$
BEGIN
    -- Check if offline_request_logs table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offline_request_logs') THEN
        ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS sequence_number BIGINT;
        ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS license_key VARCHAR(255);
        ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS receipt_nonce VARCHAR(255) UNIQUE;
        ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS receipt_confirmed BOOLEAN DEFAULT FALSE;
    ELSE
        CREATE TABLE offline_request_logs (
            id               BIGSERIAL    PRIMARY KEY,
            request_digest   VARCHAR(255) NOT NULL UNIQUE,
            sequence_number  BIGINT,
            license_key       VARCHAR(255),
            receipt_nonce     VARCHAR(255) UNIQUE,
            receipt_confirmed BOOLEAN      DEFAULT FALSE,
            created_at        TIMESTAMP(6)
        );
    END IF;
END $$;
