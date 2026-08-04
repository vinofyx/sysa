-- AlterTable: donation gets Razorpay-specific fields, payment_method becomes
-- optional (unset until a Razorpay checkout attempt actually completes), and
-- payment_gateway_ref becomes unique (prevents the same gateway payment being
-- attached to two donation rows).
ALTER TABLE "donation" ALTER COLUMN "payment_method" DROP NOT NULL;
ALTER TABLE "donation" ADD COLUMN     "razorpay_order_id" TEXT;
ALTER TABLE "donation" ADD COLUMN     "razorpay_signature" TEXT;
ALTER TABLE "donation" ADD COLUMN     "failure_reason" TEXT;
ALTER TABLE "donation" ADD COLUMN     "idempotency_key" TEXT;

CREATE UNIQUE INDEX "donation_payment_gateway_ref_key" ON "donation"("payment_gateway_ref");
CREATE UNIQUE INDEX "donation_razorpay_order_id_key" ON "donation"("razorpay_order_id");
CREATE UNIQUE INDEX "donation_idempotency_key_key" ON "donation"("idempotency_key");

-- AlterTable: audit_log.admin_user_id becomes nullable so system-initiated
-- events (Razorpay webhook processing) can be logged without an admin actor.
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_admin_user_id_fkey";
ALTER TABLE "audit_log" ALTER COLUMN "admin_user_id" DROP NOT NULL;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: idempotency ledger for the Razorpay webhook.
CREATE TABLE "payment_webhook_event" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_event_event_id_key" ON "payment_webhook_event"("event_id");

-- CreateTable: lightweight donor OTP login (donation history only).
CREATE TABLE "donor_otp" (
    "id" TEXT NOT NULL,
    "donor_email" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donor_otp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "donor_otp_donor_email_expires_at_idx" ON "donor_otp"("donor_email", "expires_at");
