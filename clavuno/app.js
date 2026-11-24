'use strict';
/* Clavuno app: views, routing and actions. All user text goes through esc() before reaching the DOM. */
const $ = (s, r) => (r || document).querySelector(s);
const IC = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', quotes: 'M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4', invoices: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  clients: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M15.5 4.2a3.5 3.5 0 0 1 0 6.6', catalog: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', receivables: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.7.9-2.7 2s1 1.800 2.700 2c1.700.2 2.700.9 2.700 2s-1.200 2-2.700 2c-1.200 0-2.200-.6-2.600-1.500M12 6v2M12 16v2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.300l2-1.500-2-3.400-2.300.9a7 7 0 0 0-2.200-1.300L14 3h-4l-.4 2.400a7 7 0 0 0-2.200 1.300l-2.300-.9-2 3.400 2 1.500a7 7 0 0 0 0 2.600l-2 1.500 2 3.400 2.300-.9a7 7 0 0 0 2.200 1.300L10 21h4l.4-2.400a7 7 0 0 0 2.200-1.300l2.300.9 2-3.400-2-1.500c.1-.4.1-.9.1-1.300z', more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', chev: 'M9 6l6 6-6 6', back: 'M15 6l-6 6 6 6', chat: 'M21 12a8.500 8.500 0 0 1-12.600 7.400L3 21l1.600-5.200A8.500 8.500 0 1 1 21 12z', dl: 'M12 4v11M7 11l5 5 5-5M5 20h14', check: 'M5 12.500l4.500 4.500L19 7.500', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', copy: 'M9 9h10v11H9zM5 15V4h10', bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0', share: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6'
};
const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n]}"/></svg>`;
const NAV = ['home', 'quotes', 'invoices', 'clients', 'catalog', 'receivables', 'settings'];
const TABS = ['home', 'quotes', 'invoices', 'clients', 'more'];
let ED = null, SEND = null, installEvt = null;
const UI = { fq: 'all', fi: 'all', search: '' };
const DEMO_ITEMS = { es: ['Visita y diagnóstico', 'Mano de obra (hora)', 'Instalación completa', 'Materiales', 'Mantenimiento mensual'], en: ['Site visit and diagnosis', 'Labor (hour)', 'Full installation', 'Materials', 'Monthly maintenance'], fr: ['Visite et diagnostic', 'Main-d’œuvre (heure)', 'Installation complète', 'Matériaux', 'Entretien mensuel'], pt: ['Visita e diagnóstico', 'Mão de obra (hora)', 'Instalação completa', 'Materiais', 'Manutenção mensal'], de: ['Besichtigung und Diagnose', 'Arbeitszeit (Stunde)', 'Komplette Installation', 'Material', 'Monatliche Wartung'], it: ['Sopralluogo e diagnosi', 'Manodopera (ora)', 'Installazione completa', 'Materiali', 'Manutenzione mensile'] };

