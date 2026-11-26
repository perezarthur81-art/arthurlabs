'use strict';
/* Cuadre core: state, storage, money, dates, plan, PIN. Data lives only on this device. Amounts are whole cents; rates are basis points. */
const LS_KEY = 'cuadre:v1';
const LANGS = [['es', 'Español'], ['en', 'English'], ['fr', 'Français'], ['pt', 'Português']];
// currency -> [symbol shown, country used for number format and dial code]
const CURS = { DOP: ['RD$', 'DO'], USD: ['US$', 'US'], MXN: ['MX$', 'MX'], COP: ['COL$', 'CO'], PEN: ['S/', 'PE'], ARS: ['AR$', 'AR'], CLP: ['CLP$', 'CL'], GTQ: ['Q', 'GT'], HNL: ['L', 'HN'], NIO: ['C$', 'NI'], CRC: ['₡', 'CR'], PAB: ['B/.', 'PA'], BOB: ['Bs', 'BO'], PYG: ['₲', 'PY'], UYU: ['$U', 'UY'], VES: ['Bs.', 'VE'], BRL: ['R$', 'BR'], HTG: ['G', 'HT'], EUR: ['€', 'ES'], CAD: ['CA$', 'CA'] };
const DIALS = { DO: '1', US: '1', MX: '52', CO: '57', PE: '51', AR: '54', CL: '56', GT: '502', HN: '504', NI: '505', CR: '506', PA: '507', BO: '591', PY: '595', UY: '598', VE: '58', BR: '55', HT: '509', ES: '34', CA: '1' };
const PAY_KINDS = ['pay', 'settle', 'renew', 'waive'];
const MAX_UNITS = 1e9; // largest amount accepted in a field, in currency units

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const pad2 = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const LOCALHOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const today = () => (LOCALHOST && typeof window.__today === 'string' ? window.__today : iso(new Date())); // the fixed date is a test hook: it only works on localhost
const parseISO = s => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const addDays = (s, n) => ENG.fromDn(ENG.dn(s) + n);
const diffDays = (a, b) => ENG.dn(b) - ENG.dn(a);
const weekStart = s => addDays(s, -((ENG.dow(ENG.dn(s)) + 6) % 7)); // Monday

