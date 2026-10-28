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
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16.5" cy="13.5" r="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
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
const ui = { view: 'home', filter: 'active', q: '', client: '', calMonth: null, calSel: null, period: 'year', countdown: null };

const STATUSES = ['Inquiry', 'Booked', 'Shot', 'Editing', 'Delivered', 'Cancelled'];
const FLOW = ['Booked', 'Shot', 'Editing', 'Delivered'];
const ITEM_STATUSES = ['Pending', 'Editing', 'Delivered'];
const ROLES = ['Photographer', 'Videographer', 'Editor', 'Assistant', 'Drone', 'Other'];
const R_STATUSES = ['Active', 'Paused', 'Cancelled'];
const ACTIVE = ['Inquiry', 'Booked', 'Shot', 'Editing'];
const DEFAULTS = {
  types: 'Wedding\nBaptism\nPortrait\nEvent\nCommercial\nReal Estate & Construction\nEditorial\nMusic Video\nOther',
  sources: 'Instagram\nWhatsApp\nReferral\nWebsite\nTikTok\nOther',
  currency: 'AED',
  businessName: 'Rony Saad',
  tagline: 'Photography / Film / AI / Creative Marketing',
  email: '', phone: '', address: 'Dubai, United Arab Emirates', payInfo: '',
  invoiceNote: 'Thank you for trusting us with your story.',
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
const normI = i => ({ id: String(i.id), projectId: String(i.projectId), title: String(i.title || ''), status: ITEM_STATUSES.includes(i.status) ? i.status : 'Pending', due: String(i.due || ''), notes: String(i.notes || '') });
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
db.retainers = (db.retainers || []).map(normR);
db.settings = db.settings || [];

const project = id => db.projects.find(p => p.id === id);
const itemsOf = id => db.items.filter(i => i.projectId === id);
const crewOf = id => db.crew.filter(c => c.projectId === id);
const crewCost = id => crewOf(id).reduce((s, c) => s + c.fee, 0);
const balance = p => Math.max(0, p.price - p.paid);
// Everything the shoot cost you: other expenses plus what you pay your team.
const cost = p => p.expenses + crewCost(p.id);
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
      crew: (j.crew || []).map(normC), retainers: (j.retainers || []).map(normR),
      settings: (j.settings || []).map(s => ({ id: String(s.id), value: String(s.value ?? '') })),
    };
    lastSync = Date.now(); store.set('rs.lastSync', lastSync);
    saveLocal(); setSync('ok', 'Synced'); render();
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
      out.push({ g: 'Collect payment', sev: 'bad', p, title: `${money(balance(p))} due · ${p.title}`, sub: ref, act: 'pay' });
    if (p.date && p.date < t && ['Inquiry', 'Booked'].includes(p.status))
      out.push({ g: 'Date passed', sev: 'warn', p, title: `${p.title} was on ${fmtDate(p.date)}`, sub: 'Still marked ' + p.status, act: 'shot' });
    if (!p.date && ACTIVE.includes(p.status))
      out.push({ g: 'Missing info', sev: 'info', p, title: `${p.title} has no shoot date`, sub: ref, act: 'open' });
    if (!p.marketing && !p.price && p.status !== 'Inquiry')
      out.push({ g: 'Missing info', sev: 'info', p, title: `${p.title} has no price`, sub: ref, act: 'open' });
    if (['Shot', 'Editing'].includes(p.status) && p.date && daysBetween(p.date, t) > deliverDays && !itemsOf(p.id).some(i => i.due >= t))
      out.push({ g: 'Delivery taking long', sev: 'warn', p, title: `${p.title} shot ${daysBetween(p.date, t)} days ago`, sub: 'Not delivered yet', act: 'open' });
    if (p.marketing && !p.posted && (p.status === 'Delivered' || (p.date && daysBetween(p.date, t) > postDays)))
      out.push({ g: 'Post on your page', sev: 'acc', p, title: `${p.title}`, sub: 'Free shoot, not posted yet', act: 'posted' });
  });
  db.items.forEach(i => {
    const p = project(i.projectId);
    if (!p || p.status === 'Cancelled' || i.status === 'Delivered' || !i.due) return;
    if (i.due < t) out.push({ g: 'Overdue deliveries', sev: 'bad', p, item: i, title: `${i.title} · ${p.title}`, sub: `Was due ${fmtDate(i.due)} (${daysBetween(i.due, t)} days late)`, act: 'item' });
    else if (i.due <= addDays(t, 1)) out.push({ g: 'Due soon', sev: 'warn', p, item: i, title: `${i.title} · ${p.title}`, sub: `Due ${i.due === t ? 'today' : 'tomorrow'}`, act: 'item' });
  });
  db.crew.forEach(c => {
    const p = project(c.projectId);
    if (!p || c.paidOn || !c.fee || !['Shot', 'Editing', 'Delivered'].includes(p.status)) return;
    out.push({ g: 'Pay your team', sev: 'warn', p, crew: c, title: `${money(c.fee)} to ${c.name || 'your ' + c.role.toLowerCase()}`, sub: `${c.role} · ${p.title}`, act: 'crew' });
  });
  db.retainers.filter(r => r.status === 'Active').forEach(r => {
    if (retDue(r)) out.push({ g: 'Collect payment', sev: 'bad', r, title: `${money(r.fee)} · ${r.client} monthly fee`, sub: `${monthName(thisMonth())} not received yet`, act: 'ret-pay' });
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
  const its = itemsOf(p.id), done = its.filter(i => i.status === 'Delivered').length;
  return `<div class="row ${p.status === 'Cancelled' ? 'cancelled' : ''}" data-open="${p.id}" role="button" tabindex="0">
    ${dateBlock(p)}
    <div class="main"><strong>${esc(p.title || p.client)}</strong>
      <small>${esc(p.client)}${p.type ? ' · ' + esc(p.type) : ''}${p.time ? ' · ' + fmtTime(p.time) : ''}${its.length ? ` · ${done}/${its.length} delivered` : ''}</small></div>
    ${steps(p)}
    <div class="money"><b>${p.marketing ? 'Free' : money(p.price)}</b><span class="tag ${payCls}">${pay}${!p.marketing && balance(p) && p.paid ? ' · ' + money(balance(p)) + ' left' : ''}</span></div>
  </div>`;
}
const clientNames = () => [...new Set(db.projects.map(p => p.client).filter(Boolean))].sort();

// ───────────────────────────── views ─────────────────────────────
function renderHome() {
  const t = today(), now = new Date();
  const upcoming = db.projects.filter(p => p.date >= t && !['Cancelled', 'Inquiry'].includes(p.status) && p.status !== 'Delivered')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = upcoming[0];
  const monthKey = t.slice(0, 7);
  const inMonth = db.projects.filter(p => p.status !== 'Cancelled' && !p.marketing && dayOf(p).slice(0, 7) === monthKey);
  const activeRet = db.retainers.filter(r => r.status === 'Active' && (!r.start || r.start.slice(0, 7) <= monthKey));
  const outstanding = db.projects.filter(p => p.status !== 'Cancelled' && !p.marketing).reduce((s, p) => s + balance(p), 0)
    + db.retainers.filter(retDue).reduce((s, r) => s + r.fee, 0);
  const retNote = activeRet.length ? ` + ${activeRet.length} retainer${activeRet.length === 1 ? '' : 's'}` : '';
  const all = alerts();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const openItems = db.items.filter(i => i.status !== 'Delivered' && project(i.projectId) && project(i.projectId).status !== 'Cancelled')
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 7);

  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}</p>
    <h1>${greet}, <span class="a">${esc(setting('businessName').split(' ')[0])}</span></h1></div></div>
  ${next ? `<section class="hero">
      <div><div class="label">Next shoot · ${esc(next.code)}</div>
        <h3>${esc(next.title)}</h3>
        <div class="meta"><span>${fmtDate(next.date)}${next.time ? ' · ' + fmtTime(next.time) : ''}</span><span>${esc(next.client)}</span>${next.location ? `<span>${/^https?:/.test(next.location) ? `<a class="linkbtn" href="${esc(next.location)}" target="_blank" rel="noopener">Open location ↗</a>` : esc(next.location)}</span>` : ''}</div>
        <div class="acts">${waBtn(next, 'remind', 'Send reminder')}<button class="btn sm" data-open="${next.id}">Open project</button></div></div>
      <div class="cd" id="cd" data-at="${next.date}T${next.time || '00:00'}"></div>
    </section>` : `<section class="hero"><div><div class="label">Next shoot</div><h3>Nothing booked ahead</h3><div class="meta">Add your next booking and it shows up here with a countdown.</div><div class="acts"><button class="btn primary sm" data-add>+ New booking</button></div></div></section>`}
  <div class="kpis">
    <button class="kpi" data-go="money"><small>Booked this month</small><b>${money(inMonth.reduce((s, p) => s + p.price, 0) + activeRet.reduce((s, r) => s + r.fee, 0))}</b><em>${inMonth.length} project${inMonth.length === 1 ? '' : 's'}${retNote}</em></button>
    <button class="kpi" data-go="money"><small>Collected this month</small><b>${money(inMonth.reduce((s, p) => s + Math.min(p.paid, p.price || p.paid), 0) + retIncome(monthKey))}</b><em>shoots and retainers</em></button>
    <button class="kpi" data-filter="unpaid"><small>Waiting to collect</small><b class="acc">${money(outstanding)}</b><em>all open balances</em></button>
    <button class="kpi" data-filter="active"><small>Active projects</small><b>${db.projects.filter(p => ACTIVE.includes(p.status)).length}</b><em>${upcoming.length} shoot${upcoming.length === 1 ? '' : 's'} coming up</em></button>
  </div>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>Needs your attention</h2><small>${all.length} item${all.length === 1 ? '' : 's'}</small></div>${renderAlerts(all, 8)}</section>
    <div class="stack">
      <section class="panel"><div class="ph"><h2>Coming up</h2><a class="linkbtn" href="#calendar">Calendar →</a></div>
        ${upcoming.length ? `<div class="mini">${upcoming.slice(0, 6).map(p => `<div class="mini-it" data-open="${p.id}"><div><b>${esc(p.title)}</b><small>${esc(p.client)}</small></div><div class="r">${fmtDate(p.date)}<small>${p.date === t ? 'Today' : 'in ' + daysBetween(t, p.date) + ' d'}${p.time ? ' · ' + fmtTime(p.time) : ''}</small></div></div>`).join('')}</div>` : '<div class="empty">No upcoming shoots</div>'}</section>
      <section class="panel"><div class="ph"><h2>To deliver</h2><small>${db.items.filter(i => i.status !== 'Delivered').length} open</small></div>
        ${openItems.length ? `<div class="mini">${openItems.map(i => { const p = project(i.projectId); return `<div class="mini-it" data-open="${p.id}"><div><b>${esc(i.title)}</b><small>${esc(p.title)} · ${i.status}</small></div><div class="r ${i.due && i.due < t ? 'late' : ''}">${i.due ? fmtDate(i.due) : '<small>No due date</small>'}</div></div>`; }).join('')}</div>` : '<div class="empty">Everything is delivered</div>'}</section>
    </div>
  </div>`;
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

function filteredProjects() {
  const t = today(), q = ui.q.trim().toLowerCase();
  const att = new Set(alerts().filter(a => a.p).map(a => a.p.id));
  const F = {
    active: p => ACTIVE.includes(p.status),
    attention: p => att.has(p.id),
    unpaid: p => !p.marketing && p.status !== 'Cancelled' && balance(p) > 0,
    delivered: p => p.status === 'Delivered',
    marketing: p => p.marketing,
    all: () => true,
  };
  let rows = db.projects.filter(F[ui.filter] || F.all);
  if (ui.client) rows = rows.filter(p => p.client === ui.client);
  if (q) rows = rows.filter(p => [p.code, p.client, p.title, p.type, p.phone, p.notes, p.location].join(' ').toLowerCase().includes(q));
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
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${db.projects.length} projects</p><h1>Pro<span class="o">jects</span></h1></div>
    <button class="btn primary" data-add>+ New booking</button></div>
  <div class="filters">
    <input type="search" id="q" placeholder="Search client, project, phone, notes…" value="${esc(ui.q)}" aria-label="Search projects">
    ${ui.client ? `<button class="chip" aria-pressed="true" id="clearClient">${esc(ui.client)} ✕</button>` : ''}
  </div>
  <div class="chips" role="group" aria-label="Filter">${Object.keys(labels).map(k => `<button class="chip" data-filter="${k}" aria-pressed="${ui.filter === k}">${labels[k]}<span class="n">${counts[k]}</span></button>`).join('')}</div>
  <div class="rows" id="rows"></div>`;
  drawRows();
  $('#q').addEventListener('input', e => { ui.q = e.target.value; drawRows(); });
  const cc = $('#clearClient'); if (cc) cc.onclick = () => { ui.client = ''; renderProjects(); };
}
function drawRows() {
  const rows = filteredProjects();
  $('#rows').innerHTML = rows.length ? rows.map(projectRow).join('') : `<div class="empty"><b>No projects here</b>Try another filter, or add a booking.</div>`;
}

