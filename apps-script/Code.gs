/**
 * Rony Saad Studio — Google Sheets backend.
 *
 * Setup (once):
 *   1. Open your Google Sheet → Extensions → Apps Script, paste this file, Save.
 *   2. Run `setup` once (Run ▸ setup) and approve access. It creates the tabs and
 *      prints your passcode in the execution log (View ▸ Logs).
 *   3. Deploy ▸ New deployment ▸ Web app — Execute as: Me, Who has access: Anyone.
 *      Copy the Web app URL and paste it, with the passcode, into the Studio app.
 *
 * Google Calendar: run `connectCalendar` once (Run ▸ connectCalendar) and approve access. It creates a
 * calendar called "Freelance" and keeps every dated booking in it as the app saves projects.
 *
 * To change the passcode: Project Settings ▸ Script properties ▸ APP_KEY.
 * After editing this file: Deploy ▸ Manage deployments ▸ Edit ▸ Version: New version.
 */

const TABLES = {
  projects: ['id', 'code', 'client', 'phone', 'email', 'instagram', 'title', 'type', 'date', 'time',
             'location', 'price', 'paid', 'expenses', 'status', 'marketing', 'posted', 'source',
             'drive', 'notes', 'created', 'updated', 'calEvent', 'discount'],
  items: ['id', 'projectId', 'title', 'status', 'due', 'notes', 'type', 'qty'],
  crew: ['id', 'projectId', 'name', 'role', 'fee', 'paidOn', 'notes'],
  retainers: ['id', 'client', 'brand', 'phone', 'instagram', 'platforms', 'fee', 'adBudget', 'start', 'renewal',
              'nextReport', 'posts', 'reels', 'stories', 'status', 'paidMonths', 'services', 'notes', 'created', 'updated'],
  expenses: ['id', 'date', 'category', 'amount', 'projectId', 'note', 'created'],
  docs: ['id', 'projectId', 'kind', 'no', 'date', 'client', 'total', 'data', 'created'],
  settings: ['id', 'value'],
};
const SHEET_NAMES = { projects: 'Projects', items: 'Deliverables', crew: 'Team', retainers: 'Retainers', expenses: 'Expenses', docs: 'Documents', settings: 'Settings' };
// Columns stored as plain text so Sheets never turns them into numbers or dates.
const TEXT_COLS = ['id', 'projectId', 'code', 'no', 'data', 'phone', 'date', 'time', 'due', 'created', 'updated', 'value',
                   'paidOn', 'start', 'renewal', 'nextReport', 'paidMonths', 'discount'];
const MAX_FAILS = 5, LOCK_SECONDS = 15 * 60;
const CAL_NAME = 'Freelance', CAL_TZ = 'Asia/Dubai', SHOOT_HOURS = 3;

function setup() {
  Object.keys(TABLES).forEach(t => sheet_(t));
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('APP_KEY')) {
    props.setProperty('APP_KEY', String(Math.floor(100000 + Math.random() * 900000)));
  }
  Logger.log('Your Studio passcode: ' + props.getProperty('APP_KEY'));
}

