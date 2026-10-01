-- Add secure hashed access token storage for anonymous order access
ALTER TABLE "Order" ADD COLUMN "guestAccessTokenHash" TEXT;
CREATE UNIQUE INDEX "Order_guestAccessTokenHash_key" ON "Order"("guestAccessTokenHash");
