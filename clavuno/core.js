'use strict';
/* Clavuno core: state, storage, money, dates, i18n helpers. Data lives only on this device. */
const LS_KEY = 'clavuno:v1';
const LANGS = [['es', 'Español'], ['en', 'English'], ['fr', 'Français'], ['pt', 'Português'], ['de', 'Deutsch'], ['it', 'Italiano']];
const CURRENCIES = ['USD', 'EUR', 'DOP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'GBP', 'CAD', 'CHF', 'UYU', 'BOB', 'PYG', 'CRC', 'GTQ', 'HNL', 'NIO', 'PAB', 'AUD', 'NZD', 'JPY', 'CNY', 'INR', 'ZAR', 'MAD', 'XOF', 'HTG'];
// region -> [currency, tax name, tax rate %, dial code]. Only starting values; the owner confirms them.
const REGIONS = { DO: ['DOP', 'ITBIS', 18, '1'], US: ['USD', '', 0, '1'], MX: ['MXN', 'IVA', 16, '52'], ES: ['EUR', 'IVA', 21, '34'], CO: ['COP', 'IVA', 19, '57'], AR: ['ARS', 'IVA', 21, '54'], CL: ['CLP', 'IVA', 19, '56'], PE: ['PEN', 'IGV', 18, '51'], FR: ['EUR', 'TVA', 20, '33'], DE: ['EUR', 'MwSt.', 19, '49'], IT: ['EUR', 'IVA', 22, '39'], PT: ['EUR', 'IVA', 23, '351'], GB: ['GBP', 'VAT', 20, '44'], CA: ['CAD', 'GST', 5, '1'], BR: ['BRL', '', 0, '55'] };
const TZ_REGION = { 'America/Santo_Domingo': 'DO', 'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Argentina/Buenos_Aires': 'AR', 'Europe/Madrid': 'ES', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT', 'Europe/London': 'GB', 'America/Sao_Paulo': 'BR', 'America/Toronto': 'CA', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US' };
const Q_STATUS = ['draft', 'sent', 'accepted', 'rejected'];
const PAY_METHODS = ['cash', 'transfer', 'card', 'other'];

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const pad2 = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const today = () => (typeof window.__today === 'string' ? window.__today : iso(new Date()));
const parseISO = s => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => { const A = parseISO(a), B = parseISO(b); return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 864e5); };

/* ---------- sanitizers (used for stored data and imported backups) ---------- */
const sStr = (v, max = 200) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').slice(0, max);
const sNum = (v, min = 0, max = 1e12, def = 0) => { v = Number(v); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
const sInt = (v, min, max, def) => Math.round(sNum(v, min, max, def));
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(parseISO(v).getTime()) && iso(parseISO(v)) === v && v >= '1900-01-01';
const sDate = (v, def) => (isDate(v) ? v : def);
const sId = v => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : uid());
const sLogo = v => (typeof v === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 600000 ? v : '');
const sRef = v => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : '');
const sArr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const validLocale = l => { try { new Intl.NumberFormat(l); return typeof l === 'string' && l.length < 20; } catch (e) { return false; } };
const validCurrency = c => { if (typeof c !== 'string') return false; try { new Intl.NumberFormat('en', { style: 'currency', currency: c }); return /^[A-Z]{3}$/.test(c); } catch (e) { return false; } };