function renderCalendar() {
  const t = today();
  if (!ui.calMonth) ui.calMonth = t.slice(0, 7);
  const [y, m] = ui.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const byDay = {};
  const add = (d, e) => { (byDay[d] = byDay[d] || []).push(e); };
  db.projects.filter(p => p.date && p.status !== 'Cancelled').forEach(p => add(p.date, { kind: p.marketing ? 'free' : 'shoot', p, label: `${p.time ? fmtTime(p.time).replace(':00', '') + ' ' : ''}${p.client}` }));
  db.items.filter(i => i.due && i.status !== 'Delivered').forEach(i => { const p = project(i.projectId); if (p && p.status !== 'Cancelled') add(i.due, { kind: 'due', p, label: `Due: ${i.title}` }); });
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
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${monthShoots.length} shoot${monthShoots.length === 1 ? '' : 's'} this month</p><h1>Calen<span class="o">dar</span></h1></div>
    <div class="calnav"><button class="x" data-cal="-1" aria-label="Previous month">‹</button><span class="ttl">${MONTHS[m - 1]} ${y}</span><button class="x" data-cal="1" aria-label="Next month">›</button><button class="btn sm ghost" data-cal="0">Today</button></div></div>
  <section class="panel">
    <div class="cal">${DAYS.map(d => `<div class="cal-h">${d}</div>`).join('')}${cells}</div>
    <div class="legend"><span><i style="background:var(--accent)"></i>Paid shoot</span><span><i style="background:#ffffff33"></i>Free shoot</span><span><i style="border:1px solid var(--info)"></i>Delivery due</span></div>
  </section>
  ${ui.calSel ? `<section class="panel"><div class="ph"><h2>${fmtDate(ui.calSel)}</h2><button class="btn sm primary" data-add-day="${ui.calSel}">+ Book this day</button></div>
    ${sel ? `<div class="mini">${sel.map(e => `<div class="mini-it" data-open="${e.p.id}"><div><b>${esc(e.kind === 'due' ? e.label : e.p.title)}</b><small>${esc(e.p.client)}${e.p.location && !/^https?:/.test(e.p.location) ? ' · ' + esc(e.p.location) : ''}</small></div><div class="r">${e.kind === 'due' ? '<span class="tag t-info">Delivery</span>' : `<span class="tag ${STATUS_TAG[e.p.status]}">${e.p.status}</span>`}<small>${e.p.time && e.kind !== 'due' ? fmtTime(e.p.time) : ''}</small></div></div>`).join('')}</div>` : '<div class="empty"><b>Free day</b>Nothing booked.</div>'}
  </section>` : ''}`;
}

function periodRange() {
  const t = today(), y = t.slice(0, 4);
  if (ui.period === 'month') return [t.slice(0, 7) + '-01', '9999'];
  if (ui.period === '3m') { const d = new Date(); d.setMonth(d.getMonth() - 2, 1); return [ymd(d), '9999']; }
  if (ui.period === 'year') return [y + '-01-01', y + '-12-31'];
  return ['0000', '9999'];
}
function renderMoney() {
  const [from, to] = periodRange();
  const paidP = db.projects.filter(p => p.status !== 'Cancelled' && !p.marketing);
  const inP = paidP.filter(p => dayOf(p) >= from && dayOf(p) <= to);
  const sum = (a, f) => a.reduce((s, p) => s + f(p), 0);
  const retPaid = db.retainers.flatMap(r => paidMonths(r).filter(m => m >= from.slice(0, 7) && m <= to.slice(0, 7)).map(() => r.fee));
  const retIn = retPaid.reduce((s, v) => s + v, 0);
  const booked = sum(inP, p => p.price) + retIn, collected = sum(inP, p => Math.min(p.paid, p.price || p.paid)) + retIn;
  const exp = sum(db.projects.filter(p => p.status !== 'Cancelled' && dayOf(p) >= from && dayOf(p) <= to), cost);
  const owed = paidP.filter(p => balance(p) > 0).sort((a, b) => balance(b) - balance(a));

  // last 12 months chart
  const months = [];
  const d0 = new Date(); d0.setDate(1);
  for (let k = 11; k >= 0; k--) { const d = new Date(d0); d.setMonth(d0.getMonth() - k); months.push(ymd(d).slice(0, 7)); }
  const series = months.map(mk => {
    const ps = db.projects.filter(p => p.status !== 'Cancelled' && dayOf(p).slice(0, 7) === mk);
    return { mk, rev: sum(ps.filter(p => !p.marketing), p => p.price) + retIncome(mk), exp: sum(ps, cost) };
  });
  const max = Math.max(1, ...series.map(s => Math.max(s.rev, s.exp)));
  const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
  const W = 720, H = 260, L = 56, R = 10, T = 16, B = 30, cw = (W - L - R) / 12, bw = Math.min(18, cw / 3);
  const yv = v => T + (H - T - B) * (1 - v / nice);
  const ticks = [0, .25, .5, .75, 1].map(f => nice * f);
  const svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue and expenses for the last 12 months">
    <g class="grid">${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${yv(v)}" y2="${yv(v)}"/><text x="${L - 8}" y="${yv(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k' : v}</text>`).join('')}</g>
    ${series.map((s, i) => { const x = L + i * cw + cw / 2; return `
      <rect x="${x - bw - 1}" y="${yv(s.rev)}" width="${bw}" height="${Math.max(0, H - B - yv(s.rev))}" rx="2" fill="var(--accent)"><title>${MONTHS[+s.mk.slice(5) - 1]}: revenue ${money(s.rev)}</title></rect>
      <rect x="${x + 1}" y="${yv(s.exp)}" width="${bw}" height="${Math.max(0, H - B - yv(s.exp))}" rx="2" fill="#ffffff40"><title>${MONTHS[+s.mk.slice(5) - 1]}: expenses ${money(s.exp)}</title></rect>
      <text x="${x}" y="${H - 10}" text-anchor="middle">${MONTHS[+s.mk.slice(5) - 1]}</text>`; }).join('')}
  </svg>`;

  const byType = {};
  inP.forEach(p => { const k = p.type || 'Other'; byType[k] = byType[k] || { n: 0, rev: 0, prof: 0 }; byType[k].n++; byType[k].rev += p.price; byType[k].prof += profit(p); });
  if (retIn) byType['Social retainers'] = { n: retPaid.length, rev: retIn, prof: retIn, unit: 'paid month' };
  const types = Object.entries(byType).sort((a, b) => b[1].rev - a[1].rev);
  const topRev = Math.max(1, ...types.map(t => t[1].rev));
  const per = { month: 'This month', '3m': '3 months', year: 'This year', all: 'All time' };

  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${per[ui.period]}</p><h1>Mo<span class="o">ney</span></h1></div>
    <div class="seg" role="group" aria-label="Period">${Object.entries(per).map(([k, v]) => `<button data-period="${k}" aria-pressed="${ui.period === k}">${v}</button>`).join('')}</div></div>
  <div class="kpis">
    <div class="kpi"><small>Booked</small><b>${money(booked)}</b><em>${inP.length} paid project${inP.length === 1 ? '' : 's'}${retIn ? ' + retainers' : ''}</em></div>
    <div class="kpi"><small>Collected</small><b>${money(collected)}</b><em>${booked ? Math.round(collected / booked * 100) : 0}% of booked</em></div>
    <div class="kpi"><small>Expenses</small><b>${money(exp)}</b><em>team, gear, travel</em></div>
    <div class="kpi"><small>Profit</small><b class="acc">${money(booked - exp)}</b><em>booked minus expenses</em></div>
  </div>
  <section class="panel"><div class="ph"><h2>Last 12 months</h2><div class="legend" style="margin:0"><span><i style="background:var(--accent)"></i>Revenue</span><span><i style="background:#ffffff40"></i>Expenses</span></div></div>${svg}</section>
  <div class="cols">
    <section class="panel"><div class="ph"><h2>Waiting to collect</h2><small>${money(sum(owed, balance))} total</small></div>
      ${owed.length ? `<div class="mini">${owed.map(p => `<div class="mini-it" data-open="${p.id}"><div><b>${esc(p.title)}</b><small>${esc(p.client)} · ${p.date ? fmtDate(p.date) : 'no date'} · paid ${money(p.paid)} of ${money(p.price)}</small></div><div class="r"><b>${money(balance(p))}</b></div></div>`).join('')}</div>` : '<p class="allclear">Everyone has paid.</p>'}</section>
    <section class="panel"><div class="ph"><h2>By shoot type</h2><small>${per[ui.period]}</small></div>
      ${types.length ? `<div class="bars">${types.map(([k, v]) => `<div class="bar-row"><span>${esc(k)}</span><b>${money(v.rev)}</b><div class="track"><i style="width:${(v.rev / topRev * 100).toFixed(1)}%"></i></div><small>${v.n} ${v.unit || 'project'}${v.n === 1 ? '' : 's'} · profit ${money(v.prof)}</small></div>`).join('')}</div>` : '<div class="empty">No paid projects in this period</div>'}</section>
  </div>`;
}