/* ---------- small ui helpers ---------- */
function toast(msg, kind) { const el = document.createElement('div'); el.className = 'toast' + (kind ? ' ' + kind : ''); el.setAttribute('role', 'status'); el.textContent = msg; const box = $('#toasts'); while (box.children.length > 1) box.firstChild.remove(); box.appendChild(el); setTimeout(() => el.remove(), 3600); }
function persist(msg) { if (save()) { if (msg) toast(msg); return true; } S = loadState(); ED = null; toast(t('errSave'), 'err'); setTimeout(render, 0); return false; } // on a failed write, go back to the last stored state
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; document.body.classList.add('lock'); const f = m.querySelector('input:not([type=hidden]),select,textarea,button'); if (f) f.focus(); }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.classList.remove('lock'); SEND = null; }
function confirmBox(msg, label, act, danger) { openModal(`<h2>${esc(msg)}</h2><div class="row end"><button class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="${act}">${esc(label)}</button></div>`); }
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const pill = (cls, label) => `<span class="pill ${cls}">${esc(label)}</span>`;
const Q_PILL = { draft: ['', 'stDraft'], sent: ['inf', 'stSent'], accepted: ['ok', 'stAccepted'], rejected: ['mute', 'stRejected'], expired: ['warn', 'stExpired'] };
const I_PILL = { pending: ['inf', 'stPending'], partial: ['inf', 'stPartial'], paid: ['ok', 'stPaid'], overdue: ['bad', 'stOverdue'] };
const qPill = q => { const p = Q_PILL[quoteStatus(q)]; return pill(p[0], t(p[1])); };
const iPill = i => { const p = I_PILL[invStatus(i)]; return pill(p[0], t(p[1])); };
const empty = (msg, btn) => `<div class="empty"><p>${esc(msg)}</p>${btn || ''}</div>`;
const field = (label, input, hint) => `<label class="f"><span>${esc(label)}</span>${input}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
const inp = (name, val, attrs) => `<input name="${name}" value="${esc(val)}" ${attrs || ''}>`;
const findQ = id => S.quotes.find(q => q.id === id), findI = id => S.invoices.find(i => i.id === id), findC = id => S.clients.find(c => c.id === id);
const hasDemo = () => ['clients', 'items', 'quotes', 'invoices'].some(k => S[k].some(x => x.demo));
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function openUrl(url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove(); }
function applyTheme() { const th = S.settings.theme; if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th); document.documentElement.lang = lang(); }

/* ---------- shell ---------- */
function shell(active, focus) {
  const link = n => `<a href="#/${n === 'home' ? '' : n}" class="${n === active ? 'on' : ''}"${n === active ? ' aria-current="page"' : ''}>${icon(n)}<span>${esc(t(n))}</span></a>`;
  $('#side').innerHTML = `<a class="brand" href="#/"><img src="icons/icon.svg" alt="" width="34" height="34"><b>Clavuno</b></a><nav>${NAV.map(link).join('')}</nav>${gated() && !licensed() ? `<a class="btn primary" href="#/pro">Clavuno Pro</a>` : ''}${installEvt ? `<button class="btn primary" data-act="install">${icon('dl')}${esc(t('install'))}</button>` : ''}<small>${esc(t('offline'))}</small>`;
  const tabActive = TABS.includes(active) ? active : 'more';
  $('#tabs').innerHTML = TABS.map(n => `<a href="#/${n === 'home' ? '' : n}" class="${n === tabActive ? 'on' : ''}">${icon(n)}<span>${esc(t(n))}</span></a>`).join('');
  document.body.classList.toggle('focus', !!focus);
}
const pageHead = (title, right, backHref) => `<header class="ph">${backHref ? `<a class="iconbtn" href="${backHref}" aria-label="${esc(t('back'))}">${icon('back')}</a>` : ''}<h1>${esc(title)}</h1><div class="row">${right || ''}</div></header>`;

/* ---------- Pro ---------- */
const maskKey = k => (k ? k.slice(0, 12) + '-••••-••••-' + k.slice(-4) : '');
const proBenefits = () => `<ul class="benefits">${['proB1', 'proB2', 'proB3'].map(k => `<li>${icon('check')}<span>${esc(t(k))}</span></li>`).join('')}</ul>`;
const buyBtn = () => (gated() ? `<button class="btn primary big" data-act="buyPro">${esc(t('buyPro', { price: CFG.PRICE }))}</button>` : '');
const planUse = () => t('planUse', { a: realClients(), c: CFG.FREE_CLIENTS, b: realDocs(), d: CFG.FREE_DOCS });
function vPro() {
  if (licensed()) return pageHead('Clavuno Pro', pill('ok', 'Pro'), '#/settings') + `<section class="card pro"><p><b>${esc(t('licActive'))}</b></p><p class="muted keytx">${esc(maskKey(S.plan.license))}</p>${proBenefits()}<div class="row"><button class="btn ghost" data-act="licRemoveAsk">${esc(t('licRemove'))}</button></div></section>`;
  return pageHead('Clavuno Pro', '', '#/settings') + `<section class="card pro"><h2>${esc(t('proTitle'))}</h2><p class="muted">${esc(t('proSub'))}</p>${proBenefits()}${gated() ? `<p class="muted">${esc(t('proFree', { c: CFG.FREE_CLIENTS, d: CFG.FREE_DOCS }))}<br>${esc(planUse())}</p>` : ''}${buyBtn()}</section><section class="card"><h2>${esc(t('haveKey'))}</h2><form data-form="license" novalidate>${field(t('licKey'), '<input name="key" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="60" placeholder="CLAVUNO-XXXX-XXXX-XXXX-XXXX">', t('keyByEmail'))}<button class="btn primary" type="submit">${esc(t('activate'))}</button></form></section>`;
}
function proOpen(why) {
  const msg = why === 'clients' ? t('limitClients', { n: CFG.FREE_CLIENTS }) : why === 'docs' ? t('limitDocs', { n: CFG.FREE_DOCS }) : why === 'logo' ? t('logoPro') : '';
  openModal(`<h2>${esc(t('proTitle'))}</h2>${msg ? `<p class="banner warn">${esc(msg)}</p>` : ''}<p class="muted">${esc(t('proSub'))}</p>${proBenefits()}<div class="stack">${buyBtn()}<a class="btn" href="#/pro">${esc(t('haveKey'))}</a><button class="btn ghost" data-act="closeModal">${esc(t('close'))}</button></div>`);
}
let pendingPro = null;

/* ---------- install banner ---------- */
function installBanner() {
  if (isStandalone() || UI.hideInstall) return '';
  if (installEvt) return `<div class="install"><img src="icons/icon.svg" alt="" width="52" height="52"><div class="grow"><b>${esc(t('install'))}: Clavuno</b><span>${esc(t('offline'))}</span></div><button class="btn primary big" data-act="install">${icon('dl')}<span>${esc(t('install'))}</span></button><button class="iconbtn" data-act="installHide" aria-label="${esc(t('close'))}">${icon('x')}</button></div>`;
  if (_isIos()) return `<div class="install"><img src="icons/icon.svg" alt="" width="52" height="52"><div class="grow"><b>${esc(t('install'))}: Clavuno</b><span>${icon('share')} ${esc(t('installIos'))}</span></div><button class="iconbtn" data-act="installHide" aria-label="${esc(t('close'))}">${icon('x')}</button></div>`;
  return '';
}

/* ---------- home ---------- */
function todayItems() {
  const out = [], td = today();
  S.quotes.filter(needsFollow).forEach(q => out.push({ k: 'follow', id: q.id, title: clientName(q), sub: q.number + ' · ' + money(totals(q).total, q.currency), tag: t('followDue', { n: diffDays(q.lastFollowAt || q.sentAt, td) }), cls: 'warn', href: '#/quotes/' + q.id }));
  S.invoices.filter(i => invStatus(i) === 'overdue').forEach(i => out.push({ k: 'remind', id: i.id, title: clientName(i), sub: i.number + ' · ' + money(totals(i).balance, i.currency), tag: t('overdueBy', { n: diffDays(i.dueDate, td) }), cls: 'bad', href: '#/invoices/' + i.id, quiet: !needsRemind(i) }));
  S.quotes.filter(q => quoteStatus(q) === 'sent' && q.validUntil === td && !needsFollow(q)).forEach(q => out.push({ k: 'follow', id: q.id, title: clientName(q), sub: q.number + ' · ' + money(totals(q).total, q.currency), tag: t('expiresToday'), cls: 'warn', href: '#/quotes/' + q.id }));
  return out;
}
function vHome() {
  const cur = S.settings.currency, td = today(), month = td.slice(0, 7);
  let toCollect = 0, over = 0, open = 0, collected = 0;
  for (const i of S.invoices) { if (i.currency !== cur) continue; const T = totals(i); if (T.balance > 0) { toCollect += T.balance; if (i.dueDate < td) over += T.balance; } for (const p of i.payments) if (p.date.slice(0, 7) === month) collected += p.amount; }
  for (const q of S.quotes) if (q.currency === cur && quoteStatus(q) === 'sent') open += totals(q).total;
  const items = todayItems(), fresh = !S.clients.length && !S.quotes.length && !S.invoices.length;
  const kpi = (label, val, cls, href) => `<a class="kpi ${cls || ''}" href="${href}"><span>${esc(label)}</span><b>${esc(money(roundC(val, cur), cur))}</b></a>`;
  const recent = [...S.quotes.map(q => ({ d: q, k: 'quotes' })), ...S.invoices.map(i => ({ d: i, k: 'invoices' }))].sort((a, b) => (a.d.date < b.d.date ? 1 : a.d.date > b.d.date ? -1 : 0)).slice(0, 5);
  return pageHead(S.settings.biz.name || 'Clavuno', `<a class="btn primary" href="#/quotes/new">${icon('plus')}<span>${esc(t('newQuote'))}</span></a>`) +
    installBanner() + (hasDemo() ? `<div class="banner"><span>${esc(t('demoBanner'))}</span><button class="btn sm" data-act="demoRemove">${esc(t('demoRemove'))}</button></div>` : '') +
    `<section class="kpis">${kpi(t('toCollect'), toCollect, '', '#/receivables')}${kpi(t('overdue'), over, over > 0 ? 'bad' : '', '#/receivables')}${kpi(t('openQuotes'), open, '', '#/quotes')}${kpi(t('collectedMonth'), collected, 'ok', '#/invoices')}</section>` +
    (fresh ? `<section class="card"><h2>${esc(t('firstSteps'))}</h2><ol class="steps"><li><button class="linkish" data-act="newClient">${esc(t('step1'))}</button></li><li><a href="#/catalog">${esc(t('step2'))}</a></li><li><a href="#/quotes/new">${esc(t('step3'))}</a></li></ol><button class="btn" data-act="demoLoad">${esc(t('tryDemo'))}</button></section>` : '') +
    `<section class="card"><h2>${esc(t('forToday'))}${items.length ? ` <span class="count">${items.length}</span>` : ''}</h2>${items.length ? `<ul class="list">${items.map(x => `<li class="li"><a class="grow" href="${x.href}"><b>${esc(x.title)}</b><span>${esc(x.sub)}</span><span class="pill ${x.cls}">${esc(x.tag)}</span></a><button class="btn sm wa" data-act="sendOpen" data-kind="${x.k === 'follow' ? 'quote' : 'invoice'}" data-id="${x.id}" data-mode="${x.k}">${icon('chat')}<span>${esc(t(x.k === 'follow' ? 'followUp' : 'remind'))}</span></button></li>`).join('')}</ul>` : `<p class="muted">${esc(t('nothingToday'))}</p>`}</section>` +
    (recent.length ? `<section class="card"><h2>${esc(t('recent'))}</h2><ul class="list">${recent.map(r => docRow(r.d, r.k)).join('')}</ul></section>` : '');
}
function docRow(d, k) { const T = totals(d); return `<li class="li"><a class="grow" href="#/${k}/${d.id}"><b>${esc(clientName(d))}</b><span>${esc(d.number)} · ${esc(fmtDate(d.date))}</span></a><div class="amt"><b>${esc(money(k === 'invoices' && T.paid > 0 && T.balance > 0 ? T.balance : T.total, d.currency))}</b>${k === 'quotes' ? qPill(d) : iPill(d)}</div></li>`; }

/* ---------- lists ---------- */
function vDocs(k) {
  const isQ = k === 'quotes', sts = isQ ? ['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'] : ['all', 'pending', 'partial', 'overdue', 'paid'], fk = isQ ? 'fq' : 'fi', map = isQ ? Q_PILL : I_PILL;
  return pageHead(t(k), `<a class="btn primary" href="#/${k}/new">${icon('plus')}<span>${esc(t(isQ ? 'newQuote' : 'newInvoice'))}</span></a>`) +
    `<div class="tools"><input type="search" data-in="search" value="${esc(UI.search)}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}"><div class="chips">${sts.map(s => `<button class="chip ${UI[fk] === s ? 'on' : ''}" data-act="filter" data-k="${fk}" data-v="${s}">${esc(s === 'all' ? t('all') : t(map[s][1]))}</button>`).join('')}</div></div><div id="list">${docsList(k)}</div>`;
}
function docsList(k) {
  const isQ = k === 'quotes', f = UI[isQ ? 'fq' : 'fi'], s = UI.search.trim().toLowerCase();
  let rows = (isQ ? S.quotes : S.invoices).filter(d => (f === 'all' || (isQ ? quoteStatus(d) : invStatus(d)) === f) && (!s || (d.number + ' ' + clientName(d)).toLowerCase().includes(s)));
  rows = rows.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.number < b.number ? 1 : -1));
  const total = (isQ ? S.quotes : S.invoices).length;
  if (!total) return empty(t(isQ ? 'emptyQuotes' : 'emptyInvoices'), `<a class="btn primary" href="#/${k}/new">${esc(t(isQ ? 'newQuote' : 'newInvoice'))}</a>`);
  return rows.length ? `<ul class="list card">${rows.map(d => docRow(d, k)).join('')}</ul>` : empty(t('noResults'));
}

/* ---------- document view ---------- */
function paper(d, kind) {
  const T = totals(d), c = clientOf(d), b = S.settings.biz, cur = d.currency;
  return `<article class="paper"><header><div>${b.logo ? `<img src="${esc(b.logo)}" alt="" class="logo">` : ''}<b class="biz">${esc(b.name || 'Clavuno')}</b>${[b.taxId, b.phone, b.email, b.address].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</div><div class="r"><em>${esc(t(kind))}</em><b>${esc(d.number)}</b><span>${esc(t('date'))}: ${esc(fmtDate(d.date))}</span><span>${esc(t(kind === 'quote' ? 'validUntil' : 'dueDate'))}: ${esc(fmtDate(kind === 'quote' ? d.validUntil : d.dueDate))}</span></div></header>
  <div class="to"><small>${esc(t('billTo'))}</small><b>${esc(c ? c.name : '—')}</b>${c ? [c.company, c.phone, c.email, c.address].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('') : ''}</div>
  <div class="scroll"><table><thead><tr><th>${esc(t('concept'))}</th><th class="n">${esc(t('qty'))}</th><th class="n">${esc(t('price'))}</th><th class="n">${esc(t('amount'))}</th></tr></thead><tbody>${d.lines.map(l => `<tr><td><b>${esc(l.name)}</b>${l.desc ? `<span>${esc(l.desc)}</span>` : ''}</td><td class="n">${esc(fmtNum(l.qty))}</td><td class="n">${esc(money(l.price, cur))}</td><td class="n">${esc(money(roundC(l.qty * l.price, cur), cur))}</td></tr>`).join('')}</tbody></table></div>
  <dl class="tot"><div><dt>${esc(t('subtotal'))}</dt><dd>${esc(money(T.sub, cur))}</dd></div>${T.disc > 0 ? `<div><dt>${esc(t('discount'))} (${esc(fmtNum(d.discount))}%)</dt><dd>−${esc(money(T.disc, cur))}</dd></div>` : ''}${d.taxRate > 0 ? `<div><dt>${esc(d.taxName || t('tax'))} (${esc(fmtNum(d.taxRate))}%)</dt><dd>${esc(money(T.tax, cur))}</dd></div>` : ''}<div class="big"><dt>${esc(t('total'))}</dt><dd>${esc(money(T.total, cur))}</dd></div>${kind === 'invoice' && T.paid > 0 ? `<div><dt>${esc(t('paid'))}</dt><dd>−${esc(money(T.paid, cur))}</dd></div><div class="bal"><dt>${esc(t('balance'))}</dt><dd>${esc(money(T.balance, cur))}</dd></div>` : ''}</dl>
  ${d.notes ? `<div class="notes"><small>${esc(t('notes'))}</small><p>${esc(d.notes)}</p></div>` : ''}${S.settings.terms ? `<p class="terms">${esc(S.settings.terms)}</p>` : ''}</article>`;
}
function vQuote(id) {
  const q = findQ(id); if (!q) return vDocs('quotes');
  const st = quoteStatus(q), inv = q.invoiceId && findI(q.invoiceId), b = (act, label, ic, cls, extra) => `<button class="btn ${cls || ''}" data-act="${act}" data-id="${q.id}" ${extra || ''}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`;
  let acts = b('sendOpen', t('send'), 'chat', 'wa', 'data-kind="quote" data-mode="send"');
  if (st === 'draft') acts += b('markSent', t('markSent'), 'check');
  if (st === 'sent' || st === 'draft' || st === 'expired') acts += b('accept', t('accept'), 'invoices', 'primary') ;
  if (st === 'sent') acts += b('reject', t('reject'), 'x');
  if (st === 'rejected') acts += b('reopen', t('reopen'), 'edit');
  if (inv) acts += `<a class="btn primary" href="#/invoices/${inv.id}">${icon('invoices')}<span>${esc(t('viewInvoice'))}</span></a>`;
  if (st !== 'accepted') acts += `<a class="btn" href="#/quotes/${q.id}/edit">${icon('edit')}<span>${esc(t('edit'))}</span></a>`;
  acts += b('duplicate', t('duplicate'), 'copy') + b('askDelete', t('del'), 'trash', 'ghost', 'data-kind="quote"');
  const follow = needsFollow(q) ? `<div class="banner warn"><span>${esc(t('followDue', { n: diffDays(q.lastFollowAt || q.sentAt, today()) }))}</span><div class="row"><button class="btn sm wa" data-act="sendOpen" data-kind="quote" data-id="${q.id}" data-mode="follow">${icon('chat')}<span>${esc(t('followUp'))}</span></button><button class="btn sm" data-act="followDone" data-id="${q.id}">${esc(t('followDone'))}</button></div></div>` : '';
  return pageHead(q.number, qPill(q), '#/quotes') + follow + `<div class="actions">${acts}</div>` + paper(q, 'quote');
}
function vInvoice(id) {
  const i = findI(id); if (!i) return vDocs('invoices');
  const T = totals(i), st = invStatus(i), q = i.quoteId && findQ(i.quoteId), b = (act, label, ic, cls, extra) => `<button class="btn ${cls || ''}" data-act="${act}" data-id="${i.id}" ${extra || ''}>${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`;
  let acts = '';
  if (T.balance > 0) acts += b('payOpen', t('addPayment'), 'receivables', 'primary');
  acts += b('sendOpen', t('send'), 'chat', 'wa', 'data-kind="invoice" data-mode="send"');
  if (st === 'overdue' || st === 'partial' || st === 'pending') acts += b('sendOpen', t('remind'), 'bell', '', 'data-kind="invoice" data-mode="remind"');
  if (!i.payments.length) acts += `<a class="btn" href="#/invoices/${i.id}/edit">${icon('edit')}<span>${esc(t('edit'))}</span></a>`;
  if (q) acts += `<a class="btn" href="#/quotes/${q.id}">${icon('quotes')}<span>${esc(t('viewQuote'))}</span></a>`;
  acts += b('askDelete', t('del'), 'trash', 'ghost', 'data-kind="invoice"');
  const pays = i.payments.length ? `<section class="card"><h2>${esc(t('payments'))}</h2><ul class="list">${i.payments.map(p => `<li class="li"><div class="grow"><b>${esc(money(p.amount, i.currency))}</b><span>${esc(fmtDate(p.date))} · ${esc(t('m' + p.method[0].toUpperCase() + p.method.slice(1)))}${p.note ? ' · ' + esc(p.note) : ''}</span></div><button class="iconbtn" data-act="payDelete" data-id="${i.id}" data-pid="${p.id}" aria-label="${esc(t('del'))}">${icon('trash')}</button></li>`).join('')}</ul></section>` : '';
  return pageHead(i.number, iPill(i), '#/invoices') + `<div class="actions">${acts}</div>` + paper(i, 'invoice') + pays;
}

/* ---------- editor ---------- */
function startEditor(kind, id, clientId) {
  const s = S.settings, td = today(), list = kind === 'quote' ? S.quotes : S.invoices, ex = id ? list.find(d => d.id === id) : null;
  if (id && !ex) return false;
  if (ex) { if (kind === 'quote' && ex.status === 'accepted') return false; if (kind === 'invoice' && ex.payments.length) return false; ED = { kind, isNew: false, doc: JSON.parse(JSON.stringify(ex)) }; }
  else { const d = { id: uid(), number: '', clientId: clientId && findC(clientId) ? clientId : '', date: td, lines: [sLine({ name: '', qty: 1, price: 0 })], discount: 0, taxRate: s.taxRate, taxName: s.taxName, currency: s.currency, notes: '', sentAt: '', demo: false }; if (kind === 'quote') Object.assign(d, { validUntil: addDays(td, s.validDays), status: 'draft', lastFollowAt: '', followCount: 0, invoiceId: '' }); else Object.assign(d, { quoteId: '', dueDate: addDays(td, s.dueDays), lastRemindAt: '', payments: [] }); ED = { kind, isNew: true, doc: d }; }
  return true;
}
function edLines() {
  const d = ED.doc;
  return d.lines.map((l, i) => `<div class="ln" data-i="${i}"><div class="ln-top"><input data-f="name" value="${esc(l.name)}" placeholder="${esc(t('concept'))}" aria-label="${esc(t('concept'))}" maxlength="160"><button type="button" class="iconbtn" data-act="lineDel" data-i="${i}" aria-label="${esc(t('del'))}">${icon('trash')}</button></div><input data-f="desc" value="${esc(l.desc)}" placeholder="${esc(t('description'))} (${esc(t('optional'))})" aria-label="${esc(t('description'))}" maxlength="500"><div class="ln-nums"><label><span>${esc(t('qty'))}</span><input data-f="qty" type="number" inputmode="decimal" min="0" step="any" value="${l.qty}"></label><label><span>${esc(t('price'))}</span><input data-f="price" type="number" inputmode="decimal" min="0" step="any" value="${l.price}"></label><div class="ln-amt"><span>${esc(t('amount'))}</span><b data-amt>${esc(money(roundC(l.qty * l.price, d.currency), d.currency))}</b></div></div><label class="ck"><input type="checkbox" data-f="taxable" ${l.taxable ? 'checked' : ''}><span>${esc(t('taxable'))}</span></label></div>`).join('');
}
function edTotals() { const d = ED.doc, T = totals(d); return `<div><dt>${esc(t('subtotal'))}</dt><dd>${esc(money(T.sub, d.currency))}</dd></div>${T.disc > 0 ? `<div><dt>${esc(t('discount'))}</dt><dd>−${esc(money(T.disc, d.currency))}</dd></div>` : ''}${d.taxRate > 0 ? `<div><dt>${esc(d.taxName || t('tax'))}</dt><dd>${esc(money(T.tax, d.currency))}</dd></div>` : ''}<div class="big"><dt>${esc(t('total'))}</dt><dd>${esc(money(T.total, d.currency))}</dd></div>`; }
function vEditor() {
  const d = ED.doc, isQ = ED.kind === 'quote', backHref = ED.isNew ? `#/${isQ ? 'quotes' : 'invoices'}` : `#/${isQ ? 'quotes' : 'invoices'}/${d.id}`;
  return pageHead(ED.isNew ? t(isQ ? 'newQuote' : 'newInvoice') : d.number, '', backHref) + `<form class="editor" data-form="doc" novalidate>
  <section class="card"><div class="f"><span>${esc(t('client'))}</span><div class="row"><select name="clientId" data-ed="clientId" class="grow" aria-label="${esc(t('client'))}"><option value="">${esc(t('chooseClient'))}</option>${S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${c.id === d.clientId ? 'selected' : ''}>${esc(c.name)}${c.company ? ' — ' + esc(c.company) : ''}</option>`).join('')}</select><button type="button" class="btn" data-act="newClient" data-from="editor">${icon('plus')}<span>${esc(t('newClient'))}</span></button></div></div>
  <div class="grid2">${field(t('date'), `<input type="date" data-ed="date" value="${d.date}" required>`)}${field(t(isQ ? 'validUntil' : 'dueDate'), `<input type="date" data-ed="${isQ ? 'validUntil' : 'dueDate'}" value="${isQ ? d.validUntil : d.dueDate}" required>`)}</div></section>
  <section class="card"><h2>${esc(t('lines'))}</h2><div id="lines">${edLines()}</div><div class="row"><button type="button" class="btn" data-act="lineAdd">${icon('plus')}<span>${esc(t('addLine'))}</span></button>${S.items.length ? `<button type="button" class="btn" data-act="pickOpen">${icon('catalog')}<span>${esc(t('fromCatalog'))}</span></button>` : ''}</div></section>
  <section class="card"><div class="grid2">${field(t('discountPct'), `<input type="number" inputmode="decimal" min="0" max="100" step="any" data-ed="discount" value="${d.discount}">`)}${field((d.taxName || t('tax')) + ' (%)', `<input type="number" inputmode="decimal" min="0" max="100" step="any" data-ed="taxRate" value="${d.taxRate}">`)}</div><dl class="tot" id="edtot">${edTotals()}</dl></section>
  <section class="card">${field(t('notes'), `<textarea data-ed="notes" rows="3" maxlength="2000" placeholder="${esc(t('notesPh'))}">${esc(d.notes)}</textarea>`)}</section>
  <div class="savebar"><a class="btn" href="${backHref}">${esc(t('cancel'))}</a><button class="btn primary" type="submit">${icon('check')}<span>${esc(t('save'))}</span></button></div></form>`;
}
function edSyncLine(el) {
  const row = el.closest('.ln'); if (!row || !ED) return; const l = ED.doc.lines[+row.dataset.i]; if (!l) return; const f = el.dataset.f;
  if (f === 'taxable') l.taxable = el.checked; else if (f === 'qty') l.qty = sNum(el.value, 0, 1e7, 0); else if (f === 'price') l.price = sNum(el.value, 0, 1e11, 0); else l[f] = sStr(el.value, f === 'name' ? 160 : 500);
  $('[data-amt]', row).textContent = money(roundC(l.qty * l.price, ED.doc.currency), ED.doc.currency); $('#edtot').innerHTML = edTotals();
}
function edSyncField(el) { const d = ED.doc, k = el.dataset.ed; if (k === 'discount' || k === 'taxRate') d[k] = sNum(el.value, 0, 100, 0); else if (k === 'notes') d.notes = sStr(el.value, 2000); else if (k === 'clientId') d.clientId = findC(el.value) ? el.value : ''; else if (isDate(el.value)) d[k] = el.value; $('#edtot').innerHTML = edTotals(); }
function saveDoc() {
  const d = ED.doc, isQ = ED.kind === 'quote';
  if (!findC(d.clientId)) return toast(t('needClient'), 'err');
  if (d.lines.some(l => !l.name.trim() && (l.price > 0 || l.desc.trim()))) return toast(t('needLine'), 'err');
  d.lines = d.lines.filter(l => l.name.trim()).map(sLine);
  if (!d.lines.length) { d.lines = [sLine({ name: '', qty: 1, price: 0 })]; $('#lines').innerHTML = edLines(); return toast(t('needLine'), 'err'); }
  const end = isQ ? 'validUntil' : 'dueDate'; if (d[end] < d.date) d[end] = d.date;
  const list = isQ ? S.quotes : S.invoices;
  const ex = list.find(x => x.id === d.id), adds = ED.isNew ? !ex : !!(ex && ex.demo); // editing an example makes it a real document
  if (adds && !canAddDoc()) return proOpen('docs');
  if (adds || (ex && ex.clientId !== d.clientId)) { const cl = findC(d.clientId); if (cl && cl.demo && !usedByReal(d.id).has(cl.id) && !canAddClient()) return proOpen('clients'); }
  d.demo = false;
  if (ED.isNew) { const n = nextNumber(ED.kind); d.number = n.num; if (isQ) S.settings.qNext = n.next; else S.settings.iNext = n.next; list.push(d); } else { const ix = list.findIndex(x => x.id === d.id); if (ix < 0) list.push(d); else list[ix] = d; }
  if (!persist(t('saved'))) return;
  const wasNew = ED.isNew, to = `#/${isQ ? 'quotes' : 'invoices'}/${d.id}`; ED = null;
  if (wasNew) { history.replaceState(null, '', to); render(); } else go(to); // Back must not reopen an empty editor
}

