'use strict';
/* Cuadre actions: payments, receipts, messages, backup, PIN, forms and events. */
let lastSec = '';
window.addEventListener('hashchange', () => { const sec = location.hash.split('/')[1] || ''; if (sec !== lastSec) { UI.search = ''; UI.planAll = false; lastSec = sec; } closeModal(); render(); window.scrollTo(0, 0); });
const isCur = v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(CURS, v);

/* ---------- payments ---------- */
// What a payment would do, without saving it: where it lands and what is left owing.
function payPreview(L, amt, date, kind) {
  const probe = Object.assign({}, L, { payments: L.payments.concat([{ id: '~new', date, amount: amt, kind, void: false }]) }), td = today();
  const st = ENG.state(probe, date > td ? date : td, schedOf(L)), A = st.allocs['~new'];
  let extra = 0; for (const k in st.allocs) extra += st.allocs[k].extra; // a back-dated payment can leave a later one with nothing to pay: count unapplied money anywhere
  return { A, extra, after: st.status === 'paid' ? 0 : st.remaining + st.moraPending };
}
function payChips(L, date) {
  const st = ENG.state(Object.assign({}, L, { payments: L.payments.filter(p => p.date <= date) }), date, schedOf(L)), po = payoffOf(L, date), out = [];
  if (st.dueNow > 0) out.push([t('chipDue'), st.dueNow, 'pay']);
  const nx = st.rows.find(r => r.rem > 0 && r.due >= date) || st.next; if (nx && nx.rem !== st.dueNow) out.push([t('chipOne'), nx.rem, 'pay']);
  if (po && po.total > 0) out.push([t('chipAll'), po.total, 'settle']);
  return out.map(c => `<button type="button" class="chip" data-act="payChip" data-amt="${c[1]}" data-kind="${c[2]}">${esc(c[0])} · ${esc(money(c[1]))}</button>`).join('');
}
function payHint(f) {
  const L = findL(f.id.value), h = $('#payhint'); if (!L || !h) return; const amt = toCents(f.amount.value), date = sDate(f.date.value, today());
  if (!(amt > 0)) { h.textContent = ''; return; }
  if (f.kind.value === 'settle') { h.textContent = t('hintSettle'); return; }
  const pv = payPreview(L, amt, date, 'pay'); h.textContent = pv.extra > 0 ? t('overpay', { x: money(Math.max(0, amt - pv.extra)) }) : pv.after <= 0 ? t('hintPaidOff') : pv.A.prepay > 0 ? t('hintPrepay', { x: money(pv.A.prepay), i: money(pv.A.newInt) }) + ' ' + t('hintAfter', { x: money(pv.after) }) : t('hintAfter', { x: money(pv.after) });
}
function payOpen(id, preset) {
  const L = findL(id); if (!L) return; const st = stOf(L); if (st.status === 'paid') return toast(t('loanIsPaid'));
  const td = today(), po = payoffOf(L, td), owedNow = st.remaining + st.moraPending, settle = preset === 'settle';
  const def = settle ? po.total : st.dueNow > 0 ? Math.min(st.dueNow, owedNow) : st.next ? st.next.rem : owedNow;
  openModal(`<h2>${esc(t('addPayment'))} · ${esc(clientName(L))}</h2><p class="muted small">${esc(loanSub(L))} · ${esc(t('balance'))} ${esc(money(owedNow))}</p><form data-form="pay" novalidate><input type="hidden" name="id" value="${L.id}"><input type="hidden" name="kind" value="${settle ? 'settle' : 'pay'}">${field(t('payAmount') + ' (' + curSym() + ')', `<input name="amount" type="number" inputmode="decimal" min="0" step="any" required value="${centsIn(def)}" data-in="payAmt">`)}<div class="chips" id="paychips">${payChips(L, td)}</div><p class="note" id="payhint"></p><div class="grid2">${field(t('payDate'), `<input name="date" type="date" value="${td}" min="${L.start}" max="${td}" required data-in="payDate">`)}${field(t('note') + opt(), inp('note', '', 'maxlength="200"'))}</div><div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary big" type="submit">${icon('check')}<span>${esc(t('savePayment'))}</span></button></div></form>`);
  CTX = { type: 'pay', id }; payHint($('#modal form'));
}
function payoffOpen(id) {
  const L = findL(id); if (!L) return; const po = payoffOf(L), st = stOf(L); if (!po || st.status === 'paid') return;
  openModal(`<h2>${esc(t('payoffToday'))}</h2><p class="muted small">${esc(clientName(L))} · ${esc(loanSub(L))}</p><dl class="stat"><div><dt>${esc(t('capital'))}</dt><dd>${esc(money(po.cap))}</dd></div><div><dt>${esc(t('interest'))}</dt><dd>${esc(money(po.int))}</dd></div>${po.mora > 0 ? `<div><dt>${esc(t('mora'))}</dt><dd>${esc(money(po.mora))}</dd></div>` : ''}<div class="big"><dt>${esc(t('payoffTotal'))}</dt><dd id="payoff-total">${esc(money(po.total))}</dd></div>${po.discount > 0 ? `<div><dt>${esc(t('payoffSaves'))}</dt><dd>${esc(money(po.discount))}</dd></div>` : ''}</dl><p class="note">${esc(t('payoffNote_' + L.type))}</p><div class="row end"><button class="btn" data-act="closeModal">${esc(t('close'))}</button><a class="btn" href="#/loans/new?renew=${L.id}">${icon('renew')}<span>${esc(t('renew'))}</span></a><button class="btn primary" data-act="payOpen" data-id="${L.id}" data-kind="settle">${icon('check')}<span>${esc(t('settleNow'))}</span></button></div>`);
}

