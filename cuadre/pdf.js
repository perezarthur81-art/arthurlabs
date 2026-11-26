'use strict';
/* Cuadre PDF: receipts and payment plans are drawn on canvases (so any language renders) and wrapped in a minimal PDF. */
const PDFC = { INK: '#14213D', MUTED: '#5A6478', LINE: '#DCE0EA', NAVY: '#14213D', AMBER: '#F5A524', SOFT: '#FEF2D9', BAND: '#F2F4F8', OK: '#17794A', BAD: '#C4262E' };
const PF = (w, size, fam) => `${w} ${size}px "${fam || 'Inter'}", system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
const PD = 'Bricolage Grotesque';
async function pdfFonts() { try { await Promise.all([document.fonts.load('700 20px "Bricolage Grotesque"'), document.fonts.load('800 20px "Bricolage Grotesque"'), document.fonts.load('400 20px Inter'), document.fonts.load('600 20px Inter'), document.fonts.load('700 20px Inter')]); } catch (e) { /* fall back to system fonts */ } }
function pdfPen(ctx) {
  const text = (s, x, y, font, color, align) => { ctx.font = font; ctx.fillStyle = color || PDFC.INK; ctx.textAlign = align || 'left'; ctx.fillText(String(s), x, y); };
  const width = (s, font) => { ctx.font = font; return ctx.measureText(String(s)).width; };
  const wrap = (s, font, maxW) => {
    ctx.font = font; const out = [];
    for (const para of String(s || '').split(/\r?\n/)) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let w = word;
        while (ctx.measureText(w).width > maxW) { // a single word longer than the column: break by characters
          let i = 1; while (i < w.length && ctx.measureText((line ? line + ' ' : '') + w.slice(0, i + 1)).width <= maxW) i++;
          if (line && ctx.measureText(line + ' ' + w.slice(0, i)).width <= maxW) { out.push(line + ' ' + w.slice(0, i)); } else { if (line) out.push(line); out.push(w.slice(0, i)); }
          line = ''; w = w.slice(i);
        }
        if (!w) continue;
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width <= maxW) line = test; else { out.push(line); line = w; }
      }
      out.push(line);
    }
    while (out.length > 1 && out[out.length - 1] === '') out.pop();
    return out;
  };
  const fit = (s, font, maxW) => { s = String(s); if (width(s, font) <= maxW) return s; while (s.length > 1 && width(s + '…', font) > maxW) s = s.slice(0, -1); return s + '…'; };
  const rrect = (x, y, w, h, r, color) => { ctx.fillStyle = color; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); };
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  return { text, width, wrap, fit, rrect, rect };
}
const pdfImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
const pdfLogo = async () => { const l = S.settings.biz.logo; if (!l || (gated() && !licensed())) return null; const im = await pdfImg(l); return im && im.width && im.height ? im : null; };
function pdfCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.textBaseline = 'alphabetic'; return [cv, ctx]; }
// Navy band with the business on the left and the document title on the right. Returns the y below it.
function pdfHeader(ctx, W, M, logo, title, sub) {
  const P = pdfPen(ctx), biz = S.settings.biz, H = 170; P.rect(0, 0, W, H, PDFC.NAVY); P.rect(0, H, W, 8, PDFC.AMBER);
  let x = M; if (logo) { const k = Math.min(104 / logo.width, 104 / logo.height); P.rrect(M, 27, 116, 116, 14, '#fff'); ctx.drawImage(logo, M + 58 - logo.width * k / 2, 85 - logo.height * k / 2, logo.width * k, logo.height * k); x = M + 140; }
  const rightW = Math.max(P.width(title, PF(700, 22)), P.width(sub || '', PF(700, 30, PD))) + 30, nameW = W - M - x - rightW;
  const name = P.wrap(biz.name || 'Cuadre', PF(700, 36, PD), nameW).slice(0, 2); let y = name.length > 1 ? 70 : 92;
  name.forEach((l, i) => { P.text(i === 1 && name.length === 2 ? P.fit(l, PF(700, 36, PD), nameW) : l, x, y, PF(700, 36, PD), '#fff'); y += 42; });
  if (biz.phone) P.text(P.fit(biz.phone, PF(400, 20), nameW), x, y - 8, PF(400, 20), '#C9D2E6');
  P.text(title.toUpperCase(), W - M, 78, PF(700, 22), PDFC.AMBER, 'right'); if (sub) P.text(sub, W - M, 118, PF(700, 30, PD), '#fff', 'right');
  return H + 8;
}

/* Receipt: one page as tall as its content. */
async function renderReceipt(L, p) {
  await pdfFonts();
  const W = 900, M = 60, st = stOf(L), A = st.allocs[p.id] || { int: 0, cap: 0, mora: 0, after: 0, rows: [], prepay: 0, newInt: 0 }, c = clientOf(L), logo = await pdfLogo(), biz = S.settings.biz;
  const [cv, ctx] = pdfCanvas(W, 2400), P = pdfPen(ctx), C = PDFC;
  let y = pdfHeader(ctx, W, M, logo, t('rcTitle'), p.num || '');
  if (biz.address) { y += 34; for (const l of P.wrap(biz.address, PF(400, 19), W - 2 * M).slice(0, 2)) { P.text(l, M, y, PF(400, 19), C.MUTED); y += 26; } y -= 26; }
  y += 50;
  const pair = (label, value, x, w) => { P.text(label.toUpperCase(), x, y, PF(600, 15), C.MUTED); const ls = P.wrap(value || '—', PF(600, 23), w).slice(0, 2); ls.forEach((l, i) => P.text(l, x, y + 32 + i * 28, PF(600, 23))); return ls.length; };
  const half = (W - 2 * M - 30) / 2;
  let n1 = pair(t('client'), c ? c.name : '—', M, half), n2 = pair(t('date'), fmtDate(p.date), M + half + 30, half); y += 44 + Math.max(n1, n2) * 28 + 14;
  n1 = pair(t('loan'), L.num + ' · ' + t('ty_' + L.type) + ' · ' + t('fq_' + L.freq), M, half); n2 = pair(t('docId'), c && c.doc ? c.doc : '—', M + half + 30, half); y += 44 + Math.max(n1, n2) * 28 + 20;
  P.rrect(M, y, W - 2 * M, 150, 18, C.SOFT);
  P.text((p.kind === 'renew' ? t('rcRenewed') : t('rcReceived')).toUpperCase(), M + 28, y + 46, PF(700, 17), '#7A5200');
  P.text(money(p.amount), M + 28, y + 116, PF(800, 62, PD), C.NAVY); y += 150 + 46;
  const line = (label, value, bold, color) => { P.text(label, M, y, PF(bold ? 700 : 400, bold ? 25 : 22), bold ? C.INK : C.MUTED); P.text(value, W - M, y, PF(bold ? 700 : 600, bold ? 27 : 22, bold ? PD : 'Inter'), color || C.INK, 'right'); y += bold ? 46 : 38; };
  if (A.cap - A.prepay > 0) line(t('capital'), money(A.cap - A.prepay));
  if (A.int > 0) line(t('interest'), money(A.int));
  if (A.mora > 0) line(t('mora'), money(A.mora));
  if (A.prepay > 0) { line(t('rcPrepay'), money(A.prepay)); if (A.after > 0) line(t('rcNewInt'), money(A.newInt)); }
  if (A.off > 0 && (p.kind === 'settle' || p.kind === 'renew')) line(t('discount'), money(A.off));
  if (A.rows && A.rows.length) line(t('rcInstallments'), A.rows.length > 8 ? '#' + A.rows[0] + ' – #' + A.rows[A.rows.length - 1] : A.rows.map(k => '#' + k).join(', '));
  y -= 12; P.rect(M, y, W - 2 * M, 2, C.LINE); y += 50;
  line(t('balanceAfter'), money(A.after), true, A.after > 0 ? C.INK : C.OK);
  const lastLive = livePays(L).filter(x => x.kind !== 'waive').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).pop();
  if (A.after === 0 && !p.void) { P.rrect(M, y - 8, P.width(t('rcPaidOff'), PF(700, 20)) + 40, 44, 22, '#E2F3EA'); P.text(t('rcPaidOff'), M + 20, y + 21, PF(700, 20), C.OK); y += 62; }
  else if (lastLive && lastLive.id === p.id && st.next && st.status !== 'paid') { P.text(t('nextDue') + ': ' + fmtDate(st.next.due) + ' · ' + money(st.next.rem), M, y, PF(400, 21), C.MUTED); y += 40; }
  if (p.note && p.kind !== 'renew') { y += 6; for (const l of P.wrap(t('note') + ': ' + p.note, PF(400, 20), W - 2 * M).slice(0, 4)) { P.text(l, M, y, PF(400, 20), C.MUTED); y += 28; } }
  y += 30; P.rect(M, y, W - 2 * M, 1, C.LINE); y += 34;
  P.text(t('rcThanks'), M, y, PF(400, 18), C.MUTED); if (!licensed()) P.text(t('madeWith'), W - M, y, PF(400, 18), C.MUTED, 'right');
  y += 44;
  if (p.void) { ctx.save(); ctx.translate(W / 2, y / 2 + 60); ctx.rotate(-0.35); ctx.globalAlpha = 0.22; P.text(t('voided').toUpperCase(), 0, 0, PF(800, 130, PD), C.BAD, 'center'); ctx.restore(); }
  const [out, o2] = pdfCanvas(W, Math.ceil(y)); o2.drawImage(cv, 0, 0);
  return out;
}

/* Payment plan / statement: A4 pages. */
async function renderStatement(L) {
  await pdfFonts();
  const W = 1240, H = 1754, M = 84, st = stOf(L), sc = schedOf(L), c = clientOf(L), logo = await pdfLogo(), C = PDFC, pages = [], BOTTOM = H - M - 50;
  let cv, ctx, P, y;
  const cols = [[M + 14, 'left', '#'], [M + 90, 'left', t('due')], [M + 470, 'right', t('installment')], [M + 640, 'right', t('capital')], [M + 800, 'right', t('interest')], [M + 950, 'right', t('paid')], [W - M - 14, 'right', t('status')]];
  const head = () => { P.rect(M, y, W - 2 * M, 46, C.BAND); cols.forEach(k => P.text(k[2].toUpperCase(), k[0], y + 30, PF(600, 15), C.MUTED, k[1])); y += 46; };
  const newPage = first => { [cv, ctx] = pdfCanvas(W, H); P = pdfPen(ctx); pages.push(cv); y = first ? pdfHeader(ctx, W, M, logo, t('stTitle'), L.num) : M; };
  newPage(true); y += 56;
  P.text(t('client').toUpperCase(), M, y, PF(600, 16), C.MUTED); y += 38;
  P.text(P.fit(c ? c.name : '—', PF(700, 32, PD), W - 2 * M), M, y, PF(700, 32, PD));
  const sub = [c && c.doc, c && c.phone].filter(Boolean).join(' · '); if (sub) { y += 32; P.text(P.fit(sub, PF(400, 21), W - 2 * M), M, y, PF(400, 21), C.MUTED); }
  y += 44;
  const cells = [[t('lent'), money(L.principal)], [t('rate_' + L.type), pct(L.rateBp)], [t(L.type === 'interest' ? 'perPeriod' : 'installment'), money(st.prepaid > 0 ? st.rows[st.rows.length - 1].interest : sc.cuota) + ' × ' + L.n], [t('frequency'), t('fq_' + L.freq)], [t('startDate'), fmtDate(L.start)], [t('totalToCollect'), money(st.total)], [t('paid'), money(st.paid)], [t('balance'), money(st.status === 'paid' ? 0 : st.remaining)]];
  if (st.prepaid > 0) cells.push([t('prepaidCap'), money(st.prepaid)]);
  if (st.moraPending > 0) cells.push([t('moraPending'), money(st.moraPending)]);
  const cw = (W - 2 * M) / 4; P.rrect(M, y, W - 2 * M, Math.ceil(cells.length / 4) * 92 + 16, 16, C.BAND);
  cells.forEach((x, i) => { const cx = M + 24 + (i % 4) * cw, cy = y + 44 + Math.floor(i / 4) * 92; P.text(P.fit(x[0].toUpperCase(), PF(600, 14), cw - 30), cx, cy, PF(600, 14), C.MUTED); P.text(P.fit(x[1], PF(700, 23), cw - 30), cx, cy + 34, PF(700, 23)); });
  y += Math.ceil(cells.length / 4) * 92 + 16 + 40;
  head();
  for (const r of st.rows) {
    if (y + 44 > BOTTOM) { newPage(false); head(); }
    const lab = r.st === 'late' ? t('lateBy', { d: nOf(r.lateDays, 'day') }) : t(ROW_PILL[r.st][1]), col = r.st === 'paid' ? C.OK : r.st === 'late' ? C.BAD : C.INK;
    const v = [r.k, fmtDay(r.due), money(r.amount), money(r.capital), money(r.interest), r.paid > 0 ? money(r.paid) : '—', lab];
    cols.forEach((k, i) => P.text(v[i], k[0], y + 29, PF(i === 6 ? 600 : 400, 19), i === 6 ? col : C.INK, k[1]));
    y += 44; P.rect(M, y, W - 2 * M, 1, C.LINE);
  }
  if (y + 60 <= BOTTOM) { y += 44; P.text(t('stAsOf', { date: fmtDate(today()) }), M, y, PF(400, 18), C.MUTED); }
  pages.forEach((pg, i) => { const g = pg.getContext('2d'), Q = pdfPen(g); Q.rect(M, H - M - 8, W - 2 * M, 1, C.LINE); Q.text(t('pageOf', { n: i + 1, m: pages.length }), M, H - M + 22, PF(400, 17), C.MUTED); if (!licensed()) Q.text(t('madeWith'), W - M, H - M + 22, PF(400, 17), C.MUTED, 'right'); });
  return pages;
}

const canvasJpeg = cv => new Promise((res, rej) => cv.toBlob(b => (b ? b.arrayBuffer().then(a => res(new Uint8Array(a)), rej) : rej(new Error('jpeg'))), 'image/jpeg', 0.9));

/* Minimal PDF 1.4 writer: one full-page JPEG per page; the page takes the proportions of its image (150 px per inch). */
function pdfFromJpegs(imgs) {
  const enc = new TextEncoder(), parts = [], offsets = []; let len = 0;
  const push = d => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); len += u.length; };
  const obj = (n, body) => { offsets[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%âãÏÓ\n');
  const n = imgs.length, kids = imgs.map((_, i) => (3 + i * 3) + ' 0 R').join(' ');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>'));
  imgs.forEach((im, i) => {
    const p = 3 + i * 3, pw = (im.w * 0.48).toFixed(2), ph = (im.h * 0.48).toFixed(2), content = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
    obj(p, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>'));
    obj(p + 1, () => push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'));
    obj(p + 2, () => { push('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bytes.length + ' >>\nstream\n'); push(im.bytes); push('\nendstream'); });
  });
  const total = 2 + n * 3, xref = len;
  push('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
  for (let i = 1; i <= total; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(parts, { type: 'application/pdf' });
}
async function pdfFile(canvases, name) { const imgs = []; for (const c of canvases) imgs.push({ bytes: await canvasJpeg(c), w: c.width, h: c.height }); return new File([pdfFromJpegs(imgs)], name.replace(/[^\w.-]+/g, '_') + '.pdf', { type: 'application/pdf' }); }
async function buildReceiptPdf(L, p) { return pdfFile([await renderReceipt(L, p)], t('rcFile') + '-' + (p.num || p.date)); }
async function buildStatementPdf(L) { return pdfFile(await renderStatement(L), t('stFile') + '-' + (L.num || 'plan')); }
