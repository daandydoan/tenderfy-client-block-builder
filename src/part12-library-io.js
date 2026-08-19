/* ═══ Creating, saving and remembering library records ═════════════════════
   Documents built in the editors now become real records: a new resume or case
   study lands in its listing, keeps the document it was built from, and
   survives a reload alongside the client's custom blocks.                     */

const NEW_ID = p => p + '-' + Date.now().toString(36);
const TODAY  = () => new Date().toLocaleDateString('en-AU', {day:'2-digit', month:'short', year:'numeric'});

/* Pull a display title out of whatever the document holds. */
function docTitleOf(doc, fallback){
  const n = (doc.name || '').trim();
  if(n && !/^untitled/i.test(n)) return n;
  for(const it of doc.items || []){
    const slot = (it.content || {})[0] || {};
    const t = (slot.title || '').replace(/<[^>]+>/g, '').trim();
    if(t) return t;
  }
  return fallback;
}
/* Save the document back to the record it came from, creating the record on a
   first save. Everything the listings read is derived from the document, so a
   card always matches what is inside it. */
function upsertDoc(kind, doc){
  const list = kind === 'resume' ? RESUMES : CASE_STUDIES;
  let rec = doc.srcId && list.find(x => x.id === doc.srcId);
  const isNew = !rec;
  if(isNew){
    rec = kind === 'resume'
      ? {id:NEW_ID('r'), name:'', role:'', av:ACCENTS[list.length % ACCENTS.length], skills:['New skill'],
         layout:'left-panel', accent:'#38988A', status:'draft', by:'You', updated:TODAY(), pages:1}
      : {id:NEW_ID('c'), title:'', client:'', sector:'General', cats:'N/A', layout:'hero',
         accent:'#38988A', status:'draft', by:'You', updated:TODAY(), pages:1};
    list.push(rec);
    doc.srcId = rec.id;
    DOC_STORE[kind + ':' + rec.id] = doc;
  }
  if(kind === 'resume'){
    rec.name = docTitleOf(doc, 'Untitled Resume');
    const f = doc.form; if(f && f.role) rec.role = f.role;
    if(!rec.role) rec.role = 'Team member';
  } else {
    rec.title = docTitleOf(doc, 'Untitled Case Study');
  }
  rec.doc = doc;
  rec.updated = TODAY();
  doc.isNew = false;
  persistLibrary();
  return rec;
}
window.upsertDoc = upsertDoc;

/* Duplicate a resume or case study, document and all. */
window.duplicateDoc = (kind, id) => {
  const list = kind === 'resume' ? RESUMES : CASE_STUDIES;
  const src = list.find(x => x.id === id); if(!src) return;
  const rec = JSON.parse(JSON.stringify(src));
  rec.id = NEW_ID(kind === 'resume' ? 'r' : 'c');
  if(kind === 'resume') rec.name = src.name + ' copy'; else rec.title = src.title + ' copy';
  rec.updated = TODAY(); rec.status = 'draft';
  if(rec.doc){ rec.doc.srcId = rec.id; DOC_STORE[kind + ':' + rec.id] = rec.doc; }
  list.push(rec); persistLibrary(); renderRoute();
  showToast('Duplicated - "' + (kind === 'resume' ? rec.name : rec.title) + '" added');
};

/* ── Creating the other record types ───────────────────────────────────────
   Live has no create path for cover pages, contents pages or (from this
   screen) tenders. These are additions, so the client can run the whole
   create -> view -> edit loop in one sitting. */
window.newCoverPage = () => {
  const rec = {id:NEW_ID('cv'), name:'Untitled Cover Page', font:'Manrope', bg:'#172E39', tx:'#B4D33B',
               logo:'right', logoFile:'Tenderfy_Civil_logo.svg', status:'draft'};
  COVERS.push(rec); persistLibrary(); renderRoute();
  psOpen('cover', rec.id);
};
window.newContentsPage = () => {
  const rec = {id:NEW_ID('t'), name:'Untitled Contents', font:'Manrope', bg:'#2C3232', sec:'#38988A',
               logo:'Tenderfy_Civil_logo.svg', status:'draft', by:'You', updated:TODAY()};
  TOCS.push(rec); persistLibrary(); renderRoute();
  psOpen('toc', rec.id);
};

window.ntOpen = () => {
  ['nt-name','nt-org','nt-due'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('nt-pri').value = 'High';
  document.getElementById('nt-st').value = 'Pending';
  document.getElementById('nt-name-err').classList.remove('show');
  document.getElementById('ntOv').classList.add('open');
  setTimeout(() => document.getElementById('nt-name').focus(), 30);
};
window.ntClose = () => document.getElementById('ntOv').classList.remove('open');
window.ntCreate = () => {
  const name = document.getElementById('nt-name').value.trim();
  if(!name){ document.getElementById('nt-name-err').classList.add('show'); return; }
  TENDERS.unshift({name, org:document.getElementById('nt-org').value.trim(), contact:'', who:'You',
                   pri:document.getElementById('nt-pri').value, st:document.getElementById('nt-st').value,
                   due:document.getElementById('nt-due').value});
  persistLibrary(); ntClose();
  go('/tenders/tender-details/?tender=' + encodeURIComponent(name));
  showToast('Created tender - ' + name);
};

/* ── The library survives a reload ─────────────────────────────────────────
   Records are replaced in place, because the arrays are shared by reference
   across every page and palette. */
const LIB_KEY = 'tf_library';
/* Bump when the seeded library changes, so saved demo data from an older build
   is discarded rather than masking the new seed. */
const LIB_VERSION = 2;
function persistLibrary(){
  try{
    localStorage.setItem(LIB_KEY, JSON.stringify({
      v:LIB_VERSION, resumes:RESUMES, caseStudies:CASE_STUDIES, covers:COVERS, tocs:TOCS, tenders:TENDERS,
    }));
  }catch(e){}
}
function restoreLibrary(){
  let s = null;
  try{ s = JSON.parse(localStorage.getItem(LIB_KEY)); }catch(e){ return; }
  if(!s) return;
  if(s.v !== LIB_VERSION){ try{ localStorage.removeItem(LIB_KEY); }catch(e){} return; }
  const swap = (arr, saved) => { if(Array.isArray(saved) && saved.length){ arr.length = 0; saved.forEach(x => arr.push(x)); } };
  swap(RESUMES, s.resumes); swap(CASE_STUDIES, s.caseStudies);
  swap(COVERS, s.covers);   swap(TOCS, s.tocs); swap(TENDERS, s.tenders);
  // Documents saved with a record go straight back into the store.
  [['resume', RESUMES], ['case-study', CASE_STUDIES]].forEach(([kind, list]) =>
    list.forEach(r => { if(r.doc) DOC_STORE[kind + ':' + r.id] = r.doc; }));
}
window.persistLibrary = persistLibrary;
window.resetLibrary = () => { try{ localStorage.removeItem(LIB_KEY); localStorage.removeItem('tf_custom_blocks'); }catch(e){} location.reload(); };
restoreLibrary();