/* ---------- documents: receipt and payment plan ---------- */
function docOpts() { return `<div class="stack"><button class="opt wa" data-act="docShare" disabled>${icon('share')}<span><b>${esc(t('waPdf'))}</b><small id="pdfhint">${esc(t('preparing'))}</small></span></button><button class="opt" data-act="docDownload" disabled>${icon('dl')}<span><b>${esc(t('downloadPdf'))}</b></span></button></div>`; }
function docReady(ctx, promise) {
  promise.then(file => { if (CTX !== ctx) return; ctx.file = file; let can = false; try { can = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { /* no share */ } ctx.canShare = can; document.querySelectorAll('#modal [data-act="docShare"],#modal [data-act="docDownload"]').forEach(b => { b.disabled = false; }); const h = $('#pdfhint'); if (h) h.textContent = t(can ? 'waPdfHint' : 'waPdfHintDl'); })
    .catch(() => { if (CTX === ctx) { const h = $('#pdfhint'); if (h) h.textContent = t('errPdf'); } });
}
function receiptOpen(id, pid, fresh) {
  const L = findL(id), p = L && L.payments.find(x => x.id === pid); if (!p) return; const st = stOf(L), A = st.allocs[p.id] || { int: 0, cap: 0, mora: 0, after: 0, prepay: 0, newInt: 0 }, c = clientOf(L);
  openModal(`${fresh ? `<div class="okmark">${icon('check')}</div><h2 class="center">${esc(t('paymentSaved'))}</h2>` : `<h2>${esc(t('receipt'))}${p.num ? ' ' + esc(p.num) : ''}</h2>`}<dl class="stat"><div><dt>${esc(clientName(L))} · ${esc(fmtDate(p.date))}</dt><dd>${esc(money(p.amount))}</dd></div>${A.cap - A.prepay > 0 ? `<div class="sub"><dt>${esc(t('capital'))}</dt><dd>${esc(money(A.cap - A.prepay))}</dd></div>` : ''}${A.prepay > 0 ? `<div class="sub" id="rc-prepay"><dt>${esc(t('rcPrepay'))}</dt><dd>${esc(money(A.prepay))}</dd></div>${A.after > 0 ? `<div class="sub" id="rc-newint"><dt>${esc(t('rcNewInt'))}</dt><dd>${esc(money(A.newInt))}</dd></div>` : ''}` : ''}${A.int > 0 ? `<div class="sub"><dt>${esc(t('interest'))}</dt><dd>${esc(money(A.int))}</dd></div>` : ''}${A.mora > 0 ? `<div class="sub"><dt>${esc(t('mora'))}</dt><dd>${esc(money(A.mora))}</dd></div>` : ''}<div class="big"><dt>${esc(t('balanceAfter'))}</dt><dd id="rc-after">${esc(money(A.after))}</dd></div></dl>${docOpts()}<button class="opt wa" data-act="msgOpen" data-id="${L.id}" data-tone="thanks" data-pid="${p.id}">${icon('chat')}<span><b>${esc(t('tone_thanks'))}</b><small>${esc(c && waPhone(c.phone) ? t('waMsgHint') : t('needPhone'))}</small></span></button><div class="row end"><button class="btn" data-act="closeModal">${esc(t('close'))}</button></div>`);
  const ctx = CTX = { type: 'doc', file: null, canShare: false, msg: buildMsg(L, 'thanks', pid), phone: c ? waPhone(c.phone) : '' };
  docReady(ctx, buildReceiptPdf(L, p));
}
function stmtOpen(id) {
  const L = findL(id); if (!L) return; const c = clientOf(L);
  openModal(`<h2>${esc(t('planPdf'))} · ${esc(L.num)}</h2><p class="muted small">${esc(clientName(L))}</p>${docOpts()}<div class="row end"><button class="btn" data-act="closeModal">${esc(t('close'))}</button></div>`);
  const ctx = CTX = { type: 'doc', file: null, canShare: false, msg: t('msgPlan', { client: clientName(L), from: S.settings.biz.name ? t('msgFrom', { biz: S.settings.biz.name }) : '' }).replace(/ {2,}/g, ' ').trim(), phone: c ? waPhone(c.phone) : '' };
  docReady(ctx, buildStatementPdf(L));
}
function msgOpen(id, tone, pid) {
  const L = findL(id); if (!L) return; UI.msgLoan = id; UI.tone = TONES.includes(tone) ? tone : ''; UI.msgPid = pid || '';
  openModal(`<h2>${esc(t('msgWriter'))}</h2><p class="muted small">${esc(clientName(L))} · ${esc(L.num)}</p>${composer(false)}<div class="row end"><button class="btn" data-act="closeModal">${esc(t('close'))}</button></div>`); CTX = { type: 'msg' };
}
function refreshComposer() { const el = $('#composer'); if (!el) return; const inModal = !!el.closest('#modal'); el.outerHTML = composer(!inModal); }

/* ---------- demo data ---------- */
function demoLoad() {
  const s = S.settings, td = today(), K = ({ DOP: 1, USD: 0.02, EUR: 0.02, CAD: 0.02, PAB: 0.02, MXN: 0.4, COP: 80, PEN: 0.08, ARS: 20, CLP: 16, GTQ: 0.15, HNL: 0.5, NIO: 0.7, CRC: 10, BOB: 0.14, PYG: 140, UYU: 0.8, VES: 1, BRL: 0.1, HTG: 2.5 })[s.currency] || 1;
  const P = n => Math.max(1, Math.round(n * K)) * 100;
  const cs = [['María Pérez', '809-555-0101', 'Colmado La Esquina'], ['Carlos Gómez', '809-555-0102', ''], ['Ana Rodríguez', '829-555-0103', 'Salón Ana'], ['José Martínez', '849-555-0104', ''], ['Luis Fernández', '809-555-0105', '']].map(x => ({ id: uid(), name: x[0], doc: '', phone: x[1], address: '', ref: x[2], notes: '', created: td, demo: true }));
  let k = S.loans.filter(x => x.demo).length;
  // payFn(row, index) -> days late for that installment, or null to leave it unpaid
  const mk = (ci, type, principal, rateBp, n, freq, ago, noSun, payFn) => {
    const start = addDays(td, -ago), L = { id: uid(), num: 'EJ-' + (++k), clientId: cs[ci].id, type, principal: P(principal), rateBp, n, freq, noSun: !!noSun, dec: s.dec, start, first: ENG.defaultFirst(start, freq, !!noSun), mora: Object.assign({}, s.mora), payments: [], notes: '', renewedFrom: '', renewedTo: '', created: start, demo: true };
    const sc = ENG.schedule(L); if (sc.error) { k--; return; }
    sc.rows.forEach((r, i) => { const d = payFn(r, i); if (d == null) return; const date = addDays(r.due, d); if (date > td || (d === 0 && r.due === td)) return; L.payments.push({ id: uid(), num: '', date, amount: r.amount, kind: 'pay', void: false, note: '' }); });
    S.loans.push(L);
  };
  const onTime = () => 0;
  S.clients.push(...cs);
  mk(0, 'fixed', 10000, 2000, 24, 'daily', 10, true, onTime);
  mk(1, 'balance', 20000, 500, 12, 'monthly', 62, false, onTime);
  mk(2, 'interest', 50000, 1000, 6, 'biweekly', 31, false, onTime);
  mk(3, 'fixed', 15000, 2000, 8, 'weekly', 33, false, (r, i) => (i < 2 ? 0 : i === 2 ? 4 : null));
  mk(0, 'fixed', 5000, 2000, 4, 'weekly', 60, false, onTime);
  mk(4, 'fixed', 8000, 1500, 3, 'monthly', 100, false, (r, i) => (i === 0 ? 10 : null));
  persist(); render();
}
function demoRemove() {
  const used = usedByReal(); S.clients.forEach(c => { if (used.has(c.id)) c.demo = false; });
  const gone = new Set(S.loans.filter(l => l.demo).map(l => l.id));
  S.loans = S.loans.filter(l => !l.demo); S.clients = S.clients.filter(c => !c.demo); S.visits = S.visits.filter(v => !gone.has(v.id));
  S.loans.forEach(l => { if (gone.has(l.renewedFrom)) l.renewedFrom = ''; if (gone.has(l.renewedTo)) l.renewedTo = ''; });
  closeModal(); persist(t('deleted')); render();
}

/* ---------- loan save / delete ---------- */
function saveLoan() {
  const f = ED.f, c = findC(f.clientId); if (!c) return toast(t('needClient'), 'err');
  const d = draftLoan(); if (d.err) return toast(t(d.err === 'pvEmpty' ? 'errAmount' : d.err, d.vars), 'err');
  const ex = findL(ED.id), adds = ED.isNew ? !ex : !!(ex && ex.demo); // editing an example makes it a real loan
  if (adds && !canAddLoan()) return proOpen('loans');
  if ((adds || (ex && ex.clientId !== c.id)) && c.demo && !usedByReal(ED.id).has(c.id) && !canAddClient()) return proOpen('clients');
  const td = today(), L = d.L; let to;
  if (ED.isNew) {
    Object.assign(L, { num: nextNum('loan'), clientId: c.id, notes: sStr(f.notes.trim(), 1000), renewedFrom: '', renewedTo: '', created: td, demo: false });
    if (ED.renewOf) {
      const old = findL(ED.renewOf), po = old && payoffOf(old, td); if (!old || !po || po.total <= 0 || stOf(old).status === 'paid') return toast(t('errRenewGone'), 'err');
      if (L.principal < po.total) return toast(t('errRenewMin', { x: money(po.total) }), 'err');
      old.payments.push({ id: uid(), num: nextNum('rec'), date: td, amount: po.total, kind: 'renew', void: false, note: L.num }); old.renewedTo = L.id; L.renewedFrom = old.id;
    }
    S.loans.push(L);
  } else {
    if (!ex || livePays(ex).length) return toast(t('errLocked'), 'err');
    Object.assign(ex, { clientId: c.id, type: L.type, principal: L.principal, rateBp: L.rateBp, n: L.n, freq: L.freq, noSun: L.noSun, start: L.start, first: L.first, mora: L.mora, notes: sStr(f.notes.trim(), 1000), demo: false });
  }
  S.settings.last = { type: L.type, freq: L.freq, rateBp: L.rateBp, n: L.n, noSun: L.noSun };
  if (!persist(t(ED.renewOf ? 'renewed' : 'saved'))) return;
  const wasNew = ED.isNew; to = '#/loans/' + ED.id; ED = null;
  if (wasNew) { history.replaceState(null, '', to); render(); window.scrollTo(0, 0); } else go(to); // Back must not reopen an empty editor
}
function loanDelete(id) {
  const L = findL(id); if (!L) return; if (L.renewedTo && findL(L.renewedTo)) return; // a loan that was renewed stays while its renewal exists
  if (L.renewedFrom) { const old = findL(L.renewedFrom); if (old) { old.payments.forEach(p => { if (p.kind === 'renew' && !p.void) p.void = true; }); old.renewedTo = ''; } } // undo the renewal: the old loan is open again
  if (L.renewedTo) { const nw = findL(L.renewedTo); if (nw) nw.renewedFrom = ''; }
  S.loans = S.loans.filter(x => x.id !== id); S.visits = S.visits.filter(v => v.id !== id);
  closeModal(); persist(t('deleted')); go('#/loans');
}

function doWipeNow() { lsDel(LS_KEY); lsDel(LS_KEY + ':prev'); lockSet(null); const lic = S.plan.license; S = defaults(); bust(); if (lic) { S.plan.license = lic; save(); } LOCKED = false; ED = null; UI.fl = 'active'; UI.search = ''; UI.ask = ''; UI.msgLoan = ''; closeModal(); if (location.hash !== '#/' && location.hash !== '') history.replaceState(null, '', '#/'); render(); }
function setCurrency(v) { const s = S.settings; s.currency = v; const d = DIALS[CURS[v][1]]; if (d) s.dial = d; }
function wipeOpen(title, body) { const w = t('wipeWord'); openModal(`<h2>${esc(title)}</h2>${body ? `<p class="banner bad">${esc(body)}</p>` : ''}<form data-form="wipe" novalidate>${field(t('wipeType', { w }), '<input name="w" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="20" required>')}<div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn danger" type="submit">${esc(t('wipe'))}</button></div></form>`); }

/* ---------- csv ---------- */
const csvCell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s; return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvNum = c => (Math.round(c) / 100).toFixed(2);
function csvDownload(name, rows) { download(new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }), name); }

