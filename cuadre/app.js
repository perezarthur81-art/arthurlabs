'use strict';
/* Cuadre app: views and routing. All user text goes through esc() before reaching the DOM. Actions and events are in actions.js. */
const $ = (s, r) => (r || document).querySelector(s);
const IC = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', route: 'M10 6h10M10 12h10M10 18h10M3.500 6l1.200 1.200L7 5M3.500 12l1.200 1.200L7 11M3.500 18l1.200 1.200L7 17', loans: 'M3 7h18v10H3zM12 14.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5zM6.500 10v4M17.500 10v4',
  clients: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.500 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.900M15.500 4.200a3.500 3.500 0 0 1 0 6.600', assistant: 'M11 3l1.900 5.100L18 10l-5.100 1.900L11 17l-1.900-5.100L4 10l5.100-1.900zM18.500 15l.9 2.100 2.100.9-2.100.9-.9 2.100-.9-2.100-2.100-.9 2.100-.9z', reports: 'M5 20V11M11 20V4M17 20v-7M3 20h18',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.300l2-1.500-2-3.400-2.300.9a7 7 0 0 0-2.200-1.300L14 3h-4l-.4 2.400a7 7 0 0 0-2.200 1.300l-2.300-.9-2 3.400 2 1.500a7 7 0 0 0 0 2.600l-2 1.500 2 3.400 2.300-.9a7 7 0 0 0 2.200 1.300L10 21h4l.4-2.400a7 7 0 0 0 2.200-1.300l2.300.9 2-3.400-2-1.500c.1-.4.1-.9.1-1.300z', more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', chev: 'M9 6l6 6-6 6', back: 'M15 6l-6 6 6 6', prev: 'M15 6l-6 6 6 6', chat: 'M21 12a8.500 8.500 0 0 1-12.600 7.400L3 21l1.600-5.200A8.500 8.500 0 1 1 21 12z', dl: 'M12 4v11M7 11l5 5 5-5M5 20h14', check: 'M5 12.500l4.500 4.500L19 7.500', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', share: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
  phone: 'M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z', lock: 'M6 11h12v9H6zM8.500 11V8a3.500 3.500 0 0 1 7 0v3', receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', renew: 'M20 11a8 8 0 0 0-14.500-4.500L4 8M4 4v4h4M4 13a8 8 0 0 0 14.500 4.500L20 16M20 20v-4h-4', copy: 'M9 9h10v11H9zM5 15V4h10', cash: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.500 9.500c-.4-.9-1.400-1.500-2.500-1.500-1.500 0-2.700.9-2.700 2s1 1.800 2.700 2c1.700.2 2.700.9 2.700 2s-1.200 2-2.700 2c-1.200 0-2.200-.6-2.600-1.500M12 6v2M12 16v2', ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.700 5.700l12.600 12.600'
};
const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n]}"/></svg>`;
const NAV = ['home', 'route', 'loans', 'clients', 'assistant', 'reports', 'settings'];
const TABS = ['home', 'route', 'loans', 'clients', 'more'];
const TONES = ['kind', 'firm', 'last', 'before', 'thanks'];
const ASK = ['week', 'late', 'earned', 'relend', 'tomorrow'];
let ED = null, CTX = null, installEvt = null, pendingPro = null, LOCKED = !!S.settings.pin, dayShown = today();
const UI = { fl: 'active', search: '', ask: '', tone: '', msgLoan: '', msgPid: '', month: '', planAll: false, hideInstall: false, wCur: null, wDec: null, wBiz: '', lockFails: 0, lockUntil: 0 };

