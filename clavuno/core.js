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

/* ---------- Pro: sale config and license keys (closed list; only truncated SHA-256 fingerprints live here) ---------- */
const CFG = (() => { const w = (typeof window.CLAVUNO === 'object' && window.CLAVUNO) || {}; return { CHECKOUT_URL: typeof w.CHECKOUT_URL === 'string' && /^https:\/\/[\w.-]+\//.test(w.CHECKOUT_URL) ? w.CHECKOUT_URL : '', PRICE: sStr(w.PRICE || 'US$19', 20), FREE_CLIENTS: sInt(w.FREE_CLIENTS, 1, 1e6, 5), FREE_DOCS: sInt(w.FREE_DOCS, 1, 1e6, 10) }; })();
const LIC_HASHES = new Set('00c6a6c648fad3de087d03141c4674568a38d9db0323393555772462e20a05464af862a4224bd24105c1f3d778204c7da62208e759487d78f64612420a5d8e79622278e195a90a9005a3a658d6a7fd030afa8411a7b22b6cab490b526892e6694b81d53e0bd79aa78417060107820cf376d219a739cd3be70d48d140f450ce75fad60dcda77a14aa90bc97730ded4918842cd9360f990e210c6d86f45c48439c0f0d458323b6c1ebf3c90f7960aacbe7663fdbdb1047ff6a91fd57768b8c11eccc9a19ace0537981127c58fdd55c8d635a2513cddd14162021542f0514f570841c19d3e453d2150333617b9b5ecdb49215e3cd2e74308e83784c192dd4e529e69c57fd2f192eef451cd5792db9371aac379e50cb444122b71ab0567f646214623d511b8834682c3ba36541a21b96c54ea4f593cf661f1e0631990a098595f9a71ed15b922a44dca1576e203fe3dabc27d1614cd1205d9eb005a42d91575c20c0a8e5e6e834f5e4bf20c2a37a46380b890d562149b6c6bcee8b165f1f21d01806e765c91aa26a23299200b38dee3851a5233ae5ec6a71c7c4a5ac23e676a14f329014eec423ffea9a87f67aac0e7e240fb37f551b6774b837262af467e4cc60ab1e0826428214c77d4c439e9328eb6d4b6469560bd82d2a5d8761c4fa9ef841622aefbb0670d2b894ff212b5df4c6af9edbedf63f2bc382a60c4a31fe27222d0d956a6bb06d3e192f2debc86457f1c353a25a2ea2c47831c562b66c522f2d023d571c332dfefc30416e0bbcf48d1252ff304bcab378cab036d71d304c874cc7fdba4a9a49319185c329f6655ebac431ec1f883c70f74ec4e532b3aaa796f5b9063312330c979343e369084e3233c4d7518ccce8af408e33feac4d4b16c93f10b3342ec61135f44934459734c41d6a1cc3ef5340fe34ffdb9219759c7e3946351784c1fc8ed5cdbb3f35b97ba6ce028eb120cd35cb434380a887ffde2835e5b669b579f844b57236ae21a0835f3be85e1d36b46bdd757cc676eccb3821d6c231455689cd8a3833b35e1a0c9b9956aa395666ec75342b364bfc3a2bed500d0cc62fdc283a396f1f52261e37d33d3c653820841a7ffbdf643c735faf2c607e67069e3d202d525032ed3efb2e3e04ee227bb79f1b5e9f3e8c15d8cbb7b4587d773f160200cb0d85a8de9b40eff7f23fd51e8c4d0c41abbefa2e391f2a29ed42259afd7fd99fa80b13446752ac17a2cccde2f144dfe3259788eaad6e874689d8a7b2f528c6911947318deee31f2b0b51fc48344f742d9f0e76393548dde068b3147c4a863b492110b75e527d42ec834ad23a9e7dfdcd992a344af97b6e9007de2d545c4afff56e6b87672e62b24b62d89d9908948d2ce94dda3e69daad99c65ca84e1631a648c35e4394f24eae2c69996afd9bf6475117a49cbc650139232954447daec940928c0cfa550bf1033978a9cdb0fc57b625fd2d8c8fd9e18557be082f7a69597444bd5855150b09123408a64c5891a71ca44d665c38c55a5701ff7798876f88875b04876df87a315b0fd35b247478ca15d1c7e8465c56a55a4601f4fc66f25c8590ef8f55a95346555e124fc69f2b245d8d1d5f74965699023dea4a2d60ecbb11318af48ceb5260f44c42b55e946f8401628f588618b6fd3c250062dcf984742a96e9ac5063e79cc59cf5610b066d64637f8c875b26dc6613649f3826b6d056a66f6665632ca440931648b91f696a011cf75eefaa2a5c6aba6e57ee504a6253e36d4b8f02b56d90f2255b70ab0717cc043352fd9171abb49f68c3ff2b3d0f72c9c523966baf49d0f474f7f9c6763a64a16d5c75cdeb36facdea12383076bfe1eceea783c0b14079ff7dbe4f4701546ace7cd99892eb56784a301f7df7fba0b8896ca1bb147fa44196c04c8b9649a97ffc60e0d290783f2d758000ce60bfdcb00fc32a81da31bf269b765b7e918204a3c2975299257ae68207b1aa1e2f0e4d445c82a4778da123fa76511f8375637679a30da1850784c1d393cc3250eacc48856f4f823eb67cdca27d85d82d2c0623a94a0afd878a8b2f489a853f59aa88d3ca90658cce82ff868b1a87bc42ecb84971998b1ee159f032c38fafd38b6b386eadabdf7f419a8c496bc3cf5bbb912ae68c56971ecdaf8cd7ed338db1b825746c9a1ff5248e31ccb0083e7e452b508e82a8d2c1844c9235ad907ad663926926916411912a3ec6f37e798bd4b6923dbb8cdaf1c1ee65c5936254eda8f8a7c3c17d93874ca1909b54a6181b93ec24ba21d46fa4bb749426b78a22b8a998c42998738187ddc9d87e4fc398dce0a4cd33d157d4a79a2c94452d361a7b93299abebc9f276a00a102709acc7519c6aca77b5d459f33aa98402229905cd69fbee4c3ac19c0d9ef1d9ff1809fb5db60206450a0216d9e761eb1eefefda0a5607c85f7dcb3e341a0aca857e5550ad2a087a12949a9d7302460aac8a19a473d8389937de21aa432190a075ae282dd8ba5abf66518fda73a8943a6fe05994e58b028f589a784dc49899a701358fda941339a0c068cc94505a9cda08638c7f82c2adaaac5cc78c508c15e04deaad096349da366b27901ac3b8459705466f8b4caac68d89d458eba72a6c6aea65984e6c5589a5d55aec95627ef738a4d8741aed092ab21a59cab51efaed5be40c003f279c1c3afcbd941abf1a03a4d72afdf4330847137d76de9b1f484ffd44654fe903eb227f5e446cebc6540fcb2d708e1d8f61dbb2188b34780394f3ff3aa8c3bb531617fd928962e3126b585dd57b1557986bd7bb5d801e366f9137ddedcb6eb02a71de11d7ea27eb6ef94d7f7bc560f8030b7582cefacbbfe267287b7e04b6378f3e20fe181b84983770dbc4336088cb91276c53c2f10d10a85b96a84afcb746291ad11b9e31c060b1cfa820476ba0b3ad09a9534355cb4ba35b3b6579bd50d40a2bab569218fa66c0054ebbb339101ea384ba5df8dbb731cf5233e6a96e9e1bb86353111cf017dc23cbbe4d8a61d8c4cfad53dbbeb8a468b06ea446d01bbff488ec90747903376bd3f2643d57f87d2d94fbdb4cda4976434310d94bdc868b9c57b1441fd34be455869163b3b2efe76be472fabae809775c485bf116e657c9755d36e49bfca0330ecdbe13beac5bfd526f58e256d51f921c0883df6e6867ec8e731c0ff0e04cf3d7c57415ec14dbaa2b6ce0f21ec81c18cea3f064a8bedc235c236941bfd72b32e9900c48323cedd15c23c555ac59d8711999b8fc03381c6373f3eba15b99eca8ec6cfb0c504a92e948e11c760bc1f22cf6872dc02c82cc8f1062dee448137c9804b73258790d48df4ca7cfc35f7b88c6fde1dcb4392d15b3219675a17cbc813781801add5d31bcc29e4a974a467e2b180cc37fefd6250790f199dccf679887058e5c9544ccddbfbdaa161013b4953ce48c31d158cc27818dfce66d6592b1778afa04fce8f93d35e5db87ddc09ced436ca1b9cbc633034cf53e09031a9ff1a8ba7cfaa1e842759d9a3300dcfc27cb06dfa17435d22cfd407c9cab1932a2668d0528860084221058f94d23211216ced2834170fd517e17fdc7eaa51bcedd59ab4f4b77f8c0bc9ccd60d94a618c30bd5358ed62bfd7cab7b02897200d68e03e5e69233bf5ea3d971cccbb4b8a6eee026dae9e162b17827d24cbedaff4464c16fee7fd3d0db5ba029daf4981116f3dca7f7f09288980e3312ddac2ce582a02d81efbcdea3575fbbfd6ef15812deb79e4f2e24a45d501bdf7425da1c8019e7ce7bdfdb863cb1f9e3dcddf1dfeebbe009ff1fbb50b4dff0bda8890b0529debae06e817edc0b3b0a4cf8e2243a4e0e6621c9a75fe313f31ddf4ebac5eea4ea58398fc49044ecabaeeac1c039bffea5d4c1b3eb8bfa373a0283739f77ec3af4f879fdf1127728ee8e7b899e5e112d4725ef50d8d9cd8032256cedef59ce9d8f9a770c5eeef08c5d3fce50fcc83a1bf0b45ed0ee53a6b1dc83f0dbcb69485e823d723bf15275a931accc0a7f8ff1f77e0f8ff35f869dcbf43f3ef6d5619dd5e352f4a6f3e01a99ac7069c3f6fbe0900dd0eea388f1f79f1f955d4bdf1b6782f9f5cf2a3a9f53a6583cfa52f241c8acb9180b54fb52bb4298dbace1a7e6fbae608b53a954b4b8adfbca444192bd1fedbfa1fd087cbb59cd513ed3d8fe6ab21373fbaa798bd6fe96687becb6517cedf1fef82948858fa67af4ccff3f60643f0a1b895b37ffd4379ef156c596846f'.match(/.{20}/g));
const LIC_OK = new Set(); // keys already verified in this session
// Accepts the key with or without dashes, in lower case, and with O/I/L typed by mistake (Crockford base32)
function licNorm(raw) {
  let s = String(raw == null ? '' : raw).toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.length === 23 && s.startsWith('CLAVUNO')) s = s.slice(7);
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(s)) return null;
  return 'CLAVUNO-' + s.match(/.{4}/g).join('-');
}
async function sha256Hex(str) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); }
// Is the key on the list? Returns the key in its official form, or null.
async function licVerify(raw) {
  const key = licNorm(raw); if (!key) return null;
  if (LIC_OK.has(key)) return key;
  const h = (await sha256Hex('clavuno-lic-v1:' + key.slice(8).replace(/-/g, ''))).slice(0, 20);
  if (!LIC_HASHES.has(h)) return null;
  LIC_OK.add(key); return key;
}

