'use strict';
/* Cuadre engine: all the loan math, in whole cents (BigInt where a product could overflow). Pure functions, no DOM.
   The same file is loaded by the tests in Node, where it is checked against an independent Python implementation. */
const ENG = (() => {
  const B = BigInt;
  const divCeil = (a, b) => (a + b - 1n) / b;      // a >= 0, b > 0
  const divHalf = (a, b) => (2n * a + b) / (2n * b); // half up
  const p2 = n => String(n).padStart(2, '0');
  const parts = s => [+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10)];
  const dn = s => { const p = parts(s); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5); };
  const fromDn = n => { const d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); };
  const dow = n => (((n + 4) % 7) + 7) % 7;         // 0 = Sunday
  const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ymAdd = (y, m, k, day) => { const tot = y * 12 + (m - 1) + k, ny = Math.floor(tot / 12), nm = (tot % 12) + 1; return ny + '-' + p2(nm) + '-' + p2(Math.min(day, dim(ny, nm))); };
  const TYPES = ['fixed', 'balance', 'interest'], FREQS = ['daily', 'weekly', 'biweekly', 'monthly'];
  const LIM = { P: 1e11, BP: 100000, N: 1000 };

  /* Due dates. daily: every day (Sundays skipped if noSun); weekly: every 7 days;
     biweekly: twice a month (same day and that day + 15, e.g. the 15th and the 30th); monthly: same day each month. */
  function dueDates(L) {
    const out = [], n = L.n, p = parts(L.first);
    if (L.freq === 'daily') { let d = dn(L.first); for (let k = 0; k < n; k++) { if (L.noSun && dow(d) === 0) d++; out.push(fromDn(d)); d++; } }
    else if (L.freq === 'weekly') { const d = dn(L.first); for (let k = 0; k < n; k++) out.push(fromDn(d + 7 * k)); }
    else if (L.freq === 'biweekly') { const a = p[2] <= 15 ? p[2] : p[2] - 15, p0 = p[2] <= 15 ? 0 : 1; for (let k = 0; k < n; k++) { const pos = p0 + k; out.push(ymAdd(p[0], p[1], pos >> 1, pos % 2 ? a + 15 : a)); } }
    else for (let k = 0; k < n; k++) out.push(ymAdd(p[0], p[1], k, p[2]));
    return out;
  }
  function defaultFirst(start, freq, noSun) {
    if (freq === 'daily') { let d = dn(start) + 1; if (noSun && dow(d) === 0) d++; return fromDn(d); }
    if (freq === 'weekly') return fromDn(dn(start) + 7);
    if (freq === 'biweekly') return fromDn(dn(start) + 15);
    const p = parts(start); return ymAdd(p[0], p[1], 1, p[2]);
  }

  /* Payment plan. Returns { rows:[{k,due,amount,interest,capital}], cuota, total, interestTotal, last } or { error }.
     dec 0: the installment is rounded UP to a whole unit; dec 2: to the nearest cent.
     The last installment absorbs the rounding, so the rows always add up to the total. */
  function schedule(L) {
    if (!TYPES.includes(L.type) || !FREQS.includes(L.freq) || !Number.isInteger(L.principal) || !Number.isInteger(L.rateBp) || !Number.isInteger(L.n)) return { error: 'bad' };
    if (L.principal < 1 || L.principal > LIM.P || L.rateBp < 0 || L.rateBp > LIM.BP || L.n < 1 || L.n > LIM.N) return { error: 'bad' };
    const U = L.dec === 0 ? 100n : 1n, P = B(L.principal), bp = B(L.rateBp), n = L.n, N = B(n);
    const rCuota = (num, den) => (L.dec === 0 ? divCeil(num, den * 100n) * 100n : divHalf(num, den));
    const rUnit = (num, den) => divHalf(num, den * U) * U;
    const amts = [], ints = [];
    const flat = (T, I) => { // equal installments of a known total; interest spread in proportion
      let c = rCuota(T, N);
      if (c * (N - 1n) >= T) c = (T / (N * U)) * U;
      if (c <= 0n) return false;
      let cum = 0n, prev = 0n;
      for (let k = 1; k <= n; k++) { const a = k < n ? c : T - c * (N - 1n); cum += a; let ci = k < n ? divCeil(I * cum, T * U) * U : I; if (ci > I) ci = I; amts.push(a); ints.push(ci - prev); prev = ci; }
      return true;
    };
    if (L.type === 'fixed' || (L.type === 'balance' && bp === 0n)) {
      let T = P + (L.type === 'fixed' ? divHalf(P * bp, 10000n) : 0n);
      if (L.dec === 0) T = divCeil(T, 100n) * 100n;
      if (!flat(T, T - P)) return { error: 'small' };
    } else if (L.type === 'balance') {
      // A rounded-up installment can use up the balance before the last one: then it is lowered one unit at a time and the last installment absorbs the difference.
      const g = (10000n + bp) ** N, h = 10000n ** N; let c = rCuota(P * bp * g, 10000n * (g - h)), done = false;
      for (let tries = 0; tries < 60 && c > 0n && !done; tries++, c -= U) {
        amts.length = 0; ints.length = 0; let bal = P; done = true;
        for (let k = 1; k <= n; k++) {
          const i = rUnit(bal * bp, 10000n); let cap = k < n ? c - i : bal;
          if (cap < 0n) cap = 0n; if (cap > bal) cap = bal;
          bal -= cap; amts.push(cap + i); ints.push(i);
          if (k < n && bal === 0n) { done = false; break; }
        }
      }
      if (!done) return { error: c > 0n ? 'close' : 'small' };
    } else {
      const i = L.dec === 0 ? divCeil(P * bp, 1000000n) * 100n : divHalf(P * bp, 10000n);
      if (i === 0n && n > 1) return { error: 'rate' };
      for (let k = 1; k <= n; k++) { amts.push(k < n ? i : P + i); ints.push(i); }
    }
    if (amts.some(a => a <= 0n)) return { error: 'small' };
    const dues = dueDates(L), rows = amts.map((a, k) => ({ k: k + 1, due: dues[k], amount: Number(a), interest: Number(ints[k]), capital: Number(a - ints[k]) }));
    const total = rows.reduce((s, r) => s + r.amount, 0), interestTotal = rows.reduce((s, r) => s + r.interest, 0);
    return { rows, cuota: rows[0].amount, last: rows[n - 1].amount, total, interestTotal };
  }

  /* Where a loan stands on a date. Payments are replayed in date order:
     1) installments already due, oldest first (interest, then capital); 2) pending late fee; 3) future installments (advance).
     A 'settle' or 'renew' entry closes the loan: it pays what is due, the late fee, the capital still out and, for per-period
     interest, the interest of the period in course; interest of periods not started is written off.
     Late fee (optional): charged once per installment still unpaid after the grace days, on the unpaid part.
     Interest-only loans: what a payment leaves after 1), 2) and the interest of the period in course pays PRINCIPAL down;
     the interest of the following periods is recalculated on the new principal (and the last installment shrinks with it). */
  function state(L, asOf, sc) {
    sc = sc || schedule(L); if (sc.error) return null;
    const U = L.dec === 0 ? 100n : 1n, mo = L.mora && L.mora.on ? L.mora : null, aN = dn(asOf), startN = dn(L.start);
    const rows = sc.rows.map(r => ({ k: r.k, due: r.due, dueN: dn(r.due), amount: r.amount, interest: r.interest, capital: r.capital, pInt: 0, pCap: 0, offInt: 0, offCap: 0, mora: 0, moraPaid: 0, moraOff: 0, assessed: false, paidOn: '' }));
    const rem = r => r.amount - r.pInt - r.pCap - r.offInt - r.offCap, moraRem = r => r.mora - r.moraPaid - r.moraOff;
    const moraCalc = x => (mo.type === 'fixed' ? mo.value : Number(divHalf(B(x) * B(mo.value), 10000n * U) * U));
    const intOf = prin => Number(L.dec === 0 ? divCeil(B(prin) * B(L.rateBp), 1000000n) * 100n : divHalf(B(prin) * B(L.rateBp), 10000n));
    let settled = '', prepaid = 0;
    const assess = D => { if (!mo || settled) return; for (const r of rows) if (!r.assessed && r.dueN + mo.grace < D) { r.assessed = true; const x = rem(r); if (x > 0) r.mora = moraCalc(x); } };
    const pays = (L.payments || []).map((p, i) => ({ p, i })).filter(x => !x.p.void && x.p.date <= asOf).sort((a, b) => (a.p.date < b.p.date ? -1 : a.p.date > b.p.date ? 1 : a.i - b.i));
    const allocs = Object.create(null); // payment ids come from stored data: no prototype to collide with
    for (const { p } of pays) {
      const A = { int: 0, cap: 0, mora: 0, off: 0, extra: 0, rows: [], after: 0, prepay: 0, newInt: 0 }; allocs[p.id] = A;
      if (settled) { A.extra = p.amount; continue; }
      const D = dn(p.date); assess(D);
      let m = p.amount;
      const put = (r, capOnly) => {
        let got = 0;
        if (!capOnly) { const x = Math.min(m, r.interest - r.pInt - r.offInt); r.pInt += x; m -= x; A.int += x; got += x; }
        const y = Math.min(m, r.capital - r.pCap - r.offCap); r.pCap += y; m -= y; A.cap += y; got += y;
        if (got > 0) { A.rows.push(r.k); if (rem(r) === 0 && !r.paidOn) r.paidOn = p.date; }
      };
      if (p.kind === 'waive') { for (const r of rows) { const x = Math.min(m, moraRem(r)); r.moraOff += x; m -= x; A.off += x; } }
      else {
        for (const r of rows) if (r.dueN <= D) put(r, false);
        for (const r of rows) { const x = Math.min(m, moraRem(r)); r.moraPaid += x; m -= x; A.mora += x; }
        if (p.kind === 'settle' || p.kind === 'renew') {
          let first = true;
          rows.forEach((r, i) => { if (r.dueN <= D) return; const from = i === 0 ? startN : rows[i - 1].dueN, full = L.type === 'fixed' || (first && from < D); first = false; put(r, !full); });
          for (const r of rows) { const a = r.interest - r.pInt - r.offInt, b = r.capital - r.pCap - r.offCap, c = moraRem(r); r.offInt += a; r.offCap += b; r.moraOff += c; A.off += a + b + c; if (!r.paidOn) r.paidOn = p.date; }
          settled = p.date;
        } else if (L.type === 'interest') {
          const ci = rows.findIndex(r => r.dueN > D);
          if (ci >= 0 && m > 0) {
            const cur = rows[ci], last = rows[rows.length - 1], started = (ci === 0 ? startN : rows[ci - 1].dueN) < D;
            if (started) { const x = Math.min(m, cur.interest - cur.pInt - cur.offInt); if (x > 0) { cur.pInt += x; m -= x; A.int += x; A.rows.push(cur.k); } }
            const y = Math.min(m, last.capital - last.pCap - last.offCap);
            if (y > 0) {
              last.capital -= y; last.amount = last.interest + last.capital; prepaid += y; m -= y; A.cap += y; A.prepay = y; // the principal row itself shrinks
              A.newInt = intOf(last.capital - last.pCap - last.offCap);
              for (let j = started ? ci + 1 : ci; j < rows.length; j++) { rows[j].interest = A.newInt; rows[j].amount = rows[j].interest + rows[j].capital; }
            }
            for (const r of rows) if (rem(r) === 0 && !r.paidOn && r.dueN > D) r.paidOn = p.date;
          }
        } else for (const r of rows) if (r.dueN > D) put(r, false);
      }
      A.extra = m; A.after = rows.reduce((s, r) => s + rem(r) + moraRem(r), 0);
    }
    if (!settled) assess(aN);
    const T = { rows, allocs, settled, paidInt: 0, paidCap: 0, paidMora: 0, moraPending: 0, discount: 0, remaining: 0, remCap: 0, remInt: 0, overdue: 0, overdueDays: 0, overdueCount: 0, todayAmt: 0, next: null, dueCount: 0, lateCount: 0, maxLate: 0, total: sc.total };
    for (const r of rows) {
      const x = rem(r); r.rem = x; r.paid = r.pInt + r.pCap; r.moraRem = moraRem(r);
      T.paidInt += r.pInt; T.paidCap += r.pCap; T.paidMora += r.moraPaid; T.moraPending += r.moraRem; T.discount += r.offInt + r.offCap;
      T.remaining += x; T.remCap += r.capital - r.pCap - r.offCap; T.remInt += r.interest - r.pInt - r.offInt;
      r.st = x === 0 ? 'paid' : r.dueN < aN ? 'late' : r.dueN === aN ? 'today' : r.paid > 0 ? 'partial' : 'pending';
      r.lateDays = r.st === 'late' ? aN - r.dueN : 0;
      if (r.st === 'late') { T.overdue += x; T.overdueCount++; if (aN - r.dueN > T.overdueDays) T.overdueDays = aN - r.dueN; }
      if (r.st === 'today') T.todayAmt += x;
      if (x > 0 && !T.next) T.next = r;
      if (r.dueN <= aN && !(settled && r.dueN > dn(settled))) { // installments that already came due: were they on time?
        const late = r.paidOn ? Math.max(0, dn(r.paidOn) - r.dueN) : x > 0 ? aN - r.dueN : 0;
        T.dueCount++; if (late > 0) T.lateCount++; if (late > T.maxLate) T.maxLate = late;
      }
    }
    T.paidCap += prepaid; T.prepaid = prepaid;
    T.total = rows.reduce((s, r) => s + r.amount, prepaid); T.interestTotal = rows.reduce((s, r) => s + r.interest, 0); // as they stand now (principal paid down lowers them)
    T.paid = T.paidInt + T.paidCap;
    T.dueNow = T.overdue + T.todayAmt + T.moraPending;
    T.status = settled || (T.remaining === 0 && T.moraPending === 0) ? 'paid' : T.overdue > 0 || T.remaining === 0 ? 'late' : T.todayAmt > 0 ? 'today' : 'ok';
    return T;
  }

  /* What it takes to close the loan on a date. */
  function payoff(L, asOf, sc) {
    const probe = Object.assign({}, L, { payments: (L.payments || []).filter(p => !p.void && p.date <= asOf).concat([{ id: '~payoff', kind: 'settle', date: asOf, amount: Number.MAX_SAFE_INTEGER }]) });
    const st = state(probe, asOf, sc); if (!st) return null;
    const a = st.allocs['~payoff']; if (a.extra === Number.MAX_SAFE_INTEGER) return { total: 0, int: 0, cap: 0, mora: 0, discount: 0 };
    return { total: a.int + a.cap + a.mora, int: a.int, cap: a.cap, mora: a.mora, discount: a.off };
  }

  /* Payment behaviour from a client's loan states: 'new' | 'good' | 'sometimes' | 'risky'. */
  const RISK_DAYS = { daily: 5, weekly: 14, biweekly: 21, monthly: 30 };
  function behavior(items) { // items: [{ freq, st }]
    let due = 0, late = 0, risky = false, overdue = false;
    for (const it of items) { due += it.st.dueCount; late += it.st.lateCount; if (it.st.overdue > 0) { overdue = true; if (it.st.overdueDays >= RISK_DAYS[it.freq]) risky = true; } }
    if (!due) return 'new';
    if (risky || (due >= 4 && late * 2 > due)) return 'risky';
    if (overdue || late * 100 > due * 15) return 'sometimes';
    return 'good';
  }
  return { schedule, state, payoff, behavior, dueDates, defaultFirst, dn, fromDn, dow, TYPES, FREQS, LIM };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ENG;