/* ---------- small ui helpers ---------- */
function toast(msg, kind) { const el = document.createElement('div'); el.className = 'toast' + (kind ? ' ' + kind : ''); el.setAttribute('role', 'status'); el.textContent = msg; const box = $('#toasts'); while (box.children.length > 1) box.firstChild.remove(); box.appendChild(el); setTimeout(() => el.remove(), 3800); }
function persist(msg) { if (save()) { if (msg) toast(msg); return true; } S = loadState(); bust(); ED = null; toast(t('errSave'), 'err'); setTimeout(render, 0); return false; } // on a failed write, go back to the last stored state
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; document.body.classList.add('lock'); const f = m.querySelector('input:not([type=hidden]),select,textarea,button'); if (f) f.focus(); }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.classList.remove('lock'); CTX = null; }
function confirmBox(msg, label, act, danger, data, body) { openModal(`<h2>${esc(msg)}</h2>${body ? `<p class="muted">${esc(body)}</p>` : ''}<div class="row end"><button class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="${act}" ${data || ''}>${esc(label)}</button></div>`); }
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const pill = (cls, label) => `<span class="pill ${cls}">${esc(label)}</span>`;
const empty = (msg, btn) => `<div class="empty"><p>${esc(msg)}</p>${btn || ''}</div>`;
const field = (label, input, hint, id) => `<label class="f"><span${id ? ` id="${id}"` : ''}>${esc(label)}</span>${input}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
const inp = (name, val, attrs) => `<input name="${name}" value="${esc(val)}" ${attrs || ''}>`;
const opt = () => ' (' + t('optional') + ')';
const hasDemo = () => S.clients.some(x => x.demo) || S.loans.some(x => x.demo);
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function openUrl(url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove(); }
function applyTheme() { const th = S.settings.theme; if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th); document.documentElement.lang = lang(); }
const nOf = (n, k) => (n === 1 ? t('one_' + k) : t('n_' + k, { n }));
const ST_PILL = { paid: ['ok', 'stPaid'], late: ['bad', 'stLate'], today: ['warn', 'stToday'], ok: ['inf', 'stOk'] };
const ROW_PILL = { paid: ['ok', 'rPaid'], late: ['bad', 'stLate'], today: ['warn', 'rToday'], partial: ['inf', 'rPartial'], pending: ['', 'rPending'] };
const BEH_PILL = { good: ['ok', 'behGood'], sometimes: ['warn', 'behSometimes'], risky: ['bad', 'behRisky'], new: ['', 'behNew'] };
function loanPill(st) { if (st.status === 'late' && st.overdue > 0) return pill('bad', t('lateBy', { d: nOf(st.overdueDays, 'day') })); if (st.status === 'late') return pill('bad', t('moraPending')); const p = ST_PILL[st.status]; return pill(p[0], t(p[1])); }
const behPill = b => pill(BEH_PILL[b][0], t(BEH_PILL[b][1]));
const loanSub = L => (L.num || '—') + ' · ' + t('ty_' + L.type) + ' · ' + t('fq_' + L.freq);
const kindLabel = (p, A) => (p.kind === 'settle' ? t('kSettle') : p.kind === 'renew' ? t('kRenew') : p.kind === 'waive' ? t('kWaive') : A && A.prepay > 0 ? t('kPrepay') : t('kPay'));
const sortedClients = () => S.clients.slice().sort((a, b) => a.name.localeCompare(b.name));

/* ---------- shell ---------- */
function shell(active, focus) {
  const n = routeItems().length, bd = k => (k === 'route' && n ? `<i>${n}</i>` : '');
  const link = k => `<a href="#/${k === 'home' ? '' : k}" class="${k === active ? 'on' : ''}"${k === active ? ' aria-current="page"' : ''}>${icon(k)}<span>${esc(t(k))}</span>${bd(k)}</a>`;
  $('#side').innerHTML = `<a class="brand" href="#/"><img src="icons/icon.svg" alt="" width="34" height="34"><b>Cuadre</b></a><nav>${NAV.map(link).join('')}</nav>${gated() && !licensed() ? `<a class="btn gold" href="#/pro">Cuadre Pro</a>` : ''}${installEvt ? `<button class="btn primary" data-act="install">${icon('dl')}${esc(t('install'))}</button>` : ''}<small>${esc(t('offline'))}</small>`;
  const tabActive = TABS.includes(active) ? active : 'more';
  $('#tabs').innerHTML = TABS.map(k => `<a href="#/${k === 'home' ? '' : k}" class="${k === tabActive ? 'on' : ''}">${icon(k)}<span>${esc(t(k))}</span>${bd(k)}</a>`).join('');
  document.body.classList.toggle('focus', !!focus);
  try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) { /* not supported */ }
}
const pageHead = (title, right, backHref) => `<header class="ph">${backHref ? `<a class="iconbtn" href="${backHref}" aria-label="${esc(t('back'))}">${icon('back')}</a>` : ''}<h1>${esc(title)}</h1><div class="row">${right || ''}</div></header>`;

/* ---------- Pro ---------- */
const maskKey = k => (k ? k.slice(0, 11) + '-••••-••••-' + k.slice(-4) : '');
const proBenefits = () => `<ul class="benefits">${['proB1', 'proB2', 'proB3'].map(k => `<li>${icon('check')}<span>${esc(t(k))}</span></li>`).join('')}</ul>`;
const buyBtn = () => (gated() ? `<button class="btn gold big" data-act="buyPro">${esc(t('buyPro', { price: CFG.PRICE }))}</button>` : '');
const planUse = () => t('planUse', { a: realClients(), c: CFG.FREE_CLIENTS, b: realLoans(), d: CFG.FREE_LOANS });
/* ---------- help & legal (pages live on arthurlabs.app) ---------- */
const LEGAL = { es: ['privacidad', 'terminos', 'reembolsos', 'soporte'], en: ['en/privacy', 'en/terms', 'en/refunds', 'en/support'], fr: ['fr/confidentialite', 'fr/conditions', 'fr/remboursements', 'fr/assistance'], pt: ['pt/privacidade', 'pt/termos', 'pt/reembolsos', 'pt/suporte'] };
const legalUrl = i => '/' + (LEGAL[lang()] || LEGAL.en)[i] + '/', extLink = (i, k) => `<a href="${legalUrl(i)}" target="_blank" rel="noopener">${esc(t(k))}</a>`;
const helpCard = () => `<section class="card"><h2>${esc(t('help'))}</h2><p class="muted">${esc(t('helpHint'))}</p><div class="row"><a class="btn" href="mailto:hola@arthurlabs.app?subject=${encodeURIComponent('Cuadre Préstamos')}">${esc(t('writeUs'))}</a><a class="btn ghost" href="${legalUrl(3)}" target="_blank" rel="noopener">${esc(t('helpCenter'))}</a></div><p class="legal-links">${extLink(0, 'privacy')} · ${extLink(1, 'legalTerms')} · ${extLink(2, 'refunds')}</p></section>`;
const guaranteeLine = () => (gated() ? `<p class="muted legal-links">${esc(t('guarantee'))} ${extLink(2, 'refunds')}</p>` : '');
function vPro() {
  if (licensed()) return pageHead('Cuadre Pro', pill('ok', 'Pro'), '#/settings') + `<section class="card pro"><p><b>${esc(t('licActive'))}</b></p><p class="muted keytx">${esc(maskKey(S.plan.license))}</p>${proBenefits()}<div class="row"><button class="btn ghost" data-act="licRemoveAsk">${esc(t('licRemove'))}</button></div></section>`;
  return pageHead('Cuadre Pro', '', ED ? ED.hash : '#/settings') + `<section class="card pro"><h2>${esc(t('proTitle'))}</h2><p class="muted">${esc(t('proSub'))}</p>${proBenefits()}${gated() ? `<p class="muted">${esc(t('proFree', { c: CFG.FREE_CLIENTS, d: CFG.FREE_LOANS }))}<br>${esc(planUse())}</p>` : `<p class="muted">${esc(t('proOpen'))}</p>`}${buyBtn()}${guaranteeLine()}</section><section class="card"><h2>${esc(t('haveKey'))}</h2><form data-form="license" novalidate>${field(t('licKey'), '<input name="key" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="120" placeholder="CUADRE-XXXX-XXXX-XXXX-XXXX">', t('keyByEmail'))}<button class="btn primary" type="submit">${esc(t('activate'))}</button></form></section>`;
}
function proOpen(why) {
  const msg = why === 'clients' ? t('limitClients', { n: CFG.FREE_CLIENTS }) : why === 'loans' ? t('limitLoans', { n: CFG.FREE_LOANS }) : why === 'logo' ? t('logoPro') : '';
  openModal(`<h2>${esc(t('proTitle'))}</h2>${msg ? `<p class="banner warn">${esc(msg)}</p>` : ''}<p class="muted">${esc(t('proSub'))}</p>${proBenefits()}<div class="stack">${buyBtn()}<a class="btn" href="#/pro">${esc(t('haveKey'))}</a><button class="btn ghost" data-act="closeModal">${esc(t('close'))}</button></div>`);
}

/* ---------- banners ---------- */
function _isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function installBanner() {
  if (isStandalone() || UI.hideInstall) return '';
  if (installEvt) return `<div class="install"><img src="icons/icon.svg" alt="" width="52" height="52"><div class="grow"><b>${esc(t('install'))}: Cuadre</b><span>${esc(t('offline'))}</span></div><button class="btn primary big" data-act="install">${icon('dl')}<span>${esc(t('install'))}</span></button><button class="iconbtn" data-act="installHide" aria-label="${esc(t('close'))}">${icon('x')}</button></div>`;
  if (_isIos()) return `<div class="install"><img src="icons/icon.svg" alt="" width="52" height="52"><div class="grow"><b>${esc(t('install'))}: Cuadre</b><span>${icon('share')} ${esc(t('installIos'))}</span></div><button class="iconbtn" data-act="installHide" aria-label="${esc(t('close'))}">${icon('x')}</button></div>`;
  return '';
}
const demoBanner = () => (hasDemo() ? `<div class="banner"><span>${esc(t('demoBanner'))}</span><button class="btn sm" data-act="demoRemove">${esc(t('demoRemove'))}</button></div>` : '');
function backupDays() { const s = S.settings; if (!S.clients.some(c => !c.demo) && !S.loans.some(l => !l.demo)) return -1; return diffDays(s.lastBackup || s.since || today(), today()); }
function backupBanner() { const s = S.settings, n = backupDays(); if (n < 7 || s.snooze === today()) return ''; return `<div class="banner warn"><span>${esc(s.lastBackup ? t('backupDue', { n }) : t('backupNever'))}</span><div class="row"><button class="btn sm" data-act="exportData">${icon('dl')}<span>${esc(t('backupNow'))}</span></button><button class="btn sm ghost" data-act="backupLater">${esc(t('later'))}</button></div></div>`; }

function corruptBanner() { return corruptRaw() ? `<div class="banner bad" id="corrupt"><span><b>${esc(t('corruptTitle'))}</b><br>${esc(t('corruptText'))}</span><div class="row"><button type="button" class="btn sm" data-act="corruptDownload">${icon('dl')}<span>${esc(t('corruptDownload'))}</span></button><label class="btn sm"><input type="file" accept="application/json,.json" data-in="import" hidden><span>${esc(t('importData'))}</span></label><button type="button" class="btn sm ghost" data-act="corruptDiscardAsk">${esc(t('corruptDiscard'))}</button></div></div>` : ''; }
function undoBanner() { return prevRaw() ? `<div class="banner warn" id="undo"><span>${esc(t('undoBanner'))}</span><div class="row"><button class="btn sm" data-act="importUndo">${icon('renew')}<span>${esc(t('undo'))}</span></button><button class="btn sm ghost" data-act="importKeep">${esc(t('undoKeep'))}</button></div></div>` : ''; }

/* ---------- panel ---------- */
function vHome() {
  const P = portfolio(), fresh = !S.clients.length && !S.loans.length;
  const kpi = (label, val, cls, sub, href) => `<a class="kpi ${cls || ''}" href="${href}"><span>${esc(label)}</span><b>${esc(money(val))}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</a>`;
  return pageHead(S.settings.biz.name || 'Cuadre', `<a class="btn primary" href="#/loans/new">${icon('plus')}<span>${esc(t('newLoan'))}</span></a>`) + corruptBanner() + undoBanner() + installBanner() + demoBanner() + backupBanner() +
    `<section class="hero"><div class="hero-top"><a class="hk gold" href="#/route"><span>${esc(t('collectToday'))}</span><b>${esc(money(P.today))}</b><small>${esc(nOf(P.todayN, 'loan'))}</small></a><a class="hk ${P.late > 0 ? 'red' : ''}" href="#/route"><span>${esc(t('overdue'))}</span><b>${esc(money(P.late))}</b><small>${esc(nOf(P.lateN, 'loan'))}${P.mora > 0 ? ' · ' + esc(t('moraShort')) + ' ' + esc(money(P.mora)) : ''}</small></a></div><a class="btn gold big" href="#/route">${icon('route')}<span>${esc(t('goRoute'))}</span></a></section>` +
    (fresh ? `<section class="card"><h2>${esc(t('firstSteps'))}</h2><ol class="steps"><li><button class="linkish" data-act="newClient">${esc(t('step1'))}</button></li><li><a href="#/loans/new">${esc(t('step2'))}</a></li><li><a href="#/route">${esc(t('step3'))}</a></li></ol><button class="btn" data-act="demoLoad">${esc(t('tryDemo'))}</button></section>` : '') +
    `<section class="kpis">${kpi(t('capitalOut'), P.capital, '', nOf(P.active, 'active'), '#/loans')}${kpi(t('interestEarned'), P.interest, 'ok', P.moraPaid > 0 ? t('plusMora', { x: money(P.moraPaid) }) : '', '#/reports')}${kpi(t('colToday'), P.cToday, '', '', '#/reports')}${kpi(t('colWeek'), P.cWeek, '', '', '#/reports')}${kpi(t('colMonth'), P.cMonth, '', '', '#/reports')}${kpi(t('moraPending'), P.mora, P.mora > 0 ? 'bad' : '', '', '#/route')}</section>` +
    `<section class="card"><h2>${esc(t('soon7'))}${P.soon.length ? ` <span class="count">${P.soon.length}</span>` : ''}</h2>${P.soon.length ? `<ul class="list">${P.soon.slice(0, 12).map(x => `<li class="li"><a class="grow" href="#/loans/${x.L.id}"><b>${esc(clientName(x.L))}</b><span>${esc(fmtDay(x.r.due))} · ${esc(x.L.num)} · ${esc(t('instK', { k: x.r.k, n: x.L.n }))}</span></a><div class="amt"><b>${esc(money(x.r.rem))}</b></div></li>`).join('')}</ul>${P.soon.length > 12 ? `<p class="note">${esc(t('andMore', { n: P.soon.length - 12 }))}</p>` : ''}` : `<p class="muted">${esc(t('soonNone'))}</p>`}</section>` +
    `<p class="note center">${esc(t('deviceOnly'))}</p>`;
}

/* ---------- route ---------- */
function vRoute() {
  const items = routeItems(), td = today(), P = portfolio(), due = items.reduce((s, x) => s + x.st.dueNow, 0);
  const vis = new Map(S.visits.filter(v => v.d === td).map(v => [v.id, v.st]));
  const row = x => {
    const { L, st } = x, c = clientOf(L), tel = c ? telHref(c.phone) : '', v = vis.get(L.id) || '', k = st.next ? st.next.k : L.n;
    return `<li class="rt"><div class="rt-top"><a class="grow" href="#/loans/${L.id}"><b>${esc(c ? c.name : '—')}</b><span>${esc(L.num)} · ${esc(t('fq_' + L.freq))} · ${esc(t('instK', { k, n: L.n }))}</span>${loanPill(st)}</a><div class="amt"><b>${esc(money(st.dueNow))}</b>${st.moraPending > 0 ? `<small>${esc(t('inclMora', { x: money(st.moraPending) }))}</small>` : ''}</div></div>
    <div class="rt-acts">${tel ? `<a class="iconbtn line" href="${esc(tel)}" aria-label="${esc(t('call'))}">${icon('phone')}</a>` : ''}<button class="iconbtn wa" data-act="msgOpen" data-id="${L.id}" aria-label="WhatsApp">${icon('chat')}</button><button class="chip sm seen ${v === 'seen' ? 'on' : ''}" data-act="visit" data-id="${L.id}" data-v="seen" aria-pressed="${v === 'seen'}">${esc(t('visited'))}</button><button class="chip sm absent ${v === 'absent' ? 'on' : ''}" data-act="visit" data-id="${L.id}" data-v="absent" aria-pressed="${v === 'absent'}">${esc(t('absent'))}</button><button class="btn primary sm" data-act="payOpen" data-id="${L.id}">${icon('cash')}<span>${esc(t('collect'))}</span></button></div></li>`;
  };
  const a = items.filter(x => !x.late), b = items.filter(x => x.late);
  const done = []; for (const L of S.loans) { const st = stOf(L); let s = 0; for (const p of L.payments) if (!p.void && p.date === td && (p.kind === 'pay' || p.kind === 'settle') && st.allocs[p.id]) s += p.amount - st.allocs[p.id].extra; if (s > 0) done.push({ L, s }); }
  const head = pageHead(t('routeTitle'), `<a class="btn" href="#/loans/new">${icon('plus')}<span>${esc(t('newLoan'))}</span></a>`);
  if (!S.loans.length) return head + empty(t('routeNoLoans'), `<a class="btn primary" href="#/loans/new">${esc(t('newLoan'))}</a>`);
  return head + `<section class="card"><div class="row between"><div class="bigsum"><span>${esc(t('toCollectNow'))}</span><b>${esc(money(due))}</b></div><div class="bigsum"><span>${esc(t('colToday'))}</span><b class="oktx">${esc(money(P.cToday))}</b></div></div><progress max="${Math.max(1, due + P.cToday)}" value="${P.cToday}" aria-label="${esc(t('colToday'))}"></progress><p class="note">${esc(fmtDay(td))} · ${esc(nOf(items.length, 'visit'))}</p></section>` +
    (items.length ? '' : `<div class="banner ok"><span>${esc(t('routeAllDone'))}</span></div>`) +
    (a.length ? `<section class="card"><h2>${esc(t('collectToday'))} <span class="count">${a.length}</span></h2><ul class="list">${a.map(row).join('')}</ul></section>` : '') +
    (b.length ? `<section class="card"><h2>${esc(t('lateOnes'))} <span class="count">${b.length}</span></h2><ul class="list">${b.map(row).join('')}</ul></section>` : '') +
    (done.length ? `<section class="card"><h2>${esc(t('doneToday'))}</h2><ul class="list">${done.map(x => `<li class="li"><a class="grow" href="#/loans/${x.L.id}"><b>${esc(clientName(x.L))}</b><span>${esc(x.L.num)}</span></a><div class="amt"><b class="oktx">${esc(money(x.s))}</b></div></li>`).join('')}</ul></section>` : '');
}

/* ---------- loans ---------- */
function vLoans() {
  const fl = ['active', 'late', 'today', 'paid', 'all'];
  return pageHead(t('loans'), `<a class="btn primary" href="#/loans/new">${icon('plus')}<span>${esc(t('newLoan'))}</span></a>`) + `<div class="tools"><input type="search" data-in="search" value="${esc(UI.search)}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}"><div class="chips">${fl.map(s => `<button class="chip ${UI.fl === s ? 'on' : ''}" data-act="filter" data-v="${s}">${esc(t('fl_' + s))}</button>`).join('')}</div></div><div id="list">${loansList()}</div>`;
}
const ST_ORDER = { late: 0, today: 1, ok: 2, paid: 3 };
function loanRow(L, showClient) { const st = stOf(L); return `<li class="li"><a class="grow" href="#/loans/${L.id}"><b>${esc(showClient === false ? L.num : clientName(L))}</b><span>${esc(showClient === false ? t('ty_' + L.type) + ' · ' + t('fq_' + L.freq) + ' · ' + fmtDate(L.start) : loanSub(L))}</span></a><div class="amt"><b>${esc(money(st.status === 'paid' ? L.principal : st.remaining + st.moraPending))}</b>${loanPill(st)}</div></li>`; }
function loansList() {
  if (!S.loans.length) return empty(t('emptyLoans'), `<a class="btn primary" href="#/loans/new">${esc(t('newLoan'))}</a>`);
  const f = UI.fl, s = UI.search.trim().toLowerCase();
  const rows = S.loans.filter(L => { const st = stOf(L).status; return (f === 'all' || (f === 'active' ? st !== 'paid' : st === f)) && (!s || (L.num + ' ' + clientName(L)).toLowerCase().includes(s)); }).sort((a, b) => ST_ORDER[stOf(a).status] - ST_ORDER[stOf(b).status] || clientName(a).localeCompare(clientName(b)) || (a.start < b.start ? 1 : -1));
  return rows.length ? `<ul class="list card">${rows.map(L => loanRow(L)).join('')}</ul>` : empty(t('noResults'));
}
function vLoan(id) {
  const L = findL(id); if (!L) return vLoans();
  const st = stOf(L), sc = schedOf(L), c = clientOf(L), active = st.status !== 'paid', live = livePays(L), td = today();
  const b = (act, label, ic, cls, extra) => `<button class="btn ${cls || ''}" data-act="${act}" data-id="${L.id}" ${extra || ''}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`;
  let acts = '';
  if (active) acts += b('payOpen', t('addPayment'), 'cash', 'primary') + b('payoffOpen', t('payoffToday'), 'check') + `<a class="btn" href="#/loans/new?renew=${L.id}">${icon('renew')}<span>${esc(t('renew'))}</span></a>` + b('msgOpen', 'WhatsApp', 'chat', 'wa');
  else acts += `<a class="btn primary" href="#/loans/new?c=${esc(L.clientId)}">${icon('plus')}<span>${esc(t('lendAgain'))}</span></a>`;
  acts += b('stmtPdf', t('planPdf'), 'dl');
  if (active && st.moraPending > 0) acts += b('waiveAsk', t('waiveMora'), 'ban');
  if (!live.length) acts += `<a class="btn" href="#/loans/${L.id}/edit">${icon('edit')}<span>${esc(t('edit'))}</span></a>`;
  acts += b('loanDelAsk', t('del'), 'trash', 'ghost');
  const from = L.renewedFrom && findL(L.renewedFrom), to = L.renewedTo && findL(L.renewedTo);
  const trace = (from ? `<div class="banner"><span>${esc(t('renewedFrom'))} <a class="tlink" href="#/loans/${from.id}">${esc(from.num)}</a></span></div>` : '') + (to ? `<div class="banner"><span>${esc(t('renewedTo'))} <a class="tlink" href="#/loans/${to.id}">${esc(to.num)}</a></span></div>` : '');
  const info = [[t('lent'), money(L.principal)], [t('rate_' + L.type), pct(L.rateBp)], [t(L.type === 'interest' ? 'perPeriod' : 'installment'), money(st.prepaid > 0 ? st.rows[st.rows.length - 1].interest : sc.cuota) + ' × ' + L.n + ' · ' + t('fq_' + L.freq) + (L.noSun ? ' · ' + t('noSunShort') : '')], [t('totalToCollect'), money(st.total)], [t('profit'), money(st.interestTotal)], [t('startDate'), fmtDate(L.start)], [t('lastDue'), fmtDate(sc.rows[sc.rows.length - 1].due)]];
  if (sc.last !== sc.cuota) info.splice(3, 0, [t(L.type === 'interest' ? 'lastWithCapital' : 'lastInst'), money(st.rows[st.rows.length - 1].amount)]);
  if (st.prepaid > 0) info.push([t('prepaidCap'), money(st.prepaid)], [t('capitalLeft'), money(st.remCap)]);
  if (L.mora.on) info.push([t('mora'), moraTerms(L.mora)]);
  if (st.paidMora > 0) info.push([t('moraPaid'), money(st.paidMora)]);
  if (st.discount > 0) info.push([t('discount'), money(st.discount)]);
  const sum = active ? `<div class="row between"><div class="bigsum"><span>${esc(t('balance'))}</span><b>${esc(money(st.remaining))}</b></div>${st.overdue > 0 ? `<div class="bigsum"><span>${esc(t('overdue'))}</span><b class="badtx">${esc(money(st.overdue))}</b></div>` : st.todayAmt > 0 ? `<div class="bigsum"><span>${esc(t('collectToday'))}</span><b>${esc(money(st.todayAmt))}</b></div>` : ''}</div>` : `<div class="bigsum"><span>${esc(st.settled ? t('settledOn', { date: fmtDate(st.settled) }) : t('stPaid'))}</span><b class="oktx">${esc(money(st.paid))}</b></div>`;
  const next = active && st.next ? `<p class="note">${esc(t('nextDue'))}: <b>${esc(fmtDay(st.next.due))}</b> · ${esc(money(st.next.rem))}${st.moraPending > 0 ? ` · <span class="badtx">${esc(t('moraPending'))}: ${esc(money(st.moraPending))}</span>` : ''}</p>` : '';
  const rows = st.rows, first = rows.findIndex(r => r.rem > 0), big = rows.length > 60 && !UI.planAll, lo = big ? Math.max(0, (first < 0 ? rows.length : first) - 3) : 0, shown = big ? rows.slice(lo, lo + 40) : rows;
  const cell = r => { const p = ROW_PILL[r.st]; let x = pill(p[0], r.st === 'late' ? t('lateBy', { d: nOf(r.lateDays, 'day') }) : t(p[1])); if (r.rem > 0 && r.paid > 0) x += `<small>${esc(t('paidPart', { x: money(r.paid) }))}</small>`; if (r.moraRem > 0) x += `<small class="badtx">${esc(t('moraShort'))} ${esc(money(r.moraRem))}</small>`; if (r.st === 'paid' && r.offInt + r.offCap > 0 && r.paid === 0) x = pill('', t('rClosed')); return x; };
  const plan = `<section class="card"><h2>${esc(t('plan'))}</h2><div class="scroll"><table class="plan"><thead><tr><th>#</th><th>${esc(t('due'))}</th><th class="n">${esc(t('installment'))}</th><th class="n wideonly">${esc(t('capital'))}</th><th class="n wideonly">${esc(t('interest'))}</th><th>${esc(t('status'))}</th></tr></thead><tbody>${shown.map(r => `<tr class="${r.st}"><td>${r.k}</td><td class="d">${esc(fmtDay(r.due))}</td><td class="n">${esc(money(r.amount))}</td><td class="n wideonly">${esc(money(r.capital))}</td><td class="n wideonly">${esc(money(r.interest))}</td><td>${cell(r)}</td></tr>`).join('')}</tbody></table></div>${big ? `<button class="btn" data-act="planAll">${esc(t('showAll', { n: rows.length }))}</button>` : ''}</section>`;
  const ps = L.payments.slice().reverse().sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0)); // newest first
  const pays = ps.length ? `<section class="card"><h2>${esc(t('payments'))}</h2><ul class="list">${ps.map(p => payRow(L, st, p)).join('')}</ul></section>` : '';
  return pageHead(c ? c.name : L.num, loanPill(st), '#/loans') + `<p class="muted small">${c ? `<a class="tlink" href="#/clients/${c.id}">${esc(t('viewClient'))}</a> · ` : ''}${esc(loanSub(L))}</p>` + trace + `<div class="actions">${acts}</div><section class="card">${sum}<progress max="${Math.max(1, st.paid + st.remaining)}" value="${st.paid}" aria-label="${esc(t('paid'))}"></progress><p class="note">${esc(t('paidOf', { a: money(st.paid), b: money(st.paid + st.remaining) }))}</p>${next}<div class="info">${info.map(x => `<div><small>${esc(x[0])}</small><b>${esc(x[1])}</b></div>`).join('')}</div>${L.notes ? `<p class="note">${esc(L.notes)}</p>` : ''}</section>` + plan + pays;
}
function payRow(L, st, p, withClient) {
  const A = st.allocs[p.id], parts = A && !p.void ? [A.cap - A.prepay > 0 && t('capital') + ' ' + money(A.cap - A.prepay), A.prepay > 0 && t('prepayPart', { x: money(A.prepay) }), A.int > 0 && t('interest') + ' ' + money(A.int), A.mora > 0 && t('mora') + ' ' + money(A.mora)].filter(Boolean).join(' · ') : '';
  return `<li class="li ${p.void ? 'void' : ''}"><div class="grow"><b>${esc(money(p.amount))}${withClient ? ' · ' + esc(L.num) : ''}</b><span>${esc(fmtDate(p.date))}${p.num ? ' · ' + esc(p.num) : ''}${p.kind !== 'pay' ? ' · ' + esc(kindLabel(p)) : ''}${p.note ? ' · ' + esc(p.note) : ''}</span>${parts ? `<span>${esc(parts)}</span>` : ''}${p.void ? pill('', t('voided')) : ''}</div>${!p.void && p.kind !== 'waive' ? `<button class="iconbtn" data-act="receiptOpen" data-id="${L.id}" data-pid="${p.id}" aria-label="${esc(t('receipt'))}">${icon('receipt')}</button>` : ''}${!p.void ? `<button class="iconbtn" data-act="voidAsk" data-id="${L.id}" data-pid="${p.id}" aria-label="${esc(t('voidPay'))}">${icon('ban')}</button>` : ''}</li>`;
}
const moraTerms = m => (m.type === 'pct' ? t('moraPctTerms', { x: pct(m.value) }) : t('moraFixedTerms', { x: money(m.value) })) + (m.grace > 0 ? ' · ' + t('graceTerms', { d: nOf(m.grace, 'day') }) : '');

