/* ═══ Block Builder ════════════════════════════════════════════════════════
   Ported from tenderfy-admin/block-edit.html. The editor logic below is that
   file's script, kept as close to the original as the client build allows:
   the row/column canvas, drag-and-drop with insertion indicators, DOM-level
   style application, the Figma inspector with scrub handles, undo/redo,
   version history and autosave, and Visual | Code modes.

   Dropped, because they only make sense for a super admin authoring on behalf
   of clients: the client/brand preview picker, the per-element Client
   permission segment, and the publish-to-every-client flow. Everything the
   client needs is kept.                                                      */

/* The palette is built from PRIMITIVES, exactly as the admin editor does. */
const BE_ELEMENTS = ['heading','subheading','paragraph','list','quote','image','table','keyvalue',
                     'signature','divider','spacer','field','callout','stat','button','toc'];
const BE_TAGS = {heading:'Text',subheading:'Text',paragraph:'Text',list:'Text',quote:'Text',callout:'Text',
  image:'Media', table:'Data',keyvalue:'Data',field:'Data',stat:'Data',toc:'Data',
  signature:'Sign-off', divider:'Layout',spacer:'Layout',button:'Layout'};
const BE_NAME = {heading:'Heading',subheading:'Sub-heading',paragraph:'Paragraph',list:'Bulleted list',
  quote:'Quote',image:'Image',table:'Table',keyvalue:'Key / Value',signature:'Signature',divider:'Divider',
  spacer:'Spacer',field:'Merge field',callout:'Callout',stat:'Stat',button:'Button',toc:'Contents'};
const BE_DESC = {heading:'A section heading.',subheading:'A smaller heading.',paragraph:'A block of body text.',
  list:'A bulleted list.',quote:'A pull quote.',image:'An image placeholder.',table:'A simple data table.',
  keyvalue:'Label and value pairs.',signature:'A sign-off block.',divider:'A horizontal rule.',
  spacer:'Vertical space.',field:'A value merged in per client.',callout:'A highlighted note.',
  stat:'A single figure with a label.',button:'A call to action.',toc:'A contents list.'};
const PRIMITIVES = BE_ELEMENTS.map(id => ({id, name:BE_NAME[id], tag:BE_TAGS[id], desc:BE_DESC[id]}));

/* The client has one brand, so colours bind to its own tokens. */
const COLOUR_ROLES = [{key:'primary',label:'Primary'},{key:'secondary',label:'Accent'},{key:'background',label:'Background'}];
function beBrand(){
  return {primary:'#27535C', secondary:'#38988A', background:'#F7F9F8',
          font:'Outfit', bodyFont:'Outfit', company:'Tenderfy Civil'};
}
function roleValue(brand, key){ return (brand || beBrand())[key] || ''; }

const CUSTOM_BLOCK_DEF = {};      // id -> {doc, blockStyle} for blocks built here

const BE_PRESETS = [
  {key:'',label:'Apply a style preset...',st:{}},
  {key:'emphasis',label:'Emphasis',st:{weight:'700',color:'#111827',size:22}},
  {key:'muted',label:'Muted note',st:{color:'#6B7280',size:12}},
  {key:'callout',label:'Callout box',st:{bg:'#F1F6F5',pad:16,rad:10,bw:1,bstyle:'solid',bcolor:'#BFE0D9'}},
  {key:'fineprint',label:'Fine print',st:{size:10,color:'#9AA5A3',lh:15}},
  {key:'accentborder',label:'Accent border',st:{bw:2,bstyle:'solid',bcolor:'#38988A',rad:8,pad:12}},
];
const BE_FIELDS = [
  {key:'client.name',label:'Client name'},{key:'client.industry',label:'Client industry'},
  {key:'project.name',label:'Project name'},{key:'project.ref',label:'Tender reference'},
  {key:'project.value',label:'Contract value'},{key:'date.today',label:"Today's date"},
  {key:'contact.name',label:'Contact name'},
];
function fieldLabel(k){ const f = BE_FIELDS.find(x => x.key === k); return f ? f.label : k; }
function kindOf(id){
  if(id === 'image') return 'image';
  if(id === 'divider') return 'divider';
  if(id === 'spacer') return 'spacer';
  if(id === 'table') return 'table';
  return 'text';
}

let BE = null;
function beNewBlock(){
  return {id:null, name:'New Custom Block', kind:'block', status:'draft', isNew:true, cat:'Text Blocks'};
}

