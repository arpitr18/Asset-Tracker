CREATE TABLE "StoreSalesReport" (
  "outletUid" text NOT NULL REFERENCES "Outlet"("outletUid"),
  year integer NOT NULL CHECK (year BETWEEN 1901 AND 9999),
  ly numeric(18,2)[] NOT NULL CHECK(cardinality(ly)=12),
  cm numeric(18,2)[] NOT NULL CHECK(cardinality(cm)=12),
  growth numeric(18,2),
  PRIMARY KEY ("outletUid",year)
);
CREATE INDEX "Outlet_code_rd_lookup" ON "Outlet" ("outletCodeRd");
CREATE INDEX "Outlet_source_code_lookup" ON "Outlet" (("sourceFields"->>'OutletCode'));