/* ---------- clients ---------- */
function owed(clientId) { let s = 0; for (const i of S.invoices) if (i.clientId === clientId && i.currency === S.settings.currency) s += Math.max(0, totals(i).balance); return roundC(s, S.settings.currency); }
function vClients() { return pageHead(t('clients'), `<button class="btn primary" data-act="newClient">${icon('plus')}<span>${esc(t('newClient'))}</span></button>`) + `<div class="tools"><input type="search" data-in="search" value="${esc(UI.search)}" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}"></div><div id="list">${clientsList()}</div>`; }
function clientsList() {
  if (!S.clients.length) return empty(t('noClients'), `<button class="btn primary" data-act="newClient">${esc(t('newClient'))}</button>`);
  const s = UI.search.trim().toLowerCase(), rows = S.clients.filter(c => !s || (c.name + ' ' + c.company + ' ' + c.phone).toLowerCase().includes(s)).sort((a, b) => a.name.localeCompare(b.name));
  return rows.length ? `<ul class="list card">${rows.map(c => { const o = owed(c.id); return `<li class="li"><a class="grow" href="#/clients/${c.id}"><b>${esc(c.name)}</b><span>${esc([c.company, c.phone].filter(Boolean).join(' · '))}</span></a>${o > 0 ? `<div class="amt"><small>${esc(t('owes'))}</small><b>${esc(money(o))}</b></div>` : ''}</li>`; }).join('')}</ul>` : empty(t('noResults'));
}
function vClient(id) {
  const c = findC(id); if (!c) return vClients();
  const docs = [...S.quotes.filter(q => q.clientId === id).map(d => ({ d, k: 'quotes' })), ...S.invoices.filter(i => i.clientId === id).map(d => ({ d, k: 'invoices' }))].sort((a, b) => (a.d.date < b.d.date ? 1 : -1)), o = owed(id);
  return pageHead(c.name, '', '#/clients') + `<div class="actions"><a class="btn primary" href="#/quotes/new?c=${c.id}">${icon('plus')}<span>${esc(t('newQuote'))}</span></a>${c.phone ? `<button class="btn wa" data-act="waClient" data-id="${c.id}">${icon('chat')}<span>WhatsApp</span></button>` : ''}<button class="btn" data-act="editClient" data-id="${c.id}">${icon('edit')}<span>${esc(t('edit'))}</span></button><button class="btn ghost" data-act="askDelete" data-kind="client" data-id="${c.id}">${icon('trash')}<span>${esc(t('del'))}</span></button></div>
  <section class="card info">${[[t('company'), c.company], [t('phone'), c.phone], [t('email'), c.email], [t('taxId'), c.taxId], [t('address'), c.address], [t('notes'), c.notes]].filter(x => x[1]).map(x => `<div><small>${esc(x[0])}</small><span>${esc(x[1])}</span></div>`).join('')}${o > 0 ? `<div><small>${esc(t('owes'))}</small><b class="badtx">${esc(money(o))}</b></div>` : ''}</section>
  <section class="card"><h2>${esc(t('history'))}</h2>${docs.length ? `<ul class="list">${docs.map(x => docRow(x.d, x.k)).join('')}</ul>` : `<p class="muted">${esc(t('emptyQuotes'))}</p>`}</section>`;
}
function clientForm(c, from) { c = c || { id: '', name: '', company: '', phone: '', email: '', taxId: '', address: '', notes: '' }; return `<h2>${esc(c.id ? t('edit') : t('newClient'))}</h2><form data-form="client" novalidate><input type="hidden" name="id" value="${c.id}"><input type="hidden" name="from" value="${esc(from || '')}">${field(t('name'), inp('name', c.name, 'required maxlength="80" autocomplete="off"'))}${field(t('phone'), inp('phone', c.phone, 'type="tel" maxlength="30" autocomplete="off"'))}${field(t('company') + ' (' + t('optional') + ')', inp('company', c.company, 'maxlength="80"'))}${field(t('email') + ' (' + t('optional') + ')', inp('email', c.email, 'type="email" maxlength="80"'))}${field(t('taxId') + ' (' + t('optional') + ')', inp('taxId', c.taxId, 'maxlength="40"'))}${field(t('address') + ' (' + t('optional') + ')', inp('address', c.address, 'maxlength="200"'))}${field(t('notes') + ' (' + t('optional') + ')', `<textarea name="notes" rows="2" maxlength="1000">${esc(c.notes)}</textarea>`)}<div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`; }

