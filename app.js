/* Rony Saad Studio — bookings, deliveries and money, backed by a Google Sheet (see apps-script/Code.gs). */
'use strict';

// ───────────────────────────── helpers ─────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
const bool = v => v === true || String(v).toUpperCase() === 'TRUE';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const parseDay = s => (s ? new Date(s + 'T00:00:00') : null);
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDate = s => { const d = parseDay(s); return d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}` : 'No date'; };
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m || 0)} ${h < 12 ? 'AM' : 'PM'}`; };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="2" fill="currentColor"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ───────────────────────────── state ─────────────────────────────
const CFG_KEY = 'rs.cfg', CACHE_KEY = 'rs.cache', QUEUE_KEY = 'rs.queue';
// Rony's Google Sheet web app. New devices only need the passcode; the Sheet itself stays private.
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbze7PdIwVZj2jXXsNYgNBiAzTG5eJHSNkXAcVRaHPdACSz3jtehz6k-7O-IY_pQc5iI/exec';
let cfg = store.get(CFG_KEY, null);
let db = store.get(CACHE_KEY, { projects: [], items: [], settings: [] });
let queue = store.get(QUEUE_KEY, []);
let lastSync = store.get('rs.lastSync', null);
const ui = { view: 'today', mtab: 'report', filter: 'active', dfilter: 'soon', dShowDone: false, q: '', client: '', calMonth: null, calSel: null, period: 'year', countdown: null };

const STATUSES = ['Inquiry', 'Booked', 'Shot', 'Editing', 'Delivered', 'Cancelled'];
const FLOW = ['Booked', 'Shot', 'Editing', 'Delivered'];
const ITEM_STATUSES = ['Pending', 'Editing', 'Delivered'];
const ROLES = ['Photographer', 'Videographer', 'Editor', 'Assistant', 'Drone', 'Other'];
const R_STATUSES = ['Active', 'Paused', 'Cancelled'];
const ACTIVE = ['Inquiry', 'Booked', 'Shot', 'Editing'];
const DEFAULTS = {
  types: 'Wedding\nBaptism\nPortrait\nEvent\nCommercial\nReal Estate & Construction\nEditorial\nMusic Video\nOther',
  sources: 'Instagram\nWhatsApp\nReferral\nWebsite\nTikTok\nOther',
  expenseCats: 'Equipment rental\nAI tools\nEditing / montage\nTravel & transport\nGear purchase\nSoftware & subscriptions\nMarketing & ads\nStudio / location\nOther',
  itemTypes: 'Photos\nReel\nPromo Video\nFull Video\nShort Film\nAlbum\nRaw Files\nOther',
  currency: 'AED',
  businessName: 'Rony Saad',
  tagline: 'Photography / Film / AI / Creative Marketing',
  email: '', phone: '', address: 'Dubai, United Arab Emirates', website: 'ronysaad.com', payInfo: '',
  invoiceNote: 'Thank you for trusting us with your story.',
  quoteNote: 'Your date is confirmed once the deposit is received. Thank you for considering us for your story.',
  quoteDays: '14', quoteDeposit: '50',
  postDays: '7', deliverDays: '14',
};
const setting = k => { const r = db.settings.find(s => s.id === k); return r && r.value !== '' ? String(r.value) : DEFAULTS[k]; };
const list = k => setting(k).split('\n').map(s => s.trim()).filter(Boolean);
const money = v => `${setting('currency')} ${Math.round(num(v)).toLocaleString('en-US')}`;

function normP(p) {
  return {
    id: String(p.id), code: String(p.code || ''), client: String(p.client || ''), phone: String(p.phone || ''),
    email: String(p.email || ''), instagram: String(p.instagram || ''), title: String(p.title || ''), type: String(p.type || ''),
    date: String(p.date || ''), time: String(p.time || ''), location: String(p.location || ''),
    price: num(p.price), paid: num(p.paid), expenses: num(p.expenses),
    status: STATUSES.includes(p.status) ? p.status : 'Booked', marketing: bool(p.marketing), posted: bool(p.posted),
    source: String(p.source || ''), drive: String(p.drive || ''), notes: String(p.notes || ''),
    created: String(p.created || today()), updated: String(p.updated || ''),
  };
}
const normI = i => ({ id: String(i.id), projectId: String(i.projectId), type: String(i.type || ''), qty: Math.max(1, num(i.qty) || 1), title: String(i.title || ''), status: ITEM_STATUSES.includes(i.status) ? i.status : 'Pending', due: String(i.due || ''), notes: String(i.notes || '') });
const itemLabel = i => `${i.qty > 1 ? i.qty + '× ' : ''}${i.title || i.type}`;
// What each shoot type usually includes, one deliverable per line: "Photos", "2 Reel", "Album +30" (due 30 days after the shoot).
// Kept in Settings as tpl:<type>; without one, these starting lists apply.
const TPL_DEFAULTS = { Wedding: 'Photos\nReel\nFull Video\nAlbum', Baptism: 'Photos\nReel', Portrait: 'Photos', Event: 'Photos\nReel', Commercial: 'Photos\nPromo Video', 'Real Estate & Construction': 'Photos\nPromo Video', Editorial: 'Photos', 'Music Video': 'Full Video\nReel' };
const tplText = type => { const r = db.settings.find(s => s.id === 'tpl:' + type); return r ? String(r.value) : TPL_DEFAULTS[type] || ''; };
function tplItems(type, date, projectId) {
  const types = list('itemTypes'), days = num(setting('deliverDays')) || 14;
  return tplText(type).split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(?:(\d+)\s*[x×]?\s+)?(.+?)(?:\s+\+(\d+)\s*d?)?$/i);
    const name = m[2].trim(), t = types.find(x => x.toLowerCase() === name.toLowerCase());
    return normI({ id: uid(), projectId, type: t || 'Other', title: t || name, qty: m[1] || 1, status: 'Pending', due: date ? addDays(date, m[3] ? +m[3] : days) : '' });
  });
}
const tplSummary = type => tplItems(type, '', '').map(itemLabel).join(' · ');
// What is still to deliver for a project, grouped by type: "Reel ×2 · Photos".
function leftSummary(id) {
  const by = {};
  itemsOf(id).filter(i => i.status !== 'Delivered').forEach(i => { const k = i.type || i.title || 'Other'; by[k] = (by[k] || 0) + i.qty; });
  return Object.entries(by).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(' · ');
}
const normX = x => ({ id: String(x.id), date: String(x.date || today()), category: String(x.category || 'Other'), amount: num(x.amount), projectId: String(x.projectId || ''), note: String(x.note || ''), created: String(x.created || today()) });
// A saved invoice or quotation. `data` is a JSON snapshot, so it reprints exactly as it was sent.
const normD = d => ({ id: String(d.id), projectId: String(d.projectId || ''), kind: d.kind === 'quote' ? 'quote' : 'invoice', no: String(d.no || ''), date: String(d.date || today()), client: String(d.client || ''), total: num(d.total), data: String(d.data || '{}'), created: String(d.created || '') });
const docsOf = id => db.docs.filter(d => d.projectId === id).sort((a, b) => b.created.localeCompare(a.created));
// The deposit asked in a project's latest quotation, and how much of it is still to come.
function depositOf(p, paid = p.paid) {
  const q = docsOf(p.id).find(d => d.kind === 'quote'); if (!q) return null;
  let s; try { s = JSON.parse(q.data); } catch (e) { return null; }
  const amt = Math.round(s.deposit != null ? num(s.deposit) : num(s.price) * num(s.pct) / 100);
  return amt ? { amt, due: s.depDue || s.valid || '', left: Math.max(0, amt - paid), no: q.no } : null;
}
const normC = c => ({ id: String(c.id), projectId: String(c.projectId), name: String(c.name || ''), role: String(c.role || 'Photographer'), fee: num(c.fee), paidOn: String(c.paidOn || ''), notes: String(c.notes || '') });
function normR(r) {
  return {
    id: String(r.id), client: String(r.client || ''), brand: String(r.brand || ''), phone: String(r.phone || ''), instagram: String(r.instagram || ''),
    platforms: String(r.platforms || 'Instagram'), fee: num(r.fee), adBudget: num(r.adBudget),
    start: String(r.start || ''), renewal: String(r.renewal || ''), nextReport: String(r.nextReport || ''),
    posts: num(r.posts), reels: num(r.reels), stories: num(r.stories), status: R_STATUSES.includes(r.status) ? r.status : 'Active',
    paidMonths: String(r.paidMonths || ''), services: String(r.services || ''), notes: String(r.notes || ''),
    created: String(r.created || today()), updated: String(r.updated || ''),
  };
}
db.projects = (db.projects || []).map(normP);
db.items = (db.items || []).map(normI);
db.crew = (db.crew || []).map(normC);
db.expenses = (db.expenses || []).map(normX);
db.retainers = (db.retainers || []).map(normR);
db.settings = db.settings || [];
db.docs = (db.docs || []).map(normD);

const project = id => db.projects.find(p => p.id === id);
const itemsOf = id => db.items.filter(i => i.projectId === id);
const crewOf = id => db.crew.filter(c => c.projectId === id);
const crewCost = id => crewOf(id).reduce((s, c) => s + c.fee, 0);
const expensesOf = id => db.expenses.filter(x => x.projectId === id);
const linkedCost = id => expensesOf(id).reduce((s, x) => s + x.amount, 0);
const balance = p => Math.max(0, p.price - p.paid);
// Everything the shoot cost you: other expenses, your team, and logged expenses linked to it.
const cost = p => p.expenses + crewCost(p.id) + linkedCost(p.id);
const profit = p => p.price - cost(p);
const thisMonth = () => today().slice(0, 7);
const monthName = mk => `${MONTHS[+mk.slice(5) - 1]} ${mk.slice(0, 4)}`;
const addMonths = (s, n) => { const d = parseDay(s); d.setMonth(d.getMonth() + n); return ymd(d); };
const paidMonths = r => r.paidMonths.split(',').map(s => s.trim()).filter(Boolean);
// Retainer fees you received for a month (YYYY-MM).
const retIncome = mk => db.retainers.reduce((s, r) => s + (paidMonths(r).includes(mk) ? r.fee : 0), 0);
const retDue = r => r.status === 'Active' && r.fee > 0 && !paidMonths(r).includes(thisMonth()) && (!r.start || r.start.slice(0, 7) <= thisMonth());
const dayOf = p => p.date || p.created;
function payState(p) {
  if (p.marketing) return ['Free shoot', 't-info'];
  if (!p.price) return ['No price', 't-warn'];
  if (p.paid >= p.price) return ['Paid', 't-ok'];
  if (p.paid > 0) return ['Partial', 't-warn'];
  return ['Unpaid', 't-bad'];
}
const STATUS_TAG = { Inquiry: 't-mute', Booked: 't-info', Shot: 't-acc', Editing: 't-warn', Delivered: 't-ok', Cancelled: 't-mute' };
const nextCode = () => 'PR-' + String(db.projects.reduce((m, p) => Math.max(m, Number(p.code.replace(/\D/g, '')) || 0), 0) + 1).padStart(4, '0');

// ───────────────────────────── sync ─────────────────────────────
async function api(body) {
  const res = await fetch(cfg.url, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, key: cfg.key }),
  });
  let json;
  try { json = await res.json(); } catch (e) { throw new Error('The Sheet did not answer. Check the web app link.'); }
  if (!json.ok) {
    if (json.error === 'Wrong passcode' && store.get(CFG_KEY, null)) relock();
    throw new Error(json.error || 'Request failed');
  }
  return json;
}
// The passcode was changed in the Sheet: ask for the new one, keep unsaved changes for after.
function relock() {
  $('#cUrl').value = cfg.url;
  store.del(CFG_KEY); cfg = null; $('#cKey').value = '';
  $('#cMsg').className = 'msg err'; $('#cMsg').textContent = 'Your passcode was changed. Enter the new one.';
  boot();
}
function saveLocal() { store.set(CACHE_KEY, db); store.set(QUEUE_KEY, queue); }
function setSync(state, txt) {
  const b = $('#syncBtn'); if (!b) return;
  b.classList.toggle('busy', state === 'busy'); b.classList.toggle('off', state === 'off');
  $('#syncTxt').textContent = txt;
  b.title = lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : 'Sync now';
}
let flushing = false;
async function flush() {
  if (flushing || !cfg) return !queue.length;
  flushing = true;
  try {
    while (queue.length) {
      setSync('busy', `Saving ${queue.length}`);
      await api(queue[0]);
      queue.shift(); saveLocal();
    }
    setSync('ok', 'Synced');
    return true;
  } catch (e) {
    setSync('off', navigator.onLine ? 'Not saved' : 'Offline');
    console.warn(e);
    return false;
  } finally { flushing = false; }
}
let localRev = 0;
function push(op) { localRev++; queue.push(op); saveLocal(); flush(); }
async function pull(silent) {
  if (!cfg) return;
  if (!(await flush())) { if (!silent) toast('Changes are waiting to be saved. Check your connection.', true); return; }
  setSync('busy', 'Syncing');
  const rev = localRev;
  try {
    const j = await api({ action: 'all' });
    // An edit made while this request was in flight is newer than the answer; fetch again after it saves.
    if (rev !== localRev || queue.length) { setTimeout(() => pull(true), 800); return; }
    db = {
      projects: (j.projects || []).map(normP), items: (j.items || []).map(normI),
      crew: (j.crew || []).map(normC), retainers: (j.retainers || []).map(normR), expenses: (j.expenses || []).map(normX),
      docs: (j.docs || []).map(normD),
      settings: (j.settings || []).map(s => ({ id: String(s.id), value: String(s.value ?? '') })),
    };
    lastSync = Date.now(); store.set('rs.lastSync', lastSync);
    saveLocal(); setSync('ok', 'Synced'); ui.keepScroll = true; render();
  } catch (e) {
    setSync('off', 'Offline');
    if (!silent) toast(e.message, true);
  }
}
// Replace a project's child rows (deliverables or team) and sync only what changed.
function saveChildren(table, projectId, rows) {
  const keep = rows.map(x => x.id);
  const gone = db[table].filter(x => x.projectId === projectId && !keep.includes(x.id)).map(x => x.id);
  db[table] = db[table].filter(x => x.projectId !== projectId).concat(rows);
  if (rows.length) push({ action: 'upsert', table, rows });
  if (gone.length) push({ action: 'delete', table, ids: gone });
}
function saveProject(p, items, crew) {
  p.updated = new Date().toISOString();
  const i = db.projects.findIndex(x => x.id === p.id);
  if (i === -1) db.projects.unshift(p); else db.projects[i] = p;
  push({ action: 'upsert', table: 'projects', rows: [p] });
  if (items) saveChildren('items', p.id, items);
  if (crew) saveChildren('crew', p.id, crew);
  saveLocal();
}
function saveRow(table, row) {
  const i = db[table].findIndex(x => x.id === row.id);
  if (i === -1) db[table].unshift(row); else db[table][i] = row;
  saveLocal(); push({ action: 'upsert', table, rows: [row] });
}
function deleteRow(table, id) { db[table] = db[table].filter(x => x.id !== id); saveLocal(); push({ action: 'delete', table, ids: [id] }); }
function patchProject(id, patch) { const p = project(id); if (!p) return; Object.assign(p, patch); saveProject(p); render(); }
function patchItem(id, patch) { const it = db.items.find(x => x.id === id); if (!it) return; Object.assign(it, patch); saveLocal(); push({ action: 'upsert', table: 'items', rows: [it] }); render(); }
function deleteProject(id) {
  db.projects = db.projects.filter(p => p.id !== id);
  push({ action: 'delete', table: 'projects', ids: [id] });
  saveChildren('items', id, []);
  saveChildren('crew', id, []);
  saveLocal();
}
function patchCrew(id, patch) { const c = db.crew.find(x => x.id === id); if (!c) return; Object.assign(c, patch); saveLocal(); push({ action: 'upsert', table: 'crew', rows: [c] }); render(); }
function patchRetainer(id, patch) { const r = db.retainers.find(x => x.id === id); if (!r) return; Object.assign(r, patch, { updated: new Date().toISOString() }); saveRow('retainers', r); render(); }
function toggleRetMonth(id, mk) {
  const r = db.retainers.find(x => x.id === id); if (!r) return;
  const ms = paidMonths(r);
  patchRetainer(id, { paidMonths: (ms.includes(mk) ? ms.filter(m => m !== mk) : ms.concat(mk).sort()).join(',') });
}

// ───────────────────────────── toast ─────────────────────────────
let toastT;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, err ? 5000 : 2600);
}

// ───────────────────────────── WhatsApp ─────────────────────────────
function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('05') && d.length === 10) d = '971' + d.slice(1);
  return d;
}
function waText(p, kind) {
  const first = p.client.split(/\s+/)[0] || 'there';
  const when = p.date ? `${fmtDate(p.date)}${p.time ? ' at ' + fmtTime(p.time) : ''}` : 'the date we agreed';
  const name = setting('businessName');
  if (kind === 'confirm') return `Hi ${first}, this is ${name}. Your ${p.type || 'shoot'} is confirmed for ${when}${p.location && !/^https?:/.test(p.location) ? ' at ' + p.location : ''}.${p.price ? ` Total: ${money(p.price)}${p.paid ? `, received ${money(p.paid)}` : ''}.` : ''} Looking forward to it!`;
  if (kind === 'remind') return `Hi ${first}, a quick reminder about your ${p.type || 'shoot'} on ${when}. See you there! — ${name}`;
  if (kind === 'deposit') { const dep = depositOf(p) || { left: 0 }; return `Hi ${first}, thank you for choosing ${name}! To confirm your ${p.type || 'shoot'}${p.date ? ' on ' + fmtDate(p.date) : ''}, the deposit is ${money(dep.left)}${dep.due ? `, by ${fmtDate(dep.due)}` : ''}.${setting('payInfo') ? '\n\n' + setting('payInfo') : ''}\n\nThank you! — ${name}`; }
  if (kind === 'pay') return `Hi ${first}, hope you're well! A friendly reminder that ${money(balance(p))} is still due for "${p.title}". ${setting('payInfo') ? '\n\n' + setting('payInfo') : ''}\n\nThank you! — ${name}`;
  if (kind === 'ready') return `Hi ${first}, your ${p.title} files are ready!${p.drive ? ' ' + p.drive : ''} Hope you love them. A review or tag on Instagram would mean a lot. — ${name}`;
  return '';
}
const waLink = (p, kind) => `https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(waText(p, kind))}`;
const waBtn = (p, kind, label) => (waNumber(p.phone) ? `<a class="btn sm wa" href="${waLink(p, kind)}" target="_blank" rel="noopener">${esc(label)}</a>` : '');
function waRetBtn(r) {
  if (!waNumber(r.phone)) return '';
  const first = r.client.split(/\s+/)[0] || 'there';
  const text = `Hi ${first}, hope you're well! A friendly reminder that the ${monthName(thisMonth())} fee for ${r.brand || 'your page'} (${money(r.fee)}) is due.${setting('payInfo') ? '\n\n' + setting('payInfo') : ''}\n\nThank you! — ${setting('businessName')}`;
  return `<a class="btn sm wa" href="https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Remind</a>`;
}

