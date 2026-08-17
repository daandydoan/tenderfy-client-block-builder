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
  fSize:0, fWeight:'', fAlign:'', fColor:'', fBind:'',        // typography (0/'' = inherit)
  bgBind:'', bcBind:'',                                       // brand-token binding
});
const BRAND_ROLES = [['','Custom colour'],['primary','Brand primary'],['secondary','Brand accent'],['background','Brand background']];

let BE = null;
function beNewBlock(){
  return {id:null, name:'New Custom Block', kind:'block', status:'draft', isNew:true, cat:'Text Blocks',
    elements:[], style:{alignH:'left', alignV:'top', gap:20, dir:'col',
      padH:0,padV:0,padSides:false,padT:0,padR:0,padB:0,padL:0, rad:0,radSides:false,
      bgOn:false,bg:'#ffffff',bgA:100,bgVis:true,bgBind:'',
      bcOn:false,bc:'#dbe3e0',bcA:100,bcVis:true,bw:1,bpos:'inside',bcBind:''}};
}
window.beOpen = (block) => {
  BE = {block: block || beNewBlock(), sel:null, mode:'visual', code:'', brand:'',
        undo:[], redo:[]};
  document.getElementById('be').classList.add('open');
  beRenderAll();
};
window.beClose = () => { document.getElementById('be').classList.remove('open'); BE = null; };
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
  return {primary:'#27535C', secondary:'#38988A', background:'#F7F9F8', font:'Outfit', bodyFont:'Outfit'};
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
        return `<div class="pal-cat">${tag}</div><div class="vb-pal">${pool.map(e => `
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
  beCanvas(); showToast('Generated from the visual layout');
};

/* ── Middle: canvas ──────────────────────────────────────────────────────── */
function beAdd(id, at){
  markDirty(BE.block);
  const el = {id, content:{}, style:Object.assign({}, BE_EL_STYLE)};
  if(typeof at === 'number') BE.block.elements.splice(at, 0, el); else BE.block.elements.push(el);
  BE.sel = typeof at === 'number' ? at : BE.block.elements.length - 1;
  beRenderAll(); showToast('Added: ' + BE_NAME[id]);
}
window.beDel = i => { markDirty(BE.block); BE.block.elements.splice(i,1); BE.sel = null; beRenderAll(); };
window.beDup = i => { markDirty(BE.block); const c = JSON.parse(JSON.stringify(BE.block.elements[i])); BE.block.elements.splice(i+1,0,c); BE.sel=i+1; beRenderAll(); };
window.beMove = (i,d) => { const j=i+d; if(j<0||j>=BE.block.elements.length) return; markDirty(BE.block);
  const [x]=BE.block.elements.splice(i,1); BE.block.elements.splice(j,0,x); BE.sel=j; beRenderAll(); };
window.beSel = i => { BE.sel = i; beCanvas(); beInspector(); };