/* ---------- loan editor ---------- */
function startLoanEd(id, clientId, renewId) {
  const s = S.settings, td = today(), la = s.last;
  if (id) { const L = findL(id); if (!L || livePays(L).length) return false; ED = { isNew: false, id: L.id, dec: L.dec, renewOf: '', f: { clientId: L.clientId, type: L.type, amount: centsIn(L.principal), rate: centsIn(L.rateBp), n: String(L.n), freq: L.freq, noSun: L.noSun, start: L.start, first: L.first, firstAuto: L.first === ENG.defaultFirst(L.start, L.freq, L.noSun), moraOn: L.mora.on, notes: L.notes } }; }
  else {
    let ren = null, po = null; if (renewId) { ren = findL(renewId); if (!ren || stOf(ren).status === 'paid') return false; po = payoffOf(ren); if (!po || po.total <= 0) return false; }
    const src = ren || la, noSun = src.freq === 'daily' && src.noSun;
    ED = { isNew: true, id: uid(), dec: s.dec, renewOf: ren ? ren.id : '', f: { clientId: ren ? ren.clientId : clientId && findC(clientId) ? clientId : '', type: src.type, amount: ren ? centsIn(po.total) : '', rate: centsIn(src.rateBp), n: String(src.n), freq: src.freq, noSun, start: td, first: ENG.defaultFirst(td, src.freq, noSun), firstAuto: true, moraOn: s.mora.on, notes: '' } };
  }
  ED.hash = location.hash; return true;
}
function draftLoan() {
  const f = ED.f, s = S.settings;
  if (String(f.amount).trim() === '') return { err: 'pvEmpty', soft: true };
  const principal = toCents(f.amount), rateBp = toCents(f.rate), n = /^\d{1,4}$/.test(String(f.n).trim()) ? Number(f.n) : NaN;
  if (!(principal > 0)) return { err: 'errAmount' }; if (principal > MAX_UNITS * 100) return { err: 'errAmountBig' };
  if (!(rateBp >= 0)) return { err: 'errRate' }; if (rateBp > ENG.LIM.BP) return { err: 'errRateBig' };
  if (!(n >= 1) || n > ENG.LIM.N) return { err: 'errN' };
  if (!isDate(f.start) || !isDate(f.first)) return { err: 'errDate' }; if (f.start > today()) return { err: 'errStartFuture' }; if (f.first < f.start) return { err: 'errFirst' };
  const old = !ED.isNew && findL(ED.id);
  const L = { id: ED.id, type: f.type, principal, rateBp, n, freq: f.freq, noSun: f.freq === 'daily' && !!f.noSun, dec: ED.dec, start: f.start, first: f.first, mora: Object.assign({}, old ? old.mora : s.mora, { on: !!f.moraOn }), payments: [] };
  const sc = ENG.schedule(L); if (sc.error) return { err: sc.error === 'rate' ? 'errRateZero' : sc.error === 'small' ? 'errSmall' : sc.error === 'close' ? 'errNoClose' : 'errAmount' };
  if (old && old.renewedFrom) { const src = findL(old.renewedFrom), rp = src && src.payments.find(x => !x.void && x.kind === 'renew'); if (rp && principal < rp.amount) return { err: 'errRenewMin', vars: { x: money(rp.amount) } }; } // a renewal cannot be edited below what it paid off
  let po = null; if (ED.renewOf) { const ren = findL(ED.renewOf); po = ren && payoffOf(ren); if (!po || po.total <= 0) return { err: 'errRenewGone' }; if (principal < po.total) return { err: 'errRenewMin', vars: { x: money(po.total) } }; }
  return { L, sc, po };
}
function pvHtml() {
  const d = draftLoan(), f = ED.f;
  if (d.err) return d.soft ? `<div class="pv-main"><span>${esc(t('preview'))}</span></div><small>${esc(t(d.err))}</small>` : `<div class="pv-main"><span>${esc(t('preview'))}</span></div><p class="err">${esc(t(d.err, d.vars))}</p>`;
  const { sc, L, po } = d, rows = [[t('totalToCollect'), money(sc.total)], [t('profit'), money(sc.interestTotal)]];
  if (sc.last !== sc.cuota) rows.push([t(f.type === 'interest' ? 'lastWithCapital' : 'lastInst'), money(sc.last)]);
  rows.push([t('firstDue'), fmtDay(sc.rows[0].due)], [t('lastDue'), fmtDate(sc.rows[sc.rows.length - 1].due)]);
  if (po) rows.push([t('cashOut'), money(L.principal - po.total)]);
  const odd = L.n > 1 && f.type !== 'interest' && (sc.last * 2 < sc.cuota || sc.last * 2 > sc.cuota * 3) ? `<p class="warnp" id="pv-odd">${esc(t('pvLastOdd', { x: money(sc.last) }))}</p>` : '';
  return `<div class="pv-main"><span>${esc(t(f.type === 'interest' ? 'perPeriod' : 'installment'))} · ${esc(t('fq_' + L.freq))}</span><b id="pv-cuota">${esc(money(sc.cuota))}</b><small>${esc(f.type === 'interest' ? t('pvInterest', { n: L.n }) : nOf(L.n, 'inst'))}</small></div><dl>${rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>${odd}`;
}
function vLoanEditor() {
  const f = ED.f, ren = ED.renewOf && findL(ED.renewOf), back = ED.isNew ? (ren ? '#/loans/' + ren.id : '#/loans') : '#/loans/' + ED.id, old = !ED.isNew && findL(ED.id), mo = old ? old.mora : S.settings.mora;
  const seg = ENG.TYPES.map(k => `<label><input type="radio" name="type" value="${k}" data-ld="type" ${f.type === k ? 'checked' : ''}><b>${esc(t('ty_' + k))}</b><small>${esc(t('tyd_' + k))}</small></label>`).join('');
  const num = (k, attrs) => `<input type="number" inputmode="decimal" min="0" step="any" data-ld="${k}" value="${esc(f[k])}" ${attrs || ''}>`;
  return pageHead(ED.isNew ? t(ren ? 'renewTitle' : 'newLoan') : t('editLoan'), '', back) + `<form class="editor" data-form="loan" novalidate>
  ${ren ? `<div class="banner"><span>${esc(t('renewInfo', { loan: ren.num, x: money(payoffOf(ren).total) }))}</span></div>` : ''}
  <section class="card"><div class="f"><span>${esc(t('client'))}</span><div class="row"><select data-ld="clientId" class="grow" aria-label="${esc(t('client'))}" ${ren ? 'disabled' : ''}><option value="">${esc(t('chooseClient'))}</option>${sortedClients().map(c => `<option value="${c.id}" ${c.id === f.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>${ren ? '' : `<button type="button" class="btn" data-act="newClient" data-from="editor">${icon('plus')}<span>${esc(t('newClient'))}</span></button>`}</div></div></section>
  <section class="card"><h2>${esc(t('loanType'))}</h2><div class="seg" role="radiogroup" aria-label="${esc(t('loanType'))}">${seg}</div>
  <div class="grid2">${field(t('amount') + ' (' + curSym() + ')', num('amount', 'required placeholder="0"'))}${field(t('rate_' + f.type), num('rate', 'max="1000"'), '', 'lbl-rate')}${field(t(f.type === 'interest' ? 'nPeriods' : 'nInst'), `<input type="number" inputmode="numeric" min="1" max="1000" step="1" data-ld="n" value="${esc(f.n)}">`, '', 'lbl-n')}${field(t('frequency'), `<select data-ld="freq">${ENG.FREQS.map(k => `<option value="${k}" ${k === f.freq ? 'selected' : ''}>${esc(t('fq_' + k))}</option>`).join('')}</select>`)}</div>
  <label class="ck" id="row-nosun" ${f.freq === 'daily' ? '' : 'hidden'}><input type="checkbox" data-ld="noSun" ${f.noSun ? 'checked' : ''}><span>${esc(t('noSun'))}</span></label>
  <div class="grid2">${field(t('startDate'), `<input type="date" data-ld="start" value="${esc(f.start)}" max="${today()}" ${ren ? 'disabled' : ''} required>`)}${field(t('firstDue'), `<input type="date" data-ld="first" value="${esc(f.first)}" required>`)}</div>
  ${mo.on || f.moraOn || S.settings.mora.on ? `<label class="ck"><input type="checkbox" data-ld="moraOn" ${f.moraOn ? 'checked' : ''}><span>${esc(t('moraThis'))} <span class="muted">(${esc(moraTerms(mo))})</span></span></label>` : ''}</section>
  <section class="preview" id="pv" aria-live="polite">${pvHtml()}</section>
  <section class="card">${field(t('notes') + opt(), `<textarea data-ld="notes" rows="2" maxlength="1000" placeholder="${esc(t('loanNotesPh'))}">${esc(f.notes)}</textarea>`)}</section>
  <div class="savebar"><a class="btn" href="${back}">${esc(t('cancel'))}</a><button class="btn primary" type="submit">${icon('check')}<span>${esc(t(ren ? 'renewSave' : 'save'))}</span></button></div></form>`;
}
function ldSync(el) {
  if (!ED) return; const f = ED.f, k = el.dataset.ld;
  if (k === 'noSun' || k === 'moraOn') f[k] = el.checked; else if (k === 'type') { if (el.checked && ENG.TYPES.includes(el.value)) f.type = el.value; } else if (k === 'freq') { if (ENG.FREQS.includes(el.value)) f.freq = el.value; } else if (k === 'clientId') f.clientId = findC(el.value) ? el.value : ''; else f[k] = el.value;
  if (k === 'first') f.firstAuto = false;
  if ((k === 'start' || k === 'freq' || k === 'noSun') && f.firstAuto && isDate(f.start)) f.first = ENG.defaultFirst(f.start, f.freq, f.freq === 'daily' && !!f.noSun);
  const fi = $('[data-ld="first"]'); if (fi && fi.value !== f.first && k !== 'first') fi.value = f.first;
  const lr = $('#lbl-rate'), ln = $('#lbl-n'), rn = $('#row-nosun'); if (lr) lr.textContent = t('rate_' + f.type); if (ln) ln.textContent = t(f.type === 'interest' ? 'nPeriods' : 'nInst'); if (rn) rn.hidden = f.freq !== 'daily';
  const pv = $('#pv'); if (pv) pv.innerHTML = pvHtml();
}

/* ---------- clients ---------- */
function owed(clientId) { let s = 0; for (const L of S.loans) if (L.clientId === clientId) { const st = stOf(L); if (st.status !== 'paid') s += st.remaining + st.moraPending; } return s; }
function vClients() { return pageHead(t('clients'), `<button class="btn primary" data-act="newClient">${icon('plus')}<span>${esc(t('newClient'))}</span></button>`) + `<div class="tools"><input type="search" data-in="search" value="${esc(UI.search)}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}"></div><div id="list">${clientsList()}</div>`; }
function clientsList() {
  if (!S.clients.length) return empty(t('noClients'), `<button class="btn primary" data-act="newClient">${esc(t('newClient'))}</button>`);
  const s = UI.search.trim().toLowerCase(), rows = sortedClients().filter(c => !s || (c.name + ' ' + c.phone + ' ' + c.doc).toLowerCase().includes(s));
  return rows.length ? `<ul class="list card">${rows.map(c => { const o = owed(c.id); return `<li class="li"><a class="grow" href="#/clients/${c.id}"><b>${esc(c.name)}</b><span>${esc(c.phone || c.doc || '')}</span></a><div class="amt">${o > 0 ? `<b>${esc(money(o))}</b>` : ''}${behPill(behaviorOf(c.id))}</div></li>`; }).join('')}</ul>` : empty(t('noResults'));
}
function behStats(clientId) { let due = 0, late = 0; for (const L of S.loans) if (L.clientId === clientId) { const st = stOf(L); due += st.dueCount; late += st.lateCount; } return { due, late }; }
function vClient(id) {
  const c = findC(id); if (!c) return vClients();
  const loans = S.loans.filter(l => l.clientId === id).sort((a, b) => ST_ORDER[stOf(a).status] - ST_ORDER[stOf(b).status] || (a.start < b.start ? 1 : -1)), o = owed(id), beh = behaviorOf(id), bs = behStats(id), tel = telHref(c.phone);
  const pays = []; for (const L of loans) for (const p of L.payments.slice().reverse()) pays.push({ L, p }); pays.sort((a, b) => (a.p.date < b.p.date ? 1 : a.p.date > b.p.date ? -1 : 0));
  return pageHead(c.name, behPill(beh), '#/clients') + `<div class="actions"><a class="btn primary" href="#/loans/new?c=${c.id}">${icon('plus')}<span>${esc(t('newLoan'))}</span></a>${tel ? `<a class="btn" href="${esc(tel)}">${icon('phone')}<span>${esc(t('call'))}</span></a>` : ''}${c.phone ? `<button class="btn wa" data-act="waClient" data-id="${c.id}">${icon('chat')}<span>WhatsApp</span></button>` : ''}<button class="btn" data-act="editClient" data-id="${c.id}">${icon('edit')}<span>${esc(t('edit'))}</span></button><button class="btn ghost" data-act="clientDelAsk" data-id="${c.id}">${icon('trash')}<span>${esc(t('del'))}</span></button></div>
  <section class="card"><div class="row between"><div class="bigsum"><span>${esc(t('owesNow'))}</span><b>${esc(money(o))}</b></div><div class="stack">${behPill(beh)}</div></div><p class="note">${esc(bs.due ? t('behStats', { a: bs.due - bs.late, b: bs.due }) : t('behNone'))} ${esc(t('beh_' + beh))}</p><div class="info">${[[t('docId'), c.doc], [t('phone'), c.phone], [t('address'), c.address], [t('reference'), c.ref], [t('notes'), c.notes]].filter(x => x[1]).map(x => `<div><small>${esc(x[0])}</small><span>${esc(x[1])}</span></div>`).join('')}</div></section>
  <section class="card"><h2>${esc(t('loans'))}</h2>${loans.length ? `<ul class="list">${loans.map(L => loanRow(L, false)).join('')}</ul>` : `<p class="muted">${esc(t('clientNoLoans'))}</p>`}</section>
  ${pays.length ? `<section class="card"><h2>${esc(t('payHistory'))}</h2><ul class="list">${pays.slice(0, 60).map(x => payRow(x.L, stOf(x.L), x.p, true)).join('')}</ul>${pays.length > 60 ? `<p class="note">${esc(t('andMore', { n: pays.length - 60 }))}</p>` : ''}</section>` : ''}`;
}
function clientForm(c, from) { c = c || { id: '', name: '', doc: '', phone: '', address: '', ref: '', notes: '' }; return `<h2>${esc(c.id ? t('editClient') : t('newClient'))}</h2><form data-form="client" novalidate><input type="hidden" name="id" value="${esc(c.id)}"><input type="hidden" name="from" value="${esc(from || '')}">${field(t('name'), inp('name', c.name, 'required maxlength="80" autocomplete="off"'))}${field(t('phone'), inp('phone', c.phone, 'type="tel" maxlength="30" autocomplete="off"'))}${field(t('docId') + opt(), inp('doc', c.doc, 'maxlength="40" autocomplete="off"'))}${field(t('address') + opt(), inp('address', c.address, 'maxlength="200"'))}${field(t('reference') + opt(), inp('ref', c.ref, `maxlength="200" placeholder="${esc(t('referencePh'))}"`))}${field(t('notes') + opt(), `<textarea name="notes" rows="2" maxlength="1000">${esc(c.notes)}</textarea>`)}<div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`; }

/* ---------- messages (all written on this device from templates) ---------- */
function defaultTone(L) { const st = stOf(L); return st.overdue > 0 ? (st.overdueDays >= 7 ? 'firm' : 'kind') : st.todayAmt > 0 ? 'kind' : 'before'; }
function buildMsg(L, tone, pid) {
  const st = stOf(L), td = today(), biz = S.settings.biz.name, from = biz ? t('msgFrom', { biz }) : '', client = clientName(L);
  if (tone === 'thanks') { const lp = (pid && L.payments.find(p => p.id === pid && !p.void)) || livePays(L).filter(p => p.kind === 'pay' || p.kind === 'settle').sort((a, b) => (a.date < b.date ? 1 : -1))[0]; const bal = st.status === 'paid' ? 0 : st.remaining + st.moraPending; return t(bal > 0 ? 'msg_thanks' : 'msg_thanksDone', { client, from, paid: lp ? money(lp.amount) : '', balance: money(bal), next: st.next && bal > 0 ? t('msgNext', { date: fmtDate(st.next.due), amount: money(st.next.rem) }) : '' }).replace(/ {2,}/g, ' ').trim(); }
  const fut = st.rows.find(r => r.rem > 0 && r.due > td) || st.next;
  if (tone === 'before') { if (!fut) return ''; const n = diffDays(td, fut.due); return t('msg_before', { client, from, amount: money(fut.rem), when: n === 1 ? t('whenTomorrow', { date: fmtDate(fut.due) }) : n === 0 ? t('whenTodayB') : t('whenOnB', { date: fmtDate(fut.due) }) }); }
  const late = st.overdue > 0, amount = late && tone !== 'kind' ? st.overdue + st.moraPending : st.dueNow > 0 ? st.dueNow : fut ? fut.rem : 0;
  const when = late ? t('whenLate', { d: nOf(st.overdueDays, 'day') }) : st.todayAmt > 0 ? t('whenToday') : fut ? t('whenOn', { date: fmtDate(fut.due) }) : '';
  return t('msg_' + tone, { client, from, amount: money(amount), when }).replace(/ {2,}/g, ' ').replace(/ \./g, '.').trim();
}
function composer(pick) {
  const act = S.loans.filter(l => stOf(l).status !== 'paid').sort((a, b) => ST_ORDER[stOf(a).status] - ST_ORDER[stOf(b).status] || clientName(a).localeCompare(clientName(b)));
  let L = findL(UI.msgLoan); if (pick && (!L || stOf(L).status === 'paid')) { L = act[0] || null; UI.msgLoan = L ? L.id : ''; UI.tone = ''; UI.msgPid = ''; }
  if (!L) return `<div id="composer"><p class="muted">${esc(t('msgNoLoans'))}</p></div>`;
  if (!TONES.includes(UI.tone)) UI.tone = defaultTone(L);
  const c = clientOf(L), text = buildMsg(L, UI.tone, UI.msgPid);
  return `<div id="composer" class="stack">${pick ? field(t('msgTo'), `<select data-in="msgLoan">${act.map(x => `<option value="${x.id}" ${x.id === L.id ? 'selected' : ''}>${esc(clientName(x))} — ${esc(x.num)}</option>`).join('')}</select>`) : ''}<div class="chips" role="group" aria-label="${esc(t('tone'))}">${TONES.map(k => `<button type="button" class="chip ${UI.tone === k ? 'on' : ''}" data-act="tone" data-v="${k}">${esc(t('tone_' + k))}</button>`).join('')}</div><textarea id="msgtext" class="msgbox" rows="6" maxlength="1500" aria-label="${esc(t('message'))}">${esc(text)}</textarea><p class="note">${esc(c && waPhone(c.phone) ? t('msgRespect') : t('needPhone') + ' ' + t('msgRespect'))}</p><div class="row"><button type="button" class="btn wa grow" data-act="msgSend">${icon('chat')}<span>${esc(t('sendWa'))}</span></button><button type="button" class="btn" data-act="msgCopy">${icon('copy')}<span>${esc(t('copy'))}</span></button></div></div>`;
}

/* ---------- assistant (rules over the data on this device) ---------- */
function answer(k) {
  const td = today(), li = (L, sub, amt, tone, extra) => `<li class="li"><a class="grow" href="#/loans/${L.id}"><b>${esc(clientName(L))}</b><span>${esc(sub)}</span>${extra || ''}</a><div class="amt">${amt ? `<b>${esc(amt)}</b>` : ''}${tone ? `<button class="btn sm wa" data-act="msgOpen" data-id="${L.id}" data-tone="${tone}">${icon('chat')}<span>${esc(t('write'))}</span></button>` : ''}</div></li>`;
  let lead = '', body = '';
  if (k === 'week') {
    const end = addDays(td, 6), rows = []; let tot = 0, late = 0;
    for (const L of S.loans) { const st = stOf(L); if (st.status === 'paid') continue; let w = 0; for (const r of st.rows) if (r.rem > 0 && r.due >= td && r.due <= end) w += r.rem; const x = st.overdue + st.moraPending + w; if (x > 0) { rows.push({ L, st, w, x }); tot += x; late += st.overdue + st.moraPending; } }
    rows.sort((a, b) => b.x - a.x);
    lead = rows.length ? t('ansWeek', { x: money(tot), n: nOf(new Set(rows.map(r => r.L.clientId)).size, 'client'), date: fmtDate(end) }) + (late > 0 ? ' ' + t('ansWeekLate', { x: money(late) }) : '') : t('ansWeekNone');
    body = rows.map(r => li(r.L, [r.st.overdue + r.st.moraPending > 0 && t('lateAmt', { x: money(r.st.overdue + r.st.moraPending) }), r.w > 0 && t('thisWeekAmt', { x: money(r.w) })].filter(Boolean).join(' · '), money(r.x))).join('');
  } else if (k === 'late') {
    const rows = S.loans.map(L => ({ L, st: stOf(L) })).filter(r => r.st.status !== 'paid' && r.st.overdue > 0).sort((a, b) => b.st.overdueDays - a.st.overdueDays), tot = rows.reduce((s, r) => s + r.st.overdue, 0);
    lead = rows.length ? t('ansLate', { n: nOf(rows.length, 'loan'), x: money(tot) }) : t('ansLateNone');
    body = rows.map(r => li(r.L, r.L.num + ' · ' + t('lateBy', { d: nOf(r.st.overdueDays, 'day') }) + ' · ' + nOf(r.st.overdueCount, 'inst'), money(r.st.overdue), r.st.overdueDays >= 7 ? 'firm' : 'kind', behPill(behaviorOf(r.L.clientId)))).join('');
  } else if (k === 'earned') {
    const ym = td.slice(0, 7), R = monthReport(ym), pm = ENG.fromDn(ENG.dn(ym + '-01') - 1).slice(0, 7), Rp = monthReport(pm);
    lead = t('ansEarned', { x: money(R.int + R.mora), month: fmtMonth(ym) });
    body = `</ul><dl class="stat"><div><dt>${esc(t('interest'))}</dt><dd>${esc(money(R.int))}</dd></div><div><dt>${esc(t('moraPaid'))}</dt><dd>${esc(money(R.mora))}</dd></div><div><dt>${esc(t('capitalBack'))}</dt><dd>${esc(money(R.cap))}</dd></div><div><dt>${esc(t('cashIn'))}</dt><dd>${esc(money(R.cash))}</dd></div><div><dt>${esc(t('lastMonthInt', { month: fmtMonth(pm) }))}</dt><dd>${esc(money(Rp.int + Rp.mora))}</dd></div></dl><ul class="list">`;
  } else if (k === 'relend') {
    const good = [], wait = [];
    for (const c of sortedClients()) { const ls = S.loans.filter(l => l.clientId === c.id); if (!ls.length) continue; const beh = behaviorOf(c.id), bs = behStats(c.id), o = owed(c.id), over = ls.some(l => stOf(l).overdue > 0), done = ls.some(l => stOf(l).status === 'paid'); if (beh === 'good' && !over && (done || bs.due >= 3)) good.push({ c, bs, o }); else if (beh === 'risky' || over) wait.push({ c, beh, o }); }
    lead = good.length ? t('ansRelend', { n: nOf(good.length, 'client') }) : t('ansRelendNone');
    const cl = (c, sub, amt, p) => `<li class="li"><a class="grow" href="#/clients/${c.id}"><b>${esc(c.name)}</b><span>${esc(sub)}</span>${p}</a><div class="amt">${amt}</div></li>`;
    body = good.map(g => cl(g.c, t('behStats', { a: g.bs.due - g.bs.late, b: g.bs.due }) + ' ' + (g.o > 0 ? t('owesX', { x: money(g.o) }) : t('noDebt')), `<a class="btn sm primary" href="#/loans/new?c=${g.c.id}">${esc(t('lend'))}</a>`, behPill('good'))).join('') + (wait.length ? `</ul><h3>${esc(t('betterWait'))}</h3><ul class="list">` + wait.map(w => cl(w.c, w.o > 0 ? t('owesX', { x: money(w.o) }) : t('noDebt'), '', behPill(w.beh))).join('') : '');
  } else if (k === 'tomorrow') {
    const tm = addDays(td, 1), rows = []; for (const L of S.loans) { const st = stOf(L); if (st.status === 'paid') continue; const r = st.rows.find(x => x.due === tm && x.rem > 0); if (r) rows.push({ L, r }); }
    lead = rows.length ? t('ansTomorrow', { n: nOf(rows.length, 'client'), x: money(rows.reduce((s, r) => s + r.r.rem, 0)), date: fmtDay(tm) }) : t('ansTomorrowNone');
    body = rows.map(r => li(r.L, r.L.num + ' · ' + t('instK', { k: r.r.k, n: r.L.n }), money(r.r.rem), 'before')).join('');
  }
  return `<section class="card answer" id="answer" aria-live="polite"><h2>${esc(t('ask_' + k))}</h2><p class="lead">${esc(lead)}</p><ul class="list">${body}</ul></section>`;
}
function vAssistant() {
  return pageHead(t('assistant')) + `<p class="muted">${esc(t('asstIntro'))}</p><section class="qa">${ASK.map(k => `<button class="${UI.ask === k ? 'on' : ''}" data-act="ask" data-v="${k}"><span>${esc(t('ask_' + k))}</span>${icon('chev')}</button>`).join('')}</section>${ASK.includes(UI.ask) ? answer(UI.ask) : ''}<section class="card"><h2>${esc(t('msgWriter'))}</h2><p class="muted small">${esc(t('msgWriterSub'))}</p>${composer(true)}</section>`;
}

/* ---------- reports ---------- */
function vReports() {
  const td = today(), cur = td.slice(0, 7); if (!/^\d{4}-\d{2}$/.test(UI.month) || UI.month > cur) UI.month = cur;
  const R = monthReport(UI.month), row = (k, v, cls) => `<div class="${cls || ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
  return pageHead(t('reports')) + `<section class="card"><div class="row between"><button class="iconbtn line" data-act="month" data-v="-1" aria-label="${esc(t('prevMonth'))}">${icon('prev')}</button><h2 id="rep-month">${esc(fmtMonth(UI.month))}</h2><button class="iconbtn line" data-act="month" data-v="1" aria-label="${esc(t('nextMonth'))}" ${UI.month >= cur ? 'disabled' : ''}>${icon('chev')}</button></div>
  <dl class="stat">${row(t('repLent'), money(R.lent), 'big')}${row(nOf(R.lentN, 'loan'), R.renewed > 0 ? t('repRenewed', { x: money(R.renewed) }) : '', 'sub')}${row(t('repCash'), money(R.cash), 'big')}${row(t('capitalBack'), money(R.cap), 'sub')}${row(t('interest'), money(R.cInt), 'sub')}${row(t('mora'), money(R.cMora), 'sub')}${row(t('repInterest'), money(R.int), 'big')}${row(t('repMora'), money(R.mora), 'big')}${row(t('repOverdue', { date: fmtDate(R.asOf) }), money(R.overdue), 'big')}${row(nOf(R.overdueN, 'loan'), '', 'sub')}${row(t('capitalOut'), money(R.capital), 'big')}</dl>
  ${R.renewInt > 0 ? `<p class="note">${esc(t('repRenewNote', { x: money(R.renewInt) }))}</p>` : ''}<p class="note">${esc(t('repNote'))}</p>
  <div class="row"><button class="btn" data-act="csvPays">${icon('dl')}<span>${esc(t('csvPays'))}</span></button><button class="btn" data-act="csvLoans">${icon('dl')}<span>${esc(t('csvLoans'))}</span></button></div></section>
  <section class="card"><h2>${esc(t('payments'))} · ${esc(fmtMonth(UI.month))}</h2>${R.rows.length ? `<ul class="list">${R.rows.slice().reverse().slice(0, 100).map(x => `<li class="li"><a class="grow" href="#/loans/${x.L.id}"><b>${esc(clientName(x.L))}</b><span>${esc(fmtDate(x.pay.date))} · ${esc(x.L.num)}${x.pay.kind !== 'pay' || x.A.prepay > 0 ? ' · ' + esc(kindLabel(x.pay, x.A)) : ''}</span></a><div class="amt"><b>${esc(money(x.pay.amount))}</b></div></li>`).join('')}</ul>` : `<p class="muted">${esc(t('repNoPays'))}</p>`}</section>`;
}

/* ---------- settings ---------- */
function vSettings() {
  const s = S.settings, b = s.biz, m = s.mora, sel = (k, opts, val) => `<select data-set="${k}">${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(val) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`, si = (k, val, attrs) => `<input data-set="${k}" value="${esc(val)}" ${attrs || ''}>`;
  const planCard = gated() || licensed() ? `<section class="card pro"><h2>Cuadre Pro</h2><p class="muted">${esc(licensed() ? t('licActive') : planUse())}</p><div class="row"><a class="btn ${licensed() ? '' : 'gold'}" href="#/pro">${esc(licensed() ? 'Cuadre Pro' : t('proTitle'))}</a></div></section>` : '';
  const logoBtn = gated() && !licensed() ? `<button class="btn" data-act="proOpen" data-why="logo"><span>${esc(t('uploadLogo'))}</span><span class="pill warn">Pro</span></button>` : `<label class="btn"><input type="file" accept="image/png,image/jpeg,image/webp" data-in="logo" hidden><span>${esc(t('uploadLogo'))}</span></label>`;
  const bd = backupDays();
  return pageHead(t('settings')) + corruptBanner() + undoBanner() + planCard + `<section class="card"><h2>${esc(t('language'))}</h2><div class="chips">${LANGS.map(l => `<button class="chip ${l[0] === lang() ? 'on' : ''}" data-act="setLang" data-v="${l[0]}" lang="${l[0]}">${esc(l[1])}</button>`).join('')}</div></section>
  <section class="card"><h2>${esc(t('business'))}</h2>${field(t('bizName'), si('biz.name', b.name, 'maxlength="80"'))}<div class="grid2 wide">${field(t('phone'), si('biz.phone', b.phone, 'type="tel" maxlength="30"'))}${field(t('address'), si('biz.address', b.address, 'maxlength="200"'))}</div><div class="f"><span>${esc(t('logo'))}</span><div class="row">${b.logo ? `<img src="${esc(b.logo)}" alt="" class="logo-prev">` : ''}${logoBtn}${b.logo ? `<button class="btn ghost" data-act="logoRemove">${esc(t('removeLogo'))}</button>` : ''}</div><small>${esc(t('logoHint'))}</small></div></section>
  <section class="card"><h2>${esc(t('moneySec'))}</h2><div class="grid2 wide">${field(t('currency'), sel('currency', Object.keys(CURS).map(c => [c, c + ' · ' + CURS[c][0]]), s.currency))}${field(t('decimals'), sel('dec', [[0, t('dec0')], [2, t('dec2')]], s.dec), t('decHint'))}${field(t('dial'), si('dial', s.dial, 'inputmode="numeric" maxlength="4"'), t('dialHint'))}</div></section>
  <section class="card"><h2>${esc(t('mora'))}</h2><label class="ck"><input type="checkbox" data-set="mora.on" ${m.on ? 'checked' : ''}><span>${esc(t('moraOn'))}</span></label>${m.on ? `<div class="grid2 wide">${field(t('moraType'), sel('mora.type', [['pct', t('moraPct')], ['fixed', t('moraFixed', { c: curSym() })]], m.type))}${field(m.type === 'pct' ? t('moraValPct') : t('moraValFixed', { c: curSym() }), si('mora.value', centsIn(m.value), 'type="number" inputmode="decimal" min="0" step="any"'))}${field(t('moraGrace'), si('mora.grace', m.grace, 'type="number" inputmode="numeric" min="0" max="60" step="1"'))}</div>` : ''}<p class="note">${esc(t('moraHint'))}</p></section>
  <section class="card"><h2>${esc(t('security'))}</h2>${pinAvail() ? `<p class="muted">${esc(s.pin ? t('pinIsOn') : t('pinIsOff'))}</p><div class="row">${s.pin ? `<button class="btn" data-act="pinOpen">${icon('lock')}<span>${esc(t('pinChange'))}</span></button><button class="btn" data-act="lockNow">${esc(t('lockNow'))}</button><button class="btn ghost" data-act="pinOffOpen">${esc(t('pinRemove'))}</button>` : `<button class="btn" data-act="pinOpen">${icon('lock')}<span>${esc(t('pinSet'))}</span></button>`}</div>` : ''}<p class="note">${esc(t('pinNote'))}</p></section>
  <section class="card"><h2>${esc(t('backup'))}</h2><p class="muted">${esc(t('backupHint'))}</p><p class="note">${esc(s.lastBackup ? t('lastBackup', { date: fmtDate(s.lastBackup) }) : t('noBackupYet'))}${bd >= 7 ? ' ' + esc(t('backupRemind')) : ''}</p><div class="row"><button class="btn primary" data-act="exportData">${icon('dl')}<span>${esc(t('exportData'))}</span></button><label class="btn"><input type="file" accept="application/json,.json" data-in="import" hidden><span>${esc(t('importData'))}</span></label></div></section>
  <section class="card"><h2>${esc(t('examples'))}</h2><div class="row"><button class="btn" data-act="${hasDemo() ? 'demoRemove' : 'demoLoad'}">${esc(t(hasDemo() ? 'demoRemove' : 'demoLoad'))}</button><button class="btn ghost" data-act="askWipe">${esc(t('wipe'))}</button></div></section>
  <section class="card"><h2>${esc(t('appearance'))}</h2><div class="chips">${[['auto', 'thAuto'], ['light', 'thLight'], ['dark', 'thDark']].map(x => `<button class="chip ${s.theme === x[0] ? 'on' : ''}" data-act="setTheme" data-v="${x[0]}">${esc(t(x[1]))}</button>`).join('')}</div></section>
  ${installEvt ? `<section class="card"><button class="btn primary" data-act="install">${icon('dl')}<span>${esc(t('install'))}</span></button></section>` : _isIos() && !isStandalone() ? `<section class="card"><p class="muted">${esc(t('installIos'))}</p></section>` : ''}${helpCard()}<p class="foot">Cuadre Préstamos · Arthur Labs</p>`;
}
function vMore() { return pageHead(t('more')) + `<ul class="list card">${['assistant', 'reports', 'settings'].map(n => `<li class="li"><a class="grow rowlink" href="#/${n}">${icon(n)}<b>${esc(t(n))}</b></a>${icon('chev')}</li>`).join('')}${gated() || licensed() ? `<li class="li"><a class="grow rowlink" href="#/pro">${icon('check')}<b>Cuadre Pro</b></a>${icon('chev')}</li>` : ''}</ul>${installEvt ? `<button class="btn primary" data-act="install">${icon('dl')}<span>${esc(t('install'))}</span></button>` : ''}<p class="note center">${esc(t('deviceOnly'))}</p>`; }

/* ---------- welcome, lock ---------- */
function vWelcome() {
  const lg = lang(), cur = UI.wCur || S.settings.currency, dec = UI.wDec == null ? S.settings.dec : UI.wDec;
  return `<div class="welcome"><img src="icons/icon.svg" alt="" width="64" height="64"><h1>${esc(t('welcomeTitle'))}</h1><p>${esc(t('welcomeSub'))}</p>${corruptBanner()}${installBanner()}<div class="chips" role="group" aria-label="${esc(t('language'))}">${LANGS.map(l => `<button class="chip ${l[0] === lg ? 'on' : ''}" data-act="welcomeLang" data-v="${l[0]}" lang="${l[0]}">${esc(l[1])}</button>`).join('')}</div>
  <form data-form="welcome" novalidate class="card">${field(t('bizName') + opt(), inp('biz', UI.wBiz, 'maxlength="80" autocomplete="organization"'))}<div class="grid2">${field(t('currency'), `<select name="currency">${Object.keys(CURS).map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c} · ${esc(CURS[c][0])}</option>`).join('')}</select>`)}${field(t('decimals'), `<select name="dec"><option value="0" ${dec === 0 ? 'selected' : ''}>${esc(t('dec0'))}</option><option value="2" ${dec === 2 ? 'selected' : ''}>${esc(t('dec2'))}</option></select>`)}</div><button class="btn primary big" type="submit">${esc(t('start'))}</button><button class="btn" type="submit" name="demo" value="1">${esc(t('tryDemo'))}</button></form><small>${esc(t('deviceOnly'))}</small></div>`;
}
const waitText = ms => { const s = Math.max(1, Math.ceil(ms / 1000)); return s >= 90 ? t('waitMin', { n: Math.ceil(s / 60) }) : t('waitSec', { n: s }); };
function vLock() { const lk = lockGet(), left = lk.until - Date.now(); return `<div class="welcome"><img src="icons/icon.svg" alt="" width="64" height="64"><h1>Cuadre</h1><p>${esc(t('lockSub'))}</p>${left > 0 ? `<p class="banner warn" id="lockwait">${esc(t('pinWait', { t: waitText(left) }))}</p>` : ''}<form data-form="unlock" novalidate class="card">${field(t('pin'), '<input name="pin" class="pinin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" required autofocus>')}<button class="btn primary big" type="submit">${icon('lock')}<span>${esc(t('unlock'))}</span></button></form><button class="btn ghost" data-act="pinForgot">${esc(t('pinForgot'))}</button></div>`; }

/* ---------- router ---------- */
function render() {
  applyTheme();
  const app = $('#app'), view = $('#view');
  dayShown = today();
  if (LOCKED) { app.classList.add('bare'); $('#side').innerHTML = ''; $('#tabs').innerHTML = ''; view.innerHTML = vLock(); return; } // nothing of the app stays in the page while locked
  if (!S.settings.onboarded) { if (!S.settings.lang) S.settings.lang = 'es'; /* Spanish unless the person picks another one */ applyTheme(); app.classList.add('bare'); view.innerHTML = vWelcome(); return; }
  app.classList.remove('bare');
  const raw = location.hash.replace(/^#\/?/, ''), qi = raw.indexOf('?'), path = (qi < 0 ? raw : raw.slice(0, qi)).split('/').filter(Boolean), qs = new URLSearchParams(qi < 0 ? '' : raw.slice(qi + 1));
  const sec = path[0] || 'home', a = path[1], b = path[2];
  let html, active = sec, focus = false;
  if (sec === 'loans') {
    if (a === 'new' && !canAddLoan() && !(ED && ED.isNew)) { history.replaceState(null, '', '#/loans'); ED = null; html = vLoans(); pendingPro = 'loans'; }
    else if (a === 'new' || b === 'edit') {
      const id = a === 'new' ? null : a, ren = a === 'new' ? sRef(qs.get('renew')) : '', qc = sRef(qs.get('c'));
      if (!ED || (id ? ED.id !== id || ED.isNew : !ED.isNew || ED.renewOf !== ren || (qc && ED.f.clientId !== qc && String(ED.f.amount).trim() === ''))) { if (!startLoanEd(id, qc, ren)) { ED = null; return go('#/loans' + (id ? '/' + id : ren ? '/' + ren : '')); } }
      html = vLoanEditor(); focus = true;
    } else { ED = null; html = a ? vLoan(a) : vLoans(); }
  } else {
    if (sec !== 'pro') ED = null; // keep the draft while the key is typed
    html = sec === 'route' ? vRoute() : sec === 'clients' ? (a ? vClient(a) : vClients()) : sec === 'assistant' ? vAssistant() : sec === 'reports' ? vReports() : sec === 'settings' ? vSettings() : sec === 'more' ? vMore() : sec === 'pro' ? vPro() : vHome();
    if (sec === 'pro') active = 'settings'; else if (!NAV.includes(sec) && sec !== 'more') active = 'home';
  }
  shell(active, focus); view.innerHTML = html;
  if (pendingPro) { const w = pendingPro; pendingPro = null; proOpen(w); }
}