/* ---------- catalog ---------- */
function vCatalog() { return pageHead(t('catalog'), `<button class="btn primary" data-act="newItem">${icon('plus')}<span>${esc(t('newItem'))}</span></button>`) + (S.items.length ? `<ul class="list card">${S.items.slice().sort((a, b) => a.name.localeCompare(b.name)).map(i => `<li class="li"><button class="grow linkish" data-act="editItem" data-id="${i.id}"><b>${esc(i.name)}</b><span>${esc(i.desc)}</span></button><div class="amt"><b>${esc(money(i.price))}</b>${i.unit ? `<small>/ ${esc(i.unit)}</small>` : ''}</div></li>`).join('')}</ul>` : empty(t('noItems'), `<button class="btn primary" data-act="newItem">${esc(t('newItem'))}</button>`)); }
function itemForm(i) { i = i || { id: '', name: '', desc: '', price: '', unit: '', taxable: true }; return `<h2>${esc(i.id ? t('edit') : t('newItem'))}</h2><form data-form="item" novalidate><input type="hidden" name="id" value="${i.id}">${field(t('name'), inp('name', i.name, 'required maxlength="160" autocomplete="off"'))}${field(t('description') + ' (' + t('optional') + ')', inp('desc', i.desc, 'maxlength="500"'))}<div class="grid2">${field(t('price'), inp('price', i.price, 'type="number" inputmode="decimal" min="0" step="any" required'))}${field(t('unit') + ' (' + t('optional') + ')', inp('unit', i.unit, `maxlength="20" placeholder="${esc(t('unitPh'))}"`))}</div><label class="ck"><input type="checkbox" name="taxable" ${i.taxable ? 'checked' : ''}><span>${esc(t('taxable'))}</span></label><div class="row end">${i.id ? `<button type="button" class="btn ghost" data-act="askDelete" data-kind="item" data-id="${i.id}">${esc(t('del'))}</button>` : ''}<button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`; }