/* ---------- sanitizers (used for stored data and imported backups) ---------- */
const sStr = (v, max = 200) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').slice(0, max);
const sNum = (v, min = 0, max = 1e12, def = 0) => { v = Number(v); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
const sInt = (v, min, max, def) => Math.round(sNum(v, min, max, def));
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(parseISO(v).getTime()) && iso(parseISO(v)) === v && v >= '1990-01-01' && v <= '2200-12-31';
const sDate = (v, def) => (isDate(v) ? v : def);
const okId = v => typeof v === 'string' && /^[\w-]{1,64}$/.test(v) && !/^(__proto__|constructor|prototype)$/.test(v);
const sId = v => (okId(v) ? v : uid());
const sLogo = v => (typeof v === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 600000 ? v : '');
const sRef = v => (okId(v) ? v : '');
const sArr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const validLocale = l => { try { new Intl.NumberFormat(l); return typeof l === 'string' && l.length < 20; } catch (e) { return false; } };

/* ---------- Pro: sale config and license keys (closed list; only truncated SHA-256 fingerprints live here) ---------- */
const CFG = (() => { const w = (typeof window.CUADRE === 'object' && window.CUADRE) || {}; return { CHECKOUT_URL: typeof w.CHECKOUT_URL === 'string' && /^https:\/\/[\w.-]+\//.test(w.CHECKOUT_URL) ? w.CHECKOUT_URL : '', PRICE: sStr(w.PRICE || 'US$19', 20), FREE_CLIENTS: sInt(w.FREE_CLIENTS, 1, 1e6, 3), FREE_LOANS: sInt(w.FREE_LOANS, 1, 1e6, 5) }; })();
const LIC_HASHES = new Set('0099d52b20863b6ed84e00ce6ada2effb6868dfd00e3e77a50dbcb7b1de500e75a043657f03a564a01dc962d9f5b42fa929c01e5fc5da806c692070d01fa7bdbe20feca9e9460460ec3913b5538ebf33057380ea591152773e2906b1831a42a754688c5f08d759662e9b0d84ad1b094573f07be76c89f4cd099e9e775746544f4b8c0a99c4111023bfa692290b7270b324158e583bc70bd9eb9b4a34e6e2c8970c39ef56809500e196ed0c4446ccb1b08e59fd560c6c0e6fcebc90bc8de10c8dd3c0103436d60cd90cc37a7510a27c2569610cf9c6afe024dd546b100dc602aadf3a15e337d00efbb6c9db78db659c7a1020254290642b9abd75107ce4fce0953d30e506115574660c063b0fac6b11cbc8797bf900aa2d2411e1627805239254206d120533d445e75774807e12d38ace33097b4e75e01354bd1cfd73ab2ec8f11416b9b34d7cc65efddf1425e5cbc9012946ec0e15d09b5fa7c8bc7c59f115e40211c5e98e9c784716449a616c1621aae4051652c6c8d4881fd53d01184ed01d88903e9b018118c3b493cb8aa9935c7e19c68e93926aa8c866a21a9a62f8d010cb2ff3471ab78d3af9ddedef6ac71ae36b09960989e431c41c468bdaf953c88ef7171dc8d176e7d771953c6520090dd326f7109002b2202d1e16ebd8539de99e21016caaba3224d5daa6211dcf3cfe9ef7316b02211ea6479b2088d49b6821ea26aa2e813dfe2878238c0e15df2e1121e9e223a149acdfe5c154a2682482f04ece6733c1eb4c25033d28c0ae7ab43f932560c754028d466a64912687bd771de394a59fab26cfcdbae154c17c85df275f2eb15dc0edee80a42785326f72d3f1557ea12869569c5cff5cef82252c60b4f0ba93840e4ddf2cc5360187f881a24a342da83fa1374d1cf60ba22e5d9914160e60ebec8f2f006c52c3d7736623e12fd929a754759e9488502ff68cd338f77c86407e32dfba5a0599d9a6298d32f96bf6ca581aa0b5bb3342cd5b154bf043cce63390dc1ee14ac186785435db53d8563c57197e32372c59930d42791fe05437e342934df16f76c9a838d903c4d15c25ff38a538db89d3fa367d3aedf13911f7b878f463bc5abc391a6b8be1a15bec7587397e7476c9900188fe543a33904975613c0357913a9d1c6177784f00e5443aca97bd4749d1feaa863c772a45e29fc942ba283c8c01a10d57c64456963cdb64e18ad38acc1ae63e47945ab666efe8abbd3e8126b6ee2d5a9aaeb53f1941fc29a7b4a82da93f1dfd393b0e7a8cc4263f4999b1c8767441fc4c43730a9a79bf057ca84c44c304ace5df752b7bf9450b074052395a7c020d464276a19691e518c83e46a6f641c8683d3f6aac474770cf21b371c2bc3c47818f9d12b787167006480370affae59f8ae6d34812c23d052767dee96a493af4d6c0fba4b74e1f49408a06a16e71b93d124aa12d382bd9a6d2b18b4aff43fab0c1e989eabf4e8dc7118961070d568450bb01ebfd13879d399552e0f9e890218346f2a953c4dbf6d0cf54ed778e54170a6cd5c1fb3aaf6154f4d79ec67c6436cae8550a262771a954d6599d5654e70532af417844a956884530603408a07ac856e1fa5f0dcaa7037b525a40838daddf52dc26ea5a9243fb7b809711e65e5b4379f907506462f28f5bbce4786fbb33237a8d5bfb062347dc40635af75d9f6cc86e74d50a77cc5e267c2f04a833d0dd075e90fad6af1939cb011c5fa3bc32aec16a845a275fffbf54268b7296265460a512e161f107a5102060f866bb354fed65ab43610d8a373143f7edc22462068dc5f287c2a091e8627de1b2976fe761eff0631db3b54d0bf1d02344647200ef3779e2ab5362657809731722659a867e664376050d395edf2fae672e1e6d622022a8a1d0692a786c77db1d7592fa6ba2f9514987822a84cc6c2d181a6ce4aa0c0f996c3a1bb1ec7188c5a3116c59c032394bde831a9f6da7b61925612252d4af6dd41cf33cb16d10d8da716991a0f10075b71dfa716f1a42a88620208d1772136d9aa501c4a7ed05721c2ef679ed86bf2bbd72a84879731d69a70bfa72ca6f0f091106145c5972dc453b7bb1d25af573734e7800005e4b926d2d73a9b5cdcc3c5018d85c74501000a2a3710236c3768d9c60a2402bc5ead076eacdc6137130f9bd01772d20bc66ade07e997077eccfb0972cf1712a23784c5de9c0102c67efee7909e3bb657dee83b47f7b3b5c2670369cf1f4bb7d1758dd667de24a87417d5f0290a121ff7b82fa7f386a89d452fd596d717fd254bced433ecb47bf80448906243f3f05f57680b44ed724b50a2e44d4818f959051d9d52634cb834197177ca44b14859483b71c1bece38785641383d01be072c4b6813811849860822c45e7bbc7c184a99ee5af490ce02388853a5d895305fffbf72586ac18d0df4d7bfd529a86ca457e548830bceb628ac8b2ff4605ea06e1d28d4112d9dad46f751ecc8d43ee3bbb8667c705808e1525c05e9175d8f38f8ec55dddf011be8719a08ed39b717838667baf1e9555235c2e5315a3150f957d18425eab0faccb71984ab11d0e9f5a71ed4f98c1f0aa0f79e758b67d99dc47c9acf762c590b09b16b6a7f65bcfc138519bd4fcd83052168af9359bdad16c0c409df5f3e49cc259e27bce947ed14b9e435239561cea685a9e9ec8fe9fa762fa058bdc9ef7b131ade6039ce9fda1375bfc239aeafd81caa16319f9546f02cbcd64a18d2d5e7321d215897da5c18f7e1f7ee9f8887aa778d4401913400aef34a7ae0f68eca7ce5dc63aa7f3536cb02a15afe6c9a7fa6e74487b5dc7b20da8961195c12efbf4015baa5f70481bac935a58efaa76465efff45d7913fbad290dd9e819f89b1765ad30e8e9e4aed7fcbf40ad9c5d697cc98062359aae1eb59db9bc85cae4d6aec3844e569bb4d5d84caec7331f8f8d00a43becafad50f0590389000754b09882ca9250028020c8b1154142c600747a2efdb2b829f3ab1cd8edd0beb317dc93d49ec3ee5513b32d3874e7a5757651d9b35ac139e666881773ccb4de87fa96bec7f6d4eab50e93833b281afba62db5c2e0274fe6ce432c48b60c50e76f8351ad8029b7b3891876132d06c4e5b7c5fa0464f67002384ab9a79f5f82b49734f839baa3baa591e5db5e889fbbd4ec701e61ebee8662be58ba45eb0a1495964cbf90190710b134f43fdbc28047f3984dec434011c299c4008e91158ab216c30ce55b3195c7ec511ec583c9916f325c4a9147c640bdb3b4a558b2edd7c8101f0eb2d0c022dd06c8381f7a7f453887d31acba63bba80463929d8c8cbcc5a70a733bb725c54cc6e0d7f775c8716259fcc754dcbc923c5e13da4cf112a2ad9bf2ba7dcdcd060187cbd153d8f42a2d134f319e1b7a2866939d176715a3751a1984bd8d38ef9095e7dfad177e3d4a7946630cfa153a356d4c4bc46442302b73212d4f4bf5289d77a77e725d52d72d9b63b6ae3a506d5e27b2e3e429bab57b4d6b85f2d4e7147a18112d7a59754f9ff4c033d33d81c5cdbde29bdd87381d8d483b76d27bb2125f4db6618aa093c8f51ede0dc203c8b533f1dbb374ddd3c0497778a5c20decede4f09e72986c95837a5de8e3997a9fe45856cf3deb1cc8457a9a2c240c6df860d82841012d3dcaddfc797d29a71cea8362ce181f4de6ee6b89b549ce1cdd2e583084b106efce3505cf464fa7cfc521ae423e573e28a38b36dc7e62347645716fa9f01f3e64bf1bd79a1f57b7d4be6d1f67be03dcc703d57e6d26809f8a85d573d72e7b5e8f1ceac1b71bbbee866b51bbb2f09c9b696e924e8ee204229ff9e84e9bae7c6da0d256636ebea68813b8ba01c6b04d0ea868c0deb0c10a1cc06eb160717e9d4f42bc3b0eb1af75ba42d218c5c76eb61354d46cec3622ad4ec1ce6da8b38e0e3c7dfec2c0f18c980b3ac9e77ecacef3586d6e0bbbabeef1af2a333c1269098b6efcfdf9ba64e5fce6523f08164d379896daf6b9bf2301cf5c11ceb9ed514f2e9d549e9d9f237b84cf34e2ac20b0fb051f48ef422fa3f04312c137e08f596a2c6e56e2ce16e0af64e549d1889a26ed532f6f5289b08540c38eb24f7e6e46c7a7080a1da5ef95c06cd7d19efc8bd2df9a869a1b69721d146aefb0055814632d67646c2fc273b18f8760aa570dcfd036879f32782cd3b41fdcd78e22d03111223f8fdd708c8cb35f44b776fff03fc421144aac9761fffeb86efac85459ba741'.match(/.{20}/g));
const LIC_OK = new Set(); // keys already verified in this session
// Accepts the key with or without dashes, in lower case, with text around it, and with O/I/L typed by mistake (Crockford base32)
function licNorm(raw) {
  raw = String(raw == null ? '' : raw);
  const m = /CUADRE[\s\-–—._:]*((?:[0-9A-Z][\s\-–—._]*){16})(?![0-9A-Z])/i.exec(raw); if (m) raw = m[1];
  let s = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.length === 22 && s.startsWith('CUADRE')) s = s.slice(6);
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(s)) return null;
  return 'CUADRE-' + s.match(/.{4}/g).join('-');
}
const hexOf = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
async function sha256Hex(str) { return hexOf(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))); }
// Is the key on the list? Returns the key in its official form, or null.
async function licVerify(raw) {
  const key = licNorm(raw); if (!key) return null;
  if (LIC_OK.has(key)) return key;
  const h = (await sha256Hex('cuadre-lic-v1:' + key.slice(7).replace(/-/g, ''))).slice(0, 20);
  if (!LIC_HASHES.has(h)) return null;
  LIC_OK.add(key); return key;
}

