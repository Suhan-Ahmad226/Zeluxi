ALTER TABLE "Payment" ADD COLUMN "refundReference" TEXT;
ALTER TABLE "Payment" ADD COLUMN "refundInitiatedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "refundCompletedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Payment_refundReference_key" ON "Payment"("refundReference");