ALTER TABLE "Visit" ADD COLUMN "note" TEXT;
CREATE TABLE "AssetReport" (
  "id" UUID PRIMARY KEY,
  "assignmentId" UUID NOT NULL REFERENCES "AssetAssignment"("id"),
  "employeeId" UUID NOT NULL REFERENCES "Employee"("id"),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "complaint" TEXT,
  "photo" BYTEA,
  CHECK (num_nonnulls("complaint","photo") = 1)
);
CREATE INDEX "AssetReport_assignment_time" ON "AssetReport" ("assignmentId","createdAt" DESC);