/* ---------- actions ---------- */
const ACT = {
  closeModal, demoLoad, demoRemove,
  proOpen(el) { proOpen(el.dataset.why || ''); },
  buyPro() { if (gated()) openUrl(CFG.CHECKOUT_URL); },
  licRemoveAsk() { confirmBox(t('licRemove'), t('del'), 'licRemove', true); },
  licRemove() { S.plan.license = null; closeModal(); persist(t('saved')); render(); },
  installHide() { UI.hideInstall = true; render(); },
  install() { if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); } },
  filter(el) { UI.fl = el.dataset.v; render(); },
  planAll() { UI.planAll = true; render(); },
  ask(el) { UI.ask = UI.ask === el.dataset.v ? '' : el.dataset.v; render(); const a = $('#answer'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' }); },
  month(el) { const p = UI.month.split('-').map(Number), tot = p[0] * 12 + p[1] - 1 + Number(el.dataset.v), ym = Math.floor(tot / 12) + '-' + pad2((tot % 12) + 1); if (ym <= today().slice(0, 7) && ym >= '1990-01') UI.month = ym; render(); },
  newClient(el) { if (!canAddClient()) return proOpen('clients'); openModal(clientForm(null, el.dataset.from)); },
  editClient(el) { const c = findC(el.dataset.id); if (c) openModal(clientForm(c)); },
  waClient(el) { const c = findC(el.dataset.id); if (c) openUrl('https://wa.me/' + waPhone(c.phone)); },
  clientDelAsk(el) { const id = el.dataset.id; if (S.loans.some(l => l.clientId === id)) return toast(t('clientHasLoans'), 'err'); confirmBox(t('confirmDelete'), t('del'), 'clientDel', true, `data-id="${esc(id)}"`); },
  clientDel(el) { const id = el.dataset.id; if (S.loans.some(l => l.clientId === id)) return; S.clients = S.clients.filter(c => c.id !== id); closeModal(); persist(t('deleted')); go('#/clients'); },
  loanDelAsk(el) { const L = findL(el.dataset.id); if (!L) return; const nx = L.renewedTo && findL(L.renewedTo); if (nx) return toast(t('delHasRenewal', { loan: nx.num }), 'err'); const np = livePays(L).length; confirmBox(t('loanDelQ', { loan: L.num }), t('del'), 'loanDel', true, `data-id="${esc(L.id)}"`, [L.renewedFrom && findL(L.renewedFrom) ? t('loanDelRenew') : '', np ? t('loanDelPays', { n: np }) : ''].filter(Boolean).join(' ')); },
  loanDel(el) { loanDelete(el.dataset.id); },
  payOpen(el) { payOpen(el.dataset.id, el.dataset.kind); },
  payoffOpen(el) { payoffOpen(el.dataset.id); },
  payChip(el) { const f = el.closest('form'); if (!f) return; f.amount.value = centsIn(Number(el.dataset.amt)); f.kind.value = el.dataset.kind === 'settle' ? 'settle' : 'pay'; payHint(f); },
  receiptOpen(el) { receiptOpen(el.dataset.id, el.dataset.pid); },
  stmtPdf(el) { stmtOpen(el.dataset.id); },
  async docShare() { const ctx = CTX; if (!ctx || !ctx.file) return; if (ctx.canShare) { try { await navigator.share({ files: [ctx.file], text: ctx.msg, title: ctx.file.name }); } catch (e) { /* the person closed the share sheet */ } } else { download(ctx.file, ctx.file.name); openUrl('https://wa.me/' + (ctx.phone || '') + '?text=' + encodeURIComponent(ctx.msg)); toast(t('pdfDownloaded')); } },
  docDownload() { if (CTX && CTX.file) download(CTX.file, CTX.file.name); },
  voidAsk(el) { const L = findL(el.dataset.id), p = L && L.payments.find(x => x.id === el.dataset.pid); if (!p || p.void) return; if (p.kind === 'renew' && L.renewedTo && findL(L.renewedTo)) return toast(t('voidRenew'), 'err'); if (p.kind !== 'settle' && p.kind !== 'renew' && livePays(L).some(x => x.kind === 'settle' || x.kind === 'renew')) return toast(t('voidSettled'), 'err'); /* the closing entry was the exact payoff: undo it first */ confirmBox(t('voidQ', { x: money(p.amount) }), t('voidPay'), 'voidDo', true, `data-id="${esc(L.id)}" data-pid="${esc(p.id)}"`, t('voidNote')); },
  voidDo(el) { const L = findL(el.dataset.id), p = L && L.payments.find(x => x.id === el.dataset.pid); if (!p) return; p.void = true; if (p.kind === 'renew') L.renewedTo = ''; closeModal(); persist(t('voidedOk')); render(); },
  waiveAsk(el) { const L = findL(el.dataset.id); if (!L) return; const st = stOf(L); if (!(st.moraPending > 0)) return; confirmBox(t('waiveQ', { x: money(st.moraPending) }), t('waiveMora'), 'waiveDo', false, `data-id="${esc(L.id)}"`); },
  waiveDo(el) { const L = findL(el.dataset.id); if (!L) return; const st = stOf(L); if (st.moraPending > 0) L.payments.push({ id: uid(), num: '', date: today(), amount: st.moraPending, kind: 'waive', void: false, note: '' }); closeModal(); persist(t('saved')); render(); },
  visit(el) { const id = el.dataset.id, v = el.dataset.v === 'absent' ? 'absent' : 'seen', td = today(), cur = S.visits.find(x => x.d === td && x.id === id); S.visits = S.visits.filter(x => !(x.d === td && x.id === id)); if (!cur || cur.st !== v) S.visits.push({ d: td, id, st: v }); persist(); render(); },
  msgOpen(el) { msgOpen(el.dataset.id, el.dataset.tone, el.dataset.pid); },
  tone(el) { if (TONES.includes(el.dataset.v)) { UI.tone = el.dataset.v; refreshComposer(); } },
  msgSend() { const ta = $('#msgtext'), L = findL(UI.msgLoan); if (!ta || !L) return; const c = clientOf(L); openUrl('https://wa.me/' + (c ? waPhone(c.phone) : '') + '?text=' + encodeURIComponent(ta.value)); },
  msgCopy() { const ta = $('#msgtext'); if (!ta) return; const done = () => toast(t('copied')); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); }); else { ta.select(); document.execCommand('copy'); done(); } },
  setLang(el) { if (!LANGS.some(l => l[0] === el.dataset.v)) return; S.settings.lang = el.dataset.v; persist(); render(); },
  welcomeLang(el) { if (!LANGS.some(l => l[0] === el.dataset.v)) return; const f = $('form[data-form="welcome"]'); if (f) { UI.wBiz = sStr(f.biz.value, 80); UI.wCur = isCur(f.currency.value) ? f.currency.value : null; UI.wDec = f.dec.value === '2' ? 2 : 0; } S.settings.lang = el.dataset.v; render(); },
  setTheme(el) { if (['auto', 'light', 'dark'].includes(el.dataset.v)) { S.settings.theme = el.dataset.v; persist(); render(); } },
  logoRemove() { S.settings.biz.logo = ''; persist(t('saved')); render(); },
  exportData() { const copy = JSON.parse(JSON.stringify(S)); copy.settings.pin = null; copy.plan = { license: null }; copy.app = 'cuadre'; /* neither the PIN nor the license key travel in a backup */ copy.exported = today(); download(new Blob([JSON.stringify(copy, null, 1)], { type: 'application/json' }), 'cuadre-respaldo-' + today() + '.json'); S.settings.lastBackup = today(); S.settings.snooze = ''; persist(t('backupDone')); render(); },
  backupLater() { S.settings.snooze = today(); persist(); render(); },
  askWipe() { wipeOpen(t('wipeConfirm'), ''); },
  doImport() { if (!ACT._pending) return; const keep = licensed() ? S.plan.license : null, pin = S.settings.pin, before = lsGet(LS_KEY); lsDel(LS_KEY + ':prev'); if (before && S.settings.onboarded) { try { localStorage.setItem(LS_KEY + ':prev', before); } catch (e) { /* no room for the undo copy */ } } S = ACT._pending; ACT._pending = null; S.settings.pin = pin; bust(); closeModal(); persist(t('imported')); render(); checkLicense().then(ok => { if (!ok && keep && !S.plan.license) { S.plan.license = keep; save(); } render(); }); }, // a backup never takes Pro (or the PIN) away from this device
  csvPays() {
    const R = monthReport(UI.month), rows = [[t('date'), t('receipt'), t('client'), t('loan'), t('payAmount'), t('capital'), t('interest'), t('mora'), t('kind'), t('note')]];
    for (const x of R.rows) rows.push([x.pay.date, x.pay.num, clientName(x.L), x.L.num, csvNum(x.pay.amount), csvNum(x.A.cap), csvNum(x.A.int), csvNum(x.A.mora), kindLabel(x.pay, x.A), x.pay.note]);
    csvDownload('cuadre-pagos-' + UI.month + '.csv', rows);
  },
  csvLoans() {
    const rows = [[t('loan'), t('client'), t('docId'), t('phone'), t('loanType'), t('amount'), t('ratePct'), t('nInst'), t('frequency'), t('startDate'), t('totalToCollect'), t('paid'), t('balance'), t('overdue'), t('moraPending'), t('status')]];
    for (const L of S.loans) { const st = stOf(L), sc = schedOf(L), c = clientOf(L); rows.push([L.num, c ? c.name : '', c ? c.doc : '', c ? c.phone : '', t('ty_' + L.type), csvNum(L.principal), (L.rateBp / 100).toFixed(2), L.n, t('fq_' + L.freq), L.start, csvNum(st.total), csvNum(st.paid), csvNum(st.remaining), csvNum(st.overdue), csvNum(st.moraPending), t(ST_PILL[st.status][1])]); }
    csvDownload('cuadre-prestamos-' + today() + '.csv', rows);
  },
  pinOpen() { const has = !!S.settings.pin, pi = n => `<input name="${n}" type="password" inputmode="numeric" autocomplete="off" maxlength="8" required>`; openModal(`<h2>${esc(t(has ? 'pinChange' : 'pinSet'))}</h2><p class="note">${esc(t('pinNote'))}</p><form data-form="pin" novalidate>${has ? field(t('pinCurrent'), pi('cur')) : ''}${field(t('pinNew'), pi('pin'), t('pinRule'))}${field(t('pinRepeat'), pi('pin2'))}<div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn primary" type="submit">${esc(t('save'))}</button></div></form>`); },
  pinOffOpen() { openModal(`<h2>${esc(t('pinRemove'))}</h2><form data-form="pinOff" novalidate>${field(t('pinCurrent'), '<input name="cur" type="password" inputmode="numeric" autocomplete="off" maxlength="8" required>')}<div class="row end"><button type="button" class="btn" data-act="closeModal">${esc(t('cancel'))}</button><button class="btn danger" type="submit">${esc(t('pinRemove'))}</button></div></form>`); },
  lockNow() { if (!S.settings.pin) return; LOCKED = true; ED = null; closeModal(); render(); window.scrollTo(0, 0); },
  pinForgot() { wipeOpen(t('pinForgotQ'), t('pinForgotWarn')); },
  curDo(el) { const v = el.dataset.v; if (!isCur(v)) return; setCurrency(v); closeModal(); persist(t('saved')); render(); },
  corruptDownload() { const raw = corruptRaw(); if (raw != null) download(new Blob([raw], { type: 'text/plain' }), 'cuadre-datos-danados-' + iso(new Date()) + '.txt'); },
  corruptDiscardAsk() { confirmBox(t('corruptDiscardQ'), t('del'), 'corruptDiscard', true); },
  corruptDiscard() { lsDel(LS_KEY + ':corrupt'); closeModal(); render(); },
  importUndo() { const raw = prevRaw(); if (raw == null) return; let n; try { n = sanitize(JSON.parse(raw)); } catch (e) { return toast(t('importErr'), 'err'); } const keep = licensed() ? S.plan.license : null; S = n; if (keep && !S.plan.license) S.plan.license = keep; bust(); lsDel(LS_KEY + ':prev'); if (S.settings.pin) LOCKED = false; persist(t('undoDone')); checkLicense().then(() => { if (keep && !S.plan.license) { S.plan.license = keep; save(); } render(); }); render(); },
  importKeep() { lsDel(LS_KEY + ':prev'); render(); }
};
const FORMS = {
  welcome(f, ev) {
    const s = S.settings; s.lang = lang(); s.biz.name = sStr(f.biz.value.trim(), 80); s.currency = isCur(f.currency.value) ? f.currency.value : 'DOP'; s.dial = DIALS[CURS[s.currency][1]] || ''; s.dec = f.dec.value === '2' ? 2 : 0; s.onboarded = true; s.since = today();
    const demo = ev.submitter && ev.submitter.name === 'demo'; if (!persist()) return; if (demo) demoLoad(); else render();
  },
  client(f) {
    const name = f.name.value.trim(); if (!name) return toast(t('needName'), 'err');
    const data = { name: sStr(name, 80), doc: sStr(f.doc.value.trim(), 40), phone: sStr(f.phone.value.trim(), 30), address: sStr(f.address.value.trim(), 200), ref: sStr(f.ref.value.trim(), 200), notes: sStr(f.notes.value.trim(), 1000) };
    let c = f.id.value && findC(f.id.value); if ((!c || (c.demo && !usedByReal().has(c.id))) && !canAddClient()) return proOpen('clients');
    if (c) Object.assign(c, data, { demo: false }); else { c = Object.assign({ id: uid(), created: today(), demo: false }, data); S.clients.push(c); }
    const from = f.from.value; closeModal(); if (!persist(t('saved'))) return; if (from === 'editor' && ED) ED.f.clientId = c.id; render();
  },
  loan() { saveLoan(); },
  pay(f) {
    const L = findL(f.id.value); if (!L) return closeModal(); if (stOf(L).status === 'paid') { closeModal(); return toast(t('loanIsPaid')); }
    const td = today(); let date = sDate(f.date.value, td); if (date > td) date = td; if (date < L.start) date = L.start;
    const amt = toCents(f.amount.value); if (!(amt > 0)) return toast(t('badAmount'), 'err');
    const kind = f.kind.value === 'settle' ? 'settle' : 'pay';
    if (kind === 'settle') {
      if (livePays(L).some(p => p.date > date)) return toast(t('settleDate'), 'err');
      const po = payoffOf(L, date); if (!po || po.total <= 0) return toast(t('badAmount'), 'err');
      if (amt !== po.total) { f.amount.value = centsIn(po.total); return toast(t('settleChanged', { x: money(po.total) }), 'err'); }
    } else { const pv = payPreview(L, amt, date, 'pay'); if (pv.extra > 0) return toast(t('overpay', { x: money(Math.max(0, amt - pv.extra)) }), 'err'); }
    const p = { id: uid(), num: nextNum('rec'), date, amount: amt, kind, void: false, note: sStr(f.note.value.trim(), 200) };
    L.payments.push(p); closeModal(); if (!persist()) return; render(); receiptOpen(L.id, p.id, true);
  },
  wipe(f) { const w = t('wipeWord'); if (f.w.value.trim().toUpperCase() !== w) return toast(t('wipeTypeErr', { w }), 'err'); doWipeNow(); },
  async license(f) {
    let key = null; try { key = await licVerify(f.key.value); } catch (e) { /* no crypto on this page */ }
    if (!key) return toast(t('licBad'), 'err');
    S.plan.license = key; if (!persist(t('licOk'))) return; if (ED) go(ED.hash); else render();
  },
  async pin(f) {
    if (S.settings.pin && !(await pinCheck(f.cur.value))) return toast(t('pinWrong'), 'err');
    const p = f.pin.value; if (!/^\d{4,8}$/.test(p)) return toast(t('pinRule'), 'err'); if (p !== f.pin2.value) return toast(t('pinMismatch'), 'err');
    try { S.settings.pin = await pinMake(p); } catch (e) { return toast(t('errSave'), 'err'); }
    closeModal(); persist(t('pinSaved')); render();
  },
  async pinOff(f) { if (!(await pinCheck(f.cur.value))) return toast(t('pinWrong'), 'err'); S.settings.pin = null; closeModal(); persist(t('pinRemoved')); render(); },
  async unlock(f) {
    const lk = lockGet(), now = Date.now(); if (now < lk.until) { f.pin.value = ''; return toast(t('pinWait', { t: waitText(lk.until - now) }), 'err'); }
    if (await pinCheck(f.pin.value)) { lockSet(null); LOCKED = false; render(); return; }
    const o = lockMiss(); f.pin.value = ''; if (o.until > Date.now()) { render(); toast(t('pinWait', { t: waitText(o.until - Date.now()) }), 'err'); } else toast(t('pinWrong'), 'err');
  }
};

