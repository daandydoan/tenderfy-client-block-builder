/* ═══ Fill In — the estimator's side of a document ═════════════════════════
   The owner marked parts of each block Fixed / Editable / Locked in the Block
   Builder. Here an estimator opens the attachment in the same shell and can
   only change the Editable parts, add one-per-item rows where a row Repeats,
   and fill the merge fields. The library record is never written: the
   attachment keeps its own copy of every block (the same fork-on-edit the
   Advanced editor uses), and the result is the same paginated A4 the PDF
   backend will render. PDF generation is backend work; nothing prints here.  */

let FL = null;
const FL_USER = 'Sam Ortega';                        // ponytail: one seeded estimator; a staff picker when Manage Staff is real
const FL_FIELDS = {'client.name':'Client name','client.industry':'Client industry','client.abn':'Client ABN','project.name':'Project name','project.ref':'Tender reference','project.value':'Contract value','date.today':'Today’s date','contact.name':'Contact name'};
let flUid = 0;
const flClone = x => JSON.parse(JSON.stringify(x));

/* Every element in the attachment's own block copies gets a stable id, so
   words typed into it survive rows being added around it. */
function flMaterialise(doc){
  doc.items.forEach(it => {
    if(it.t !== 'block' || it.src) return;
    const def = it.blockDef || docBlockDefOf(it);
    if(!def) return;
    const d = flClone(def);
    d.doc.forEach(row => { row.cols.forEach(col => col.forEach(el => { el.u = el.u || ('u' + (++flUid)); })); if(row.repeat) row.items = [row.cols]; });
    it.src = {def: d, words: {}};
    // words already typed in Advanced (pi-keyed) carry over
    let n = -1; d.doc.forEach(row => row.cols.forEach(col => col.forEach(el => { n++; if(it.content && it.content[n]) it.src.words[el.u] = it.content[n]; })));
  });
}
/* Expand Repeat rows into one row per item (down) or one row of all items (across),
   then bake: blockDef + pi-keyed content are what every renderer reads. */
function flBake(it){
  const {def, words} = it.src;
  const rows = [];
  def.doc.forEach(row => {
    if(!row.items) return rows.push(row);
    if(row.repeat === 'h') rows.push({cols: [].concat(...row.items)});
    else row.items.forEach(cols => rows.push({cols}));
  });
  it.blockDef = {doc: rows, blockStyle: def.blockStyle || {}, expanded: true};
  const content = {}; let n = -1;
  rows.forEach(row => row.cols.forEach(col => col.forEach(el => { n++; if(words[el.u]) content[n] = words[el.u]; })));
  it.content = content;
}

window.flOpen = (kind, id) => {
  const doc = docFor(kind, id);                     // the document's own block copies; the library block is never written
  doc.fill = doc.fill || {merge:{}, status:'draft'};
  flMaterialise(doc); doc.items.forEach(it => it.src && flBake(it));
  FL = {doc, fill:doc.fill, back: kind === 'resume' ? '/file-manager/resumes/resume-preview/?id=' + id : '/file-manager/case-studies/case-study/?id=' + id};
  document.getElementById('fl').classList.add('open');
  flRenderAll();
};
window.flClose = () => { document.getElementById('fl').classList.remove('open'); FL = null; };
window.flExit  = () => exitEditor(FL.doc, FL.back, () => flClose(), window.flSave);
window.flSave  = () => { FL.doc.dirty = false; flAudit('Filled by ' + FL_USER); persistLibrary(); showToast('Saved - ' + FL.doc.name); const back = FL.back; flClose(); go(back); renderRoute(); };
window.flReady = () => { FL.fill.status = 'ready'; FL.doc.dirty = false; flAudit('Marked ready for PDF'); persistLibrary(); showToast('Queued for PDF - the backend renders this exact layout'); flHead(); };
function flAudit(what){ (FL.doc.audit = FL.doc.audit || []).push({date: new Date().toISOString().slice(0,16).replace('T',' '), by: FL_USER, what}); }

