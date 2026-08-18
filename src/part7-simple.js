/* ═══ Simple mode — what the live app offers today ═════════════════════════
   Read from stgbusinessadmin.tenderfy.org:
     Resume      -> template chooser, then a form (Basic Information, Summary,
                    Qualifications, Awards, Skills, Work Experience) + live preview
     Case study  -> "Create from Template" / "Create your own", then a single
                    column canvas with "+" bars and an Add Block dialog whose
                    tabs are All / Title / Text / Images / Image & Text
     Cover page  -> Edit Cover Style (font + background + text colour)
   Advanced mode is the Document Builder. The toggle sits in both headers.     */

// The block set the live Add Block dialog offers, in its order and naming.
const SIMPLE_BLOCKS = [
  {id:'heading',    live:'Heading',              tab:'Title Blocks'},
  {id:'subheading', live:'Sub-Heading',          tab:'Title Blocks'},
  {id:'paragraph',  live:'Paragraph',            tab:'Text Blocks'},
  {id:'double',     live:'Double Paragraph',     tab:'Text Blocks'},
  {id:'headpara',   live:'Heading & Paragraph',  tab:'Text Blocks'},
  {id:'parahead',   live:'Paragraph & Heading',  tab:'Text Blocks'},
  {id:'img1',       live:'Single Image',         tab:'Images'},
  {id:'img2',       live:'Double Images',        tab:'Images'},
  {id:'img3',       live:'Triple Images',        tab:'Images'},
  {id:'textimg',    live:'Paragraph & Image',    tab:'Image & Text'},
  {id:'imgtext',    live:'Image & Paragraph',    tab:'Image & Text'},
  {id:'headimg',    live:'Heading on Image',     tab:'Image & Text'},
];
const SIMPLE_TABS = ['All Blocks','Title Blocks','Text Blocks','Images','Image & Text'];

// Resume templates offered by the live chooser.
const RESUME_TEMPLATES = [
  {id:'bielby', name:'Bielby',                 primary:'#1F2A2E', accent:'#B4D33B'},
  {id:'landlink',name:'Landlink',              primary:'#2F5D50', accent:'#8CC63F'},
  {id:'eiwa',   name:'Eiwa',                   primary:'#3B4A5A', accent:'#E8A33D'},
  {id:'pirotta',name:'Pirotta',                primary:'#2E7A5F', accent:'#C0392B'},
  {id:'t3',     name:'Template - 3',           primary:'#27535C', accent:'#38988A'},
  {id:'evolve', name:'Evolve Housing',         primary:'#123C6B', accent:'#F2A03D'},
  {id:'t8',     name:'Template-8_Non-Profits', primary:'#5C4B8A', accent:'#F4C445'},
  {id:'fletch', name:'Fletch',                 primary:'#33413F', accent:'#6ADDB5'},
  {id:'jwbs',   name:'Jwbs',                   primary:'#1B3A5C', accent:'#4FA3D1'},
  {id:'cpm',    name:'CPM',                    primary:'#4A2E2E', accent:'#D98A3A'},
];

/* A document's Simple-mode data. Resumes keep a form; case studies and pages
   share `items` with Advanced, so nothing is lost switching between them. */
