# Tracker admin console

## Run locally

From the repository root:

```powershell
npm install --legacy-peer-deps
npm --prefix admin ci
npm exec -w backend -- prisma migrate deploy
npm run dev:api
```

In a second terminal, set `$env:ADMIN_API_ORIGIN = 'http://127.0.0.1:4000'` to use the local backend. Then run `npm run dev:admin` from the root or `bun run dev` from `admin`. Without that override, Vite proxies `/api` to Render. Open the URL printed by Vite and sign in with an existing ADMIN account.

`bun run build` from `admin` writes the Vite bundle to `admin/dist`. `bun run preview` serves the build locally. For deployment, serve the bundle over HTTPS with a same-origin reverse proxy at `/api` that strips the prefix. The admin app has its own package lock and uses Rollup’s WebAssembly build to avoid the Windows native DLL requirement.

## Deploy to Vercel

Set Root Directory to `admin`, Framework Preset to Vite, and Output Directory to `dist`. The included `vercel.json` forwards same-origin `/api` requests to Render and supports direct visits to React Router pages. No API URL environment variable is needed on Vercel.

## Accounts

The admin app uses browser routes such as `/dashboard`, `/users`, and `/settings`. Vite handles direct visits and refreshes locally. In production, serve `index.html` for unknown browser routes while keeping `/api` routed to the backend.

Create or edit an employee, assign their role and territory, enable or disable access, and reset their password. The list records the latest successful login. Password resets, disabling, and access changes revoke existing sessions. An admin cannot disable their own account or remove their own admin role.

New users start with the editable initial password `Demo@@1234`. Field Executives are limited to their assigned territory. Managers can access operational data across all territories. The admin console requires the Admin role. Deleting a user revokes sign-in and removes them from the active directory while preserving historical activity and audit references.

## Excel workbooks

Download the matching template or current dataset for Store Master, Asset Master, RD Master or RD Sales. Use the first sheet and preserve the headers. Keep identifiers and phone numbers formatted as text, especially long `SalesID` values. The upload accepts one .xlsx file with up to 1,000 rows and 3 MB. Validate it, check the reported rows and errors, and then apply. Records are upserted by outlet UID, asset code, RD code, or sales ID. Import RD Master before sales or stores that reference new RD codes. For Asset Master, an optional outlet UID assigns an unassigned asset. The import rejects reassignment to a different outlet.

Each RD can have multiple sales rows. Use the optional `SalesYear` column for historical uploads. It defaults to the current year in India for a new sales ID. The mobile chart totals rows for a calendar month, preferring CY entries over overlapping LY entries. Use separate sales IDs for additive records and reuse a sales ID to correct a row.

Store Master accepts the supplied outlet and equipment columns. Keep store identifiers formatted as text. If `OutletUID` is omitted, a unique matching outlet code keeps the existing ID. A new store takes its `OutletCodeRD` or `OutletCode` as its ID. Import the master first, then copy the resulting `OutletUID` into Store Sales and enter the current-period calendar `Year`. `CM_1` and `LY_M1` are January for that year and the previous year respectively. One row per outlet and year is allowed. Reimporting that row replaces its previous values. Empty amounts mean unreported. A numeric zero is preserved. The chart prefers overlapping CM values over LY values.

## Survey builder

New drafts start with the current default questions. Use the builder or upload the questions workbook. The question template uses these type values: `yesno`, `asset`, `single`, `multi`, `text`, `description`, and `number`. Separate choices with `|`. `ShowWhenYes` takes the ID of an earlier Yes/No question. Use `none`, `optional`, or `required` for Attachment and CaptureImage. Generic attachments accept PDF, PNG, or JPEG up to 650 KB each. Camera evidence is stored as JPEG. Total survey request size is limited to 6 MB, including encoded photos.

Campaign dates are inclusive in Asia/Kolkata. An empty region or store selection means unrestricted within the other selection. Store-specific campaigns win over region-only campaigns, followed by the most recent publication. Stores with no active campaign keep the default questionnaire. To revise a published campaign, duplicate it into a new draft, edit and publish the copy, then archive the superseded campaign. Previous responses keep their question labels and campaign ID.

Mobile checks for questionnaire and settings changes every 15 seconds while the relevant screens are active and connected. Runtime settings currently include display date format, survey GPS tolerance, and nearby store radius. These controls apply to supported app screens without a rebuild. The dashboard uses recorded data and shows empty states when source data is unavailable.
