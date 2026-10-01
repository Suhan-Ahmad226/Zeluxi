-- Non-destructive support and product Q&A tables
CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");
CREATE INDEX "SupportTicket_userId_updatedAt_idx" ON "SupportTicket"("userId","updatedAt");
CREATE INDEX "SupportTicket_status_updatedAt_idx" ON "SupportTicket"("status","updatedAt");
CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "body" TEXT NOT NULL,
  "isStaff" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId","createdAt");
CREATE TABLE "ProductQuestion" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductQuestion_productId_createdAt_idx" ON "ProductQuestion"("productId","createdAt");
CREATE TABLE "ProductAnswer" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductAnswer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductAnswer_questionId_createdAt_idx" ON "ProductAnswer"("questionId","createdAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAnswer" ADD CONSTRAINT "ProductAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ProductQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAnswer" ADD CONSTRAINT "ProductAnswer_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;