-- FR-04: Feature-based and usage-counted licensing columns on licenses
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS feature_flags VARCHAR(500);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS usage_limit INTEGER;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- FR-02: Fingerprint tolerance on licenses
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS fingerprint_tolerance INTEGER DEFAULT 1;

-- FR-02: Multi-hardware fingerprint attributes on devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS mac_address VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS cpu_id VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS motherboard_id VARCHAR(255);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS install_id VARCHAR(255) UNIQUE;

-- FR-11: Clone and VM detection flags on devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_vm BOOLEAN DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS clone_detected BOOLEAN DEFAULT FALSE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS clone_of_device_id BIGINT;

-- FR-05: Sequence number and receipt confirmation on offline_request_logs
ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS sequence_number BIGINT;
ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS license_key VARCHAR(255);
ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS receipt_nonce VARCHAR(255) UNIQUE;
ALTER TABLE offline_request_logs ADD COLUMN IF NOT EXISTS receipt_confirmed BOOLEAN DEFAULT FALSE;

-- FR-09: Hash-chain and signing columns on activity_logs
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entry_hash VARCHAR(64);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS entry_signature TEXT;