/* ---------- state ---------- */
function defaults() {
  return {
    v: 1,
    settings: { lang: null, currency: 'DOP', dec: 0, dial: '1', biz: { name: '', phone: '', address: '', logo: '' }, mora: { on: false, type: 'pct', value: 500, grace: 0 }, last: { type: 'fixed', freq: 'daily', rateBp: 2000, n: 24, noSun: false }, theme: 'auto', onboarded: false, since: '', lastBackup: '', snooze: '', nextLoan: 1, nextRec: 1, pin: null },
    plan: { license: null },
    clients: [], loans: [], visits: []
  };
}
function sMora(m) { m = m && typeof m === 'object' ? m : {}; const type = m.type === 'fixed' ? 'fixed' : 'pct'; return { on: m.on === true, type, value: sInt(m.value, 0, type === 'pct' ? 10000 : 1e11, type === 'pct' ? 500 : 0), grace: sInt(m.grace, 0, 60, 0) }; }
function sPay(p, t, start) { let date = sDate(p.date, t); if (date < start) date = start; return { id: sId(p.id), num: sStr(p.num, 20), date, amount: sInt(p.amount, 0, 1e13, 0), kind: PAY_KINDS.includes(p.kind) ? p.kind : 'pay', void: p.void === true, note: sStr(p.note, 200) }; }
function sLoan(l, t) {
  const freq = ENG.FREQS.includes(l.freq) ? l.freq : 'monthly', start = sDate(l.start, t); let first = sDate(l.first, start); if (first < start) first = start;
  return { id: sId(l.id), num: sStr(l.num, 20), clientId: sRef(l.clientId), type: ENG.TYPES.includes(l.type) ? l.type : 'fixed', principal: sInt(l.principal, 1, ENG.LIM.P, 1), rateBp: sInt(l.rateBp, 0, ENG.LIM.BP, 0), n: sInt(l.n, 1, ENG.LIM.N, 1), freq, noSun: l.noSun === true && freq === 'daily', dec: l.dec === 2 ? 2 : 0, start, first, mora: sMora(l.mora), payments: sArr(l.payments, 5000).filter(p => p && typeof p === 'object').map(p => sPay(p, t, start)).filter(p => p.amount > 0), notes: sStr(l.notes, 1000), renewedFrom: sRef(l.renewedFrom), renewedTo: sRef(l.renewedTo), created: sDate(l.created, start), demo: l.demo === true };
}
function sPin(p) { return p && typeof p === 'object' && /^[0-9a-f]{32}$/.test(p.salt) && /^[0-9a-f]{64}$/.test(p.hash) ? { salt: p.salt, hash: p.hash, it: sInt(p.it, 1000, 2e6, 60000) } : null; }
function sanitize(d) {
  const o = defaults(), t = today();
  if (!d || typeof d !== 'object') return o;
  const s = d.settings && typeof d.settings === 'object' ? d.settings : {}, b = s.biz && typeof s.biz === 'object' ? s.biz : {}, os = o.settings, la = s.last && typeof s.last === 'object' ? s.last : {};
  os.lang = LANGS.some(l => l[0] === s.lang) ? s.lang : null;
  os.currency = typeof s.currency === 'string' && Object.prototype.hasOwnProperty.call(CURS, s.currency) ? s.currency : 'DOP';
  os.dec = s.dec === 2 ? 2 : 0;
  os.dial = sStr(s.dial == null ? '1' : s.dial, 4).replace(/\D/g, '');
  os.biz = { name: sStr(b.name, 80), phone: sStr(b.phone, 30), address: sStr(b.address, 200), logo: sLogo(b.logo) };
  os.mora = sMora(s.mora);
  { const freq = ENG.FREQS.includes(la.freq) ? la.freq : 'daily'; os.last = { type: ENG.TYPES.includes(la.type) ? la.type : 'fixed', freq, rateBp: sInt(la.rateBp, 0, ENG.LIM.BP, 2000), n: sInt(la.n, 1, ENG.LIM.N, 24), noSun: la.noSun === true && freq === 'daily' }; }
  os.theme = ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : 'auto';
  os.onboarded = s.onboarded === true; os.since = sDate(s.since, ''); os.lastBackup = sDate(s.lastBackup, ''); os.snooze = sDate(s.snooze, '');
  os.nextLoan = sInt(s.nextLoan, 1, 1e9, 1); os.nextRec = sInt(s.nextRec, 1, 1e9, 1);
  os.pin = sPin(s.pin);
  o.plan.license = licNorm(d.plan && typeof d.plan === 'object' ? d.plan.license : null);
  o.clients = sArr(d.clients, 5000).filter(c => c && typeof c === 'object').map(c => ({ id: sId(c.id), name: sStr(c.name, 80), doc: sStr(c.doc, 40), phone: sStr(c.phone, 30), address: sStr(c.address, 200), ref: sStr(c.ref, 200), notes: sStr(c.notes, 1000), created: sDate(c.created, t), demo: c.demo === true }));
  o.loans = sArr(d.loans, 5000).filter(l => l && typeof l === 'object').map(l => sLoan(l, t)).filter(l => !ENG.schedule(l).error); // a loan whose plan cannot be built is not kept
  o.visits = sArr(d.visits, 3000).filter(v => v && typeof v === 'object' && isDate(v.d) && sRef(v.id) && (v.st === 'seen' || v.st === 'absent')).map(v => ({ d: v.d, id: v.id, st: v.st }));
  // ids must be unique inside each list; payment ids inside each loan
  for (const k of ['clients', 'loans']) { const seen = new Set(); o[k].forEach(x => { if (seen.has(x.id)) x.id = uid(); seen.add(x.id); }); }
  o.loans.forEach(l => { const seen = new Set(); l.payments.forEach(p => { if (seen.has(p.id)) p.id = uid(); seen.add(p.id); }); });
  return o;
}
function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(LS_KEY); if (raw) return sanitize(JSON.parse(raw)); }
  catch (e) { if (raw) { try { if (!localStorage.getItem(LS_KEY + ':corrupt')) localStorage.setItem(LS_KEY + ':corrupt', raw); } catch (e2) { /* nothing else to do */ } } } // the first damaged copy is never overwritten
  return defaults();
}
const _sc = new Map(), _st = new Map(), _nf = {}, _df = {};
function bust() { _sc.clear(); _st.clear(); }
let S = loadState();
function save() { bust(); try { if (S.visits.length) { const lim = addDays(today(), -30); S.visits = S.visits.filter(v => v.d >= lim); } localStorage.setItem(LS_KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }

/* ---------- i18n ---------- */
const lang = () => S.settings.lang || 'es';
function t(key, vars) {
  let s = (I18N[lang()] && I18N[lang()][key]) || I18N.es[key] || key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
const _loc = {};
function locale() { const c = S.settings.currency, k = lang() + c; if (!_loc[k]) { const l = lang() + '-' + (CURS[c] ? CURS[c][1] : 'DO'); _loc[k] = validLocale(l) ? l : lang(); } return _loc[k]; }
function detectLang() { const n = (navigator.language || 'es').slice(0, 2).toLowerCase(); return LANGS.some(l => l[0] === n) ? n : 'es'; }

/* ---------- money, numbers, dates ---------- */
function fmtN(v, d, dmax) { const k = locale() + '|' + d + '|' + (dmax == null ? d : dmax); if (!_nf[k]) _nf[k] = new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: dmax == null ? d : dmax }); return _nf[k].format(v); }
const curSym = () => (CURS[S.settings.currency] || CURS.DOP)[0];
function money(c) { c = Math.round(c || 0); const a = Math.abs(c), d = S.settings.dec === 2 || a % 100 ? 2 : 0, sym = curSym(); return (c < 0 ? '−' : '') + sym + (/[A-Za-z.]$/.test(sym) ? ' ' : '') + fmtN(a / 100, d); }
const pct = bp => fmtN(bp / 100, 0, 2) + '%';
function dfmt(kind, opts, s) { if (!isDate(s)) return ''; const k = locale() + kind; try { if (!_df[k]) _df[k] = new Intl.DateTimeFormat(locale(), opts); return _df[k].format(parseISO(s)); } catch (e) { return s; } }
const fmtDate = s => dfmt('d', { day: 'numeric', month: 'short', year: 'numeric' }, s);
const fmtDay = s => dfmt('w', { weekday: 'short', day: 'numeric', month: 'short' }, s);
const fmtMonth = ym => dfmt('m', { month: 'long', year: 'numeric' }, ym + '-01');
// Text typed in a number field -> whole cents (or basis points for a rate). No floating point. NaN when it is not a plain amount.
function toCents(v) { const s = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.'); const m = /^(\d{1,10})(?:\.(\d*))?$/.exec(s); if (!m) return NaN; return Number(m[1]) * 100 + Number(((m[2] || '') + '00').slice(0, 2)); }
const centsIn = c => { c = Math.round(c || 0); return c % 100 ? (c / 100).toFixed(2) : String(c / 100); }; // value for a number field

/* ---------- plan ---------- */
const gated = () => !!CFG.CHECKOUT_URL;                       // limits apply only once there is somewhere to buy Pro
const licensed = () => !!S.plan.license && LIC_OK.has(S.plan.license);
const usedByReal = skip => new Set(S.loans.filter(l => !l.demo && l.id !== skip).map(l => l.clientId));
const realClients = () => { const u = usedByReal(); return S.clients.filter(c => !c.demo || u.has(c.id)).length; }; // an example client with a real loan counts
const realLoans = () => S.loans.filter(l => !l.demo).length;
const canAddClient = () => !gated() || licensed() || realClients() < CFG.FREE_CLIENTS;
const canAddLoan = () => !gated() || licensed() || realLoans() < CFG.FREE_LOANS;
// Checks the stored key against the list. An unknown key is removed; if the check itself cannot run, the key is kept.
async function checkLicense() { const k = S.plan.license; if (!k) return false; let ok; try { ok = await licVerify(k); } catch (e) { return false; } if (S.plan.license !== k) return false; if (ok) return true; S.plan.license = null; save(); return false; }

const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
const corruptRaw = () => lsGet(LS_KEY + ':corrupt');
const prevRaw = () => lsGet(LS_KEY + ':prev');

/* ---------- PIN (keeps other people from opening the app; the data itself is not encrypted) ---------- */
// Wrong-PIN brake, kept in storage so a reload does not reset it: after every 5 misses the wait grows 30 s, 2 min, 10 min.
const LOCK_KEY = 'cuadre:lock', LOCK_WAITS = [30, 120, 600];
function lockGet() { let o = {}; try { o = JSON.parse(lsGet(LOCK_KEY) || '{}') || {}; } catch (e) { o = {}; } const now = Date.now(); let until = sNum(o.until, 0, 1e15, 0); if (until > now + 600000) until = now + 600000; return { fails: sInt(o.fails, 0, 99, 0), level: sInt(o.level, 0, 99, 0), until }; }
function lockSet(o) { try { if (o) localStorage.setItem(LOCK_KEY, JSON.stringify(o)); else localStorage.removeItem(LOCK_KEY); } catch (e) { /* ignore */ } }
function lockMiss() { const o = lockGet(); o.fails++; if (o.fails >= 5) { o.until = Date.now() + LOCK_WAITS[Math.min(o.level, LOCK_WAITS.length - 1)] * 1000; o.level++; o.fails = 0; } lockSet(o); return o; }
const pinAvail = () => !!(window.crypto && crypto.subtle && crypto.getRandomValues);
async function pinDerive(pin, salt, it) { const e = new TextEncoder(), key = await crypto.subtle.importKey('raw', e.encode(String(pin)), 'PBKDF2', false, ['deriveBits']); return hexOf(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: e.encode('cuadre-pin-v1:' + salt), iterations: it }, key, 256)); }
async function pinMake(pin) { const a = new Uint8Array(16); crypto.getRandomValues(a); const salt = hexOf(a), it = 60000; return { salt, it, hash: await pinDerive(pin, salt, it) }; }
async function pinCheck(pin) { const p = S.settings.pin; if (!p) return true; try { return (await pinDerive(pin, p.salt, p.it)) === p.hash; } catch (e) { return false; } }

