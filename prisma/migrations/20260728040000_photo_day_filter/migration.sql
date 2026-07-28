ALTER TABLE "Photo" ADD COLUMN "dayOfWeek" INTEGER;

-- Existing uploads did not store a selected day. Use the capture timestamp
-- where available, otherwise the upload timestamp, so every current photo is
-- immediately available through the new filter.
UPDATE "Photo"
SET "dayOfWeek" = EXTRACT(ISODOW FROM COALESCE("takenAt", "createdAt"))::INTEGER
WHERE "dayOfWeek" IS NULL;

ALTER TABLE "Photo"
ADD CONSTRAINT "Photo_dayOfWeek_check"
CHECK ("dayOfWeek" IS NULL OR "dayOfWeek" BETWEEN 1 AND 7);

CREATE INDEX "Photo_dayOfWeek_idx" ON "Photo"("dayOfWeek");