function defaults() {
  return {
    v: 1,
    settings: { lang: null, locale: '', currency: 'USD', taxName: '', taxRate: 0, dial: '', biz: { name: '', taxId: '', phone: '', email: '', address: '', logo: '' }, qPrefix: 'COT-', iPrefix: 'FAC-', qNext: 1, iNext: 1, validDays: 15, dueDays: 15, followDays: 3, terms: '', theme: 'auto', notify: false, onboarded: false, lastNotify: '' },
    clients: [], items: [], quotes: [], invoices: []
  };
}
function sLine(l) { l = l || {}; return { name: sStr(l.name, 160), desc: sStr(l.desc, 500), qty: sNum(l.qty, 0, 1e7, 1), price: sNum(l.price, 0, 1e11, 0), taxable: l.taxable !== false }; }
function sDocBase(d, t) {
  return { id: sId(d.id), number: sStr(d.number, 30), clientId: sRef(d.clientId), date: sDate(d.date, t), lines: sArr(d.lines, 200).map(sLine), discount: sNum(d.discount, 0, 100, 0), taxRate: sNum(d.taxRate, 0, 100, 0), taxName: sStr(d.taxName, 20), currency: validCurrency(d.currency) ? d.currency : 'USD', notes: sStr(d.notes, 2000), sentAt: sDate(d.sentAt, ''), demo: d.demo === true };
}
function sanitize(d) {
  const o = defaults(), t = today();
  if (!d || typeof d !== 'object') return o;
  const s = d.settings && typeof d.settings === 'object' ? d.settings : {}, b = s.biz && typeof s.biz === 'object' ? s.biz : {}, os = o.settings;
  os.lang = LANGS.some(l => l[0] === s.lang) ? s.lang : null;
  os.locale = validLocale(s.locale) ? s.locale : '';
  os.currency = validCurrency(s.currency) ? s.currency : 'USD';
  os.taxName = sStr(s.taxName, 20); os.taxRate = sNum(s.taxRate, 0, 100, 0);
  os.dial = sStr(s.dial, 4).replace(/\D/g, '');
  os.biz = { name: sStr(b.name, 80), taxId: sStr(b.taxId, 40), phone: sStr(b.phone, 30), email: sStr(b.email, 80), address: sStr(b.address, 200), logo: sLogo(b.logo) };
  os.qPrefix = sStr(s.qPrefix == null ? 'COT-' : s.qPrefix, 10); os.iPrefix = sStr(s.iPrefix == null ? 'FAC-' : s.iPrefix, 10);
  os.qNext = sInt(s.qNext, 1, 1e9, 1); os.iNext = sInt(s.iNext, 1, 1e9, 1);
  os.validDays = sInt(s.validDays, 1, 365, 15); os.dueDays = sInt(s.dueDays, 0, 365, 15); os.followDays = sInt(s.followDays, 1, 60, 3);
  os.terms = sStr(s.terms, 500); os.theme = ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto';
  os.notify = s.notify === true; os.onboarded = s.onboarded === true; os.lastNotify = sDate(s.lastNotify, '');
  o.clients = sArr(d.clients, 5000).map(c => ({ id: sId(c && c.id), name: sStr(c && c.name, 80), company: sStr(c && c.company, 80), phone: sStr(c && c.phone, 30), email: sStr(c && c.email, 80), taxId: sStr(c && c.taxId, 40), address: sStr(c && c.address, 200), notes: sStr(c && c.notes, 1000), created: sDate(c && c.created, t), demo: !!(c && c.demo === true) }));
  o.items = sArr(d.items, 5000).map(i => ({ id: sId(i && i.id), name: sStr(i && i.name, 160), desc: sStr(i && i.desc, 500), price: sNum(i && i.price, 0, 1e11, 0), unit: sStr(i && i.unit, 20), taxable: !(i && i.taxable === false), demo: !!(i && i.demo === true) }));
  o.quotes = sArr(d.quotes, 20000).filter(q => q && typeof q === 'object').map(q => Object.assign(sDocBase(q, t), { validUntil: sDate(q.validUntil, t), status: Q_STATUS.includes(q.status) ? q.status : 'draft', lastFollowAt: sDate(q.lastFollowAt, ''), followCount: sInt(q.followCount, 0, 999, 0), invoiceId: sRef(q.invoiceId) }));
  o.invoices = sArr(d.invoices, 20000).filter(i => i && typeof i === 'object').map(i => Object.assign(sDocBase(i, t), { quoteId: sRef(i.quoteId), dueDate: sDate(i.dueDate, t), lastRemindAt: sDate(i.lastRemindAt, ''), payments: sArr(i.payments, 500).filter(p => p && typeof p === 'object').map(p => ({ id: sId(p.id), date: sDate(p.date, t), amount: sNum(p.amount, 0, 1e12, 0), method: PAY_METHODS.includes(p.method) ? p.method : 'other', note: sStr(p.note, 200) })) }));
  // ids must be unique inside each list
  for (const k of ['clients', 'items', 'quotes', 'invoices']) { const seen = new Set(); o[k].forEach(x => { if (seen.has(x.id)) x.id = uid(); seen.add(x.id); }); }
  return o;
}

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(LS_KEY); if (raw) return sanitize(JSON.parse(raw)); }
  catch (e) { if (raw) { try { localStorage.setItem(LS_KEY + ':corrupt', raw); } catch (e2) { /* nothing else to do */ } } }
  return defaults();
}
let S = loadState();
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }

