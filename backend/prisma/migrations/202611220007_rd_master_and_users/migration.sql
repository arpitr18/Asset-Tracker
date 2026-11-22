ALTER TABLE "Employee" ADD COLUMN "deletedAt" timestamptz;
CREATE TABLE "RD_Master" (
  "RDCode" varchar(50) PRIMARY KEY REFERENCES "Distributor"("rdCode"),
  "RDName" varchar(255),
  "RDType" varchar(100),
  "RD_SST_SUBD" varchar(100),
  "Town" varchar(100),
  "StateName" varchar(100),
  "TownClassName" varchar(100),
  "SOTerritory" varchar(100),
  "ASMArea" varchar(100),
  "RegionName" varchar(100),
  "BranchName" varchar(100),
  "Address" varchar(500),
  "Phone" varchar(30),
  "ContactPerson" varchar(150),
  "CellNo" varchar(30),
  "Email_Id" varchar(255),
  "ASMName" varchar(150),
  "ASMContact" varchar(30),
  "SEName" varchar(150),
  "SEContact" varchar(30),
  "ActiveFrom" date, "PCCount" integer, "StoreCount" integer
);
CREATE TABLE "RD_Sales" (
  "SalesID" bigint PRIMARY KEY,
  "RDCode" varchar(50) NOT NULL REFERENCES "RD_Master"("RDCode"),
  "SalesYear" integer NOT NULL CHECK ("SalesYear" BETWEEN 1901 AND 9999),
  "LY_M1" numeric(18,2),
  "LY_M2" numeric(18,2),
  "LY_M3" numeric(18,2),
  "LY_M4" numeric(18,2),
  "LY_M5" numeric(18,2),
  "LY_M6" numeric(18,2),
  "LY_M7" numeric(18,2),
  "LY_M8" numeric(18,2),
  "LY_M9" numeric(18,2),
  "LY_M10" numeric(18,2),
  "LY_M11" numeric(18,2),
  "LY_M12" numeric(18,2),
  "CY_1" numeric(18,2),
  "CY_2" numeric(18,2),
  "CY_3" numeric(18,2),
  "CY_4" numeric(18,2),
  "CY_5" numeric(18,2),
  "CY_6" numeric(18,2),
  "CY_7" numeric(18,2),
  "CY_8" numeric(18,2),
  "CY_9" numeric(18,2),
  "CY_10" numeric(18,2),
  "CY_11" numeric(18,2),
  "CY_12" numeric(18,2),
  "YTDGrowth" numeric(18,2), "WSContri" numeric(10,2), "RetailContri" numeric(10,2)
);
CREATE INDEX "RD_Sales_code_year" ON "RD_Sales" ("RDCode","SalesYear");
INSERT INTO "RD_Master" ("RDCode","RDName","Town","StateName","RDType","BranchName","Phone","Address")
SELECT d."rdCode",d."rdName",d."rdTown",d.state,p.type,p.branch,p.phone,p.address
FROM "Distributor" d LEFT JOIN "RDProfile" p USING ("rdCode")
WHERE length(d."rdCode")<=50 AND length(coalesce(d."rdName",''))<=255
AND length(coalesce(d."rdTown",''))<=100 AND length(coalesce(d.state,''))<=100
AND length(coalesce(p.phone,''))<=30 AND length(coalesce(p.address,''))<=500
ON CONFLICT DO NOTHING;
