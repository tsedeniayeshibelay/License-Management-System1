ALTER TABLE license_assignments ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'Employee + Device';
