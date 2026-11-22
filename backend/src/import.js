import "dotenv/config";
import fs from "node:fs";
import xlsx from "xlsx";

const path = process.argv[2] || "../data/Outlet_Visicooler_Asset_Dataset.xlsx";
const apply = process.argv.includes("--apply");
const wb = xlsx.readFile(path, { cellDates: false });
const sheet = wb.Sheets["All Records"] || wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
const clean = (v) =>
  v == null || String(v).trim() === "" ? null : String(v).trim();
const date = (v) => {
  if (!v || v === "1/1/1900") return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return d.getUTCDate() === +m[1] ? d : null;
};
const coordinate = (v, min, max) => {
  const n = Number(v);
  return v != null && Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const errors = [],
  seenOutlet = new Set(),
  seenAsset = new Set();
for (const [i, row] of rows.entries()) {
  for (const key of [
    "OutletUID",
    "OutletName",
    "AssetCode",
    "RDCode",
    "BranchName",
    "RegionName",
    "ASMArea",
    "Soterritory",
  ])
    if (!clean(row[key]))
      errors.push({ row: i + 2, field: key, error: "Required" });
  if (!["Original", "Synthetic"].includes(row.RecordType))
    errors.push({
      row: i + 2,
      field: "RecordType",
      error: "Unknown provenance",
    });
  if (seenOutlet.has(row.OutletUID))
    errors.push({ row: i + 2, field: "OutletUID", error: "Duplicate in file" });
  if (seenAsset.has(row.AssetCode))
    errors.push({ row: i + 2, field: "AssetCode", error: "Duplicate in file" });
  seenOutlet.add(row.OutletUID);
  seenAsset.add(row.AssetCode);
  if (clean(row.Latitude) && coordinate(row.Latitude, -90, 90) == null)
    errors.push({ row: i + 2, field: "Latitude", error: "Invalid coordinate" });
  if (clean(row.Longitude) && coordinate(row.Longitude, -180, 180) == null)
    errors.push({
      row: i + 2,
      field: "Longitude",
      error: "Invalid coordinate",
    });
}
const report = {
  rows: rows.length,
  original: rows.filter((r) => r.RecordType === "Original").length,
  synthetic: rows.filter((r) => r.RecordType === "Synthetic").length,
  errors,
};
fs.writeFileSync("import-preview.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      rows: report.rows,
      original: report.original,
      synthetic: report.synthetic,
      errors: errors.length,
      apply,
    },
    null,
    2,
  ),
);
if (errors.length || !apply) process.exit(errors.length ? 1 : 0);
const { db } = await import("./db.js");
for (const r of rows) {
  const territory = await db.territory.upsert({
    where: {
      branchName_regionName_asmArea_soTerritory: {
        branchName: r.BranchName,
        regionName: r.RegionName,
        asmArea: r.ASMArea,
        soTerritory: r.Soterritory,
      },
    },
    create: {
      branchName: r.BranchName,
      regionName: r.RegionName,
      asmArea: r.ASMArea,
      soTerritory: r.Soterritory,
    },
    update: {},
  });
  await db.distributor.upsert({
    where: { rdCode: r.RDCode },
    create: {
      rdCode: r.RDCode,
      rdName: r.RDName,
      rdTown: clean(r.RDTown),
      state: clean(r.State),
    },
    update: { rdName: r.RDName, rdTown: clean(r.RDTown) },
  });
  await db.outlet.upsert({
    where: { outletUid: r.OutletUID },
    create: {
      outletUid: r.OutletUID,
      outletCodeRd: clean(r.OutletCodeRD),
      outletName: r.OutletName,
      territoryId: territory.id,
      rdCode: r.RDCode,
      state: clean(r.State),
      beatName: clean(r.BeatName),
      latitude: coordinate(r.Latitude, -90, 90),
      longitude: coordinate(r.Longitude, -180, 180),
      locationVerified:
        r.IsLocation === "Y" ? true : r.IsLocation === "N" ? false : null,
      recordType: r.RecordType,
      sourceFields: r,
    },
    update: {
      outletName: r.OutletName,
      territoryId: territory.id,
      rdCode: r.RDCode,
      sourceFields: r,
    },
  });
  await db.coolerAsset.upsert({
    where: { assetCode: r.AssetCode },
    create: {
      assetCode: r.AssetCode,
      model: clean(r.Visicooler),
      make: clean(r.VisiMake),
      qrCode: clean(r.QRcode),
      modelVerified: clean(r["Visi Model Verified"]),
      visiDate: date(r.Visidate),
      pmDate: date(r.PMdate),
      firStatus: clean(r.FIRStatus),
      firDate: date(r["FIR Date"]),
      firRemark: clean(r.FIRRemark),
      finalSummary: clean(r.FinalSummary),
      masterFinalSummary: clean(r["Master Final Summary"]),
      recordType: r.RecordType,
      sourceFields: r,
    },
    update: { sourceFields: r },
  });
  const assigned = await db.assetAssignment.findFirst({
    where: { assetCode: r.AssetCode, outletUid: r.OutletUID, endedAt: null },
  });
  if (!assigned)
    await db.assetAssignment.create({
      data: {
        assetCode: r.AssetCode,
        outletUid: r.OutletUID,
        visiNo: clean(r.VisiNo),
      },
    });
}
await db.$disconnect();
