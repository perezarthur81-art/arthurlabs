'use strict';
/* Clavuno PDF: the document is drawn on canvases (so any language renders) and wrapped in a minimal PDF. */
const PDFK = { W: 1240, H: 1754, M: 92 };

async function renderDocCanvases(doc, kind) {
  try { await Promise.all([document.fonts.load('700 20px "Bricolage Grotesque"'), document.fonts.load('400 20px Inter'), document.fonts.load('600 20px Inter')]); } catch (e) { /* fall back to system fonts */ }
  const { W, H, M } = PDFK, st = S.settings, biz = st.biz, cl = clientOf(doc), T = totals(doc), cur = doc.currency;
  const INK = '#0F1B2D', MUTED = '#5B6B82', LINE = '#DCE3EC', BRAND = '#0B6E8A', BAND = '#F1F5F9';
  const F = (w, size, fam) => `${w} ${size}px "${fam || 'Inter'}", system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
  const pages = []; let cv, ctx, y;
  const BOTTOM = H - M - 50;
  const newPage = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = H; ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.textBaseline = 'alphabetic'; pages.push(cv); y = M; };
  const text = (s, x, yy, font, color, align) => { ctx.font = font; ctx.fillStyle = color || INK; ctx.textAlign = align || 'left'; ctx.fillText(s, x, yy); };
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
  const rrect = (x, yy, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, yy, w, h, r); else ctx.rect(x, yy, w, h); ctx.fill(); };
  const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  newPage();
  /* header: business on the left, document title on the right */
  let yl = M;
  if (biz.logo) { const im = await loadImg(biz.logo); if (im && im.width && im.height) { const k = Math.min(230 / im.width, 110 / im.height, 1.5); ctx.drawImage(im, M, M, im.width * k, im.height * k); yl = M + im.height * k + 22; } }
  const leftW = 560;
  for (const l of wrap(biz.name || 'Clavuno', F(700, 34, 'Bricolage Grotesque'), leftW)) { yl += 38; text(l, M, yl, F(700, 34, 'Bricolage Grotesque')); }
  yl += 8;
  for (const part of [biz.taxId && (t('taxId') + ': ' + biz.taxId), biz.phone, biz.email, biz.address].filter(Boolean)) for (const l of wrap(part, F(400, 21), leftW)) { yl += 29; text(l, M, yl, F(400, 21), MUTED); }
  let yr = M + 46;
  text((kind === 'quote' ? t('quote') : t('invoice')).toUpperCase(), W - M, yr, F(800, 50, 'Bricolage Grotesque'), BRAND, 'right');
  yr += 42; text(doc.number, W - M, yr, F(600, 26), INK, 'right');
  yr += 14;
  for (const row of [[t('date'), fmtDate(doc.date)], kind === 'quote' ? [t('validUntil'), fmtDate(doc.validUntil)] : [t('dueDate'), fmtDate(doc.dueDate)]]) { yr += 31; text(row[0] + ': ' + row[1], W - M, yr, F(400, 21), MUTED, 'right'); }
  if (kind === 'invoice' && invStatus(doc) === 'paid') { yr += 44; const lbl = t('stPaid').toUpperCase(); ctx.font = F(700, 20); const tw = ctx.measureText(lbl).width + 32; ctx.fillStyle = '#E6F4EC'; rrect(W - M - tw, yr - 26, tw, 36, 18); text(lbl, W - M - 16, yr, F(700, 20), '#1B7F4B', 'right'); }
  y = Math.max(yl, yr) + 40;
  ctx.fillStyle = LINE; ctx.fillRect(M, y, W - 2 * M, 2); y += 44;

  /* client */
  text(t('billTo').toUpperCase(), M, y, F(600, 17), MUTED); y += 36;
  wrap(cl ? cl.name : '—', F(700, 28, 'Bricolage Grotesque'), W - 2 * M).forEach((l, i) => { if (i) y += 34; text(l, M, y, F(700, 28, 'Bricolage Grotesque')); });
  if (cl) for (const part of [cl.company, cl.taxId && (t('taxId') + ': ' + cl.taxId), cl.phone, cl.email, cl.address].filter(Boolean)) for (const l of wrap(part, F(400, 21), W - 2 * M)) { y += 29; text(l, M, y, F(400, 21), MUTED); }
  y += 46;

  /* lines table */
  const xAmt = W - M - 16, xPrice = xAmt - 210, xQty = xPrice - 200, descW = xQty - 110 - (M + 16);
  const head = () => { ctx.fillStyle = BAND; ctx.fillRect(M, y, W - 2 * M, 50); text(t('concept').toUpperCase(), M + 16, y + 32, F(600, 17), MUTED); text(t('qty').toUpperCase(), xQty, y + 32, F(600, 17), MUTED, 'right'); text(t('price').toUpperCase(), xPrice, y + 32, F(600, 17), MUTED, 'right'); text(t('amount').toUpperCase(), xAmt, y + 32, F(600, 17), MUTED, 'right'); y += 50; };
  head();
  for (const l of doc.lines) {
    const nm = wrap(l.name, F(600, 22), descW), ds = l.desc ? wrap(l.desc, F(400, 19), descW) : [];
    const h = 22 + nm.length * 30 + ds.length * 26 + 14;
    if (y + h > BOTTOM) { newPage(); head(); }
    let yy = y + 22;
    nm.forEach((s, i) => { yy += i ? 30 : 22; text(s, M + 16, yy, F(600, 22)); });
    const yNum = y + 44;
    text(fmtNum(l.qty), xQty, yNum, F(400, 21), INK, 'right'); text(money(l.price, cur), xPrice, yNum, F(400, 21), INK, 'right'); text(money(roundC(l.qty * l.price, cur), cur), xAmt, yNum, F(600, 21), INK, 'right');
    ds.forEach(s => { yy += 26; text(s, M + 16, yy, F(400, 19), MUTED); });
    y += h; ctx.fillStyle = LINE; ctx.fillRect(M, y, W - 2 * M, 1);
  }

  /* totals */
  const rows = [[t('subtotal'), money(T.sub, cur)]];
  if (T.disc > 0) rows.push([t('discount') + ' (' + fmtNum(doc.discount) + '%)', '−' + money(T.disc, cur)]);
  if (doc.taxRate > 0) rows.push([(doc.taxName || t('tax')) + ' (' + fmtNum(doc.taxRate) + '%)', money(T.tax, cur)]);
  const extra = kind === 'invoice' && T.paid > 0 ? [[t('paid'), '−' + money(T.paid, cur)], [t('balance'), money(T.balance, cur)]] : [];
  const need = 30 + rows.length * 38 + 74 + extra.length * 38;
  if (y + need > BOTTOM) newPage();
  y += 30; const tx = W - M - 520;
  for (const r of rows) { y += 38; text(r[0], tx, y, F(400, 22), MUTED); text(r[1], xAmt, y, F(400, 22), INK, 'right'); }
  y += 22; ctx.fillStyle = BRAND; rrect(tx - 20, y, 540, 62, 10);
  text(t('total').toUpperCase(), tx, y + 41, F(700, 22), '#fff'); text(money(T.total, cur), xAmt, y + 42, F(700, 28, 'Bricolage Grotesque'), '#fff', 'right'); y += 62;
  extra.forEach((r, i) => { y += 38; text(r[0], tx, y, F(i ? 700 : 400, 22), i ? INK : MUTED); text(r[1], xAmt, y, F(i ? 700 : 400, 22), INK, 'right'); });

  /* notes and footer text */
  const block = (label, body, color) => {
    const ls = wrap(body, F(400, 21), W - 2 * M);
    if (y + 80 + Math.min(ls.length, 3) * 30 > BOTTOM) newPage();
    y += 56; if (label) { text(label.toUpperCase(), M, y, F(600, 17), MUTED); y += 8; }
    for (const s of ls) { if (y + 30 > BOTTOM) newPage(); y += 30; text(s, M, y, F(400, 21), color || INK); }
  };
  if (doc.notes) block(t('notes'), doc.notes);
  if (st.terms) block('', st.terms, MUTED);

  pages.forEach((c, i) => { const g = c.getContext('2d'); g.textBaseline = 'alphabetic'; g.fillStyle = LINE; g.fillRect(M, H - M - 8, W - 2 * M, 1); g.font = F(400, 17); g.fillStyle = MUTED; g.textAlign = 'left'; g.fillText(t('pageOf', { n: i + 1, m: pages.length }), M, H - M + 22); if (!licensed()) { g.textAlign = 'right'; g.fillText(t('madeWith'), W - M, H - M + 22); } });
  return pages;
}

const canvasJpeg = cv => new Promise((res, rej) => cv.toBlob(b => (b ? b.arrayBuffer().then(a => res(new Uint8Array(a)), rej) : rej(new Error('jpeg'))), 'image/jpeg', 0.9));

/* Minimal PDF 1.4 writer: one full-page JPEG per A4 page. */
function pdfFromJpegs(imgs) {
  const enc = new TextEncoder(), parts = [], offsets = []; let len = 0;
  const push = d => { const u = typeof d === 'string' ? enc.encode(d) : d; parts.push(u); len += u.length; };
  const obj = (n, body) => { offsets[n] = len; push(n + ' 0 obj\n'); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%âãÏÓ\n');
  const n = imgs.length, kids = imgs.map((_, i) => (3 + i * 3) + ' 0 R').join(' ');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>'));
  imgs.forEach((im, i) => {
    const p = 3 + i * 3, content = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    obj(p, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>'));
    obj(p + 1, () => push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'));
    obj(p + 2, () => { push('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.bytes.length + ' >>\nstream\n'); push(im.bytes); push('\nendstream'); });
  });
  const total = 2 + n * 3, xref = len;
  push('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
  for (let i = 1; i <= total; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(parts, { type: 'application/pdf' });
}

async function buildDocPdf(doc, kind) {
  const cvs = await renderDocCanvases(doc, kind), imgs = [];
  for (const c of cvs) imgs.push({ bytes: await canvasJpeg(c), w: c.width, h: c.height });
  const name = (doc.number || kind).replace(/[^\w.-]+/g, '_') + '.pdf';
  return new File([pdfFromJpegs(imgs)], name, { type: 'application/pdf' });
}