function defaults() {
  return {
    v: 1,
    settings: { lang: null, locale: '', currency: 'USD', taxName: '', taxRate: 0, dial: '', biz: { name: '', taxId: '', phone: '', email: '', address: '', logo: '' }, qPrefix: 'COT-', iPrefix: 'FAC-', qNext: 1, iNext: 1, validDays: 15, dueDays: 15, followDays: 3, terms: '', theme: 'auto', notify: false, onboarded: false, lastNotify: '' },
    plan: { license: null },
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
  o.plan.license = licNorm(d.plan && typeof d.plan === 'object' ? d.plan.license : null);
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

/* ---------- plan ---------- */
const gated = () => !!CFG.CHECKOUT_URL;                       // limits apply only once there is somewhere to buy Pro
const licensed = () => !!S.plan.license && LIC_OK.has(S.plan.license);
const realClients = () => S.clients.filter(c => !c.demo).length;
const realDocs = () => S.quotes.filter(q => !q.demo).length + S.invoices.filter(i => !i.demo && !i.quoteId).length; // an invoice made from a quote is the same job
const canAddClient = () => !gated() || licensed() || realClients() < CFG.FREE_CLIENTS;
const canAddDoc = () => !gated() || licensed() || realDocs() < CFG.FREE_DOCS;
// Checks the stored key against the list. An unknown key is removed; if the check itself cannot run, the key is kept.
async function checkLicense() { const k = S.plan.license; if (!k) return false; let ok; try { ok = await licVerify(k); } catch (e) { return false; } if (S.plan.license !== k) return false; if (ok) return true; S.plan.license = null; save(); return false; }

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
