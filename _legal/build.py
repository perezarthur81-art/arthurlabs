#!/usr/bin/env python3
"""Genera las páginas legales estáticas de arthurlabs.app a partir de _legal/<idioma>.json.

Uso:  python3 _legal/build.py        (desde la raíz del repositorio)
Salida: privacidad/, terminos/, reembolsos/, soporte/ (es) y en/, fr/, pt/ con sus páginas.
Las páginas no usan JavaScript: se leen igual en cualquier navegador y sin conexión a terceros.
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://arthurlabs.app"
EMAIL = "hola@arthurlabs.app"
LANGS = ["es", "en", "fr", "pt"]
LANG_NAMES = {"es": "Español", "en": "English", "fr": "Français", "pt": "Português"}
PREFIX = {"es": "", "en": "en/", "fr": "fr/", "pt": "pt/"}
SLUGS = {
    "es": {"privacy": "privacidad", "terms": "terminos", "refunds": "reembolsos", "support": "soporte"},
    "en": {"privacy": "privacy", "terms": "terms", "refunds": "refunds", "support": "support"},
    "fr": {"privacy": "confidentialite", "terms": "conditions", "refunds": "remboursements", "support": "assistance"},
    "pt": {"privacy": "privacidade", "terms": "termos", "refunds": "reembolsos", "support": "suporte"},
}
PAGES = ["privacy", "terms", "refunds", "support"]
# La portada solo tiene es/en/fr; Norte también. El portugués enlaza a la versión en inglés de esas páginas.
HOME_LANG = {"es": "es", "en": "en", "fr": "fr", "pt": "en"}
NORTE_LANG = {"es": "es", "en": "en", "fr": "fr", "pt": "en"}
APP_ICONS = {"norte": "/img/norte-icon.png", "cuadre": "/cuadre/icons/icon.svg", "clavuno": "/clavuno/icons/icon.svg"}
NAV_LABEL = {"es": "Principal", "en": "Main", "fr": "Principal", "pt": "Principal"}
APP_NAMES = {"norte": "Norte", "cuadre": "Cuadre Préstamos", "clavuno": "Clavuno"}


def path_of(lang: str, page: str) -> str:
    return "/" + PREFIX[lang] + SLUGS[lang][page] + "/"


def app_url(key: str, lang: str) -> str:
    nl = NORTE_LANG[lang]
    return {
        "norte": f"https://norte.arthurlabs.app/landing.html?lang={nl}",
        "cuadre": f"{SITE}/cuadre/",
        "clavuno": f"{SITE}/clavuno/",
        "norteprivacy": f"https://norte.arthurlabs.app/privacidad.html?lang={nl}",
        "norteterms": f"https://norte.arthurlabs.app/terminos.html?lang={nl}",
    }[key]


def fill(text: str, lang: str) -> str:
    """Sustituye los marcadores del contenido. Falla si queda alguno sin resolver."""
    mail = f'<a href="mailto:{EMAIL}">{EMAIL}</a>'
    text = text.replace("{email}", mail)
    text = re.sub(r"\{link:(\w+)\|([^}]+)\}", lambda m: f'<a href="{path_of(lang, m.group(1))}">{m.group(2)}</a>', text)
    text = re.sub(r"\{app:(\w+)\|([^}]+)\}", lambda m: f'<a href="{app_url(m.group(1), lang)}">{m.group(2)}</a>', text)
    if re.search(r"\{(email|link:|app:)", text):
        raise SystemExit(f"[{lang}] marcador sin resolver: {text[:120]}")
    return text


def e(s: str) -> str:
    return html.escape(s, quote=True)


LOGO = '<img src="/logo.svg" alt="" width="30" height="30">'


def head(lang: str, page: str, P: dict) -> str:
    alts = "\n".join(f'<link rel="alternate" hreflang="{l}" href="{SITE}{path_of(l, page)}">' for l in LANGS)
    alts += f'\n<link rel="alternate" hreflang="x-default" href="{SITE}{path_of("es", page)}">'
    title = f'{P["title"]} · Arthur Labs'
    url = SITE + path_of(lang, page)
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{e(title)}</title>
<meta name="description" content="{e(P["desc"])}">
<meta name="theme-color" content="#07070D">
<link rel="canonical" href="{url}">
{alts}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Arthur Labs">
<meta property="og:locale" content="{LOCALES[lang]}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(P["desc"])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/fonts.css">
<link rel="stylesheet" href="/legal.css">
</head>"""


def header(lang: str, page: str, U: dict) -> str:
    home = f"/?lang={HOME_LANG[lang]}"
    langs = "".join(
        f'<a href="{path_of(l, page)}" hreflang="{l}" lang="{l}"' + (' aria-current="page"' if l == lang else "") + f' aria-label="{LANG_NAMES[l]}" title="{LANG_NAMES[l]}">{l.upper()}</a>'
        for l in LANGS
    )
    sup = path_of(lang, "support")
    return f"""<body>
<a class="skip" href="#main">{e(U["skip"])}</a>
<div class="bgfx" aria-hidden="true"></div>
<header class="top">
  <div class="wrap bar">
    <a class="brand" href="{home}" aria-label="Arthur Labs · {e(U["home"])}">{LOGO}<span>ARTHUR LABS</span></a>
    <nav class="nav" aria-label="{NAV_LABEL[lang]}">
      <a href="{home}#productos">{e(U["apps"])}</a>
      <a href="{sup}"{' aria-current="page"' if page == "support" else ""}>{e(U["footSupport"])}</a>
    </nav>
    <nav class="lang" aria-label="{e(U["langLabel"])}">{langs}</nav>
  </div>
</header>"""