function renderClients() {
  const map = new Map();
  db.projects.forEach(p => {
    const k = waNumber(p.phone) || p.client.trim().toLowerCase();
    if (!k) return;
    const c = map.get(k) || { name: p.client, phone: p.phone, instagram: p.instagram, n: 0, value: 0, owed: 0, last: '', sources: new Set() };
    c.n++; if (!p.marketing && p.status !== 'Cancelled') { c.value += p.price; c.owed += balance(p); }
    if (dayOf(p) > c.last) { c.last = dayOf(p); c.name = p.client || c.name; }
    if (p.phone) c.phone = p.phone; if (p.instagram) c.instagram = p.instagram; if (p.source) c.sources.add(p.source);
    map.set(k, c);
  });
  const rows = [...map.values()].sort((a, b) => b.value - a.value || b.last.localeCompare(a.last));
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${rows.length} clients · ${rows.filter(c => c.n > 1).length} came back</p><h1>Cli<span class="o">ents</span></h1></div></div>
  <input type="search" id="cq" placeholder="Search clients…" aria-label="Search clients">
  <div class="tbl"><table><thead><tr><th>Client</th><th>Phone</th><th class="n">Projects</th><th class="n">Total value</th><th class="n">Still owes</th><th>Last shoot</th><th></th></tr></thead>
  <tbody id="ctb">${rows.map(c => `<tr data-client="${esc(c.name)}" data-s="${esc((c.name + ' ' + c.phone + ' ' + c.instagram).toLowerCase())}">
    <td><b>${esc(c.name)}</b>${c.instagram ? `<br><small class="code">${esc(c.instagram)}</small>` : ''}</td>
    <td>${esc(c.phone) || '<span class="code">—</span>'}</td><td class="n">${c.n}</td><td class="n">${money(c.value)}</td>
    <td class="n">${c.owed ? `<span class="tag t-bad">${money(c.owed)}</span>` : '<span class="code">—</span>'}</td>
    <td>${c.last ? fmtDate(c.last) : ''}</td>
    <td>${waNumber(c.phone) ? `<a class="btn sm wa" href="https://wa.me/${waNumber(c.phone)}" target="_blank" rel="noopener" data-stop>WhatsApp</a>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  $('#cq').addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('#ctb tr').forEach(tr => { tr.hidden = !tr.dataset.s.includes(q); }); });
}