function ensureForm(doc){
  if(doc.form) return doc.form;
  const d = RESUME_DATA;
  doc.form = {
    template:'bielby',
    name: doc.name && doc.name !== 'Untitled Resume' ? doc.name : '',
    role:'', phone:'', email:'', linkedin:'',
    summary:'', quals:[], awards:[], skills:[], jobs:[],
  };
  return doc.form;
}
// Rebuild the block composition from the Simple form — deterministic.
function formToItems(f){
  const it = [];
  it.push(docItem('block','headpara', {0:{title:f.name||'Full name'}, 1:{body:f.role||'Job title'}},
    {bgOn:true, bg:'#F7F9F8', padH:20, padV:18, rad:10}));
  const contact = [['Phone',f.phone],['Email',f.email],['Linkedin',f.linkedin]].filter(p=>p[1]);
  if(contact.length) it.push(docItem('block','doc-details', {0:{title:'Contact'}, 1:{pairs:contact}}));
  if(f.summary) it.push(docItem('block','doc-para', {0:{title:'Summary'}, 1:{body:f.summary}}));
  if(f.quals.length){ it.push(docItem('element','heading', {0:{title:'Qualifications'}}));
    it.push(docItem('element','list', {0:{items:f.quals}})); }
  if(f.awards.length){ it.push(docItem('element','heading', {0:{title:'Awards and Achievements'}}));
    it.push(docItem('element','list', {0:{items:f.awards}})); }
  if(f.skills.length){ it.push(docItem('element','heading', {0:{title:'Skills'}}));
    it.push(docItem('element','list', {0:{items:f.skills}})); }
  if(f.jobs.length){
    it.push(docItem('element','heading', {0:{title:'Work Experience'}}));
    f.jobs.forEach(j => it.push(docItem('block','headpara',
      {0:{title:(j.title||'Role') + (j.company?' - '+j.company:'')}, 1:{body:(j.dates?j.dates+' - ':'')+(j.detail||'')}}, {marV:4})));
  }
  return it;
}

/* ── Simple mode shell ───────────────────────────────────────────────────── */
let SM = null;
function smOpen(cfg){
  SM = {doc: cfg.doc, onSave: cfg.onSave, backRoute: cfg.backRoute, addAt: null, addSel: null, addTab: 'All Blocks'};
  document.getElementById('sm').classList.add('open');
  smRender();
}
window.smClose = () => { document.getElementById('sm').classList.remove('open'); SM = null; };
window.smSave = () => {
  const d = SM.doc, cb = SM.onSave, back = SM.backRoute;
  d.dirty = false; smClose();
  if(cb) cb(d); else if(back) go(back);
  showToast('Saved - ' + d.name);
};
// Leaving the editor: always land back on the list, and never drop edits silently.
window.smExit = () => exitEditor(SM.doc, SM.backRoute, () => { smClose(); }, window.smSave);
// Hand the same document to the Document Builder (not an exit — no guard).
window.smToAdvanced = () => {
  const d = SM.doc, cb = SM.onSave, back = SM.backRoute;
  if(d.kind === 'resume' && !d.customised) d.items = formToItems(ensureForm(d));
  smClose();
  dbOpen({doc:d, backRoute:back, backLabel:'Cancel', sub:advSubFor(d), onSave:cb});
};

/* ── Unsaved-changes guard ───────────────────────────────────────────────────
   Closing an editor returns to the list it was opened from. If the document was
   touched, ask first rather than discarding quietly. */
let __exit = null;
function exitEditor(doc, backRoute, close, save){
  if(!doc || !doc.dirty){ close(); if(backRoute) go(backRoute); return; }
  __exit = {doc, backRoute, close, save};
  document.getElementById('exitName').textContent = doc.name || 'this document';
  document.getElementById('exitOv').classList.add('open');
}
window.exitKeep = () => { document.getElementById('exitOv').classList.remove('open'); __exit = null; };
window.exitDiscard = () => {
  const e = __exit; document.getElementById('exitOv').classList.remove('open'); __exit = null;
  e.doc.dirty = false; e.close(); if(e.backRoute) go(e.backRoute);
  showToast('Changes discarded');
};
window.exitSave = () => {
  const e = __exit; document.getElementById('exitOv').classList.remove('open'); __exit = null;
  e.save();
};
// Any edit marks the document dirty.
function markDirty(doc){ if(doc) doc.dirty = true; }
function advSubFor(d){
  return d.kind === 'resume'
    ? 'Advanced - the same resume as blocks. Structure and style each one; switching back to Simple rebuilds from the form.'
    : 'Advanced - style each block, set its content, and preview with the client brand.';
}
function smToggle(active){
  if(active === 'block') return '';   // the block editor has no Simple counterpart
  return `<span class="modesw">
    <button class="${active==='simple'?'on':''}" ${active==='simple'?'':'onclick="dbToSimpleMode()"'}><span class="ms">edit_note</span> Simple</button>
    <button class="${active==='advanced'?'on':''}" ${active==='advanced'?'':'onclick="smToAdvanced()"'}><span class="ms">dashboard_customize</span> Advanced</button>
  </span>`;
}
window.smToggle = smToggle;

