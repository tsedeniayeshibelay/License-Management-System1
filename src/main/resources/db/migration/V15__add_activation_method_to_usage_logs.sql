-- Add activation_method to usage_logs
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS activation_method VARCHAR(50);

-- Migrate legacy activation methods stored in ip_address
UPDATE usage_logs SET activation_method = 'Offline', ip_address = NULL WHERE ip_address = 'Offline Upload';
UPDATE usage_logs SET activation_method = 'QR', ip_address = NULL WHERE ip_address = 'QR Approval';
UPDATE usage_logs SET activation_method = 'Offline' WHERE features_used LIKE '%Offline%' AND activation_method IS NULL;
UPDATE usage_logs SET activation_method = 'QR' WHERE features_used LIKE '%QR%' AND activation_method IS NULL;
UPDATE usage_logs SET activation_method = 'Online' WHERE activation_method IS NULL;