def footer(lang: str, page: str, U: dict) -> str:
    links = "".join(
        f'<li><a href="{path_of(lang, p)}"' + (' aria-current="page"' if p == page else "") + f'>{e(U[k])}</a></li>'
        for p, k in (("privacy", "footPrivacy"), ("terms", "footTerms"), ("refunds", "footRefunds"), ("support", "footSupport"))
    )
    return f"""<footer class="foot">
  <div class="wrap foot__in">
    <a class="brand" href="/?lang={HOME_LANG[lang]}" aria-label="Arthur Labs">{LOGO}<span>ARTHUR LABS</span></a>
    <nav aria-label="{e(U["footLegalNav"])}"><ul>{links}</ul></nav>
    <p>{e(U["footContact"])}: <a href="mailto:{EMAIL}">{EMAIL}</a></p>
    <p>{e(U["footMade"])} © 2026 Arthur Labs</p>
  </div>
</footer>
</body>
</html>
"""


def toc(P: dict, U: dict) -> str:
    items = "".join(f'<li><a href="#{s["id"]}">{e(s["h"])}</a></li>' for s in P["sections"])
    return f'<nav class="toc" aria-labelledby="toc-h"><h2 id="toc-h">{e(U["toc"])}</h2><ol>{items}</ol></nav>'


def sections(P: dict, lang: str) -> str:
    out = []
    for s in P["sections"]:
        out.append(f'<section id="{s["id"]}"><h2>{e(s["h"])}</h2>{fill(s["html"], lang)}</section>')
    return "\n".join(out)


def page_intro(P: dict, U: dict, eyebrow: str) -> str:
    return (
        f'<p class="eyebrow">{e(eyebrow)}</p><h1>{e(P["title"])}</h1>'
        f'<p class="lead">{e(P["intro"])}</p>'
        f'<p class="updated">{e(U["updatedLabel"])}: <time datetime="2026-11-27">{e(U["updated"])}</time></p>'
    )


def support_body(P: dict, U: dict, lang: str) -> str:
    from urllib.parse import quote
    mailto = f'mailto:{EMAIL}?subject={quote(P["mailSubject"])}'
    contact = (
        f'<section class="contact" aria-labelledby="c-h"><div><h2 id="c-h">{e(P["contactTitle"])}</h2>'
        f'<p class="mail"><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>{e(P["contactBody"])}</p></div>'
        f'<a class="btn pri" href="{e(mailto)}">{e(P["contactBtn"])}</a></section>'
    )
    cards = "".join(
        f'<li class="appc"><img src="{APP_ICONS[k]}" alt="" width="48" height="48"><div><b>{APP_NAMES[k]}</b>'
        f'<span>{e(P["apps"][k])}</span></div><a class="btn sm" href="{app_url(k, lang)}" aria-label="{e(U["openApp"])} {APP_NAMES[k]}">{e(U["openApp"])}</a></li>'
        for k in ("norte", "cuadre", "clavuno")
    )
    apps = f'<section aria-labelledby="a-h"><h2 id="a-h">{e(P["appsTitle"])}</h2><ul class="apps">{cards}</ul></section>'
    faq = "".join(f'<details><summary>{e(f["q"])}</summary>{fill(f["a"], lang)}</details>' for f in P["faq"])
    faqs = f'<section id="preguntas" aria-labelledby="f-h"><h2 id="f-h">{e(P["faqTitle"])}</h2><div class="faq">{faq}</div></section>'
    return contact + sections(P, lang) + apps + faqs


LOCALES: dict[str, str] = {}


def build() -> list[Path]:
    data = {}
    for lang in LANGS:
        f = ROOT / "_legal" / f"{lang}.json"
        if not f.exists():
            raise SystemExit(f"falta {f}")
        data[lang] = json.loads(f.read_text(encoding="utf-8"))
        LOCALES[lang] = data[lang]["locale"]
    ref = data["es"]
    for lang in LANGS:  # misma estructura en todos los idiomas
        for p in PAGES:
            a, b = ref["pages"][p], data[lang]["pages"][p]
            if [s["id"] for s in a["sections"]] != [s["id"] for s in b["sections"]]:
                raise SystemExit(f"[{lang}] {p}: las secciones no coinciden con es")
            if p == "support" and len(a["faq"]) != len(b["faq"]):
                raise SystemExit(f"[{lang}] support: preguntas distintas")
    written = []
    for lang in LANGS:
        D = data[lang]
        U = D["ui"]
        for page in PAGES:
            P = D["pages"][page]
            eyebrow = "Arthur Labs"
            body = page_intro(P, U, eyebrow)
            if page == "support":
                main = body + support_body(P, U, lang)
            else:
                main = body + toc(P, U) + sections(P, lang)
            doc = (
                head(lang, page, P) + "\n" + header(lang, page, U)
                + f'\n<main id="main" class="wrap doc doc--{page}">\n{main}\n<p class="totop"><a href="#main">{e(U["backTop"])} ↑</a></p>\n</main>\n'
                + footer(lang, page, U)
            )
            out = ROOT / (PREFIX[lang] + SLUGS[lang][page]) / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(doc, encoding="utf-8")
            written.append(out)
    return written


if __name__ == "__main__":
    files = build()
    for f in files:
        print(f.relative_to(ROOT))
    sys.exit(0)
