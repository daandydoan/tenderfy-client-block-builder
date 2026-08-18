/* ═══ Documents built with the Document Builder ════════════════════════════
   Resumes and Case Studies are now composed documents (an ordered list of
   blocks/elements with per-item style), exactly like the admin prototype's
   Document and Tender Document builders — not bespoke forms.                 */

function seedResumeDoc(r){
  const d = newDoc('resume', r ? r.name : 'Untitled Resume');
  d.brand.secondary = r ? r.accent : '#38988A';
  d.header = 'lh-min'; d.footer = 'lf-page';
  const data = (r && r.data) || RESUME_DATA;
  d.items = [
    docItem('block','headpara', {0:{title:data.name}, 1:{body:data.role}},
            {bgOn:true, bg:'#F7F9F8', bgA:100, padH:20, padV:18, rad:10}),
    docItem('block','doc-details', {0:{title:'Contact'}, 1:{pairs:data.contact.map((c,i)=>[['Email','Phone','Location'][i]||'Detail', c])}}),
    docItem('block','doc-para', {0:{title:'Summary'}, 1:{body:data.summary}}),
    docItem('element','heading', {0:{title:'Experience'}}),
    ...data.experience.map(e => docItem('block','headpara',
      {0:{title:e.t}, 1:{body:e.d + ' - ' + e.b}}, {marV:4})),
    docItem('block','doc-para', {0:{title:'Skills'}, 1:{body:data.skills.join(' - ')}}),
    docItem('element','list', {0:{items:data.accreditations}}),
  ];
  return d;
}
function seedCaseDoc(c){
  const d = newDoc('case-study', c ? c.title : 'Untitled Case Study');
  d.brand.secondary = c ? c.accent : '#38988A';
  d.header = null; d.footer = 'lf-legal';
  const data = (c && c.data) || CS_DATA;
  d.items = [
    docItem('element','cover', {0:{kicker:'Case Study', title:data.title, meta:data.client + ' - ' + data.sector}}, {marV:6}),
    docItem('block','doc-details', {0:{title:'Project facts'}, 1:{pairs:[
      ['Client',data.client],['Sector',data.sector],['Location',data.location],
      ['Contract value',data.value],['Duration',data.duration],['Completed',data.completed]]}}),
    docItem('block','doc-para', {0:{title:'The challenge'}, 1:{body:data.challenge}}),
    docItem('block','imgtext',  {1:{body:data.approach}}),
    docItem('block','doc-para', {0:{title:'The outcome'}, 1:{body:data.outcome}}),
    docItem('element','callout',{0:{label:'Key results', body:data.results.map(r=>r.v+' '+r.l).join(' - ')}},
            {bgOn:true, bg:'#F1FAF7', padH:16, padV:14, rad:10}),
    docItem('element','quote',  {0:{body:data.quote}}, {marV:8}),
    docItem('element','paragraph', {0:{body:data.quoteBy}}),
  ];
  return d;
}
function seedBlankDoc(){
  const d = newDoc('page', 'Untitled Document');
  d.header = 'lh-brand'; d.footer = 'lf-page';
  d.items = [docItem('element','heading'), docItem('element','paragraph')];
  return d;
}

// Live document store, keyed by id. Seeded lazily so edits persist in-session.
const DOC_STORE = {};
function docFor(kind, id){
  const key = kind + ':' + (id || 'new');
  if(!DOC_STORE[key]){
    DOC_STORE[key] = kind === 'resume'     ? seedResumeDoc(RESUMES.find(r=>r.id===id))
                   : kind === 'case-study' ? seedCaseDoc(CASE_STUDIES.find(c=>c.id===id))
                   : seedBlankDoc();
    DOC_STORE[key].isNew = !id;
    if(id) DOC_STORE[key].status = (kind==='resume' ? RESUMES : CASE_STUDIES).find(x=>x.id===id)?.status || 'draft';
  }
  return DOC_STORE[key];
}

/* Routes open SIMPLE mode — what the live app does today. The Document Builder
   is one toggle away, and both edit the same document. */
function pgDocEditor(kind, backRoute, title){
  const id = q('id');
  const isNew = !id;
  const doc = docFor(kind, id);
  setTimeout(() => {
    const open = () => smOpen({doc, backRoute, onSave: () => go(backRoute)});
    if(isNew && kind === 'resume'){
      tplChoose('resume', tpl => { ensureForm(doc).template = tpl; open(); });
    } else if(isNew && kind === 'case-study'){
      tplChoose('case-study', choice => {
        if(choice === 'own') doc.items = [];
        open();
      });
    } else open();
  }, 0);
  return `<div class="phead"><div class="h">${esc(title)}</div></div>
    <div class="pbody"><div class="stub"><span class="ms">edit_note</span>
      <b>Opening the editor&hellip;</b>Close it to come back here.</div></div>`;
}
// Function declarations, not consts — the ROUTES table is built before this file runs.
// Editing an existing document returns to its view page, which is where you
// came from; creating a new one returns to the listing.
function pgAddResume(){
  const id = q('id');
  return pgDocEditor('resume', id ? '/file-manager/resumes/resume-preview/?id=' + id : '/file-manager/resumes',
    id ? 'Edit Resume' : 'Create Resume');
}
function pgCaseStudyEdit(){
  const id = q('id');
  return pgDocEditor('case-study', id ? '/file-manager/case-studies/case-study/?id=' + id : '/file-manager/case-studies',
    id ? 'Edit Case Study' : 'Create Case Studies');
}