/* ---------- events ---------- */
let downOnBackdrop = false;
document.addEventListener('click', ev => {
  const nl = ev.target.closest('a[href]'); if (nl && /^#\/loans\/new/.test(nl.getAttribute('href')) && !canAddLoan() && !LOCKED) { ev.preventDefault(); return proOpen('loans'); }
  const el = ev.target.closest('[data-act]'); if (el) { if (el.disabled) return; const fn = ACT[el.dataset.act]; if (typeof fn === 'function') fn(el, ev); return; }
  if (ev.target.id === 'modal' && downOnBackdrop) closeModal();
});
document.addEventListener('pointerdown', ev => { downOnBackdrop = ev.target.id === 'modal'; });
document.addEventListener('submit', ev => { const f = ev.target.closest('form[data-form]'); if (!f) return; ev.preventDefault(); const fn = FORMS[f.dataset.form]; if (fn) fn(f, ev); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#modal').hidden) closeModal(); });
document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.ld) return ldSync(el);
  if (el.dataset.in === 'payAmt') { const f = el.form; f.kind.value = 'pay'; return payHint(f); }
  if (el.dataset.in === 'search') { UI.search = el.value; const sec = location.hash.split('/')[1] || ''; const l = $('#list'); if (l) l.innerHTML = sec === 'clients' ? clientsList() : loansList(); }
});
document.addEventListener('change', ev => {
  const el = ev.target, s = S.settings;
  if (el.dataset.ld) return ldSync(el);
  if (el.dataset.in === 'payDate') { const f = el.form, L = findL(f.id.value); if (!L) return; const td = today(); let d = sDate(el.value, td); if (d > td) d = td; if (d < L.start) d = L.start; el.value = d; $('#paychips').innerHTML = payChips(L, d); if (f.kind.value === 'settle') { const po = payoffOf(L, d); if (po) f.amount.value = centsIn(po.total); } return payHint(f); }
  if (el.dataset.in === 'msgLoan') { if (findL(el.value)) { UI.msgLoan = el.value; UI.tone = ''; UI.msgPid = ''; refreshComposer(); } return; }
  if (el.dataset.set) {
    const k = el.dataset.set, v = el.value, m = s.mora; let rer = false;
    if (k.startsWith('biz.')) s.biz[k.slice(4)] = sStr(v.trim(), k === 'biz.address' ? 200 : k === 'biz.phone' ? 30 : 80);
    else if (k === 'currency') { if (!isCur(v) || v === s.currency) return; if (S.loans.some(l => !l.demo)) { el.value = s.currency; return confirmBox(t('curConfirmQ', { c: v + ' · ' + CURS[v][0] }), t('curChange'), 'curDo', false, `data-v="${v}"`, t('curConfirmText')); } setCurrency(v); rer = true; }
    else if (k === 'dec') { s.dec = v === '2' ? 2 : 0; rer = true; }
    else if (k === 'dial') { s.dial = v.replace(/\D/g, '').slice(0, 4); el.value = s.dial; }
    else if (k === 'mora.on') { m.on = el.checked; rer = true; }
    else if (k === 'mora.type') { m.type = v === 'fixed' ? 'fixed' : 'pct'; m.value = m.type === 'pct' ? 500 : 0; rer = true; }
    else if (k === 'mora.value') { const c = toCents(v); if (c >= 0) m.value = Math.min(c, m.type === 'pct' ? 10000 : MAX_UNITS * 100); el.value = centsIn(m.value); }
    else if (k === 'mora.grace') { m.grace = sInt(v, 0, 60, 0); el.value = m.grace; }
    else return;
    persist(t('saved')); if (rer) render(); return;
  }
  if (el.dataset.in === 'logo') { const file = el.files && el.files[0]; if (!file) return; if (gated() && !licensed()) return proOpen('logo'); if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast(t('logoErr'), 'err'); const url = URL.createObjectURL(file), im = new Image(); im.onload = () => { const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); const data = sLogo(c.toDataURL('image/png')); if (!data) return toast(t('logoErr'), 'err'); s.biz.logo = data; persist(t('saved')); render(); }; im.onerror = () => { URL.revokeObjectURL(url); toast(t('logoErr'), 'err'); }; im.src = url; return; }
  if (el.dataset.in === 'import') { const file = el.files && el.files[0]; if (!file) return; if (file.size > 30e6) return toast(t('importErr'), 'err'); file.text().then(txt => { const d = JSON.parse(txt); if (!d || typeof d !== 'object' || d.app !== 'cuadre' || !d.settings || typeof d.settings !== 'object' || !Array.isArray(d.clients) || !Array.isArray(d.loans)) throw new Error('shape'); const n = sanitize(d); n.settings.onboarded = true; if (!n.settings.lang) n.settings.lang = lang(); if (!n.settings.since) n.settings.since = today(); ACT._pending = n; const have = S.loans.length; confirmBox(t('importWarn'), t('importData'), 'doImport', true, '', t('importCount', { a: n.clients.length, b: n.loans.length })); if (n.loans.length < have) { const w = document.createElement('p'); w.className = 'banner bad'; w.id = 'import-fewer'; w.textContent = t('importFewer', { a: have, b: n.loans.length }); const sh = $('#modal .sheet'); sh.insertBefore(w, sh.lastElementChild); } }).catch(() => toast(t('importErr'), 'err')); el.value = ''; }
});
window.addEventListener('storage', ev => { if (ev.key !== LS_KEY) return; const was = licensed(); S = loadState(); bust(); checkLicense().then(() => { if (ED) return; if (was !== licensed()) closeModal(); if ($('#modal').hidden) render(); }); }); // another tab changed the data
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installEvt = ev; if (LOCKED) return; if (S.settings.onboarded ? !ED && $('#modal').hidden : !document.activeElement || document.activeElement.tagName !== 'INPUT') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; if (S.settings.onboarded && !LOCKED && !ED) render(); });
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => { if (document.hidden) { hiddenAt = Date.now(); return; } if (S.settings.pin && !LOCKED && hiddenAt && Date.now() - hiddenAt > 180000) { LOCKED = true; closeModal(); render(); } else dayTick(); }); // lock after 3 minutes away; refresh when the day changed

// The day changed with the app open: refresh what is on screen, unless the person is in the middle of something.
function dayTick() { if (today() === dayShown || LOCKED || ED || !S.settings.onboarded || !$('#modal').hidden) return; bust(); render(); }
setInterval(dayTick, 20000);

/* ---------- boot ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) { try { navigator.serviceWorker.register('sw.js'); } catch (e) { /* ignore */ } }
lastSec = location.hash.split('/')[1] || '';
{ const boot = () => render(); checkLicense().then(boot, boot); }