function smRender(){
  const d = SM.doc;
  const isResume = d.kind === 'resume';
  document.getElementById('smHead').innerHTML = edHeadHtml({
    doc: d, mode:'simple', sub: SM.sub || (isResume
      ? 'Fill in the details and pick a template - the preview updates as you type.'
      : 'Add blocks to build the document. Switch to Advanced to style each one.'),
    exit:'smExit()', save:'smSave()',
    rename:'SM.doc.name=this.value;markDirty(SM.doc)',
  });
  document.getElementById('smBody').innerHTML = isResume ? smResumeHtml() : smBlocksHtml();
  smSidePanels(isResume);
  if(isResume) smWireResume(); else smWireBlocks();
}

/* ── Resume: the live form + live preview ────────────────────────────────── */
function smResumeHtml(){
  const f = ensureForm(SM.doc);
  const card = (title, body, extra) => `<div class="sm-card"><div class="sm-h">${title}${extra||''}</div><div class="sm-b">${body}</div></div>`;
  const fld = (ph, key, half) => `<div class="sm-fld${half?' half':''}"><input class="sm-in" placeholder="${esc(ph)}" data-f="${key}" value="${esc(f[key]||'')}"><label>${esc(ph)}</label></div>`;
  const repeat = (key, addLabel, cols) => `
    <div id="rep-${key}">${(f[key]||[]).map((v,i)=>`
      <div class="sm-rep">
        ${cols ? cols.map(c=>`<input class="sm-in" placeholder="${esc(c.ph)}" data-rep="${key}" data-i="${i}" data-k="${c.k}" value="${esc(v[c.k]||'')}">`).join('')
               : `<input class="sm-in" placeholder="${esc(addLabel.replace(/^Add /,''))}" data-rep="${key}" data-i="${i}" value="${esc(v)}">`}
        <span class="ms sm-del" onclick="smDel('${key}',${i})" title="Remove">close</span>
      </div>`).join('')}</div>
    <div class="sm-acts"><button class="lbtn sm" onclick="smAdd('${key}')"><span class="ms">add</span> ${esc(addLabel)}</button>
      <button class="lbtn sm pri" data-toast="${esc(addLabel.replace(/^Add /,''))} saved">Save</button></div>`;

  // A resume's Simple form is the source of truth: editing it rebuilds the
  // blocks. Say so plainly once the document has been touched in Advanced.
  const warn = SM.doc.customised
    ? `<div class="note" style="margin-bottom:18px"><span class="ms">notes</span>
        This resume has block-level edits from the Advanced editor. Changing a field here rebuilds the
        document from the form and replaces those edits.</div>` : '';
  return `<div class="sm-grid">
    <div class="sm-col">
      ${warn}
      ${card('Basic Information', `
        <div class="sm-basic">
          <div class="sm-basic-f">
            ${fld('Full Name*','name')}${fld('Job Title','role')}
            <div class="sm-row">${fld('Phone Number','phone',1)}${fld('Email','email',1)}</div>
            ${fld('Linkedin','linkedin')}
          </div>
          <div class="sm-photo" data-toast="Upload a profile photo">
            <span class="ms">person</span><span class="sm-photo-e ms">edit</span>
          </div>
        </div>`)}
      ${card('Summary', `
        <div class="rte">
          <div class="rte-bar">
            ${[['format_bold','Bold','bold'],['format_italic','Italic','italic'],['format_underlined','Underline','underline'],['strikethrough_s','Strikethrough','strikeThrough']]
              .map(([i,t,c])=>`<button class="rte-b" title="${t}" onmousedown="event.preventDefault()" onclick="document.execCommand('${c}')"><span class="ms">${i}</span></button>`).join('')}
            <span class="rte-sep"></span>
            <span class="rte-sel">Font Size <span class="ms">arrow_drop_down</span></span>
            <button class="rte-b" title="Text colour" onmousedown="event.preventDefault()" onclick="document.execCommand('foreColor',false,'#C0392B')"><span class="ms" style="color:#C0392B">format_color_text</span></button>
            <button class="rte-b" title="Highlight" onmousedown="event.preventDefault()" onclick="document.execCommand('hiliteColor',false,'#FFF3C4')"><span class="ms" style="color:#B4530A">format_color_fill</span></button>
            <span class="rte-sep"></span>
            <button class="rte-b" title="Align" onmousedown="event.preventDefault()" onclick="document.execCommand('justifyLeft')"><span class="ms">format_align_left</span></button>
            <button class="rte-b" title="List" onmousedown="event.preventDefault()" onclick="document.execCommand('insertUnorderedList')"><span class="ms">format_list_bulleted</span></button>
            <button class="rte-b" title="Link" data-toast="Insert a link"><span class="ms">link</span></button>
            <button class="rte-b" title="Clear formatting" onmousedown="event.preventDefault()" onclick="document.execCommand('removeFormat')"><span class="ms">format_clear</span></button>
          </div>
          <div class="rte-ed" contenteditable="true" data-ph="Enter your summary" id="smSummary">${f.summary||''}</div>
        </div>`)}
      ${card('Qualifications', repeat('quals','Add Qualification'))}
      ${card('AWARDS AND ACHIEVMENTS', repeat('awards','Add Certifications'))}
      ${card('Skills', repeat('skills','Add Skill'), '<span class="ms sm-info" data-toast="Skills feed the resume filter in the File Manager">info</span>')}
      ${card('Work Experience', repeat('jobs','Add Job',
        [{k:'title',ph:'Job title'},{k:'company',ph:'Company'},{k:'dates',ph:'Dates'},{k:'detail',ph:'What you delivered'}]))}
    </div>
    <div class="sm-col side">
      <div class="sm-card"><div class="sm-h">Preview resume</div>
        <div class="sm-b"><div class="sm-prev" id="smPrev">${smResumePreview()}</div></div></div>
    </div>
  </div>`;
}
function smResumePreview(){
  const f = ensureForm(SM.doc);
  const t = RESUME_TEMPLATES.find(x => x.id === f.template) || RESUME_TEMPLATES[0];
  const brand = Object.assign({}, SM.doc.brand, {primary:t.primary, secondary:t.accent});
  return `<div class="a4 sm-a4">${renderComposedDoc(formToItems(f), brand, {header:SM.doc.header, footer:SM.doc.footer, bg:SM.doc.bg, density:.62})}</div>`;
}
function smWireResume(){
  document.querySelectorAll('#smBody [data-f]').forEach(el => el.addEventListener('input', () => {
    const f = ensureForm(SM.doc); markDirty(SM.doc);
    f[el.dataset.f] = el.value;
    if(el.dataset.f === 'name'){ SM.doc.name = el.value || 'Untitled Resume';
      const h=document.querySelector('#smHead .ed-title input'); if(h) h.value = SM.doc.name; }
    smPreview();
  }));
  const sum = document.getElementById('smSummary');
  if(sum) sum.addEventListener('input', () => { markDirty(SM.doc); ensureForm(SM.doc).summary = sum.innerHTML; smPreview(); });
  document.querySelectorAll('#smBody [data-rep]').forEach(el => el.addEventListener('input', () => {
    const f = ensureForm(SM.doc), k = el.dataset.rep, i = +el.dataset.i; markDirty(SM.doc);
    if(el.dataset.k) f[k][i][el.dataset.k] = el.value; else f[k][i] = el.value;
    smPreview();
  }));
}
function smPreview(){
  const p = document.getElementById('smPrev');
  if(p) p.innerHTML = smResumePreview();
  SM.doc.items = formToItems(ensureForm(SM.doc));
}
window.smAdd = key => {
  const f = ensureForm(SM.doc); markDirty(SM.doc);
  f[key].push(key === 'jobs' ? {title:'',company:'',dates:'',detail:''} : '');
  smRender();
};
window.smDel = (key,i) => { markDirty(SM.doc); ensureForm(SM.doc)[key].splice(i,1); smRender(); };

