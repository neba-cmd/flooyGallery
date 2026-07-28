-- Storage keys identify immutable R2 objects and must never be shared by rows.
DROP INDEX "Photo_eventId_photoNumber_idx";
CREATE UNIQUE INDEX "Photo_previewKey_key" ON "Photo"("previewKey");
CREATE UNIQUE INDEX "Photo_originalKey_key" ON "Photo"("originalKey");
CREATE UNIQUE INDEX "Photo_eventId_photoNumber_key" ON "Photo"("eventId", "photoNumber");