/* ---------- receivables ---------- */
function vReceivables() {
  const td = today(), cur = S.settings.currency, by = new Map(), ag = [0, 0, 0, 0]; let total = 0;
  for (const i of S.invoices) { if (i.currency !== cur) continue; const bal = totals(i).balance; if (bal <= 0) continue; total += bal; const late = diffDays(i.dueDate, td); ag[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3] += bal; const g = by.get(i.clientId) || { sum: 0, inv: [] }; g.sum += bal; g.inv.push(i); by.set(i.clientId, g); }
  if (!by.size) return pageHead(t('receivables')) + empty(t('noDebt'));
  const groups = [...by.entries()].sort((a, b) => b[1].sum - a[1].sum), labels = ['agCurrent', 'ag30', 'ag60', 'ag90'], cls = ['ok', 'warn', 'warn2', 'bad'];
  return pageHead(t('receivables')) + `<section class="card"><div class="bigsum"><span>${esc(t('toCollect'))}</span><b>${esc(money(roundC(total, cur), cur))}</b></div><div class="aging" role="img" aria-label="${esc(t('receivables'))}">${ag.map((v, k) => (v > 0 ? `<i class="${cls[k]}" style="flex:${Math.max(v / total, 0.04)}"></i>` : '')).join('')}</div><ul class="legend">${ag.map((v, k) => `<li><i class="${cls[k]}"></i><span>${esc(t(labels[k]))}</span><b>${esc(money(roundC(v, cur), cur))}</b></li>`).join('')}</ul></section>
  <h2 class="sec">${esc(t('whoOwes'))}</h2>${groups.map(([cid, g]) => { const c = findC(cid); return `<section class="card"><div class="li head"><a class="grow" href="#/clients/${esc(cid)}"><b>${esc(c ? c.name : '—')}</b><span>${esc(t('nInvoices', { n: g.inv.length }))}</span></a><div class="amt"><b class="badtx">${esc(money(roundC(g.sum, cur), cur))}</b></div></div><ul class="list">${g.inv.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).map(i => { const late = diffDays(i.dueDate, td); return `<li class="li"><a class="grow" href="#/invoices/${i.id}"><b>${esc(i.number)} · ${esc(money(totals(i).balance, cur))}</b><span class="pill ${late > 0 ? 'bad' : 'inf'}">${esc(late > 0 ? t('overdueBy', { n: late }) : late === 0 ? t('dueToday') : t('dueIn', { n: -late }))}</span></a><div class="row"><button class="btn sm primary" data-act="payOpen" data-id="${i.id}">${esc(t('addPayment'))}</button><button class="btn sm wa" data-act="sendOpen" data-kind="invoice" data-id="${i.id}" data-mode="remind" aria-label="${esc(t('remind'))}">${icon('chat')}</button></div></li>`; }).join('')}</ul></section>`; }).join('')}`;
}

/* ---------- settings ---------- */
function vSettings() {
  const s = S.settings, b = s.biz, sel = (k, opts, val) => `<select data-set="${k}">${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === val ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`, si = (k, val, attrs) => `<input data-set="${k}" value="${esc(val)}" ${attrs || ''}>`;
  const curs = CURRENCIES.includes(s.currency) ? CURRENCIES : [s.currency, ...CURRENCIES];
  const planCard = gated() || licensed() ? `<section class="card pro"><h2>Clavuno Pro</h2><p class="muted">${esc(licensed() ? t('licActive') : planUse())}</p><div class="row"><a class="btn ${licensed() ? '' : 'primary'}" href="#/pro">${esc(licensed() ? 'Clavuno Pro' : t('proTitle'))}</a></div></section>` : '';
  const logoBtn = gated() && !licensed() ? `<button class="btn" data-act="proOpen" data-why="logo"><span>${esc(t('uploadLogo'))}</span><span class="pill warn">Pro</span></button>` : `<label class="btn"><input type="file" accept="image/png,image/jpeg,image/webp" data-in="logo" hidden><span>${esc(t('uploadLogo'))}</span></label>`;
  return pageHead(t('settings')) + planCard + `<section class="card"><h2>${esc(t('language'))}</h2><div class="chips">${LANGS.map(l => `<button class="chip ${l[0] === s.lang ? 'on' : ''}" data-act="setLang" data-v="${l[0]}" lang="${l[0]}">${esc(l[1])}</button>`).join('')}</div></section>
  <section class="card"><h2>${esc(t('business'))}</h2>${field(t('bizName'), si('biz.name', b.name, 'maxlength="80"'))}<div class="f"><span>${esc(t('logo'))}</span><div class="row">${b.logo ? `<img src="${esc(b.logo)}" alt="" class="logo-prev">` : ''}${logoBtn}${b.logo ? `<button class="btn ghost" data-act="logoRemove">${esc(t('removeLogo'))}</button>` : ''}</div></div><div class="grid2">${field(t('taxId'), si('biz.taxId', b.taxId, 'maxlength="40"'))}${field(t('phone'), si('biz.phone', b.phone, 'type="tel" maxlength="30"'))}</div>${field(t('email'), si('biz.email', b.email, 'type="email" maxlength="80"'))}${field(t('address'), si('biz.address', b.address, 'maxlength="200"'))}</section>
  <section class="card"><h2>${esc(t('currency'))} · ${esc(t('tax'))}</h2><div class="grid2">${field(t('currency'), sel('currency', curs.map(c => [c, c]), s.currency))}${field(t('dial'), si('dial', s.dial, 'inputmode="numeric" maxlength="4"'), t('dialHint'))}${field(t('taxName'), si('taxName', s.taxName, `maxlength="20" placeholder="${esc(t('taxNamePh'))}"`))}${field(t('taxPct'), si('taxRate', s.taxRate, 'type="number" inputmode="decimal" min="0" max="100" step="any"'))}</div></section>
  <section class="card"><h2>${esc(t('defaults'))}</h2><div class="grid2">${field(t('validDays'), si('validDays', s.validDays, 'type="number" inputmode="numeric" min="1" max="365"'))}${field(t('dueDays'), si('dueDays', s.dueDays, 'type="number" inputmode="numeric" min="0" max="365"'))}${field(t('followDays'), si('followDays', s.followDays, 'type="number" inputmode="numeric" min="1" max="60"'))}</div>${field(t('terms'), `<textarea data-set="terms" rows="2" maxlength="500" placeholder="${esc(t('termsPh'))}">${esc(s.terms)}</textarea>`)}</section>
  <section class="card"><h2>${esc(t('numbering'))}</h2><div class="grid2">${field(t('qPrefix'), si('qPrefix', s.qPrefix, 'maxlength="10"'))}${field(t('nextNum'), si('qNext', s.qNext, 'type="number" inputmode="numeric" min="1"'))}${field(t('iPrefix'), si('iPrefix', s.iPrefix, 'maxlength="10"'))}${field(t('nextNum'), si('iNext', s.iNext, 'type="number" inputmode="numeric" min="1"'))}</div></section>
  <section class="card"><h2>${esc(t('appearance'))}</h2><div class="chips">${[['auto', 'thAuto'], ['light', 'thLight'], ['dark', 'thDark']].map(x => `<button class="chip ${s.theme === x[0] ? 'on' : ''}" data-act="setTheme" data-v="${x[0]}">${esc(t(x[1]))}</button>`).join('')}</div><h2>${esc(t('notifications'))}</h2><label class="ck"><input type="checkbox" data-in="notify" ${s.notify ? 'checked' : ''}><span>${esc(t('notifyOn'))}</span></label></section>
  <section class="card"><h2>${esc(t('backup'))}</h2><p class="muted">${esc(t('backupHint'))}</p><div class="row"><button class="btn" data-act="exportData">${icon('dl')}<span>${esc(t('exportData'))}</span></button><label class="btn"><input type="file" accept="application/json,.json" data-in="import" hidden><span>${esc(t('importData'))}</span></label></div><div class="row"><button class="btn" data-act="${hasDemo() ? 'demoRemove' : 'demoLoad'}">${esc(t(hasDemo() ? 'demoRemove' : 'demoLoad'))}</button><button class="btn ghost" data-act="askWipe">${esc(t('wipe'))}</button></div></section>
  ${installEvt ? `<section class="card"><button class="btn primary" data-act="install">${icon('dl')}<span>${esc(t('install'))}</span></button></section>` : _isIos() && !isStandalone() ? `<section class="card"><p class="muted">${esc(t('installIos'))}</p></section>` : ''}<p class="foot">Clavuno · Arthur Labs</p>`;
}
function _isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
const isIosOld = () => /iphone|ipad|ipod/i.test(navigator.userAgent), isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function vMore() { return pageHead(t('more')) + `<ul class="list card">${['catalog', 'receivables', 'settings'].map(n => `<li class="li"><a class="grow rowlink" href="#/${n}">${icon(n)}<b>${esc(t(n))}</b></a>${icon('chev')}</li>`).join('')}${gated() || licensed() ? `<li class="li"><a class="grow rowlink" href="#/pro">${icon('check')}<b>Clavuno Pro</b></a>${icon('chev')}</li>` : ''}</ul>${installEvt ? `<button class="btn primary" data-act="install">${icon('dl')}<span>${esc(t('install'))}</span></button>` : ''}`; }