/* ---------- i18n ---------- */
const lang = () => S.settings.lang || 'en';
function t(key, vars) {
  let s = (I18N[lang()] && I18N[lang()][key]) || I18N.en[key] || key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
const locale = () => S.settings.locale || lang();
function detectRegion() {
  let r = null;
  try { r = TZ_REGION[Intl.DateTimeFormat().resolvedOptions().timeZone] || null; } catch (e) { /* ignore */ }
  if (!r) { const m = /[-_]([A-Za-z]{2})\b/.exec(navigator.language || ''); if (m && REGIONS[m[1].toUpperCase()]) r = m[1].toUpperCase(); }
  return r;
}
function detectLang() { const n = (navigator.language || 'en').slice(0, 2).toLowerCase(); return LANGS.some(l => l[0] === n) ? n : 'en'; }
function localeFor(lg, region) { const cands = [region ? lg + '-' + region : '', (navigator.language || '').toLowerCase().startsWith(lg) ? navigator.language : '', lg]; return cands.find(c => c && validLocale(c)) || lg; }

/* ---------- money ---------- */
const _dec = {}, _nf = {};
function decimalsOf(c) { if (!(c in _dec)) { try { _dec[c] = new Intl.NumberFormat('en', { style: 'currency', currency: c }).resolvedOptions().maximumFractionDigits; } catch (e) { _dec[c] = 2; } } return _dec[c]; }
function roundC(n, c) { const d = decimalsOf(c); if (!Number.isFinite(n)) return 0; const r = Number(Math.round(Number(Math.abs(n).toFixed(d + 4) + 'e' + d)) + 'e-' + d); return (n < 0 ? -1 : 1) * (Number.isFinite(r) ? r : 0); }
function money(n, c) {
  c = c || S.settings.currency; const k = locale() + c;
  if (!_nf[k]) { try { _nf[k] = new Intl.NumberFormat(locale(), { style: 'currency', currency: c }); } catch (e) { _nf[k] = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }); } }
  return _nf[k].format(n || 0);
}
function fmtDate(s) { if (!isDate(s)) return ''; try { return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(parseISO(s)); } catch (e) { return s; } }
function fmtNum(n) { try { return new Intl.NumberFormat(locale(), { maximumFractionDigits: 3 }).format(n); } catch (e) { return String(n); } }

/* ---------- business rules ---------- */
function totals(doc) {
  const c = doc.currency; let sub = 0, taxBase = 0;
  for (const l of doc.lines) { const a = roundC(l.qty * l.price, c); sub += a; if (l.taxable) taxBase += a; }
  sub = roundC(sub, c);
  const disc = roundC(sub * doc.discount / 100, c);
  const tax = roundC(taxBase * (1 - doc.discount / 100) * doc.taxRate / 100, c);
  const total = roundC(sub - disc + tax, c);
  const paid = doc.payments ? roundC(doc.payments.reduce((s, p) => s + p.amount, 0), c) : 0;
  return { sub, disc, tax, total, paid, balance: roundC(total - paid, c) };
}
const clientOf = doc => S.clients.find(c => c.id === doc.clientId) || null;
const clientName = doc => { const c = clientOf(doc); return c ? c.name : '—'; };
function quoteStatus(q) { return (q.status === 'draft' || q.status === 'sent') && q.validUntil < today() ? 'expired' : q.status; }
function needsFollow(q) { return quoteStatus(q) === 'sent' && isDate(q.lastFollowAt || q.sentAt) && diffDays(q.lastFollowAt || q.sentAt, today()) >= S.settings.followDays; }
function invStatus(i) { const T = totals(i); if (T.balance <= 0 && T.total > 0) return 'paid'; if (T.balance <= 0) return 'paid'; if (i.dueDate < today()) return 'overdue'; return T.paid > 0 ? 'partial' : 'pending'; }
function needsRemind(i) { return invStatus(i) === 'overdue' && (!i.lastRemindAt || diffDays(i.lastRemindAt, today()) >= S.settings.followDays); }
function nextNumber(kind) { const s = S.settings, pre = kind === 'quote' ? s.qPrefix : s.iPrefix, list = kind === 'quote' ? S.quotes : S.invoices; let n = kind === 'quote' ? s.qNext : s.iNext, num; do { num = pre + String(n).padStart(4, '0'); n++; } while (list.some(d => d.number === num)); return { num, next: n }; }
function waPhone(raw) { let p = String(raw || '').trim().replace(/\(0\)/g, ''); if (p.replace(/\D/g, '').length < 6) return ''; const plus = p.startsWith('+') || p.startsWith('00'); let d = p.replace(/\D/g, ''); if (p.startsWith('00')) d = d.slice(2); if (plus) return d; const dial = S.settings.dial; if (dial !== '39') d = d.replace(/^0+/, ''); if (dial && !(d.startsWith(dial) && d.length > 10)) d = dial + d; return d; }
