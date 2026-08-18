/* ═══ View pages ═══════════════════════════════════════════════════════════
   Live puts a read-only view between the listing and the editor:
     Resumes      /file-manager/resumes/resume-preview/<id>
     Case Studies /file-manager/case-studies/add-edit-case-study/edit/<id>/1
   Both were read off stgbusinessadmin.tenderfy.org. Shared header: an amber
   Back on the left, the accent bar + title, then Delete / Edit X / Add To
   Tender on the right. The case-study view also carries a round chevron that
   slides out a "Case Study Details" panel; the resume view has no panel.     */

const VIEW_H = 53;                              // live's action-button height
let viewPanel = false;                          // case-study details panel

function vheadHtml(cfg){
  return `<div class="vhead">
    <button class="vbtn amber" onclick="go('${cfg.back}')"><span class="ms">keyboard_arrow_left</span> Back</button>
    <div class="vtitle">${esc(cfg.title)}</div>
    <div class="vacts">
      <button class="vbtn red" onclick="${cfg.del}">Delete</button>
      <button class="vbtn amber" onclick="${cfg.edit}">${esc(cfg.editLabel)}</button>
      <button class="vbtn teal" onclick="a2tOpen('${esc(cfg.title).replace(/'/g,'')}')">Add To Tender</button>
      ${cfg.panel ? `<button class="vchev" onclick="viewPanel=!viewPanel;renderRoute()" title="${viewPanel?'Hide':'Show'} details"><span class="ms">${viewPanel?'chevron_right':'chevron_left'}</span></button>` : ''}
    </div>
  </div>`;
}

/* ── Resume Preview ──────────────────────────────────────────────────────── */
function pgResumePreview(){
  const id = q('id');
  const r = RESUMES.find(x => x.id === id) || RESUMES[0];
  const d = docFor('resume', r.id);
  return vheadHtml({
    title:'Resume Preview', back:'/file-manager/resumes',
    editLabel:'Edit Resume', edit:`go('/file-manager/resumes/add-resume?id=${r.id}')`,
    del:`viewDelete('resume','${r.id}')`,
  }) + `<div class="vbody">
    <div class="vstage"><div class="vpage">${renderComposedDoc(d.items, d.brand, {header:d.header, footer:d.footer, bg:d.bg})}</div></div>
  </div>`;
}

/* ── Case Study view ─────────────────────────────────────────────────────── */
function pgCaseStudyView(){
  const id = q('id');
  const c = CASE_STUDIES.find(x => x.id === id) || CASE_STUDIES[0];
  const d = docFor('case-study', c.id);
  const fld = (k,v) => `<div class="vfld"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;
  return vheadHtml({
    title:c.title, back:'/file-manager/case-studies', panel:true,
    editLabel:'Edit Case Study', edit:`go('/file-manager/case-studies/add-edit-case-study/?id=${c.id}')`,
    del:`viewDelete('case-study','${c.id}')`,
  }) + `<div class="vbody vsplit">
    <div class="vcard"><div class="vstage"><div class="vpage">${renderComposedDoc(d.items, d.brand, {header:d.header, footer:d.footer, bg:d.bg})}</div></div></div>
    ${viewPanel ? `<aside class="vpanel"><h3>Case Study Details</h3>${fld('Name', c.title)}</aside>` : ''}
  </div>`;
}

window.viewDelete = (kind, id) => {
  const label = kind === 'resume' ? 'resume' : 'case study';
  document.getElementById('vdName').textContent =
    kind === 'resume' ? (RESUMES.find(x=>x.id===id)||{}).name : (CASE_STUDIES.find(x=>x.id===id)||{}).title;
  document.getElementById('vdSub').textContent = 'This ' + label + ' will be removed from the File Manager.';
  document.getElementById('vdOk').onclick = () => {
    const list = kind === 'resume' ? RESUMES : CASE_STUDIES;
    const i = list.findIndex(x => x.id === id);
    if(i >= 0) list.splice(i, 1);
    vdClose();
    go(kind === 'resume' ? '/file-manager/resumes' : '/file-manager/case-studies');
    showToast('Deleted');
  };
  document.getElementById('vdOv').classList.add('open');
};
window.vdClose = () => document.getElementById('vdOv').classList.remove('open');

/* ── Add To Tender ───────────────────────────────────────────────────────────
   Live opens a modal with a slate header, a search box, the tender folder rail
   and a card per tender showing Name / Organisation / Priority / Status / Due
   Date over a full-width "Add to Tender" button.                             */
const A2T_FOLDERS = ['Default Tenders','Aviral'];
let a2tFolder = A2T_FOLDERS[0], a2tQuery = '', a2tDoc = '';

window.a2tOpen = name => {
  a2tDoc = name; a2tQuery = '';
  a2tRender();
  document.getElementById('a2tOv').classList.add('open');
};
window.a2tClose = () => document.getElementById('a2tOv').classList.remove('open');
window.a2tSetFolder = f => { a2tFolder = f; a2tRender(); };
window.a2tSearch = v => { a2tQuery = v; document.getElementById('a2tGrid').innerHTML = a2tCards(); };
function a2tCards(){
  const q = a2tQuery.toLowerCase();
  const pool = TENDERS.filter(t => !q || t.name.toLowerCase().includes(q));
  if(!pool.length) return '<div class="fhint" style="padding:20px 2px">No tenders match that search.</div>';
  return pool.map(t => `<div class="a2t-card">
    <div class="k">Name</div><div class="v">${esc(t.name)}</div>
    <div class="k">Organisation</div><div class="v">${esc(t.org || '')}</div>
    <div class="a2t-meta">
      <div><div class="k">Priority</div><div class="v a2t-pri">${esc(t.pri || 'High')} <span class="ms">expand_more</span></div></div>
      <div><div class="k">Status</div><div class="v a2t-st">${esc(t.st || 'Pending')} <span class="ms">expand_more</span></div></div>
      <div><div class="k">Due Date</div><div class="v">${esc(t.due || '')}</div></div>
    </div>
    <button class="a2t-add" onclick="a2tAdd('${esc(t.name).replace(/'/g,'')}')">Add to Tender</button>
  </div>`).join('');
}
function a2tRender(){
  document.getElementById('a2tChips').innerHTML = A2T_FOLDERS.map(f =>
    `<div class="fchip ${f===a2tFolder?'on':''}" onclick="a2tSetFolder('${f}')">${esc(f)}</div>`).join('');
  document.getElementById('a2tGrid').innerHTML = a2tCards();
}
window.a2tAdd = tender => { a2tClose(); showToast('Added "' + a2tDoc + '" to ' + tender); };
