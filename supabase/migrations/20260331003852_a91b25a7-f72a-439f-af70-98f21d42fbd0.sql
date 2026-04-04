ALTER TABLE tickets DROP CONSTRAINT tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('valid', 'checked_in', 'cancelled', 'expired', 'pending_payment'));

ALTER TABLE tickets DROP CONSTRAINT tickets_payment_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_payment_status_check CHECK (payment_status IN ('free', 'pending', 'paid', 'refunded', 'rejected', 'expired'));