function doGet() {
  return out_({ ok: true, app: 'Rony Saad Studio', message: 'Backend is running.' });
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Bad request' }); }
  const key = PropertiesService.getScriptProperties().getProperty('APP_KEY');
  // Lock everyone out for 15 minutes after 5 wrong passcodes, so it can't be guessed.
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) return out_({ ok: false, error: 'Too many wrong tries. Try again in 15 minutes.' });
  if (!key || String(req.key) !== key) {
    cache.put('fails', String(fails + 1), LOCK_SECONDS);
    return out_({ ok: false, error: 'Wrong passcode' });
  }
  if (fails) cache.remove('fails');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'all':
        return out_({ ok: true, projects: read_('projects'), items: read_('items'), crew: read_('crew'),
                      retainers: read_('retainers'), expenses: read_('expenses'), docs: read_('docs'), settings: read_('settings') });
      case 'upsert':
        upsert_(req.table, req.rows || []);
        if (req.table === 'projects') calendarSafe_(() => syncCalendar_((req.rows || []).map(r => String(r.id))));
        return out_({ ok: true });
      case 'delete':
        if (req.table === 'projects') calendarSafe_(() => unschedule_(req.ids || []));
        remove_(req.table, req.ids || []);
        return out_({ ok: true });
      case 'replaceAll':
        Object.keys(TABLES).forEach(t => {
          const sh = sheet_(t);
          if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
          upsert_(t, (req.data && req.data[t]) || []);
        });
        return out_({ ok: true });
      default:
        return out_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(table) {
  if (!TABLES[table]) throw new Error('Unknown table ' + table);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAMES[table]);
  if (!sh) sh = ss.insertSheet(SHEET_NAMES[table]);
  const width = Math.max(sh.getLastColumn(), 1);
  const header = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  const missing = TABLES[table].filter(c => header.indexOf(c) === -1);
  if (missing.length) {
    const start = header.filter(String).length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
    sh.getRange(1, 1, 1, start + missing.length - 1).setFontWeight('bold');
    sh.setFrozenRows(1);
    headers_(sh).forEach((c, i) => {
      if (TEXT_COLS.indexOf(c) !== -1) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  }
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function cell_(v, col) {
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone();
    return Utilities.formatDate(v, tz, col === 'time' ? 'HH:mm' : 'yyyy-MM-dd');
  }
  return v;
}

function read_(table) {
  const sh = sheet_(table);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const cols = headers_(sh);
  return sh.getRange(2, 1, last - 1, cols.length).getValues()
    .filter(r => String(r[cols.indexOf('id')]).trim() !== '')
    .map(r => { const o = {}; cols.forEach((c, i) => { if (c) o[c] = cell_(r[i], c); }); return o; });
}

function upsert_(table, rows) {
  if (!rows.length) return;
  const sh = sheet_(table);
  const cols = headers_(sh);
  const idCol = cols.indexOf('id');
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, idCol + 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const appends = [];
  rows.forEach(row => {
    const at = ids.indexOf(String(row.id));
    if (at === -1) {
      appends.push(cols.map(c => (c in row ? row[c] : '')));
      return;
    }
    const range = sh.getRange(at + 2, 1, 1, cols.length);
    const current = range.getValues()[0];
    range.setValues([cols.map((c, i) => (c in row ? row[c] : current[i]))]);
  });
  if (!appends.length) return;
  const room = sh.getMaxRows() - sh.getLastRow();
  if (room < appends.length) sh.insertRowsAfter(sh.getMaxRows(), appends.length - room + 100);
  sh.getRange(sh.getLastRow() + 1, 1, appends.length, cols.length).setValues(appends);
}

function remove_(table, ids) {
  const sh = sheet_(table);
  const cols = headers_(sh);
  const idCol = cols.indexOf('id');
  const last = sh.getLastRow();
  if (last < 2) return;
  const values = sh.getRange(2, idCol + 1, last - 1, 1).getValues();
  const want = ids.map(String);
  for (let i = values.length - 1; i >= 0; i--) {
    if (want.indexOf(String(values[i][0])) !== -1) sh.deleteRow(i + 2);
  }
}

// ───────────────────────────── Google Calendar ─────────────────────────────

// Run once from the editor: approves Calendar access and puts every dated booking in the Freelance calendar.
function connectCalendar() {
  const sh = sheet_('projects'), last = sh.getLastRow();
  calendar_();
  if (last < 2) return;
  const ids = sh.getRange(2, headers_(sh).indexOf('id') + 1, last - 1, 1).getValues().map(r => String(r[0])).filter(String);
  syncCalendar_(ids);
  Logger.log('The "' + CAL_NAME + '" calendar is ready. Checked ' + ids.length + ' projects.');
}

// A calendar problem must never stop the app from saving.
function calendarSafe_(fn) {
  try { fn(); } catch (err) { console.warn('Calendar sync skipped: ' + (err && err.message || err)); }
}

function calendar_() {
  const found = CalendarApp.getOwnedCalendarsByName(CAL_NAME);
  if (found.length) return found[0];
  return CalendarApp.createCalendar(CAL_NAME, { timeZone: CAL_TZ, color: CalendarApp.Color.ORANGE, summary: 'Freelance shoots from the Rony Saad Studio app' });
}

// Create, move or remove the calendar event for each project id, and remember its event id in the sheet.
function syncCalendar_(ids) {
  const sh = sheet_('projects'), cols = headers_(sh), last = sh.getLastRow();
  if (last < 2 || !ids.length) return;
  const evCol = cols.indexOf('calEvent');
  const rows = sh.getRange(2, 1, last - 1, cols.length).getValues();
  let cal = null;
  rows.forEach((r, i) => {
    const p = {};
    cols.forEach((c, j) => { p[c] = cell_(r[j], c); });
    if (ids.indexOf(String(p.id)) === -1) return;
    cal = cal || calendar_();
    const known = String(p.calEvent || '');
    let ev = known ? cal.getEventById(known) : null;
    if (!p.date || p.status === 'Cancelled') {
      if (ev) ev.deleteEvent();
      if (known) sh.getRange(i + 2, evCol + 1).setValue('');
      return;
    }
    const title = (p.status === 'Inquiry' ? '(Inquiry) ' : p.status === 'Quoted' ? '(Quote) ' : '') + (p.title || p.client) +
      (p.client && String(p.title).indexOf(p.client) === -1 ? ' · ' + p.client : '');
    const timed = /^\d{1,2}:\d{2}/.test(String(p.time || ''));
    const start = timed ? Utilities.parseDate(p.date + ' ' + String(p.time).slice(0, 5), CAL_TZ, 'yyyy-MM-dd HH:mm') : null;
    const day = Utilities.parseDate(String(p.date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (!ev) ev = timed ? cal.createEvent(title, start, new Date(start.getTime() + SHOOT_HOURS * 36e5)) : cal.createAllDayEvent(title, day);
    else if (timed) ev.setTime(start, new Date(start.getTime() + SHOOT_HOURS * 36e5));
    else ev.setAllDayDate(day);
    ev.setTitle(title);
    ev.setLocation(String(p.location || ''));
    ev.setDescription(description_(p));
    if (ev.getId() !== known) sh.getRange(i + 2, evCol + 1).setValue(ev.getId());
  });
}

function description_(p) {
  const n = v => Number(v) || 0;
  // A discount is "10%" or an amount; the event shows what the client actually pays.
  const d = String(p.discount || '').trim(), off = Math.min(n(p.price), Math.round(/%$/.test(d) ? n(p.price) * n(d.slice(0, -1)) / 100 : n(d)));
  const price = n(p.price) - off;
  const phone = String(p.phone || '').replace(/\D/g, '').replace(/^00/, '').replace(/^05(\d{8})$/, '9715$1');
  return [
    'Client: ' + (p.client || ''),
    p.phone ? 'Phone: ' + p.phone + (phone ? '  ·  WhatsApp: https://wa.me/' + phone : '') : '',
    [p.type, p.status].filter(String).join(' · '),
    String(p.marketing).toUpperCase() === 'TRUE' ? 'Free shoot for my page' :
      (price ? 'Price ' + price + (off ? ' (after ' + d + ' discount)' : '') + (n(p.paid) ? ' · received ' + n(p.paid) : '') + (price > n(p.paid) ? ' · due ' + (price - n(p.paid)) : '') : ''),
    p.notes ? '\n' + p.notes : '',
    '\n' + (p.code || '') + ' · managed by the Studio app. Change it there and this event follows.',
  ].filter(String).join('\n');
}

function unschedule_(ids) {
  const sh = sheet_('projects'), cols = headers_(sh), last = sh.getLastRow();
  if (last < 2) return;
  const rows = sh.getRange(2, 1, last - 1, cols.length).getValues();
  const idCol = cols.indexOf('id'), evCol = cols.indexOf('calEvent');
  let cal = null;
  rows.forEach(r => {
    if (ids.indexOf(String(r[idCol])) === -1 || !r[evCol]) return;
    cal = cal || calendar_();
    const ev = cal.getEventById(String(r[evCol]));
    if (ev) ev.deleteEvent();
  });
}