// ───────────────────────────── alerts ─────────────────────────────
function alerts() {
  const t = today(), out = [];
  const postDays = num(setting('postDays')) || 7, deliverDays = num(setting('deliverDays')) || 14;
  db.projects.forEach(p => {
    if (p.status === 'Cancelled') return;
    const ref = `${p.code} · ${p.client}`;
    if (!p.marketing && balance(p) > 0 && ['Shot', 'Editing', 'Delivered'].includes(p.status))
      out.push({ g: 'Collect payment', money: true, sev: 'bad', p, title: `${money(balance(p))} due · ${p.title}`, sub: ref, act: 'pay' });
    if (p.date && p.date < t && ['Inquiry', 'Booked'].includes(p.status))
      out.push({ g: 'Date passed', sev: 'warn', p, title: `${p.title} was on ${fmtDate(p.date)}`, sub: 'Still marked ' + p.status, act: 'shot' });
    if (!p.date && ACTIVE.includes(p.status))
      out.push({ g: 'Missing info', sev: 'info', p, title: `${p.title} has no shoot date`, sub: ref, act: 'open' });
    if (!p.marketing && !p.price && p.status !== 'Inquiry')
      out.push({ g: 'Missing info', money: true, sev: 'info', p, title: `${p.title} has no price`, sub: ref, act: 'open' });
    if (['Shot', 'Editing'].includes(p.status) && p.date && daysBetween(p.date, t) > deliverDays && !itemsOf(p.id).some(i => i.due >= t))
      out.push({ g: 'Delivery taking long', sev: 'warn', p, title: `${p.title} shot ${daysBetween(p.date, t)} days ago`, sub: 'Not delivered yet', act: 'open' });
    if (p.marketing && !p.posted && (p.status === 'Delivered' || (p.date && daysBetween(p.date, t) > postDays)))
      out.push({ g: 'Post on your page', sev: 'acc', p, title: `${p.title}`, sub: 'Free shoot, not posted yet', act: 'posted' });
  });
  db.items.forEach(i => {
    const p = project(i.projectId);
    if (!p || p.status === 'Cancelled' || i.status === 'Delivered' || !i.due) return;
    if (i.due < t) out.push({ g: 'Overdue deliveries', sev: 'bad', p, item: i, title: `${itemLabel(i)} · ${p.title}`, sub: `Was due ${fmtDate(i.due)} (${daysBetween(i.due, t)} days late)`, act: 'item' });
    else if (i.due <= addDays(t, 1)) out.push({ g: 'Due soon', sev: 'warn', p, item: i, title: `${itemLabel(i)} · ${p.title}`, sub: `Due ${i.due === t ? 'today' : 'tomorrow'}`, act: 'item' });
  });
  db.crew.forEach(c => {
    const p = project(c.projectId);
    if (!p || c.paidOn || !c.fee || !['Shot', 'Editing', 'Delivered'].includes(p.status)) return;
    out.push({ g: 'Pay your team', money: true, sev: 'warn', p, crew: c, title: `${money(c.fee)} to ${c.name || 'your ' + c.role.toLowerCase()}`, sub: `${c.role} · ${p.title}`, act: 'crew' });
  });
  db.retainers.filter(r => r.status === 'Active').forEach(r => {
    if (retDue(r)) out.push({ g: 'Collect payment', money: true, sev: 'bad', r, title: `${money(r.fee)} · ${r.client} monthly fee`, sub: `${monthName(thisMonth())} not received yet`, act: 'ret-pay' });
    if (r.nextReport && r.nextReport <= t) out.push({ g: 'Retainer tasks', sev: 'info', r, title: `Send ${r.client} their monthly report`, sub: `Due ${fmtDate(r.nextReport)}`, act: 'ret-report' });
    if (r.renewal && r.renewal >= t && r.renewal <= addDays(t, 14)) out.push({ g: 'Retainer tasks', sev: 'info', r, title: `${r.client} renews ${fmtDate(r.renewal)}`, sub: 'Talk to them about the next term', act: 'ret-open' });
  });
  return out;
}
function alertActions(a) {
  if (a.r) {
    const open = `<button class="btn sm ghost" data-ret-open="${a.r.id}">Open</button>`;
    if (a.act === 'ret-pay') return `${waRetBtn(a.r)}<button class="btn sm" data-ret-month="${a.r.id}" data-m="${thisMonth()}">Mark paid</button>`;
    if (a.act === 'ret-report') return `<button class="btn sm" data-ret-report="${a.r.id}">Report sent</button>${open}`;
    return open;
  }
  const p = a.p;
  if (a.act === 'crew') return `<button class="btn sm" data-crew-paid="${a.crew.id}">Mark paid</button><button class="btn sm ghost" data-open="${p.id}">Open</button>`;
  const open = `<button class="btn sm ghost" data-open="${p.id}">Open</button>`;
  if (a.act === 'pay') return `${waBtn(p, 'pay', 'Remind')}<button class="btn sm" data-paid="${p.id}">Mark paid</button>`;
  if (a.act === 'shot') return `<button class="btn sm" data-status="${p.id}" data-to="Shot">Mark shot</button><button class="btn sm ghost" data-status="${p.id}" data-to="Cancelled">Cancelled</button>`;
  if (a.act === 'posted') return `<button class="btn sm" data-posted="${p.id}">Mark posted</button>`;
  if (a.act === 'item') return `<button class="btn sm" data-item-done="${a.item.id}">Delivered</button>${open}`;
  return open;
}
function renderAlerts(all, limit) {
  if (!all.length) return '<p class="allclear">All clear. Nothing needs you right now.</p>';
  const order = ['Overdue deliveries', 'Collect payment', 'Pay your team', 'Due soon', 'Date passed', 'Delivery taking long', 'Retainer tasks', 'Post on your page', 'Missing info'];
  let shown = 0, html = '';
  order.forEach(g => {
    const group = all.filter(a => a.g === g);
    if (!group.length || (limit && shown >= limit)) return;
    const take = limit ? group.slice(0, Math.max(1, limit - shown)) : group;
    shown += take.length;
    html += `<div class="alert-group">${esc(g)} <span class="n">${group.length}</span></div>` +
      take.map(a => `<div class="alert ${a.sev}"><i class="sev"></i><div><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></div><div class="acts">${alertActions(a)}</div></div>`).join('');
  });
  if (limit && all.length > shown) html += `<a class="linkbtn" href="#projects" data-filter="attention">See all ${all.length} →</a>`;
  return `<div class="alerts">${html}</div>`;
}

// ───────────────────────────── shared pieces ─────────────────────────────
function steps(p) {
  if (p.status === 'Cancelled') return '<span class="tag t-mute">Cancelled</span>';
  if (p.status === 'Inquiry') return `<span class="steps"><button type="button" class="cur">Inquiry</button><button type="button" data-status="${p.id}" data-to="Booked">Confirm →</button></span>`;
  const idx = FLOW.indexOf(p.status);
  return `<span class="steps" role="group" aria-label="Status">${FLOW.map((s, i) => `<button type="button" data-status="${p.id}" data-to="${s}" class="${i < idx ? 'done' : i === idx ? 'cur' : ''}" aria-pressed="${i === idx}">${s}</button>`).join('')}</span>`;
}
function dateBlock(p) {
  const d = parseDay(p.date);
  if (!d) return '<div class="date-block none"><b>—</b><span>No date</span></div>';
  return `<div class="date-block"><b>${d.getDate()}</b><span>${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ’' + String(d.getFullYear()).slice(2) : ''}</span></div>`;
}
function projectRow(p) {
  const [pay, payCls] = payState(p);
  const its = itemsOf(p.id), done = its.filter(i => i.status === 'Delivered').length, left = leftSummary(p.id);
  return `<div class="row ${p.status === 'Cancelled' ? 'cancelled' : ''}" data-open="${p.id}" role="button" tabindex="0">
    ${dateBlock(p)}
    <div class="main"><strong>${esc(p.title || p.client)}</strong>
      <small>${esc(p.client)}${p.type ? ' · ' + esc(p.type) : ''}${p.time ? ' · ' + fmtTime(p.time) : ''}${its.length ? ` · ${done}/${its.length} delivered` : ''}${left ? ` · left: ${esc(left)}` : ''}</small></div>
    ${steps(p)}
    <div class="money"><b>${p.marketing ? 'Free' : money(p.price)}</b><span class="tag ${payCls}">${pay}${!p.marketing && balance(p) && p.paid ? ' · ' + money(balance(p)) + ' left' : ''}</span></div>
  </div>`;
}
const clientNames = () => [...new Set(db.projects.map(p => p.client).filter(Boolean))].sort();

// ───────────────────────────── views ─────────────────────────────
// One page for "what do I do today": money to collect, deliveries, shoots, loose ends, then the month.
// Everything still owed to you: balances after the shoot, deposits before it, retainer fees.
function collectPanel() {
  const t = today();
  const dueNow = p => ['Shot', 'Editing', 'Delivered'].includes(p.status) || (p.date && p.date < t);
  const owed = db.projects.filter(p => p.status !== 'Cancelled' && !p.marketing && balance(p) > 0)
    .sort((a, b) => dueNow(b) - dueNow(a) || dayOf(a).localeCompare(dayOf(b)));
  const rets = db.retainers.filter(retDue);
  // Before the shoot, a quotation's unpaid deposit is what to chase.
  const deps = owed.filter(p => !dueNow(p)).map(p => ({ p, dep: depositOf(p) })).filter(x => x.dep && x.dep.left)
    .sort((a, b) => (a.dep.due || '9999').localeCompare(b.dep.due || '9999'));
  const owedTotal = owed.reduce((s, p) => s + balance(p), 0) + rets.reduce((s, r) => s + r.fee, 0);
  const nowTotal = owed.filter(dueNow).reduce((s, p) => s + balance(p), 0) + rets.reduce((s, r) => s + r.fee, 0)
    + deps.filter(x => x.dep.due && x.dep.due <= t).reduce((s, x) => s + x.dep.left, 0);
  const collectRow = p => `<div class="alert ${dueNow(p) ? 'bad' : 'info'}" data-open="${p.id}" data-ptab="money" role="button" tabindex="0"><i class="sev"></i>
    <div><b>${money(balance(p))} · ${esc(p.title)}</b><small>${esc(p.client)} · ${p.paid ? `paid ${money(p.paid)} of ${money(p.price)}` : 'nothing paid yet'} · ${p.date ? (dueNow(p) ? 'shot ' : 'shoot ') + fmtDate(p.date) : 'no date'}</small></div>
    <div class="acts">${dueNow(p) ? waBtn(p, 'pay', 'Remind') : ''}<button class="btn sm" data-paid="${p.id}">Mark paid</button></div></div>`;
  const depRow = ({ p, dep }) => { const late = dep.due && dep.due < t; return `<div class="alert ${late ? 'bad' : 'warn'}" data-open="${p.id}" data-ptab="money" role="button" tabindex="0"><i class="sev"></i>
    <div><b>${money(dep.left)} deposit · ${esc(p.title)}</b><small>${esc(p.client)} · ${dep.due ? (late ? `was due ${fmtDate(dep.due)} (${daysBetween(dep.due, t)} days late)` : dep.due === t ? 'due today' : 'due ' + fmtDate(dep.due)) : 'no due date'} · ${esc(dep.no)}${p.date ? ' · shoot ' + fmtDate(p.date) : ''}</small></div>
    <div class="acts">${waBtn(p, 'deposit', 'Remind')}<button class="btn sm" data-dep-paid="${p.id}">Deposit paid</button></div></div>`; };
  const retRow = r => `<div class="alert bad" data-ret-open="${r.id}" role="button" tabindex="0"><i class="sev"></i><div><b>${money(r.fee)} · ${esc(r.client)} monthly fee</b><small>${monthName(thisMonth())} not received yet</small></div><div class="acts">${waRetBtn(r)}<button class="btn sm" data-ret-month="${r.id}" data-m="${thisMonth()}">Mark paid</button></div></div>`;
  const grp = (label, rows) => (rows.length ? `<div class="alert-group">${label} <span class="n">${rows.length}</span></div>${rows.join('')}` : '');
  const collect = owed.length || rets.length ? `<div class="alerts">${grp('Due now', owed.filter(dueNow).map(collectRow).concat(rets.map(retRow)))}${grp('Deposits', deps.map(depRow))}${grp('Booked, not shot yet', owed.filter(p => !dueNow(p) && !deps.some(x => x.p === p)).map(collectRow))}</div>` : '<p class="allclear">Everyone has paid.</p>';
  return `<div class="ph"><h2>To collect</h2><small>${money(owedTotal)} in total${nowTotal ? ' · ' + money(nowTotal) + ' due now' : ''}</small></div>${collect}`;
}