/* ── Case study / page: the live inline block canvas ─────────────────────────
   On live each inserted block is directly editable and carries its own
   rich-text toolbar, with a drag handle on the left and confirm / delete
   circles on the right. Blocks are separated by full-width teal "+" bars.   */

// The editable regions a block exposes, in order, with live's ghost text.
const BLOCK_REGIONS = {
  heading:    [{t:'h',  ph:'Enter your heading'}],
  subheading: [{t:'sh', ph:'Enter your sub-heading'}],
  paragraph:  [{t:'p',  ph:'Enter your text'}],
  double:     [{t:'p',  ph:'Enter your text'}, {t:'p', ph:'Enter your text'}],
  headpara:   [{t:'sh', ph:'Enter your heading'}, {t:'p', ph:'Enter your text'}],
  parahead:   [{t:'p',  ph:'Enter your text'}, {t:'sh', ph:'Enter your heading'}],
  img1:       [{t:'img'}],
  img2:       [{t:'img'}, {t:'img'}],
  img3:       [{t:'img'}, {t:'img'}, {t:'img'}],
  textimg:    [{t:'p',  ph:'Enter your text'}, {t:'img'}],
  imgtext:    [{t:'img'}, {t:'p', ph:'Enter your text'}],
  headimg:    [{t:'img'}, {t:'h', ph:'Enter your heading'}],
};
const SM_COLS = {double:2, headpara:2, parahead:2, img2:2, img3:3, textimg:2, imgtext:2};

