ALTER TABLE "Employee" ADD COLUMN enabled boolean NOT NULL DEFAULT true, ADD COLUMN "lastLogin" timestamptz, ADD COLUMN "sessionVersion" integer NOT NULL DEFAULT 0;
CREATE TABLE "TrackerSetting" (id integer PRIMARY KEY CHECK(id=1), value jsonb NOT NULL);
INSERT INTO "TrackerSetting" VALUES (1,'{"dateFormat":"DD MMM YYYY","surveyRadiusMeters":100,"nearbyRadiusKm":5}');
CREATE TABLE "SurveyCampaign" (
  id uuid PRIMARY KEY, title text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  "startDate" date, "endDate" date, regions text[] NOT NULL, stores text[] NOT NULL,
  questions jsonb NOT NULL, "publishedAt" timestamptz,
  "updatedAt" timestamptz NOT NULL DEFAULT now(), CHECK("endDate" IS NULL OR "startDate" IS NULL OR "endDate">="startDate")
);
CREATE INDEX "SurveyCampaign_active" ON "SurveyCampaign"("publishedAt" DESC) WHERE status='published';
ALTER TABLE "FieldSurvey" ADD COLUMN "campaignId" uuid REFERENCES "SurveyCampaign"(id);
CREATE TABLE "FieldEvidence" (
  "surveyId" uuid REFERENCES "FieldSurvey"(id), "questionId" text, kind text, "fileName" text,
  mime text NOT NULL, content bytea NOT NULL, PRIMARY KEY("surveyId","questionId",kind)
);
CREATE TABLE "AdminImport" (
  id uuid PRIMARY KEY, kind text NOT NULL, filename text NOT NULL, "rowCount" integer NOT NULL,
  "employeeId" uuid REFERENCES "Employee"(id), "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "AuditLog_recent" ON "AuditLog"("createdAt" DESC);