function flRenderAll(){ flHead(); flSide(); flStage(); flRight(); }
function flHead(){
  const ready = FL.fill.status === 'ready';
  document.getElementById('flHead').innerHTML = edHeadHtml({
    doc: FL.doc, mode:'block',                       // no Simple/Advanced here - the estimator doesn't restructure
    sub: `Filling in as <strong>${esc(FL_USER)}</strong> (estimator) - only the parts marked Editable can change.`,
    exit:'flExit()', save:'flSave()', saveLabel:'Save',
    rename:"FL.doc.name=this.value;markDirty(FL.doc)",
    extras:`<button class="lbtn ${ready?'':'pri'}" onclick="flReady()"><span class="ms">${ready?'check_circle':'picture_as_pdf'}</span> ${ready?'Ready for PDF':'Mark ready for PDF'}</button>`,
  });
}
/* Left: merge fields and the repeating rows. */
function flSide(){
  const fields = {}, reps = [];
  FL.doc.items.forEach((it,i) => { if(!it.src) return;
    it.src.def.doc.forEach((row,r) => { if(row.items) reps.push({it,i,row,r});
      (row.items || [row.cols]).forEach(cols => cols.forEach(col => col.forEach(el => { if(el.id === 'field' && el.perm !== 'locked') fields[el.field || 'client.name'] = 1; }))); });
  });
  const keys = Object.keys(fields);
  document.getElementById('flSide').innerHTML = `
    <div class="card"><h3 class="ed-h">Fill in</h3>
      <div class="fhint" style="margin:0 0 10px">Dashed parts on the page are yours to change. Everything else was set by the owner.</div>
      ${keys.length ? keys.map(k => `<div class="fld"><label>${esc(FL_FIELDS[k]||k)}</label><input class="fin" value="${esc(FL.fill.merge[k]||'')}" placeholder="${esc(FL_FIELDS[k]||k)}" onchange="flMerge('${k}',this.value)"></div>`).join('')
                  : '<div class="fhint">No merge fields in this document.</div>'}
    </div>
    ${reps.length ? `<div class="card"><h3 class="ed-h">Repeating rows</h3>
      <div class="fhint" style="margin:0 0 6px">Add one per item - an extra row is laid out the way the block repeats.</div>
      ${reps.map(({it,i,row,r}) => `<div class="fl-rep"><span class="ms" style="color:var(--teal)">${row.repeat==='h'?'view_column':'arrow_downward'}</span>
          <span>${esc((BLOCK_BY_ID[it.id]||{}).name||'Block')} - row ${r+1}</span><span class="n">${row.items.length} item${row.items.length>1?'s':''}</span>
          <button class="lbtn icon-sm" onclick="flRep(${i},${r},-1)" title="Remove last item"><span class="ms">remove</span></button>
          <button class="lbtn icon-sm" onclick="flRep(${i},${r},1)" title="Add another item"><span class="ms">add</span></button></div>`).join('')}
    </div>` : ''}`;
}
window.flMerge = (k, v) => { FL.fill.merge[k] = v.trim(); markDirty(FL.doc); flStage(); };
window.flRep = (i, r, d) => {
  const it = FL.doc.items[i], row = it.src.def.doc[r];
  if(d > 0){
    // a new item starts as a copy of the last one, words included
    const last = row.items[row.items.length-1];
    row.items.push(last.map(col => col.map(el => { const c = flClone(el); c.u = 'u' + (++flUid); if(it.src.words[el.u]) it.src.words[c.u] = flClone(it.src.words[el.u]); return c; })));
  } else if(row.items.length > 1) row.items.pop();
  flBake(it); markDirty(FL.doc); flSide(); flStage();
};
/* Middle: the same paginator as the builder's Preview; editable parts wired after. */
function flStage(){
  const host = document.getElementById('flCanvas');
  host.innerHTML = `<div class="vb-bar"><span class="ms" style="font-size:16px;color:var(--live-cta)">description</span><span>${esc(FL.doc.name)}</span></div><div class="vb-stage" id="flPages"></div>`;
  const n = renderDocPages(document.getElementById('flPages'), FL.doc, {cls:'vb-page', alwaysNumber:true,
    blockHtml: (it,i) => docItemHtml(it, FL.doc.brand, 'pv-blk', `data-i="${i}"`)});
  // merge fields show their value
  host.querySelectorAll('.dp[data-field]').forEach(w => { const v = FL.fill.merge[w.dataset.field]; if(v){ const s = w.querySelector('span'); if(s) s.textContent = v; } });
  host.querySelectorAll('.pv-blk[data-i] .dp[data-perm]').forEach(w => {
    const it = FL.doc.items[+w.closest('.pv-blk').dataset.i]; if(!it || !it.src) return;
    if(w.dataset.perm === 'locked'){ w.classList.add('fl-lk'); w.title = 'Locked by head office'; return; }
    if(w.dataset.perm !== 'editable') return;
    w.classList.add('fl-ed');
    w.querySelectorAll('[data-f]').forEach(el => {
      const f = el.dataset.f; if(!/^(title|body|kicker|meta|value|label|caption|text|items)$/.test(f)) return;   // ponytail: table cells stay read-only in fill; add when a template marks one Editable
      el.setAttribute('contenteditable','true'); el.classList.add('inline-ed');
      el.addEventListener('input', () => {
        const c = (it.src.words[w.dataset.u] = it.src.words[w.dataset.u] || {});
        if(f === 'items') c.items = [...w.querySelectorAll('[data-f="items"]')].map(li => li.innerHTML); else c[f] = el.innerHTML;
        flBake(it); markDirty(FL.doc);
      });
    });
  });
}
/* Right: what the owner decided, and the trail. */
function flRight(){
  const audit = (FL.doc.audit || []).slice().reverse();
  document.getElementById('flRight').innerHTML = `
    <div class="card"><h3 class="ed-h">Permissions</h3>
      <div class="fhint"><span class="fl-key fl-ed">Editable</span> you can change it &nbsp; <span class="fl-key fl-lk">Locked</span> head office only &nbsp; plain = fixed by the owner</div>
    </div>
    <div class="card"><h3 class="ed-h">History</h3>
      ${audit.length ? audit.map(a => `<div class="fl-aud"><div>${esc(a.what)}</div><div class="fhint" style="margin:0">${esc(a.by)} - ${esc(a.date)}</div></div>`).join('') : '<div class="fhint">Every save is logged here with who did it.</div>'}
    </div>`;
}
