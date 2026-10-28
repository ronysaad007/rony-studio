# Rony Saad Studio

Bookings, deliveries and money for Rony Saad's freelance photography & film work.
A static web app (GitHub Pages) that reads and writes a private Google Sheet through a small Apps Script.

- **Today**: upcoming shoots with a countdown, inquiries, deliveries due or late (tick them off inline), other to-dos and the month calendar. No money here
- **Projects**: a list with one-tap status (Booked → Shot → Editing → Delivered), search and filters, or a pipeline board with a column per stage (drag cards, or tap the next step). Each project opens in tabs: Overview, Deliverables, Money, Invoices & quotes, Notes
- **Deliverables per shoot type**: each new booking gets the usual deliverables for its type, with due dates from the shoot date (edit the lists in Settings)
- **Clients**: built from your projects, with lifetime value, what they owe and WhatsApp
- **Money**: what's still to collect (balances, deposits, retainer fees, with WhatsApp reminders), revenue, spending and profit for the chosen period; sub-tabs for Charts, Invoices & quotes, Expenses and Team
- **Charts**: the whole business at a glance for the chosen period: money over time, collected vs owed, revenue by type, shoots over time, pipeline, inquiries won, busiest weekdays, how far ahead clients book, shoot types, sources, new vs returning clients, deliverables, and what's been posted
- **Deposits**: pick each client's deposit and its due date when you make a quotation; Money → To collect reminds you until it comes in, with a WhatsApp reminder that includes your bank details from Settings
- **Search** (🔍 or `/`): projects, clients, deliverables, invoices & quotes, expenses and retainers, by name, phone, code or number
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