// Blocks outside the live Add Block set (cover, details grid, callout...) still
// need editable regions, derived from their real primitive composition so an
// existing document keeps its content when opened in Simple mode.
const PRIM_REGION = {heading:'h', subheading:'sh', cover:'h', paragraph:'p', quote:'p',
  callout:'p', list:'p', image:'img', keyvalue:'p', table:'p', toc:'p', stat:'p',
  signature:'p', button:'p', field:'p'};
const PRIM_PH = {h:'Enter your heading', sh:'Enter your sub-heading', p:'Enter your text'};
function blockRegions(id){
  if(BLOCK_REGIONS[id]) return BLOCK_REGIONS[id];
  const prims = [];
  (P2DOC[id] || [{cols:[[id]]}]).forEach(r => r.cols.forEach(c => c.forEach(p => prims.push(p))));
  return prims.map(p => { const t = PRIM_REGION[p] || 'p'; return {t, ph: PRIM_PH[t] || 'Enter your text', prim:p}; });
}
// Existing content -> the editable region's starting HTML.
function regionSeed(it, i, r){
  const c = (it.content && it.content[i]) || {};
  if(c.html) return c.html;
  if(r.t === 'img') return '';
  if(c.title) return esc(c.title);
  if(c.body) return esc(c.body);
  if(c.items) return esc(c.items.join(', '));
  if(c.pairs) return esc(c.pairs.map(p => p.join(': ')).join(' - '));
  if(c.label) return esc(c.label);
  // fall back to the primitive's own sample text so the page is never blank
  if(r.prim){
    const tmp = document.createElement('div');
    tmp.innerHTML = renderPrimitive(r.prim, SM.doc.brand, {});
    return esc((tmp.textContent || '').trim().slice(0, 240));
  }
  return '';
}
function smRegionHtml(r, i, bi){
  if(r.t === 'img'){
    return `<div class="smb-img" data-toast="Upload an image"><span class="ms">image</span><span>Upload image</span></div>`;
  }
  const cls = r.t === 'h' ? 'smb-h' : r.t === 'sh' ? 'smb-sh' : 'smb-p';
  return `<div class="smb-ed ${cls}" contenteditable="true" data-ph="${esc(r.ph)}"
     data-bi="${bi}" data-ri="${i}"></div>`;
}
function smToolbarHtml(){
  const b = (ic,t,cmd) => `<button class="smb-t" title="${t}" onmousedown="event.preventDefault()"${cmd?` onclick="document.execCommand('${cmd}')"`:''}><span class="ms">${ic}</span></button>`;
  return `<div class="smb-bar">
    ${b('format_bold','Bold','bold')}${b('format_italic','Italic','italic')}
    ${b('format_underlined','Underline','underline')}${b('strikethrough_s','Strikethrough','strikeThrough')}
    <span class="smb-sel">Outfit-Regular <span class="ms">arrow_drop_down</span></span>
    <span class="smb-sel">Font Size <span class="ms">arrow_drop_down</span></span>
    <button class="smb-t" title="Highlight" onmousedown="event.preventDefault()" onclick="document.execCommand('hiliteColor',false,'#FFF3C4')"><span class="ms" style="color:#B4530A">format_color_fill</span></button><span class="ms smb-c">arrow_drop_down</span>
    <button class="smb-t" title="Text colour" onmousedown="event.preventDefault()" onclick="document.execCommand('foreColor',false,'#C0392B')"><span class="ms" style="color:#C0392B">format_color_text</span></button><span class="ms smb-c">arrow_drop_down</span>
    <button class="smb-t" title="Align" onmousedown="event.preventDefault()" onclick="document.execCommand('justifyLeft')"><span class="ms">format_align_left</span></button><span class="ms smb-c">arrow_drop_down</span>
    ${b('link','Insert link')}
  </div>`;
}
function smBlocksHtml(){
  const d = SM.doc;
  const plus = at => `<div class="sm-plus" onclick="smAddOpen(${at})" title="Add a block"><span class="ms">add</span></div>`;
  const block = (it, i) => {
    const regions = blockRegions(it.id);
    const cols = SM_COLS[it.id] || (regions.length > 1 && regions.length <= 3 && regions.every(r=>r.t==='img') ? regions.length : 1);
    return `<div class="smb" data-i="${i}">
      <span class="ms smb-grip" title="Drag to reorder">drag_indicator</span>
      <div class="smb-body">
        ${smToolbarHtml()}
        <div class="smb-content" style="${cols>1?`display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px`:''}">
          ${regions.map((r,ri)=>smRegionHtml(r,ri,i)).join('')}
        </div>
      </div>
      <span class="smb-side">
        <span class="smb-ok" title="Confirm" onclick="smConfirm(${i})"><span class="ms">check</span></span>
        <span class="smb-del" title="Delete" onclick="smRemove(${i})"><span class="ms">delete</span></span>
      </span>
    </div>`;
  };
  // One persistent "+" at the end, as on live. Inserting between blocks is a
  // slim affordance that only appears when you hover the gap, so the page isn't
  // a ladder of buttons.
  const gap = at => `<div class="sm-gap" onclick="smAddOpen(${at})" title="Insert a block here"><span class="ms">add</span></div>`;
  return `<div class="sm-canvas"><div class="sm-col">
    ${d.items.length
      ? d.items.map((it,i) => (i ? gap(i) : '') + block(it,i)).join('') + plus(d.items.length)
      : plus(0)}
  </div></div>`;
}
function smWireBlocks(){
  document.querySelectorAll('.sm-canvas .smb-ed').forEach(el => {
    const it = SM.doc.items[+el.dataset.bi];
    const ri = +el.dataset.ri;
    if(it) el.innerHTML = regionSeed(it, ri, blockRegions(it.id)[ri] || {t:'p'});
    el.addEventListener('input', () => {
      markDirty(SM.doc);
      it.content[ri] = it.content[ri] || {};
      it.content[ri].html = el.innerHTML;
      // keep the shared model in step so Advanced shows the same words
      const txt = el.textContent.trim();
      if(el.classList.contains('smb-p')) it.content[ri].body = txt;
      else it.content[ri].title = txt;
    });
  });
}
window.smConfirm = i => showToast('Block confirmed');

