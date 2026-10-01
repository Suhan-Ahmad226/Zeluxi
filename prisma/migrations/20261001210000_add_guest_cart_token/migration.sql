-- Add secure hashed token storage for anonymous carts
ALTER TABLE "Cart" ADD COLUMN "guestTokenHash" TEXT;
CREATE UNIQUE INDEX "Cart_guestTokenHash_key" ON "Cart"("guestTokenHash");