/* ── The editor, one module over the markup copied from block-edit.html ──── */
(function(){
  const ELEMS = Object.fromEntries(PRIMITIVES.map(p => [p.id, p.name]));
  const clone = x => JSON.parse(JSON.stringify(x));

  const elDef = () => ({padH:0,padV:0,padSides:false,padT:0,padR:0,padB:0,padL:0,marH:0,marV:0,marSides:false,marT:0,marR:0,marB:0,marL:0,bg:'',bgBind:'',bgA:100,bgVis:true,font:'',weight:'',size:0,lh:0,color:'',align:'',rad:0,radSides:false,radTL:0,radTR:0,radBR:0,radBL:0,bw:0,bstyle:'solid',bcolor:'#38988a',bcolorBind:'',bcolorA:100,bcolorVis:true,bpos:'inside'});
  const mkEl = pid => { const e = {id:pid, st:elDef()}; if(pid === 'field') e.field = 'client.name'; if(pid === 'image') e.src = 'placeholder'; return e; };
  const normDoc = d => d.map(row => ({cols: row.cols.map(col => col.map(x => typeof x === 'string' ? mkEl(x) : x))}));
  const blockDef = () => ({wmode:'fill', wpx:520, hmode:'fill', hpx:200, alH:'left', alV:'top', padH:0, padV:0, padSides:false, padT:0, padR:0, padB:0, padL:0, marH:0, marV:0, marSides:false, marT:0, marR:0, marB:0, marL:0, sp:8, bg:'', bgBind:'', bgA:100, bgVis:true, rad:0, radSides:false, radTL:0, radTR:0, radBR:0, radBL:0, bw:0, bstyle:'solid', bcolor:'#E2E8E6', bcolorBind:'', bcolorA:100, bcolorVis:true, bpos:'inside'});

  let doc = [], mode = 'visual', drag = null, sel = null, styleClip = null;
  let blockStyle = blockDef();
  let brand = beBrand();

  function boxCss(s,key){ if(!s)return '0px'; if(s[key+'Sides']) return `${s[key+'T']||0}px ${s[key+'R']||0}px ${s[key+'B']||0}px ${s[key+'L']||0}px`; const h=(s[key+'H']!=null)?s[key+'H']:(s[key]||0), v=(s[key+'V']!=null)?s[key+'V']:(s[key]||0); return `${v}px ${h}px`; }
  function radCss(s){ if(s&&s.radSides) return `${s.radTL||0}px ${s.radTR||0}px ${s.radBR||0}px ${s.radBL||0}px`; return `${(s&&s.rad)||0}px`; }
  const radAny = s => !!s && (s.radSides ? (s.radTL||s.radTR||s.radBR||s.radBL) : s.rad>0);
  function paintCss(hex,a){ if(a==null||a>=100||!hex) return hex||''; a=Math.max(0,Math.min(100,a))/100; let h=String(hex).replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); if(isNaN(n)) return hex; return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
  const paintOn = (t,key) => !!(t[key]&&t[key]!=='') || !!(t[key+'Bind']&&t[key+'Bind']!=='none');
  const paintVisible = (t,key) => paintOn(t,key) && t[key+'Vis']!==false;
  const target = () => sel ? doc[sel.r].cols[sel.c][sel.k].st : blockStyle;
  const selEl = () => sel ? doc[sel.r].cols[sel.c][sel.k] : null;

  const page = document.getElementById('page');
  const wrap = document.getElementById('cvWrap');
  const codeArea = document.getElementById('codeArea');
  const codePrev = document.getElementById('codePrev');
  const $ = id => document.getElementById(id);

  // ---- Palette ----
  const byTag = {};
  PRIMITIVES.forEach(p => { (byTag[p.tag] = byTag[p.tag] || []).push(p); });
  let pal = `<div class="pal-tag">Structure</div>`
    + `<div class="vb-widget struct" draggable="true" data-row="2" title="A row with two columns"><span class="ms">view_column</span>2 Columns</div>`
    + `<div class="vb-widget struct" draggable="true" data-row="3" title="A row with three columns"><span class="ms">view_week</span>3 Columns</div>`;
  pal += Object.entries(byTag).map(([tag,ps]) =>
    `<div class="pal-tag">${tag}</div>` +
    ps.map(p => `<div class="vb-widget" draggable="true" data-id="${p.id}" title="${esc(p.desc)}"><span class="ms">${PRIM_ICON[p.id]||'widgets'}</span>${esc(p.name)}</div>`).join('')
  ).join('');
  $('palette').innerHTML = pal;
  document.querySelectorAll('#palette .vb-widget').forEach(w => {
    w.addEventListener('dragstart', e => {
      drag = w.dataset.row ? {kind:'new-row', cols:+w.dataset.row} : {kind:'new-prim', id:w.dataset.id};
      if(e.dataTransfer){ e.dataTransfer.effectAllowed='copy'; e.dataTransfer.setData('text','n'); }
    });
    w.addEventListener('dragend', () => { drag = null; clearInd(); });
    w.addEventListener('click', () => {
      if(w.dataset.row) doc.push({cols:Array.from({length:+w.dataset.row},()=>[])});
      else doc.push({cols:[[mkEl(w.dataset.id)]]});
      sel = null; render(); commit();
    });
  });

  // ---- Render ----
  function elBody(el){
    if(el.id === 'field'){
      return `<span style="background:var(--teal-tint);color:var(--teal);border:1px solid #bfe0d9;border-radius:5px;padding:1px 8px;font-size:12.5px;font-weight:600">{{ ${esc(fieldLabel(el.field))} }}</span>`;
    }
    if(el.id === 'image' && el.src === 'client'){
      return renderPrimitive('image', brand, {src:'client'});
    }
    return renderPrimitive(el.id, brand);
  }
  function elHtml(el,r,c,k){
    const on = sel && sel.r===r && sel.c===c && sel.k===k;
    return `<div class="vb-el${on?' selected':''}" data-r="${r}" data-c="${c}" data-k="${k}">
      <div class="vb-name"><span class="ms" style="font-size:12px">${PRIM_ICON[el.id]||'widgets'}</span>${esc(ELEMS[el.id]||el.id)}</div>
      <div class="vb-tools">
        <span class="tb grab" data-handle title="Drag to move"><span class="ms">drag_indicator</span></span>
        <span class="tb" data-dup title="Duplicate"><span class="ms">content_copy</span></span>
        <span class="tb del" data-del title="Delete"><span class="ms">delete</span></span>
      </div>
      <div class="vb-body">${elBody(el)}</div>
    </div>`;
  }
  function render(){
    if(!doc.length){
      const opts = Object.entries(byTag).map(([tag,ps]) => `<optgroup label="${tag}">${ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
      page.innerHTML = `<div class="vb-empty"><span class="ms big">dashboard_customize</span>Empty block
        <div class="qp"><b>Add your first element</b>
          <div class="fhint" style="width:100%;margin:0 0 3px">Drag elements onto this page from the <strong>Elements</strong> panel, or choose one:</div>
          <select id="emptyAdd" class="fin" style="max-width:280px">
            <option value="">Choose an element...</option>${opts}
          </select>
        </div></div>`;
      $('emptyAdd').addEventListener('change', e => { const v = e.target.value; if(!v) return; doc.push({cols:[[mkEl(v)]]}); sel = {r:0,c:0,k:0}; render(); commit(); });
    } else {
      page.innerHTML = `<div class="vb-block" id="blockWrap">` + doc.map((row,r) => `
        <div class="vb-row" data-r="${r}">
          <div class="vb-rowtools">
            <span class="rb grab" data-rhandle title="Move row"><span class="ms">drag_indicator</span></span>
            <span class="rb" data-addcol title="Add column"><span class="ms">add</span></span>
            <span class="rb" data-delcol title="Remove column"><span class="ms">remove</span></span>
            <span class="rb del" data-delrow title="Delete row"><span class="ms">delete</span></span>
          </div>
          ${row.cols.map((col,c) => `<div class="vb-col" data-r="${r}" data-c="${c}">
              ${col.length ? col.map((el,k) => elHtml(el,r,c,k)).join('') : '<div class="vb-colph"><span class="ms">add</span>Drop element</div>'}
            </div>`).join('')}
        </div>`).join('') + `</div>`;
    }
    const n = doc.reduce((sum,row) => sum + row.cols.reduce((a,col) => a + col.length, 0), 0);
    $('bar-count').textContent = n ? `- ${n} element${n>1?'s':''}` : '';
    wire(); applyAllElStyles(); applyBlockStyle(); applySelection(); syncInspector();
  }

  // ---- Style application ----
  function resolveFill(st){ const bd=st.bgBind; if(!bd) return (st.bg&&st.bg!=='transparent')?st.bg:''; if(bd==='none') return ''; return roleValue(brand, bd); }
  function resolveBColor(st){ const bd=st.bcolorBind; if(!bd) return st.bcolor; return roleValue(brand, bd); }
  function applyBlockStyle(){
    const w = $('blockWrap'); if(!w) return; const bs = blockStyle;
    const wm = bs.wmode;
    w.style.width = wm==='fixed' ? bs.wpx+'px' : '100%';
    w.style.minWidth = wm==='min' ? bs.wpx+'px' : '';
    w.style.maxWidth = wm==='max' ? bs.wpx+'px' : '100%';
    w.style.marginLeft = (wm==='fixed'||wm==='max')?'auto':''; w.style.marginRight = (wm==='fixed'||wm==='max')?'auto':'';
    const hm = bs.hmode||'fill';
    w.style.height = hm==='fixed' ? bs.hpx+'px' : '';
    w.style.maxHeight = hm==='max' ? bs.hpx+'px' : '';
    const HM={left:'flex-start',center:'center',right:'flex-end'}, VM={top:'flex-start',middle:'center',bottom:'flex-end'};
    w.style.alignItems = HM[bs.alH||'left']; w.style.justifyContent = VM[bs.alV||'top'];
    w.style.padding = boxCss(bs,'pad'); w.style.gap = bs.sp+'px';
    if(wm==='fill'){ const f=$('s-wpx'); if(f && document.activeElement!==f) f.value=Math.round(w.getBoundingClientRect().width); }
    const mV = (bs.marV!=null)?bs.marV:(bs.mar||0);
    w.style.marginTop = (bs.marSides?(bs.marT||0):mV)+'px'; w.style.marginBottom = (bs.marSides?(bs.marB||0):mV)+'px';
    w.style.background = paintVisible(bs,'bg') ? (paintCss(resolveFill(bs), bs.bgA)||'') : '';
    w.style.borderRadius = radAny(bs)?radCss(bs):''; w.style.overflow = radAny(bs)?'hidden':'';
    w.style.border='none'; w.style.boxShadow='';
    if(paintVisible(bs,'bcolor') && bs.bw>0){ const col=paintCss(resolveBColor(bs), bs.bcolorA); if(bs.bpos==='inside') w.style.boxShadow=`inset 0 0 0 ${bs.bw}px ${col}`; else w.style.border=`${bs.bw}px ${bs.bstyle} ${col}`; }
    if((bs.hmode||'fill')==='max') w.style.overflowY='auto';
  }
  function applyElStyle(node, st){
    if(!node) return;
    node.style.padding = boxCss(st,'pad'); node.style.margin = boxCss(st,'mar');
    node.style.background = paintVisible(st,'bg') ? (paintCss(resolveFill(st), st.bgA)||'') : '';
    node.style.borderRadius = radAny(st)?radCss(st):''; node.style.overflow = radAny(st)?'hidden':'';
    node.style.border=''; node.style.boxShadow='';
    if(paintVisible(st,'bcolor') && st.bw>0){ const col=paintCss(resolveBColor(st), st.bcolorA); if(st.bpos==='inside') node.style.boxShadow=`inset 0 0 0 ${st.bw}px ${col}`; else node.style.border=`${st.bw}px ${st.bstyle} ${col}`; }
    node.style.textAlign = st.align||'';
    const typo = {};
    if(st.font) typo.fontFamily=`'${st.font}',sans-serif`; if(st.weight) typo.fontWeight=st.weight;
    if(st.size) typo.fontSize=st.size+'px'; if(st.lh) typo.lineHeight=st.lh+'px'; if(st.color) typo.color=st.color;
    [node, ...node.querySelectorAll('h1,h2,h3,h4,h5,p,li,span,a,blockquote,strong,em,td,th,ul,div')].forEach(n=>Object.assign(n.style,typo));
  }
  function elNode(r,c,k){ return page.querySelector(`.vb-el[data-r="${r}"][data-c="${c}"][data-k="${k}"] .vb-body`); }
  function applyAllElStyles(){ doc.forEach((row,r)=>row.cols.forEach((col,c)=>col.forEach((el,k)=>applyElStyle(elNode(r,c,k), el.st)))); }
  function applyActive(){ if(sel){ applyElStyle(elNode(sel.r,sel.c,sel.k), target()); } else { applyBlockStyle(); } }

  function fieldsFor(){
    if(!sel) return new Set(['width','pad','sp','bg','rad','bwstyle','bcolor']);
    switch(kindOf(selEl().id)){
      case 'image':   return new Set(['pad','bg','rad','bwstyle','bcolor']);
      case 'table':   return new Set(['sizelh','color','pad','bg','rad','bwstyle','bcolor']);
      case 'divider': return new Set(['pad','bg']);
      case 'spacer':  return new Set(['pad']);
      default:        return new Set(['font','weight','sizelh','color','align','pad','bg','rad','bwstyle','bcolor']);
    }
  }
  function renderInspector(){
    const allowed = fieldsFor();
    document.querySelectorAll('#styleCard .insp-sec[data-sec]').forEach(sec => {
      let anyRow = false;
      sec.querySelectorAll('.insp-row[data-field]').forEach(row => { const show = allowed.has(row.dataset.field); row.style.display = show?'':'none'; if(show) anyRow = true; });
      const need = (sec.dataset.need||'').split(',').filter(Boolean);
      const needMet = need.length ? need.some(f => allowed.has(f)) : false;
      sec.style.display = (anyRow||needMet)?'':'none';
    });
    const id = sel ? selEl().id : null;
    $('sec-field').style.display = id==='field'?'':'none';
    $('sec-imgsrc').style.display = id==='image'?'':'none';
    $('s-preset').style.display = sel?'':'none';
  }

  function bindNum(numId,key){ const n=$(numId); n.addEventListener('input',()=>{ target()[key]=+n.value||0; applyActive(); commitStyle(); }); }
  const BOX_SIDES=['T','R','B','L'], BOX_AXES=['H','V'];
  const boxClamp = v => Math.max(0,Math.min(200,Math.round(+v||0)));
  const boxGet = (s,k) => s[k]!=null ? s[k] : (s[k.slice(0,3)]||0);
  function figScrub(el, get, set){
    el.addEventListener('pointerdown',e=>{ e.preventDefault(); const x0=e.clientX, v0=+get()||0; try{el.setPointerCapture(e.pointerId);}catch(_){}
      const mv=ev=>set(v0+Math.round((ev.clientX-x0)/2)); const up=()=>{ el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); };
      el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); });
  }
  function fillBoxB(prop){
    const t=target(), ctl=document.querySelector(`#styleCard .fig-box[data-box="${prop}"]`); if(!ctl)return;
    const sm=!!t[prop+'Sides'];
    ctl.querySelector('[data-toggle]').classList.toggle('on', sm);
    ctl.querySelector('.fig-hv').hidden=sm; ctl.querySelector('.fig-cross').hidden=!sm;
    BOX_AXES.forEach(a=>{ const el=$('s-'+prop+a); if(el) el.value=boxGet(t,prop+a); });
    BOX_SIDES.forEach(x=>{ const el=$('s-'+prop+x); if(el) el.value=t[prop+x]||0; });
  }
  function wireBoxB(prop){
    const ctl=document.querySelector(`#styleCard .fig-box[data-box="${prop}"]`); if(!ctl)return;
    BOX_AXES.forEach(a=>{ const inp=$('s-'+prop+a); if(!inp)return;
      inp.addEventListener('input',()=>{ target()[prop+a]=boxClamp(inp.value); applyActive(); commitStyle(); });
      const ic=inp.parentElement.querySelector('.fig-ic'); if(ic) figScrub(ic, ()=>boxGet(target(),prop+a), v=>{ target()[prop+a]=boxClamp(v); inp.value=target()[prop+a]; applyActive(); commitStyle(); });
    });
    BOX_SIDES.forEach(x=>{ const inp=$('s-'+prop+x); if(!inp)return;
      inp.addEventListener('input',()=>{ target()[prop+x]=boxClamp(inp.value); applyActive(); commitStyle(); });
      const ic=inp.parentElement.querySelector('.fig-ic'); if(ic) figScrub(ic, ()=>target()[prop+x]||0, v=>{ target()[prop+x]=boxClamp(v); inp.value=target()[prop+x]; applyActive(); commitStyle(); });
    });
    ctl.querySelector('[data-toggle]').addEventListener('click',()=>{
      const t=target(), sm=!t[prop+'Sides']; t[prop+'Sides']=sm;
      if(sm){ const h=boxGet(t,prop+'H'), v=boxGet(t,prop+'V'); if(!t[prop+'T'])t[prop+'T']=v; if(!t[prop+'B'])t[prop+'B']=v; if(!t[prop+'L'])t[prop+'L']=h; if(!t[prop+'R'])t[prop+'R']=h; }
      else { t[prop+'H']=t[prop+'L']||t[prop+'R']||0; t[prop+'V']=t[prop+'T']||t[prop+'B']||0; }
      fillBoxB(prop); applyActive(); commitStyle();
    });
  }
  const BOX_CORNERS=['TL','TR','BR','BL'];
  const radClamp = v => Math.max(0,Math.min(400,Math.round(+v||0)));
  function fillRadB(){
    const t=target(), ctl=document.querySelector('#styleCard .fig-box[data-box="rad"]'); if(!ctl)return;
    const sm=!!t.radSides;
    ctl.querySelector('[data-toggle]').classList.toggle('on', sm);
    ctl.querySelector('.fig-solo').hidden=sm; ctl.querySelector('.fig-corners').hidden=!sm;
    $('s-rad').value=t.rad||0;
    BOX_CORNERS.forEach(c=>{ const el=$('s-rad'+c); if(el) el.value=t['rad'+c]||0; });
  }
  function wireRadB(){
    const ctl=document.querySelector('#styleCard .fig-box[data-box="rad"]'); if(!ctl)return;
    const uni=$('s-rad');
    uni.addEventListener('input',()=>{ target().rad=radClamp(uni.value); applyActive(); commitStyle(); });
    BOX_CORNERS.forEach(c=>{ const inp=$('s-rad'+c); if(!inp)return; inp.addEventListener('input',()=>{ target()['rad'+c]=radClamp(inp.value); applyActive(); commitStyle(); }); });
    ctl.querySelector('[data-toggle]').addEventListener('click',()=>{
      const t=target(), sm=!t.radSides; t.radSides=sm;
      if(sm) BOX_CORNERS.forEach(c=>{ if(!t['rad'+c]) t['rad'+c]=t.rad||0; });
      else t.rad=Math.max(t.radTL||0,t.radTR||0,t.radBR||0,t.radBL||0);
      fillRadB(); applyActive(); commitStyle();
    });
    const ic=ctl.querySelector('.fig-solo .fig-ic'); if(ic) figScrub(ic, ()=>target().rad||0, v=>{ target().rad=radClamp(v); uni.value=target().rad; applyActive(); commitStyle(); });
  }
  function bindSel(id,key){ const el=$(id); el.addEventListener('change',()=>{ target()[key]=el.value; applyActive(); commitStyle(); }); }
  function bindColor(colId,hexId,key){
    const c=$(colId), h=$(hexId);
    const hasBind=()=>(key==='bg'||key==='bcolor');
    c.addEventListener('input',()=>{ const t=target(); t[key]=c.value; if(hasBind())t[key+'Bind']=''; syncColor2(key); applyActive(); commitStyle(); });
    h.addEventListener('input',()=>{ const v=h.value.trim().replace(/^#/,''); if(/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)){ const t=target(); t[key]='#'+v; if(hasBind())t[key+'Bind']=''; c.value='#'+v; applyActive(); commitStyle(); } });
  }
  const syncColor2 = key => { if(key==='bg'||key==='bcolor') syncColor(key); };
  function syncColor(key){
    const t=target(), sec=document.querySelector(`#styleCard .fig-sec[data-paint="${key}"]`), bind=t[key+'Bind']||'';
    $('s-'+key+'Bind').value=bind;
    const lit=$('s-'+key+'Lit'), note=$('s-'+key+'Note');
    const on=paintOn(t,key), vis=t[key+'Vis']!==false;
    if(sec){ const add=sec.querySelector('[data-add]'); if(add) add.style.display=on?'none':''; }
    if(bind && bind!=='none'){
      lit.style.display='none'; note.style.display=on?'':'none';
      const col = key==='bg'?resolveFill(t):resolveBColor(t);
      note.innerHTML=`<span style="display:inline-block;width:11px;height:11px;border-radius:3px;border:1px solid rgba(0,0,0,.12);background:${col||'transparent'}"></span> Follows your brand`;
    } else {
      lit.style.display=on?'':'none'; note.style.display='none';
      $('s-'+key).value=t[key]||(key==='bg'?'#ffffff':'#38988a');
      $('s-'+key+'H').value=(t[key]||'').replace('#','').toUpperCase();
    }
    const A=$('s-'+key+'A'); if(A) A.value=(t[key+'A']!=null?t[key+'A']:100);
    if(lit){ lit.classList.toggle('off',!vis); const eye=lit.querySelector('[data-eye] .ms'); if(eye) eye.textContent=vis?'visibility':'visibility_off'; }
    if(key==='bcolor'){ const bp=$('s-bpos'); if(bp) bp.value=t.bpos||'inside'; }
  }
  function wirePaintB(key){
    const sec=document.querySelector(`#styleCard .fig-sec[data-paint="${key}"]`); if(!sec) return;
    const A=$('s-'+key+'A'), lit=$('s-'+key+'Lit');
    if(A) A.addEventListener('input',()=>{ target()[key+'A']=Math.max(0,Math.min(100,Math.round(+A.value||0))); applyActive(); commitStyle(); });
    const eye=lit&&lit.querySelector('[data-eye]'); if(eye) eye.addEventListener('click',()=>{ const t=target(); t[key+'Vis']=!(t[key+'Vis']!==false); syncColor(key); applyActive(); commitStyle(); });
    const rm=lit&&lit.querySelector('[data-rm]'); if(rm) rm.addEventListener('click',()=>{ const t=target(); t[key]=''; t[key+'Bind']=''; syncColor(key); applyActive(); commitStyle(); });
    const add=sec.querySelector('[data-add]'); if(add) add.addEventListener('click',()=>{ const t=target(); if(!t[key]) t[key]=(key==='bg'?'#ffffff':'#38988a'); t[key+'Bind']=''; t[key+'Vis']=true; if(key==='bcolor'&&!(t.bw>0)) t.bw=1; syncInspector(); applyActive(); commitStyle(); });
    if(key==='bcolor'){ const bp=$('s-bpos'); if(bp) bp.addEventListener('change',e=>{ target().bpos=e.target.value; applyActive(); commitStyle(); }); }
  }
  function syncInspector(){
    const t=target();
    fillBoxB('pad'); fillBoxB('mar'); fillRadB(); $('s-sp').value=blockStyle.sp||0;
    $('s-size').value=t.size||''; $('s-lh').value=t.lh||''; $('s-bw').value=t.bw||0;
    $('s-font').value=t.font||''; $('s-weight').value=t.weight||''; $('s-bstyle').value=t.bstyle||'solid';
    syncColor('bg'); syncColor('bcolor');
    $('s-color').value=t.color||'#333333'; $('s-colorH').value=t.color||'';
    $('s-align').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.al===(t.align||'')));
    $('s-wmode').value=blockStyle.wmode;
    const wpxEl=$('s-wpx');
    if(blockStyle.wmode==='fill'){ const bw=$('blockWrap'); wpxEl.value=bw?Math.round(bw.getBoundingClientRect().width):blockStyle.wpx; wpxEl.disabled=true; }
    else { wpxEl.value=blockStyle.wpx; wpxEl.disabled=false; }
    $('s-hmode').value=blockStyle.hmode||'fill';
    $('s-hpx').value=blockStyle.hpx||0; $('s-hpx').disabled=((blockStyle.hmode||'fill')==='fill');
    document.querySelectorAll('#s-align3 button').forEach(b=>b.classList.toggle('on', b.dataset.h===(blockStyle.alH||'left') && b.dataset.v===(blockStyle.alV||'top')));
    const e=selEl();
    if(e){ if(e.id==='field') $('s-field').value=e.field;
      document.querySelectorAll('#s-imgsrc button').forEach(b=>b.classList.toggle('on',b.dataset.src===(e.src||'placeholder'))); }
    $('s-preset').value='';
    $('s-paste').disabled=!styleClip;
    const stt=$('styleTarget');
    stt.innerHTML = sel ? `<span class="ms">check_circle</span> Editing: ${esc(ELEMS[selEl().id]||'element')}`
                        : `<span class="ms" style="color:var(--light)">dashboard</span> Editing: whole block`;
    renderInspector();
  }
  function initStyle(){
    $('s-font').innerHTML='<option value="">Inherit from brand</option>'+['Outfit','Inter','Poppins','Lora','Roboto'].map(f=>`<option>${f}</option>`).join('');
    const colOpts=COLOUR_ROLES.map(r=>`<option value="${r.key}">Brand - ${r.label}</option>`).join('');
    $('s-bgBind').innerHTML=`<option value="">Custom colour</option>${colOpts}<option value="none">None (transparent)</option>`;
    $('s-bcolorBind').innerHTML=`<option value="">Custom colour</option>${colOpts}`;
    $('s-field').innerHTML=BE_FIELDS.map(f=>`<option value="${f.key}">${esc(f.label)}</option>`).join('');
    $('s-preset').innerHTML=BE_PRESETS.map(p=>`<option value="${p.key}">${esc(p.label)}</option>`).join('');
    wireBoxB('pad'); wireBoxB('mar'); wireRadB();
    $('s-sp').addEventListener('input',e=>{ blockStyle.sp=Math.max(0,Math.min(200,Math.round(+e.target.value||0))); applyActive(); commitStyle(); });
    bindNum('s-size','size'); bindNum('s-lh','lh'); bindNum('s-bw','bw');
    bindSel('s-font','font'); bindSel('s-weight','weight'); bindSel('s-bstyle','bstyle');
    bindColor('s-bg','s-bgH','bg'); bindColor('s-color','s-colorH','color'); bindColor('s-bcolor','s-bcolorH','bcolor');
    $('s-bgBind').addEventListener('change',e=>{ target().bgBind=e.target.value; applyActive(); syncInspector(); commitStyle(); });
    $('s-bcolorBind').addEventListener('change',e=>{ target().bcolorBind=e.target.value; applyActive(); syncInspector(); commitStyle(); });
    wirePaintB('bg'); wirePaintB('bcolor');
    $('s-align').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ target().align=b.dataset.al; $('s-align').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); applyActive(); commitStyle(); }));
    $('s-wmode').addEventListener('change',e=>{ const prev=blockStyle.wmode; blockStyle.wmode=e.target.value;
      if(prev==='fill' && e.target.value!=='fill'){ const bw=$('blockWrap'); if(bw) blockStyle.wpx=Math.round(bw.getBoundingClientRect().width); }
      applyActive(); syncInspector(); commitStyle(); });
    $('s-wpx').addEventListener('input',e=>{ blockStyle.wpx=+e.target.value||0; applyActive(); commitStyle(); });
    $('s-hmode').addEventListener('change',e=>{ blockStyle.hmode=e.target.value; $('s-hpx').disabled=(blockStyle.hmode==='fill'); applyActive(); commitStyle(); });
    $('s-hpx').addEventListener('input',e=>{ blockStyle.hpx=+e.target.value||0; applyActive(); commitStyle(); });
    document.querySelectorAll('#s-align3 button').forEach(b=>b.addEventListener('click',()=>{ blockStyle.alH=b.dataset.h; blockStyle.alV=b.dataset.v; document.querySelectorAll('#s-align3 button').forEach(x=>x.classList.toggle('on',x===b)); applyActive(); commitStyle(); }));
    $('s-field').addEventListener('change',e=>{ if(selEl()){ selEl().field=e.target.value; render(); commit(); } });
    document.querySelectorAll('#s-imgsrc button').forEach(b=>b.addEventListener('click',()=>{ if(selEl()){ selEl().src=b.dataset.src; render(); commit(); } }));
    $('s-preset').addEventListener('change',e=>{ const p=BE_PRESETS.find(x=>x.key===e.target.value); if(p&&p.key){ Object.assign(target(), p.st); if('bg' in p.st) target().bgBind=''; if('bcolor' in p.st) target().bcolorBind=''; applyActive(); syncInspector(); commit(); showToast('Applied preset: '+p.label); } });
    $('s-copy').addEventListener('click',()=>{ styleClip=clone(target()); $('s-paste').disabled=false; showToast('Style copied'); });
    $('s-paste').addEventListener('click',()=>{ if(!styleClip) return; Object.assign(target(), clone(styleClip)); applyActive(); syncInspector(); commit(); showToast('Style pasted'); });
    $('s-reset').addEventListener('click',()=>{ if(sel){ selEl().st=elDef(); } else { Object.assign(blockStyle, blockDef()); } applyActive(); render(); commit(); showToast('Style reset'); });
  }

  // ---- Selection ----
  function selectEl(r,c,k){ sel={r,c,k}; applySelection(); syncInspector(); }
  function applySelection(){
    page.querySelectorAll('.vb-el.selected').forEach(e=>e.classList.remove('selected'));
    if(sel){ const node=page.querySelector(`.vb-el[data-r="${sel.r}"][data-c="${sel.c}"][data-k="${sel.k}"]`); if(node) node.classList.add('selected'); else sel=null; }
    renderPill();
  }
  function renderPill(){
    const el=$('selPill');
    if(!sel){ el.className='sel-pill'; el.innerHTML='<span class="ms">dashboard</span> Whole block'; return; }
    const it=selEl(); el.className='sel-pill on';
    el.innerHTML=`<span class="ms">${PRIM_ICON[it.id]||'widgets'}</span> ${esc(ELEMS[it.id]||it.id)} <span class="ms x" data-selclear title="Edit whole block">close</span>`;
  }
  $('selPill').addEventListener('click',e=>{ if(e.target.closest('[data-selclear]')){ sel=null; applySelection(); syncInspector(); } });
  page.addEventListener('click',e=>{ if(!e.target.closest('.vb-el')){ sel=null; applySelection(); syncInspector(); } });

  function wire(){
    page.querySelectorAll('.vb-el').forEach(el=>{
      const r=+el.dataset.r,c=+el.dataset.c,k=+el.dataset.k;
      el.addEventListener('click',e=>{ if(e.target.closest('[data-handle],[data-dup],[data-del]'))return; e.stopPropagation(); selectEl(r,c,k); });
      el.querySelector('[data-del]').addEventListener('click',e=>{e.stopPropagation();doc[r].cols[c].splice(k,1);cleanup();sel=null;render();commit();});
      el.querySelector('[data-dup]').addEventListener('click',e=>{e.stopPropagation();doc[r].cols[c].splice(k+1,0,clone(doc[r].cols[c][k]));sel=null;render();commit();});
      const h=el.querySelector('[data-handle]');
      h.addEventListener('mousedown',()=>{el.draggable=true;});
      el.addEventListener('mouseup',()=>{el.draggable=false;});
      el.addEventListener('dragstart',e=>{drag={kind:'move-prim',r,c,k};if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text','m');}el.classList.add('dragging');});
      el.addEventListener('dragend',()=>{el.draggable=false;el.classList.remove('dragging');clearInd();drag=null;});
    });
    page.querySelectorAll('.vb-row').forEach(rowEl=>{
      const r=+rowEl.dataset.r;
      rowEl.querySelector('[data-addcol]').addEventListener('click',e=>{e.stopPropagation();if(doc[r].cols.length<3){doc[r].cols.push([]);sel=null;render();commit();}else showToast('A row can have up to 3 columns');});
      rowEl.querySelector('[data-delcol]').addEventListener('click',e=>{e.stopPropagation();if(doc[r].cols.length>1){const last=doc[r].cols.pop();if(last.length)doc[r].cols[doc[r].cols.length-1].push(...last);sel=null;render();commit();}else showToast('A row needs at least one column');});
      rowEl.querySelector('[data-delrow]').addEventListener('click',e=>{e.stopPropagation();doc.splice(r,1);sel=null;render();commit();});
      const rh=rowEl.querySelector('[data-rhandle]');
      rh.addEventListener('mousedown',()=>{rowEl.draggable=true;});
      rowEl.addEventListener('mouseup',()=>{rowEl.draggable=false;});
      rowEl.addEventListener('dragstart',e=>{if(!rowEl.draggable)return;e.stopPropagation();drag={kind:'move-row',r};if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text','r');}});
      rowEl.addEventListener('dragend',()=>{rowEl.draggable=false;clearInd();drag=null;});
    });
  }
  function cleanup(){ doc = doc.filter(row => !(row.cols.length===1 && row.cols[0].length===0)); }
  function pluck(d){ const el=doc[d.r].cols[d.c][d.k]; doc[d.r].cols[d.c].splice(d.k,1); return el; }
  function clearInd(){
    page.querySelectorAll('.ins-before').forEach(e=>e.classList.remove('ins-before'));
    page.querySelectorAll('.vb-col.over,.vb-col.ins-end').forEach(e=>e.classList.remove('over','ins-end'));
    page.querySelectorAll('.row-ins-before').forEach(e=>e.classList.remove('row-ins-before'));
    const bw=$('blockWrap'); if(bw) bw.classList.remove('drop-end');
    page.classList.remove('drop-active');
  }
  function rowIndexFromY(y){ const rows=[...page.querySelectorAll('.vb-row')]; for(let i=0;i<rows.length;i++){ const b=rows[i].getBoundingClientRect(); if(y<b.top+b.height/2) return i; } return rows.length; }
  function colIndexFromY(col,y){ const els=[...col.querySelectorAll(':scope > .vb-el')]; for(let i=0;i<els.length;i++){ const b=els[i].getBoundingClientRect(); if(y<b.top+b.height/2) return i; } return els.length; }

  wrap.addEventListener('dragover',e=>{
    if(!drag) return; e.preventDefault();
    const overCol = e.target.closest && e.target.closest('.vb-col');
    const rowMode = drag.kind==='new-row' || drag.kind==='move-row' || !overCol;
    if(e.dataTransfer) e.dataTransfer.dropEffect = drag.kind==='new-prim'?'copy':'move';
    clearInd();
    if(rowMode){ const ri=rowIndexFromY(e.clientY); const rows=[...page.querySelectorAll('.vb-row')]; if(ri<rows.length) rows[ri].classList.add('row-ins-before'); else { const bw=$('blockWrap'); if(bw) bw.classList.add('drop-end'); else page.classList.add('drop-active'); } }
    else { overCol.classList.add('over'); const ki=colIndexFromY(overCol,e.clientY); const els=[...overCol.querySelectorAll(':scope > .vb-el')]; if(ki<els.length) els[ki].classList.add('ins-before'); else overCol.classList.add('ins-end'); }
  });
  wrap.addEventListener('dragleave',e=>{ if(!wrap.contains(e.relatedTarget)) clearInd(); });
  wrap.addEventListener('drop',e=>{
    if(!drag) return; e.preventDefault();
    const overCol = e.target.closest && e.target.closest('.vb-col');
    const rowMode = drag.kind==='new-row' || drag.kind==='move-row' || !overCol;
    if(rowMode){
      const ri=rowIndexFromY(e.clientY);
      if(drag.kind==='new-row'){ doc.splice(ri,0,{cols:Array.from({length:drag.cols},()=>[])}); }
      else if(drag.kind==='move-row'){ let to=ri; const [m]=doc.splice(drag.r,1); if(drag.r<to)to--; doc.splice(to,0,m); }
      else { const item = drag.kind==='new-prim'?mkEl(drag.id):pluck(drag); doc.splice(ri,0,{cols:[[item]]}); }
    } else {
      const r=+overCol.dataset.r, c=+overCol.dataset.c; let ki=colIndexFromY(overCol,e.clientY);
      if(drag.kind==='new-prim'){ doc[r].cols[c].splice(ki,0,mkEl(drag.id)); }
      else { if(drag.r===r && drag.c===c && drag.k<ki) ki--; const item=pluck(drag); doc[r].cols[c].splice(ki,0,item); }
    }
    cleanup(); clearInd(); drag=null; sel=null; render(); commit();
  });

  // ---- Code mode ----
  function docToHtml(){
    if(!doc.length) return '<!-- Empty block -->';
    const one = el => el.id==='field' ? `{{${el.field}}}` : renderPrimitive(el.id, brand);
    return doc.map(row=>{
      if(row.cols.length===1){ return row.cols[0].map(one).join('\n'); }
      const cols=row.cols.map(col=>`  <div style="flex:1">\n    ${col.map(one).join('\n    ')}\n  </div>`).join('\n');
      return `<div style="display:flex;gap:24px">\n${cols}\n</div>`;
    }).join('\n\n');
  }
  function renderCode(){ codePrev.innerHTML = codeArea.value.trim() || '<div style="color:#9aa5a3;text-align:center;padding:50px 0">Preview appears as you type</div>'; }
  codeArea.addEventListener('input',()=>{ renderCode(); markDirty(BE.block); autosave(); });
  $('genBtn').addEventListener('click',()=>{ codeArea.value=docToHtml(); renderCode(); markDirty(BE.block); showToast('Generated code from the visual layout'); });
  function setMode(m){
    if(m===mode) return; mode=m;
    document.querySelectorAll('#be .vb-modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
    $('elementsCard').style.display = m==='visual'?'':'none';
    $('codeCard').style.display     = m==='code'?'':'none';
    $('visualPanel').style.display  = m==='visual'?'':'none';
    $('codePanel').style.display    = m==='code'?'':'none';
    $('styleCard').style.display    = m==='visual'?'':'none';
  }
  document.querySelectorAll('#be .vb-modes button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));

  // ---- Undo / redo / history / autosave ----
  let history=[], hidx=-1, restoring=false, autoT=null, styleT=null;
  const snap = () => JSON.stringify({doc, blockStyle, code:codeArea.value});
  function pushHist(){ if(restoring) return; history=history.slice(0,hidx+1); history.push(snap()); if(history.length>60) history.shift(); hidx=history.length-1; updateHistBtns(); }
  function commit(){ if(BE) markDirty(BE.block); pushHist(); autosave(); }
  function commitStyle(){ clearTimeout(styleT); styleT=setTimeout(commit,350); }
  function updateHistBtns(){ $('undoBtn').disabled=hidx<=0; $('redoBtn').disabled=hidx>=history.length-1; }
  function restore(){ restoring=true; const s=JSON.parse(history[hidx]); doc=s.doc; blockStyle=s.blockStyle; codeArea.value=s.code||''; sel=null; render(); renderCode(); restoring=false; updateHistBtns(); autosave(); }
  function undo(){ if(hidx>0){ hidx--; restore(); } }
  function redo(){ if(hidx<history.length-1){ hidx++; restore(); } }
  $('undoBtn').addEventListener('click',undo);
  $('redoBtn').addEventListener('click',redo);
  document.addEventListener('keydown',e=>{
    if(!BE || !(e.metaKey||e.ctrlKey)) return;
    const k=e.key.toLowerCase();
    if(k==='z' && !e.shiftKey){ e.preventDefault(); undo(); }
    else if(k==='y' || (k==='z' && e.shiftKey)){ e.preventDefault(); redo(); }
  });
  function stamp(){ const t=new Date(); return t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
  function autosave(){ clearTimeout(autoT); autoT=setTimeout(()=>{
    try{ localStorage.setItem(dkey(), JSON.stringify({doc, blockStyle, code:codeArea.value})); }catch(e){}
    $('autosave').innerHTML=`<span class="ms">cloud_done</span> Autosaved - ${stamp()}`; },600); }
  const vkey = () => 'tf_bver_' + ((BE && BE.block.id) || 'new');
  const dkey = () => 'tf_bdraft_' + ((BE && BE.block.id) || 'new');
  function loadVersions(){ try{ return JSON.parse(localStorage.getItem(vkey()))||[]; }catch(e){ return []; } }
  function saveVersion(label){ const v=loadVersions(); v.unshift({ts:new Date().toISOString(), label, doc:clone(doc), blockStyle:clone(blockStyle)});
    try{ localStorage.setItem(vkey(), JSON.stringify(v.slice(0,10))); }catch(e){} }
  function renderVersions(){
    const v=loadVersions();
    $('verList').innerHTML = v.length ? v.map((x,i)=>`<div class="ver-row">
        <span class="vv">v${v.length-i}</span>
        <span class="vi"><div class="vt">${esc(x.label||'Saved')}</div><div class="vm">${new Date(x.ts).toLocaleString()}</div></span>
        <button class="lbtn sm" data-restore="${i}">Restore</button></div>`).join('')
      : '<div class="ver-empty">No saved versions yet.</div>';
    $('verList').querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>{
      const x=loadVersions()[+b.dataset.restore]; if(!x) return;
      doc=clone(x.doc); blockStyle=clone(x.blockStyle); sel=null; render(); commit();
      verClose(); showToast('Restored ' + (x.label||'a saved version'));
    }));
    $('verOv').classList.add('open');
  }
  $('histBtn').addEventListener('click',renderVersions);
  window.verClose = () => $('verOv').classList.remove('open');

  // ---- Responsive panels ----
  const ed3 = document.querySelector('#be .ed3');
  $('elBtn').addEventListener('click',function(){ this.classList.toggle('on', ed3.classList.toggle('el-on')); });
  $('styleBtn').addEventListener('click',function(){ this.classList.toggle('on', ed3.classList.toggle('st-on')); });

  // ---- Open / save ----
  window.beOpen = block => {
    BE = {block: block || beNewBlock()};
    const def = BE.block.id && CUSTOM_BLOCK_DEF[BE.block.id];
    doc = def ? normDoc(clone(def.doc)) : (BE.block.seed ? normDoc(clone(BE.block.seed)) : []);
    blockStyle = def && def.blockStyle ? Object.assign(blockDef(), def.blockStyle) : blockDef();
    codeArea.value = (def && def.code) || '';
    sel = null; styleClip = null; history = []; hidx = -1;
    setMode('visual');
    document.querySelectorAll('#be .vb-modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode==='visual'));
    $('bar-name').textContent = BE.block.name;
    $('autosave').textContent = '';
    document.getElementById('be').classList.add('open');
    render(); renderCode(); pushHist();
    beHead();
  };
  window.beClose = () => { document.getElementById('be').classList.remove('open'); clearTimeout(autoT); BE = null; };
  window.beExit = () => exitEditor(BE.block, null, () => { beClose(); go('/file-manager/block-library'); }, window.beSave);
  window.beSave = () => {
    const b = BE.block;
    const n = doc.reduce((s,row)=>s+row.cols.reduce((a,c)=>a+c.length,0),0);
    if(!n && !codeArea.value.trim()){ showToast('Add at least one element before saving'); return; }
    const id = b.id || ('cx-' + Date.now().toString(36));
    b.id = id;
    // P2DOC keeps the row/column shape so every palette and preview renders it.
    P2DOC[id] = doc.map(row => ({cols: row.cols.map(col => col.map(el => el.id))}));
    CUSTOM_BLOCK_DEF[id] = {doc: clone(doc), blockStyle: clone(blockStyle), code: codeArea.value};
    const entry = {id, name:b.name, label:b.name, cat:b.cat, p:id, kind:'block', custom:true};
    const at = BLOCKS.findIndex(x => x.id === id);
    if(at >= 0) BLOCKS[at] = entry; else BLOCKS.push(entry);
    BLOCK_BY_ID[id] = entry;
    saveVersion('Saved ' + b.name);
    b.dirty = false;
    beClose();
    if(currentPath() === '/file-manager/block-library') renderRoute();
    else go('/file-manager/block-library');
    showToast('Saved block - ' + b.name + ' - now available in every builder');
  };
  window.beRenderAll = () => { render(); syncInspector(); };

  /* Renders a saved block outside the editor - the palettes, the Document
     Builder and every preview go through here, so a custom block looks the
     same everywhere. Mirrors applyBlockStyle / applyElStyle as CSS strings. */
  window.customBlockHtml = (def, br, content) => {
    br = br || beBrand();
    const bs = Object.assign(blockDef(), def.blockStyle || {});
    const fill = st => { const bd = st.bgBind; if(!bd) return (st.bg && st.bg !== 'transparent') ? st.bg : ''; if(bd === 'none') return ''; return roleValue(br, bd); };
    const bcol = st => { const bd = st.bcolorBind; return bd ? roleValue(br, bd) : st.bcolor; };
    const strokeCss = st => {
      if(!(paintOn(st,'bcolor') && st.bcolorVis !== false && st.bw > 0)) return '';
      const col = paintCss(bcol(st), st.bcolorA);
      return st.bpos === 'inside' ? `box-shadow:inset 0 0 0 ${st.bw}px ${col};` : `border:${st.bw}px ${st.bstyle} ${col};`;
    };
    const HM = {left:'flex-start',center:'center',right:'flex-end'}, VM = {top:'flex-start',middle:'center',bottom:'flex-end'};
    let css = `display:flex;flex-direction:column;gap:${bs.sp||0}px;align-items:${HM[bs.alH||'left']};justify-content:${VM[bs.alV||'top']};`
      + `padding:${boxCss(bs,'pad')};border-radius:${radCss(bs)};`
      + (bs.wmode === 'fixed' && bs.wpx ? `width:${bs.wpx}px;margin:0 auto;` : 'width:100%;')
      + (paintVisible(bs,'bg') ? `background:${paintCss(fill(bs), bs.bgA)};` : '')
      + strokeCss(bs) + (radAny(bs) ? 'overflow:hidden;' : '');
    let n = -1;
    const one = el => {
      n++;
      const st = el.st || elDef();
      const typo = (st.font ? `font-family:'${st.font}',sans-serif;` : '') + (st.weight ? `font-weight:${st.weight};` : '')
        + (st.size ? `font-size:${st.size}px;` : '') + (st.lh ? `line-height:${st.lh}px;` : '')
        + (st.color ? `color:${st.color};` : '') + (st.align ? `text-align:${st.align};` : '');
      const box = `padding:${boxCss(st,'pad')};margin:${boxCss(st,'mar')};border-radius:${radCss(st)};`
        + (paintVisible(st,'bg') ? `background:${paintCss(fill(st), st.bgA)};` : '') + strokeCss(st)
        + (radAny(st) ? 'overflow:hidden;' : '');
      const body = el.id === 'field'
        ? `<span style="background:var(--teal-tint);color:var(--teal);border:1px solid #bfe0d9;border-radius:5px;padding:1px 8px;font-size:12.5px;font-weight:600">{{ ${esc(fieldLabel(el.field))} }}</span>`
        : renderPrimitive(el.id, br, (content||{})[n] || (el.id === 'image' && el.src === 'client' ? {src:'client'} : undefined));
      return `<span class="dp" data-pi="${n}" style="${box}${typo}">${body}</span>`;
    };
    const rows = (def.doc || []).map(row => row.cols.length > 1
      ? `<div style="display:flex;gap:24px;width:100%">${row.cols.map(col=>`<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:11px">${col.map(one).join('')}</div>`).join('')}</div>`
      : `<div style="width:100%;display:flex;flex-direction:column;gap:11px">${row.cols[0].map(one).join('')}</div>`).join('');
    return `<div style="${css}">${rows}</div>`;
  };

  function beHead(){
    document.getElementById('beHead').innerHTML = edHeadHtml({
      doc: BE.block, mode:'block', sub:"Build visually or in code. Rendered in your brand.",
      exit:'beExit()', save:'beSave()', saveLabel:'Save Block',
      rename:"BE.block.name=this.value;markDirty(BE.block);var b=document.getElementById('bar-name');if(b)b.textContent=this.value",
      extras:`<button class="lbtn icon-sm" data-toast="Block details - name and category" title="Details"><span class="ms">tune</span></button>`,
    });
  }

  initStyle();
})();

// Open an existing block for editing. Built-ins open as a starting point.
window.beOpenExisting = id => {
  const b = BLOCK_BY_ID[id];
  if(!b) return;
  if(CUSTOM_BLOCK_DEF[id]){ beOpen(Object.assign(beNewBlock(), {id, name:b.name, cat:b.cat, isNew:false})); return; }
  beOpen(Object.assign(beNewBlock(), {name:b.name, cat:b.cat, seed: JSON.parse(JSON.stringify(P2DOC[b.p] || [{cols:[[b.p]]}]))}));
  showToast('Editing a copy of "' + b.name + '"');
};