window.smAddOpen = at => {
  SM.addAt = at; SM.addSel = 'heading'; SM.addTab = 'All Blocks';   // live preselects the first tile
  smAddRender();
  document.getElementById('smAddOv').classList.add('open');
};
window.smAddClose = () => document.getElementById('smAddOv').classList.remove('open');
window.smAddTab = t => { SM.addTab = t; smAddRender(); };
window.smAddPick = id => { SM.addSel = id; smAddRender(); };
function smAddRender(){
  const pool = SIMPLE_BLOCKS.filter(b => SM.addTab === 'All Blocks' || b.tab === SM.addTab);
  document.getElementById('smAddTabs').innerHTML = SIMPLE_TABS.map(t =>
    `<div class="ftab ${t===SM.addTab?'on':''}" onclick="smAddTab('${t}')">${t}</div>`).join('');
  document.getElementById('smAddGrid').innerHTML = pool.map(b => `
    <div class="sm-tile ${SM.addSel===b.id?'on':''}" onclick="smAddPick('${b.id}')">
      <div class="sm-tile-n">${esc(b.live)}</div>
      <div class="sm-tile-p">${smTileArt(b.id)}</div></div>`).join('');
  const btn = document.getElementById('smAddBtn');
  btn.disabled = !SM.addSel;
  btn.classList.toggle('pri', !!SM.addSel);
}
// Live's tile art: grey bars for text, teal-tinted boxes for images.
function smTileArt(id){
  const bar = w => `<div class="tl-bar" style="width:${w}"></div>`;
  const img = () => `<div class="tl-img"><span class="ms">image</span></div>`;
  const col = (...c) => `<div class="tl-col">${c.join('')}</div>`;
  switch(id){
    case 'heading':    return bar('72%');
    case 'subheading': return bar('88%')+bar('64%');
    case 'paragraph':  return bar('100%')+bar('100%')+bar('76%');
    case 'double':     return `<div class="tl-row">${col(bar('100%'),bar('100%'),bar('72%'))}${col(bar('100%'),bar('100%'),bar('72%'))}</div>`;
    case 'headpara':   return `<div class="tl-row">${col(bar('100%'))}${col(bar('100%'),bar('100%'))}</div>`;
    case 'parahead':   return `<div class="tl-row">${col(bar('100%'),bar('100%'))}${col(bar('100%'))}</div>`;
    case 'img1':       return img();
    case 'img2':       return `<div class="tl-row">${img()}${img()}</div>`;
    case 'img3':       return `<div class="tl-row">${img()}${img()}${img()}</div>`;
    case 'textimg':    return `<div class="tl-row">${col(bar('100%'),bar('100%'),bar('72%'))}${img()}</div>`;
    case 'imgtext':    return `<div class="tl-row">${img()}${col(bar('100%'),bar('100%'),bar('72%'))}</div>`;
    case 'headimg':    return `<div class="tl-stack">${img()}<div class="tl-over">${bar('60%')}</div></div>`;
    default:           return bar('80%');
  }
}
window.smAddInsert = () => {
  if(!SM.addSel) return;
  const def = BLOCK_BY_ID[SM.addSel];
  markDirty(SM.doc);
  SM.doc.items.splice(SM.addAt, 0, docItem(def.kind === 'element' ? 'element' : 'block', SM.addSel));
  smAddClose(); smRender(); showToast('Inserted: ' + def.label);
};
window.smMove = (i,d) => {
  const j = i + d; if(j < 0 || j >= SM.doc.items.length) return;
  markDirty(SM.doc);
  const [x] = SM.doc.items.splice(i,1); SM.doc.items.splice(j,0,x); smRender();
};
window.smRemove = i => { markDirty(SM.doc); SM.doc.items.splice(i,1); smRender(); showToast('Block removed'); };

