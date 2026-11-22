-- Restore required application defaults after a database reset.
-- Keep any settings already saved by an administrator.
INSERT INTO "TrackerSetting" ("id", "value")
VALUES (
  1,
  '{"dateFormat":"DD MMM YYYY","surveyRadiusMeters":100,"nearbyRadiusKm":5}'::jsonb
)
ON CONFLICT ("id") DO NOTHING;