/* ---------- business rules ---------- */
const findC = id => S.clients.find(c => c.id === id) || null;
const findL = id => S.loans.find(l => l.id === id) || null;
const clientOf = L => findC(L.clientId);
const clientName = L => { const c = clientOf(L); return c ? c.name : '—'; };
function schedOf(L) { let x = _sc.get(L.id); if (!x) { x = ENG.schedule(L); _sc.set(L.id, x); } return x; }
function stOf(L, asOf) { asOf = asOf || today(); const k = L.id + '|' + asOf; let x = _st.get(k); if (!x) { x = ENG.state(L, asOf, schedOf(L)); _st.set(k, x); } return x; }
const payoffOf = (L, asOf) => ENG.payoff(L, asOf || today(), schedOf(L));
const behaviorOf = clientId => ENG.behavior(S.loans.filter(l => l.clientId === clientId).map(l => ({ freq: l.freq, st: stOf(l) })));
const livePays = L => L.payments.filter(p => !p.void);
function nextNum(kind) { const s = S.settings, isL = kind === 'loan', pre = isL ? 'P-' : 'R-'; let n = isL ? s.nextLoan : s.nextRec, num; const used = new Set(isL ? S.loans.map(l => l.num) : S.loans.flatMap(l => l.payments.map(p => p.num))); do { num = pre + String(n).padStart(4, '0'); n++; } while (used.has(num)); if (isL) s.nextLoan = n; else s.nextRec = n; return num; }
function waPhone(raw) { let p = String(raw || '').trim().replace(/\(0\)/g, ''); if (p.replace(/\D/g, '').length < 6) return ''; const plus = p.startsWith('+') || p.startsWith('00'); let d = p.replace(/\D/g, ''); if (p.startsWith('00')) d = d.slice(2); if (plus) return d; const dial = S.settings.dial; d = d.replace(/^0+/, ''); if (dial && !(d.startsWith(dial) && d.length > 10)) d = dial + d; return d; }
const telHref = raw => { const d = String(raw || '').replace(/[^\d+]/g, ''); return d.replace(/\D/g, '').length >= 6 ? 'tel:' + d : ''; };