function beElStyleCss(s){
  let c = `box-sizing:border-box;padding:${boxCss(s,'pad')};border-radius:${radCss(s)};`;
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
    c += s.bpos==='inside' ? `box-shadow:inset 0 0 0 ${s.bw}px ${col};`
       : s.bpos==='center' ? `outline:${s.bw}px solid ${col};outline-offset:${-s.bw/2}px;`
       : `border:${s.bw}px solid ${col};`;
  }
  if(s.fSize)  c += `font-size:${s.fSize}px;`;
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
    + (s.bcOn && s.bcVis!==false ? `box-shadow:inset 0 0 0 ${s.bw}px ${s.bcBind?`var(--brand-${s.bcBind})`:paintCss(s.bc,s.bcA)};` : '');
}
function beCanvas(){
  const b = BE.block, brand = beBrand();
  const vars = `--brand-primary:${brand.primary};--brand-secondary:${brand.secondary};--brand-background:${brand.background};`;
  if(BE.mode === 'code'){
    document.getElementById('beCanvas').innerHTML = `<div class="code-split">
      <div class="code-pane"><div class="ph"><span class="ms">data_object</span> HTML</div>
        <textarea class="code-ta" spellcheck="false" placeholder="&lt;div&gt;Your block markup...&lt;/div&gt;"
          oninput="BE.code=this.value;markDirty(BE.block);document.getElementById('bePrev').innerHTML=this.value">${esc(BE.code)}</textarea></div>
      <div class="code-pane"><div class="ph"><span class="ms">visibility</span> Live preview</div>
        <div class="code-prev"><div class="code-prev-page" id="bePrev" style="${vars}">${BE.code}</div></div></div>
    </div>`;
    return;
  }
  const sel = BE.sel;
  const pill = sel == null ? 'Block' : BE_NAME[b.elements[sel].id];
  document.getElementById('beSel').textContent = pill;
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
  const boxSec = (key,label) => `
    <div class="fig-box">
      <div class="fig-box-head"><span class="fig-label">${label}</span>
        <button type="button" class="fig-toggle ${s[key+'Sides']?'on':''}" data-sides="${key}"><span class="ms">border_outer</span></button></div>
      <div class="fig-hv" ${s[key+'Sides']?'hidden':''}>
        <span class="fig-field"><span class="ms fig-ic">width</span>${num(key+'H',s[key+'H'],200)}</span>
        <span class="fig-field"><span class="ms fig-ic">height</span>${num(key+'V',s[key+'V'],200)}</span></div>
      <div class="fig-cross" ${s[key+'Sides']?'':'hidden'}>
        ${[['T','border_top'],['R','border_right'],['B','border_bottom'],['L','border_left']]
          .map(([k,ic])=>`<span class="fig-field"><span class="ms fig-ic">${ic}</span>${num(key+k,s[key+k])}</span>`).join('')}</div>
    </div>`;
  const paint = (on,kind,hex,a,vis,bind,label) => `
    <div class="fig-sec">
      <div class="fig-sec-h"><span class="fig-sec-t">${label}</span>
        <span class="fig-acts"><button type="button" class="fig-a" data-paint="${kind}"><span class="ms">${on?'remove':'add'}</span></button></span></div>
      ${on ? `<div class="fig-paint">
          <input type="color" class="fig-sw" data-s="${kind==='fill'?'bg':'bc'}" value="${hex}" ${bind?'disabled':''}>
          <input class="fig-hexin" data-s="${kind==='fill'?'bg':'bc'}" value="${bind?'brand token':hex}" ${bind?'disabled':''}>
          <span class="fig-op"><input type="number" data-s="${kind==='fill'?'bgA':'bcA'}" value="${a}" min="0" max="100"><span class="fig-op-u">%</span></span>
          <button type="button" class="fig-a" data-vis="${kind==='fill'?'bgVis':'bcVis'}"><span class="ms">${vis?'visibility':'visibility_off'}</span></button></div>
        <div class="insp-row" style="margin-top:7px"><label>Bind</label>
          <select class="insp-sel" data-s="${kind==='fill'?'bgBind':'bcBind'}">
            ${BRAND_ROLES.map(([v,n])=>`<option value="${v}"${bind===v?' selected':''}>${n}</option>`).join('')}</select></div>` : ''}
    </div>`;

  el.innerHTML = `<div class="card">
    <h3 class="ed-h">Style</h3>
    <div class="insp-target"><span class="ms">${isBlock?'widgets':(PRIM_ICON[t.id]||'article')}</span>
      ${isBlock?'Whole block':esc(BE_NAME[t.id])}
      ${isBlock?'':`<span class="insp-x" onclick="beSel(null)" title="Select the block"><span class="ms">close</span></span>`}</div>
    <div class="insp-actions">
      <select class="insp-sel" onchange="showToast('Preset: '+this.value)"><option>No preset</option><option>Card</option><option>Panel</option><option>Quiet</option></select>
      <button class="insp-ico" data-toast="Style copied"><span class="ms">content_copy</span></button>
      <button class="insp-ico" data-toast="Style pasted"><span class="ms">content_paste</span></button>
      <button class="insp-ico" onclick="beReset()" title="Reset style"><span class="ms">restart_alt</span></button>
    </div>

    ${!isBlock && t.id === 'field' ? `<div class="insp-sec"><div class="insp-h">Merge field</div>
      <div class="insp-row"><label>Field</label><select class="insp-sel" data-c="field">
        ${['Client name','Project name','Tender number','Date','Prepared by'].map(f=>`<option${(t.content.field===f)?' selected':''}>${f}</option>`).join('')}</select></div>
      <div class="fhint">Resolves to the client/project value when a document is generated.</div></div>` : ''}



    <div class="insp-sec"><div class="insp-h">Layout</div>
      <div class="fig-label" style="margin-bottom:6px">Resizing</div>
      <div class="fig-resize">
        <span class="fig-wt" title="Width"><span class="ms">swap_horiz</span>${num('wPx',s.wPx)}</span>
        <select class="insp-sel" data-s="wMode">${[['fill','Fill container'],['fixed','Fixed width'],['min','Min width'],['max','Max width']]
          .map(([v,n])=>`<option value="${v}"${s.wMode===v?' selected':''}>${n}</option>`).join('')}</select></div>
      <div class="fig-resize" style="margin-top:6px">
        <span class="fig-wt" title="Height"><span class="ms">swap_vert</span>${num('hVal',s.hVal)}</span>
        <select class="insp-sel" data-s="hMode">${[['fill','Fill height'],['fixed','Fixed height'],['max','Max height']]
          .map(([v,n])=>`<option value="${v}"${s.hMode===v?' selected':''}>${n}</option>`).join('')}</select></div>
      ${isBlock ? `<div style="display:grid;grid-template-columns:auto 1fr;gap:14px;margin-top:12px;align-items:start">
        <div><div class="fig-label" style="margin-bottom:5px">Alignment</div>
          <div class="fig-align">${['top','middle','bottom'].map(v=>['left','center','right'].map(h=>
            `<button type="button" data-al="${h}|${v}" class="${s.alignH===h&&s.alignV===v?'on':''}" title="${v} ${h}"></button>`).join('')).join('')}</div></div>
        <div><div class="fig-label" style="margin-bottom:5px">Gap</div>
          <span class="fig-wt"><span class="ms">height</span>${num('gap',s.gap,200)}</span></div>
      </div>` : ''}
    </div>

    <div class="insp-sec"><div class="insp-h">Dimension</div>${boxSec('pad','Padding')}</div>

    ${paint(s.bgOn,'fill',s.bg,s.bgA,s.bgVis,s.bgBind,'Fill')}

    <div class="insp-sec"><div class="insp-h">Appearance</div>
      <div class="fig-box">
        <div class="fig-box-head"><span class="fig-label">Corner radius</span>
          <button type="button" class="fig-toggle ${s.radSides?'on':''}" data-sides="rad"><span class="ms">border_outer</span></button></div>
        <div class="fig-hv" ${s.radSides?'hidden':''}>
          <span class="fig-field"><span class="ms fig-ic">rounded_corner</span>${num('rad',s.rad,400)}</span></div>
        <div class="fig-corners" ${s.radSides?'':'hidden'}>
          ${[['radTL',''],['radTR','cn-tr'],['radBR','cn-br'],['radBL','cn-bl']]
            .map(([k,cn])=>`<span class="fig-field"><span class="ms fig-ic ${cn}">rounded_corner</span>${num(k,s[k],400)}</span>`).join('')}</div>
      </div></div>

    ${paint(s.bcOn,'stroke',s.bc,s.bcA,s.bcVis,s.bcBind,'Stroke')}
    ${s.bcOn ? `<div class="fig-resize" style="margin:6px 0 0">
      <span class="fig-wt" title="Weight"><span class="ms">line_weight</span>${num('bw',s.bw,40)}</span>
      <select class="insp-sel" data-s="bpos">${[['inside','Inside'],['center','Center'],['outside','Outside']]
        .map(([v,n])=>`<option value="${v}"${s.bpos===v?' selected':''}>${n}</option>`).join('')}</select></div>` : ''}

    ${!isBlock ? `<div class="insp-sec"><div class="insp-h">Typography</div>
      <div class="fig-resize">
        <span class="fig-wt" title="Size"><span class="ms">format_size</span>${num('fSize',s.fSize,120)}</span>
        <select class="insp-sel" data-s="fWeight">${[['','Inherit'],['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold']]
          .map(([v,n])=>`<option value="${v}"${s.fWeight===v?' selected':''}>${n}</option>`).join('')}</select></div>
      <div class="insp-row stack" style="margin-top:7px"><label>Align</label><span class="segp">
        ${[['','Auto'],['left','Left'],['center','Centre'],['right','Right']].map(([v,n])=>
          `<button class="${(s.fAlign||'')===v?'on':''}" data-falign="${v}">${n}</button>`).join('')}</span></div>
      <div class="insp-row" style="margin-top:7px"><label>Colour</label>
        <input type="color" class="fig-sw" data-s="fColor" value="${s.fColor||'#2E3C3B'}"></div>
    </div>` : ''}

    ${!isBlock ? `<div style="display:flex;gap:8px;margin-top:12px">
      <button class="lbtn sm" style="flex:1" onclick="beDup(${BE.sel})"><span class="ms">content_copy</span> Duplicate</button>
      <button class="lbtn sm" style="flex:1" onclick="beDel(${BE.sel})"><span class="ms">close</span> Remove</button></div>` : ''}
  </div>`;
  beWireInspector(t, s);
}
window.beReset = () => {
  const t = BE.sel == null ? BE.block : BE.block.elements[BE.sel];
  if(BE.sel == null) BE.block.style = beNewBlock().style;
  else t.style = Object.assign({}, BE_EL_STYLE);
  markDirty(BE.block); beCanvas(); beInspector(); showToast('Style reset');
};
function beWireInspector(t, s){
  const root = document.getElementById('beRight');
  const touch = () => { markDirty(BE.block); beCanvas(); };
  root.querySelectorAll('[data-s]').forEach(el => {
    const ev = el.type === 'color' || el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      s[el.dataset.s] = el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
      touch();
      if(el.tagName === 'SELECT' || el.type === 'color') beInspector();
    });
  });
  root.querySelectorAll('[data-sides]').forEach(b => b.addEventListener('click', () => {
    s[b.dataset.sides+'Sides'] = !s[b.dataset.sides+'Sides']; touch(); beInspector();
  }));
  root.querySelectorAll('[data-paint]').forEach(b => b.addEventListener('click', () => {
    s[b.dataset.paint === 'fill' ? 'bgOn' : 'bcOn'] = !s[b.dataset.paint === 'fill' ? 'bgOn' : 'bcOn'];
    touch(); beInspector();
  }));
  root.querySelectorAll('[data-vis]').forEach(b => b.addEventListener('click', () => {
    s[b.dataset.vis] = s[b.dataset.vis] === false; touch(); beInspector();
  }));
  root.querySelectorAll('[data-al]').forEach(b => b.addEventListener('click', () => {
    const [h,v] = b.dataset.al.split('|'); s.alignH = h; s.alignV = v; touch(); beInspector();
  }));
  root.querySelectorAll('[data-falign]').forEach(b => b.addEventListener('click', () => {
    s.fAlign = b.dataset.falign; touch(); beInspector();
  }));
  root.querySelectorAll('[data-c]').forEach(el => el.addEventListener('change', () => {
    t.content[el.dataset.c] = el.value; touch();
  }));
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
