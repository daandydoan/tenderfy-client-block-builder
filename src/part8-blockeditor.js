/* ═══ Block Builder — ported from tenderfy-admin/block-edit.html ═══════════
   Composes ELEMENTS (primitives) into a block. Deliberately different from the
   Document Builder, which places finished blocks:
     • Width  Fill / Fixed / Min / Max     (document items also get Hug)
     • Height Fill / Fixed / Max           (no Hug, no Min — per the handover)
     • adds Alignment (3x3), Gap and Typography, which document items omit
     • Fill / Stroke can bind to a brand token instead of a fixed colour
   Visual | Code modes, as on the prototype.                                   */

const BE_ELEMENTS = ['heading','subheading','paragraph','list','quote','image','table','keyvalue',
                     'signature','divider','spacer','field','callout','stat','button','toc'];
const BE_TAGS = {heading:'Text',subheading:'Text',paragraph:'Text',list:'Text',quote:'Text',callout:'Text',
  image:'Media', table:'Data',keyvalue:'Data',field:'Data',stat:'Data',toc:'Data',
  signature:'Sign-off', divider:'Layout',spacer:'Layout',button:'Layout'};
const BE_TAG_ORDER = ['Text','Media','Data','Sign-off','Layout'];
const BE_NAME = {heading:'Heading',subheading:'Sub-heading',paragraph:'Paragraph',list:'Bulleted list',
  quote:'Quote',image:'Image',table:'Table',keyvalue:'Key / Value',signature:'Signature',divider:'Divider',
  spacer:'Spacer',field:'Merge field',callout:'Callout',stat:'Stat',button:'Button',toc:'Contents'};

const BE_EL_STYLE = Object.assign({}, DOC_ITEM_STYLE_DEFAULT, {
  wMode:'fill', wPx:240, hMode:'fill', hVal:120,
  fFont:'', fSize:0, fLh:0, fWeight:'', fAlign:'', fColor:'', // typography ('' / 0 = inherit)
  bstyle:'solid', bgBind:'', bcBind:'',                       // stroke style, brand-token binding
});
const BE_FONTS = ['Outfit','Inter','Poppins','Lora','Roboto'];
const BRAND_ROLES = [['','Custom colour'],['primary','Brand primary'],['secondary','Brand accent'],['background','Brand background']];

let BE = null;
function beNewBlock(){
  return {id:null, name:'New Custom Block', kind:'block', status:'draft', isNew:true, cat:'Text Blocks',
    elements:[], style:{alignH:'left', alignV:'top', gap:20, dir:'col',
      padH:0,padV:0,padSides:false,padT:0,padR:0,padB:0,padL:0, rad:0,radSides:false,
      bgOn:false,bg:'#ffffff',bgA:100,bgVis:true,bgBind:'',
      bcOn:false,bc:'#dbe3e0',bcA:100,bcVis:true,bw:1,bpos:'inside',bstyle:'solid',bcBind:''}};
}
window.beOpen = (block) => {
  BE = {block: block || beNewBlock(), sel:null, mode:'visual', code:'', brand:'',
        hist:[], hidx:-1, restoring:false, clip:null, autoT:null};
  document.getElementById('be').classList.add('open');
  bePushHist('Opened');
  beRenderAll();
};
window.beClose = () => { document.getElementById('be').classList.remove('open'); if(BE) clearTimeout(BE.autoT); BE = null; };

/* ── Undo / redo / history / autosave, from tenderfy-admin/block-edit.html ──
   Each commit snapshots the block; restoring replaces the canvas outright.  */