/* ---------- welcome ---------- */
function vWelcome() {
  const lg = S.settings.lang || detectLang(), reg = detectRegion(), R = (reg && REGIONS[reg]) || ['USD', '', 0, ''];
  const cur = S.settings._wc || R[0];
  return `<div class="welcome"><img src="icons/icon.svg" alt="" width="64" height="64"><h1>${esc(t('welcomeTitle'))}</h1><p>${esc(t('welcomeSub'))}</p>${installBanner()}<div class="chips" role="group" aria-label="${esc(t('language'))}">${LANGS.map(l => `<button class="chip ${l[0] === lg ? 'on' : ''}" data-act="welcomeLang" data-v="${l[0]}" lang="${l[0]}">${esc(l[1])}</button>`).join('')}</div>
  <form data-form="welcome" novalidate class="card">${field(t('bizName'), inp('biz', S.settings.biz.name, 'maxlength="80" autocomplete="organization"'))}<div class="grid2">${field(t('currency'), `<select name="currency">${CURRENCIES.map(c => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}${field(t('dial'), inp('dial', R[3], 'inputmode="numeric" maxlength="4"'))}${field(t('taxName'), inp('taxName', R[1], `maxlength="20" placeholder="${esc(t('taxNamePh'))}"`))}${field(t('taxPct'), inp('taxRate', R[2], 'type="number" inputmode="decimal" min="0" max="100" step="any"'))}</div><input type="hidden" name="region" value="${reg || ''}"><button class="btn primary big" type="submit">${esc(t('start'))}</button><button class="btn" type="submit" name="demo" value="1">${esc(t('tryDemo'))}</button></form><small>${esc(t('backupHint'))}</small></div>`;
}

/* ---------- router ---------- */
function render() {
  applyTheme();
  const app = $('#app'), view = $('#view');
  if (!S.settings.onboarded) { if (!S.settings.lang) S.settings.lang = detectLang(); applyTheme(); app.classList.add('bare'); view.innerHTML = vWelcome(); return; }
  app.classList.remove('bare');
  const raw = location.hash.replace(/^#\/?/, ''), qi = raw.indexOf('?'), path = (qi < 0 ? raw : raw.slice(0, qi)).split('/').filter(Boolean), qs = new URLSearchParams(qi < 0 ? '' : raw.slice(qi + 1));
  const sec = path[0] || 'home', a = path[1], b = path[2];
  let html, active = sec, focus = false;
  if (sec === 'quotes' || sec === 'invoices') {
    const kind = sec === 'quotes' ? 'quote' : 'invoice';
    if (a === 'new' && !canAddDoc() && !(ED && ED.isNew && ED.kind === kind)) { history.replaceState(null, '', '#/' + sec); ED = null; html = vDocs(sec); pendingPro = 'docs'; }
    else if (a === 'new' || b === 'edit') { const id = a === 'new' ? null : a; if (!ED || ED.kind !== kind || (id ? ED.doc.id !== id || ED.isNew : !ED.isNew)) { if (!startEditor(kind, id, qs.get('c'))) { ED = null; return go('#/' + sec + (id ? '/' + id : '')); } } html = vEditor(); focus = true; }
    else { ED = null; html = a ? (kind === 'quote' ? vQuote(a) : vInvoice(a)) : vDocs(sec); }
  } else {
    if (sec !== 'pro') ED = null; // keep the draft while the key is typed
    html = sec === 'clients' ? (a ? vClient(a) : vClients()) : sec === 'catalog' ? vCatalog() : sec === 'receivables' ? vReceivables() : sec === 'settings' ? vSettings() : sec === 'more' ? vMore() : sec === 'pro' ? vPro() : vHome();
    if (sec === 'pro') active = 'settings'; else if (!NAV.includes(sec) && sec !== 'more') active = 'home';
  }
  shell(active, focus); view.innerHTML = html; badge();
  if (pendingPro) { const w = pendingPro; pendingPro = null; proOpen(w); }
}
let lastSec = '';
window.addEventListener('hashchange', () => { const sec = location.hash.split('/')[1] || ''; if (sec !== lastSec) { UI.search = ''; lastSec = sec; } closeModal(); render(); window.scrollTo(0, 0); });

/* ---------- send ---------- */
function sendMessage(kind, d, mode) { const T = totals(d), v = { client: clientName(d), number: d.number, biz: S.settings.biz.name || 'Clavuno', total: money(T.total, d.currency), balance: money(T.balance, d.currency), date: fmtDate(kind === 'quote' ? d.validUntil : d.dueDate) }; return t(mode === 'follow' ? 'msgFollow' : mode === 'remind' ? 'msgRemind' : kind === 'quote' ? 'msgQuote' : 'msgInvoice', v); }
function sendOpen(kind, id, mode) {
  const d = kind === 'quote' ? findQ(id) : findI(id); if (!d) return; const c = clientOf(d), msg = sendMessage(kind, d, mode);
  SEND = { kind, id, mode, msg, phone: c ? waPhone(c.phone) : '', file: null };
  openModal(`<h2>${esc(t(mode === 'follow' ? 'followUp' : mode === 'remind' ? 'remind' : 'send'))} · ${esc(d.number)}</h2><p class="msg">${esc(msg)}</p><div class="stack"><button class="opt wa" data-act="waPdf" disabled>${icon('share')}<span><b>${esc(t('waPdf'))}</b><small id="pdfhint">${esc(t('preparing'))}</small></span></button><button class="opt wa" data-act="waMsg">${icon('chat')}<span><b>${esc(t('waMsg'))}</b><small>${esc(c && c.phone ? t('waMsgHint') : t('needPhone'))}</small></span></button><button class="opt" data-act="pdfDownload" disabled>${icon('dl')}<span><b>${esc(t('downloadPdf'))}</b></span></button></div><div class="row end"><button class="btn" data-act="closeModal">${esc(t('close'))}</button></div>`);
  const ctx = SEND;
  buildDocPdf(d, kind).then(file => { if (SEND !== ctx) return; ctx.file = file; ctx.canShare = !!(navigator.canShare && navigator.canShare({ files: [file] })); document.querySelectorAll('#modal [data-act="waPdf"],#modal [data-act="pdfDownload"]').forEach(b => { b.disabled = false; }); const h = $('#pdfhint'); if (h) h.textContent = t(ctx.canShare ? 'waPdfHint' : 'waPdfHintDl'); }).catch(() => { if (SEND === ctx) { const h = $('#pdfhint'); if (h) h.textContent = t('errPdf'); } });
}
const waUrl = () => 'https://wa.me/' + (SEND.phone || '') + '?text=' + encodeURIComponent(SEND.msg);
function askSent() { const ctx = SEND; if (!ctx) return; const m = $('#modal .sheet'); if (!m) return; m.innerHTML = `<h2>${esc(t('sentQ'))}</h2><div class="row end"><button class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary" data-act="sentYes">${esc(t('sentYes'))}</button></div>`; }
function applySent() {
  const ctx = SEND; if (!ctx) return; const td = today();
  if (ctx.kind === 'quote') { const q = findQ(ctx.id); if (q) { if (ctx.mode === 'follow') { q.lastFollowAt = td; q.followCount++; } else { if (q.status === 'draft') q.status = 'sent'; q.lastFollowAt = q.sentAt ? td : ''; if (!q.sentAt) q.sentAt = td; } } }
  else { const i = findI(ctx.id); if (i) { if (ctx.mode === 'remind') i.lastRemindAt = td; else if (!i.sentAt) i.sentAt = td; } }
  closeModal(); persist(t(ctx.mode === 'follow' || ctx.mode === 'remind' ? 'followSaved' : 'sentOk')); render();
}

/* ---------- demo data ---------- */
function demoLoad() {
  const s = S.settings, td = today(), k = ({ DOP: 60, MXN: 18, COP: 4000, ARS: 1000, CLP: 900, PEN: 4, BRL: 5, JPY: 150, PYG: 7000, CRC: 500, INR: 80, HTG: 130, XOF: 600, UYU: 40, VES: 40, GTQ: 8, HNL: 25, NIO: 36, BOB: 7, ZAR: 18, MAD: 10, CNY: 7 })[s.currency] || 1, P = n => roundC(n * k, s.currency);
  const names = DEMO_ITEMS[lang()] || DEMO_ITEMS.en, prices = [40, 25, 480, 150, 90];
  const cs = [['María Pérez', 'Colmado La Esquina', '809-555-0101'], ['Carlos Gómez', '', '809-555-0102'], ['Ana Rodríguez', 'Clínica Dental Sonrisa', '809-555-0103']].map(x => ({ id: uid(), name: x[0], company: x[1], phone: x[2], email: '', taxId: '', address: '', notes: '', created: td, demo: true }));
  const its = names.map((n, i) => ({ id: uid(), name: n, desc: '', price: P(prices[i]), unit: '', taxable: true, demo: true }));
  const L = (i, q) => sLine({ name: its[i].name, qty: q, price: its[i].price });
  const base = (c, date, lines) => ({ id: uid(), number: '', clientId: cs[c].id, date, lines, discount: 0, taxRate: s.taxRate, taxName: s.taxName, currency: s.currency, notes: '', sentAt: date, demo: true });
  const mkQ = (c, ago, lines, status, extra) => { const q = Object.assign(base(c, addDays(td, -ago), lines), { validUntil: addDays(td, s.validDays - ago), status, lastFollowAt: '', followCount: 0, invoiceId: '' }, extra || {}); q.number = 'DEMO-C' + (S.quotes.filter(x => x.demo).length + 1); S.quotes.push(q); return q; };
  const mkI = (c, ago, due, lines, pays, q) => { const i = Object.assign(base(c, addDays(td, -ago), lines), { quoteId: q ? q.id : '', dueDate: addDays(td, due), lastRemindAt: '', payments: pays.map(p => ({ id: uid(), date: addDays(td, -p[1]), amount: P(p[0]), method: 'transfer', note: '' })) }); i.number = 'DEMO-F' + (S.invoices.filter(x => x.demo).length + 1); S.invoices.push(i); if (q) q.invoiceId = i.id; return i; };
  S.clients.push(...cs); S.items.push(...its);
  mkQ(0, Math.max(4, s.followDays + 1), [L(0, 1), L(2, 1)], 'sent');
  mkQ(1, 0, [L(1, 6), L(3, 1)], 'draft', { sentAt: '' });
  const qa = mkQ(2, 12, [L(2, 1), L(3, 2)], 'accepted');
  mkI(2, 10, 5, qa.lines.map(sLine), [[300, 8]], qa);
  mkI(0, 40, -9, [L(4, 3)], [], null);
  mkI(1, 6, 9, [L(1, 4)], [[100, 2]], null);
  persist(); render();
}
function demoRemove() { const used = new Set([...S.quotes, ...S.invoices].filter(d => !d.demo).map(d => d.clientId)); S.clients.forEach(c => { if (used.has(c.id)) c.demo = false; }); for (const k of ['clients', 'items', 'quotes', 'invoices']) S[k] = S[k].filter(x => !x.demo); S.quotes.forEach(q => { if (q.invoiceId && !findI(q.invoiceId)) q.invoiceId = ''; }); S.invoices.forEach(i => { if (i.quoteId && !findQ(i.quoteId)) i.quoteId = ''; }); closeModal(); persist(t('deleted')); render(); }

/* ---------- actions ---------- */
const ACT = {
  closeModal, demoLoad, demoRemove,
  proOpen(el) { proOpen(el.dataset.why || ''); },
  buyPro() { if (gated()) openUrl(CFG.CHECKOUT_URL); },
  licRemoveAsk() { confirmBox(t('licRemove'), t('del'), 'licRemove', true); },
  licRemove() { S.plan.license = null; closeModal(); persist(t('saved')); render(); },
  installHide() { UI.hideInstall = true; render(); },
  filter(el) { UI[el.dataset.k] = el.dataset.v; render(); },
  install() { if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); } },
  newClient(el) { if (!canAddClient()) return proOpen('clients'); openModal(clientForm(null, el.dataset.from)); },
  editClient(el) { openModal(clientForm(findC(el.dataset.id))); },
  waClient(el) { const c = findC(el.dataset.id); if (c) openUrl('https://wa.me/' + waPhone(c.phone)); },
  newItem() { openModal(itemForm()); },
  editItem(el) { const i = S.items.find(x => x.id === el.dataset.id); if (i) openModal(itemForm(i)); },
  lineAdd() { ED.doc.lines.push(sLine({ name: '', qty: 1, price: 0 })); $('#lines').innerHTML = edLines(); const ins = document.querySelectorAll('#lines [data-f="name"]'); ins[ins.length - 1].focus(); },
  lineDel(el) { ED.doc.lines.splice(+el.dataset.i, 1); if (!ED.doc.lines.length) ED.doc.lines.push(sLine({ name: '', qty: 1, price: 0 })); $('#lines').innerHTML = edLines(); $('#edtot').innerHTML = edTotals(); },
  pickOpen() { openModal(`<h2>${esc(t('fromCatalog'))}</h2><ul class="list">${S.items.slice().sort((a, b) => a.name.localeCompare(b.name)).map(i => `<li class="li"><button class="grow linkish" data-act="pick" data-id="${i.id}"><b>${esc(i.name)}</b><span>${esc(i.desc)}</span></button><div class="amt"><b>${esc(money(i.price))}</b></div></li>`).join('')}</ul><div class="row end"><button class="btn" data-act="closeModal">${esc(t('close'))}</button></div>`); },
  pick(el) { const i = S.items.find(x => x.id === el.dataset.id); if (!i || !ED) return; const ls = ED.doc.lines, nl = sLine({ name: i.name, desc: i.desc, qty: 1, price: i.price, taxable: i.taxable }); const last = ls[ls.length - 1]; if (last && !last.name.trim() && !last.price) ls[ls.length - 1] = nl; else ls.push(nl); closeModal(); $('#lines').innerHTML = edLines(); $('#edtot').innerHTML = edTotals(); },
  sendOpen(el) { sendOpen(el.dataset.kind, el.dataset.id, el.dataset.mode || 'send'); },
  async waPdf() { const ctx = SEND; if (!ctx || !ctx.file) return; if (ctx.canShare) { try { await navigator.share({ files: [ctx.file], text: ctx.msg, title: ctx.file.name }); if (SEND === ctx) applySent(); } catch (e) { /* the person closed the share sheet */ } } else { download(ctx.file, ctx.file.name); openUrl(waUrl()); toast(t('pdfDownloaded')); askSent(); } },
  waMsg() { if (!SEND) return; openUrl(waUrl()); askSent(); },
  pdfDownload() { if (SEND && SEND.file) download(SEND.file, SEND.file.name); },
  sentYes: applySent,
  markSent(el) { const q = findQ(el.dataset.id); if (!q) return; q.status = 'sent'; q.sentAt = q.sentAt || today(); persist(t('sentOk')); render(); },
  followDone(el) { const q = findQ(el.dataset.id); if (!q) return; q.lastFollowAt = today(); q.followCount++; persist(t('followSaved')); render(); },
  reject(el) { const q = findQ(el.dataset.id); if (!q) return; q.status = 'rejected'; persist(t('saved')); render(); },
  reopen(el) { const q = findQ(el.dataset.id); if (!q) return; q.status = q.sentAt ? 'sent' : 'draft'; if (q.validUntil < today()) q.validUntil = addDays(today(), S.settings.validDays); persist(t('saved')); render(); },
  accept(el) {
    const q = findQ(el.dataset.id); if (!q || q.status === 'accepted') return; const td = today(), n = nextNumber('invoice');
    const inv = { id: uid(), number: n.num, clientId: q.clientId, quoteId: q.id, date: td, dueDate: addDays(td, S.settings.dueDays), lines: q.lines.map(sLine), discount: q.discount, taxRate: q.taxRate, taxName: q.taxName, currency: q.currency, notes: q.notes, sentAt: '', lastRemindAt: '', payments: [], demo: q.demo };
    S.invoices.push(inv); S.settings.iNext = n.next; q.status = 'accepted'; q.invoiceId = inv.id; if (!q.sentAt) q.sentAt = td;
    if (persist(t('invoiceCreated'))) go('#/invoices/' + inv.id);
  },
  duplicate(el) { const q = findQ(el.dataset.id); if (!q) return; if (!canAddDoc()) return proOpen('docs'); const td = today(), n = nextNumber('quote'), c = JSON.parse(JSON.stringify(q)); Object.assign(c, { id: uid(), number: n.num, date: td, validUntil: addDays(td, S.settings.validDays), status: 'draft', sentAt: '', lastFollowAt: '', followCount: 0, invoiceId: '', demo: false }); S.quotes.push(c); S.settings.qNext = n.next; if (persist(t('saved'))) go('#/quotes/' + c.id + '/edit'); },
  askDelete(el) { const k = el.dataset.kind, id = el.dataset.id; if (k === 'client' && (S.quotes.some(q => q.clientId === id) || S.invoices.some(i => i.clientId === id))) return toast(t('clientHasDocs'), 'err'); openModal(`<h2>${esc(t('confirmDelete'))}</h2><div class="row end"><button class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn danger" data-act="doDelete" data-kind="${esc(k)}" data-id="${esc(id)}">${esc(t('del'))}</button></div>`); },
  doDelete(el) {
    const k = el.dataset.kind, id = el.dataset.id; let to = null;
    if (k === 'quote') { S.quotes = S.quotes.filter(q => q.id !== id); S.invoices.forEach(i => { if (i.quoteId === id) i.quoteId = ''; }); to = '#/quotes'; }
    else if (k === 'invoice') { S.invoices = S.invoices.filter(i => i.id !== id); S.quotes.forEach(q => { if (q.invoiceId === id) { q.invoiceId = ''; q.status = 'sent'; } }); to = '#/invoices'; }
    else if (k === 'client') { if (S.quotes.some(q => q.clientId === id) || S.invoices.some(i => i.clientId === id)) return; S.clients = S.clients.filter(c => c.id !== id); to = '#/clients'; }
    else if (k === 'item') S.items = S.items.filter(i => i.id !== id);
    closeModal(); persist(t('deleted')); if (to) go(to); else render();
  },
  payOpen(el) { const i = findI(el.dataset.id); if (!i) return; const T = totals(i); openModal(`<h2>${esc(t('addPayment'))} · ${esc(i.number)}</h2><p class="muted">${esc(t('balance'))}: <b>${esc(money(T.balance, i.currency))}</b></p><form data-form="pay" novalidate><input type="hidden" name="id" value="${i.id}"><div class="grid2">${field(t('payAmount'), inp('amount', T.balance, 'type="number" inputmode="decimal" min="0" step="any" required'))}${field(t('payDate'), inp('date', today(), 'type="date" required'))}</div>${field(t('payMethod'), `<select name="method">${PAY_METHODS.map(m => `<option value="${m}">${esc(t('m' + m[0].toUpperCase() + m.slice(1)))}</option>`).join('')}</select>`)}${field(t('note') + ' (' + t('optional') + ')', inp('note', '', 'maxlength="200"'))}<div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`); },
  payDelete(el) { openModal(`<h2>${esc(t('confirmDelete'))}</h2><div class="row end"><button class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn danger" data-act="payDeleteDo" data-id="${esc(el.dataset.id)}" data-pid="${esc(el.dataset.pid)}">${esc(t('del'))}</button></div>`); },
  payDeleteDo(el) { const i = findI(el.dataset.id); if (!i) return; i.payments = i.payments.filter(p => p.id !== el.dataset.pid); closeModal(); persist(t('deleted')); render(); },
  setLang(el) { const s = S.settings; if (!LANGS.some(l => l[0] === el.dataset.v)) return; s.lang = el.dataset.v; const m = /-([A-Za-z]{2})$/.exec(s.locale || ''); s.locale = localeFor(s.lang, m ? m[1].toUpperCase() : detectRegion()); for (const k in _nf) delete _nf[k]; persist(); render(); },
  welcomeLang(el) { if (!LANGS.some(l => l[0] === el.dataset.v)) return; const f = $('form[data-form="welcome"]'); if (f) { S.settings.biz.name = sStr(f.biz.value, 80); S.settings._wc = f.currency.value; } S.settings.lang = el.dataset.v; render(); },
  setTheme(el) { if (['auto', 'light', 'dark'].includes(el.dataset.v)) { S.settings.theme = el.dataset.v; persist(); render(); } },
  logoRemove() { S.settings.biz.logo = ''; persist(t('saved')); render(); },
  exportData() { download(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), 'clavuno-' + today() + '.json'); },
  askWipe() { confirmBox(t('wipeConfirm'), t('wipe'), 'doWipe', true); },
  doWipe() { try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ } const lic = S.plan.license; S = defaults(); if (lic) { S.plan.license = lic; save(); } UI.fq = UI.fi = 'all'; UI.search = ''; closeModal(); location.hash = '#/'; render(); },
  doImport() { if (!ACT._pending) return; const keep = licensed() ? S.plan.license : null; S = ACT._pending; ACT._pending = null; for (const k in _nf) delete _nf[k]; closeModal(); persist(t('imported')); render(); checkLicense().then(ok => { if (!ok && keep && !S.plan.license) { S.plan.license = keep; save(); } render(); }); } // a backup never takes Pro away from this device
};
const FORMS = {
  welcome(f, ev) {
    const s = S.settings, lg = s.lang || detectLang(), reg = /^[A-Z]{2}$/.test(f.region.value) ? f.region.value : null;
    s.lang = lg; s.locale = localeFor(lg, reg); s.biz.name = sStr(f.biz.value.trim(), 80); s.currency = validCurrency(f.currency.value) ? f.currency.value : 'USD'; s.dial = sStr(f.dial.value, 4).replace(/\D/g, ''); s.taxName = sStr(f.taxName.value.trim(), 20); s.taxRate = sNum(f.taxRate.value, 0, 100, 0); s.qPrefix = t('qPre'); s.iPrefix = t('iPre'); s.onboarded = true; delete s._wc;
    const demo = ev.submitter && ev.submitter.name === 'demo'; persist(); if (demo) demoLoad(); else render();
  },
  client(f) {
    const name = f.name.value.trim(); if (!name) return toast(t('needName'), 'err');
    const data = { name: sStr(name, 80), company: sStr(f.company.value.trim(), 80), phone: sStr(f.phone.value.trim(), 30), email: sStr(f.email.value.trim(), 80), taxId: sStr(f.taxId.value.trim(), 40), address: sStr(f.address.value.trim(), 200), notes: sStr(f.notes.value.trim(), 1000) };
    let c = f.id.value && findC(f.id.value); if ((!c || (c.demo && !usedByReal().has(c.id))) && !canAddClient()) return proOpen('clients'); if (c) Object.assign(c, data, { demo: false }); else { c = Object.assign({ id: uid(), created: today(), demo: false }, data); S.clients.push(c); }
    const from = f.from.value; closeModal(); if (!persist(t('saved'))) return; if (from === 'editor' && ED) { ED.doc.clientId = c.id; } render();
  },
  item(f) { const name = f.name.value.trim(); if (!name) return toast(t('needName'), 'err'); const data = { name: sStr(name, 160), desc: sStr(f.desc.value.trim(), 500), price: sNum(f.price.value, 0, 1e11, 0), unit: sStr(f.unit.value.trim(), 20), taxable: f.taxable.checked }; const i = f.id.value && S.items.find(x => x.id === f.id.value); if (i) Object.assign(i, data); else S.items.push(Object.assign({ id: uid(), demo: false }, data)); closeModal(); persist(t('saved')); render(); },
  pay(f) { const i = findI(f.id.value); if (!i) return; const T = totals(i), amt = roundC(sNum(f.amount.value, 0, 1e12, 0), i.currency); if (!(amt > 0)) return toast(t('badAmount'), 'err'); if (amt > T.balance) return toast(t('overpay'), 'err'); i.payments.push({ id: uid(), date: sDate(f.date.value, today()) > today() ? today() : sDate(f.date.value, today()), amount: amt, method: PAY_METHODS.includes(f.method.value) ? f.method.value : 'other', note: sStr(f.note.value.trim(), 200) }); closeModal(); persist(t('paymentSaved')); render(); },
  async license(f) {
    let key = null; try { key = await licVerify(f.key.value); } catch (e) { /* no crypto on this page */ }
    if (!key) return toast(t('licBad'), 'err');
    S.plan.license = key; if (!persist(t('licOk'))) return; if (ED) go('#/' + (ED.kind === 'quote' ? 'quotes' : 'invoices') + (ED.isNew ? '/new' : '/' + ED.doc.id + '/edit')); else render();
  },
  doc() { saveDoc(); }
};

