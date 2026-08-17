# Client Block Builder

A click-through prototype of the **client-facing** Tenderfy business admin: the
Tenders flow, the File Manager, and a two-mode document editor with a Block
Builder behind it.

**Live:** enable GitHub Pages on `main` — the page is `index.html` at the root.

---

## What it covers

| Area | Route |
|---|---|
| Tenders list / detail / **Build Tender** | `#/tenders`, `#/tenders/tender-details/`, `#/tenders/build-tender/` |
| File Manager (Resumes, Case Studies, Policies, Insurances, Certifications, Org Chart, Others) | `#/file-manager/…` |
| **Block Library** | `#/file-manager/block-library` |
| Resume editor · Case study editor | `#/file-manager/resumes/add-resume`, `#/file-manager/case-studies/add-edit-case-study/` |

A floating **Route** switcher (bottom-left) jumps between the recreated pages.

## The idea

Documents are edited in one of two modes, toggled from a header that is
pixel-identical across both so nothing shifts:

- **Simple** — what the live app offers today. Resumes get a template chooser and
  a form with a live preview; case studies get a WYSIWYG canvas where each block
  carries its own rich-text toolbar.
- **Advanced** — the **Document Builder**. The same document as blocks, with a
  Figma-style inspector (Layout → Dimension → Fill → Appearance → Stroke), a
  Layers panel, and a Top Layer for letterhead and footer.

Behind both sits the **Block Builder** (Block Library → *New Block*), which
composes *elements* into *blocks*. A saved block immediately appears in every
palette and renders everywhere, because one code path (`renderComposedDoc`)
draws both the editor canvas and every preview.

An **element** is a single primitive; a **block** is primitives arranged in a
layout — so a new block needs no new code, only a new arrangement.

## Build

The page ships as one self-contained file: fonts are base64-embedded and there
are no external requests, so it runs from `file://`, GitHub Pages, or inside a
strict CSP.

```
python3 src/build.py
```

Edit the sources in `src/`, re-run, commit `index.html`.

| File | Contains |
|---|---|
| `src/app-body.html` | page chrome, editor shells and all bespoke CSS |
| `src/part1-core.js` | helpers, toast, sidebar IA, tender data |
| `src/part2-blocks.js` | primitives, `BLOCKS`, schematic thumbnails |
| `src/part3-library.js` | file-manager data, routes, router |
| `src/part4-pages.js` | tenders, tender detail, Build Tender, cover style |
| `src/part5-docbuilder.js` | composed-document model + Document Builder |
| `src/part6-docpages.js` | document seeds, editor routes, Block Library |
| `src/part7-simple.js` | Simple mode + the unsaved-changes guard |
| `src/part8-blockeditor.js` | Block Builder |
| `src/styles/` | the design system, imported from the prototype repos |

Two constraints worth knowing before editing:

- **The build must stay pure ASCII.** The page carries no `<meta charset>`, and
  non-ASCII turned into mojibake. `build.py` escapes JS to `\uXXXX` and markup to
  `&#xNNNN;`, and asserts on anything that leaks through.
- **`ROUTES` is built before the later files run**, so page functions it
  references must be `function` declarations, not `const` arrows.

## Provenance

Chrome, sidebar IA and the Simple editors were read from the live app
(`stgbusinessadmin.tenderfy.org`). The design system comes from
[`tenderfy-subbie-portal`](https://github.com/daandydoan/tenderfy-subbie-portal);
the block model, Document Builder and Block Builder are ported from
[`tenderfy-admin`](https://github.com/daandydoan/tenderfy-admin).

Deliberate divergences from live: the UI font is **Outfit** (live ships Manrope),
and workflow **status** and **document-type** chips are omitted as super-admin
concepts. Prototype only — no backend, no persistence.

## Known gaps

- Document Builder: the Width field in *Fill* mode shows its stored px value
  rather than a live measurement.
- Block Builder: undo / redo and style copy / paste are stubs.
- Resume form: the per-section *Save* buttons are cosmetic; the document saves
  as a whole.
