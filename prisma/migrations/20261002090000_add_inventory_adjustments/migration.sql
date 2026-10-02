CREATE TABLE "InventoryAdjustment" (
  "id" TEXT NOT NULL,
  "inventoryId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "previousAvailable" INTEGER NOT NULL,
  "newAvailable" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryAdjustment_inventoryId_createdAt_idx" ON "InventoryAdjustment"("inventoryId", "createdAt");
CREATE INDEX "InventoryAdjustment_actorUserId_createdAt_idx" ON "InventoryAdjustment"("actorUserId", "createdAt");

ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