/* ── Create dialogs the live app shows first ─────────────────────────────── */
window.tplChoose = (kind, onPick) => {
  const ov = document.getElementById('tplOv');
  const isResume = kind === 'resume';
  ov.querySelector('.dlg').style.width = isResume ? '720px' : '440px';
  document.getElementById('tplTitle').textContent = isResume ? 'Choose your preferred template!' : 'Create New Case Study';
  document.getElementById('tplSub').textContent = isResume ? 'Select the template that best fits your needs' : '';
  document.getElementById('tplSub').style.display = isResume ? '' : 'none';
  let sel = isResume ? 'bielby' : null;
  const paint = () => {
    document.getElementById('tplBody').innerHTML = isResume
      ? `<div class="tpl-grid">${RESUME_TEMPLATES.map(t => `
          <label class="tpl-card ${sel===t.id?'on':''}" onclick="__tplPick('${t.id}')">
            <span class="tpl-radio"><span class="dot"></span></span><span class="tpl-name">${esc(t.name)}</span>
            <span class="tpl-prev" style="background:${t.primary}">
              <span class="tpl-chev" style="background:${t.accent}"></span>
              <span class="tpl-ph"></span><span class="tpl-lines"></span></span>
          </label>`).join('')}</div>`
      : `<div class="cs-choice">
           <div class="cs-opt" onclick="__tplPick('template')"><span class="ms">library_books</span>Create from Template</div>
           <div class="cs-or">Or</div>
           <div class="cs-opt" onclick="__tplPick('own')"><span class="ms">add</span>Create your own</div>
         </div>`;
    const b = document.getElementById('tplBtn');
    b.style.display = isResume ? '' : 'none';
    b.disabled = !sel;
  };
  window.__tplPick = id => { sel = id; paint(); if(!isResume){ ov.classList.remove('open'); onPick(id); } };
  document.getElementById('tplBtn').onclick = () => { ov.classList.remove('open'); onPick(sel); };
  document.getElementById('tplCancel').onclick = () => { ov.classList.remove('open'); go(kind === 'resume' ? '/file-manager/resumes' : '/file-manager/case-studies'); };
  paint();
  ov.classList.add('open');
};