/* ---------- events ---------- */
document.addEventListener('click', ev => {
  const nl = ev.target.closest('a[href]'); if (nl && /^#\/(quotes|invoices)\/new/.test(nl.getAttribute('href')) && !canAddDoc()) { ev.preventDefault(); return proOpen('docs'); }
  const el = ev.target.closest('[data-act]'); if (el) { if (el.disabled) return; const fn = ACT[el.dataset.act]; if (typeof fn === 'function') fn(el, ev); return; } if (ev.target.id === 'modal' && downOnBackdrop) closeModal(); });
let downOnBackdrop = false;
document.addEventListener('pointerdown', ev => { downOnBackdrop = ev.target.id === 'modal'; });
document.addEventListener('submit', ev => { const f = ev.target.closest('form[data-form]'); if (!f) return; ev.preventDefault(); const fn = FORMS[f.dataset.form]; if (fn) fn(f, ev); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#modal').hidden) closeModal(); if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('.editor input')) ev.preventDefault(); });
document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.f && ED) return edSyncLine(el);
  if (el.dataset.ed && ED) return edSyncField(el);
  if (el.dataset.in === 'search') { UI.search = el.value; const sec = location.hash.split('/')[1] || ''; const l = $('#list'); if (l) l.innerHTML = sec === 'clients' ? clientsList() : docsList(sec === 'invoices' ? 'invoices' : 'quotes'); }
});
document.addEventListener('change', ev => {
  const el = ev.target, s = S.settings;
  if (el.dataset.f && ED) return edSyncLine(el);
  if (el.dataset.set) {
    const k = el.dataset.set, v = el.value;
    if (k.startsWith('biz.')) s.biz[k.slice(4)] = sStr(v.trim(), k === 'biz.address' ? 200 : 80);
    else if (k === 'currency') { if (S.quotes.length || S.invoices.length || S.items.length) { el.value = s.currency; return toast(t('curLocked'), 'err'); } if (validCurrency(v)) s.currency = v; }
    else if (k === 'dial') s.dial = v.replace(/\D/g, '').slice(0, 4);
    else if (k === 'taxRate') s.taxRate = sNum(v, 0, 100, 0);
    else if (k === 'validDays') s.validDays = sInt(v, 1, 365, 15); else if (k === 'dueDays') s.dueDays = sInt(v, 0, 365, 15); else if (k === 'followDays') s.followDays = sInt(v, 1, 60, 3);
    else if (k === 'qNext' || k === 'iNext') s[k] = sInt(v, 1, 1e9, 1);
    else if (k === 'terms') s.terms = sStr(v, 500); else if (k === 'taxName') s.taxName = sStr(v.trim(), 20); else if (k === 'qPrefix' || k === 'iPrefix') s[k] = sStr(v.trim(), 10);
    const cur = k.startsWith('biz.') ? s.biz[k.slice(4)] : s[k]; if (el.type === 'number' && String(cur) !== el.value) el.value = cur;
    persist(t('saved')); if (k === 'currency') render(); return;
  }
  if (el.dataset.in === 'notify') { if (el.checked && 'Notification' in window) { Notification.requestPermission().then(p => { s.notify = p === 'granted'; if (!s.notify) toast(t('notifyDenied'), 'err'); persist(); render(); }); } else { s.notify = false; persist(); render(); } return; }
  if (el.dataset.in === 'logo') { const file = el.files && el.files[0]; if (!file) return; if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast(t('logoErr'), 'err'); const url = URL.createObjectURL(file), im = new Image(); im.onload = () => { const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); const data = sLogo(c.toDataURL('image/png')); if (!data) return toast(t('logoErr'), 'err'); s.biz.logo = data; persist(t('saved')); render(); }; im.onerror = () => { URL.revokeObjectURL(url); toast(t('logoErr'), 'err'); }; im.src = url; return; }
  if (el.dataset.in === 'import') { const file = el.files && el.files[0]; if (!file) return; if (file.size > 20e6) return toast(t('importErr'), 'err'); file.text().then(txt => { const d = JSON.parse(txt); if (!d || typeof d !== 'object' || typeof d.settings !== 'object' || !Array.isArray(d.clients) || !Array.isArray(d.quotes)) throw new Error('shape'); const n = sanitize(d); n.settings.onboarded = true; if (!n.settings.lang) n.settings.lang = lang(); ACT._pending = n; confirmBox(t('importWarn'), t('importData'), 'doImport', true); }).catch(() => toast(t('importErr'), 'err')); el.value = ''; }
});
window.addEventListener('storage', ev => { if (ev.key !== LS_KEY) return; const was = licensed(); S = loadState(); for (const k in _nf) delete _nf[k]; checkLicense().then(() => { if (ED) return; if (was !== licensed()) closeModal(); if ($('#modal').hidden) render(); }); }); // another tab changed the data
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installEvt = ev; if (S.settings.onboarded ? !ED && $('#modal').hidden : !document.activeElement || document.activeElement.tagName !== 'INPUT') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; if (S.settings.onboarded) render(); });

/* ---------- alerts ---------- */
function badge() { const n = S.quotes.filter(needsFollow).length + S.invoices.filter(needsRemind).length; try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n); else navigator.clearAppBadge(); } } catch (e) { /* not supported */ } }
function notifyToday() {
  const s = S.settings; if (!s.notify || s.lastNotify === today() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const f = S.quotes.filter(needsFollow).length, o = S.invoices.filter(i => invStatus(i) === 'overdue').length; if (!f && !o) return;
  s.lastNotify = today(); save();
  const opts = { body: t('notifBody', { f, o }), icon: 'icons/icon-192.png', tag: 'clavuno-today' };
  if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(t('notifTitle'), opts)).catch(() => {}); else { try { new Notification(t('notifTitle'), opts); } catch (e) { /* ignore */ } }
}

/* ---------- boot ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) { try { navigator.serviceWorker.register('sw.js'); } catch (e) { /* ignore */ } }
lastSec = location.hash.split('/')[1] || '';
{ const boot = () => { render(); notifyToday(); }; checkLicense().then(boot, boot); }