function renderTeam() {
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
  $('#view').innerHTML = `
  <div class="vhead"><div><p class="eyebrow">${rows.length} ${rows.length === 1 ? 'person' : 'people'} worked with you</p><h1>Te<span class="o">am</span></h1></div></div>
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
    : '<div class="empty"><b>No team yet</b>Open a project and add who worked with you under “Team”, with what you pay them.</div>'}`;
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
    <nav class="more">${link('retainers', 'repeat', 'Retainers', 'Monthly social media clients')}${link('team', 'camera', 'Team', 'Who worked with you and what you owe')}${link('clients', 'users', 'Clients', 'Everyone you shot for')}${link('settings', 'gear', 'Settings', 'Invoice details, lists, backup')}</nav></div>`;
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
    <section class="panel stack"><h2>Invoice details</h2>
      ${f('businessName', 'Business name')}${f('tagline', 'Tagline')}
      <div class="grid2">${f('email', 'Email', 'email')}${f('phone', 'Phone', 'tel')}</div>
      ${f('address', 'Address')}
      <div class="grid2">${f('currency', 'Currency')}</div>
      <label class="field"><span>Payment details (bank / IBAN)</span><textarea id="s-payInfo">${esc(setting('payInfo'))}</textarea></label>
      <label class="field"><span>Note at the bottom of invoices</span><textarea id="s-invoiceNote">${esc(setting('invoiceNote'))}</textarea></label></section>
    <section class="panel stack"><h2>Lists & reminders</h2>
      <label class="field"><span>Shoot types (one per line)</span><textarea id="s-types" rows="7">${esc(setting('types'))}</textarea></label>
      <label class="field"><span>Where clients find you (one per line)</span><textarea id="s-sources" rows="5">${esc(setting('sources'))}</textarea></label>
      <div class="grid2">${f('postDays', 'Remind to post free shoots after (days)', 'number')}${f('deliverDays', 'Flag slow deliveries after (days)', 'number')}</div></section>
    <section class="panel stack"><h2>Data</h2>
      <p class="fine">Import the projects from your old dashboard (its data.json file). This adds them to the Sheet; anything with the same ID is updated, not doubled.</p>
      <label class="btn sm" style="align-self:flex-start">Import old data.json<input type="file" id="sImport" accept=".json,application/json" hidden></label>
      <div class="modal-acts" style="justify-content:flex-start"><button class="btn sm" id="sCsv">Download CSV</button><button class="btn sm" id="sJson">Download backup</button></div></section>
  </div>
  <div class="modal-acts"><button class="btn primary" id="sSave">Save settings</button></div>`;
  $('#sSave').onclick = () => {
    const rows = Object.keys(DEFAULTS).map(k => ({ id: k, value: $('#s-' + k) ? $('#s-' + k).value.trim() : setting(k) }));
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
function openProject(id, preset) {
  const isNew = !id;
  const p = isNew ? normP({ id: uid(), code: nextCode(), status: 'Booked', created: today(), ...preset }) : { ...project(id) };
  if (!p) return;
  let items = isNew ? (preset && preset._items) || [] : itemsOf(p.id).map(i => ({ ...i }));
  let crew = isNew ? [] : crewOf(p.id).map(c => ({ ...c }));
  const opt = (arr, v) => [...new Set([...arr, v].filter(Boolean))].map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const dr = $('#drawer');
  const [pay, payCls] = payState(p);
  dr.innerHTML = `
  <div class="dr-head"><div class="t"><span class="code">${esc(p.code)}${isNew ? ' · New' : ''}</span><h2 id="drawerTitle">${esc(p.title || 'New booking')}</h2>
    <div class="sub"><span class="tag ${STATUS_TAG[p.status]}">${p.status}</span><span class="tag ${payCls}">${pay}</span></div></div>
    <button class="x" data-close aria-label="Close">✕</button></div>
  <form class="dr-body" id="pForm" autocomplete="off">
    <section class="dr-sec"><h3>Client</h3>
      <div class="grid2"><label class="field"><span>Name</span><input id="f-client" list="dl-clients" value="${esc(p.client)}" required></label>
        <label class="field"><span>Phone / WhatsApp</span><input id="f-phone" type="tel" value="${esc(p.phone)}" placeholder="+971 5x xxx xxxx"></label>
        <label class="field"><span>Instagram</span><input id="f-instagram" value="${esc(p.instagram)}" placeholder="@handle"></label>
        <label class="field"><span>Email</span><input id="f-email" type="email" value="${esc(p.email)}"></label></div>
      <label class="field"><span>Found you through</span><select id="f-source"><option value="">—</option>${opt(list('sources'), p.source)}</select></label>
    </section>
    <section class="dr-sec"><h3>Shoot</h3>
      <label class="field"><span>Project name</span><input id="f-title" value="${esc(p.title)}" placeholder="e.g. Wedding – Sara & Karim"></label>
      <div class="grid2"><label class="field"><span>Type</span><select id="f-type">${opt(list('types'), p.type)}</select></label>
        <label class="field"><span>Status</span><select id="f-status">${opt(STATUSES, p.status)}</select></label>
        <label class="field"><span>Date</span><input id="f-date" type="date" value="${esc(p.date)}"></label>
        <label class="field"><span>Time</span><input id="f-time" type="time" value="${esc(p.time)}"></label></div>
      <label class="field"><span>Location (address or Google Maps link)</span><input id="f-location" value="${esc(p.location)}"></label>
      <div class="grid2"><label class="check"><input type="checkbox" id="f-marketing" ${p.marketing ? 'checked' : ''}> Free shoot for my page</label>
        <label class="check"><input type="checkbox" id="f-posted" ${p.posted ? 'checked' : ''}> Posted on social</label></div>
    </section>
    <section class="dr-sec"><h3>Money</h3>
      <div class="grid3"><label class="field"><span>Price</span><input id="f-price" type="number" inputmode="decimal" min="0" value="${p.price || ''}"></label>
        <label class="field"><span>Received</span><input id="f-paid" type="number" inputmode="decimal" min="0" value="${p.paid || ''}"></label>
        <label class="field"><span>Other expenses</span><input id="f-expenses" type="number" inputmode="decimal" min="0" value="${p.expenses || ''}"></label></div>
      <div class="money-sum" id="moneySum"></div>
      <div class="payrow"><input id="payAmt" type="number" inputmode="decimal" min="0" placeholder="Add a payment you received"><button type="button" class="btn sm" id="payAdd">Add payment</button><button type="button" class="btn sm ghost" id="payFull">Paid in full</button></div>
    </section>
    <section class="dr-sec"><h3>Team <button type="button" class="linkbtn" id="crAdd">+ Add</button></h3>
      <div class="items" id="crew"></div>
      <datalist id="dl-crew">${[...new Set(db.crew.map(c => c.name).filter(Boolean))].sort().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    </section>
    <section class="dr-sec"><h3>Deliverables <button type="button" class="linkbtn" id="itAdd">+ Add</button></h3>
      <div class="items" id="items"></div>
    </section>
    <section class="dr-sec"><h3>Files & notes</h3>
      <label class="field"><span>Delivery / Drive link</span><input id="f-drive" type="url" value="${esc(p.drive)}" placeholder="https://drive.google.com/…"></label>
      <label class="field"><span>Notes</span><textarea id="f-notes" rows="4">${esc(p.notes)}</textarea></label>
    </section>
    ${waNumber(p.phone) && !isNew ? `<section class="dr-sec"><h3>WhatsApp</h3><div class="wa-menu">${waBtn(p, 'confirm', 'Confirm booking')}${waBtn(p, 'remind', 'Shoot reminder')}${balance(p) ? waBtn(p, 'pay', 'Payment reminder') : ''}${waBtn(p, 'ready', 'Files ready')}</div></section>` : ''}
    <datalist id="dl-clients">${clientNames().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
  </form>
  <div class="dr-foot">
    <button class="btn primary" id="pSave" type="button">${isNew ? 'Add booking' : 'Save changes'}</button>
    ${isNew ? '' : '<button class="btn sm" id="pInvoice" type="button">Invoice</button>'}
    <span class="sp"></span>
    ${isNew ? '' : '<button class="btn sm danger" id="pDel" type="button">Delete</button>'}
  </div>`;
  showLayer(dr);

  const val = k => $('#f-' + k).value.trim();
  const drawMoney = () => {
    const price = num(val('price')), paid = num(val('paid')), ex = num(val('expenses')) + crew.reduce((s, c) => s + num(c.fee), 0);
    $('#moneySum').innerHTML = `<div><small>Balance</small><b style="color:${price - paid > 0 ? 'var(--bad)' : 'var(--ok)'}">${money(Math.max(0, price - paid))}</b></div><div><small>Profit${crew.length ? ' after team' : ''}</small><b>${money(price - ex)}</b></div><div><small>Margin</small><b>${price ? Math.round((price - ex) / price * 100) : 0}%</b></div>`;
  };
  const drawItems = () => {
    $('#items').innerHTML = items.length ? items.map((it, i) => `<div class="item" data-i="${i}">
      <input value="${esc(it.title)}" data-k="title" placeholder="e.g. Highlight video" aria-label="Deliverable">
      <select data-k="status" aria-label="Status">${ITEM_STATUSES.map(s => `<option ${s === it.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input type="date" value="${esc(it.due)}" data-k="due" aria-label="Due date">
      <button type="button" class="del" data-rm="${i}" aria-label="Remove">✕</button></div>`).join('') : '<p class="fine">Add what you owe the client: photos, reels, album, highlight video…</p>';
  };
  const drawCrew = () => {
    $('#crew').innerHTML = crew.length ? crew.map((c, i) => `<div class="item crew-row" data-c="${i}">
      <input value="${esc(c.name)}" data-ck="name" list="dl-crew" placeholder="Name" aria-label="Name">
      <select data-ck="role" aria-label="Role">${ROLES.map(r => `<option ${r === c.role ? 'selected' : ''}>${r}</option>`).join('')}</select>
      <input type="number" inputmode="decimal" min="0" value="${c.fee || ''}" data-ck="fee" placeholder="Fee" aria-label="Fee">
      <label class="check paid-chk"><input type="checkbox" data-ck="paidOn" ${c.paidOn ? 'checked' : ''}> Paid</label>
      <button type="button" class="del" data-crm="${i}" aria-label="Remove">✕</button></div>`).join('') : '<p class="fine">Add who worked with you on this shoot and what you pay them. It counts in your profit and reminds you to pay them.</p>';
  };
  drawMoney(); drawItems(); drawCrew();
  $('#pForm').addEventListener('input', e => {
    const row = e.target.closest('.item');
    if (row && e.target.dataset.k) items[row.dataset.i][e.target.dataset.k] = e.target.value;
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
    if (['f-price', 'f-paid', 'f-expenses'].includes(e.target.id) || ck === 'fee' || ck === 'name') drawMoney();
  });
  $('#crew').addEventListener('click', e => { const rm = e.target.closest('[data-crm]'); if (rm) { crew.splice(+rm.dataset.crm, 1); drawCrew(); drawMoney(); } });
  $('#crAdd').onclick = () => { crew.push({ id: uid(), projectId: p.id, name: '', role: 'Photographer', fee: 0, paidOn: '', notes: '' }); drawCrew(); $$('#crew .crew-row input[data-ck=name]').pop().focus(); };
  $('#items').addEventListener('click', e => { const rm = e.target.closest('[data-rm]'); if (rm) { items.splice(+rm.dataset.rm, 1); drawItems(); } });
  $('#itAdd').onclick = () => { items.push({ id: uid(), projectId: p.id, title: '', status: 'Pending', due: '', notes: '' }); drawItems(); $$('#items .item input[data-k=title]').pop().focus(); };
  $('#payAdd').onclick = () => { const a = num($('#payAmt').value); if (!a) return; $('#f-paid').value = num(val('paid')) + a; $('#payAmt').value = ''; drawMoney(); toast(`${money(a)} added. Save to keep it.`); };
  $('#payFull').onclick = () => { $('#f-paid').value = val('price'); drawMoney(); };
  $('#pSave').onclick = () => {
    if (!val('client')) { $('#f-client').focus(); toast('Add the client name first', true); return; }
    const out = normP({
      ...p, client: val('client'), phone: val('phone'), instagram: val('instagram'), email: val('email'), source: $('#f-source').value,
      title: val('title') || `${$('#f-type').value} – ${val('client')}`, type: $('#f-type').value, status: $('#f-status').value,
      date: val('date'), time: val('time'), location: val('location'), marketing: $('#f-marketing').checked, posted: $('#f-posted').checked,
      price: val('price'), paid: val('paid'), expenses: val('expenses'), drive: val('drive'), notes: $('#f-notes').value.trim(),
    });
    const its = items.filter(i => i.title.trim()).map(i => normI({ ...i, projectId: out.id, title: i.title.trim() }));
    const team = crew.filter(c => c.name.trim() || num(c.fee)).map(c => normC({ ...c, projectId: out.id, name: c.name.trim() }));
    saveProject(out, its, team); closeLayers(); render(); toast(isNew ? 'Booking added' : 'Saved');
  };
  const inv = $('#pInvoice'); if (inv) inv.onclick = () => printInvoice(project(p.id));
  const del = $('#pDel');
  if (del) del.onclick = () => {
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
    <datalist id="dl-q">${clientNames().map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <div class="modal-acts"><button type="button" class="btn ghost" id="qMore">More details</button><button type="submit" class="btn primary">Add booking</button></div>
  </form>`;
  showLayer(m);
  setTimeout(() => $('#q-client')?.focus(), 50);
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
  $('#qMore').onclick = () => { const v = read(); closeLayers(); openProject(null, v); };
  $('#qForm').onsubmit = e => {
    e.preventDefault();
    const v = read();
    if (!v.client) return;
    const p = normP({ id: uid(), code: nextCode(), created: today(), ...v });
    saveProject(p, []); closeLayers(); render();
    toast(`${p.code} added${p.date ? ' for ' + fmtDate(p.date) : ''}`);
  };
}

// ───────────────────────────── layers ─────────────────────────────
let lastFocus = null;
function showLayer(el) { lastFocus = document.activeElement; $('#scrim').hidden = false; el.hidden = false; document.body.style.overflow = 'hidden'; }
function closeLayers() {
  ['#drawer', '#modal'].forEach(s => { $(s).hidden = true; $(s).innerHTML = ''; });
  $('#scrim').hidden = true; document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

// ───────────────────────────── invoice ─────────────────────────────
function printInvoice(p) {
  const its = itemsOf(p.id);
  const no = 'INV-' + (p.code.replace(/\D/g, '') || p.id.slice(-5));
  $('#invoice').innerHTML = `
  <div class="inv-head"><div><div class="wordmark">${esc(setting('businessName').toUpperCase().replace(' ', '<span>.</span>'))}<em>®</em></div><div class="tag-line">${esc(setting('tagline'))}</div></div>
    <div class="inv-title"><h1>INVOICE</h1><div>${no}</div><div>${fmtDate(today())}</div></div></div>
  <div class="inv-meta"><div><h4>Billed to</h4><p><b>${esc(p.client)}</b></p><p>${esc(p.phone)}</p><p>${esc(p.email)}</p></div>
    <div><h4>From</h4><p><b>${esc(setting('businessName'))}</b></p><p>${esc(setting('address'))}</p><p>${esc(setting('phone'))} ${esc(setting('email'))}</p></div></div>
  <table><thead><tr><th>Description</th><th>Date</th><th class="n">Amount</th></tr></thead><tbody>
    <tr><td><b>${esc(p.title)}</b><br>${esc(p.type)}${its.length ? '<br>Includes: ' + its.map(i => esc(i.title)).join(', ') : ''}</td><td>${p.date ? fmtDate(p.date) : ''}</td><td class="n">${money(p.price)}</td></tr>
  </tbody></table>
  <div class="inv-tot"><div><span>Total</span><span>${money(p.price)}</span></div><div><span>Received</span><span>${money(p.paid)}</span></div><div class="big"><span>Balance due</span><b>${money(balance(p))}</b></div></div>
  ${setting('payInfo') ? `<div class="inv-note"><b>Payment details</b>\n${esc(setting('payInfo'))}</div>` : ''}
  <div class="inv-note">${esc(setting('invoiceNote'))}</div>`;
  const prevTitle = document.title;
  document.title = `${no} ${p.client}`;
  window.print();
  setTimeout(() => { document.title = prevTitle; }, 500);
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
      id: w._id, projectId: o._id, title: w.title || w.type,
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
const VIEWS = { home: renderHome, projects: renderProjects, calendar: renderCalendar, money: renderMoney, retainers: renderRetainers, team: renderTeam, clients: renderClients, settings: renderSettings };
function render() {
  if (!cfg) return;
  clearInterval(ui.countdown);
  const y = window.scrollY;
  (VIEWS[ui.view] || renderHome)();
  $$('[data-v]').forEach(a => { if (a.dataset.v === ui.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#moreBtn').toggleAttribute('aria-current', ['retainers', 'team', 'clients', 'settings'].includes(ui.view));
  window.scrollTo(0, ui.keepScroll ? y : 0);
  ui.keepScroll = false;
}
function route() {
  const v = location.hash.slice(1);
  ui.view = VIEWS[v] ? v : 'home';
  render();
}
function go(view) { if (location.hash.slice(1) === view) render(); else location.hash = view; }

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-stop]')) { e.stopPropagation(); return; }
  const c = sel => t.closest(sel);
  let el;
  if ((el = c('[data-status]'))) { e.stopPropagation(); ui.keepScroll = true; const p = project(el.dataset.status); patchProject(p.id, { status: el.dataset.to }); toast(`${p.code} → ${el.dataset.to}`); return; }
  if ((el = c('[data-paid]'))) { ui.keepScroll = true; const p = project(el.dataset.paid); patchProject(p.id, { paid: p.price }); toast(`${p.client} marked paid`); return; }
  if ((el = c('[data-posted]'))) { ui.keepScroll = true; patchProject(el.dataset.posted, { posted: true }); toast('Marked as posted'); return; }
  if ((el = c('[data-item-done]'))) { ui.keepScroll = true; patchItem(el.dataset.itemDone, { status: 'Delivered' }); toast('Delivered'); return; }
  if ((el = c('[data-crew-paid]'))) { e.stopPropagation(); ui.keepScroll = true; const cr = db.crew.find(x => x.id === el.dataset.crewPaid); patchCrew(cr.id, { paidOn: today() }); toast(`${cr.name || cr.role} marked paid`); return; }
  if ((el = c('[data-ret-month]'))) { e.stopPropagation(); ui.keepScroll = true; toggleRetMonth(el.dataset.retMonth, el.dataset.m); toast(`${monthName(el.dataset.m)} marked paid`); return; }
  if ((el = c('[data-ret-report]'))) { ui.keepScroll = true; const r = db.retainers.find(x => x.id === el.dataset.retReport); patchRetainer(r.id, { nextReport: addMonths(r.nextReport || today(), 1) }); toast('Next report set for ' + fmtDate(r.nextReport)); return; }
  if (c('a.wa')) return;
  if ((el = c('[data-add]'))) { openQuickAdd(); return; }
  if ((el = c('[data-add-day]'))) { openQuickAdd(el.dataset.addDay); return; }
  if ((el = c('[data-close]')) || t.id === 'scrim') { closeLayers(); return; }
  if ((el = c('[data-filter]'))) { e.preventDefault(); ui.filter = el.dataset.filter; if (ui.view !== 'projects') go('projects'); else { ui.keepScroll = true; render(); } return; }
  if ((el = c('[data-go]'))) { go(el.dataset.go); return; }
  if ((el = c('[data-client]'))) { ui.client = el.dataset.client; ui.filter = 'all'; ui.q = ''; go('projects'); return; }
  if ((el = c('[data-open]'))) { openProject(el.dataset.open); return; }
  if ((el = c('[data-ret-new]'))) { openRetainer(); return; }
  if ((el = c('[data-ret-open]'))) { openRetainer(el.dataset.retOpen); return; }
  if ((el = c('[data-more]'))) { openMore(); return; }
  if ((el = c('[data-more-go]'))) { e.preventDefault(); closeLayers(); go(el.dataset.moreGo); return; }
  if ((el = c('[data-cal]'))) {
    const n = +el.dataset.cal;
    if (!n) { ui.calMonth = today().slice(0, 7); ui.calSel = today(); }
    else { const [y, m] = ui.calMonth.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); ui.calMonth = ymd(d).slice(0, 7); }
    render(); return;
  }
  if ((el = c('[data-day]'))) { ui.calSel = el.dataset.day; ui.keepScroll = true; render(); return; }
  if ((el = c('[data-period]'))) { ui.period = el.dataset.period; ui.keepScroll = true; render(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#scrim').hidden) closeLayers();
  if (e.key === 'Enter' && e.target.matches('.row[data-open]')) openProject(e.target.dataset.open);
  if (e.key === 'Enter' && e.target.matches('.row[data-ret-open]')) openRetainer(e.target.dataset.retOpen);
  if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.target.closest('input,textarea,select') && $('#scrim').hidden && cfg) { e.preventDefault(); openQuickAdd(); }
});
$('#syncBtn').addEventListener('click', () => pull());
window.addEventListener('hashchange', route);
window.addEventListener('online', () => pull(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(true); });

// ───────────────────────────── boot ─────────────────────────────
$$('[data-ic]').forEach(i => { i.outerHTML = icon(i.dataset.ic); });
$('#setLink').innerHTML = icon('gear');
$('#moreBtn').innerHTML = icon('more');
if (SHEET_URL) { $('#cUrl').value = SHEET_URL; $('#cUrlField').style.display = 'none'; }

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

function boot() {
  if (!cfg) { $('#connect').hidden = false; $('#app').hidden = true; return; }
  $('#connect').hidden = true; $('#app').hidden = false;
  setSync(queue.length ? 'busy' : 'ok', queue.length ? `Saving ${queue.length}` : 'Synced');
  route();
  pull(true);
}
boot();
