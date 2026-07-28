-- A photo's public weekday is determined by its event date. This aligns all
-- existing photos and removes the need to choose a day again during upload.
UPDATE "Photo" AS photo
SET "dayOfWeek" = EXTRACT(ISODOW FROM event."date")::INTEGER
FROM "Event" AS event
WHERE photo."eventId" = event."id"
  AND event."date" IS NOT NULL;
