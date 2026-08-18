#!/usr/bin/env python3
"""Build ../index.html from the sources in this folder.

The page ships as ONE self-contained file: fonts are base64-embedded and there
are no external requests, so it works on GitHub Pages with no build step at
serve time and inside a strict CSP.

    python3 src/build.py            # from the repo root

Everything is written as pure ASCII on purpose — the page has no <meta charset>
of its own (the host may supply the document head), and non-ASCII silently
turned into mojibake when it didn't.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STYLES = os.path.join(HERE, 'styles')

# Order matters: later files depend on names defined earlier, and the ROUTES
# table is built before the page functions run (so those must be function
# declarations, not const arrows).
PARTS = [
    'part1-core.js',        # helpers, toast, sidebar IA, tender data
    'keep-engines.js',      # resume + case-study renderers
    'part2-blocks.js',      # primitives, BLOCKS, schematics
    'part3-library.js',     # file-manager data, routes, router
    'part4-pages.js',       # tenders, tender detail, build tender, cover style
    'part5-docbuilder.js',  # composed-document model + Document Builder
    'part6-docpages.js',    # document seeds, editor routes, Block Library
    'part7-simple.js',      # Simple mode (live's editors) + exit guard
    'part8-blockeditor.js', # Block Builder
    'ray-assets.js',        # Ray artwork, embedded from the live assets
    'part9-mockups.js',     # Ray, tender menu, Time Sheet (mocked from live)
    'part10-viewpages.js',  # read-only view pages + Add To Tender (from live)
    'part11-pagestyle.js',  # Simple mode for cover / contents pages
]
CSS = [
    ('styles/fonts-all.css', 'embedded fonts (Outfit, Manrope, Material Symbols subset)'),
    ('styles/styles.css',    'prototype design system (tenderfy-subbie-portal)'),
    ('styles/blk.css',       'block schematics (tenderfy-admin/components.css)'),
    ('styles/fig.css',       'builder shell + Figma inspector (tenderfy-admin)'),
    ('styles/lst.css',       'listing cards (tenderfy-admin/components.css)'),
]

TRANS = {'—': '--', '–': '-', '─': '-', '═': '=',
         '·': '-', '’': "'", '×': 'x', 'ç': 'c'}


def ascii_comments(s):
    """CSS/JS comments only ever hold decorative non-ASCII -- transliterate."""
    return ''.join(TRANS.get(c, c if ord(c) < 128 else '?') for c in s)


def entities(s):
    return ''.join(c if ord(c) < 128 else '&#x%X;' % ord(c) for c in s)


def read(rel):
    with open(os.path.join(HERE, rel), encoding='utf-8') as fh:
        return fh.read()


def main():
    css_out = []
    for rel, label in CSS:
        css_out.append('/* --- %s --- */\n%s' % (label, ascii_comments(read(rel))))

    body = read('app-body.html')
    m = re.search(r'(<style>)(.*?)(</style>)', body, re.S)
    body = (body[:m.start()] + m.group(1) + ascii_comments(m.group(2)) + m.group(3)
            + entities(body[m.end():]))

    js = '\n'.join(read(p) for p in PARTS)
    js += "\n\nif(!location.hash) location.hash = '/tenders';\nrenderRoute();\n"
    js = ''.join(c if ord(c) < 128 else '\\u%04X' % ord(c) for c in js)

    out = ('<title>Client Block Builder</title>\n<style>\n'
           + '\n'.join(css_out) + '\n</style>\n'
           + body + '\n<script>\n' + js + '\n</script>\n')

    assert all(ord(c) < 128 for c in out), 'non-ascii leaked into the build'
    dest = os.path.join(ROOT, 'index.html')
    with open(dest, 'w', encoding='ascii') as fh:
        fh.write(out)
    print('built %s (%s bytes)' % (dest, os.path.getsize(dest)))


if __name__ == '__main__':
    main()