// Today: what's booked, what's still to deliver, and a quick way to add a booking. Money lives on the Money page.
function renderToday() {
  const t = today(), now = new Date(), week = addDays(t, 7);
  const upcoming = db.projects.filter(p => p.date >= t && !['Cancelled', 'Inquiry', 'Delivered'].includes(p.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = upcoming[0], thisWeek = upcoming.filter(p => p.date <= week).length;
  const inquiries = db.projects.filter(p => p.status === 'Inquiry').sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const openItems = db.items.filter(i => i.status !== 'Delivered' && project(i.projectId) && project(i.projectId).status !== 'Cancelled');
  const late = openItems.filter(i => i.due && i.due < t).length, soon = openItems.filter(i => i.due && i.due >= t && i.due <= week).length;
  const rest = alerts().filter(a => !a.money && !['Overdue deliveries', 'Due soon'].includes(a.g));
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const loc = p => (p.location ? (/^https?:/.test(p.location) ? `<a class="linkbtn" href="${esc(p.location)}" target="_blank" rel="noopener">Open location ↗</a>` : esc(p.location)) : '');
  const side = `${inquiries.length ? `<section class="panel"><div class="ph"><h2>Inquiries</h2><small>waiting to confirm</small></div><div class="mini">${inquiries.slice(0, 6).map(p => `<div class="mini-it" data-open="${p.id}" role="button" tabindex="0"><div><b>${esc(p.title || p.client)}</b><small>${esc(p.client)}${p.type ? ' · ' + esc(p.type) : ''}</small></div><div class="r">${p.date ? fmtDate(p.date) : '<small>No date</small>'}</div></div>`).join('')}</div>
      ${inquiries.length > 6 ? `<a class="linkbtn" href="#projects/board">All ${inquiries.length} on the board →</a>` : ''}</section>` : ''}
    ${rest.length ? `<section class="panel"><div class="ph"><h2>Also needs you</h2><small>${rest.length} item${rest.length === 1 ? '' : 's'}</small></div>${renderAlerts(rest)}</section>` : ''}`;
  const main = `<section class="panel" id="t-shoots"><div class="ph"><h2>Upcoming shoots</h2><button class="linkbtn" data-jump="t-cal">Calendar ↓</button></div>
        ${next ? `<div class="hero"><div><div class="label">Next · ${esc(next.code)}</div><h3>${esc(next.title)}</h3>
          <div class="meta"><span>${fmtDate(next.date)}${next.time ? ' · ' + fmtTime(next.time) : ''}</span><span>${esc(next.client)}</span>${next.location ? `<span>${loc(next)}</span>` : ''}</div>
          <div class="acts">${waBtn(next, 'remind', 'Send reminder')}<button class="btn sm" data-open="${next.id}">Open</button></div></div>
          <div class="cd" id="cd" data-at="${next.date}T${next.time || '00:00'}"></div></div>` : '<div class="empty"><b>Nothing booked ahead</b><button class="btn primary sm" data-add style="margin-top:10px">+ New booking</button></div>'}
        ${upcoming.length > 1 ? `<div class="mini">${upcoming.slice(1, 8).map(p => `<div class="mini-it" data-open="${p.id}" role="button" tabindex="0"><div><b>${esc(p.title)}</b><small>${esc(p.client)}${p.location && !/^https?:/.test(p.location) ? ' · ' + esc(p.location) : ''}</small></div><div class="r">${fmtDate(p.date)}<small>${p.date === t ? 'Today' : 'in ' + daysBetween(t, p.date) + ' d'}${p.time ? ' · ' + fmtTime(p.time) : ''}</small></div></div>`).join('')}</div>` : ''}
        ${upcoming.length > 8 ? `<a class="linkbtn" href="#projects" data-filter="active">All ${upcoming.length} upcoming →</a>` : ''}</section>
      <section class="panel" id="t-deliver">${deliverSection()}</section>`;

  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}</p>
    <h1>${greet}, <span class="a">${esc(setting('businessName').split(' ')[0])}</span></h1></div>
    <button class="btn primary" data-add>+ New booking</button></div>
  <div class="kpis">
    <button class="kpi" data-jump="t-shoots"><small>Next shoot</small><b>${next ? (next.date === t ? 'Today' : next.date === addDays(t, 1) ? 'Tomorrow' : 'in ' + daysBetween(t, next.date) + ' d') : '—'}</b><em>${next ? esc(next.client) + (next.time ? ' · ' + fmtTime(next.time) : '') : 'nothing booked ahead'}</em></button>
    <button class="kpi" data-jump="t-shoots"><small>Shoots this week</small><b>${thisWeek}</b><em>${upcoming.length} booked ahead</em></button>
    <button class="kpi" data-jump="t-deliver"><small>Late deliveries</small><b class="${late ? 'bad' : ''}">${late}</b><em>past their due date</em></button>
    <button class="kpi" data-jump="t-deliver"><small>Due this week</small><b>${soon}</b><em>by ${fmtDate(week)}</em></button>
  </div>
  ${side.trim() ? `<div class="cols"><div class="stack">${main}</div><div class="stack">${side}</div></div>` : main}
  <section class="panel" id="t-cal">${calendarSection()}</section>`;
  tickCountdown();
}
function tickCountdown() {
  clearInterval(ui.countdown);
  const el = $('#cd'); if (!el) return;
  const at = new Date(el.dataset.at);
  const draw = () => {
    let ms = at - new Date();
    if (ms <= 0) { el.innerHTML = '<span><b>NOW</b><small>Today</small></span>'; return; }
    const d = Math.floor(ms / 864e5); ms -= d * 864e5;
    const h = Math.floor(ms / 36e5); ms -= h * 36e5;
    const m = Math.floor(ms / 6e4);
    el.innerHTML = `<span><b>${d}</b><small>days</small></span><span><b>${pad(h)}</b><small>hrs</small></span><span><b>${pad(m)}</b><small>min</small></span>`;
  };
  draw(); ui.countdown = setInterval(draw, 30000);
}

// The client chip and search box narrow both the list and the board.
function searched(rows) {
  const q = ui.q.trim().toLowerCase();
  if (ui.client) rows = rows.filter(p => p.client === ui.client);
  return q ? rows.filter(p => [p.code, p.client, p.title, p.type, p.phone, p.notes, p.location].join(' ').toLowerCase().includes(q)) : rows;
}
function filteredProjects() {
  const t = today();
  const att = new Set(alerts().filter(a => a.p).map(a => a.p.id));
  const F = {
    active: p => ACTIVE.includes(p.status),
    attention: p => att.has(p.id),
    unpaid: p => !p.marketing && p.status !== 'Cancelled' && balance(p) > 0,
    delivered: p => p.status === 'Delivered',
    marketing: p => p.marketing,
    all: () => true,
  };
  const rows = searched(db.projects.filter(F[ui.filter] || F.all));
  const upcomingFirst = ui.filter === 'active';
  return rows.sort((a, b) => {
    if (upcomingFirst) {
      const fa = a.date >= t ? 0 : a.date ? 1 : 2, fb = b.date >= t ? 0 : b.date ? 1 : 2;
      if (fa !== fb) return fa - fb;
      if (fa === 0) return (a.date + a.time).localeCompare(b.date + b.time);
    }
    return (b.date || b.created).localeCompare(a.date || a.created) || b.code.localeCompare(a.code);
  });
}
function renderProjects() {
  const board = ui.pview === 'board';
  const att = new Set(alerts().filter(a => a.p).map(a => a.p.id)).size;
  const counts = {
    active: db.projects.filter(p => ACTIVE.includes(p.status)).length,
    attention: att,
    unpaid: db.projects.filter(p => !p.marketing && p.status !== 'Cancelled' && balance(p) > 0).length,
    delivered: db.projects.filter(p => p.status === 'Delivered').length,
    marketing: db.projects.filter(p => p.marketing).length,
    all: db.projects.length,
  };
  const labels = { active: 'Active', attention: 'Needs attention', unpaid: 'Unpaid', delivered: 'Delivered', marketing: 'Free shoots', all: 'All' };
  const cols = ui.showCancelled ? STATUSES : STATUSES.filter(s => s !== 'Cancelled');
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${db.projects.length} projects</p><h1>Pro<span class="o">jects</span></h1></div>
    <div class="vacts"><div class="seg" role="group" aria-label="View">${['list', 'board'].map(v => `<button data-pview="${v}" aria-pressed="${(board ? 'board' : 'list') === v}">${v === 'list' ? 'List' : 'Board'}</button>`).join('')}</div>
    <button class="btn primary" data-add>+ New booking</button></div></div>
  <div class="filters">
    <input type="search" id="q" placeholder="Search client, project, phone, notes…" value="${esc(ui.q)}" aria-label="Search projects">
    ${ui.client ? `<button class="chip" aria-pressed="true" id="clearClient">${esc(ui.client)} ✕</button>` : ''}
  </div>
  ${board ? `<div class="chips kbar" role="group" aria-label="Stages"><span class="kjump chips">${cols.map(c => `<button class="chip" data-kcol="${c}">${c}<span class="n">${searched(db.projects).filter(p => p.status === c).length}</span></button>`).join('')}</span>
      <button class="chip" data-kcancel aria-pressed="${!!ui.showCancelled}">Show cancelled</button></div>
    <div class="board" id="board"></div>`
    : `<div class="chips" role="group" aria-label="Filter">${Object.keys(labels).map(k => `<button class="chip" data-filter="${k}" aria-pressed="${ui.filter === k}">${labels[k]}<span class="n">${counts[k]}</span></button>`).join('')}</div>
    <div class="rows" id="rows"></div>`}`;
  (board ? drawBoard : drawRows)();
  $('#q').addEventListener('input', e => { ui.q = e.target.value; (board ? drawBoard : drawRows)(); });
  const cc = $('#clearClient'); if (cc) cc.onclick = () => { ui.client = ''; renderProjects(); };
}
function drawRows() {
  const rows = filteredProjects();
  $('#rows').innerHTML = rows.length ? rows.map(projectRow).join('') : `<div class="empty"><b>No projects here</b>Try another filter, or add a booking.</div>`;
}

// ───────────────────────────── pipeline board ─────────────────────────────
// One column per stage. Drag a card to another column, or use its button to move it one stage on.
const NEXT = { Inquiry: ['Booked', 'Confirm booking'], Booked: ['Shot', 'Mark shot'], Shot: ['Editing', 'Start editing'], Editing: ['Delivered', 'Mark delivered'] };
function kcard(p) {
  const t = today(), [pay, payCls] = payState(p), its = itemsOf(p.id), done = its.filter(i => i.status === 'Delivered').length;
  const late = its.filter(i => i.status !== 'Delivered' && i.due && i.due < t).length;
  const passed = p.date && p.date < t && ['Inquiry', 'Booked'].includes(p.status), nx = NEXT[p.status];
  const dep = ['Inquiry', 'Booked'].includes(p.status) && !p.marketing ? depositOf(p) : null;
  return `<div class="kcard" draggable="true" data-open="${p.id}" data-id="${p.id}" role="button" tabindex="0">
    <b>${esc(p.title || p.client)}</b><small>${esc(p.client)}${p.type ? ' · ' + esc(p.type) : ''}</small>
    <span class="kdate ${passed ? 'late' : ''}">${p.date ? fmtDate(p.date) : 'No date'}${p.time ? ' · ' + fmtTime(p.time) : ''}</span>
    <div class="ktags">${['Inquiry', 'Cancelled'].includes(p.status) ? '' : `<span class="tag ${payCls}">${pay}</span>`}${its.length && ['Shot', 'Editing', 'Delivered'].includes(p.status) ? `<span class="tag ${done === its.length ? 't-ok' : 't-mute'}">${done}/${its.length} delivered</span>` : ''}${late ? `<span class="tag t-bad">${late} late</span>` : ''}${passed ? '<span class="tag t-warn">Date passed</span>' : ''}${dep && dep.left ? `<span class="tag ${dep.due && dep.due < t ? 't-bad' : 't-warn'}">Deposit ${dep.due && dep.due < t ? 'late' : 'due'}</span>` : ''}${p.marketing ? '<b>Free</b>' : p.price ? `<b>${money(p.price)}</b>` : ''}</div>
    ${nx ? `<button type="button" class="btn sm knext" data-status="${p.id}" data-to="${nx[0]}">${nx[1]} →</button>` : ''}</div>`;
}
function drawBoard() {
  const rows = searched(db.projects), narrowed = !!(ui.client || ui.q.trim());
  const cols = ui.showCancelled ? STATUSES : STATUSES.filter(s => s !== 'Cancelled');
  // Open work: oldest date first, undated last. Finished work: newest first, recent ones only.
  const asc = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.time.localeCompare(b.time);
  const desc = (a, b) => dayOf(b).localeCompare(dayOf(a));
  const bd = $('#board');
  bd.innerHTML = cols.map(s => {
    const ps = rows.filter(p => p.status === s).sort(ACTIVE.includes(s) ? asc : desc);
    const shown = ACTIVE.includes(s) || narrowed ? ps : ps.slice(0, 12);
    const val = ps.filter(p => !p.marketing).reduce((sum, p) => sum + p.price, 0);
    return `<section class="kcol" data-col="${s}" id="col-${s}" aria-label="${s}"><div class="kh"><span class="tag ${STATUS_TAG[s]}">${s}</span><b>${ps.length}</b><small>${val ? money(val) : ''}</small></div>
      <div class="klist">${shown.map(kcard).join('') || '<p class="kempty">Nothing here</p>'}
      ${ps.length > shown.length ? `<button class="linkbtn" data-filter="${s === 'Delivered' ? 'delivered' : 'all'}">${ps.length - shown.length} older in the list →</button>` : ''}</div></section>`;
  }).join('');
  bd.scrollLeft = ui.boardX || 0;
  bd.onscroll = () => { ui.boardX = bd.scrollLeft; };
  bd.ondragstart = e => { const c = e.target.closest('.kcard'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); };
  bd.ondragend = () => $$('.drag, .over', bd).forEach(x => x.classList.remove('drag', 'over'));
  bd.ondragover = e => { const col = e.target.closest('.kcol'); if (!col) return; e.preventDefault(); $$('.kcol.over', bd).forEach(x => { if (x !== col) x.classList.remove('over'); }); col.classList.add('over'); };
  bd.ondrop = e => {
    const col = e.target.closest('.kcol'); if (!col) return;
    e.preventDefault(); bd.ondragend();
    const p = project(e.dataTransfer.getData('text/plain')), to = col.dataset.col;
    if (!p || p.status === to) return;
    ui.keepScroll = true; patchProject(p.id, { status: to }); toast(`${p.code} → ${to}`);
  };
}

function calendarSection() {
  const t = today();
  if (!ui.calMonth) ui.calMonth = t.slice(0, 7);
  const [y, m] = ui.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const byDay = {};
  const add = (d, e) => { (byDay[d] = byDay[d] || []).push(e); };
  db.projects.filter(p => p.date && p.status !== 'Cancelled').forEach(p => add(p.date, { kind: p.marketing ? 'free' : 'shoot', p, label: `${p.time ? fmtTime(p.time).replace(':00', '') + ' ' : ''}${p.client}` }));
  db.items.filter(i => i.due && i.status !== 'Delivered').forEach(i => { const p = project(i.projectId); if (p && p.status !== 'Cancelled') add(i.due, { kind: 'due', p, label: `Due: ${itemLabel(i)}` }); });
  let cells = '';
  for (let k = 0; k < 42; k++) {
    const d = new Date(start); d.setDate(start.getDate() + k);
    const key = ymd(d), evs = byDay[key] || [];
    if (k >= 35 && d.getMonth() !== m - 1) break;
    cells += `<button type="button" class="cal-c ${d.getMonth() !== m - 1 ? 'out' : ''} ${key === t ? 'today' : ''} ${key === ui.calSel ? 'sel' : ''}" data-day="${key}">
      <span class="d">${d.getDate()}</span>
      ${evs.slice(0, 3).map(e => `<span class="ev ${e.kind === 'due' ? 'due' : e.kind === 'free' ? 'free' : ''}">${esc(e.label)}</span>`).join('')}
      ${evs.length > 3 ? `<span class="code">+${evs.length - 3} more</span>` : ''}
      <span class="dots">${evs.map(e => `<i class="${e.kind === 'due' ? 'due' : ''}"></i>`).join('')}</span></button>`;
  }
  const monthShoots = db.projects.filter(p => p.date.startsWith(ui.calMonth) && p.status !== 'Cancelled');
  const sel = ui.calSel && byDay[ui.calSel];
  return `
  <div class="ph"><div><h2>Calendar</h2><small>${monthShoots.length} shoot${monthShoots.length === 1 ? '' : 's'} in ${MONTHS[m - 1]}</small></div>
    <div class="calnav"><button class="x" data-cal="-1" aria-label="Previous month">‹</button><span class="ttl">${MONTHS[m - 1]} ${y}</span><button class="x" data-cal="1" aria-label="Next month">›</button><button class="btn sm ghost" data-cal="0">Today</button></div></div>
    <div class="cal">${DAYS.map(d => `<div class="cal-h">${d}</div>`).join('')}${cells}</div>
    <div class="legend"><span><i style="background:var(--accent)"></i>Paid shoot</span><span><i style="background:#ffffff33"></i>Free shoot</span><span><i style="border:1px solid var(--info)"></i>Delivery due</span></div>
  ${ui.calSel ? `<div class="cal-day"><div class="ph"><h2>${fmtDate(ui.calSel)}</h2><button class="btn sm primary" data-add-day="${ui.calSel}">+ Book this day</button></div>
    ${sel ? `<div class="mini">${sel.map(e => `<div class="mini-it" data-open="${e.p.id}"><div><b>${esc(e.kind === 'due' ? e.label : e.p.title)}</b><small>${esc(e.p.client)}${e.p.location && !/^https?:/.test(e.p.location) ? ' · ' + esc(e.p.location) : ''}</small></div><div class="r">${e.kind === 'due' ? '<span class="tag t-info">Delivery</span>' : `<span class="tag ${STATUS_TAG[e.p.status]}">${e.p.status}</span>`}<small>${e.p.time && e.kind !== 'due' ? fmtTime(e.p.time) : ''}</small></div></div>`).join('')}</div>` : '<div class="empty"><b>Free day</b>Nothing booked.</div>'}
  </div>` : ''}`;
}

function periodRange() {
  const t = today(), y = t.slice(0, 4);
  if (ui.period === 'month') return [t.slice(0, 7) + '-01', '9999'];
  if (ui.period === '3m') { const d = new Date(); d.setMonth(d.getMonth() - 2, 1); return [ymd(d), '9999']; }
  if (ui.period === 'year') return [y + '-01-01', y + '-12-31'];
  return ['0000', '9999'];
}
// Money in and out for a date range. Shoot income and shoot costs count on the shoot's date;
// logged expenses on their own date; retainers on the months marked paid.
function moneyStats(from, to) {
  const inRange = d => d >= from && d <= to;
  const live = db.projects.filter(p => p.status !== 'Cancelled' && inRange(dayOf(p)));
  const paidP = live.filter(p => !p.marketing);
  const retPaid = db.retainers.flatMap(r => paidMonths(r).filter(m => m >= from.slice(0, 7) && m <= to.slice(0, 7)).map(() => r.fee));
  const retIn = retPaid.reduce((s, v) => s + v, 0);
  const ledger = db.expenses.filter(x => inRange(x.date));
  const team = live.reduce((s, p) => s + crewCost(p.id), 0);
  const other = live.reduce((s, p) => s + p.expenses, 0);
  const logged = ledger.reduce((s, x) => s + x.amount, 0);
  const revenue = paidP.reduce((s, p) => s + p.price, 0) + retIn;
  const collected = paidP.reduce((s, p) => s + Math.min(p.paid, p.price || p.paid), 0) + retIn;
  const spent = team + other + logged;
  return { live, paidP, retPaid, retIn, ledger, team, other, logged, revenue, collected, spent, profit: revenue - spent };
}
const monthEnd = mk => ymd(new Date(+mk.slice(0, 4), +mk.slice(5), 0));
function barList(rows, empty, fmt = money) {
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  const top = Math.max(1, ...rows.map(r => r.v));
  return `<div class="bars">${rows.map(r => `<div class="bar-row" ${r.attr || ''}><span>${esc(r.k)}</span><b>${fmt(r.v)}</b><div class="track"><i style="width:${(r.v / top * 100).toFixed(1)}%"></i></div><small>${r.sub || ''}</small></div>`).join('')}</div>`;
}
const nf = v => Math.round(v).toLocaleString('en-US');
const kf = v => (Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k' : Math.round(v));
// Time slices for the chosen period: days for a month, weeks for 3 months, months for a year, months (or years) for all time.
function periodBuckets() {
  const t = today(), [from] = periodRange(), out = [];
  if (ui.period === 'month') { for (let d = from; d <= monthEnd(t.slice(0, 7)); d = addDays(d, 1)) out.push({ from: d, to: d, label: String(+d.slice(8)), title: fmtDate(d) }); return out; }
  if (ui.period === '3m') { for (let d = from; d <= t; d = addDays(d, 7)) out.push({ from: d, to: addDays(d, 6), label: `${+d.slice(8)} ${MONTHS[+d.slice(5, 7) - 1]}`, title: `Week of ${fmtDate(d)}` }); return out; }
  let first = t.slice(0, 4) + '-01';
  const last = ui.period === 'year' ? t.slice(0, 4) + '-12' : t.slice(0, 7);
  if (ui.period === 'all') first = [...db.projects.map(dayOf), ...db.expenses.map(x => x.date), ...db.retainers.flatMap(paidMonths)].map(v => String(v).slice(0, 7)).filter(v => /^\d{4}-\d{2}$/.test(v) && v <= last).sort()[0] || first;
  const months = []; for (let mk = first; mk <= last; mk = addMonths(mk + '-01', 1).slice(0, 7)) months.push(mk);
  if (months.length > 24) { for (let y = +first.slice(0, 4); y <= +last.slice(0, 4); y++) out.push({ from: y + '-01-01', to: y + '-12-31', label: String(y), title: String(y) }); return out; }
  return months.map((mk, i) => ({ from: mk + '-01', to: monthEnd(mk), label: MONTHS[+mk.slice(5) - 1] + (ui.period === 'all' && (i === 0 || mk.endsWith('-01')) ? ' ’' + mk.slice(2, 4) : ''), title: monthName(mk) }));
}
const bucketUnit = bks => (ui.period === 'month' ? 'Day' : ui.period === '3m' ? 'Week' : bks.length && bks[0].from.endsWith('-01-01') && bks[0].to.endsWith('-12-31') ? 'Year' : 'Month');
// Chart width in real pixels, so axis text stays 11px on a phone and on a wide screen.
const chartW = half => { const full = Math.min(innerWidth, 1240) - 70; return Math.max(280, Math.round(half && innerWidth > 960 ? (full - 18) / 2 : full)); };
const niceStep = x => { const p = Math.pow(10, Math.floor(Math.log10(x || 1))), m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
// Columns on one axis. series: [{ k, name, color }] side by side, or stacked with opts.stack; opts.line adds a 2px line (profit).
function columnChart(bks, series, opts = {}) {
  const W = opts.w || chartW(), H = opts.h || 240, L = 44, R = 8, T = 12, B = 26, n = bks.length, cw = (W - L - R) / Math.max(1, n);
  const axis = opts.axis || nf, tip = opts.tip || nf, val = (b, k) => b.v[k] || 0;
  const tops = bks.map(b => (opts.stack ? series.reduce((sum, x) => sum + val(b, x.k), 0) : Math.max(0, ...series.map(x => val(b, x.k)))));
  // Past 16 slices a line turns into noise; it stays in the hover text.
  const drawLine = opts.line && n <= 16, lv = drawLine ? bks.map(b => val(b, opts.line.k)) : [];
  const step = niceStep((Math.max(1, ...tops, ...lv) - Math.min(0, ...lv)) / 4);
  const hi = Math.ceil(Math.max(1, ...tops, ...lv) / step) * step, lo = Math.floor(Math.min(0, ...lv) / step) * step;
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const groups = opts.stack ? 1 : series.length, bw = Math.min(24, Math.max(2, (cw * 0.72 - (groups - 1) * 2) / groups));
  const col = (x, y0, y1, w, c, round) => { const r = round ? Math.min(4, w / 2, y0 - y1) : 0; return `<path d="M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z" fill="${c}"/>`; };
  const every = n <= 8 ? 1 : Math.ceil(n / Math.max(4, Math.floor(W / 64)));
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  let marks = '';
  bks.forEach((b, i) => {
    const cx = L + i * cw + cw / 2;
    if (opts.stack) {
      let cum = 0; const last = series.map(x => val(b, x.k)).reduce((m, v, j) => (v ? j : m), -1);
      series.forEach((x, j) => { const v = val(b, x.k); if (!v) return; const y0 = cum ? y(cum) - 2 : y(0), y1 = y(cum + v); cum += v; if (y0 - y1 >= 1) marks += col(cx - bw / 2, y0, y1, bw, x.color, j === last); });
    } else series.forEach((x, j) => { const v = val(b, x.k); if (v > 0) marks += col(cx - (groups * bw + (groups - 1) * 2) / 2 + j * (bw + 2), y(0), y(v), bw, x.color, true); });
    if (i % every === 0) marks += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(b.label)}</text>`;
    marks += `<rect class="hit" x="${L + i * cw}" y="${T}" width="${cw}" height="${H - T - B}"><title>${esc(b.title)}${series.concat(opts.line ? [opts.line] : []).map(x => `\n${x.name} ${tip(val(b, x.k))}`).join('')}</title></rect>`;
  });
  const line = drawLine ? `<polyline points="${bks.map((b, i) => `${L + i * cw + cw / 2},${y(val(b, opts.line.k))}`).join(' ')}" fill="none" stroke="var(--fg)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>
    ${bks.map((b, i) => `<circle cx="${L + i * cw + cw / 2}" cy="${y(val(b, opts.line.k))}" r="4" fill="var(--fg)" stroke="var(--panel)" stroke-width="2" pointer-events="none"/>`).join('')}` : '';
  const keys = series.concat(drawLine ? [{ ...opts.line, line: true }] : []);
  return `${keys.length > 1 ? `<div class="legend chart-key">${keys.map(x => `<span><i ${x.line ? 'class="ln"' : `style="background:${x.color}"`}></i>${esc(x.name)}</span>`).join('')}</div>` : ''}
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || '')}">
    <g class="grid">${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" ${v === 0 && lo < 0 ? 'class="zero"' : ''}/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${axis(v)}</text>`).join('')}</g>
    ${marks}${line}</svg>`;
}
// One bar split into parts that add up to a whole, with a key underneath.
function stackBar(parts, empty, fmt = nf) {
  const tot = parts.reduce((sum, x) => sum + x.v, 0);
  if (!tot) return `<div class="empty">${empty}</div>`;
  const pc = v => Math.round(v / tot * 100) + '%';
  return `<div class="sbar" role="img" aria-label="${esc(parts.map(x => `${x.name} ${fmt(x.v)}`).join(', '))}">${parts.filter(x => x.v).map(x => `<i style="flex:${x.v};background:${x.c}" title="${esc(x.name)}: ${fmt(x.v)} (${pc(x.v)})"></i>`).join('')}</div>
    <div class="skey">${parts.map(x => `<div><i style="background:${x.c}"></i><span>${esc(x.name)}</span><b>${fmt(x.v)}</b><small>${pc(x.v)}</small></div>`).join('')}</div>`;
}
const PERIODS = { month: 'This month', '3m': '3 months', year: 'This year', all: 'All time' };
const MTABS = { report: 'Report', charts: 'Charts', docs: 'Invoices & quotes', expenses: 'Expenses', team: 'Team' };
// Money: the report, plus invoices & quotes, expenses and team as sub-tabs (#money/docs, #money/expenses, #money/team).
function renderMoney() {
  const tab = MTABS[ui.mtab] ? ui.mtab : 'report', dated = ['report', 'charts', 'expenses'].includes(tab);
  const [eyebrow, body] = { report: moneyReport, charts: chartsBody, docs: docsBody, expenses: expensesBody, team: teamBody }[tab]();
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${eyebrow}</p><h1>Mo<span class="o">ney</span></h1></div>
    ${dated ? `<div class="vacts"><div class="seg" role="group" aria-label="Period">${Object.entries(PERIODS).map(([key, v]) => `<button data-period="${key}" aria-pressed="${ui.period === key}">${v}</button>`).join('')}</div>
    ${tab === 'charts' ? '' : '<button class="btn primary sm" data-exp-new>+ Add expense</button>'}</div>` : ''}</div>
  <nav class="tabs" aria-label="Money">${Object.entries(MTABS).map(([k, v]) => `<a href="#money${k === 'report' ? '' : '/' + k}" ${k === tab ? 'aria-current="page"' : ''}>${v}</a>`).join('')}</nav>
  ${body}`;
  if (tab === 'docs') $('#dq').addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('#dlist .doc-it').forEach(r => { r.hidden = !r.textContent.toLowerCase().includes(q); }); });
}
const moneyChart = (bks, w) => columnChart(bks, [{ k: 'rev', name: 'Revenue', color: 'var(--accent)' }, { k: 'exp', name: 'Spent', color: '#ffffff40' }],
  { line: { k: 'prof', name: 'Profit' }, axis: kf, tip: money, label: 'Revenue, spending and profit', w });
const GRAY = '#ffffff40', GRAY2 = '#ffffff1c';
// Charts: the whole business at a glance, for the chosen period. Money, shoots, bookings, clients, deliveries, posting.
function chartsBody() {
  const [from, to] = periodRange(), t = today(), per = PERIODS[ui.period], half = chartW(true);
  const inRange = d => d && d >= from && d <= to;
  const bks = periodBuckets();
  const live = db.projects.filter(p => p.status !== 'Cancelled' && p.status !== 'Inquiry' && inRange(p.date));
  const paidP = live.filter(p => !p.marketing), st = moneyStats(from, to);
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const count = (rows, keyOf) => { const m = {}; rows.forEach(r => { const k = keyOf(r) || 'Not recorded'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const fold = (rows, max = 7) => (rows.length > max ? rows.slice(0, max - 1).concat([['Other', rows.slice(max - 1).reduce((s, r) => s + r[1], 0)]]) : rows);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  // Who is new: a client's first ever shoot falls in this slice.
  const firsts = new Map([...clientMap().values()].map(c => [c.key, c.projects.filter(p => p.status !== 'Cancelled' && p.status !== 'Inquiry').map(p => p.date).filter(Boolean).sort()[0] || '']));
  const slice = bks.map(b => {
    const ps = live.filter(p => p.date >= b.from && p.date <= b.to), m = moneyStats(b.from, b.to);
    const keys = [...new Set(ps.filter(p => !p.marketing).map(clientKey).filter(Boolean))];
    const fresh = keys.filter(k => { const f = firsts.get(k); return f >= b.from && f <= b.to; }).length;
    return { ...b, v: { rev: m.revenue, exp: m.spent, prof: m.profit, paid: ps.filter(p => !p.marketing).length, free: ps.filter(p => p.marketing).length, fresh, back: keys.length - fresh } };
  });
  const newC = slice.reduce((s, b) => s + b.v.fresh, 0), backC = slice.reduce((s, b) => s + b.v.back, 0);
  const days = DAYS.map((d, i) => ({ label: d, title: d, v: { n: live.filter(p => parseDay(p.date).getDay() === i).length } }));
  const LEAD = [['< 1 wk', 'Under a week', 0, 6], ['1–2 wk', '1 to 2 weeks', 7, 13], ['2–4 wk', '2 to 4 weeks', 14, 29], ['1–3 mo', '1 to 3 months', 30, 89], ['3+ mo', '3 months or more', 90, 1e9]];
  const leads = live.filter(p => /^\d{4}-\d{2}-\d{2}/.test(p.created) && p.created.slice(0, 10) <= p.date).map(p => daysBetween(p.created.slice(0, 10), p.date));
  const leadB = LEAD.map(([label, title, a, b]) => ({ label, title, v: { n: leads.filter(d => d >= a && d <= b).length } }));
  const created = db.projects.filter(p => inRange(String(p.created).slice(0, 10)));
  const won = created.filter(p => !['Inquiry', 'Cancelled'].includes(p.status)).length;
  const stages = ['Inquiry', 'Booked', 'Shot', 'Editing'].map(sg => ({ k: sg, v: db.projects.filter(p => p.status === sg).length }))
    .concat([{ k: 'Delivered', v: db.projects.filter(p => p.status === 'Delivered' && inRange(p.date)).length, sub: per }]);
  const its = db.items.filter(i => live.some(p => p.id === i.projectId));
  const lateN = its.filter(i => i.status !== 'Delivered' && i.due && i.due < t).length;
  const byItem = {}; its.forEach(i => { const k = i.type || i.title || 'Other'; byItem[k] = byItem[k] || { n: 0, q: 0 }; byItem[k].n++; byItem[k].q += i.qty; });
  const done = live.filter(p => p.status === 'Delivered'), posted = done.filter(p => p.posted).length;
  const free = live.filter(p => p.marketing), freePosted = free.filter(p => p.posted).length;
  const typeRev = {}; paidP.forEach(p => { typeRev[p.type || 'Other'] = (typeRev[p.type || 'Other'] || 0) + p.price; });
  const owed = paidP.reduce((sum, p) => sum + balance(p), 0);
  const panel = (title, sub, body, cls = '') => `<section class="panel ${cls}"><div class="ph"><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div>${body}</section>`;
  return [`${per} · ${plural(live.length, 'shoot')} · ${plural(newC, 'new client')}`, `
  <div class="kpis">
    <div class="kpi"><small>Shoots</small><b>${live.length}</b><em>${paidP.length} paid · ${free.length} free</em></div>
    <div class="kpi"><small>Revenue</small><b>${money(st.revenue)}</b><em>${pct(st.profit, st.revenue)}% kept as profit</em></div>
    <div class="kpi"><small>Clients</small><b>${newC + backC}</b><em>${newC} new · ${backC} came back</em></div>
    <div class="kpi"><small>Inquiries won</small><b>${pct(won, created.length)}%</b><em>${won} of ${plural(created.length, 'new project')}</em></div>
  </div>
  <h2 class="chart-h">Money</h2>
  ${panel('Revenue, spent &amp; profit', `${per} · by ${bucketUnit(bks).toLowerCase()}`, moneyChart(slice))}
  <div class="cols2">
    ${panel('Collected so far', `shoots ${per.toLowerCase()}`, stackBar([{ name: 'Collected', v: paidP.reduce((sum, p) => sum + Math.min(p.paid, p.price), 0), c: 'var(--accent)' }, { name: 'Still owed', v: owed, c: GRAY }], 'No paid shoots in this period', money))}
    ${panel('Revenue by shoot type', per, barList(Object.entries(typeRev).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, sub: `${plural(paidP.filter(p => (p.type || 'Other') === k).length, 'shoot')} · average ${money(v / paidP.filter(p => (p.type || 'Other') === k).length)}` })), 'No paid shoots in this period'))}
  </div>
  <h2 class="chart-h">Shoots &amp; bookings</h2>
  ${panel('Shoots', `${per} · by ${bucketUnit(bks).toLowerCase()}`, columnChart(slice, [{ k: 'paid', name: 'Paid', color: 'var(--accent)' }, { k: 'free', name: 'Free for your page', color: GRAY }], { stack: true, label: 'Shoots over time', h: 200 }))}
  <div class="cols2">
    ${panel('Pipeline right now', 'projects at each stage', barList(stages.map(x => ({ k: x.k, v: x.v, sub: x.sub || '', attr: 'data-go="projects/board" role="button" tabindex="0"' })), '', nf))}
    ${panel('Inquiries → bookings', `new projects ${per.toLowerCase()}`, stackBar([{ name: 'Booked', v: won, c: 'var(--accent)' }, { name: 'Still an inquiry', v: created.filter(p => p.status === 'Inquiry').length, c: GRAY }, { name: 'Cancelled', v: created.filter(p => p.status === 'Cancelled').length, c: GRAY2 }], 'No new projects in this period'))}
  </div>
  <div class="cols2">
    ${panel('Busiest days', `shoots by weekday · ${per.toLowerCase()}`, live.length ? columnChart(days, [{ k: 'n', name: 'Shoots', color: 'var(--accent)' }], { w: half, h: 190, label: 'Shoots by weekday' }) : '<div class="empty">No shoots in this period</div>')}
    ${panel('How far ahead clients book', 'from adding the booking to the shoot', leads.length ? columnChart(leadB, [{ k: 'n', name: 'Bookings', color: 'var(--accent)' }], { w: half, h: 190, label: 'Booking lead time' }) : '<div class="empty">No bookings with both dates in this period</div>')}
  </div>
  <div class="cols2">
    ${panel('Shoot types', per, barList(fold(count(live, p => p.type)).map(([k, v]) => ({ k, v, sub: pct(v, live.length) + '%' })), 'No shoots in this period', nf))}
    ${panel('Where clients come from', per, barList(fold(count(live, p => p.source)).map(([k, v]) => ({ k, v, sub: pct(v, live.length) + '%' })), 'No shoots in this period', nf))}
  </div>
  <h2 class="chart-h">Clients</h2>
  ${panel('New and returning clients', `${per} · by ${bucketUnit(bks).toLowerCase()}`, columnChart(slice, [{ k: 'fresh', name: 'New', color: 'var(--accent)' }, { k: 'back', name: 'Came back', color: GRAY }], { stack: true, label: 'New and returning clients', h: 200 }))}
  <h2 class="chart-h">Deliveries &amp; posting</h2>
  <div class="cols2">
    ${panel('Deliverables', `for shoots ${per.toLowerCase()}${lateN ? ` · <span class="warn-t">${lateN} late</span>` : ''}`, stackBar(ITEM_STATUSES.slice().reverse().map(sg => ({ name: sg, v: its.filter(i => i.status === sg).length, c: { Delivered: 'var(--ok)', Editing: 'var(--warn)', Pending: GRAY }[sg] })), 'Nothing listed to deliver for shoots in this period'))}
    ${panel('What you deliver most', per, barList(Object.entries(byItem).sort((a, b) => b[1].n - a[1].n).slice(0, 7).map(([k, o]) => ({ k, v: o.n, sub: `${o.q.toLocaleString('en-US')} in total` })), 'Nothing listed to deliver for shoots in this period', nf))}
  </div>
  <div class="cols2">
    ${panel('Posted on your page', `delivered shoots ${per.toLowerCase()}`, stackBar([{ name: 'Posted', v: posted, c: 'var(--accent)' }, { name: 'Not posted yet', v: done.length - posted, c: GRAY }], 'No delivered shoots in this period'))}
    ${panel('Free shoots posted', per.toLowerCase(), stackBar([{ name: 'Posted', v: freePosted, c: 'var(--accent)' }, { name: 'Not posted yet', v: free.length - freePosted, c: GRAY }], 'No free shoots in this period'))}
  </div>`];
}
function moneyReport() {
  const [from, to] = periodRange();
  const st = moneyStats(from, to);
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const owed = db.projects.filter(p => p.status !== 'Cancelled' && !p.marketing && balance(p) > 0).sort((a, b) => balance(b) - balance(a));
  const owedTotal = owed.reduce((s, p) => s + balance(p), 0) + db.retainers.filter(retDue).reduce((s, r) => s + r.fee, 0);

  // Revenue and spending as columns, profit as a line, on one axis, sliced to fit the period.
  const series = periodBuckets().map(b => { const m = moneyStats(b.from, b.to); return { ...b, v: { rev: m.revenue, exp: m.spent, prof: m.profit } }; });
  const svg = moneyChart(series);
  const unit = bucketUnit(series);

  // Where the money goes
  const cats = {};
  st.ledger.forEach(x => { cats[x.category] = (cats[x.category] || { v: 0, n: 0 }); cats[x.category].v += x.amount; cats[x.category].n++; });
  const spendRows = [
    st.team && { k: 'Team', v: st.team, sub: `${pct(st.team, st.spent)}% of spending · see Team →`, attr: 'data-go="money/team" role="button" tabindex="0"' },
    ...Object.entries(cats).map(([c, o]) => ({ k: c, v: o.v, sub: `${pct(o.v, st.spent)}% · ${o.n} expense${o.n === 1 ? '' : 's'}` })),
    st.other && { k: 'Other project costs', v: st.other, sub: `${pct(st.other, st.spent)}% · entered inside projects` },
  ].filter(Boolean).sort((a, b) => b.v - a.v);

  // Clients, sources, types, team
  const group = (keyOf, rows) => { const m = {}; rows.forEach(p => { const key = keyOf(p) || 'Unknown'; m[key] = m[key] || { v: 0, n: 0, prof: 0 }; m[key].v += p.price; m[key].n++; m[key].prof += profit(p); }); return Object.entries(m).sort((a, b) => b[1].v - a[1].v); };
  const clients = group(p => p.client, st.paidP).slice(0, 8);
  const sources = group(p => p.source, st.paidP);
  const types = group(p => p.type, st.paidP).map(([t, o]) => ({ k: t, v: o.v, sub: `${o.n} project${o.n === 1 ? '' : 's'} · profit ${money(o.prof)} · ${pct(o.prof, o.v)}% margin` }));
  if (st.retIn) types.push({ k: 'Social retainers', v: st.retIn, sub: `${st.retPaid.length} paid month${st.retPaid.length === 1 ? '' : 's'}` });
  types.sort((a, b) => b.v - a.v);
  const people = {};
  st.live.forEach(p => crewOf(p.id).forEach(c => { const key = c.name || c.role; people[key] = people[key] || { v: 0, n: 0, roles: new Set() }; people[key].v += c.fee; people[key].n++; people[key].roles.add(c.role); }));
  const avg = st.paidP.length ? st.paidP.reduce((s, p) => s + p.price, 0) / st.paidP.length : 0;
  const per = PERIODS;
  ui.moneySeries = series;
  return [`${per[ui.period]} · ${st.paidP.length} paid project${st.paidP.length === 1 ? '' : 's'} · average ${money(avg)}`, `
  <div class="kpis">
    <div class="kpi"><small>Revenue</small><b>${money(st.revenue)}</b><em>collected ${money(st.collected)} · ${pct(st.collected, st.revenue)}%</em></div>
    <div class="kpi"><small>Spent</small><b>${money(st.spent)}</b><em>team ${money(st.team)} · other ${money(st.spent - st.team)}</em></div>
    <div class="kpi"><small>Profit</small><b class="acc">${money(st.profit)}</b><em>${pct(st.profit, st.revenue)}% margin</em></div>
    <button class="kpi" data-jump="m-collect"><small>Still to collect</small><b>${money(owedTotal)}</b><em>${owed.length} client${owed.length === 1 ? '' : 's'} owe you</em></button>
  </div>
  <section class="panel" id="m-collect">${collectPanel()}</section>
  <section class="panel"><div class="ph"><h2>Revenue, spent &amp; profit</h2><small>${per[ui.period]} · by ${unit.toLowerCase()}</small></div>${svg}
    <p class="fine">Hover a ${unit.toLowerCase()} to see its numbers. More charts under <a class="linkbtn" href="#money/charts">Charts</a>.</p></section>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>Where the money goes</h2><small>${money(st.spent)} · ${per[ui.period]}</small></div>
      ${barList(spendRows, 'No spending in this period. Log rentals, AI tools, editing and more with “+ Add expense”.')}</section>
    <section class="panel"><div class="ph"><h2>${unit} by ${unit.toLowerCase()}</h2><button class="linkbtn" data-money-csv>Download CSV</button></div>
      <div class="tbl rep"><table><thead><tr><th>${unit}</th><th class="n">Revenue</th><th class="n">Spent</th><th class="n">Profit</th></tr></thead><tbody>
      ${series.filter(s => s.v.rev || s.v.exp).reverse().map(s => `<tr><td>${esc(s.title)}</td><td class="n">${nf(s.v.rev)}</td><td class="n">${nf(s.v.exp)}</td><td class="n ${s.v.prof < 0 ? 'neg' : ''}">${nf(s.v.prof)}</td></tr>`).join('') || '<tr><td colspan="4" class="fine">Nothing in this period yet.</td></tr>'}
      <tr class="tot"><td>${per[ui.period]}</td><td class="n">${nf(series.reduce((a, s) => a + s.v.rev, 0))}</td><td class="n">${nf(series.reduce((a, s) => a + s.v.exp, 0))}</td><td class="n">${nf(series.reduce((a, s) => a + s.v.prof, 0))}</td></tr></tbody></table></div>
      <p class="fine">Amounts in ${esc(setting('currency'))}.</p></section>
  </div>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>Best clients</h2><small>by revenue · ${per[ui.period]}</small></div>
      ${barList(clients.map(([c, o]) => ({ k: c, v: o.v, sub: `${o.n} project${o.n === 1 ? '' : 's'} · profit ${money(o.prof)}`, attr: `data-client-open="${esc(c)}" role="button" tabindex="0"` })), 'No paid projects in this period')}</section>
    <section class="panel"><div class="ph"><h2>Where clients come from</h2><small>${per[ui.period]}</small></div>
      ${barList(sources.map(([c, o]) => ({ k: c === 'Unknown' ? 'Not recorded' : c, v: o.v, sub: `${o.n} project${o.n === 1 ? '' : 's'}` })), 'No paid projects in this period')}</section>
  </div>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>By shoot type</h2><small>${per[ui.period]}</small></div>${barList(types, 'No paid projects in this period')}</section>
    <section class="panel"><div class="ph"><h2>Team spending</h2><a class="linkbtn" href="#money/team">Team →</a></div>
      ${barList(Object.entries(people).sort((a, b) => b[1].v - a[1].v).map(([n, o]) => ({ k: n, v: o.v, sub: `${[...o.roles].join(', ')} · ${o.n} job${o.n === 1 ? '' : 's'}` })), 'No team costs in this period. Add who worked with you inside each project.')}</section>
  </div>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>Latest expenses</h2><a class="linkbtn" href="#money/expenses">${st.ledger.length} · All expenses →</a></div>
      ${st.ledger.length ? expenseList(st.ledger.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))
        : '<div class="empty"><b>No expenses logged</b>Rentals, AI tools, editing, travel, subscriptions… add them to see where your money goes.</div>'}</section>
    <section class="panel"><div class="ph"><h2>Pay your team</h2><a class="linkbtn" href="#money/team">Team →</a></div>
      ${(() => { const pay = alerts().filter(a => a.g === 'Pay your team'); return pay.length ? renderAlerts(pay) : '<p class="allclear">Your team is fully paid.</p>'; })()}</section>
  </div>`];
}
const expenseList = rows => `<div class="mini">${rows.map(x => { const p = project(x.projectId); return `<div class="mini-it" data-exp-open="${x.id}" role="button" tabindex="0"><div><b>${esc(x.note || x.category)}</b><small>${fmtDate(x.date)} · <span class="tag t-mute">${esc(x.category)}</span>${p ? ' · ' + esc(p.title) : ''}</small></div><div class="r"><b>${money(x.amount)}</b></div></div>`; }).join('')}</div>`;
function expensesBody() {
  const [from, to] = periodRange();
  const st = moneyStats(from, to), rows = st.ledger.slice().sort((a, b) => b.date.localeCompare(a.date));
  const cats = {};
  rows.forEach(x => { cats[x.category] = cats[x.category] || { v: 0, n: 0 }; cats[x.category].v += x.amount; cats[x.category].n++; });
  const general = rows.filter(x => !x.projectId).reduce((s, x) => s + x.amount, 0);
  return [`${PERIODS[ui.period]} · ${rows.length} expense${rows.length === 1 ? '' : 's'} logged`, `
  <div class="kpis">
    <div class="kpi"><small>Logged</small><b class="acc">${money(st.logged)}</b><em>${rows.length} expense${rows.length === 1 ? '' : 's'}</em></div>
    <div class="kpi"><small>For shoots</small><b>${money(st.logged - general)}</b><em>linked to a project</em></div>
    <div class="kpi"><small>General business</small><b>${money(general)}</b><em>tools, gear, subscriptions…</em></div>
    <div class="kpi"><small>All spending</small><b>${money(st.spent)}</b><em>with team and project costs</em></div>
  </div>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>Expenses</h2><small>${PERIODS[ui.period]}</small></div>
      ${rows.length ? expenseList(rows) : '<div class="empty"><b>No expenses logged</b>Rentals, AI tools, editing, travel, subscriptions… add them with “+ Add expense”.</div>'}</section>
    <section class="panel"><div class="ph"><h2>By category</h2><small>${money(st.logged)}</small></div>
      ${barList(Object.entries(cats).sort((a, b) => b[1].v - a[1].v).map(([c, o]) => ({ k: c, v: o.v, sub: `${o.n} expense${o.n === 1 ? '' : 's'}` })), 'Nothing in this period')}</section>
  </div>`];
}
function exportMoneyCsv() {
  const rows = [[bucketUnit(ui.moneySeries || []), 'Revenue', 'Spent', 'Profit']].concat((ui.moneySeries || []).map(s => [`"${s.title}"`, s.v.rev, s.v.exp, s.v.prof]));
  download(`studio-money-${today()}.csv`, '﻿' + rows.map(r => r.join(',')).join('\n'), 'text/csv');
}

// Log or edit an expense. Works on top of an open project too, and only closes itself.
function openExpense(id, preset, after) {
  const x = id ? { ...db.expenses.find(e => e.id === id) } : normX({ id: uid(), ...preset });
  if (!x.id) return;
  const m = $('#modal');
  const projects = db.projects.filter(p => p.status !== 'Cancelled').sort((a, b) => dayOf(b).localeCompare(dayOf(a))).slice(0, 60);
  m.innerHTML = `<form class="modal-card" id="xForm" autocomplete="off">
    <div class="ph" style="margin:0"><h2 id="modalTitle">${id ? 'Expense' : 'Add expense'}</h2><button type="button" class="x" data-xclose aria-label="Close">✕</button></div>
    <div class="grid2">
      <label class="field"><span>Amount (${esc(setting('currency'))})</span><input id="x-amount" type="number" inputmode="decimal" min="0" required value="${x.amount || ''}"></label>
      <label class="field"><span>Date</span><input id="x-date" type="date" value="${esc(x.date)}"></label>
      <label class="field"><span>Category</span><select id="x-category">${[...new Set([...list('expenseCats'), x.category])].map(c => `<option ${c === x.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="field"><span>For a project (optional)</span><select id="x-project"><option value="">General business expense</option>${projects.map(p => `<option value="${p.id}" ${p.id === x.projectId ? 'selected' : ''}>${esc(p.title || p.client)}${p.date ? ' · ' + fmtDate(p.date) : ''}</option>`).join('')}</select></label>
    </div>
    <label class="field"><span>What was it</span><input id="x-note" value="${esc(x.note)}" placeholder="e.g. Lens rental, Midjourney, editor for reel"></label>
    <div class="modal-acts">${id ? '<button type="button" class="btn sm danger" id="xDel" style="margin-right:auto">Delete</button>' : ''}<button type="button" class="btn ghost" data-xclose>Cancel</button><button type="submit" class="btn primary">${id ? 'Save' : 'Add expense'}</button></div>
  </form>`;
  const drawerOpen = !$('#drawer').hidden;
  if (drawerOpen) m.hidden = false; else showLayer(m);
  setTimeout(() => $('#x-amount')?.focus(), 50);
  const close = () => { if (drawerOpen) { m.hidden = true; m.innerHTML = ''; } else closeLayers(); };
  $$('[data-xclose]', m).forEach(b => { b.onclick = close; });
  $('#xForm').onsubmit = e => {
    e.preventDefault();
    const out = normX({ ...x, amount: $('#x-amount').value, date: $('#x-date').value, category: $('#x-category').value, projectId: $('#x-project').value, note: $('#x-note').value.trim() });
    if (!out.amount) { $('#x-amount').focus(); return; }
    saveRow('expenses', out); close(); if (after) after(); else render(); toast(`${money(out.amount)} · ${out.category} saved`);
  };
  const del = $('#xDel');
  if (del) del.onclick = () => {
    if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Tap again to delete'; return; }
    deleteRow('expenses', x.id); close(); if (after) after(); else render(); toast('Expense deleted');
  };
}

// Clients come straight from projects: anyone you add a booking for gets a profile automatically.
// The same person is matched by phone number first, then by name.
const clientKey = p => waNumber(p.phone) || p.client.trim().toLowerCase();
function clientMap() {
  const map = new Map();
  [...db.projects].sort((a, b) => dayOf(a).localeCompare(dayOf(b))).forEach(p => {
    const k = clientKey(p);
    if (!k) return;
    const c = map.get(k) || { key: k, name: p.client, phone: '', email: '', instagram: '', projects: [], n: 0, value: 0, paid: 0, owed: 0, first: dayOf(p), last: '', sources: new Set() };
    c.projects.push(p); c.n++;
    if (!p.marketing && p.status !== 'Cancelled') { c.value += p.price; c.paid += Math.min(p.paid, p.price || p.paid); c.owed += balance(p); }
    c.last = dayOf(p); if (p.client) c.name = p.client;
    if (p.phone) c.phone = p.phone; if (p.email) c.email = p.email; if (p.instagram) c.instagram = p.instagram; if (p.source) c.sources.add(p.source);
    map.set(k, c);
  });
  return map;
}
function renderClients() {
  const all = [...clientMap().values()].sort((a, b) => b.value - a.value || b.last.localeCompare(a.last));
  const F = { all: () => true, owes: c => c.owed > 0, back: c => c.n > 1 };
  const labels = { all: 'All', owes: 'Owe you', back: 'Came back' };
  const f = F[ui.cfilter] ? ui.cfilter : 'all';
  const rows = all.filter(F[f]);
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${all.length} clients · ${all.filter(F.back).length} came back</p><h1>Cli<span class="o">ents</span></h1></div></div>
  <div class="filters"><input type="search" id="cq" placeholder="Search name, phone, Instagram…" aria-label="Search clients" value="${esc(ui.cq || '')}"></div>
  <div class="chips" role="group" aria-label="Filter">${Object.keys(labels).map(k => `<button class="chip" data-cfilter="${k}" aria-pressed="${f === k}">${labels[k]}<span class="n">${all.filter(F[k]).length}</span></button>`).join('')}</div>
  <div class="rows" id="ctb">${rows.map(c => `<div class="row cl" data-client-open="${esc(c.key)}" role="button" tabindex="0" data-s="${esc((c.name + ' ' + c.phone + ' ' + c.instagram + ' ' + c.email).toLowerCase())}">
    <div class="main"><strong>${esc(c.name)}</strong><small>${[esc(c.phone), c.instagram && esc(c.instagram), `${c.n} project${c.n === 1 ? '' : 's'}`, c.last && 'last ' + fmtDate(c.last)].filter(Boolean).join(' · ')}</small></div>
    <div class="acts">${waNumber(c.phone) ? `<a class="btn sm wa" href="https://wa.me/${waNumber(c.phone)}" target="_blank" rel="noopener" data-stop>WhatsApp</a>` : ''}</div>
    <div class="money"><b>${money(c.value)}</b>${c.owed ? `<span class="tag t-bad">owes ${money(c.owed)}</span>` : c.value ? '<span class="tag t-ok">Paid up</span>' : ''}</div></div>`).join('') || '<div class="empty"><b>No clients here</b>Clients appear as soon as you add a booking for them.</div>'}</div>`;
  const filter = () => { const q = (ui.cq || '').toLowerCase(); $$('#ctb .row').forEach(r => { r.hidden = !r.dataset.s.includes(q); }); };
  $('#cq').addEventListener('input', e => { ui.cq = e.target.value; filter(); });
  filter();
}
// A client's profile: contact, money, every project, what's still to deliver, and their invoices & quotes.
function openClient(key) {
  const map = clientMap();
  const c = map.get(key) || [...map.values()].find(x => x.name === key);
  if (!c) return;
  const ids = c.projects.map(p => p.id);
  const open = db.items.filter(i => ids.includes(i.projectId) && i.status !== 'Delivered');
  const docs = db.docs.filter(d => ids.includes(d.projectId)).sort((a, b) => b.created.localeCompare(a.created));
  const wa = waNumber(c.phone), ig = c.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
  const projs = [...c.projects].reverse();
  const dr = $('#drawer');
  dr.innerHTML = `
  <div class="dr-head"><div class="t"><span class="code">Client · since ${fmtDate(c.first)}</span><h2 id="drawerTitle">${esc(c.name)}</h2>
    <div class="sub"><span class="tag t-info">${c.n} project${c.n === 1 ? '' : 's'}</span>${c.n > 1 ? '<span class="tag t-ok">Came back</span>' : ''}${c.owed ? `<span class="tag t-bad">Owes ${money(c.owed)}</span>` : ''}</div></div>
    <button class="x" data-close aria-label="Close">✕</button></div>
  <div class="dr-body">
    <section class="dr-sec"><h3>Contact</h3>
      <dl class="kv">
        <dt>Phone</dt><dd>${c.phone ? `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>` : '—'}</dd>
        <dt>Email</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</dd>
        <dt>Instagram</dt><dd>${ig ? `<a href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">@${esc(ig)}</a>` : '—'}</dd>
        <dt>Found you through</dt><dd>${c.sources.size ? [...c.sources].map(esc).join(', ') : '—'}</dd>
      </dl>
      <div class="wa-menu">${wa ? `<a class="btn sm wa" href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}<button type="button" class="btn sm" data-client-new="${esc(c.key)}">+ New booking for ${esc(c.name.split(' ')[0])}</button></div>
    </section>
    <section class="dr-sec"><h3>Money</h3>
      <div class="cl-stats"><div><small>Total work</small><b>${money(c.value)}</b></div><div><small>Paid you</small><b>${money(c.paid)}</b></div><div><small>Still owes</small><b class="${c.owed ? 'bad' : ''}">${money(c.owed)}</b></div></div>
    </section>
    <section class="dr-sec"><h3>Projects</h3>
      <div class="mini">${projs.map(p => `<div class="mini-it" data-open="${p.id}" role="button" tabindex="0"><div><b>${esc(p.title || p.type)}</b><small>${esc(p.code)} · ${p.date ? fmtDate(p.date) : 'no date'} · ${esc(p.type)}${p.marketing ? ' · free shoot' : ''}</small></div>
        <div class="r"><span class="tag ${STATUS_TAG[p.status]}">${p.status}</span>${balance(p) ? `<br><small class="late">owes ${money(balance(p))}</small>` : ''}</div></div>`).join('')}</div>
    </section>
    ${open.length ? `<section class="dr-sec"><h3>Still to deliver</h3><div class="mini">${open.map(i => `<div class="mini-it" data-open="${i.projectId}"><div><b>${esc(itemLabel(i))}</b><small>${esc(project(i.projectId).title)}${i.due ? ' · due ' + fmtDate(i.due) : ''}</small></div><div class="r"><span class="tag t-warn">${i.status}</span></div></div>`).join('')}</div></section>` : ''}
    <section class="dr-sec"><h3>Invoices &amp; quotes</h3>
      ${docs.length ? `<div class="mini">${docs.map(d => docRow(d)).join('')}</div>` : '<p class="fine">None yet. Open one of their projects and make one on its Invoices &amp; quotes tab.</p>'}
    </section>
  </div>
  <div class="dr-foot"><button type="button" class="btn sm ghost" data-client-projects="${esc(c.name)}">Show in Projects</button><span class="sp"></span></div>`;
  showLayer(dr);
}

// Everything still owed to clients, grouped by project, so it can be worked through without opening each project.
function deliverGroups() {
  const t = today();
  return db.projects.filter(p => p.status !== 'Cancelled').map(p => {
    const its = itemsOf(p.id), open = its.filter(i => i.status !== 'Delivered');
    const shotOrEditing = ['Shot', 'Editing'].includes(p.status);
    return {
      p, its, open, late: open.filter(i => i.due && i.due < t).length,
      next: open.map(i => i.due).filter(Boolean).sort()[0] || '',
      allDone: its.length > 0 && !open.length && shotOrEditing, empty: !its.length && shotOrEditing,
    };
  }).filter(g => g.open.length || g.allDone || g.empty)
    .sort((a, b) => (b.late > 0) - (a.late > 0) || (a.next || '9999').localeCompare(b.next || '9999') || dayOf(a.p).localeCompare(dayOf(b.p)));
}
function deliverItem(i) {
  const t = today(), done = i.status === 'Delivered', late = !done && i.due && i.due < t;
  const hint = !i.due ? 'set a due date' : done ? '' : late ? `${daysBetween(i.due, t)} days late` : i.due === t ? 'due today' : i.due === addDays(t, 1) ? 'due tomorrow' : `in ${daysBetween(t, i.due)} days`;
  const when = `<input type="date" class="dl-date" data-item-due="${i.id}" value="${esc(i.due)}" aria-label="Due date"><small>${hint}</small>`;
  return `<div class="dl-it ${late ? 'late' : ''} ${done ? 'done' : ''}">
    <button class="dl-check" type="button" data-item-st="${i.id}" data-to="${done ? 'Pending' : 'Delivered'}" aria-label="${done ? 'Mark not delivered' : 'Mark delivered'}: ${esc(itemLabel(i))}">${done ? '✓' : ''}</button>
    <div class="main"><b>${esc(itemLabel(i))}</b><small>${i.type && i.title && i.type !== i.title ? esc(i.type) : ''}${i.notes ? (i.type && i.title && i.type !== i.title ? ' · ' : '') + esc(i.notes) : ''}</small></div>
    <span class="steps" role="group" aria-label="Status">${ITEM_STATUSES.map(s => `<button type="button" data-item-st="${i.id}" data-to="${s}" class="${s === i.status ? 'cur' : ITEM_STATUSES.indexOf(s) < ITEM_STATUSES.indexOf(i.status) ? 'done' : ''}" aria-pressed="${s === i.status}">${s}</button>`).join('')}</span>
    <div class="due">${when}</div></div>`;
}
// Deliveries on Today: late and due this week by default, grouped by project, with inline status steps.
function deliverSection() {
  const t = today(), week = addDays(t, 7);
  const F = { soon: i => i.due && i.due <= week, nodate: i => !i.due, all: () => true };
  const f = F[ui.dfilter] ? ui.dfilter : 'soon', keep = F[f];
  const groups = deliverGroups();
  const open = groups.flatMap(g => g.open);
  const counts = Object.fromEntries(Object.keys(F).map(k => [k, open.filter(F[k]).length]));
  const labels = { soon: 'Late & this week', nodate: 'No date', all: 'Everything' };
  const shown = groups.map(g => ({ ...g, show: (ui.dShowDone ? g.its : g.open).filter(i => i.status === 'Delivered' || keep(i)) }))
    .filter(g => g.show.some(i => i.status !== 'Delivered') || (f !== 'nodate' && (g.allDone || g.empty)));
  const typeOpts = list('itemTypes').map(o => `<option>${esc(o)}</option>`).join('');
  return `<div class="ph"><h2>Deliveries</h2><small>${open.length} left for ${groups.filter(g => g.open.length).length} project${groups.filter(g => g.open.length).length === 1 ? '' : 's'}</small></div>
  <div class="chips" role="group" aria-label="Filter">${Object.keys(labels).map(k => `<button class="chip" data-dfilter="${k}" aria-pressed="${f === k}">${labels[k]}<span class="n">${counts[k]}</span></button>`).join('')}
    <button class="chip" data-dshowdone aria-pressed="${!!ui.dShowDone}">Show delivered</button></div>
  ${shown.length ? `<div class="dl-groups">${shown.map(({ p, its, open: left, show, allDone, empty }) => {
    const done = its.length - left.length;
    return `<div class="dl-group">
      <div class="dl-head" data-open="${p.id}" data-ptab="items" role="button" tabindex="0"><div><b>${esc(p.title || p.client)}</b><small>${esc(p.client)} · ${p.date ? 'shot ' + fmtDate(p.date) : 'no shoot date'} · ${p.status}</small></div>
        ${its.length ? `<div class="dl-prog"><span>${done} of ${its.length} delivered</span><div class="track"><i style="width:${(done / its.length * 100).toFixed(0)}%"></i></div></div>` : ''}</div>
      ${show.length ? `<div class="dl-list">${show.map(deliverItem).join('')}</div>` : ''}
      ${allDone ? `<div class="dl-done">Everything is delivered. <button class="btn sm" data-status="${p.id}" data-to="Delivered">Close project as Delivered</button>${waBtn(p, 'ready', 'Send “files ready”')}</div>` : ''}
      ${empty ? '<p class="fine">Nothing listed yet. Add what you owe this client so nothing is forgotten.</p>' : ''}
      ${f === 'all' || empty ? `<form class="dl-add" data-add-item="${p.id}" autocomplete="off"><select name="type" aria-label="Type">${typeOpts}</select>
        <input name="title" placeholder="Add something to deliver…" aria-label="What to deliver"><input name="qty" type="number" inputmode="numeric" min="1" value="1" aria-label="How many">
        <button class="btn sm" type="submit">Add</button></form>` : ''}
    </div>`; }).join('')}</div>`
    : `<p class="allclear">${f === 'soon' ? 'Nothing late or due this week.' : f === 'nodate' ? 'Every deliverable has a date.' : 'Nothing is waiting to be delivered. Well done.'}</p>`}`;
}

function teamBody() {
  const live = db.crew.filter(c => { const p = project(c.projectId); return p && p.status !== 'Cancelled'; });
  const unpaid = live.filter(c => !c.paidOn && c.fee).sort((a, b) => dayOf(project(a.projectId)).localeCompare(dayOf(project(b.projectId))));
  const y = today().slice(0, 4);
  const people = new Map();
  live.forEach(c => {
    const k = (c.name || c.role).trim().toLowerCase(), p = project(c.projectId);
    const m = people.get(k) || { name: c.name || c.role, roles: new Set(), n: 0, paid: 0, owed: 0, last: '' };
    m.roles.add(c.role); m.n++;
    if (c.paidOn) m.paid += c.fee; else m.owed += c.fee;
    if (dayOf(p) > m.last) m.last = dayOf(p);
    people.set(k, m);
  });
  const rows = [...people.values()].sort((a, b) => b.owed - a.owed || b.n - a.n);
  const owedTotal = unpaid.reduce((s, c) => s + c.fee, 0);
  return [`${rows.length} ${rows.length === 1 ? 'person' : 'people'} worked with you`, `
  <div class="kpis">
    <div class="kpi"><small>You owe your team</small><b class="acc">${money(owedTotal)}</b><em>${unpaid.length} unpaid job${unpaid.length === 1 ? '' : 's'}</em></div>
    <div class="kpi"><small>Paid this year</small><b>${money(live.filter(c => c.paidOn.startsWith(y)).reduce((s, c) => s + c.fee, 0))}</b><em>to your team in ${y}</em></div>
    <div class="kpi"><small>Team cost, all time</small><b>${money(live.reduce((s, c) => s + c.fee, 0))}</b><em>${live.length} job${live.length === 1 ? '' : 's'}</em></div>
    <div class="kpi"><small>People</small><b>${rows.length}</b><em>${rows.filter(r => r.n > 1).length} worked with you more than once</em></div>
  </div>
  <section class="panel"><div class="ph"><h2>Still to pay</h2><small>${money(owedTotal)}</small></div>
    ${unpaid.length ? `<div class="mini">${unpaid.map(c => { const p = project(c.projectId); return `<div class="mini-it" data-open="${p.id}"><div><b>${esc(c.name || c.role)} · ${money(c.fee)}</b><small>${esc(c.role)} · ${esc(p.title)} · ${p.date ? fmtDate(p.date) : 'no date'} · ${p.status}</small></div><div class="r"><button class="btn sm" data-crew-paid="${c.id}">Mark paid</button></div></div>`; }).join('')}</div>` : '<p class="allclear">Your team is fully paid.</p>'}</section>
  ${rows.length ? `<div class="tbl"><table><thead><tr><th>Name</th><th>Role</th><th class="n">Jobs</th><th class="n">Paid</th><th class="n">Still owed</th><th>Last job</th></tr></thead><tbody>
    ${rows.map(m => `<tr><td><b>${esc(m.name)}</b></td><td>${esc([...m.roles].join(', '))}</td><td class="n">${m.n}</td><td class="n">${money(m.paid)}</td>
      <td class="n">${m.owed ? `<span class="tag t-warn">${money(m.owed)}</span>` : '<span class="code">—</span>'}</td><td>${m.last ? fmtDate(m.last) : ''}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty"><b>No team yet</b>Open a project and add who worked with you on its Money tab, with what you pay them.</div>'}`];
}

function renderRetainers() {
  const mk = thisMonth();
  const act = db.retainers.filter(r => r.status === 'Active');
  const order = { Active: 0, Paused: 1, Cancelled: 2 };
  const rs = [...db.retainers].sort((a, b) => order[a.status] - order[b.status] || b.fee - a.fee);
  const plan = r => [r.posts && `${r.posts} posts`, r.reels && `${r.reels} reels`, r.stories && `${r.stories} stories`].filter(Boolean).join(' · ');
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">Monthly social media clients</p><h1>Retai<span class="o">ners</span></h1></div>
    <button class="btn primary" data-ret-new>+ New retainer</button></div>
  <div class="kpis">
    <div class="kpi"><small>Active</small><b>${act.length}</b><em>${db.retainers.length - act.length} paused or ended</em></div>
    <div class="kpi"><small>Monthly income</small><b class="acc">${money(act.reduce((s, r) => s + r.fee, 0))}</b><em>from active retainers</em></div>
    <div class="kpi"><small>${MONTHS[+mk.slice(5) - 1]} received</small><b>${money(retIncome(mk))}</b><em>${act.filter(retDue).length} still to pay this month</em></div>
    <div class="kpi"><small>Ad budget managed</small><b>${money(act.reduce((s, r) => s + r.adBudget, 0))}</b><em>per month</em></div>
  </div>
  ${rs.length ? `<div class="rows">${rs.map(r => {
    const paid = paidMonths(r).includes(mk);
    return `<div class="row ret ${r.status !== 'Active' ? 'cancelled' : ''}" data-ret-open="${r.id}" role="button" tabindex="0">
      <div class="main"><strong>${esc(r.client)}${r.brand ? ' · ' + esc(r.brand) : ''}</strong>
        <small>${esc(r.platforms)}${plan(r) ? ' · ' + plan(r) : ''}${r.nextReport ? ' · report ' + fmtDate(r.nextReport) : ''}${r.renewal ? ' · renews ' + fmtDate(r.renewal) : ''}</small></div>
      <div class="acts">${r.status === 'Active' ? (paid ? `<span class="tag t-ok">${MONTHS[+mk.slice(5) - 1]} paid</span>` : `${waRetBtn(r)}<button class="btn sm" data-ret-month="${r.id}" data-m="${mk}">Mark ${MONTHS[+mk.slice(5) - 1]} paid</button>`) : `<span class="tag t-mute">${r.status}</span>`}</div>
      <div class="money"><b>${money(r.fee)}</b><span class="code">per month</span></div>
    </div>`; }).join('')}</div>`
    : '<div class="empty"><b>No retainers yet</b>Add clients you manage social media for every month. You can track their monthly fee, content plan, reports and renewals.</div>'}`;
}

function openRetainer(id) {
  const isNew = !id;
  const r = isNew ? normR({ id: uid(), start: today(), nextReport: addMonths(today(), 1) }) : { ...db.retainers.find(x => x.id === id) };
  if (!r.id) return;
  const f = (k, label, type = 'text', ph = '') => `<label class="field"><span>${label}</span><input id="r-${k}" type="${type}" ${type === 'number' ? 'inputmode="decimal" min="0"' : ''} value="${esc(type === 'number' ? r[k] || '' : r[k])}" placeholder="${esc(ph)}"></label>`;
  // Last 6 months plus next month, newest first, so you can tick what was paid.
  const months = []; for (let k = 1; k >= -6; k--) months.push(addMonths(thisMonth() + '-01', k).slice(0, 7));
  let paid = paidMonths(r);
  const dr = $('#drawer');
  dr.innerHTML = `
  <div class="dr-head"><div class="t"><span class="code">Retainer${isNew ? ' · New' : ''}</span><h2 id="drawerTitle">${esc(r.client || 'New retainer')}</h2>
    <div class="sub"><span class="tag ${r.status === 'Active' ? 't-ok' : 't-mute'}">${r.status}</span></div></div>
    <button class="x" data-close aria-label="Close">✕</button></div>
  <form class="dr-body" id="rForm" autocomplete="off">
    <section class="dr-sec"><h3>Client</h3>
      <div class="grid2">${f('client', 'Name')}${f('brand', 'Brand / page')}${f('phone', 'Phone / WhatsApp', 'tel', '+971 5x xxx xxxx')}${f('instagram', 'Instagram', 'text', '@handle')}</div>
      ${f('platforms', 'Platforms', 'text', 'Instagram, TikTok, Facebook')}</section>
    <section class="dr-sec"><h3>Money</h3>
      <div class="grid2">${f('fee', `Monthly fee (${setting('currency')})`, 'number')}${f('adBudget', 'Ad budget / month', 'number')}</div>
      <div><span class="code">PAID MONTHS · tap to change</span><div class="chips" id="rMonths" style="margin-top:8px"></div></div></section>
    <section class="dr-sec"><h3>Content plan / month</h3>
      <div class="grid3">${f('posts', 'Posts', 'number')}${f('reels', 'Reels', 'number')}${f('stories', 'Stories', 'number')}</div>
      <label class="field"><span>Services included</span><textarea id="r-services" rows="3" placeholder="Content shooting, editing, captions, ads…">${esc(r.services)}</textarea></label></section>
    <section class="dr-sec"><h3>Dates</h3>
      <div class="grid3">${f('start', 'Started', 'date')}${f('nextReport', 'Next report', 'date')}${f('renewal', 'Renewal', 'date')}</div>
      <label class="field"><span>Status</span><select id="r-status">${R_STATUSES.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <label class="field"><span>Notes</span><textarea id="r-notes" rows="3">${esc(r.notes)}</textarea></label></section>
  </form>
  <div class="dr-foot"><button class="btn primary" id="rSave" type="button">${isNew ? 'Add retainer' : 'Save changes'}</button><span class="sp"></span>
    ${isNew ? '' : '<button class="btn sm danger" id="rDel" type="button">Delete</button>'}</div>`;
  showLayer(dr);
  const drawMonths = () => { $('#rMonths').innerHTML = months.map(m => `<button type="button" class="chip" data-rm-month="${m}" aria-pressed="${paid.includes(m)}">${MONTHS[+m.slice(5) - 1]} ${m.slice(2, 4)}</button>`).join(''); };
  drawMonths();
  $('#rMonths').onclick = e => { const b = e.target.closest('[data-rm-month]'); if (!b) return; const m = b.dataset.rmMonth; paid = paid.includes(m) ? paid.filter(x => x !== m) : paid.concat(m).sort(); drawMonths(); };
  const v = k => $('#r-' + k).value.trim();
  $('#rSave').onclick = () => {
    if (!v('client')) { $('#r-client').focus(); toast('Add the client name first', true); return; }
    const out = normR({ ...r, client: v('client'), brand: v('brand'), phone: v('phone'), instagram: v('instagram'), platforms: v('platforms'),
      fee: v('fee'), adBudget: v('adBudget'), posts: v('posts'), reels: v('reels'), stories: v('stories'), services: $('#r-services').value.trim(),
      start: v('start'), nextReport: v('nextReport'), renewal: v('renewal'), status: $('#r-status').value, notes: $('#r-notes').value.trim(),
      paidMonths: paid.join(','), updated: new Date().toISOString() });
    saveRow('retainers', out); closeLayers(); render(); toast(isNew ? 'Retainer added' : 'Saved');
  };
  const del = $('#rDel');
  if (del) del.onclick = () => {
    if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Tap again to delete'; return; }
    deleteRow('retainers', r.id); closeLayers(); render(); toast('Retainer deleted');
  };
}

function openMore() {
  const m = $('#modal');
  const link = (v, ic, label, sub) => `<a class="more-it" href="#${v}" data-more-go="${v}">${icon(ic)}<span><b>${label}</b><small>${sub}</small></span></a>`;
  m.innerHTML = `<div class="modal-card"><div class="ph" style="margin:0"><h2 id="modalTitle">More</h2><button type="button" class="x" data-close aria-label="Close">✕</button></div>
    <nav class="more">${link('retainers', 'repeat', 'Retainers', 'Monthly social media clients')}${link('settings', 'gear', 'Settings', 'Invoice details, lists, backup')}</nav>
    <p class="fine">Invoices &amp; quotes, expenses and your team are under Money.</p></div>`;
  showLayer(m);
}

function renderSettings() {
  const f = (k, label, type = 'text', ph = '') => `<label class="field"><span>${label}</span><input id="s-${k}" type="${type}" value="${esc(setting(k))}" placeholder="${esc(ph)}"></label>`;
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">Studio setup</p><h1>Set<span class="o">tings</span></h1></div></div>
  <div class="set-grid">
    <section class="panel stack"><h2>Connection</h2>
      <dl class="kv"><dt>Sheet link</dt><dd>${esc(cfg.url.replace(/(macros\/s\/.{6}).+(.{6}\/exec)/, '$1…$2'))}</dd><dt>Last sync</dt><dd>${lastSync ? new Date(lastSync).toLocaleString() : 'Never'}</dd><dt>Waiting to save</dt><dd>${queue.length}</dd></dl>
      <div class="modal-acts" style="justify-content:flex-start"><button class="btn sm" id="sSync">Sync now</button><button class="btn sm danger" id="sOut">Disconnect this device</button></div>
      <p class="fine">Edit anything straight in the Google Sheet too. Press Sync to pull those changes in.</p></section>
    <section class="panel stack"><h2>Invoice & quotation details</h2>
      ${f('businessName', 'Business name')}${f('tagline', 'Tagline')}
      <div class="grid2">${f('email', 'Email', 'email')}${f('phone', 'Phone', 'tel')}</div>
      <div class="grid2">${f('address', 'Address')}${f('website', 'Website')}</div>
      <div class="grid2">${f('currency', 'Currency')}</div>
      <label class="field"><span>Payment details (bank / IBAN)</span><textarea id="s-payInfo">${esc(setting('payInfo'))}</textarea></label>
      <label class="field"><span>Note at the bottom of invoices</span><textarea id="s-invoiceNote">${esc(setting('invoiceNote'))}</textarea></label>
      <div class="grid2">${f('quoteDays', 'Quotations valid for (days)', 'number')}${f('quoteDeposit', 'Deposit to confirm (%)', 'number')}</div>
      <label class="field"><span>Note at the bottom of quotations</span><textarea id="s-quoteNote">${esc(setting('quoteNote'))}</textarea></label></section>
    <section class="panel stack"><h2>Lists & reminders</h2>
      <label class="field"><span>Shoot types (one per line)</span><textarea id="s-types" rows="7">${esc(setting('types'))}</textarea></label>
      <label class="field"><span>Where clients find you (one per line)</span><textarea id="s-sources" rows="5">${esc(setting('sources'))}</textarea></label>
      <label class="field"><span>Expense categories (one per line)</span><textarea id="s-expenseCats" rows="6">${esc(setting('expenseCats'))}</textarea></label>
      <label class="field"><span>Deliverable types (one per line)</span><textarea id="s-itemTypes" rows="6">${esc(setting('itemTypes'))}</textarea></label>
      <div class="grid2">${f('postDays', 'Remind to post free shoots after (days)', 'number')}${f('deliverDays', 'Usual delivery time (days after the shoot)', 'number')}</div></section>
    <section class="panel stack"><h2>Deliverables per shoot type</h2>
      <p class="fine">Added to every new booking of that type. One per line: <b>Photos</b>, <b>2 Reel</b> (how many), <b>Album +30</b> (due 30 days after the shoot; otherwise the usual delivery time). Leave empty to add nothing.</p>
      ${list('types').map((t, i) => `<label class="field"><span>${esc(t)}</span><textarea id="s-tpl-${i}" data-tpl="${esc(t)}" rows="3">${esc(tplText(t))}</textarea></label>`).join('')}</section>
    <section class="panel stack"><h2>Data</h2>
      <p class="fine">Import the projects from your old dashboard (its data.json file). This adds them to the Sheet; anything with the same ID is updated, not doubled.</p>
      <label class="btn sm" style="align-self:flex-start">Import old data.json<input type="file" id="sImport" accept=".json,application/json" hidden></label>
      <div class="modal-acts" style="justify-content:flex-start"><button class="btn sm" id="sCsv">Download CSV</button><button class="btn sm" id="sJson">Download backup</button></div></section>
  </div>
  <div class="modal-acts"><button class="btn primary" id="sSave">Save settings</button></div>`;
  $('#sSave').onclick = () => {
    const rows = Object.keys(DEFAULTS).map(k => ({ id: k, value: $('#s-' + k) ? $('#s-' + k).value.trim() : setting(k) }))
      .concat($$('[data-tpl]').map(el => ({ id: 'tpl:' + el.dataset.tpl, value: el.value.trim() })));
    rows.forEach(r => { const i = db.settings.findIndex(s => s.id === r.id); if (i === -1) db.settings.push(r); else db.settings[i] = r; });
    saveLocal(); push({ action: 'upsert', table: 'settings', rows }); toast('Settings saved');
  };
  $('#sSync').onclick = () => pull();
  $('#sOut').onclick = e => {
    const b = e.currentTarget;
    if (!b.classList.contains('arm')) { b.classList.add('arm'); b.textContent = 'Tap again to disconnect'; return; }
    store.del(CFG_KEY); store.del(CACHE_KEY); store.del(QUEUE_KEY); location.hash = ''; location.reload();
  };
  $('#sImport').onchange = e => importOld(e.target.files[0]);
  $('#sCsv').onclick = exportCsv;
  $('#sJson').onclick = () => download(`studio-backup-${today()}.json`, JSON.stringify(db, null, 2), 'application/json');
}

// ───────────────────────────── project drawer ─────────────────────────────
// One form, split into tabs: every field stays inside #pForm and is only hidden, so Save keeps all of them.
const PTABS = { overview: 'Overview', items: 'Deliverables', money: 'Money', docs: 'Invoices<span class="lg"> &amp; quotes</span>', notes: 'Notes' };
function openProject(id, preset, tab) {
  const isNew = !id;
  const p = isNew ? normP({ id: uid(), code: nextCode(), status: 'Booked', created: today(), ...preset }) : { ...project(id) };
  if (!p.id) return;
  let items = isNew ? (preset && preset._items) || [] : itemsOf(p.id).map(i => ({ ...i }));
  let crew = isNew ? [] : crewOf(p.id).map(c => ({ ...c }));
  const opt = (arr, v) => [...new Set([...arr, v].filter(Boolean))].map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const dr = $('#drawer');
  dr.innerHTML = `
  <div class="dr-head"><div class="t"><span class="code">${esc(p.code)}${isNew ? ' · New' : ''}</span><h2 id="drawerTitle">${esc(p.title || 'New booking')}</h2>
    <div class="sub" id="pSub"></div></div>
    <button class="x" data-close aria-label="Close">✕</button></div>
  ${isNew ? '' : `<nav class="tabs dr-tabs" role="tablist" aria-label="Project">${Object.entries(PTABS).map(([k, v]) => `<button type="button" role="tab" data-ptab-btn="${k}">${v}</button>`).join('')}</nav>`}
  <form class="dr-body" id="pForm" autocomplete="off">
    <section class="dr-sec" data-pt="overview" data-new><h3>Client ${isNew || !p.client ? '' : `<button type="button" class="linkbtn" data-client-open="${esc(clientKey(p))}">Profile ›</button>`}</h3>
      <div class="grid2"><label class="field"><span>Name</span><input id="f-client" list="dl-clients" value="${esc(p.client)}" required></label>
        <label class="field"><span>Phone / WhatsApp</span><input id="f-phone" type="tel" value="${esc(p.phone)}" placeholder="+971 5x xxx xxxx"></label></div>
      <details class="more-f"><summary>Instagram, email, found you through</summary>
        <div class="grid2"><label class="field"><span>Instagram</span><input id="f-instagram" value="${esc(p.instagram)}" placeholder="@handle"></label>
          <label class="field"><span>Email</span><input id="f-email" type="email" value="${esc(p.email)}"></label></div>
        <label class="field"><span>Found you through</span><select id="f-source"><option value="">—</option>${opt(list('sources'), p.source)}</select></label></details>
    </section>
    <section class="dr-sec" data-pt="overview" data-new><h3>Shoot</h3>
      <label class="field"><span>Project name</span><input id="f-title" value="${esc(p.title)}" placeholder="e.g. Wedding – Sara & Karim"></label>
      <div class="grid2"><label class="field"><span>Type</span><select id="f-type">${opt(list('types'), p.type)}</select></label>
        <label class="field"><span>Status</span><select id="f-status">${opt(STATUSES, p.status)}</select></label>
        <label class="field"><span>Date</span><input id="f-date" type="date" value="${esc(p.date)}"></label>
        <label class="field"><span>Time</span><input id="f-time" type="time" value="${esc(p.time)}"></label></div>
      <label class="field"><span>Location (address or Google Maps link)</span><input id="f-location" value="${esc(p.location)}"></label>
      <div class="grid2"><label class="check"><input type="checkbox" id="f-marketing" ${p.marketing ? 'checked' : ''}> Free shoot for my page</label>
        <label class="check"><input type="checkbox" id="f-posted" ${p.posted ? 'checked' : ''}> Posted on social</label></div>
      ${isNew ? `<label class="check tpl-chk"><input type="checkbox" id="f-tpl" ${preset && preset._tpl === false ? '' : 'checked'}> <span id="f-tplTxt"></span></label>` : ''}
    </section>
    <section class="dr-sec" data-pt="overview"><h3>Money <button type="button" class="linkbtn" data-ptab-go="money">Details ›</button></h3>
      <div class="money-sum" id="ovMoney"></div>
      <div class="wa-menu" id="ovActs"></div>
    </section>
    <section class="dr-sec" data-pt="items"><h3>Deliverables <span class="h3-acts"><button type="button" class="linkbtn" id="itTpl"></button><button type="button" class="linkbtn" id="itAdd">+ Add</button></span></h3>
      <div class="items" id="items"></div>
    </section>
    <section class="dr-sec" data-pt="money" data-new><h3>Money</h3>
      <div class="grid3"><label class="field"><span>Price</span><input id="f-price" type="number" inputmode="decimal" min="0" value="${p.price || ''}"></label>
        <label class="field"><span>Received</span><input id="f-paid" type="number" inputmode="decimal" min="0" value="${p.paid || ''}"></label>
        <label class="field"><span>Other expenses</span><input id="f-expenses" type="number" inputmode="decimal" min="0" value="${p.expenses || ''}"></label></div>
      <div class="money-sum" id="moneySum"></div>
      ${isNew ? '' : `<div class="plan" id="plan"></div>
      <div id="linkedExp"></div>
      <div class="payrow"><input id="payAmt" type="number" inputmode="decimal" min="0" placeholder="Add a payment you received"><button type="button" class="btn sm" id="payAdd">Add payment</button><button type="button" class="btn sm ghost" id="payFull">Paid in full</button></div>`}
    </section>
    <section class="dr-sec" data-pt="money"><h3>Team <button type="button" class="linkbtn" id="crAdd">+ Add</button></h3>
      <div class="items" id="crew"></div>
      <datalist id="dl-crew">${[...new Set(db.crew.map(c => c.name).filter(Boolean))].sort().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    </section>
    <section class="dr-sec" data-pt="docs"><h3>Invoices &amp; quotes</h3>
      <div class="wa-menu"><button class="btn sm" id="pInvoice" type="button">+ Invoice</button><button class="btn sm" id="pQuote" type="button">+ Quotation</button></div>
      <div id="pDocs"></div>
      <p class="fine">Each one is made from the saved project, so save your changes first.</p>
    </section>
    <section class="dr-sec" data-pt="notes" data-new><h3>Files & notes</h3>
      <label class="field"><span>Delivery / Drive link</span><input id="f-drive" type="url" value="${esc(p.drive)}" placeholder="https://drive.google.com/…"></label>
      <label class="field"><span>Notes</span><textarea id="f-notes" rows="4">${esc(p.notes)}</textarea></label>
    </section>
    <datalist id="dl-clients">${clientNames().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
  </form>
  <div class="dr-foot">
    <button class="btn primary" id="pSave" type="button">${isNew ? 'Add booking' : 'Save changes'}</button>
    <span class="sp"></span>
    ${isNew ? '' : '<button class="btn sm danger" id="pDel" type="button">Delete</button>'}
  </div>`;
  showLayer(dr);

  const val = k => $('#f-' + k).value.trim();
  const showTab = k => {
    tab = PTABS[k] ? k : 'overview';
    $$('#pForm [data-pt]').forEach(sec => { sec.hidden = isNew ? !('new' in sec.dataset) : sec.dataset.pt !== tab; });
    $$('[data-ptab-btn]', dr).forEach(b => b.setAttribute('aria-selected', b.dataset.ptabBtn === tab));
    $('#pForm').scrollTop = 0;
    const cur = $(`[data-ptab-btn="${tab}"]`, dr); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  $$('[data-ptab-btn],[data-ptab-go]', dr).forEach(b => { b.onclick = () => showTab(b.dataset.ptabBtn || b.dataset.ptabGo); });
  const drawMoney = () => {
    const price = num(val('price')), paid = num(val('paid')), ex = num(val('expenses')) + crew.reduce((s, c) => s + num(c.fee), 0) + linkedCost(p.id);
    const now = normP({ ...p, price, paid, status: $('#f-status').value, marketing: $('#f-marketing').checked });
    const [pay, payCls] = payState(now), bal = balance(now);
    $('#pSub').innerHTML = `<span class="tag ${STATUS_TAG[now.status]}">${now.status}</span><span class="tag ${payCls}">${pay}</span>`;
    const lx = expensesOf(p.id);
    $('#moneySum').innerHTML = `<div><small>Balance</small><b style="color:${price - paid > 0 ? 'var(--bad)' : 'var(--ok)'}">${money(Math.max(0, price - paid))}</b></div><div><small>Profit${crew.length || lx.length ? ' after costs' : ''}</small><b>${money(price - ex)}</b></div><div><small>Margin</small><b>${price ? Math.round((price - ex) / price * 100) : 0}%</b></div>`;
    if (isNew) return;
    const dep = depositOf(now, paid);
    $('#plan').innerHTML = dep ? `<div class="plan-it ${dep.left ? (dep.due && dep.due < today() ? 'late' : '') : 'done'}"><span><b>Deposit ${money(dep.amt)}</b><small>${esc(dep.no)}${dep.due ? ' · due ' + fmtDate(dep.due) : ''}</small></span>
        ${dep.left ? `<button type="button" class="btn sm" id="depIn">Deposit received</button>` : '<span class="tag t-ok">Received</span>'}</div>
      <div class="plan-it ${bal ? '' : 'done'}"><span><b>Balance ${money(Math.max(0, price - Math.max(paid, dep.amt)))}</b><small>after the shoot${now.date ? ', ' + fmtDate(now.date) : ''}</small></span>${bal ? '' : '<span class="tag t-ok">Paid</span>'}</div>`
      : '<p class="fine">No deposit set. Choose one when you make a quotation (Invoices &amp; quotes tab).</p>';
    if ($('#depIn')) $('#depIn').onclick = () => { $('#f-paid').value = Math.max(paid, dep.amt); drawMoney(); toast('Deposit added. Save to keep it.'); };
    $('#linkedExp').innerHTML = `<div class="linked">${lx.map(x => `<button type="button" class="chip" data-exp-open="${x.id}">${esc(x.note || x.category)} · ${money(x.amount)}</button>`).join('')}<button type="button" class="linkbtn" id="lxAdd">+ Log an expense for this shoot</button></div>`;
    $('#lxAdd').onclick = () => openExpense(null, { projectId: p.id, date: today() }, drawMoney);
    $('#ovMoney').innerHTML = now.marketing ? '<div><small>Free shoot</small><b>For your page</b></div>'
      : `<div><small>Price</small><b>${money(price)}</b></div><div><small>Received</small><b>${money(paid)}</b></div><div><small>Balance</small><b style="color:${bal ? 'var(--bad)' : 'var(--ok)'}">${money(bal)}</b></div>`;
    $('#ovActs').innerHTML = `${dep && dep.left ? '<button type="button" class="btn sm" id="ovDep">Deposit paid</button>' : ''}${bal && !now.marketing ? '<button type="button" class="btn sm" id="ovPaid">Mark paid</button>' : ''}${dep && dep.left ? waBtn(p, 'deposit', 'Deposit reminder') : ''}${waBtn(p, 'confirm', 'Confirm booking')}${waBtn(p, 'remind', 'Shoot reminder')}${bal ? waBtn(p, 'pay', 'Payment reminder') : ''}${waBtn(p, 'ready', 'Files ready')}`
      || '<p class="fine">Add a phone number and save to send WhatsApp messages from here.</p>';
    const od = $('#ovDep');
    if (od) od.onclick = () => { $('#f-paid').value = Math.max(paid, dep.amt); drawMoney(); if (save(false)) toast(`${val('client')}: deposit received`); };
    const mp = $('#ovPaid');
    if (mp) mp.onclick = () => { $('#f-paid').value = val('price'); drawMoney(); if (save(false)) toast(`${val('client')} marked paid`); };
  };
  const drawDocs = () => {
    const ds = docsOf(p.id);
    $('#pDocs').innerHTML = ds.length ? `<div class="mini">${ds.map(d => docRow(d)).join('')}</div>` : '<p class="fine">None yet. Each invoice or quotation you make is saved here.</p>';
  };
  const drawItems = () => {
    $('#items').innerHTML = items.length ? items.map((it, i) => `<div class="item di ${it.status === 'Delivered' ? 'done' : ''}" data-i="${i}">
      <select data-k="type" class="d-type" aria-label="Type"><option value="">Type…</option>${opt(list('itemTypes'), it.type)}</select>
      <input value="${esc(it.title)}" data-k="title" class="d-title" placeholder="e.g. Highlight video" aria-label="Deliverable">
      <input type="number" inputmode="numeric" min="1" value="${it.qty || 1}" data-k="qty" class="d-qty" aria-label="How many">
      <button type="button" class="del" data-rm="${i}" aria-label="Remove">✕</button>
      <select data-k="status" class="d-status" aria-label="Status">${ITEM_STATUSES.map(s => `<option ${s === it.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input type="date" value="${esc(it.due)}" data-k="due" class="d-due" aria-label="Due date">
      <input value="${esc(it.notes)}" data-k="notes" class="d-notes" placeholder="Notes" aria-label="Notes"></div>`).join('') : '<p class="fine">Add what you owe the client: photos, reels, album, highlight video…</p>';
  };
  const drawCrew = () => {
    $('#crew').innerHTML = crew.length ? crew.map((c, i) => `<div class="item crew-row" data-c="${i}">
      <input value="${esc(c.name)}" data-ck="name" list="dl-crew" placeholder="Name" aria-label="Name">
      <select data-ck="role" aria-label="Role">${ROLES.map(r => `<option ${r === c.role ? 'selected' : ''}>${r}</option>`).join('')}</select>
      <input type="number" inputmode="decimal" min="0" value="${c.fee || ''}" data-ck="fee" placeholder="Fee" aria-label="Fee">
      <label class="check paid-chk"><input type="checkbox" data-ck="paidOn" ${c.paidOn ? 'checked' : ''}> Paid</label>
      <button type="button" class="del" data-crm="${i}" aria-label="Remove">✕</button></div>`).join('') : '<p class="fine">Add who worked with you on this shoot and what you pay them. It counts in your profit and reminds you to pay them.</p>';
  };
  const save = close => {
    if (!val('client')) { showTab('overview'); $('#f-client').focus(); toast('Add the client name first', true); return false; }
    const out = normP({
      ...p, client: val('client'), phone: val('phone'), instagram: val('instagram'), email: val('email'), source: $('#f-source').value,
      title: val('title') || `${$('#f-type').value} – ${val('client')}`, type: $('#f-type').value, status: $('#f-status').value,
      date: val('date'), time: val('time'), location: val('location'), marketing: $('#f-marketing').checked, posted: $('#f-posted').checked,
      price: val('price'), paid: val('paid'), expenses: val('expenses'), drive: val('drive'), notes: $('#f-notes').value.trim(),
    });
    if (isNew && $('#f-tpl').checked && !items.length) items = tplItems($('#f-type').value, val('date'), out.id);
    const its = items.filter(i => i.title.trim()).map(i => normI({ ...i, projectId: out.id, title: i.title.trim(), notes: String(i.notes || '').trim() }));
    const team = crew.filter(c => c.name.trim() || num(c.fee)).map(c => normC({ ...c, projectId: out.id, name: c.name.trim() }));
    saveProject(out, its, team);
    if (close) { closeLayers(); render(); toast(isNew ? 'Booking added' : 'Saved'); } else { Object.assign(p, out); ui.keepScroll = true; render(); }
    return true;
  };
  // The usual deliverables for the chosen type: ticked on a new booking, a one-tap add on an existing one.
  const drawTpl = () => {
    const type = $('#f-type').value, t = tplSummary(type);
    if (isNew) { $('#f-tplTxt').textContent = `Add the usual deliverables: ${t}`; $('.tpl-chk', dr).hidden = !t; return; }
    const have = new Set(items.map(i => (i.title || i.type).trim().toLowerCase()));
    const missing = tplItems(type, val('date'), p.id).filter(i => !have.has(i.title.toLowerCase()));
    $('#itTpl').hidden = !missing.length; $('#itTpl').textContent = `+ Usual for ${type}`;
    $('#itTpl').onclick = () => { items.push(...missing); drawItems(); drawTpl(); toast(`${missing.length} added. Save to keep them.`); };
  };
  showTab(tab); drawMoney(); drawItems(); drawCrew(); drawTpl(); if (!isNew) drawDocs();
  $('#pForm').addEventListener('input', e => {
    const row = e.target.closest('.item');
    if (row && e.target.dataset.k) {
      const it = items[row.dataset.i];
      it[e.target.dataset.k] = e.target.value;
      // Choosing a type on an empty line names it after the type, so it is saved.
      if (e.target.dataset.k === 'type' && !it.title.trim()) { it.title = e.target.value; row.querySelector('.d-title').value = it.title; }
      if (e.target.dataset.k === 'status') row.classList.toggle('done', it.status === 'Delivered');
    }
    const cr = e.target.closest('.crew-row'), ck = e.target.dataset.ck;
    if (cr && ck) {
      const c = crew[cr.dataset.c];
      if (ck === 'paidOn') c.paidOn = e.target.checked ? (c.paidOn || today()) : '';
      else c[ck] = e.target.value;
      // Picking someone you worked with before fills in their usual role and fee.
      if (ck === 'name' && !c.fee) {
        const prev = db.crew.filter(x => x.name.toLowerCase() === c.name.trim().toLowerCase()).pop();
        if (prev) { c.role = prev.role; c.fee = prev.fee; drawCrew(); }
      }
    }
    if (['f-price', 'f-paid', 'f-expenses', 'f-status', 'f-marketing'].includes(e.target.id) || ck === 'fee' || ck === 'name') drawMoney();
    if (['f-type', 'f-date'].includes(e.target.id) || e.target.dataset.k === 'title') drawTpl();
  });
  $('#crew').addEventListener('click', e => { const rm = e.target.closest('[data-crm]'); if (rm) { crew.splice(+rm.dataset.crm, 1); drawCrew(); drawMoney(); } });
  $('#crAdd').onclick = () => { crew.push({ id: uid(), projectId: p.id, name: '', role: 'Photographer', fee: 0, paidOn: '', notes: '' }); drawCrew(); $$('#crew .crew-row input[data-ck=name]').pop().focus(); };
  $('#items').addEventListener('click', e => { const rm = e.target.closest('[data-rm]'); if (rm) { items.splice(+rm.dataset.rm, 1); drawItems(); drawTpl(); } });
  $('#itAdd').onclick = () => { items.push({ id: uid(), projectId: p.id, type: list('itemTypes')[0] || '', qty: 1, title: '', status: 'Pending', due: '', notes: '' }); drawItems(); $$('#items .item input[data-k=title]').pop().focus(); };
  $('#pSave').onclick = () => save(true);
  if (isNew) return;
  $('#payAdd').onclick = () => { const a = num($('#payAmt').value); if (!a) return; $('#f-paid').value = num(val('paid')) + a; $('#payAmt').value = ''; drawMoney(); toast(`${money(a)} added. Save to keep it.`); };
  $('#payFull').onclick = () => { $('#f-paid').value = val('price'); drawMoney(); };
  $('#pInvoice').onclick = () => { printInvoice(project(p.id)); drawDocs(); };
  $('#pQuote').onclick = () => openQuote(project(p.id), () => { drawDocs(); drawMoney(); });
  const del = $('#pDel');
  del.onclick = () => {
    if (!del.classList.contains('arm')) { del.classList.add('arm'); del.textContent = 'Tap again to delete'; return; }
    deleteProject(p.id); closeLayers(); render(); toast('Project deleted');
  };
}

// ───────────────────────────── quick add ─────────────────────────────
function openQuickAdd(date) {
  const m = $('#modal');
  m.innerHTML = `<form class="modal-card" id="qForm" autocomplete="off">
    <div class="ph" style="margin:0"><h2 id="modalTitle">New booking</h2><button type="button" class="x" data-close aria-label="Close">✕</button></div>
    <div class="grid2">
      <label class="field"><span>Client</span><input id="q-client" list="dl-q" required placeholder="Name"></label>
      <label class="field"><span>Phone</span><input id="q-phone" type="tel" placeholder="+971 5x xxx xxxx"></label>
      <label class="field"><span>Type</span><select id="q-type">${list('types').map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
      <label class="field"><span>Price (${esc(setting('currency'))})</span><input id="q-price" type="number" inputmode="decimal" min="0" placeholder="0"></label>
      <label class="field"><span>Date</span><input id="q-date" type="date" value="${esc(date || '')}"></label>
      <label class="field"><span>Time</span><input id="q-time" type="time"></label>
    </div>
    <div class="grid2"><label class="check"><input type="checkbox" id="q-inq"> Just an inquiry (not confirmed)</label><label class="check"><input type="checkbox" id="q-free"> Free shoot for my page</label></div>
    <label class="check tpl-chk"><input type="checkbox" id="q-tpl" checked> <span id="q-tplTxt"></span></label>
    <datalist id="dl-q">${clientNames().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <div class="modal-acts"><button type="button" class="btn ghost" id="qMore">More details</button><button type="submit" class="btn primary">Add booking</button></div>
  </form>`;
  showLayer(m);
  setTimeout(() => $('#q-client')?.focus(), 50);
  const drawTpl = () => { const t = tplSummary($('#q-type').value); $('#q-tplTxt').textContent = `Add the usual deliverables: ${t}`; $('.tpl-chk', m).hidden = !t; };
  drawTpl(); $('#q-type').addEventListener('change', drawTpl);
  $('#q-client').addEventListener('change', e => {
    const prev = db.projects.find(p => p.client.toLowerCase() === e.target.value.trim().toLowerCase() && p.phone);
    if (prev && !$('#q-phone').value) $('#q-phone').value = prev.phone;
  });
  const read = () => {
    const client = $('#q-client').value.trim(), type = $('#q-type').value;
    const prev = db.projects.find(p => p.client.toLowerCase() === client.toLowerCase());
    return {
      client, phone: $('#q-phone').value.trim(), type, title: client ? `${type} – ${client}` : '', price: $('#q-price').value,
      date: $('#q-date').value, time: $('#q-time').value, status: $('#q-inq').checked ? 'Inquiry' : 'Booked', marketing: $('#q-free').checked,
      instagram: prev ? prev.instagram : '', email: prev ? prev.email : '', source: prev ? prev.source : '',
    };
  };
  $('#qMore').onclick = () => { const v = { ...read(), _tpl: $('#q-tpl').checked }; closeLayers(); openProject(null, v); };
  $('#qForm').onsubmit = e => {
    e.preventDefault();
    const v = read();
    if (!v.client) return;
    const p = normP({ id: uid(), code: nextCode(), created: today(), ...v });
    const its = $('#q-tpl').checked ? tplItems(p.type, p.date, p.id) : [];
    saveProject(p, its); closeLayers(); render();
    toast(`${p.code} added${p.date ? ' for ' + fmtDate(p.date) : ''}${its.length ? ` with ${its.length} deliverable${its.length === 1 ? '' : 's'}` : ''}`);
  };
}

// ───────────────────────────── search ─────────────────────────────
// One box for everything: projects, clients, deliverables, invoices & quotes, expenses and retainers.
// Every word must match; phone numbers match with or without spaces, +971 or 0.
const phoneKeys = ph => { const d = waNumber(ph); return d ? `${d} ${d.startsWith('971') ? '0' + d.slice(3) : ''}` : ''; };
function searchAll(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).map(w => (/^[+(]?\d[\d()-]{2,}$/.test(w) ? w.replace(/\D/g, '').replace(/^00/, '') : w));
  const hit = (...v) => { const h = v.join(' ').toLowerCase(); return words.every(w => h.includes(w)); };
  const by = (a, b) => b.d.localeCompare(a.d);
  const ptitle = id => { const p = project(id); return p ? p.title : ''; };
  return [
    ['Projects', db.projects.filter(p => hit(p.code, p.client, p.title, p.type, p.location, p.notes, p.email, p.instagram, p.phone, phoneKeys(p.phone), p.status, fmtDate(p.date)))
      .map(p => ({ go: 'p:' + p.id, d: dayOf(p), b: p.title || p.client, s: `${p.client} · ${p.code} · ${p.date ? fmtDate(p.date) : 'no date'}`, r: `<span class="tag ${STATUS_TAG[p.status]}">${p.status}</span>` }))],
    ['Clients', [...clientMap().values()].filter(c => hit(c.name, c.phone, phoneKeys(c.phone), c.email, c.instagram))
      .map(c => ({ go: 'c:' + c.key, d: c.last, b: c.name, s: `${c.n} project${c.n === 1 ? '' : 's'}${c.phone ? ' · ' + c.phone : ''}`, r: c.owed ? `<span class="tag t-bad">owes ${money(c.owed)}</span>` : '' }))],
    ['Deliverables', db.items.filter(i => project(i.projectId) && hit(i.title, i.type, i.notes, ptitle(i.projectId), project(i.projectId).client))
      .map(i => ({ go: 'i:' + i.projectId, d: i.due || dayOf(project(i.projectId)), b: itemLabel(i), s: `${ptitle(i.projectId)}${i.due ? ' · due ' + fmtDate(i.due) : ''}`, r: `<span class="tag ${i.status === 'Delivered' ? 't-ok' : 't-warn'}">${i.status}</span>` }))],
    ['Invoices & quotes', db.docs.filter(d => hit(d.no, d.client, docKind(d.kind), ptitle(d.projectId)))
      .map(d => ({ go: 'd:' + d.projectId, d: d.created, b: `${docKind(d.kind)} ${d.no}`, s: `${d.client} · ${fmtDate(d.date)}`, r: money(d.total) }))],
    ['Expenses', db.expenses.filter(x => hit(x.note, x.category, ptitle(x.projectId), String(x.amount)))
      .map(x => ({ go: 'x:' + x.id, d: x.date, b: x.note || x.category, s: `${x.category} · ${fmtDate(x.date)}${x.projectId ? ' · ' + ptitle(x.projectId) : ''}`, r: money(x.amount) }))],
    ['Retainers', db.retainers.filter(r => hit(r.client, r.brand, r.phone, phoneKeys(r.phone), r.instagram, r.platforms))
      .map(r => ({ go: 'r:' + r.id, d: r.start, b: r.client + (r.brand ? ' · ' + r.brand : ''), s: `${money(r.fee)} per month · ${r.status}`, r: '' }))],
  ].map(([g, rows]) => [g, rows.sort(by)]).filter(([, rows]) => rows.length);
}
function openSearch() {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-card search-card"><h2 id="modalTitle" class="sr">Search</h2>
    <div class="s-bar">${icon('search')}<input id="sq" type="text" enterkeyhint="search" placeholder="Client, project, phone, invoice no.…" autocomplete="off" spellcheck="false" aria-label="Search everything" value="${esc(ui.sq || '')}"><button type="button" class="x" data-close aria-label="Close">✕</button></div>
    <div class="s-res" id="sres" role="listbox"></div></div>`;
  showLayer(m);
  const row = r => `<button type="button" class="s-it" data-s-go="${esc(r.go)}" role="option"><span><b>${esc(r.b)}</b><small>${esc(r.s)}</small></span><span class="r">${r.r}</span></button>`;
  const draw = () => {
    const q = ui.sq = $('#sq').value.trim();
    if (!q) {
      const recent = [...db.projects].sort((a, b) => (b.updated || b.created).localeCompare(a.updated || a.created)).slice(0, 6);
      $('#sres').innerHTML = recent.length ? `<div class="s-g">Recently changed</div>${recent.map(p => row({ go: 'p:' + p.id, b: p.title || p.client, s: `${p.client} · ${p.code}`, r: `<span class="tag ${STATUS_TAG[p.status]}">${p.status}</span>` })).join('')}` : '';
    } else {
      const groups = searchAll(q);
      $('#sres').innerHTML = groups.length ? groups.map(([g, rows]) => `<div class="s-g">${g} <span class="n">${rows.length}</span></div>${rows.slice(0, 5).map(row).join('')}
        ${rows.length > 5 ? (g === 'Projects' ? `<button type="button" class="linkbtn s-more" data-s-all>All ${rows.length} projects →</button>` : `<small class="s-more">+${rows.length - 5} more, add a word to narrow it down</small>`) : ''}`).join('')
        : `<p class="empty"><b>Nothing found</b>Try a name, phone number, project code or invoice number.</p>`;
    }
    const first = $('.s-it', m); if (first) first.classList.add('on');
  };
  draw();
  const sq = $('#sq'); sq.focus(); sq.select();
  sq.addEventListener('input', draw);
  sq.addEventListener('keydown', e => {
    const its = $$('.s-it', m), i = its.findIndex(x => x.classList.contains('on'));
    if (e.key === 'Enter') { e.preventDefault(); if (its[i]) its[i].click(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault(); if (!its.length) return;
    const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + its.length) % its.length;
    its.forEach(x => x.classList.remove('on')); its[n].classList.add('on'); its[n].scrollIntoView({ block: 'nearest' });
  });
}
function searchGo(go) {
  const k = go.slice(0, 1), id = go.slice(2);
  closeLayers();
  if (k === 'p') openProject(id);
  else if (k === 'i') openProject(id, null, 'items');
  else if (k === 'd') openProject(id, null, 'docs');
  else if (k === 'c') openClient(id);
  else if (k === 'x') openExpense(id);
  else if (k === 'r') openRetainer(id);
}

// ───────────────────────────── layers ─────────────────────────────
let lastFocus = null;
function showLayer(el) { lastFocus = document.activeElement; $('#scrim').hidden = false; el.hidden = false; document.body.style.overflow = 'hidden'; }
function closeLayers() {
  ['#drawer', '#modal'].forEach(s => { $(s).hidden = true; $(s).innerHTML = ''; });
  $('#scrim').hidden = true; document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

// ───────────────────────────── invoice & quotation ─────────────────────────────
// kind 'invoice' bills what was agreed; kind 'quote' offers a price before the client books.
// Every one you make is saved (Documents tab in the Sheet) and can be printed again exactly as sent.
// Styled like ronysaad.com: dark page, orange glow, Space Grotesk, thin lines.
const docDate = d => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const docKind = k => (k === 'quote' ? 'Quotation' : 'Invoice');
function docSnapshot(p, kind, dep) {
  const quote = kind === 'quote';
  const days = Math.max(1, num(setting('quoteDays')) || 14);
  return {
    kind, code: p.code, client: p.client, phone: p.phone, email: p.email,
    title: p.title, type: p.type, location: p.location, date: p.date, time: p.time,
    items: itemsOf(p.id).map(i => ({ title: i.title || i.type, type: i.type, qty: i.qty })),
    price: p.price, paid: p.paid, balance: balance(p),
    pct: quote ? (dep ? dep.pct : Math.min(100, Math.max(0, num(setting('quoteDeposit'))))) : 0,
    valid: quote ? ymd(new Date(Date.now() + days * 864e5)) : '',
    ...(quote && dep ? { deposit: dep.amt, depDue: dep.due } : {}),
    payInfo: setting('payInfo'), note: setting(quote ? 'quoteNote' : 'invoiceNote'),
    biz: { name: setting('businessName'), tagline: setting('tagline'), address: setting('address'), phone: setting('phone'), email: setting('email'), website: setting('website'), currency: setting('currency') },
  };
}
function docHtml(s, d) {
  const quote = s.kind === 'quote', b = s.biz, year = d.date.slice(0, 4);
  const dep = s.deposit != null ? num(s.deposit) : num(s.price) * num(s.pct) / 100;
  const cash = v => `${esc(b.currency)} ${Math.round(num(v)).toLocaleString('en-US')}`;
  const logo = `<span class="doc-logo">${esc(b.name.toUpperCase()).replace(' ', '<span>.</span>')}<em>®</em></span>`;
  const line = (label, value, cls = '') => `<div class="doc-line ${cls}"><span>${label}</span><b>${value}</b></div>`;
  const items = s.items.length ? s.items : [{ title: s.title, type: s.type, qty: 1 }];
  const rows = items.map((i, n) => `<tr><td class="doc-no">${String(n + 1).padStart(2, '0')}</td><td><b>${esc(i.title)}</b>${i.type && i.type !== i.title ? `<small>${esc(i.type)}</small>` : ''}</td><td class="n">${i.qty}</td></tr>`).join('');
  const totals = quote
    ? line('Total', cash(s.price), 'big') + (dep ? line(`Deposit to confirm${s.pct ? ' · ' + s.pct + '%' : ''}${s.depDue ? ' · by ' + docDate(s.depDue) : ''}`, cash(dep)) + (dep < s.price ? line('Balance after deposit', cash(s.price - dep)) : '') : '')
    : line('Total', cash(s.price)) + line('Received', cash(s.paid)) + line('Balance due', cash(s.balance), 'big');
  const contact = [b.website, b.phone, b.email].filter(Boolean).map(esc).join('<i>/</i>');
  return `
  <div class="doc-glow" aria-hidden="true"></div><div class="doc-rings" aria-hidden="true"></div>
  <header class="doc-top">${logo}<span class="doc-pill"><i></i>${docKind(s.kind)} / ${year}</span></header>
  <p class="doc-eyebrow">${esc(b.tagline)}</p>
  <h1 class="doc-title">${quote ? 'Quote' : 'Invoice'}<span>.</span></h1>
  <div class="doc-ids"><div><span>No.</span><b>${esc(d.no)}</b></div><div><span>Issued</span><b>${docDate(d.date)}</b></div>${quote && s.valid ? `<div><span>Valid until</span><b>${docDate(s.valid)}</b></div>` : ''}${s.date ? `<div><span>Shoot date</span><b>${docDate(s.date)}${s.time ? ' · ' + esc(s.time) : ''}</b></div>` : ''}</div>
  <div class="doc-meta">
    <div class="doc-box"><span class="doc-k">${quote ? 'Prepared for' : 'Billed to'}</span><b>${esc(s.client)}</b>${s.phone ? `<p>${esc(s.phone)}</p>` : ''}${s.email ? `<p>${esc(s.email)}</p>` : ''}</div>
    <div class="doc-box"><span class="doc-k">From</span><b>${esc(b.name)}</b>${[b.address, b.phone, b.email].filter(Boolean).map(v => `<p>${esc(v)}</p>`).join('')}</div>
  </div>
  <section class="doc-project"><span class="doc-k">Project</span><h2>${esc(s.title)}</h2><p>${[s.type, s.location].filter(Boolean).map(esc).join(' · ')}</p></section>
  <table class="doc-table"><thead><tr><th></th><th>${quote ? 'What you get' : 'Delivered'}</th><th class="n">Qty</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="doc-sum">${totals}</div>
  ${s.payInfo ? `<div class="doc-box doc-pay"><span class="doc-k">Payment details</span><p>${esc(s.payInfo)}</p></div>` : ''}
  ${s.note ? `<p class="doc-note">${esc(s.note)}</p>` : ''}
  <footer class="doc-foot"><div class="doc-bars" aria-hidden="true">${'<i></i>'.repeat(12)}</div><div><span>${esc(b.name.toUpperCase())} © ${year}</span><span>${contact}</span></div></footer>`;
}
// Make an invoice or quotation for a project, save it, then print. Pressing the button again
// without changing anything reprints the saved one instead of saving a copy.
function printInvoice(p, kind = 'invoice', dep) {
  const snap = docSnapshot(p, kind, dep), data = JSON.stringify(snap);
  const mine = docsOf(p.id).filter(d => d.kind === kind);
  let d = mine.find(x => x.data === data && x.date === today());
  if (!d) {
    const base = (kind === 'quote' ? 'QT-' : 'INV-') + (p.code.replace(/\D/g, '') || p.id.slice(-5));
    d = normD({ id: uid(), projectId: p.id, kind, no: mine.length ? `${base}-${mine.length + 1}` : base, date: today(), client: p.client, total: kind === 'quote' ? p.price : balance(p), data, created: new Date().toISOString() });
    saveRow('docs', d);
    toast(`${docKind(kind)} ${d.no} saved`);
  }
  printDoc(d);
}
// Choose the deposit for this client before making the quotation. Opens over the project drawer.
function openQuote(p, after) {
  const m = $('#modal'), prev = depositOf(p, 0), t = today();
  const valid = addDays(t, Math.max(1, num(setting('quoteDays')) || 14));
  const amt0 = prev ? prev.amt : Math.round(p.price * Math.min(100, Math.max(0, num(setting('quoteDeposit')))) / 100);
  // A deposit that is a round share of the price shows as that % on the quotation.
  const pctOf = a => { const k = p.price ? Math.round(a / p.price * 100) : 0; return Math.round(p.price * k / 100) === a ? k : 0; };
  const due0 = prev && prev.due >= t ? prev.due : p.date && p.date < valid ? (p.date > t ? p.date : t) : valid;
  m.innerHTML = `<form class="modal-card" id="qtForm" autocomplete="off">
    <div class="ph" style="margin:0"><h2 id="modalTitle">Quotation</h2><button type="button" class="x" data-qclose aria-label="Close">✕</button></div>
    <p class="fine">${esc(p.title)} · total <b>${money(p.price)}</b>${p.price ? '' : ' · <span class="warn-t">add a price first</span>'}</p>
    <div class="field"><span>Deposit to confirm</span><div class="chips" id="qtPct">${[0, 25, 30, 50, 100].map(n => `<button type="button" class="chip" data-pct="${n}">${n ? n + '%' : 'None'}</button>`).join('')}</div></div>
    <div class="grid2"><label class="field"><span>Deposit (${esc(setting('currency'))})</span><input id="qt-amt" type="number" inputmode="decimal" min="0" value="${amt0 || ''}" placeholder="0"></label>
      <label class="field"><span>Deposit due by</span><input id="qt-due" type="date" value="${esc(due0)}"></label></div>
    <p class="fine" id="qtSum"></p>
    ${setting('payInfo') ? '' : '<p class="fine warn-t">Add your bank details in Settings → Payment details so they show on the quotation.</p>'}
    <div class="modal-acts"><button type="button" class="btn ghost" data-qclose>Cancel</button><button type="submit" class="btn primary">Make quotation</button></div>
  </form>`;
  const drawerOpen = !$('#drawer').hidden;
  if (drawerOpen) m.hidden = false; else showLayer(m);
  const close = () => { if (drawerOpen) { m.hidden = true; m.innerHTML = ''; } else closeLayers(); };
  const draw = () => {
    const a = num($('#qt-amt').value);
    $$('[data-pct]', m).forEach(b => b.setAttribute('aria-pressed', !!p.price && a === Math.round(p.price * +b.dataset.pct / 100)));
    $('#qtSum').textContent = a ? `Balance after deposit: ${money(Math.max(0, p.price - a))}` : 'No deposit on this quotation.';
  };
  draw();
  $('#qtPct').onclick = e => { const b = e.target.closest('[data-pct]'); if (!b) return; $('#qt-amt').value = Math.round(p.price * +b.dataset.pct / 100) || ''; draw(); };
  $('#qt-amt').oninput = draw;
  $$('[data-qclose]', m).forEach(b => { b.onclick = close; });
  $('#qtForm').onsubmit = e => {
    e.preventDefault();
    const a = Math.min(num($('#qt-amt').value), p.price || Infinity);
    const due = $('#qt-due').value;
    close(); printInvoice(p, 'quote', { amt: a, pct: a ? pctOf(a) : 0, due: a ? due : '' }); if (after) after();
  };
}
function printDoc(d) {
  let s; try { s = JSON.parse(d.data); } catch (e) { toast('This document could not be opened', true); return; }
  $('#invoice').innerHTML = docHtml(s, d);
  const prevTitle = document.title;
  document.title = `${d.no} ${d.client}`;
  // wait for the brand fonts so the PDF never falls back to Arial
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    window.print();
    setTimeout(() => { document.title = prevTitle; }, 500);
  });
}
function docRow(d, showClient) {
  const p = project(d.projectId);
  return `<div class="mini-it doc-it" data-doc="${esc(d.id)}" role="button" tabindex="0"><div><b><span class="doc-kind k-${d.kind}">${docKind(d.kind)}</span> ${esc(d.no)} · ${money(d.total)}</b>
    <small>${showClient ? esc(d.client) + ' · ' : ''}${fmtDate(d.date)}${p ? ' · ' + esc(p.title) : ''}${d.kind === 'quote' ? ' · total' : ' · balance due'}</small></div>
    <div class="r"><button type="button" class="btn sm" data-doc="${esc(d.id)}">Open PDF</button><button type="button" class="btn sm ghost" data-doc-del="${esc(d.id)}" aria-label="Delete ${esc(d.no)}">Delete</button></div></div>`;
}
function docsBody() {
  const all = [...db.docs].sort((a, b) => b.created.localeCompare(a.created));
  const f = ui.docKind || 'all';
  const list = all.filter(d => f === 'all' || d.kind === f);
  return [`${all.filter(d => d.kind === 'invoice').length} invoices · ${all.filter(d => d.kind === 'quote').length} quotations`, `
  <div class="chips">${['all', 'invoice', 'quote'].map(k => `<button class="chip" data-doc-kind="${k}" aria-pressed="${f === k}">${k === 'all' ? 'All' : docKind(k) + 's'}</button>`).join('')}</div>
  <input type="search" id="dq" placeholder="Search by client or number…" aria-label="Search invoices and quotes">
  <section class="panel"><div class="mini" id="dlist">${list.length ? list.map(d => docRow(d, true)).join('') : '<p class="empty">Nothing yet. Open a project and make one on its Invoices &amp; quotes tab. Every one you make is kept here.</p>'}</div></section>`];
}

// ───────────────────────────── import / export ─────────────────────────────
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportCsv() {
  const cols = ['code', 'client', 'phone', 'title', 'type', 'date', 'time', 'status', 'price', 'paid', 'expenses', 'marketing', 'source', 'location', 'notes'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.concat('balance').join(',')].concat(db.projects.map(p => cols.map(c => q(p[c])).concat(balance(p)).join(',')));
  download(`studio-projects-${today()}.csv`, '﻿' + lines.join('\n'), 'text/csv');
}
function convertOld(old) {
  const mk = new Set((old.marketing || []).map(m => m._id));
  const src = [...(old.projects || [])];
  (old.marketing || []).forEach(m => { if (!src.some(p => p._id === m._id)) src.push(m); });
  const projects = [], items = [];
  src.forEach(o => {
    const price = num(o.packagePrice);
    let paid = num(o.depositAmount);
    if (o.paymentStatus === 'Paid') paid = price;
    let status = 'Booked';
    if (o.bookingStatus === 'Cancelled') status = 'Cancelled';
    else if (o.bookingStatus === 'Inquiry') status = 'Inquiry';
    else if (o.deliveryStatus === 'Delivered') status = 'Delivered';
    else if (o.deliveryStatus === 'In Progress') status = 'Editing';
    else if (o.bookingStatus === 'Completed') status = 'Shot';
    const marketing = mk.has(o._id) || (!price && /marketing/i.test(o.notes || ''));
    projects.push(normP({
      id: o._id, code: o.bookingId, client: o.client, phone: o.phone, email: o.email, instagram: o.instagram,
      title: o.project, type: o.shootType === 'RealEstate & Construction' ? 'Real Estate & Construction' : o.shootType,
      date: o.shootDate, time: o.shootTime, location: o.location, price, paid,
      expenses: num(o.staffCost) + num(o.equipmentCost) + num(o.travelCost) + num(o.otherExpenses),
      status, marketing, posted: !!(o.instagramPosted || o.facebookPosted || o.tiktokPosted), source: o.referralSource,
      drive: o.finalDeliveryLink || o.googleDriveLink || o.dropboxLink, notes: o.notes, created: o.createdAt,
    }));
    (o.workItems || []).forEach(w => items.push(normI({
      id: w._id, projectId: o._id, title: w.title || w.type, type: w.type, qty: w.quantity,
      status: w.status === 'Delivered' ? 'Delivered' : /edit|progress/i.test(w.status) ? 'Editing' : 'Pending',
      due: w.dueDate, notes: w.notes,
    })));
  });
  return { projects, items };
}
function importOld(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const old = JSON.parse(r.result);
      if (!Array.isArray(old.projects)) throw new Error('This file is not from the old dashboard');
      const { projects, items } = convertOld(old);
      projects.forEach(p => { const i = db.projects.findIndex(x => x.id === p.id); if (i === -1) db.projects.push(p); else db.projects[i] = p; });
      items.forEach(it => { const i = db.items.findIndex(x => x.id === it.id); if (i === -1) db.items.push(it); else db.items[i] = it; });
      saveLocal();
      push({ action: 'upsert', table: 'projects', rows: projects });
      if (items.length) push({ action: 'upsert', table: 'items', rows: items });
      toast(`Imported ${projects.length} projects and ${items.length} deliverables`);
      render();
    } catch (e) { toast(e.message, true); }
  };
  r.readAsText(file);
}

// ───────────────────────────── routing & events ─────────────────────────────
const VIEWS = { today: renderToday, projects: renderProjects, clients: renderClients, money: renderMoney, retainers: renderRetainers, settings: renderSettings };
// Old addresses (the installed app may still open them) land on their new home.
const MOVED = { home: 'today', deliver: 'today', calendar: 'today', docs: 'money/docs', team: 'money/team' };
const JUMP = { deliver: 't-deliver', calendar: 't-cal' };
function render() {
  if (!cfg) return;
  clearInterval(ui.countdown);
  const y = window.scrollY;
  (VIEWS[ui.view] || renderToday)();
  $$('[data-v]').forEach(a => { if (a.dataset.v === ui.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#moreBtn').toggleAttribute('aria-current', ['retainers', 'settings'].includes(ui.view));
  window.scrollTo(0, ui.keepScroll ? y : 0);
  ui.keepScroll = false;
  if (ui.jump) { jump(ui.jump); ui.jump = ''; }
}
function jump(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'start' }); }
function route() {
  let h = location.hash.slice(1);
  if (MOVED[h]) { ui.jump = JUMP[h] || ''; h = MOVED[h]; history.replaceState(null, '', '#' + h); }
  const [v, sub] = h.split('/');
  ui.view = VIEWS[v] ? v : 'today';
  if (ui.view === 'money') ui.mtab = MTABS[sub] ? sub : 'report';
  if (ui.view === 'projects') { ui.pview = ['list', 'board'].includes(sub) ? sub : store.get('rs.pview', 'list'); store.set('rs.pview', ui.pview); }
  render();
}
function go(view) { if (location.hash.slice(1) === view) render(); else location.hash = view; }

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-stop]')) { e.stopPropagation(); return; }
  const c = sel => t.closest(sel);
  let el;
  if ((el = c('[data-status]'))) { e.stopPropagation(); ui.keepScroll = true; const p = project(el.dataset.status); patchProject(p.id, { status: el.dataset.to }); toast(`${p.code} → ${el.dataset.to}`); return; }
  if ((el = c('[data-dep-paid]'))) { ui.keepScroll = true; const p = project(el.dataset.depPaid), dep = depositOf(p); if (dep) patchProject(p.id, { paid: Math.max(p.paid, dep.amt) }); toast(`${p.client}: deposit received`); return; }
  if ((el = c('[data-paid]'))) { ui.keepScroll = true; const p = project(el.dataset.paid); patchProject(p.id, { paid: p.price }); toast(`${p.client} marked paid`); return; }
  if ((el = c('[data-posted]'))) { ui.keepScroll = true; patchProject(el.dataset.posted, { posted: true }); toast('Marked as posted'); return; }
  if ((el = c('[data-item-st]'))) {
    e.stopPropagation(); ui.keepScroll = true;
    const it = db.items.find(x => x.id === el.dataset.itemSt);
    patchItem(it.id, { status: el.dataset.to });
    toast(`${itemLabel(it)} → ${el.dataset.to}`); return;
  }
  if ((el = c('[data-jump]'))) { e.preventDefault(); jump(el.dataset.jump); return; }
  if ((el = c('[data-cfilter]'))) { ui.cfilter = el.dataset.cfilter; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-dfilter]'))) { ui.dfilter = el.dataset.dfilter; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-dshowdone]'))) { ui.dShowDone = !ui.dShowDone; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-item-done]'))) { ui.keepScroll = true; patchItem(el.dataset.itemDone, { status: 'Delivered' }); toast('Delivered'); return; }
  if ((el = c('[data-crew-paid]'))) { e.stopPropagation(); ui.keepScroll = true; const cr = db.crew.find(x => x.id === el.dataset.crewPaid); patchCrew(cr.id, { paidOn: today() }); toast(`${cr.name || cr.role} marked paid`); return; }
  if ((el = c('[data-ret-month]'))) { e.stopPropagation(); ui.keepScroll = true; toggleRetMonth(el.dataset.retMonth, el.dataset.m); toast(`${monthName(el.dataset.m)} marked paid`); return; }
  if ((el = c('[data-ret-report]'))) { ui.keepScroll = true; const r = db.retainers.find(x => x.id === el.dataset.retReport); patchRetainer(r.id, { nextReport: addMonths(r.nextReport || today(), 1) }); toast('Next report set for ' + fmtDate(r.nextReport)); return; }
  if (c('a.wa')) return;
  if ((el = c('[data-add]'))) { openQuickAdd(); return; }
  if ((el = c('[data-add-day]'))) { openQuickAdd(el.dataset.addDay); return; }
  if ((el = c('[data-close]')) || t.id === 'scrim') { closeLayers(); return; }
  if ((el = c('[data-filter]'))) { e.preventDefault(); ui.filter = el.dataset.filter; if (ui.view !== 'projects' || ui.pview !== 'list') go('projects/list'); else { ui.keepScroll = true; render(); } return; }
  if ((el = c('[data-pview]'))) { go('projects/' + el.dataset.pview); return; }
  if ((el = c('[data-kcancel]'))) { ui.showCancelled = !ui.showCancelled; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-kcol]'))) { const col = $('#col-' + el.dataset.kcol); if (col) $('#board').scrollTo({ left: col.offsetLeft, behavior: 'smooth' }); return; }
  if ((el = c('[data-go]'))) { go(el.dataset.go); return; }
  if ((el = c('[data-doc-del]'))) {
    e.stopPropagation();
    if (!el.classList.contains('arm')) { el.classList.add('arm'); el.textContent = 'Tap again to delete'; return; }
    const d = db.docs.find(x => x.id === el.dataset.docDel); deleteRow('docs', d.id);
    const row = el.closest('.doc-it'); if (row) row.remove();
    if ($('#drawer').hidden) { ui.keepScroll = true; render(); }
    toast(`${d.no} deleted`); return;
  }
  if ((el = c('[data-doc]'))) { e.stopPropagation(); const d = db.docs.find(x => x.id === el.dataset.doc); if (d) printDoc(d); return; }
  if ((el = c('[data-doc-kind]'))) { ui.docKind = el.dataset.docKind; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-client-open]'))) { openClient(el.dataset.clientOpen); return; }
  if ((el = c('[data-client-new]'))) {
    const cl = clientMap().get(el.dataset.clientNew); closeLayers();
    openProject(null, { client: cl.name, phone: cl.phone, email: cl.email, instagram: cl.instagram, source: [...cl.sources].pop() || '' }); return;
  }
  if ((el = c('[data-client-projects]'))) { closeLayers(); ui.client = el.dataset.clientProjects; ui.filter = 'all'; ui.q = ''; go('projects/list'); return; }
  if ((el = c('[data-client]'))) { ui.client = el.dataset.client; ui.filter = 'all'; ui.q = ''; go('projects/list'); return; }
  if ((el = c('[data-open]'))) { openProject(el.dataset.open, null, el.dataset.ptab); return; }
  if ((el = c('[data-ret-new]'))) { openRetainer(); return; }
  if ((el = c('[data-exp-new]'))) { openExpense(null, { date: today() }); return; }
  if ((el = c('[data-exp-open]'))) { e.preventDefault(); openExpense(el.dataset.expOpen, null, $('#drawer').hidden ? null : () => $('#moneySum') && $('#f-price').dispatchEvent(new Event('input', { bubbles: true }))); return; }
  if ((el = c('[data-money-csv]'))) { exportMoneyCsv(); return; }
  if ((el = c('[data-ret-open]'))) { openRetainer(el.dataset.retOpen); return; }
  if ((el = c('[data-more]'))) { openMore(); return; }
  if ((el = c('[data-search]'))) { openSearch(); return; }
  if ((el = c('[data-s-go]'))) { searchGo(el.dataset.sGo); return; }
  if ((el = c('[data-s-all]'))) { ui.q = ui.sq; ui.filter = 'all'; ui.client = ''; closeLayers(); go('projects/list'); return; }
  if ((el = c('[data-more-go]'))) { e.preventDefault(); closeLayers(); go(el.dataset.moreGo); return; }
  if ((el = c('[data-cal]'))) {
    const n = +el.dataset.cal;
    if (!n) { ui.calMonth = today().slice(0, 7); ui.calSel = today(); }
    else { const [y, m] = ui.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); ui.calMonth = ymd(d).slice(0, 7); }
    ui.keepScroll = true; render(); return;
  }
  if ((el = c('[data-day]'))) { ui.calSel = el.dataset.day; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-period]'))) { ui.period = el.dataset.period; ui.keepScroll = true; render(); }
});
document.addEventListener('change', e => {
  const d = e.target.closest('[data-item-due]'); if (!d) return;
  ui.keepScroll = true; patchItem(d.dataset.itemDue, { due: d.value }); toast(d.value ? `Due ${fmtDate(d.value)}` : 'Due date removed');
});
// Quick-add a deliverable from the deliveries on Today.
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-add-item]'); if (!f) return;
  e.preventDefault();
  const v = n => f.elements[n].value;
  const type = v('type'), title = v('title').trim() || type;
  const it = normI({ id: uid(), projectId: f.dataset.addItem, type, title, qty: v('qty'), status: 'Pending' });
  db.items.push(it); saveLocal(); push({ action: 'upsert', table: 'items', rows: [it] });
  ui.keepScroll = true; render(); toast(`${itemLabel(it)} added`);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#scrim').hidden) closeLayers();
  if (e.key === 'Enter' && e.target.matches('.row[data-open], .dl-head[data-open], .alert[data-open], .mini-it[data-open], .kcard[data-open]')) openProject(e.target.dataset.open, null, e.target.dataset.ptab);
  if (e.key === 'Enter' && e.target.matches('.row[data-ret-open], .alert[data-ret-open]')) openRetainer(e.target.dataset.retOpen);
  if (e.key === 'Enter' && e.target.matches('[data-client-open]')) openClient(e.target.dataset.clientOpen);
  if (e.key === 'Enter' && e.target.matches('.doc-it[data-doc]')) { const d = db.docs.find(x => x.id === e.target.dataset.doc); if (d) printDoc(d); }
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.target.closest('input,textarea,select') && $('#scrim').hidden && cfg) { e.preventDefault(); openQuickAdd(); }
  if (((e.key === '/' && !e.target.closest('input,textarea,select')) || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && $('#scrim').hidden && cfg) { e.preventDefault(); openSearch(); }
});
$('#syncBtn').addEventListener('click', () => pull());
window.addEventListener('hashchange', route);
// Charts are drawn to the screen's width; redraw them when it changes (turning the phone).
let lastW = innerWidth, resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (innerWidth !== lastW && ui.view === 'money' && cfg) { lastW = innerWidth; ui.keepScroll = true; render(); } }, 250); });
window.addEventListener('online', () => pull(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(true); });

