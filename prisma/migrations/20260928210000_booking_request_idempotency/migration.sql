ALTER TABLE "BookingRequest"
ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "BookingRequest_requesterUserId_clientRequestId_key"
ON "BookingRequest"("requesterUserId", "clientRequestId");
