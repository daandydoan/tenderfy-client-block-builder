/* ═══ Shared composed-document model ═══════════════════════════════════════
   Ported from tenderfy-admin/document-render.js. ONE code path for how a
   composed document looks, so the builder and every preview render the same
   thing. A document's composition is an ordered list of items:
     {t:'block'|'element', id, content?, style?}                              */

const DOC_ITEM_STYLE_DEFAULT = {
  padH:0, padV:0, padSides:false, padT:0, padR:0, padB:0, padL:0,
  marH:0, marV:0, marSides:false, marT:0, marR:0, marB:0, marL:0,
  rad:0, radSides:false, radTL:0, radTR:0, radBR:0, radBL:0,
  bgOn:false, bg:'#ffffff', bgA:100, bgVis:true,
  bcOn:false, bc:'#dbe3e0', bcA:100, bcVis:true, bw:1, bpos:'inside',
  wMode:'fill', wPx:480, wMin:0, wMax:0, hMode:'auto', hVal:120, hMin:0, hMax:0,
};
function boxCss(s, key){
  if(!s) return '0px';
  if(s[key+'Sides']) return `${s[key+'T']||0}px ${s[key+'R']||0}px ${s[key+'B']||0}px ${s[key+'L']||0}px`;
  const h = s[key+'H'] != null ? s[key+'H'] : (s[key]||0);
  const v = s[key+'V'] != null ? s[key+'V'] : (s[key]||0);
  return `${v}px ${h}px`;
}
function radCss(s){
  if(s && s.radSides) return `${s.radTL||0}px ${s.radTR||0}px ${s.radBR||0}px ${s.radBL||0}px`;
  return `${(s&&s.rad)||0}px`;
}
function radAny(s){ return !!s && (s.radSides ? (s.radTL||s.radTR||s.radBR||s.radBL) : s.rad>0); }
function paintCss(hex, a){
  if(a == null || a >= 100 || !hex) return hex || '';
  a = Math.max(0, Math.min(100, a))/100;
  let h = String(hex).replace('#',''); if(h.length === 3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h,16); if(isNaN(n)) return hex;
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function docHeightCss(s){
  const m = (s&&s.hMode)||'auto', v = Math.max(0,(s&&s.hVal)||0);
  let c = m === 'hug' ? 'height:fit-content;'
        : m === 'fixed' ? `height:${v}px;overflow:hidden;`
        : m === 'min' ? `min-height:${v}px;`                 // legacy modes
        : m === 'max' ? `max-height:${v}px;overflow:auto;` : '';
  // Min and Max are their own fields now, independent of the mode.
  if(s && s.hMin > 0) c += `min-height:${s.hMin}px;`;
  if(s && s.hMax > 0) c += `max-height:${s.hMax}px;overflow:auto;`;
  return c;
}
function docItemHtml(it, brand, cls, extra){
  let inner = '';
  const content = it.content || {};
  if(it.t === 'element'){
    inner = `<span class="dp" data-pi="0">${renderPrimitive(it.id, brand, content[0] || {})}</span>`;
  } else {
    const b = BLOCK_BY_ID[it.id];
    inner = b ? composeBlock(b, brand, content) : '';
  }
  const s = Object.assign({}, DOC_ITEM_STYLE_DEFAULT, it.style || {});
  const marUsed = s.marSides || s.marH || s.marV || s.marT || s.marR || s.marB || s.marL;
  let c = `box-sizing:border-box;padding:${boxCss(s,'pad')};margin:${marUsed?boxCss(s,'mar'):'0 0 16px'};`
        + `border-radius:${radCss(s)};` + docHeightCss(s);
  if(s.wMode === 'fixed' && s.wPx > 0) c += `width:${s.wPx}px;max-width:100%;margin-left:auto;margin-right:auto;`;
  if(s.wMin > 0) c += `min-width:${s.wMin}px;`;
  if(s.wMax > 0) c += `max-width:${s.wMax}px;margin-left:auto;margin-right:auto;`;
  if(radAny(s)) c += 'overflow:hidden;';
  if(s.bgOn && s.bgVis !== false) c += `background:${paintCss(s.bg, s.bgA)};`;
  if(s.bcOn && s.bcVis !== false){
    const w = s.bw != null ? s.bw : 1, col = paintCss(s.bc, s.bcA);
    c += s.bpos === 'inside' ? `box-shadow:inset 0 0 0 ${w}px ${col};`
       : s.bpos === 'center' ? `outline:${w}px solid ${col};outline-offset:${-w/2}px;`
       : `border:${w}px solid ${col};`;
  }
  return `<div class="${cls||'doc-blk-r'}" ${extra||''} style="${c}">${inner}</div>`;
}
function renderComposedDoc(items, brand, opts){
  opts = opts || {};
  const pad = opts.density ? Math.round(46*opts.density) : 46;
  const body = (items||[]).map(it => docItemHtml(it, brand)).join('');
  const band = id => id ? `<div style="padding:${Math.round(pad*.6)}px ${Math.round(pad*1.09)}px">${renderStationery(BLOCK_BY_ID[id].p, brand)}</div>` : '';
  return `<div style="position:relative;display:flex;flex-direction:column;min-height:100%;text-align:left">
    ${renderDocBg(opts.bg, opts.page||0)}
    <div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column">
      ${band(opts.header)}
      <div style="flex:1;padding:${pad}px ${Math.round(pad*1.09)}px;display:flex;flex-direction:column;gap:0">${body}</div>
      ${band(opts.footer)}</div></div>`;
}

/* ── A4 pagination ─────────────────────────────────────────────────────────
   One paginator for the builder's Preview and the read-only view pages, so a
   document breaks into the same A4 sheets wherever it is shown. Ported from
   document-edit.html's renderPreview, lifted out so both callers share it.   */
const A4_W = 700, A4_H = 990;             // A4 at 700px wide (297/210 = 1.414)
function docFurniture(doc){
  const hb = doc.header && BLOCK_BY_ID[doc.header], fb = doc.footer && BLOCK_BY_ID[doc.footer];
  return {
    head: hb ? `<div class="pv-furn" style="margin-bottom:22px">${renderStationery(hb.p, doc.brand)}</div>` : '',
    foot: fb ? `<div class="pv-furn" style="margin-top:auto;padding-top:22px">${renderStationery(fb.p, doc.brand)}</div>` : ''
  };
}
function docStyleOf(doc){ return doc.docStyle || (doc.docStyle = {bg:'#ffffff', pad:36, gap:12, rad:4}); }
/* Measures the real rendered heights inside `host`, then groups blocks into
   pages. Returns an array of arrays of block HTML. */
function docSplitPages(host, doc, blocks, head, foot){
  const ds = docStyleOf(doc);
  try{
    const meas = document.createElement('div');
    meas.style.cssText = `position:absolute;left:-9999px;top:0;width:${A4_W}px;box-sizing:border-box;padding:${ds.pad}px;visibility:hidden`;
    meas.innerHTML = head + blocks.join('') + foot; host.appendChild(meas);
    const kids = [...meas.children];
    const headH = head ? kids[0].getBoundingClientRect().height + 22 : 0;
    const footH = foot ? kids[kids.length-1].getBoundingClientRect().height + 16 : 0;
    const bEls = kids.slice(head?1:0, foot?kids.length-1:kids.length);
    const hts = bEls.map(el => { const cs = getComputedStyle(el); return el.getBoundingClientRect().height + (parseFloat(cs.marginBottom)||0); });
    meas.remove();
    const usable = Math.max(120, A4_H - 2*ds.pad - headH - footH);
    const pages = []; let cur = [], acc = 0;
    for(let i=0;i<blocks.length;i++){ const h = hts[i]||0; if(cur.length && acc+h > usable){ pages.push(cur); cur = []; acc = 0; } cur.push(blocks[i]); acc += h; }
    if(cur.length || !pages.length) pages.push(cur);
    return pages;
  }catch(e){ return [blocks]; }
}
/* Fills `host` with the document as A4 sheets. cls picks the page chrome:
   'vb-page' inside the builder, 'vpage' on the view pages.                   */
function renderDocPages(host, doc, opts){
  opts = opts || {};
  const ds = docStyleOf(doc);
  const {head, foot} = docFurniture(doc);
  const blocks = doc.items.map(opts.blockHtml || (it => docItemHtml(it, doc.brand, 'pv-blk')));
  const pages = blocks.length ? docSplitPages(host, doc, blocks, head, foot) : [[]];
  const n = pages.length;
  host.innerHTML = pages.map((pg,pi) =>
    `<div class="${opts.cls||'vpage'} a4-fixed" style="background:${ds.bg};border-radius:${ds.rad}px">
       <div class="doc-bg">${renderDocBg(doc.bg, pi)}</div>
       <div class="doc-body" style="padding:${ds.pad}px;gap:0">${head}${pg.join('')}${foot}</div>
       ${n>1||opts.alwaysNumber ? `<span class="pg-num">Page ${pi+1} / ${n}</span>` : ''}
     </div>`).join('');
  return n;
}

/* ── Background layer ──────────────────────────────────────────────────────
   Ported from tenderfy-admin/document-edit.html. Fill regions sit behind the
   content on every page; "first page only" regions render on page 0 alone.
   Custom CSS is an escape hatch for a gradient or an SVG data URI.           */
const BG_SHAPES = [['full','Full page'],['band-top','Top band'],['band-bottom','Bottom band'],
  ['half-top','Top half'],['half-bottom','Bottom half'],['half-left','Left half'],['half-right','Right half'],
  ['col-left','Left column'],['col-right','Right column'],['region','Custom region']];
let bgUid = 0;
function newDocBg(){ return {mode:'regions', regions:[], css:''}; }
/* A region paints a solid fill, a gradient or an image. */
const BG_KINDS = [['fill','Fill'],['gradient','Gradient'],['image','Image']];
const BG_FITS  = [['cover','Cover'],['contain','Contain'],['fill','Stretch'],['repeat','Tile']];
const BG_POS   = [['center','Centre'],['top','Top'],['bottom','Bottom'],['left','Left'],['right','Right']];
function mkRegion(brand){
  return {id:++bgUid, kind:'fill', shape:'band-top', h:120, w:200, x:40, y:40,
    color:(brand?brand.primary:'#27535C'), color2:(brand?brand.secondary:'#38988A'), angle:135,
    img:'', fit:'cover', pos:'center',
    op:1, firstOnly:false};
}
function bgKindOf(r){ return r.kind || (r.gradOn ? 'gradient' : 'fill'); }   // pre-kind regions
function bgGeom(r){ switch(r.shape){
    case 'full': return 'inset:0';
    case 'band-top': return `left:0;right:0;top:0;height:${r.h}px`;
    case 'band-bottom': return `left:0;right:0;bottom:0;height:${r.h}px`;
    case 'half-top': return 'left:0;right:0;top:0;height:50%';
    case 'half-bottom': return 'left:0;right:0;bottom:0;height:50%';
    case 'half-left': return 'top:0;bottom:0;left:0;width:50%';
    case 'half-right': return 'top:0;bottom:0;right:0;width:50%';
    case 'col-left': return `top:0;bottom:0;left:0;width:${r.w}px`;
    case 'col-right': return `top:0;bottom:0;right:0;width:${r.w}px`;
    case 'region': return `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`;
    default: return 'inset:0';
} }
/* A data URI carries slashes and semicolons, which break the `background`
   shorthand, so image regions are written as longhand declarations. */
function bgPaintCss(r){
  if(bgKindOf(r) === 'image'){
    if(!r.img) return `background:${bgFill(r)};`;
    const fit = r.fit || 'cover';
    // Single quotes: a double-quoted url() would close the style attribute.
    return `background-image:url('${r.img}');background-position:${r.pos||'center'};`
      + (fit === 'repeat' ? 'background-repeat:repeat;'
         : `background-size:${fit === 'fill' ? '100% 100%' : fit};background-repeat:no-repeat;`);
  }
  return `background:${bgFill(r)};`;
}
function bgFill(r){
  const k = bgKindOf(r);
  if(k === 'gradient') return `linear-gradient(${r.angle == null ? 135 : r.angle}deg, ${r.color}, ${r.color2})`;
  if(k === 'image'){
    if(!r.img) return 'repeating-linear-gradient(45deg,#EDF1F0 0 10px,#F7F9F8 10px 20px)';   // no image chosen yet
    const fit = r.fit || 'cover';
    return fit === 'repeat'
      ? `url('${r.img}') ${r.pos||'center'} repeat`
      : `url('${r.img}') ${r.pos||'center'}/${fit === 'fill' ? '100% 100%' : fit} no-repeat`;
  }
  return r.color;
}
function renderDocBg(bg, pi){
  if(!bg) return '';
  if(bg.mode === 'code'){
    const css = (bg.css||'').replace(/[<>]/g,'').replace(/"/g,"'");
    return css ? `<div style="position:absolute;inset:0;z-index:0;${css}"></div>` : '';
  }
  return (bg.regions||[]).filter(r => !r.firstOnly || pi === 0).map(r =>
    `<div style="position:absolute;z-index:0;${bgGeom(r)};${bgPaintCss(r)}opacity:${r.op}"></div>`).join('');
}
const KIND_LABEL = {page:'Page', section:'Section', resume:'Resume', 'case-study':'Case Study',
  block:'Block', cover:'Cover Page', toc:'Contents'};
function newDoc(kind, name){
  return {name: name || 'Untitled Document', kind: kind || 'page', status:'draft',
    header:null, footer:null, items:[], bg:newDocBg(),
    brand:{primary:'#27535C', secondary:'#38988A', background:'#F7F9F8', font:'Outfit', bodyFont:'Outfit', company:'Tenderfy Civil'}};
}
const docItem = (t, id, content, style) => ({t, id, content: content||{}, style: Object.assign({}, DOC_ITEM_STYLE_DEFAULT, style||{})});


/* ── Shared editor chrome ─────────────────────────────────────────────────
   One header for Simple, Advanced and the Block Builder, so the UI does not
   jump when you toggle. rteHtml/dbWireInline give the rich-text fields and
   the edit-on-the-page behaviour this prototype adds over the admin editor. */
function edHeadHtml(cfg){
  const d = cfg.doc;
  const label = (d.isNew ? 'Create ' : 'Save ') + (KIND_LABEL[d.kind] || 'Document');
  return `
    <button class="lbtn gold ed-back" onclick="${cfg.exit}"><span class="ms">keyboard_arrow_left</span> Back</button>
    <div class="ed-titlewrap">
      <div class="ed-title"><input value="${esc(d.name)}" oninput="${cfg.rename}"></div>
      <div class="ed-sub">${cfg.sub || ''}</div>
    </div>
    <div class="sp">
      ${cfg.extras || ''}
      <button class="lbtn icon-sm" ${cfg.dup ? `onclick="${cfg.dup}"` : `data-toast="Duplicated as a new ${esc((KIND_LABEL[d.kind]||'document').toLowerCase())}"`} title="Duplicate"><span class="ms">content_copy</span></button>
      ${smToggle(cfg.mode)}
      <button class="lbtn" onclick="${cfg.exit}">Cancel</button>
      <button class="lbtn pri" onclick="${cfg.save}"><span class="ms">save</span> ${esc(cfg.saveLabel || label)}</button>
    </div>`;
}

function dbWireInline(root){
  root.querySelectorAll('[data-f]').forEach(el => {
    const holder = el.closest('.db-item, .db-pv');
    const wrap = el.closest('.dp');
    if(!holder || !wrap) return;
    const it = DB.doc.items[+holder.dataset.i];
    if(!it) return;
    const pi = +wrap.dataset.pi, f = el.dataset.f;
    el.setAttribute('contenteditable', 'true');
    el.classList.add('inline-ed');
    el.addEventListener('click', e => e.stopPropagation());   // editing shouldn't re-render
    el.addEventListener('focus', () => dbSel(+holder.dataset.i, true));
    el.addEventListener('input', () => {
      markDirty(DB.doc);
      const c = (it.content[pi] = it.content[pi] || {});
      if(f === 'items'){
        c.items = [...wrap.querySelectorAll('[data-f="items"]')].map(li => li.innerHTML);
      } else if(f === 'headers'){
        c.headers = [...wrap.querySelectorAll('[data-f="headers"]')].map(th => th.textContent);
      } else if(f === 'rows' || f === 'pairs'){
        const grid = [];
        wrap.querySelectorAll(`[data-f="${f}"]`).forEach(cell => {
          const r = +cell.dataset.r; (grid[r] = grid[r] || [])[+cell.dataset.c] = cell.textContent;
        });
        c[f] = grid;
      } else {
        c[f] = el.innerHTML;
      }
      dbInspector();          // keep the sidebar in step
    });
  });
}

function rteHtml(id, value, pi, field, tall){
  const b = (ic,t,cmd) => `<button class="srte-b" title="${t}" onmousedown="event.preventDefault()" onclick="document.execCommand('${cmd}')"><span class="ms">${ic}</span></button>`;
  return `<div class="srte">
    <div class="srte-bar">
      ${b('format_bold','Bold','bold')}${b('format_italic','Italic','italic')}${b('format_underlined','Underline','underline')}
      <span class="srte-sep"></span>
      <button class="srte-b" title="Bulleted list" onmousedown="event.preventDefault()" onclick="document.execCommand('insertUnorderedList')"><span class="ms">format_list_bulleted</span></button>
      <button class="srte-b" title="Accent colour" onmousedown="event.preventDefault()" onclick="document.execCommand('foreColor',false,DB.doc.brand.secondary)"><span class="ms" style="color:var(--live-cta)">format_color_text</span></button>
      <button class="srte-b" title="Clear formatting" onmousedown="event.preventDefault()" onclick="document.execCommand('removeFormat')"><span class="ms">format_clear</span></button>
    </div>
    <div class="srte-ed${tall?' tall':''}" contenteditable="true" data-rte="${pi}" data-k="${field}"
         data-ph="Type here...">${value == null ? '' : value}</div>
  </div>`;
}

/* ═══ The Document Builder ═════════════════════════════════════════════════
   Ported from tenderfy-admin/document-edit.html. That file's script drives
   everything below: the Blocks/Layers left panes, the compact Layout list with
   measured page-break markers, the paginated A4 Preview that repeats the
   letterhead and footer on every page, the document Style controls, the Top
   and Background layers, and the Figma inspector with scrub handles.

   Dropped, as super-admin only: the client/brand inheritance picker and Ray's
   block suggester. Kept from this prototype: editing content directly on the
   page in Preview, and the Simple <-> Advanced handover.                     */

let DB = null;

(function(){
  const $ = id => document.getElementById(id);
  const canvas = $('canvas'), wrap = $('dcvWrap'), palette = $('dpalette');
  const A4H = A4_H;                        // A4 page height at A4_W wide
  let uid = 0, mode = 'layout', selK = null, curItem = null, pq = '';

  const items = () => DB.doc.items;
  const brandOf = () => DB.doc.brand;
  const docStyle = () => DB.doc.docStyle;

  /* This build keeps its own item shape ({t,id,content,style}), which every
     preview and the Simple editor already read; these mirror the admin's
     inst* helpers over it. */
  function instObj(it){ return BLOCK_BY_ID[it.id] || {}; }
  function instLabel(it){ const o = instObj(it); return it.t === 'element' ? (BE_NAME[it.id] || it.id) : (o.label || it.id); }
  function instDesc(it){ return instObj(it).desc || ''; }
  function instIcon(it){
    if(it.t === 'element') return PRIM_ICON[it.id] || 'widgets';
    const p = instObj(it).p || '';
    return /^l[hf]-/.test(p) ? 'flip_to_front' : 'grid_view';
  }
  function instFromToken(tok){
    const el = String(tok).startsWith('el:');
    const it = docItem(el ? 'element' : 'block', el ? tok.slice(3) : tok);
    it.k = ++uid;
    return it;
  }

  // ---- Palette ----
  function renderPalette(){
    const hit = txt => !pq || txt.toLowerCase().includes(pq);
    const blocks = BLOCKS.filter(b => b.cat !== 'Headers & Footers' && !b.slot && hit(b.name + ' ' + b.cat));
    let html = BLOCK_CATS.filter(c => c !== 'Headers & Footers' && blocks.some(b => b.cat === c)).map(cat =>
      `<div class="pal-tag">${esc(cat)}</div>` + blocks.filter(b => b.cat === cat).map(b =>
        `<div class="vb-widget" draggable="true" data-id="${b.id}" data-kind="block" title="${esc(b.desc||'')}"><div class="pal-prev blk-preview">${blockSchematic(b)}</div><span class="pal-lbl">${esc(b.label)}</span></div>`).join('')
    ).join('');
    const els = PRIMITIVES.filter(p => hit(p.name + ' ' + p.tag));
    if(els.length){
      html += `<div class="pal-sect"><span class="ms" style="font-size:15px">category</span> Elements</div>`;
      html += [...new Set(PRIMITIVES.map(p => p.tag))].filter(t => els.some(p => p.tag === t)).map(tag =>
        `<div class="pal-tag">${esc(tag)}</div>` + els.filter(p => p.tag === tag).map(p =>
          `<div class="vb-widget vb-el" draggable="true" data-id="${p.id}" data-kind="element" title="${esc(p.desc)}"><span class="ms el-ic">${PRIM_ICON[p.id]||'widgets'}</span><span class="pal-lbl">${esc(p.name)}</span></div>`).join('')
      ).join('');
    }
    palette.innerHTML = html;
    $('pal-count').textContent = `(${blocks.length + els.length})`;
    palette.querySelectorAll('.vb-widget').forEach(el => {
      const tok = el.dataset.kind === 'element' ? ('el:' + el.dataset.id) : el.dataset.id;
      el.addEventListener('click', () => addItem(tok));
      el.addEventListener('dragstart', e => { e.dataTransfer.setData('add', tok); el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
  }
  $('pq').addEventListener('input', e => { pq = e.target.value.toLowerCase().trim(); renderPalette(); });

  // ---- Canvas ----
  function renderBlockInstance(it){
    return docItemHtml(it, brandOf(), 'pv-blk' + (it.k === selK ? ' sel' : ''), `data-k="${it.k}"`);
  }
  function furnSlot(kind, bottom){
    const bid = kind === 'header' ? DB.doc.header : DB.doc.footer, b = bid && BLOCK_BY_ID[bid];
    const label = kind === 'header' ? 'Letterhead' : 'Footer';
    const body = b ? `<div class="furn-prev">${renderStationery(b.p, brandOf())}</div>`
                   : `<div class="furn-empty"><span class="ms">add</span> No ${label.toLowerCase()} &mdash; choose one in Layers &#9654; Top</div>`;
    return `<div class="doc-furn" data-furn="${kind}"${bottom?' style="margin-top:auto"':''}><div class="furn-tag"><span class="ms">flip_to_front</span> ${label} - Top layer</div>${body}</div>`;
  }
  function furnHTML(){
    const hb = DB.doc.header && BLOCK_BY_ID[DB.doc.header], fb = DB.doc.footer && BLOCK_BY_ID[DB.doc.footer];
    return {
      head: hb ? `<div class="pv-furn" style="margin-bottom:22px">${renderStationery(hb.p, brandOf())}</div>` : '',
      foot: fb ? `<div class="pv-furn" style="margin-top:auto;padding-top:22px">${renderStationery(fb.p, brandOf())}</div>` : ''
    };
  }
  /* Measure the real rendered content into A4 pages, so Layout can show where
     the page breaks fall and Preview can paginate for real. */
  function measure(blocks, head, foot){
    const ds = docStyle();
    const meas = document.createElement('div');
    meas.style.cssText = `position:absolute;left:-9999px;top:0;width:${A4_W}px;box-sizing:border-box;padding:${ds.pad}px;visibility:hidden`;
    meas.innerHTML = head + blocks.join('') + foot; wrap.appendChild(meas);
    const kids = [...meas.children];
    const headH = head ? kids[0].getBoundingClientRect().height + 22 : 0;
    const footH = foot ? kids[kids.length-1].getBoundingClientRect().height + 16 : 0;
    const bEls = kids.slice(head?1:0, foot?kids.length-1:kids.length);
    const hts = bEls.map(el => { const cs = getComputedStyle(el); return el.getBoundingClientRect().height + (parseFloat(cs.marginBottom)||0); });
    meas.remove();
    return {hts, usable: Math.max(120, A4H - 2*ds.pad - headH - footH)};
  }
  function renderPreview(){
    return renderDocPages(canvas, DB.doc, {cls:'vb-page', alwaysNumber:true, blockHtml:renderBlockInstance});
  }
  function measurePages(){
    const {head,foot} = furnHTML(), blocks = items().map(renderBlockInstance);
    let pageOf = [], count = 1;
    try{
      const {hts, usable} = measure(blocks, head, foot);
      let pg = 0, acc = 0;
      for(let i=0;i<blocks.length;i++){ const h = hts[i]||0; if(i>0 && acc+h > usable){ pg++; acc = 0; } pageOf[i] = pg; acc += h; }
      count = pg + 1;
    }catch(e){ pageOf = items().map(()=>0); count = 1; }
    return {count, pageOf};
  }
  function render(){
    canvas.style.setProperty('--teal', brandOf().secondary || '');
    let pageCount = 1;
    if(mode === 'preview' && items().length){
      pageCount = renderPreview();
    } else if(!items().length){
      canvas.innerHTML = `<div class="vb-page"><div class="doc-bg">${renderDocBg(DB.doc.bg,0)}</div><div class="doc-body"><div class="doc-empty"><span class="ms big">library_add</span>Empty document<div class="fhint" style="margin-top:6px">Drag a block from the left, or click one to add it.</div></div></div></div>`;
    } else {
      const {count, pageOf} = measurePages(); pageCount = count;
      const card = (it,i) => `
        <div class="doc-blk doc-compact ${it.k===selK?'sel':''}" draggable="true" data-i="${i}" data-k="${it.k}" title="${esc(instDesc(it))}">
          <span class="ms cmp-grip" data-grip>drag_indicator</span>
          <span class="cmp-ic"><span class="ms">${instIcon(it)}</span></span>
          <span class="cmp-name">${esc(instLabel(it))}</span>
          <span class="cmp-tag ${it.t==='element'?'el':''}">${it.t==='element'?'Element':'Block'}</span>
          <span class="ms cmp-rm" data-rm="${i}" title="Remove">close</span>
        </div>`;
      const rows = items().map((it,i) => {
        const brk = (i>0 && pageOf[i] !== pageOf[i-1]) ? `<div class="pg-brk"><span><span class="ms" style="font-size:14px;vertical-align:-2px">insert_page_break</span> Page ${pageOf[i]+1}</span></div>` : '';
        return brk + card(it,i);
      }).join('');
      canvas.innerHTML = `<div class="vb-page"><div class="doc-bg">${renderDocBg(DB.doc.bg,0)}</div><div class="doc-body">${furnSlot('header')}${rows}${furnSlot('footer',true)}</div></div>`;
    }
    const lc = $('lyr-count'); if(lc) lc.textContent = items().length;
    $('doc-count').textContent = items().length ? `- ${items().length} block${items().length>1?'s':''} - ${pageCount} A4 page${pageCount>1?'s':''}` : '';
    applyDocStyle();
    wire();
    if(mode === 'preview') dbWireInline(canvas);      // content is editable straight on the page
  }
  function wire(){
    canvas.querySelectorAll('.pv-blk[data-k]').forEach(el => {
      el.addEventListener('click', e => { if(e.target.closest('[data-f]')) return; e.stopPropagation(); selK = +el.dataset.k; render(); renderInspector(); });
    });
    canvas.querySelectorAll('.doc-furn').forEach(el => el.addEventListener('click', e => { e.stopPropagation(); selK = null; renderInspector(); showLeftTab('layers'); }));
    canvas.querySelectorAll('[data-rm]').forEach(x => x.addEventListener('click', e => { e.stopPropagation(); const [rm] = items().splice(+x.dataset.rm,1); if(rm && rm.k===selK) selK=null; markDirty(DB.doc); render(); renderInspector(); }));
    canvas.querySelectorAll('.doc-blk').forEach(el => {
      el.addEventListener('click', e => { if(e.target.closest('.doc-tools')) return; selK = +el.dataset.k; render(); renderInspector(); });
      el.addEventListener('dragstart', e => { e.dataTransfer.setData('move', el.dataset.i); el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', e => e.preventDefault());
      el.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        const mv = e.dataTransfer.getData('move'), add = e.dataTransfer.getData('add'), to = +el.dataset.i;
        if(add){ items().splice(to,0,instFromToken(add)); } else if(mv !== ''){ const [m] = items().splice(+mv,1); items().splice(to,0,m); }
        markDirty(DB.doc); render();
      });
    });
  }
  function addItem(tok){
    const it = instFromToken(tok); items().push(it);
    selK = (mode === 'layout') ? it.k : null;
    markDirty(DB.doc); render(); renderInspector();
    showToast((it.t==='element' ? 'Added element: ' : 'Added block: ') + instLabel(it));
  }
  wrap.addEventListener('dragover', e => { if(e.dataTransfer.types.includes('add')){ e.preventDefault(); wrap.classList.add('drag-over'); } });
  wrap.addEventListener('dragleave', e => { if(!wrap.contains(e.relatedTarget)) wrap.classList.remove('drag-over'); });
  wrap.addEventListener('drop', e => { wrap.classList.remove('drag-over'); const add = e.dataTransfer.getData('add'); if(add && !e.target.closest('.doc-blk')){ e.preventDefault(); addItem(add); } });

  // ---- Document style (page fill / padding / spacing / radius) ----
  function applyDocStyle(){
    const ds = docStyle();
    canvas.querySelectorAll('.vb-page').forEach(p => { p.style.background = ds.bg; p.style.borderRadius = ds.rad+'px'; });
    canvas.querySelectorAll('.doc-body').forEach(b => { b.style.padding = ds.pad+'px'; b.style.gap = (mode==='preview'?0:ds.gap)+'px'; });
  }
  function syncDoc(){ markDirty(DB.doc); if(mode === 'preview') render(); else applyDocStyle(); }
  function bindRange(rId,nId,key){
    const R = $(rId), N = $(nId);
    const set = v => { v = Math.max(+R.min, Math.min(+R.max, Math.round(+v||0))); docStyle()[key] = v; R.value = v; N.value = v; syncDoc(); };
    R.addEventListener('input', () => set(R.value)); N.addEventListener('input', () => set(N.value));
  }
  bindRange('ds-pad','ds-padN','pad'); bindRange('ds-gap','ds-gapN','gap'); bindRange('ds-rad','ds-radN','rad');
  const dbg = $('ds-bg'), dbgH = $('ds-bgH');
  dbg.addEventListener('input', () => { docStyle().bg = dbg.value; dbgH.value = dbg.value.toUpperCase(); syncDoc(); });
  dbgH.addEventListener('input', e => { const v = e.target.value.trim(); if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)){ docStyle().bg = v; dbg.value = v; syncDoc(); } });
  function syncDocStyleInputs(){
    const ds = docStyle();
    [['ds-pad','ds-padN','pad'],['ds-gap','ds-gapN','gap'],['ds-rad','ds-radN','rad']].forEach(([r,n,k]) => { $(r).value = ds[k]; $(n).value = ds[k]; });
    dbg.value = ds.bg; dbgH.value = ds.bg.toUpperCase();
  }

  // ---- Left-panel tabs (Blocks / Layers) ----
  function showLeftTab(which){
    document.querySelectorAll('#db .lt-tab').forEach(x => x.classList.toggle('on', x.dataset.lt === which));
    $('paneBlocks').style.display = which === 'blocks' ? '' : 'none';
    $('paneLayers').style.display = which === 'layers' ? '' : 'none';
  }
  document.querySelectorAll('#db .lt-tab').forEach(t => t.addEventListener('click', () => showLeftTab(t.dataset.lt)));
  document.querySelectorAll('#db .acc-h').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('closed')));

  // ---- Top layer (letterhead / footer, from Headers & Footers blocks) ----
  const lhSel = $('lh-sel'), lfSel = $('lf-sel');
  function furnMini(el, bid){ const b = bid && BLOCK_BY_ID[bid]; el.innerHTML = b ? `<div style="font-size:11px">${renderStationery(b.p, brandOf())}</div>` : `<span class="empty">None selected</span>`; }
  lhSel.addEventListener('change', () => { DB.doc.header = lhSel.value||null; furnMini($('lh-mini'), DB.doc.header); markDirty(DB.doc); render(); });
  lfSel.addEventListener('change', () => { DB.doc.footer = lfSel.value||null; furnMini($('lf-mini'), DB.doc.footer); markDirty(DB.doc); render(); });
  function syncTopLayer(){
    const heads = BLOCKS.filter(b => b.slot === 'header'), foots = BLOCKS.filter(b => b.slot === 'footer');
    lhSel.innerHTML = `<option value="">None</option>` + heads.map(b => `<option value="${b.id}"${DB.doc.header===b.id?' selected':''}>${esc(b.label)}</option>`).join('');
    lfSel.innerHTML = `<option value="">None</option>` + foots.map(b => `<option value="${b.id}"${DB.doc.footer===b.id?' selected':''}>${esc(b.label)}</option>`).join('');
    furnMini($('lh-mini'), DB.doc.header); furnMini($('lf-mini'), DB.doc.footer);
  }

  // ---- Background layer (fill regions + custom CSS) ----
  function bgGeoFields(r){
    const num = (k,l) => `<div class="g"><label>${l}</label><input type="number" data-geo="${k}" value="${r[k]}"></div>`;
    if(r.shape==='band-top'||r.shape==='band-bottom') return num('h','Height');
    if(r.shape==='col-left'||r.shape==='col-right') return num('w','Width');
    if(r.shape==='region') return num('x','X')+num('y','Y')+num('w','W')+num('h','H');
    return '';
  }
  function regionRow(r){
    const colorInput = (f,v) => `<div class="samp-row" style="margin-bottom:8px"><input type="color" data-f="${f}" value="${v}" style="width:30px;height:28px;border:1px solid var(--border);border-radius:6px;padding:2px;flex:none"><input class="ds-hex" data-f="${f}H" value="${String(v).toUpperCase()}" style="flex:1"></div>`;
    const sel = (f, list, cur) => `<select class="ds-sel" data-f="${f}">${list.map(([v,n])=>`<option value="${v}"${cur===v?' selected':''}>${n}</option>`).join('')}</select>`;
    const geo = bgGeoFields(r);
    const kind = bgKindOf(r);
    let body = '';
    if(kind === 'fill') body = colorInput('color', r.color);
    else if(kind === 'gradient'){
      body = colorInput('color', r.color) + colorInput('color2', r.color2) +
        `<div class="ds-row" style="margin-bottom:8px"><label>Angle</label><div class="ds-ctl">
          <input type="range" data-f="angle" min="0" max="360" value="${r.angle==null?135:r.angle}"><span class="ds-u">${r.angle==null?135:r.angle}&deg;</span></div></div>`;
    } else {
      body = `<div class="bg-img">
          ${r.img?`<img src="${r.img}" alt="">`:''}
          <label class="lbtn sm" style="width:100%;justify-content:center">
            <span class="ms">add_photo_alternate</span> ${r.img?'Replace image':'Choose an image'}
            <input type="file" data-f="imgfile" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>
          ${r.img?`<button class="lbtn sm" data-f="imgclear" style="width:100%;justify-content:center;margin-top:6px"><span class="ms">delete</span> Remove</button>`:''}
        </div>
        <div class="bg-geo" style="margin-top:8px">
          <div class="g"><label>Fit</label>${sel('fit', BG_FITS, r.fit||'cover')}</div>
          <div class="g"><label>Position</label>${sel('pos', BG_POS, r.pos||'center')}</div>
        </div>`;
    }
    return `<div class="bg-reg" data-id="${r.id}">
      <div class="bg-reg-h"><select class="ds-sel" data-f="shape">${BG_SHAPES.map(x=>`<option value="${x[0]}"${x[0]===r.shape?' selected':''}>${x[1]}</option>`).join('')}</select><button class="bg-del" title="Remove"><span class="ms">delete</span></button></div>
      <div class="bg-modeseg" data-kindseg style="margin-bottom:10px">
        ${BG_KINDS.map(([v,n])=>`<button data-kind="${v}" class="${kind===v?'on':''}">${n}</button>`).join('')}
      </div>
      ${geo?`<div class="bg-geo">${geo}</div>`:''}
      ${body}
      <div class="ds-row" style="margin:8px 0"><label>Opacity</label><div class="ds-ctl"><input type="range" data-f="op" min="0" max="100" value="${Math.round(r.op*100)}"><span class="ds-u">${Math.round(r.op*100)}%</span></div></div>
      <label class="bi-tog"><input type="checkbox" data-f="firstOnly"${r.firstOnly?' checked':''}>First page only</label>
    </div>`;
  }
  function renderBgRegions(){
    const bg = DB.doc.bg, w = $('bgRegions');
    w.innerHTML = bg.regions.length ? bg.regions.map(regionRow).join('')
      : `<div class="fhint" style="margin:2px 0 10px">No fill regions yet &mdash; add one, or switch to Custom CSS.</div>`;
    w.querySelectorAll('.bg-reg').forEach(el => {
      const r = bg.regions.find(x => x.id == el.dataset.id);
      el.querySelector('.bg-del').addEventListener('click', () => { bg.regions = bg.regions.filter(x => x !== r); renderBgRegions(); markDirty(DB.doc); render(); });
      el.querySelectorAll('[data-f]').forEach(inp => {
        const f = inp.dataset.f, ev = inp.type === 'checkbox' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          if(f==='shape'){ r.shape=inp.value; renderBgRegions(); }
          else if(f==='firstOnly'){ r.firstOnly=inp.checked; }
          else if(f==='fit'||f==='pos'){ r[f]=inp.value; }
          else if(f==='angle'){ r.angle=+inp.value; inp.nextElementSibling.innerHTML=inp.value+'&deg;'; }
          else if(f==='color'||f==='color2'){ r[f]=inp.value; const h=el.querySelector(`[data-f=${f}H]`); if(h)h.value=inp.value.toUpperCase(); }
          else if(f==='colorH'||f==='color2H'){ const v=inp.value.trim(); if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return; r[f.slice(0,-1)]=v; const c=el.querySelector(`[data-f=${f.slice(0,-1)}]`); if(c)c.value=v; }
          else if(f==='op'){ r.op=(+inp.value)/100; inp.nextElementSibling.textContent=inp.value+'%'; }
          markDirty(DB.doc); render();
        });
      });
      el.querySelectorAll('[data-geo]').forEach(inp => inp.addEventListener('input', () => { r[inp.dataset.geo]=Math.max(0,Math.round(+inp.value||0)); markDirty(DB.doc); render(); }));
      el.querySelectorAll('[data-kindseg] button').forEach(b => b.addEventListener('click', () => {
        r.kind = b.dataset.kind; delete r.gradOn; renderBgRegions(); markDirty(DB.doc); render();
      }));
      const file = el.querySelector('[data-f="imgfile"]');
      if(file) file.addEventListener('change', ev => {
        const f = ev.target.files && ev.target.files[0]; if(!f) return;
        if(f.size > 2 * 1024 * 1024){ showToast('Pick an image under 2MB'); ev.target.value=''; return; }
        const rd = new FileReader();
        rd.onload = () => { r.img = rd.result; renderBgRegions(); markDirty(DB.doc); render(); showToast('Background image added'); };
        rd.readAsDataURL(f); ev.target.value = '';
      });
      const clr = el.querySelector('[data-f="imgclear"]');
      if(clr) clr.addEventListener('click', () => { r.img=''; renderBgRegions(); markDirty(DB.doc); render(); });
    });
  }
  $('bgAdd').addEventListener('click', () => { DB.doc.bg.regions.push(mkRegion(brandOf())); renderBgRegions(); markDirty(DB.doc); render(); });
  document.querySelectorAll('#bgModeSeg button').forEach(b => b.addEventListener('click', () => {
    DB.doc.bg.mode = b.dataset.bgm;
    document.querySelectorAll('#bgModeSeg button').forEach(x => x.classList.toggle('on', x === b));
    $('bgRegionsPane').style.display = DB.doc.bg.mode === 'regions' ? '' : 'none';
    $('bgCodePane').style.display = DB.doc.bg.mode === 'code' ? '' : 'none';
    markDirty(DB.doc); render();
  }));
  $('bgCss').addEventListener('input', e => { DB.doc.bg.css = e.target.value; markDirty(DB.doc); render(); });
  function syncBgPane(){
    const bg = DB.doc.bg;
    document.querySelectorAll('#bgModeSeg button').forEach(x => x.classList.toggle('on', x.dataset.bgm === bg.mode));
    $('bgRegionsPane').style.display = bg.mode === 'regions' ? '' : 'none';
    $('bgCodePane').style.display = bg.mode === 'code' ? '' : 'none';
    $('bgCss').value = bg.css || '';
    renderBgRegions();
  }

  // ---- Mode toggle (Layout / Preview) ----
  function setMode(m){
    mode = m;
    document.querySelectorAll('#modeSeg button').forEach(x => x.classList.toggle('on', x.dataset.mode === m));
    applyDocStyle(); renderInspector(); render();
  }
  document.querySelectorAll('#modeSeg button').forEach(x => x.addEventListener('click', () => setMode(x.dataset.mode)));

  // ---- Block inspector (per-block content + style) ----
  function renderInspector(){
    const it = items().find(x => x.k === selK), show = !!it;
    $('blockInspector').style.display = show ? '' : 'none';
    $('docSettings').style.display = show ? 'none' : '';
    if(show) fillInspector(it); else curItem = null;
  }
  function fillInspector(it){
    curItem = it;
    $('bi-name').textContent = instLabel(it);
    $('bi-desc').textContent = instDesc(it);
    const s = it.style;
    fillBox(it,'pad'); fillBox(it,'mar'); fillRad(it);
    const wm = s.wMode||'fill'; $('bs-wmode').value = wm;
    const hm = s.hMode||'auto'; $('bs-hmode').value = (hm === 'min' || hm === 'max') ? 'auto' : hm;
    // Values stay editable; typing one switches that axis to Fixed.
    const node = canvas.querySelector(`[data-k="${it.k}"]`);
    $('bs-wpx').value = wm === 'fixed' ? (s.wPx||0) : (node ? Math.round(node.getBoundingClientRect().width) : (s.wPx||480));
    $('bs-hval').value = hm === 'fixed' ? (s.hVal||0) : (node ? Math.round(node.getBoundingClientRect().height) : (s.hVal||120));
    $('bs-wpx').disabled = false; $('bs-hval').disabled = false;
    [['bs-wmin','wMin'],['bs-wmax','wMax'],['bs-hmin','hMin'],['bs-hmax','hMax']].forEach(([id,k]) => {
      const el = $(id); if(el) el.value = s[k] ? s[k] : '';
    });
    fillPaint('bg'); fillPaint('bc');
    /* Content is keyed by primitive index in this build, so the admin's flat
       Title / Body fields are pointed at the first matching primitive. */
    const els = it.t === 'element' ? [it.id] : blockElements(instObj(it));
    const titleAt = els.findIndex(e => ['heading','subheading','cover'].includes(e));
    const bodyAt  = els.findIndex(e => ['paragraph','quote','callout'].includes(e));
    $('bi-content-lbl').style.display = (titleAt>=0 || bodyAt>=0) ? '' : 'none';
    let html = '';
    if(titleAt >= 0) html += `<div class="ds-fld"><label>Title</label>${rteHtml('ct-title', slot(it,titleAt).title||'', titleAt, 'title')}</div>`;
    if(bodyAt  >= 0) html += `<div class="ds-fld"><label>Body text</label>${rteHtml('ct-body', slot(it,bodyAt).body||'', bodyAt, 'body', true)}</div>`;
    if(titleAt < 0 && bodyAt < 0) html = `<div class="fhint" style="margin:2px 0 4px">No editable text in this block &mdash; style it below, then check Preview.</div>`;
    $('bi-content').innerHTML = html;
    dbWireRte(it);
  }
  function blockElements(b){
    const out = [];
    (P2DOC[b.p] || []).forEach(row => row.cols.forEach(col => col.forEach(p => out.push(p))));
    return out;
  }
  /* Rich-text editing for the inspector fields, kept from this prototype. */
  function slot(it, pi){ return (it.content[pi] = it.content[pi] || {}); }
  function dbWireRte(it){
    // rteHtml carries the primitive index in data-rte and the field in data-k;
    // the toolbar runs execCommand inline, so input covers typing and formatting.
    document.querySelectorAll('#bi-content .srte-ed').forEach(box => {
      const pi = +box.dataset.rte, field = box.dataset.k;
      const push = () => { slot(it, pi)[field] = box.innerHTML; markDirty(DB.doc); if(mode === 'preview') render(); };
      box.addEventListener('input', push);
      box.addEventListener('blur', push);
    });
  }
  const SIDES=['T','R','B','L'], AXES=['H','V'];
  const boxClamp = v => Math.max(0,Math.min(200,Math.round(+v||0)));
  const boxGet = (s,k) => s[k]!=null ? s[k] : (s[k.slice(0,3)]||0);
  function figScrub(el, get, set){
    el.addEventListener('pointerdown',e=>{ e.preventDefault(); const x0=e.clientX, v0=+get()||0; try{el.setPointerCapture(e.pointerId);}catch(_){}
      const mv=ev=>set(v0+Math.round((ev.clientX-x0)/2)); const up=()=>{ el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); };
      el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); });
  }
  function fillBox(it, prop){
    const s = it.style, ctl = document.querySelector(`#blockInspector .fig-box[data-box="${prop}"]`); if(!ctl) return;
    const sm = !!s[prop+'Sides'];
    ctl.querySelector('[data-toggle]').classList.toggle('on', sm);
    ctl.querySelector('.fig-hv').hidden = sm; ctl.querySelector('.fig-cross').hidden = !sm;
    AXES.forEach(a => { const el = $('bs-'+prop+a); if(el) el.value = boxGet(s,prop+a); });
    SIDES.forEach(x => { const el = $('bs-'+prop+x); if(el) el.value = s[prop+x]||0; });
  }
  function wireBox(prop){
    const ctl = document.querySelector(`#blockInspector .fig-box[data-box="${prop}"]`); if(!ctl) return;
    AXES.forEach(a => { const inp = $('bs-'+prop+a); if(!inp) return;
      inp.addEventListener('input', () => { if(!curItem) return; curItem.style[prop+a] = boxClamp(inp.value); markDirty(DB.doc); render(); });
      const ic = inp.parentElement.querySelector('.fig-ic'); if(ic) figScrub(ic, () => curItem?boxGet(curItem.style,prop+a):0, v => { if(!curItem) return; curItem.style[prop+a] = boxClamp(v); inp.value = curItem.style[prop+a]; render(); });
    });
    SIDES.forEach(x => { const inp = $('bs-'+prop+x); if(!inp) return;
      inp.addEventListener('input', () => { if(!curItem) return; curItem.style[prop+x] = boxClamp(inp.value); markDirty(DB.doc); render(); });
      const ic = inp.parentElement.querySelector('.fig-ic'); if(ic) figScrub(ic, () => curItem?(curItem.style[prop+x]||0):0, v => { if(!curItem) return; curItem.style[prop+x] = boxClamp(v); inp.value = curItem.style[prop+x]; render(); });
    });
    ctl.querySelector('[data-toggle]').addEventListener('click', () => {
      if(!curItem) return; const s = curItem.style, sm = !s[prop+'Sides']; s[prop+'Sides'] = sm;
      if(sm){ const h = boxGet(s,prop+'H'), v = boxGet(s,prop+'V'); if(!s[prop+'T'])s[prop+'T']=v; if(!s[prop+'B'])s[prop+'B']=v; if(!s[prop+'L'])s[prop+'L']=h; if(!s[prop+'R'])s[prop+'R']=h; }
      else { s[prop+'H']=s[prop+'L']||s[prop+'R']||0; s[prop+'V']=s[prop+'T']||s[prop+'B']||0; }
      fillBox(curItem,prop); render();
    });
  }
  const CORNERS=['TL','TR','BR','BL'];
  const radClamp = v => Math.max(0,Math.min(400,Math.round(+v||0)));
  function fillRad(it){
    const s = it.style, ctl = document.querySelector('#blockInspector .fig-box[data-box="rad"]'); if(!ctl) return;
    const sm = !!s.radSides;
    ctl.querySelector('[data-toggle]').classList.toggle('on', sm);
    ctl.querySelector('.fig-solo').hidden = sm; ctl.querySelector('.fig-corners').hidden = !sm;
    $('bs-rad').value = s.rad||0;
    CORNERS.forEach(c => { const el = $('bs-rad'+c); if(el) el.value = s['rad'+c]||0; });
  }
  function wireRad(){
    const ctl = document.querySelector('#blockInspector .fig-box[data-box="rad"]'); if(!ctl) return;
    const uni = $('bs-rad');
    uni.addEventListener('input', () => { if(!curItem) return; curItem.style.rad = radClamp(uni.value); markDirty(DB.doc); render(); });
    CORNERS.forEach(c => { const inp = $('bs-rad'+c); if(!inp) return; inp.addEventListener('input', () => { if(!curItem) return; curItem.style['rad'+c] = radClamp(inp.value); render(); }); });
    ctl.querySelector('[data-toggle]').addEventListener('click', () => {
      if(!curItem) return; const s = curItem.style, sm = !s.radSides; s.radSides = sm;
      if(sm) CORNERS.forEach(c => { if(!s['rad'+c]) s['rad'+c] = s.rad||0; });
      else s.rad = Math.max(s.radTL||0,s.radTR||0,s.radBR||0,s.radBL||0);
      fillRad(curItem); render();
    });
    const ic = ctl.querySelector('.fig-solo .fig-ic'); if(ic) figScrub(ic, () => curItem?curItem.style.rad||0:0, v => { if(!curItem) return; curItem.style.rad = radClamp(v); uni.value = curItem.style.rad; render(); });
  }
  wireBox('pad'); wireBox('mar'); wireRad();
  (function(){
    const M = $('bs-wmode'), V = $('bs-wpx');
    M.addEventListener('change', () => { if(!curItem) return; curItem.style.wMode = M.value; markDirty(DB.doc); render(); renderInspector(); });
    V.addEventListener('input', () => { if(!curItem) return;
      curItem.style.wPx = Math.max(0,Math.round(+V.value||0));
      if((curItem.style.wMode||'fill') !== 'fixed'){ curItem.style.wMode = 'fixed'; M.value = 'fixed'; }
      markDirty(DB.doc); render(); });
  })();
  (function(){
    const M = $('bs-hmode'), V = $('bs-hval');
    M.addEventListener('change', () => { if(!curItem) return; curItem.style.hMode = M.value; markDirty(DB.doc); render(); renderInspector(); });
    V.addEventListener('input', () => { if(!curItem) return;
      curItem.style.hVal = Math.max(0,Math.round(+V.value||0));
      const hm = curItem.style.hMode||'auto';
      if(hm !== 'fixed'){ curItem.style.hMode = 'fixed'; M.value = 'fixed'; }
      markDirty(DB.doc); render(); });
    [['bs-wmin','wMin'],['bs-wmax','wMax'],['bs-hmin','hMin'],['bs-hmax','hMax']].forEach(([id,k]) => {
      const el = $(id); if(!el) return;
      el.addEventListener('input', () => { if(!curItem) return; curItem.style[k] = Math.max(0,Math.round(+el.value||0)); markDirty(DB.doc); render(); });
    });
  })();
  const clampA = v => Math.max(0,Math.min(100,Math.round(+v||0)));
  function fillPaint(key){
    if(!curItem) return; const s = curItem.style;
    const sec = document.querySelector(`#blockInspector .fig-sec[data-paint="${key}"]`); if(!sec) return;
    const paint = $('bs-'+key+'Paint');
    $('bs-'+key).value = s[key]||'#000000';
    $('bs-'+key+'H').value = (s[key]||'').replace('#','').toUpperCase();
    $('bs-'+key+'A').value = (s[key+'A']!=null?s[key+'A']:100);
    const on = !!s[key+'On'], vis = s[key+'Vis'] !== false;
    paint.style.display = on ? '' : 'none';
    sec.querySelector('[data-add]').style.display = on ? 'none' : '';
    paint.classList.toggle('off', !vis);
    sec.querySelector('[data-eye] .ms').textContent = vis ? 'visibility' : 'visibility_off';
    if(key === 'bc'){ $('bs-bpos').value = s.bpos||'inside'; $('bs-bw').value = (s.bw!=null?s.bw:1); $('bs-strokeMeta').style.display = on ? '' : 'none'; }
  }
  function wirePaint(key){
    const sec = document.querySelector(`#blockInspector .fig-sec[data-paint="${key}"]`); if(!sec) return;
    const C = $('bs-'+key), H = $('bs-'+key+'H'), A = $('bs-'+key+'A');
    const ensureOn = () => { if(!curItem.style[key+'On']){ curItem.style[key+'On'] = true; curItem.style[key+'Vis'] = true; } };
    C.addEventListener('input', () => { if(!curItem) return; curItem.style[key] = C.value; ensureOn(); fillPaint(key); markDirty(DB.doc); render(); });
    H.addEventListener('input', () => { if(!curItem) return; const v = H.value.trim().replace(/^#/,''); if(/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)){ curItem.style[key] = '#'+v; ensureOn(); fillPaint(key); render(); } });
    A.addEventListener('input', () => { if(!curItem) return; curItem.style[key+'A'] = clampA(A.value); render(); });
    sec.querySelector('[data-eye]').addEventListener('click', () => { if(!curItem) return; curItem.style[key+'Vis'] = !(curItem.style[key+'Vis'] !== false); fillPaint(key); render(); });
    sec.querySelector('[data-rm]').addEventListener('click', () => { if(!curItem) return; curItem.style[key+'On'] = false; fillPaint(key); render(); });
    sec.querySelector('[data-add]').addEventListener('click', () => { if(!curItem) return; curItem.style[key+'On'] = true; curItem.style[key+'Vis'] = true; fillPaint(key); render(); });
    if(key === 'bc'){
      $('bs-bpos').addEventListener('change', e => { if(!curItem) return; curItem.style.bpos = e.target.value; render(); });
      $('bs-bw').addEventListener('input', e => { if(!curItem) return; curItem.style.bw = Math.max(0,Math.min(40,Math.round(+e.target.value||0))); render(); });
    }
  }
  wirePaint('bg'); wirePaint('bc');
  $('bi-close').addEventListener('click', () => { selK = null; renderInspector(); render(); });
  canvas.addEventListener('click', e => { if(!e.target.closest('.doc-blk') && !e.target.closest('.pv-blk[data-k]')){ selK = null; renderInspector(); render(); } });

  // ---- Responsive panels ----
  const ed3 = document.querySelector('#db .ed3');
  $('dStyleBtn').addEventListener('click', function(){ this.classList.toggle('on', ed3.classList.toggle('st-on')); });
  $('dElBtn').addEventListener('click', function(){ this.classList.toggle('on', ed3.classList.toggle('el-on')); });

  // ---- Open / save ----
  window.dbOpen = cfg => {
    DB = {doc: cfg.doc, backRoute: cfg.backRoute, title: cfg.title || cfg.doc.name, sub: cfg.sub || '',
          onSave: cfg.onSave, backLabel: cfg.backLabel || 'Cancel'};
    if(!DB.doc.bg) DB.doc.bg = newDocBg();
    if(!DB.doc.docStyle) DB.doc.docStyle = {bg:'#ffffff', pad:36, gap:12, rad:4};
    DB.doc.items.forEach(it => { if(!it.k) it.k = ++uid; });
    selK = null; curItem = null; mode = 'layout'; pq = '';
    document.getElementById('db').classList.add('open');
    dbHead(); renderPalette(); showLeftTab('blocks'); syncTopLayer(); syncBgPane(); syncDocStyleInputs();
    setMode('layout');
  };
  window.dbClose = () => { document.getElementById('db').classList.remove('open'); DB = null; };
  window.dbSave = () => {
    const d = DB.doc, cb = DB.onSave, back = DB.backRoute;
    if(!d.items.length){ showToast('Add at least one block'); return; }
    d.dirty = false;
    dbClose();
    if(cb) cb(d);
    if(back) go(back);
    showToast((d.isNew ? 'Created ' : 'Saved ') + (KIND_LABEL[d.kind]||'document') + ' - ' + d.name);
  };
  window.dbExit = () => exitEditor(DB.doc, DB.backRoute, () => dbClose(), window.dbSave);
  window.dbRender = () => render();
  /* Simple mode differs by document kind: resumes and case studies use the
     Simple editor, while cover pages and contents pages use the style dialog
     that live offers today. Hand over to whichever fits. */
  window.dbToSimpleMode = () => {
    const d = DB.doc, cb = DB.onSave, back = DB.backRoute, kind = d.kind;
    if(kind === 'cover' || kind === 'toc'){
      dbClose(); psOpen(kind, d.srcId);
      return;
    }
    dbClose();
    smOpen({doc:d, backRoute:back, onSave:cb});
  };
  function dbHead(){
    document.getElementById('dbHead').innerHTML = edHeadHtml({
      doc: DB.doc, mode:'advanced', sub: DB.sub,
      exit:'dbExit()', save:'dbSave()',
      rename:"DB.doc.name=this.value;markDirty(DB.doc);var b=document.getElementById('doc-bar');if(b)b.textContent=this.value",
    });
    const b = document.getElementById('doc-bar'); if(b) b.textContent = DB.doc.name;
  }
})();