// ───────────────────────────── boot ─────────────────────────────
$$('[data-ic]').forEach(i => { i.outerHTML = icon(i.dataset.ic); });
$('#setLink').innerHTML = icon('gear');
$('#moreBtn').innerHTML = icon('more');
$('#searchBtn').innerHTML = icon('search');
if (SHEET_URL) { $('#cUrl').value = SHEET_URL; $('#cUrlField').style.display = 'none'; }
// Anywhere but the live address is a test copy: say so next to the logo.
if (!location.hostname.endsWith('github.io')) document.body.classList.add('preview');

$('#connectForm').addEventListener('submit', async e => {
  e.preventDefault();
  const url = $('#cUrl').value.trim(), key = $('#cKey').value.replace(/\D/g, '');
  const msg = $('#cMsg'), btn = $('#cGo');
  btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Connecting to your Sheet…';
  cfg = { url, key };
  try {
    await api({ action: 'all' });
    store.set(CFG_KEY, cfg);
    boot();
  } catch (err) {
    cfg = null; msg.className = 'msg err'; msg.textContent = err.message === 'Failed to fetch' ? 'Could not reach that link. Check it is the Web app URL ending in /exec.' : err.message;
  } finally { btn.disabled = false; }
});

// Makes Studio installable on the phone as its own app.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* still works as a normal page */ });

function boot() {
  if (!cfg) { $('#connect').hidden = false; $('#app').hidden = true; return; }
  $('#connect').hidden = true; $('#app').hidden = false;
  setSync(queue.length ? 'busy' : 'ok', queue.length ? `Saving ${queue.length}` : 'Synced');
  route();
  pull(true);
}
boot();