/* Everything the dashboard needs, as of today. Cash collected leaves out renewals (no money changed hands) and waived late fees. */
function portfolio() {
  const td = today(), wk = weekStart(td), mo = td.slice(0, 7), lim = addDays(td, 7);
  const o = { today: 0, todayN: 0, late: 0, lateN: 0, mora: 0, capital: 0, interest: 0, moraPaid: 0, cToday: 0, cWeek: 0, cMonth: 0, active: 0, soon: [] };
  for (const L of S.loans) {
    const st = stOf(L); if (!st) continue;
    o.interest += st.paidInt; o.moraPaid += st.paidMora;
    for (const p of L.payments) { if (p.void || p.kind === 'waive' || p.kind === 'renew' || p.date > td) continue; const A = st.allocs[p.id]; if (!A) continue; const v = A.int + A.cap + A.mora; if (p.date === td) o.cToday += v; if (p.date >= wk) o.cWeek += v; if (p.date.slice(0, 7) === mo) o.cMonth += v; }
    if (st.status === 'paid') continue;
    o.active++; o.capital += st.remCap; o.mora += st.moraPending;
    if (st.todayAmt > 0) { o.today += st.todayAmt; o.todayN++; }
    if (st.overdue > 0) { o.late += st.overdue; o.lateN++; }
    for (const r of st.rows) if (r.rem > 0 && r.due > td && r.due <= lim) o.soon.push({ L, r });
  }
  o.soon.sort((a, b) => (a.r.due < b.r.due ? -1 : a.r.due > b.r.due ? 1 : 0));
  return o;
}
/* Loans with something to collect now: due today, overdue, or a pending late fee. */
function routeItems() {
  const out = [];
  for (const L of S.loans) { const st = stOf(L); if (!st || st.status === 'paid' || st.dueNow <= 0) continue; out.push({ L, st, late: st.overdue > 0 || st.todayAmt === 0 }); }
  out.sort((a, b) => (a.late !== b.late ? (a.late ? 1 : -1) : b.st.overdueDays - a.st.overdueDays || clientName(a.L).localeCompare(clientName(b.L))));
  return out;
}
/* One month of activity. Portfolio figures are taken at the end of the month (or today for the current month). */
function monthReport(ym) {
  const td = today(), p = ym.split('-').map(Number), end = ENG.fromDn(Math.round(Date.UTC(p[0], p[1], 0) / 864e5)), asOf = end < td ? end : td;
  const o = { ym, asOf, lent: 0, lentN: 0, renewed: 0, cash: 0, cap: 0, cInt: 0, cMora: 0, int: 0, mora: 0, renewInt: 0, payN: 0, overdue: 0, overdueN: 0, capital: 0, rows: [] };
  for (const L of S.loans) {
    if (L.start.slice(0, 7) === ym) { o.lent += L.principal; o.lentN++; if (L.renewedFrom) { const old = findL(L.renewedFrom), rp = old && old.payments.find(x => !x.void && x.kind === 'renew'); if (rp) o.renewed += Math.min(L.principal, rp.amount); } }
    const st = stOf(L); if (!st) continue;
    for (const pay of L.payments) {
      if (pay.void || pay.kind === 'waive' || pay.date.slice(0, 7) !== ym || pay.date > td) continue; const A = st.allocs[pay.id]; if (!A) continue;
      if (pay.kind === 'renew') { o.renewInt += A.int + A.mora; o.int += A.int; o.mora += A.mora; }
      else { o.cash += A.int + A.cap + A.mora; o.cap += A.cap; o.cInt += A.int; o.cMora += A.mora; o.int += A.int; o.mora += A.mora; o.payN++; }
      o.rows.push({ L, pay, A });
    }
    if (L.start <= asOf) { const s2 = asOf === td ? st : stOf(L, asOf); if (s2 && s2.status !== 'paid') { o.capital += s2.remCap; if (s2.overdue > 0) { o.overdue += s2.overdue; o.overdueN++; } } }
  }
  o.rows.sort((a, b) => (a.pay.date < b.pay.date ? -1 : a.pay.date > b.pay.date ? 1 : 0));
  return o;
}