/* ═══ Block Library — lives under File manager ═════════════════════════════
   Documents are created from Resumes / Case Studies / Build Tender, so there is
   no separate documents listing; this is just the palette's source of truth.  */

let bbTab = 'All Blocks', bbQuery = '', bbFilters = false;

/* Mirrors tenderfy-admin/blocks.html: category tabs, a collapsible filter row,
   and .lst-card tiles (name + element count, schematic, description, footer
   with category and a kebab that opens upward). */
function pgBBBlocks(){
  const cats = ['All Blocks', ...BLOCK_CATS];
  const hf = bbTab === 'Headers & Footers';
  return `<div class="phead">
      <div class="h">Block Library</div>
      <div class="sp">${hf
        ? `<button class="lbtn" onclick="beOpen()"><span class="ms">vertical_align_bottom</span> New footer</button>
           <button class="lbtn pri" onclick="beOpen()"><span class="ms">vertical_align_top</span> New letterhead</button>`
        : `<button class="lbtn pri" onclick="beOpen()"><span class="ms">add</span> New Block</button>`}</div>
    </div>
    <div class="pbody">
      <div class="fhint" style="margin:-4px 0 18px;max-width:720px">The building blocks behind the Block Builder.
        An <strong>element</strong> is a single primitive; a <strong>block</strong> is primitives arranged in a layout,
        so a new block needs no new code &mdash; only a new arrangement.</div>
      <div class="lst-bar">
        <div class="lst-tabs">${cats.map(c => `<span class="lst-tab ${c===bbTab?'on':''}" onclick="bbSetTab('${esc(c)}')">${esc(c)}</span>`).join('')}</div>
        <button class="lst-filterbtn ${bbFilters?'on':''}" onclick="bbToggleFilters()"><span class="ms">tune</span> Filters
          ${bbQuery?`<span class="lst-fcount">1</span>`:''}</button>
      </div>
      <div class="lst-filters" ${bbFilters?'':'hidden'}>
        <span class="lst-search"><span class="ms">search</span>
          <input id="bbQ" placeholder="Search blocks..." value="${esc(bbQuery)}" oninput="bbSearch(this.value)"></span>
      </div>
      <div class="lst-grid" id="bbGrid">${bbCards()}</div>
    </div>`;
}
function bbList(){
  const q = bbQuery.trim().toLowerCase();
  return BLOCKS.filter(b =>
    (bbTab === 'All Blocks' || b.cat === bbTab) &&
    (!q || (b.name + ' ' + b.label + ' ' + (b.desc||'') + ' ' + b.cat).toLowerCase().includes(q)));
}
function bbCards(){
  const list = bbList();
  if(!list.length) return `<div style="grid-column:1/-1;text-align:center;color:#A9B4B2;padding:50px 0">
    <span class="ms" style="font-size:40px">search</span><p style="margin-top:14px">No blocks match.</p></div>`;
  return list.map(b => {
    // How many elements the block actually places — count every slot, not just
    // the distinct kinds, or "Triple Images" reads as 1.
    const parts = [];
    (P2DOC[b.p] || [{cols:[[b.p]]}]).forEach(r => r.cols.forEach(c => c.forEach(p => parts.push(p))));
    const n = parts.length || 1;
    return `<div class="lst-card" onclick="beOpenExisting('${b.id}')" title="Built from: ${esc(parts.join(', ') || b.p)}">
      <div class="lst-name"><span class="lst-lbl">${esc(b.name)}</span>
        <span class="lst-use">${n} element${n===1?'':'s'}</span></div>
      <div class="lst-prev">${blockSchematic(b)}</div>
      <div class="lst-desc">${esc(b.desc || '')}</div>
      <div class="lst-foot">
        <span class="lst-cat">${esc(b.cat)}</span>
        <span class="lst-kebwrap">
          <button class="lst-kebab" onclick="bbKebab(event,'${b.id}')" aria-label="Actions"><span class="ms">more_vert</span></button>
        </span></div>
    </div>`;
  }).join('');
}
window.bbSetTab = c => { bbTab = c; renderRoute(); };
window.bbToggleFilters = () => { bbFilters = !bbFilters; renderRoute(); };
window.bbSearch = v => { bbQuery = v; document.getElementById('bbGrid').innerHTML = bbCards(); };
window.bbKebab = (ev, id) => {
  const b = BLOCK_BY_ID[id];
  const items = [
    {label:'Edit block', run:() => beOpenExisting(id)},
    {label:'Duplicate',  run:() => showToast('Duplicated "' + b.name + '"')},
  ];
  if(b.custom) items.push({label:'Delete block', run:() => {
    BLOCKS.splice(BLOCKS.indexOf(b), 1); delete BLOCK_BY_ID[id]; delete CUSTOM_BLOCK_DEF[id];
    renderRoute(); showToast('Deleted "' + b.name + '"');
  }});
  openMenu(ev, items);
};
