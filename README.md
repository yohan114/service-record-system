# Edward & Christie — Fleet Service Record System

A web app for recording vehicle/machinery services day by day, keeping a full
searchable service history, managing editable oil & filter price lists, and
automatically calculating labour charge and sundry on every service sheet.

## Quick start

```bash
npm install      # install dependencies
npm run seed     # build the database from the data files (first run only)
npm start        # start the server -> http://localhost:3000
```

On Windows you can simply run **`start_app.ps1`**, which does all three steps and
opens the browser for you.

> Requires Node.js 18+. The database is a single SQLite file at `data/service.db`
> (created by `npm run seed`). It is not stored in git — re-run the seed to rebuild it.

## What's inside

| Section | What it does |
|---|---|
| **📊 Dashboard** | Fleet/service counts, services-this-month, recent activity, and a services-per-month table by year. |
| **🗓️ Daily Log** | Step through services day by day and add a new service for the selected date. |
| **📋 Service Records** | Global, searchable history (by vehicle, registration, job no, site, date range) so anyone can look up a record. |
| **🚛 Fleet & Filters** | Search the fleet; open a vehicle's full service history or start a new sheet. |
| **💧 Price Lists** | Editable **Oils**, **Filter Types**, and a 195-item **Filter Price Book**. Prices auto-fill on the service sheet. |
| **⚙️ Settings** | Change the labour %, threshold, sundry %, and company details. |

## Charge calculation

On each service sheet the totals are worked out from the **parts subtotal**
(oils + filters + any other cost lines):

```
Labour  = 20% of parts   when parts ≤ Rs 10,000
        = 15% of parts   when parts >  Rs 10,000
Sundry  = 5%  of parts
Total   = parts + labour + sundry
```

Examples: parts **8,000** → total **10,000**; parts **25,000** → total **30,000**.

All four numbers (20%, 15%, the Rs 10,000 threshold, and 5%) are editable in
**Settings**. Each saved job stores its own snapshot of the rates, so changing
them later never alters past records.

## Where the data comes from

`npm run seed` loads:

- **Vehicles, filters, links, genuine prices, motorcycles, filter price book** — from `vehicle_filter_data.js`.
- **Service history** — read straight from `Service record.xlsx` (the *Summery* sheet).

Re-running the seed is safe: the reference catalog is rebuilt, but your edited
price lists and any service jobs entered in the app are left untouched.

### Migrating records from the old Microsoft Access app (optional)

If you have records that only exist in the old `VehicleFilterDB.accdb`, run
`export_services.ps1` once on Windows. It writes `seed_data/services_export.json`,
which the seeder then imports **instead of** the Excel history (so there are no
duplicates).

## Notes

The legacy PowerShell scripts (`create_database.ps1`, `migrate_*.ps1`, `check_*.ps1`,
etc.) were used to build the original Access database and the `vehicle_filter_data.js`
export. They are kept for reference and are not needed to run the app.
