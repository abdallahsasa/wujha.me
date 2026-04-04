ALTER TABLE tickets DROP CONSTRAINT tickets_qr_code_key;
CREATE UNIQUE INDEX tickets_qr_code_key_partial ON tickets(qr_code) WHERE qr_code IS NOT NULL AND qr_code != '';
ALTER TABLE tickets ALTER COLUMN qr_code DROP NOT NULL;
ALTER TABLE tickets ALTER COLUMN qr_code SET DEFAULT NULL;