function beSnapshot(){ return JSON.stringify({elements:BE.block.elements, style:BE.block.style, code:BE.code}); }
function bePushHist(label){
  if(BE.restoring) return;
  const snap = beSnapshot();
  if(BE.hidx >= 0 && BE.hist[BE.hidx].snap === snap) return;
  BE.hist = BE.hist.slice(0, BE.hidx + 1);
  BE.hist.push({snap, label: label || 'Edit', at: beClock()});
  if(BE.hist.length > 60) BE.hist.shift();
  BE.hidx = BE.hist.length - 1;
  beAutosave();
}
function beClock(){ const t = new Date(); return t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function beAutosave(){
  clearTimeout(BE.autoT);
  BE.autoT = setTimeout(() => {
    const el = document.getElementById('beAutosave');
    if(el) el.innerHTML = `<span class="ms">cloud_done</span> Autosaved &middot; ${beClock()}`;
  }, 700);
}
function beRestore(i){
  const h = BE.hist[i]; if(!h) return;
  const st = JSON.parse(h.snap);
  BE.restoring = true;
  BE.block.elements = st.elements; BE.block.style = st.style; BE.code = st.code || '';
  BE.hidx = i; BE.sel = null;
  markDirty(BE.block); beRenderAll();
  BE.restoring = false;
}
window.beUndo = () => { if(BE.hidx > 0) beRestore(BE.hidx - 1); else showToast('Nothing to undo'); };
window.beRedo = () => { if(BE.hidx < BE.hist.length - 1) beRestore(BE.hidx + 1); else showToast('Nothing to redo'); };
window.beHistory = () => {
  document.getElementById('verList').innerHTML = BE.hist.length
    ? BE.hist.map((h,i) => `<div class="ver-row">
        <span class="vv">v${i+1}</span>
        <span class="vi"><div class="vt">${esc(h.label)}</div><div class="vm">${h.at}</div></span>
        ${i===BE.hidx ? '<span class="fhint">Current</span>'
          : `<button class="lbtn sm" onclick="beRestore(${i});verClose()">Restore</button>`}
      </div>`).reverse().join('')
    : '<div class="ver-empty">No versions yet.</div>';
  document.getElementById('verOv').classList.add('open');
};
window.beRestore = beRestore;
window.verClose = () => document.getElementById('verOv').classList.remove('open');
window.beExit = () => exitEditor(BE.block, null, () => { beClose(); go('/file-manager/block-library'); }, window.beSave);
window.beSave = () => {
  const b = BE.block;
  if(!b.elements.length){ showToast('Add at least one element before saving'); return; }
  const id = b.id || ('cx-' + Date.now().toString(36));
  b.id = id;
  // Register so the new block appears in every palette and renders everywhere.
  P2DOC[id] = [{cols:[b.elements.map(e => e.id)]}];
  const entry = {id, name:b.name, label:b.name, cat:b.cat, p:id, kind:'block', custom:true};
  const at = BLOCKS.findIndex(x => x.id === id);
  if(at >= 0) BLOCKS[at] = entry; else BLOCKS.push(entry);
  BLOCK_BY_ID[id] = entry;
  CUSTOM_BLOCK_DEF[id] = JSON.parse(JSON.stringify(b));
  b.dirty = false;
  beClose();
  // go() only re-renders on a hash *change*, so refresh directly when we are
  // already sitting on the library route.
  if(currentPath() === '/file-manager/block-library') renderRoute();
  else go('/file-manager/block-library');
  showToast('Saved block - ' + b.name + ' - now available in every builder');
};
// Custom blocks render from their saved element composition + styles.
const CUSTOM_BLOCK_DEF = {};

function beRenderAll(){ beHead(); beLeft(); beCanvas(); beInspector(); }

function beHead(){
  document.getElementById('beHead').innerHTML = edHeadHtml({
    doc: BE.block, mode:'block', sub:"Build visually or in code. Rendered per client's brand.",
    exit:'beExit()', save:'beSave()', saveLabel:'Save Block',
    rename:"BE.block.name=this.value;markDirty(BE.block);var b=document.getElementById('beBarName');if(b)b.textContent=this.value",
    extras:`<button class="lbtn icon-sm" data-toast="Block details - name and category" title="Details"><span class="ms">tune</span></button>`,
  });
}
// The client has one brand, so blocks always preview in it.
function beBrand(){
  return {primary:'#27535C', secondary:'#38988A', background:'#F7F9F8', font:'Outfit', bodyFont:'Outfit', company:'Tenderfy Civil'};
}

/* ── Left: Visual | Code, elements palette ───────────────────────────────── */
function beLeft(){
  const visual = BE.mode === 'visual';
  document.getElementById('beLeft').innerHTML = `
    <div class="vb-modes">
      <button class="${visual?'on':''}" onclick="BE.mode='visual';beRenderAll()"><span class="ms">dashboard_customize</span> Visual</button>
      <button class="${visual?'':'on'}" onclick="BE.mode='code';beRenderAll()"><span class="ms">data_object</span> Code</button>
    </div>
    ${visual ? `<div class="card">
      <h3 class="ed-h">Elements</h3>
      ${BE_TAG_ORDER.map(tag => {
        const pool = BE_ELEMENTS.filter(e => BE_TAGS[e] === tag);
        return `<div class="pal-tag">${tag}</div><div class="vb-pal">${pool.map(e => `
          <div class="vb-widget" draggable="true" data-el="${e}" title="${esc(BE_NAME[e])}">
            <div class="pal-prev">${primSchematic(e)}</div>
            <span class="vb-el"><span class="el-ic ms">${PRIM_ICON[e]||'article'}</span>${esc(BE_NAME[e])}</span>
          </div>`).join('')}</div>`;
      }).join('')}
      <div class="fhint" style="margin-top:10px">Drag onto the page, or click to add.</div>
    </div>` : `<div class="card">
      <h3 class="ed-h">Custom code</h3>
      <button class="lbtn sm" style="width:100%;margin-bottom:14px" onclick="beGenCode()"><span class="ms">bolt</span> Generate from visual layout</button>
      <div class="fhint" style="line-height:1.9">
        <code>var(--brand-primary)</code> - headings<br>
        <code>var(--brand-secondary)</code> - accents<br>
        <code>{{client.name}}</code> - merge field</div>
    </div>`}`;
  document.querySelectorAll('#beLeft .vb-widget').forEach(el => {
    el.addEventListener('click', () => beAdd(el.dataset.el));
    el.addEventListener('dragstart', e => e.dataTransfer.setData('text','add:'+el.dataset.el));
  });
}
window.beGenCode = () => {
  BE.code = `<div class="block">\n${BE.block.elements.map(e =>
    '  ' + renderPrimitive(e.id, beBrand(), e.content).replace(/\n\s*/g,' ')).join('\n')}\n</div>`;
  bePushHist('Generated code'); beCanvas(); showToast('Generated from the visual layout');
};

/* ── Middle: canvas ──────────────────────────────────────────────────────── */
function beAdd(id, at){
  markDirty(BE.block);
  const el = {id, content:{}, style:Object.assign({}, BE_EL_STYLE)};
  if(typeof at === 'number') BE.block.elements.splice(at, 0, el); else BE.block.elements.push(el);
  BE.sel = typeof at === 'number' ? at : BE.block.elements.length - 1;
  bePushHist('Added ' + BE_NAME[id]);
  beRenderAll(); showToast('Added: ' + BE_NAME[id]);
}
window.beDel = i => { markDirty(BE.block); const n=BE_NAME[BE.block.elements[i].id]; BE.block.elements.splice(i,1); BE.sel = null; bePushHist('Removed '+n); beRenderAll(); };
window.beDup = i => { markDirty(BE.block); const c = JSON.parse(JSON.stringify(BE.block.elements[i])); BE.block.elements.splice(i+1,0,c); BE.sel=i+1; bePushHist('Duplicated '+BE_NAME[c.id]); beRenderAll(); };
window.beMove = (i,d) => { const j=i+d; if(j<0||j>=BE.block.elements.length) return; markDirty(BE.block);
  const [x]=BE.block.elements.splice(i,1); BE.block.elements.splice(j,0,x); BE.sel=j; bePushHist('Reordered'); beRenderAll(); };
window.beSel = i => { BE.sel = i; beCanvas(); beInspector(); };

function beElStyleCss(s){
  let c = `box-sizing:border-box;padding:${boxCss(s,'pad')};margin:${boxCss(s,'mar')};border-radius:${radCss(s)};`;
  if(s.wMode==='fixed' && s.wPx>0) c += `width:${s.wPx}px;`;
  else if(s.wMode==='min' && s.wPx>0) c += `min-width:${s.wPx}px;`;
  else if(s.wMode==='max' && s.wPx>0) c += `max-width:${s.wPx}px;`;
  else c += 'width:100%;align-self:stretch;';
  if(s.hMode==='fixed' && s.hVal>0) c += `height:${s.hVal}px;overflow:hidden;`;
  else if(s.hMode==='max' && s.hVal>0) c += `max-height:${s.hVal}px;overflow:auto;`;
  if(radAny(s)) c += 'overflow:hidden;';
  const bg = s.bgBind ? `var(--brand-${s.bgBind})` : paintCss(s.bg, s.bgA);
  if(s.bgOn && s.bgVis !== false) c += `background:${bg};`;
  if(s.bcOn && s.bcVis !== false){
    const col = s.bcBind ? `var(--brand-${s.bcBind})` : paintCss(s.bc, s.bcA);
    const st = s.bstyle || 'solid';
    c += s.bpos==='center' ? `outline:${s.bw}px ${st} ${col};outline-offset:${-s.bw/2}px;`
       : s.bpos==='outside' ? `border:${s.bw}px ${st} ${col};`
       : st === 'solid' ? `box-shadow:inset 0 0 0 ${s.bw}px ${col};`
       : `outline:${s.bw}px ${st} ${col};outline-offset:${-s.bw}px;`;
  }
  if(s.fFont)  c += `font-family:'${s.fFont}',sans-serif;`;
  if(s.fSize)  c += `font-size:${s.fSize}px;`;
  if(s.fLh)    c += `line-height:${s.fLh};`;
  if(s.fWeight)c += `font-weight:${s.fWeight};`;
  if(s.fAlign) c += `text-align:${s.fAlign};`;
  if(s.fColor) c += `color:${s.fColor};`;
  return c;
}
// Column flex: align-items is the horizontal axis, justify-content the vertical.
const AL_CROSS = {left:'flex-start', center:'center', right:'flex-end'};
const AL_MAIN  = {top:'flex-start', middle:'center', bottom:'flex-end'};
function beBlockCss(s){
  return `display:flex;flex-direction:column;gap:${s.gap||0}px;`
    + `align-items:${AL_CROSS[s.alignH]||'flex-start'};justify-content:${AL_MAIN[s.alignV]||'flex-start'};`
    + `padding:${boxCss(s,'pad')};border-radius:${radCss(s)};`
    + (s.bgOn && s.bgVis!==false ? `background:${s.bgBind?`var(--brand-${s.bgBind})`:paintCss(s.bg,s.bgA)};` : '')
    + (s.bcOn && s.bcVis!==false ? ((s.bstyle||'solid')==='solid'
        ? `box-shadow:inset 0 0 0 ${s.bw}px ${s.bcBind?`var(--brand-${s.bcBind})`:paintCss(s.bc,s.bcA)};`
        : `outline:${s.bw}px ${s.bstyle} ${s.bcBind?`var(--brand-${s.bcBind})`:paintCss(s.bc,s.bcA)};outline-offset:${-s.bw}px;`) : '');
}
function beCanvas(){
  const b = BE.block, brand = beBrand();
  const vars = `--brand-primary:${brand.primary};--brand-secondary:${brand.secondary};--brand-background:${brand.background};`;
  if(BE.mode === 'code'){
    document.getElementById('beCanvas').innerHTML = `<div class="code-split">
      <div class="code-pane"><div class="ph"><span class="ms">data_object</span> HTML</div>
        <textarea class="code-ta" spellcheck="false" placeholder="&lt;div&gt;Your block markup...&lt;/div&gt;"
          oninput="BE.code=this.value;markDirty(BE.block);beAutosave();document.getElementById('bePrev').innerHTML=this.value">${esc(BE.code)}</textarea></div>
      <div class="code-pane"><div class="ph"><span class="ms">visibility</span> Live preview</div>
        <div class="code-prev"><div class="code-prev-page" id="bePrev" style="${vars}">${BE.code}</div></div></div>
    </div>`;
    return;
  }
  const sel = BE.sel;
  const pillEl = document.getElementById('beSel');
  pillEl.className = 'sel-pill' + (sel == null ? '' : ' on');
  pillEl.innerHTML = sel == null
    ? `<span class="ms">dashboard</span> Whole block`
    : `<span class="ms">check_circle</span> ${esc(BE_NAME[b.elements[sel].id])}<span class="ms x" onclick="beSel(null)" title="Select the whole block">close</span>`;
  const body = b.elements.map((e,i) => `
    <div class="be-el ${sel===i?'sel':''}" data-i="${i}" draggable="true" onclick="event.stopPropagation();beSel(${i})"
         style="${beElStyleCss(e.style)}">
      <span class="be-tag">${esc(BE_NAME[e.id])}</span>
      <span class="be-bar">
        <span class="ms" onclick="event.stopPropagation();beMove(${i},-1)" title="Move up">expand_less</span>
        <span class="ms" onclick="event.stopPropagation();beMove(${i},1)" title="Move down">expand_more</span>
        <span class="ms" onclick="event.stopPropagation();beDup(${i})" title="Duplicate">content_copy</span>
        <span class="ms" onclick="event.stopPropagation();beDel(${i})" title="Remove">close</span></span>
      ${renderPrimitive(e.id, brand, e.content)}
    </div>`).join('');
  document.getElementById('beCanvas').innerHTML = `
    <div class="vb-bar"><span class="ms" style="font-size:16px;color:var(--live-cta)">widgets</span>
      <span id="beBarName">${esc(b.name)}</span>
      <span class="muted" style="font-weight:400">${b.elements.length} element${b.elements.length===1?'':'s'}</span></div>
    <div class="vb-stage" onclick="beSel(null)">
      <div class="be-page ${sel==null?'sel':''}" id="bePage" style="${vars}${beBlockCss(b.style)}">${body}</div>
      <div class="vb-tail" id="beTail"><span class="ms">add</span> Drag an element here, or click one in the palette.</div>
    </div>`;
  beWireCanvas();
}
function beWireCanvas(){
  const page = document.getElementById('bePage');
  if(!page) return;
  page.addEventListener('dragover', e => { e.preventDefault(); page.classList.add('over'); });
  page.addEventListener('dragleave', e => { if(!page.contains(e.relatedTarget)) page.classList.remove('over'); });
  page.addEventListener('drop', e => {
    e.preventDefault(); page.classList.remove('over');
    const tok = e.dataTransfer.getData('text');
    if(tok && tok.startsWith('add:')) beAdd(tok.slice(4));
  });
  page.querySelectorAll('.be-el').forEach(el =>
    el.addEventListener('dragstart', ev => ev.dataTransfer.setData('text','move:'+el.dataset.i)));
  const tail = document.getElementById('beTail');
  if(tail){
    tail.addEventListener('click', e => { e.stopPropagation();
      const q = document.querySelector('#beLeft .vb-widget'); if(q) q.scrollIntoView({block:'nearest'}); });
    tail.addEventListener('dragover', e => { e.preventDefault(); tail.classList.add('over'); });
    tail.addEventListener('dragleave', () => tail.classList.remove('over'));
    tail.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation(); tail.classList.remove('over');
      const tok = e.dataTransfer.getData('text');
      if(tok && tok.startsWith('add:')) beAdd(tok.slice(4));
    });
  }
}