/* The side columns exist so the canvas sits where Advanced puts it. Simple has
   no palette and no inspector, so they carry the document summary and a pointer
   across, rather than controls that only belong in Advanced. */
function smSidePanels(isResume){
  const d = SM.doc;
  document.getElementById('smSide').innerHTML = `
    <div class="card">
      <h3 class="ed-h"><span class="ms" style="color:var(--live-cta)">description</span> Document</h3>
      <div class="fhint">${esc(KIND_LABEL[d.kind] || 'Document')} &middot; ${d.items.length} block${d.items.length===1?'':'s'}</div>
      <div class="fhint" style="margin-top:8px">${isResume
        ? 'Fill in each section on the right. The preview updates as you type.'
        : 'Add blocks with the + bars. Reorder them with the handle on the left.'}</div>
    </div>
    <div class="card">
      <h3 class="ed-h"><span class="ms" style="color:var(--live-cta)">dashboard_customize</span> Blocks &amp; layers</h3>
      <div class="fhint">Switch to <strong>Advanced</strong> for the full block palette, the Layers panel and per-block styling.</div>
    </div>`;
  document.getElementById('smRight').innerHTML = `
    <div class="card">
      <h3 class="ed-h">Page</h3>
      <div class="fhint">Letterhead ${d.header ? 'set' : 'none'} &middot; footer ${d.footer ? 'set' : 'none'}</div>
      <div class="fhint" style="margin-top:8px">A4 &middot; ${d.items.length} block${d.items.length===1?'':'s'}</div>
    </div>`;
}
