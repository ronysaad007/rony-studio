# Rony Saad Studio

Bookings, deliveries and money for Rony Saad's freelance photography & film work.
A static web app (GitHub Pages) that reads and writes a private Google Sheet through a small Apps Script.

- **Home**: next shoot with countdown, what needs attention, coming up, open deliverables
- **Projects**: one-tap status (Booked → Shot → Editing → Delivered), search and filters
- **Calendar**: shoots and delivery due dates by month
- **Money**: booked, collected, expenses, profit, 12‑month chart, who still owes
- **Clients**: built from your projects, with lifetime value and WhatsApp
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
