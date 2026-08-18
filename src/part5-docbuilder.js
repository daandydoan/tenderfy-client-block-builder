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
  wMode:'fill', wPx:480, hMode:'auto', hVal:120,
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
  if(m === 'hug')   return 'height:fit-content;';
  if(m === 'fixed') return `height:${v}px;overflow:hidden;`;
  if(m === 'min')   return `min-height:${v}px;`;
  if(m === 'max')   return `max-height:${v}px;overflow:auto;`;
  return '';
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

/* ── Background layer ──────────────────────────────────────────────────────
   Ported from tenderfy-admin/document-edit.html. Fill regions sit behind the
   content on every page; "first page only" regions render on page 0 alone.
   Custom CSS is an escape hatch for a gradient or an SVG data URI.           */
const BG_SHAPES = [['full','Full page'],['band-top','Top band'],['band-bottom','Bottom band'],
  ['half-top','Top half'],['half-bottom','Bottom half'],['half-left','Left half'],['half-right','Right half'],
  ['col-left','Left column'],['col-right','Right column'],['region','Custom region']];
let bgUid = 0;
function newDocBg(){ return {mode:'regions', regions:[], css:''}; }
function mkRegion(brand){
  return {id:++bgUid, shape:'band-top', h:120, w:200, x:40, y:40,
    color:(brand?brand.primary:'#27535C'), gradOn:false, color2:(brand?brand.secondary:'#38988A'),
    op:1, firstOnly:false};
}
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
function bgFill(r){ return r.gradOn ? `linear-gradient(135deg, ${r.color}, ${r.color2})` : r.color; }
function renderDocBg(bg, pi){
  if(!bg) return '';
  if(bg.mode === 'code'){
    const css = (bg.css||'').replace(/[<>]/g,'').replace(/"/g,"'");
    return css ? `<div style="position:absolute;inset:0;z-index:0;${css}"></div>` : '';
  }
  return (bg.regions||[]).filter(r => !r.firstOnly || pi === 0).map(r =>
    `<div style="position:absolute;z-index:0;${bgGeom(r)};background:${bgFill(r)};opacity:${r.op}"></div>`).join('');
}
const KIND_LABEL = {page:'Page', section:'Section', resume:'Resume', 'case-study':'Case Study', block:'Block'};
function newDoc(kind, name){
  return {name: name || 'Untitled Document', kind: kind || 'page', status:'draft',
    header:null, footer:null, items:[], bg:newDocBg(),
    brand:{primary:'#27535C', secondary:'#38988A', background:'#F7F9F8', font:'Outfit', bodyFont:'Outfit', company:'Tenderfy Civil'}};
}
const docItem = (t, id, content, style) => ({t, id, content: content||{}, style: Object.assign({}, DOC_ITEM_STYLE_DEFAULT, style||{})});

/* ═══ The Document Builder ═════════════════════════════════════════════════
   The same three-pane editor the admin prototype uses for Documents and Tender
   Documents: Blocks/Layers on the left, canvas in the middle (Layout | Preview,
   selection persists across both), Figma-style inspector on the right ordered
   Layout -> Dimension -> Fill -> Appearance -> Stroke.                        */

let DB = null;

function dbOpen(cfg){
  DB = {
    doc: cfg.doc, backRoute: cfg.backRoute, title: cfg.title || cfg.doc.name, sub: cfg.sub || '',
    onSave: cfg.onSave, backLabel: cfg.backLabel || 'Cancel',
    sel: null, mode: 'layout', tab: 'blocks', q: '', showLeft: true, showRight: true,
    accClosed: {},                       // Layers accordions, kept across re-renders
  };
  if(!DB.doc.bg) DB.doc.bg = newDocBg();
  document.getElementById('db').classList.add('open');
  dbRenderAll();
}
function dbClose(){ document.getElementById('db').classList.remove('open'); DB = null; }
window.dbClose = dbClose;
window.dbSave = () => {
  const d = DB.doc, cb = DB.onSave, back = DB.backRoute;
  d.dirty = false; dbClose();
  if(cb) cb(d); else if(back) go(back);
  showToast('Saved - ' + d.name);
};
// Leaving the builder: back to the list, guarded if the document was touched.
window.dbExit = () => exitEditor(DB.doc, DB.backRoute, () => dbClose(), window.dbSave);
// Back to Simple. A cover page's Simple mode is the style dialog; a resume or
// case study gets the live form / block canvas. The document is handed over
// intact either way.
window.dbToSimple = () => { const d = DB.doc, cb = DB.onSave; dbClose(); if(cb) cb(d); csOpen(); };
window.dbToSimpleMode = () => {
  const d = DB.doc, cb = DB.onSave, back = DB.backRoute;
  if(d.coverId){ dbClose(); if(cb) cb(d); csOpen(); return; }
  d.customised = true;                 // block edits exist; Simple will say so
  dbClose();
  smOpen({doc:d, backRoute: back || '/tenders', onSave: cb});
};


/* ── Shared editor header ────────────────────────────────────────────────────
   Simple, Advanced and the Block Builder all render the SAME header shape and
   height, so toggling modes never moves anything. Only the mode pill's active
   side and the right-hand extras change.                                      */
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
      <button class="lbtn icon-sm" data-toast="Duplicated as a new ${esc((KIND_LABEL[d.kind]||'document').toLowerCase())}" title="Duplicate"><span class="ms">content_copy</span></button>
      ${smToggle(cfg.mode)}
      <button class="lbtn" onclick="${cfg.exit}">Cancel</button>
      <button class="lbtn pri" onclick="${cfg.save}"><span class="ms">save</span> ${esc(cfg.saveLabel || label)}</button>
    </div>`;
}

function dbRenderAll(){ dbHead(); dbLeft(); dbCanvas(); dbInspector(); }

function dbHead(){
  document.getElementById('dbHead').innerHTML = edHeadHtml({
    doc: DB.doc, mode:'advanced', sub: DB.sub,
    exit:'dbExit()', save:'dbSave()',
    rename:"DB.doc.name=this.value;markDirty(DB.doc);var b=document.getElementById('dbBarName');if(b)b.textContent=this.value",
  });
}

/* ── Left column: Blocks | Layers ────────────────────────────────────────── */
function dbLeft(){
  const d = DB.doc;
  const blocksPane = () => {
    const q = DB.q.toLowerCase();
    const pool = BLOCKS.filter(b => !b.slot && (!q || (b.name+' '+b.label).toLowerCase().includes(q)));
    const cats = BLOCK_CATS.filter(c => pool.some(b => b.cat === c));
    return `<div class="card">
      <h3 class="ed-h">Blocks <span class="muted" style="font-weight:400;font-size:12px">${pool.length}</span>
        <a onclick="dbClose();go('/file-manager/block-library')" title="Open the Block Library" style="margin-left:auto;font-size:12px;color:var(--live-cta);cursor:pointer;font-weight:600"><span class="ms" style="font-size:14px;vertical-align:-2px">add</span> New block</a></h3>
      <div class="d-search"><span class="ms">search</span><input id="dbQ" placeholder="Search blocks..." value="${esc(DB.q)}" oninput="DB.q=this.value;dbLeft()"></div>
      ${cats.map(c => `<div class="pal-cat">${esc(c)}</div>
        <div class="vb-pal">${pool.filter(b=>b.cat===c).map(b => `
          <div class="vb-widget" draggable="true" data-add="${b.id}" title="${esc(b.label)}">
            <div class="pal-prev">${blockSchematic(b)}</div>
            <span class="vb-el"><span class="el-ic ms">${b.kind==='element'?(PRIM_ICON[b.p]||'article'):'dashboard_customize'}</span>${esc(b.label)}</span>
          </div>`).join('')}</div>`).join('') || '<div class="fhint">No blocks match that search.</div>'}
    </div>`;
  };
  /* Layers, lifted from tenderfy-admin/document-edit.html #paneLayers:
     Background (fills behind content) / Main (the document body) / Top
     (letterhead + footer). Accordion state survives a re-render.             */
  const acc = (key, icon, title, bodyHtml) => `
    <div class="acc ${DB.accClosed[key]?'closed':''}" data-acc data-acck="${key}">
      <button class="acc-h"><span class="acc-title"><span class="lyr-ic"><span class="ms">${icon}</span></span> ${title}</span><span class="ms acc-caret">expand_more</span></button>
      <div class="acc-body">${bodyHtml}</div>
    </div>`;
  const slotFld = (which, label, none) => `
    <div class="lyr-fld"${which==='footer'?' style="margin-bottom:2px"':''}><label>${label}</label>
      <select class="lyr-sel" onchange="DB.doc.${which}=this.value||null;markDirty(DB.doc);dbCanvas();dbLeft()">
        <option value="">${none}</option>
        ${BLOCKS.filter(b=>b.slot===which).map(b=>`<option value="${b.id}"${d[which]===b.id?' selected':''}>${esc(b.label)}</option>`).join('')}
      </select>
      <div class="lyr-mini">${d[which] ? renderStationery(BLOCK_BY_ID[d[which]].p, d.brand) : '<span class="empty">None</span>'}</div>
    </div>`;
  const layersPane = () => `
    <div class="side-title">Layers</div>
    ${acc('bg','wallpaper','Background', `
      <div class="lyr-s" style="margin:-2px 0 10px">Fills behind content, per page</div>
      <div class="bg-modeseg" id="bgModeSeg">
        <button data-bgm="regions" class="${d.bg.mode==='regions'?'on':''}">Regions</button>
        <button data-bgm="code" class="${d.bg.mode==='code'?'on':''}">Custom CSS</button>
      </div>
      <div id="bgRegionsPane"${d.bg.mode==='regions'?'':' style="display:none"'}>
        <div id="bgRegions"></div>
        <button class="bg-add" id="bgAdd"><span class="ms">add</span> Add fill region</button>
      </div>
      <div id="bgCodePane"${d.bg.mode==='code'?'':' style="display:none"'}>
        <textarea id="bgCss" class="bg-css" spellcheck="false" placeholder="/* Drawn behind content */&#10;background: linear-gradient(135deg,#123B66,#38988A);">${esc(d.bg.css||'')}</textarea>
        <div class="fhint" style="margin-top:6px">CSS / SVG only, no scripts. Applied behind content on every page.</div>
      </div>
      <div class="fhint" style="margin-top:8px">Overlays the base page fill (Properties &#9654; Style).</div>`)}
    ${acc('main','layers','Main', `
      <div class="hstack" style="gap:10px;align-items:baseline"><span class="lyr-count-big">${d.items.length}</span><span class="muted">block${d.items.length===1?'':'s'} on the page</span></div>
      <div class="fhint" style="margin-top:9px">Add, reorder and style these on the canvas. Select any block to edit its content and style.</div>`)}
    ${acc('top','flip_to_front','Top', `
      <div class="lyr-s" style="margin:-2px 0 10px">Letterhead &amp; footer &mdash; repeats on every page</div>
      ${slotFld('header','Letterhead','No letterhead')}
      ${slotFld('footer','Footer','No footer')}
      <div class="fhint" style="margin-top:9px">Chosen from the <strong>Headers &amp; Footers</strong> blocks. Shown as fixed slots on the page.</div>`)}`;

  document.getElementById('dbLeft').innerHTML = `
    <div class="lt-tabs">
      <button class="lt-tab ${DB.tab==='blocks'?'on':''}" onclick="DB.tab='blocks';dbLeft()">Blocks</button>
      <button class="lt-tab ${DB.tab==='layers'?'on':''}" onclick="DB.tab='layers';dbLeft()">Layers</button>
    </div>
    ${DB.tab === 'blocks' ? blocksPane() : layersPane()}`;

  document.querySelectorAll('#dbLeft .vb-widget').forEach(el => {
    el.addEventListener('click', () => dbAdd(el.dataset.add));
    el.addEventListener('dragstart', e => e.dataTransfer.setData('text','add:'+el.dataset.add));
  });
  // Accordions collapse the same way as the admin sidebar.
  document.querySelectorAll('#dbLeft .acc-h').forEach(h => h.addEventListener('click', () => {
    const a = h.parentElement; a.classList.toggle('closed');
    DB.accClosed[a.dataset.acck] = a.classList.contains('closed');
  }));
  if(DB.tab === 'layers') dbWireBg();
}

/* Background-layer editor, ported from tenderfy-admin/document-edit.html. */
function bgGeoFields(r){
  const num = (k,l) => `<div class="g"><label>${l}</label><input type="number" data-geo="${k}" value="${r[k]}"></div>`;
  if(r.shape==='band-top'||r.shape==='band-bottom') return num('h','Height');
  if(r.shape==='col-left'||r.shape==='col-right') return num('w','Width');
  if(r.shape==='region') return num('x','X')+num('y','Y')+num('w','W')+num('h','H');
  return '';
}
function bgRegionRow(r){
  const colorInput = (f,v) => `<div class="samp-row" style="margin-bottom:8px"><input type="color" data-f="${f}" value="${v}" style="width:30px;height:28px;border:1px solid var(--border);border-radius:6px;padding:2px;flex:none"><input class="ds-hex" data-f="${f}H" value="${v.toUpperCase()}" style="flex:1"></div>`;
  const geo = bgGeoFields(r);
  return `<div class="bg-reg" data-id="${r.id}">
    <div class="bg-reg-h"><select class="ds-sel" data-f="shape">${BG_SHAPES.map(x=>`<option value="${x[0]}"${x[0]===r.shape?' selected':''}>${x[1]}</option>`).join('')}</select><button class="bg-del" title="Remove"><span class="ms">delete</span></button></div>
    ${geo?`<div class="bg-geo">${geo}</div>`:''}
    ${colorInput('color', r.color)}
    <label class="bi-tog" style="margin-bottom:8px"><input type="checkbox" data-f="gradOn"${r.gradOn?' checked':''}>Gradient</label>
    ${r.gradOn?colorInput('color2', r.color2):''}
    <div class="ds-row" style="margin-bottom:8px"><label>Opacity</label><div class="ds-ctl"><input type="range" data-f="op" min="0" max="100" value="${Math.round(r.op*100)}"><span class="ds-u">${Math.round(r.op*100)}%</span></div></div>
    <label class="bi-tog"><input type="checkbox" data-f="firstOnly"${r.firstOnly?' checked':''}>First page only</label>
  </div>`;
}
function dbWireBg(){
  const bg = DB.doc.bg, paint = () => { markDirty(DB.doc); dbCanvas(); };
  const wrap = document.getElementById('bgRegions');
  if(!wrap) return;
  wrap.innerHTML = bg.regions.length ? bg.regions.map(bgRegionRow).join('')
    : `<div class="fhint" style="margin:2px 0 10px">No fill regions yet &mdash; add one, or switch to Custom CSS.</div>`;
  wrap.querySelectorAll('.bg-reg').forEach(el => {
    const r = bg.regions.find(x => x.id == el.dataset.id);
    el.querySelector('.bg-del').addEventListener('click', () => {
      bg.regions = bg.regions.filter(x => x !== r); dbWireBg(); paint();
    });
    el.querySelectorAll('[data-f]').forEach(inp => {
      const f = inp.dataset.f, ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, () => {
        if(f==='shape'){ r.shape=inp.value; dbWireBg(); }
        else if(f==='gradOn'){ r.gradOn=inp.checked; dbWireBg(); }
        else if(f==='firstOnly'){ r.firstOnly=inp.checked; }
        else if(f==='color'||f==='color2'){ r[f]=inp.value; const h=el.querySelector(`[data-f=${f}H]`); if(h)h.value=inp.value.toUpperCase(); }
        else if(f==='colorH'||f==='color2H'){ const v=inp.value.trim(); if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return;
          r[f.slice(0,-1)]=v; const c=el.querySelector(`[data-f=${f.slice(0,-1)}]`); if(c)c.value=v; }
        else if(f==='op'){ r.op=(+inp.value)/100; inp.nextElementSibling.textContent=inp.value+'%'; }
        paint();
      });
    });
    el.querySelectorAll('[data-geo]').forEach(inp => inp.addEventListener('input', () => {
      r[inp.dataset.geo] = Math.max(0, Math.round(+inp.value||0)); paint();
    }));
  });
  document.getElementById('bgAdd').addEventListener('click', () => {
    bg.regions.push(mkRegion(DB.doc.brand)); dbWireBg(); paint();
  });
  document.querySelectorAll('#bgModeSeg button').forEach(b => b.addEventListener('click', () => {
    bg.mode = b.dataset.bgm;
    document.querySelectorAll('#bgModeSeg button').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('bgRegionsPane').style.display = bg.mode === 'regions' ? '' : 'none';
    document.getElementById('bgCodePane').style.display = bg.mode === 'code' ? '' : 'none';
    paint();
  }));
  document.getElementById('bgCss').addEventListener('input', e => { bg.css = e.target.value; paint(); });
}

/* ── Middle: canvas, Layout | Preview ────────────────────────────────────── */
function dbAdd(id, at){
  const b = BLOCK_BY_ID[id]; markDirty(DB.doc);
  if(b.slot){ DB.doc[b.slot] = id; dbCanvas(); dbLeft(); showToast('Top layer: ' + b.label); return; }
  const it = docItem(b.kind === 'element' ? 'element' : 'block', id);
  if(typeof at === 'number') DB.doc.items.splice(at, 0, it); else DB.doc.items.push(it);
  DB.sel = typeof at === 'number' ? at : DB.doc.items.length - 1;
  dbRenderAll(); showToast('Added: ' + b.label);
}
window.dbSel = (i, keepCaret) => {
  if(DB.sel === i && keepCaret) return;    // already selected; don't re-render mid-edit
  DB.sel = i;
  if(keepCaret){ document.querySelectorAll('#dbCanvas .db-item, #dbCanvas .db-pv')
      .forEach(el => el.classList.toggle('sel', +el.dataset.i === i)); }
  else dbCanvas();
  dbInspector(); if(DB.tab==='layers') dbLeft();
};
window.dbDel = i => { markDirty(DB.doc); DB.doc.items.splice(i,1); if(DB.sel===i) DB.sel=null; else if(DB.sel>i) DB.sel--; dbRenderAll(); };
window.dbDup = i => { markDirty(DB.doc); const c = JSON.parse(JSON.stringify(DB.doc.items[i])); DB.doc.items.splice(i+1,0,c); DB.sel=i+1; dbRenderAll(); };
window.dbMove = (i,dir) => { markDirty(DB.doc); const j=i+dir; if(j<0||j>=DB.doc.items.length) return; const [x]=DB.doc.items.splice(i,1); DB.doc.items.splice(j,0,x); DB.sel=j; dbRenderAll(); };
function dbDrop(tok, at){
  if(!tok) return;
  if(tok.startsWith('add:')) dbAdd(tok.slice(4), at);
  else if(tok.startsWith('move:')){
    const from = +tok.slice(5);
    if(from === at) return;
    const [x] = DB.doc.items.splice(from,1);
    DB.doc.items.splice(from < at ? at-1 : at, 0, x);
    DB.sel = from < at ? at-1 : at;
    dbRenderAll();
  }
}
function dbCanvas(){
  const d = DB.doc;
  const bar = `<div class="vb-bar"><span class="ms" style="font-size:16px;color:var(--live-cta)">description</span>
      <span id="dbBarName">${esc(d.name)}</span>
      <span class="muted" style="font-weight:400">${d.items.length} item${d.items.length===1?'':'s'}</span>
      <div class="mode-seg">
        <button class="${DB.mode==='layout'?'on':''}" onclick="DB.mode='layout';dbCanvas()"><span class="ms">dashboard</span> Layout</button>
        <button class="${DB.mode==='preview'?'on':''}" onclick="DB.mode='preview';dbCanvas()"><span class="ms">visibility</span> Preview</button>
      </div></div>`;

  let page;
  if(DB.mode === 'preview'){
    // Blocks stay clickable in Preview and the selection survives both ways.
    const body = d.items.map((it,i) =>
      docItemHtml(it, d.brand, 'doc-blk-r db-pv' + (DB.sel===i?' sel':''), `data-i="${i}" onclick="dbSel(${i})"`)).join('');
    const band = id => id ? `<div class="db-slot">${renderStationery(BLOCK_BY_ID[id].p, d.brand)}</div>` : '';
    page = `<div class="vb-page">${renderDocBg(d.bg,0)}<div class="db-layer">${band(d.header)}<div class="db-body">${body}</div>${band(d.footer)}</div></div>`;
  } else {
    const slot = (which,label) => d[which]
      ? `<div class="db-slot" title="${label}">${renderStationery(BLOCK_BY_ID[d[which]].p, d.brand)}
           <span class="db-slot-x ms" onclick="DB.doc.${which}=null;dbCanvas();dbLeft()">close</span></div>`
      : `<div class="db-slot empty" onclick="DB.tab='layers';dbLeft()">${label} &mdash; choose in Layers</div>`;
    const rows = d.items.length ? d.items.map((it,i) => {
      const def = BLOCK_BY_ID[it.id] || {label:it.id};
      return `<div class="db-line" data-at="${i}"></div>
        <div class="db-item ${DB.sel===i?'sel':''}" data-i="${i}" draggable="true" onclick="dbSel(${i})">
          <span class="db-tag">${esc(def.label)}</span>
          <span class="db-bar">
            <span class="ms" onclick="event.stopPropagation();dbMove(${i},-1)" title="Move up">expand_less</span>
            <span class="ms" onclick="event.stopPropagation();dbMove(${i},1)" title="Move down">expand_more</span>
            <span class="ms" onclick="event.stopPropagation();dbDup(${i})" title="Duplicate">content_copy</span>
            <span class="ms" onclick="event.stopPropagation();dbDel(${i})" title="Remove">close</span></span>
          ${docItemHtml(it, d.brand, 'db-inner')}</div>`;
    }).join('') + `<div class="db-line" data-at="${d.items.length}"></div>`
      : `<div class="vb-tail"><span class="ms">dashboard_customize</span>Drag a block here, or click one in the palette.</div>`;
    page = `<div class="vb-page">${renderDocBg(d.bg,0)}<div class="db-layer">${slot('header','Letterhead')}<div class="db-body" id="dbBody">${rows}</div>${slot('footer','Footer')}</div></div>`;
  }

  document.getElementById('dbCanvas').innerHTML = bar + `<div class="vb-stage">${page}</div>`;
  dbWireCanvas();
}
/* Content is editable straight on the page, in Layout and Preview alike. Each
   rendered field carries data-f (and the primitive index via .dp[data-pi]), so
   a keystroke writes back to exactly the right slot. */
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
function dbWireCanvas(){
  dbWireInline(document.getElementById('dbCanvas'));
  const body = document.getElementById('dbBody');
  if(!body) return;
  const lines = [...body.querySelectorAll('.db-line')];
  const clear = () => lines.forEach(l => l.classList.remove('on'));
  body.querySelectorAll('.db-item').forEach(el =>
    el.addEventListener('dragstart', e => e.dataTransfer.setData('text','move:'+el.dataset.i)));
  const nearest = y => lines.reduce((best,l) => {
    const r = l.getBoundingClientRect(), d = Math.abs((r.top+r.bottom)/2 - y);
    return (!best || d < best.d) ? {l,d} : best;
  }, null);
  body.addEventListener('dragover', e => { e.preventDefault(); clear(); const n = nearest(e.clientY); if(n) n.l.classList.add('on'); });
  body.addEventListener('dragleave', e => { if(!body.contains(e.relatedTarget)) clear(); });
  body.addEventListener('drop', e => {
    e.preventDefault(); const n = nearest(e.clientY); clear();
    if(n) dbDrop(e.dataTransfer.getData('text'), +n.l.dataset.at);
  });
}

/* ── Right: Figma inspector (Layout, Dimension, Fill, Appearance, Stroke) ── */
function dbInspector(){
  const el = document.getElementById('dbRight');
  if(DB.sel == null || !DB.doc.items[DB.sel]){
    // Properties, with the brand Style block the Layers panel points at.
    const d = DB.doc;
    el.innerHTML = `<div class="card"><h3 class="ed-h">Properties</h3>
      <div class="fhint">Select a block on the page to style it. Blocks are clickable in Layout and Preview, and the selection carries across both.</div>
      <div class="insp-sec"><div class="insp-h">Composition</div>
        <div class="fhint">${d.items.length} item${d.items.length===1?'':'s'} &middot; letterhead ${d.header?'set':'none'} &middot; footer ${d.footer?'set':'none'}</div></div>
      <div class="insp-sec"><div class="insp-h">Style</div>
        <div class="ds-lbl" style="margin-top:0">Company name</div><input class="fin" value="${esc(d.brand.company)}" oninput="DB.doc.brand.company=this.value;markDirty(DB.doc);dbCanvas()">
        <div class="ds-lbl">Primary</div><div class="swatches">${ACCENTS.concat(['#27535C','#172E39']).map(c=>`<span class="sw ${c.toLowerCase()===d.brand.primary.toLowerCase()?'on':''}" style="background:${c}" onclick="DB.doc.brand.primary='${c}';markDirty(DB.doc);dbCanvas();dbInspector()"></span>`).join('')}</div>
        <div class="ds-lbl">Accent</div><div class="swatches">${ACCENTS.map(c=>`<span class="sw ${c.toLowerCase()===d.brand.secondary.toLowerCase()?'on':''}" style="background:${c}" onclick="DB.doc.brand.secondary='${c}';markDirty(DB.doc);dbCanvas();dbInspector()"></span>`).join('')}</div>
        <div class="ds-lbl">Heading font</div><select class="fin" onchange="DB.doc.brand.font=this.value;markDirty(DB.doc);dbCanvas()">${FONTS.map(f=>`<option${f===d.brand.font?' selected':''}>${f}</option>`).join('')}</select>
        <div class="ds-lbl">Body font</div><select class="fin" onchange="DB.doc.brand.bodyFont=this.value;markDirty(DB.doc);dbCanvas()">${FONTS.map(f=>`<option${f===d.brand.bodyFont?' selected':''}>${f}</option>`).join('')}</select>
      </div></div>`;
    return;
  }
  const i = DB.sel, it = DB.doc.items[i], def = BLOCK_BY_ID[it.id] || {name:it.id, label:it.id};
  const s = it.style = Object.assign({}, DOC_ITEM_STYLE_DEFAULT, it.style || {});
  const num = (id, val, min, max) => `<input type="number" data-s="${id}" value="${val==null?'':val}" min="${min==null?0:min}"${max!=null?` max="${max}"`:''}>`;
  const boxSec = (key, label) => `
    <div class="fig-box">
      <div class="fig-box-head"><span class="fig-label">${label}</span>
        <button type="button" class="fig-toggle ${s[key+'Sides']?'on':''}" data-sides="${key}" title="Edit sides individually"><span class="ms">border_outer</span></button></div>
      <div class="fig-hv" ${s[key+'Sides']?'hidden':''}>
        <span class="fig-field"><span class="ms fig-ic" title="Horizontal">width</span>${num(key+'H', s[key+'H'], 0, 200)}</span>
        <span class="fig-field"><span class="ms fig-ic" title="Vertical">height</span>${num(key+'V', s[key+'V'], 0, 200)}</span></div>
      <div class="fig-cross" ${s[key+'Sides']?'':'hidden'}>
        ${[['T','border_top'],['R','border_right'],['B','border_bottom'],['L','border_left']]
          .map(([k,ic])=>`<span class="fig-field"><span class="ms fig-ic">${ic}</span>${num(key+k, s[key+k])}</span>`).join('')}</div>
    </div>`;
  const paintSec = (on, kind, hex, alpha, vis, label) => `
    <div class="fig-sec">
      <div class="fig-sec-h"><span class="fig-sec-t">${label}</span>
        <span class="fig-acts"><button type="button" class="fig-a" data-paint="${kind}" title="${on?'Remove':'Add'} ${label.toLowerCase()}"><span class="ms">${on?'remove':'add'}</span></button></span></div>
      ${on ? `<div class="fig-paint">
        <input type="color" class="fig-sw" data-s="${kind==='fill'?'bg':'bc'}" value="${hex}">
        <input class="fig-hexin" data-s="${kind==='fill'?'bg':'bc'}" value="${hex}">
        <span class="fig-op"><input type="number" data-s="${kind==='fill'?'bgA':'bcA'}" value="${alpha}" min="0" max="100"><span class="fig-op-u">%</span></span>
        <button type="button" class="fig-a" data-vis="${kind==='fill'?'bgVis':'bcVis'}" title="${vis?'Hide':'Show'}"><span class="ms">${vis?'visibility':'visibility_off'}</span></button>
      </div>` : ''}
    </div>`;

  el.innerHTML = `<div class="card">
    <div class="bi-head"><h3 class="ed-h" style="margin:0">Block</h3>
      <button class="bi-x" onclick="dbSel(null)" title="Deselect"><span class="ms">close</span></button></div>
    <strong style="font-size:13.5px">${esc(def.name)}</strong>
    <div class="fhint" style="margin-top:3px">${it.t === 'element' ? 'A single element.' : 'A composed block.'}
      Made of ${blockElements(def).join(', ') || def.p}.</div>

    <div class="ds-lbl">Example content</div>
    <div id="dbContent">${dbContentFields(it, def)}</div>

    <div class="ds-lbl">Layout</div>
    <div class="fig-resize">
      <span class="fig-wt" title="Width"><span class="ms">swap_horiz</span>${num('wPx', s.wPx)}</span>
      <select class="fig-strokesel" data-s="wMode">${[['fill','Fill container'],['fixed','Fixed width']].map(([v,t])=>`<option value="${v}"${s.wMode===v?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="fig-resize" style="margin-top:6px">
      <span class="fig-wt" title="Height"><span class="ms">swap_vert</span>${num('hVal', s.hVal)}</span>
      <select class="fig-strokesel" data-s="hMode">${[['auto','Auto'],['hug','Hug'],['fixed','Fixed'],['min','Min'],['max','Max']].map(([v,t])=>`<option value="${v}"${s.hMode===v?' selected':''}>${t}</option>`).join('')}</select>
    </div>

    <div class="ds-lbl">Dimension</div>
    ${boxSec('pad','Padding')}
    ${boxSec('mar','Margin')}

    ${paintSec(s.bgOn,'fill', s.bg, s.bgA, s.bgVis, 'Fill')}

    <div class="ds-lbl">Appearance</div>
    <div class="fig-box">
      <div class="fig-box-head"><span class="fig-label">Corner radius</span>
        <button type="button" class="fig-toggle ${s.radSides?'on':''}" data-sides="rad" title="Edit corners individually"><span class="ms">border_outer</span></button></div>
      <div class="fig-hv" ${s.radSides?'hidden':''}>
        <span class="fig-field"><span class="ms fig-ic">rounded_corner</span>${num('rad', s.rad, 0, 400)}</span></div>
      <div class="fig-corners" ${s.radSides?'':'hidden'}>
        ${[['radTL',''],['radTR','cn-tr'],['radBR','cn-br'],['radBL','cn-bl']]
          .map(([k,cn])=>`<span class="fig-field"><span class="ms fig-ic ${cn}">rounded_corner</span>${num(k, s[k], 0, 400)}</span>`).join('')}</div>
    </div>

    ${paintSec(s.bcOn,'stroke', s.bc, s.bcA, s.bcVis, 'Stroke')}
    ${s.bcOn ? `<div class="fig-resize" style="margin-top:6px">
      <span class="fig-wt" title="Weight"><span class="ms">line_weight</span>${num('bw', s.bw, 0, 40)}</span>
      <select class="fig-strokesel" data-s="bpos">${[['inside','Inside'],['center','Center'],['outside','Outside']].map(([v,t])=>`<option value="${v}"${s.bpos===v?' selected':''}>${t}</option>`).join('')}</select>
    </div>` : ''}

    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="lbtn sm" style="flex:1" onclick="dbDup(${i})"><span class="ms">content_copy</span> Duplicate</button>
      <button class="lbtn sm" style="flex:1" onclick="dbDel(${i})"><span class="ms">close</span> Remove</button>
    </div>
  </div>`;
  dbWireInspector();
}
function dbContentFields(it, def){
  const prims = [];
  (P2DOC[def.p] || [{cols:[[def.p]]}]).forEach(r => r.cols.forEach(c => c.forEach(p => prims.push(p))));
  return prims.map((p,n) => {
    const c = (it.content[n] = it.content[n] || {});
    // Rich text where the field is prose; plain textareas where it's structure.
    const rte = (label,k,v,tall) => `<div class="ds-lbl" style="margin-top:8px">${label}</div>
      ${rteHtml(`c${n}-${k}`, v, n, k, tall)}`;
    const ta = (label,k,v,rows) => `<div class="ds-lbl" style="margin-top:8px">${label}</div>
      <textarea class="fin" rows="${rows||3}" data-c="${n}" data-k="${k}">${esc(v==null?'':v)}</textarea>`;
    let body;
    switch(p){
      case 'heading': case 'subheading': body = rte('Text','title',c.title); break;
      case 'paragraph': body = rte('Body','body',c.body,1); break;
      case 'quote': body = rte('Quote','body',c.body,1); break;
      case 'list': body = ta('Items (one per line)','items',(c.items||[]).join('\n'),3); break;
      case 'callout': body = rte('Label','label',c.label) + rte('Body','body',c.body,1); break;
      case 'stat': body = rte('Value','value',c.value) + rte('Label','label',c.label); break;
      case 'button': body = rte('Label','label',c.label); break;
      case 'field': body = ta('Merge field','field',c.field,1); break;
      case 'signature': body = rte('Name','name',c.name) + rte('Role','role',c.role) + rte('Date','date',c.date); break;
      case 'cover': body = rte('Kicker','kicker',c.kicker) + rte('Title','title',c.title) + rte('Meta','meta',c.meta); break;
      case 'table': body = ta('Headers (comma separated)','headers',(c.headers||[]).join(', '),1)
        + ta('Rows (one per line)','rows',(c.rows||[]).map(r=>r.join(', ')).join('\n'),3); break;
      case 'keyvalue': body = ta('Pairs ("label | value" per line)','pairs',(c.pairs||[]).map(r=>r.join(' | ')).join('\n'),4); break;
      case 'toc': body = ta('Entries ("title | page" per line)','rows',(c.rows||[]).map(r=>r.join(' | ')).join('\n'),4); break;
      case 'image': body = `<div class="cf-drop" data-toast="Upload an image" style="margin-top:8px"><span class="ms">photo_camera</span>Upload image</div>`; break;
      default: return '';
    }
    return `<div class="dbc-grp"><span class="dbc-h"><span class="ms">${PRIM_ICON[p]||'article'}</span>${p}</span>${body}</div>`;
  }).join('') || '<div class="fhint">No editable content.</div>';
}

/* A small rich-text field for the inspector — the same formatting the canvas
   accepts, so the two stay interchangeable. */
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

function dbWireInspector(){
  const root = document.getElementById('dbRight');
  const it = DB.doc.items[DB.sel];
  if(!it) return;
  root.querySelectorAll('[data-s]').forEach(el => {
    const k = el.dataset.s;
    const ev = el.type === 'color' || el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      markDirty(DB.doc);
      it.style[k] = el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
      dbCanvas();
      if(el.classList.contains('fig-sw') || el.classList.contains('fig-hexin') || el.tagName === 'SELECT') dbInspector();
    });
  });
  root.querySelectorAll('[data-sides]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.sides;
    it.style[k+'Sides'] = !it.style[k+'Sides'];
    dbInspector(); dbCanvas();
  }));
  root.querySelectorAll('[data-paint]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.paint === 'fill' ? 'bgOn' : 'bcOn';
    it.style[k] = !it.style[k];
    dbInspector(); dbCanvas();
  }));
  root.querySelectorAll('[data-vis]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.vis;
    it.style[k] = it.style[k] === false;
    dbInspector(); dbCanvas();
  }));
  root.querySelectorAll('[data-rte]').forEach(el => el.addEventListener('input', () => {
    markDirty(DB.doc);
    const c = (it.content[+el.dataset.rte] = it.content[+el.dataset.rte] || {});
    c[el.dataset.k] = el.innerHTML;
    dbCanvas();
  }));
  root.querySelectorAll('[data-c]').forEach(el => el.addEventListener('input', () => {
    markDirty(DB.doc);
    const c = (it.content[+el.dataset.c] = it.content[+el.dataset.c] || {});
    const k = el.dataset.k, v = el.value;
    if(k === 'items')        c.items   = v.split('\n').map(x=>x.trim()).filter(Boolean);
    else if(k === 'headers') c.headers = v.split(',').map(x=>x.trim()).filter(Boolean);
    else if(k === 'rows' && it.id === 'toc') c.rows = v.split('\n').map(l=>l.split('|').map(x=>x.trim())).filter(r=>r[0]);
    else if(k === 'rows')    c.rows    = v.split('\n').map(l=>l.split(',').map(x=>x.trim())).filter(r=>r[0]);
    else if(k === 'pairs')   c.pairs   = v.split('\n').map(l=>l.split('|').map(x=>x.trim())).filter(r=>r[0]);
    else c[k] = v;
    dbCanvas();
  }));
  // Scrub-drag the little field icons, as in the admin inspector.
  root.querySelectorAll('.fig-ic').forEach(ic => ic.addEventListener('mousedown', e => {
    const input = ic.parentElement.querySelector('input');
    if(!input) return;
    e.preventDefault();
    const x0 = e.clientX, v0 = +input.value || 0;
    const move = ev => { input.value = Math.max(0, v0 + Math.round((ev.clientX - x0)/2)); input.dispatchEvent(new Event('input',{bubbles:true})); };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }));
}
