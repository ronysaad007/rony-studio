# Rony Saad Studio

Bookings, deliveries and money for Rony Saad's freelance photography & film work.
A static web app (GitHub Pages) that reads and writes a private Google Sheet through a small Apps Script.

- **Today**: money to collect, deliveries due or late (tick them off inline), upcoming shoots with a countdown, loose ends, and the month calendar
- **Projects**: a list with one-tap status (Booked → Shot → Editing → Delivered), search and filters, or a pipeline board with a column per stage (drag cards, or tap the next step). Each project opens in tabs: Overview, Deliverables, Money, Invoices & quotes, Notes
- **Clients**: built from your projects, with lifetime value, what they owe and WhatsApp
- **Money**: booked, collected, expenses, profit, 12‑month chart, who still owes; sub-tabs for Invoices & quotes, Expenses and Team
- **More (…)**: Retainers and Settings
- Invoices (print / Save as PDF), WhatsApp message templates, CSV and JSON export

## Setup

1. Create a Google Sheet (e.g. "Rony Studio Data").
2. In the Sheet: **Extensions → Apps Script**. Replace the code with `apps-script/Code.gs`, save.
3. Choose `setup` in the function menu and press **Run**. Approve access. Open **Execution log**: it shows your passcode.
4. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*. Deploy and copy the URL ending in `/exec`.
5. Open the app, paste the URL and passcode.
6. Settings → **Import old data.json** to bring in the projects from the old dashboard.

The Sheet stays private. The web app only answers requests that carry the passcode.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `apps-script/Code.gs` | Google Sheet backend (paste into Apps Script) |
| `icon.svg` | App icon |