/* ── Right: Style inspector ──────────────────────────────────────────────── */
function beInspector(){
  const el = document.getElementById('beRight');
  if(BE.mode === 'code'){ el.innerHTML = `<div class="card"><h3 class="ed-h">Style</h3><div class="fhint">Styling is handled in the markup while you are in Code mode.</div></div>`; return; }
  const isBlock = BE.sel == null;
  const t = isBlock ? BE.block : BE.block.elements[BE.sel];
  const s = t.style || BE.block.style;
  const num = (k,v,max) => `<input type="number" data-s="${k}" value="${v==null?'':v}" min="0"${max?` max="${max}"`:''}>`;
  const opt = (list, cur) => list.map(([v,n])=>`<option value="${v}"${String(cur||'')===v?' selected':''}>${n}</option>`).join('');
  // Padding / Margin, both in the admin's fig-box shape.
  const boxSec = (key,label) => `
    <div class="fig-box" data-box="${key}">
      <div class="fig-box-head"><span class="fig-label">${label}</span>
        <button type="button" class="fig-toggle ${s[key+'Sides']?'on':''}" data-sides="${key}" title="Edit sides individually"><span class="ms">border_outer</span></button></div>
      <div class="fig-hv" ${s[key+'Sides']?'hidden':''}>
        <span class="fig-field"><span class="ms fig-ic" title="Horizontal">width</span>${num(key+'H',s[key+'H'],200)}</span>
        <span class="fig-field"><span class="ms fig-ic" title="Vertical">height</span>${num(key+'V',s[key+'V'],200)}</span></div>
      <div class="fig-cross" ${s[key+'Sides']?'':'hidden'}>
        ${[['T','border_top'],['R','border_right'],['B','border_bottom'],['L','border_left']]
          .map(([k,ic])=>`<span class="fig-field"><span class="ms fig-ic">${ic}</span>${num(key+k,s[key+k])}</span>`).join('')}</div>
    </div>`;
  // Fill / Stroke share the admin's fig-sec paint row, with the brand binding below.
  const paint = (kind, label) => {
    const on   = kind==='fill' ? s.bgOn : s.bcOn;
    const key  = kind==='fill' ? 'bg' : 'bc';
    const hex  = kind==='fill' ? s.bg : s.bc;
    const a    = kind==='fill' ? s.bgA : s.bcA;
    const vis  = kind==='fill' ? s.bgVis : s.bcVis;
    const bind = (kind==='fill' ? s.bgBind : s.bcBind) || '';
    const role = (BRAND_ROLES.find(r => r[0] === bind)||[])[1];
    return `<div class="fig-sec-h"><span class="fig-sec-t">${label}</span>
        <span class="fig-acts"><button type="button" class="fig-a" data-paint="${kind}" title="${on?'Remove':'Add'} ${label.toLowerCase()}"><span class="ms">${on?'remove':'add'}</span></button></span></div>
      ${on ? `<div class="fig-paint">
        <span class="fig-sw"><input type="color" class="insp-color" data-s="${key}" value="${hex}" ${bind?'disabled':''}></span>
        <input class="fig-hexin insp-hex" data-s="${key}" value="${bind?'':hex.toUpperCase()}" placeholder="${bind?'brand token':'FFFFFF'}" ${bind?'disabled':''}>
        <span class="fig-op"><input type="number" data-s="${key}A" value="${a}" min="0" max="100"><span class="fig-op-u">%</span></span>
        <button type="button" class="fig-a" data-vis="${key}Vis" title="${vis?'Hide':'Show'}"><span class="ms">${vis?'visibility':'visibility_off'}</span></button></div>
      ${bind?`<div class="bind-note"><span class="ms" style="font-size:14px">link</span> Follows ${esc(role||bind)}</div>`:''}
      <select class="insp-sel fig-bind" data-s="${key}Bind">${opt(BRAND_ROLES, bind)}</select>` : ''}`;
  };

  el.innerHTML = `<div class="card">
    <h3 class="ed-h">Style</h3>
    <div id="styleTarget"><span class="ms"${isBlock?' style="color:var(--light)"':''}>${isBlock?'dashboard':'check_circle'}</span> Editing: ${isBlock?'whole block':esc(BE_NAME[t.id]||'element')}</div>
    <div class="insp-actions">
      <select class="insp-sel" data-preset><option value="">No preset</option><option>Card</option><option>Panel</option><option>Quiet</option></select>
      <button class="insp-ico" data-copy title="Copy style"><span class="ms">content_copy</span></button>
      <button class="insp-ico" data-pasteb title="Paste style" ${BE.clip?'':'disabled'}><span class="ms">content_paste</span></button>
      <button class="insp-ico" onclick="beReset()" title="Reset style"><span class="ms">restart_alt</span></button>
    </div>

    ${!isBlock && t.id === 'field' ? `<div class="insp-sec"><div class="insp-h">Merge field</div>
      <div class="insp-row"><label>Field</label><select class="insp-sel" data-c="field">
        ${['Client name','Project name','Tender number','Date','Prepared by'].map(f=>`<option${(t.content.field===f)?' selected':''}>${f}</option>`).join('')}</select></div>
      <div class="fhint">Resolves to the client/project value when a document is generated.</div></div>` : ''}

    ${!isBlock && t.id === 'image' ? `<div class="insp-sec"><div class="insp-h">Image source</div>
      <div class="insp-row"><label>Source</label><div class="seg full" data-imgsrc>
        <button data-src="placeholder" class="${(t.content.src||'placeholder')==='placeholder'?'on':''}">Placeholder</button>
        <button data-src="client" class="${t.content.src==='client'?'on':''}">Company asset</button>
      </div></div>
      <div class="fhint">&ldquo;Company asset&rdquo; pulls your logo from Company Settings.</div></div>` : ''}

    <div class="insp-sec"><div class="insp-h">Layout</div>
      <div class="fig-label" style="margin-bottom:6px">Resizing</div>
      <div class="fig-resize">
        <span class="fig-wt" title="Width"><span class="ms">swap_horiz</span>${num('wPx',s.wPx)}</span>
        <select class="insp-sel" data-s="wMode">${opt([['fill','Fill container'],['fixed','Fixed width'],['min','Min width'],['max','Max width']], s.wMode)}</select></div>
      <div class="fig-resize" style="margin-top:6px">
        <span class="fig-wt" title="Height"><span class="ms">swap_vert</span>${num('hVal',s.hVal)}</span>
        <select class="insp-sel" data-s="hMode">${opt([['fill','Fill height'],['fixed','Fixed height'],['max','Max height']], s.hMode)}</select></div>
      ${isBlock ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:14px;margin-top:12px;align-items:start">
        <div><div class="fig-label" style="margin-bottom:5px">Alignment</div>
          <div class="fig-align">${['top','middle','bottom'].map(v=>['left','center','right'].map(h=>
            `<button type="button" data-al="${h}|${v}" class="${s.alignH===h&&s.alignV===v?'on':''}" title="${v} ${h}"></button>`).join('')).join('')}</div></div>
        <div><div class="fig-label" style="margin-bottom:5px">Gap</div>
          <span class="fig-wt"><span class="ms">width_normal</span>${num('gap',s.gap,200)}</span></div>
      </div>` : ''}
    </div>

    <div class="insp-sec"><div class="insp-h">Dimension</div>
      ${boxSec('pad','Padding')}
      ${isBlock ? '' : boxSec('mar','Margin')}</div>

    <div class="insp-sec fig-sec">${paint('fill','Fill')}</div>

    ${!isBlock ? `<div class="insp-sec"><div class="insp-h">Typography</div>
      <div class="insp-row"><label>Font</label><select class="insp-sel" data-s="fFont">
        <option value="">Inherit from brand</option>${BE_FONTS.map(f=>`<option${s.fFont===f?' selected':''}>${f}</option>`).join('')}</select></div>
      <div class="insp-row" style="margin-top:7px"><label>Weight</label><select class="insp-sel" data-s="fWeight">
        ${opt([['','Inherit from brand'],['400','400 &middot; Regular'],['500','500 &middot; Medium'],['600','600 &middot; Semibold'],['700','700 &middot; Bold']], s.fWeight)}</select></div>
      <div class="insp-row" style="margin-top:7px"><label>Size</label><div class="insp-ctl">
        <input type="number" class="insp-num" data-s="fSize" value="${s.fSize||''}" placeholder="brand"><span class="insp-unit">px</span>
        <input type="number" class="insp-num" data-s="fLh" value="${s.fLh||''}" placeholder="brand"><span class="insp-unit">line</span></div></div>
      <div class="insp-row" style="margin-top:7px"><label>Colour</label><div class="insp-ctl">
        <input type="color" class="insp-color" data-s="fColor" value="${s.fColor||'#2E3C3B'}">
        <input type="text" class="insp-hex" data-s="fColor" value="${s.fColor?s.fColor.toUpperCase():''}" placeholder="Inherit from brand"></div></div>
      <div class="insp-row" style="margin-top:7px"><label>Align</label><div class="seg" data-falign>
        ${[['left','format_align_left','Left'],['center','format_align_center','Centre'],['right','format_align_right','Right'],['justify','format_align_justify','Justify']]
          .map(([v,ic,ti])=>`<button data-al2="${v}" class="${s.fAlign===v?'on':''}" title="${ti}"><span class="ms">${ic}</span></button>`).join('')}</div></div>
      <div class="fhint" style="margin:8px 0 0">Blank fields inherit the client&rsquo;s brand &amp; styling.</div>
    </div>` : ''}

    <div class="insp-sec"><div class="insp-h">Appearance</div>
      <div class="fig-box" data-box="rad">
        <div class="fig-box-head"><span class="fig-label">Corner radius</span>
          <button type="button" class="fig-toggle ${s.radSides?'on':''}" data-sides="rad" title="Edit corners individually"><span class="ms">rounded_corner</span></button></div>
        <div class="fig-solo" ${s.radSides?'hidden':''}>
          <span class="fig-field"><span class="ms fig-ic">rounded_corner</span>${num('rad',s.rad,400)}</span></div>
        <div class="fig-corners" ${s.radSides?'':'hidden'}>
          ${[['radTL','cn cn-tl'],['radTR','cn cn-tr'],['radBL','cn cn-bl'],['radBR','cn cn-br']]
            .map(([k,cn])=>`<span class="fig-field"><span class="ms fig-ic ${cn}">rounded_corner</span>${num(k,s[k],400)}</span>`).join('')}</div>
      </div>
      <div class="fig-sec" style="margin-top:14px">${paint('stroke','Stroke')}
        ${s.bcOn ? `<div class="fig-strokerow">
          <div><label>Position</label><select class="insp-sel" data-s="bpos">${opt([['inside','Inside'],['center','Center'],['outside','Outside']], s.bpos)}</select></div>
          <div><label>Weight</label><span class="fig-wt"><span class="ms">line_weight</span>${num('bw',s.bw,40)}</span></div></div>
        <div class="insp-row" style="margin-top:8px"><label>Style</label><select class="insp-sel" data-s="bstyle">${opt([['solid','Solid'],['dashed','Dashed'],['dotted','Dotted']], s.bstyle)}</select></div>` : ''}
      </div></div>

    ${!isBlock ? `<div style="display:flex;gap:8px;margin-top:12px">
      <button class="lbtn sm" style="flex:1" onclick="beDup(${BE.sel})"><span class="ms">content_copy</span> Duplicate</button>
      <button class="lbtn sm" style="flex:1" onclick="beDel(${BE.sel})"><span class="ms">close</span> Remove</button></div>` : ''}
  </div>`;
  beWireInspector(t, s);
}
const BE_PRESETS = {
  Card:  {padH:20, padV:18, rad:12, bgOn:true, bg:'#ffffff', bgA:100, bcOn:true, bc:'#E3E8E7', bcA:100, bw:1, bpos:'inside'},
  Panel: {padH:22, padV:20, rad:14, bgOn:true, bg:'#F2F6F5', bgA:100, bcOn:false},
  Quiet: {padH:0,  padV:0,  rad:0,  bgOn:false, bcOn:false},
};
window.beReset = () => {
  const t = BE.sel == null ? BE.block : BE.block.elements[BE.sel];
  if(BE.sel == null) BE.block.style = beNewBlock().style;
  else t.style = Object.assign({}, BE_EL_STYLE);
  markDirty(BE.block); bePushHist('Reset style'); beCanvas(); beInspector(); showToast('Style reset');
};
function beWireInspector(t, s){
  const root = document.getElementById('beRight');
  const touch = () => { markDirty(BE.block); beCanvas(); };
  const commit = label => { bePushHist(label || 'Style change'); };
  root.querySelectorAll('[data-s]').forEach(el => {
    const ev = el.type === 'color' || el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      const k = el.dataset.s;
      if(el.classList.contains('insp-hex') || el.classList.contains('fig-hexin')){
        let v = el.value.trim(); if(v && v[0] !== '#') v = '#' + v;
        if(v && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return;
        s[k] = v;
      } else {
        s[k] = el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
      }
      touch(); commit();
      if(el.tagName === 'SELECT' || el.type === 'color') beInspector();
    });
  });
  root.querySelectorAll('[data-sides]').forEach(b => b.addEventListener('click', () => {
    s[b.dataset.sides+'Sides'] = !s[b.dataset.sides+'Sides']; touch(); commit(); beInspector();
  }));
  root.querySelectorAll('[data-paint]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.paint === 'fill' ? 'bgOn' : 'bcOn';
    s[k] = !s[k]; touch(); commit(); beInspector();
  }));
  root.querySelectorAll('[data-vis]').forEach(b => b.addEventListener('click', () => {
    s[b.dataset.vis] = s[b.dataset.vis] === false; touch(); commit(); beInspector();
  }));
  root.querySelectorAll('[data-al]').forEach(b => b.addEventListener('click', () => {
    const [h,v] = b.dataset.al.split('|'); s.alignH = h; s.alignV = v; touch(); commit('Alignment'); beInspector();
  }));
  root.querySelectorAll('[data-al2]').forEach(b => b.addEventListener('click', () => {
    s.fAlign = s.fAlign === b.dataset.al2 ? '' : b.dataset.al2; touch(); commit('Text align'); beInspector();
  }));
  root.querySelectorAll('[data-imgsrc] button').forEach(b => b.addEventListener('click', () => {
    t.content.src = b.dataset.src; touch(); commit('Image source'); beInspector();
  }));
  root.querySelectorAll('[data-c]').forEach(el => el.addEventListener('change', () => {
    t.content[el.dataset.c] = el.value; touch(); commit('Content');
  }));
  // Preset / copy / paste, as on the admin inspector.
  const preset = root.querySelector('[data-preset]');
  if(preset) preset.addEventListener('change', () => {
    const p = BE_PRESETS[preset.value];
    if(!p) return;
    Object.assign(s, p); touch(); commit('Preset: ' + preset.value); beInspector();
    showToast('Applied preset - ' + preset.value);
  });
  const copy = root.querySelector('[data-copy]');
  if(copy) copy.addEventListener('click', () => { BE.clip = JSON.parse(JSON.stringify(s)); beInspector(); showToast('Style copied'); });
  const paste = root.querySelector('[data-pasteb]');
  if(paste) paste.addEventListener('click', () => {
    if(!BE.clip) return;
    Object.assign(s, JSON.parse(JSON.stringify(BE.clip))); touch(); commit('Pasted style'); beInspector(); showToast('Style pasted');
  });
}

// Open an existing block for editing. Built-ins are opened as a starting point.
window.beOpenExisting = id => {
  const def = CUSTOM_BLOCK_DEF[id];
  if(def){ beOpen(JSON.parse(JSON.stringify(def))); return; }
  const b = BLOCK_BY_ID[id];
  if(!b) return;
  const prims = [];
  (P2DOC[b.p] || [{cols:[[b.p]]}]).forEach(r => r.cols.forEach(c => c.forEach(p => prims.push(p))));
  beOpen(Object.assign(beNewBlock(), {
    name: b.name, cat: b.cat,
    elements: prims.filter(p => BE_ELEMENTS.includes(p)).map(p => ({id:p, content:{}, style:Object.assign({}, BE_EL_STYLE)})),
  }));
  showToast('Editing a copy of "' + b.name + '"');
};
