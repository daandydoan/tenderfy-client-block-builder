/* ── Page: /tenders ──────────────────────────────────────────────────────── */

let tnView = 'grid', tnTab = 'All Tenders', tnFolder = 'Default Tenders', tnQuery = '';

function pgTenders(){
  return `<div class="phead">
      <div class="h">Tenders</div>
      <span class="lseg">${['All Tenders','My Tenders'].map(t=>`<button class="${t===tnTab?'on':''}" onclick="tnSetTab('${t}')">${t}</button>`).join('')}</span>
      <span class="lseg">
        <button class="${tnView==='list'?'on':''}" onclick="tnSetView('list')"><span class="ms">format_list_bulleted</span> List view</button>
        <button class="${tnView==='grid'?'on':''}" onclick="tnSetView('grid')"><span class="ms">grid_view</span> Grid view</button>
      </span>
      <span class="ms" data-toast="Filter tenders" style="color:#7C8886;font-size:22px">filter_list</span>
      <div class="lsearch"><span class="ms">search</span><input placeholder="Search by organization or contact name" value="${esc(tnQuery)}" oninput="tnSearch(this.value)"></div>
      <div class="sp"><button class="lbtn pri" data-toast="Create new tender">Create New Tender</button></div>
    </div>
    <div class="pbody">
      ${folderRail(['Default Tenders','Aviral','Evolve housing'], tnFolder, 'tnSetFolder')}
      <div class="frail" id="railFiles"><span class="ms car" onclick="railToggle('railFiles')">expand_more</span> Tenders <span class="ms" data-toast="Sort tenders" style="color:#7C8886;font-size:19px">sort</span></div>
      <div id="tnList">${tnView === 'grid' ? tnGrid() : tnListView()}</div>
    </div>`;
}
function folderRail(names, sel, setter){
  return `<div class="frail" id="railFolders"><span class="ms car" onclick="railToggle('railFolders')">expand_more</span> Folders
      <button class="lbtn pri sm" data-toast="Add folder"><span class="ms">add</span> Add Folder</button></div>
    <div class="fchips">${names.map((f,i)=>`<div class="fchip ${f===sel?'on':''}" onclick="${setter}('${esc(f)}')">${esc(f)}${i?'<span class="ms" data-toast="Folder options">more_vert</span>':''}</div>`).join('')}</div>`;
}
function tnRows(){
  const query = tnQuery.trim().toLowerCase();
  let rows = TENDERS;
  if(tnTab === 'My Tenders') rows = rows.filter(t => t.who === 'Tom');
  if(query) rows = rows.filter(t => (t.name+' '+t.org+' '+t.contact).toLowerCase().includes(query));
  return rows;
}
function tnGrid(){
  const rows = tnRows();
  if(!rows.length) return `<div class="stub"><span class="ms">folder_open</span>No tenders match this filter.</div>`;
  return `<div class="lgrid">${rows.map(t=>`
    <div class="lcard" onclick="go('/tenders/tender-details/?tender=${encodeURIComponent(t.name)}')">
      <div class="ctop"><input type="checkbox" onclick="event.stopPropagation()">
        ${t.who?`<span class="chip"><span class="ms" style="font-size:14px">person</span>${esc(t.who)}</span>`:''}
        <span class="ms" data-toast="Tender options" onclick="event.stopPropagation()">more_vert</span></div>
      <div class="k">Name</div><div class="v" style="font-weight:700">${esc(t.name)}</div>
      <div class="k">Organization</div><div class="v">${esc(t.org)||'&nbsp;'}</div>
      <div class="k">Contact Name</div><div class="v">${esc(t.contact)||'&nbsp;'}</div>
      <div class="rule" style="display:flex;gap:18px">
        ${[['Priority',`<span class="${PRI[t.pri]}" style="font-weight:600">${t.pri}</span>`],
           ['Status',`<span class="${ST[t.st]}" style="font-weight:600">${t.st}</span>`],
           ['Due Date',t.due||'&mdash;']].map(([k,v])=>`<div><div style="font-size:11.5px;color:#8B9694">${k}</div><div style="font-size:13.5px;margin-top:2px">${v}</div></div>`).join('')}
      </div>
    </div>`).join('')}</div>`;
}
function tnListView(){
  const rows = tnRows();
  return `<div style="background:#fff;border:1px solid #E3E8E7;border-radius:10px;overflow:auto">
    <table class="rq-table"><thead><tr><th style="width:34px"></th><th>Name</th><th>Organization</th><th>Contact Name</th><th>Assigned</th><th>Priority</th><th>Status</th><th class="r">Due Date</th></tr></thead>
    <tbody>${rows.length ? rows.map(t=>`<tr style="cursor:pointer" onclick="go('/tenders/tender-details/?tender=${encodeURIComponent(t.name)}')">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td style="font-weight:600">${esc(t.name)}</td><td class="trade">${esc(t.org)||'&mdash;'}</td><td class="trade">${esc(t.contact)||'&mdash;'}</td>
      <td class="trade">${esc(t.who)||'&mdash;'}</td><td><span class="${PRI[t.pri]}" style="font-weight:600">${t.pri}</span></td>
      <td><span class="${ST[t.st]}" style="font-weight:600">${t.st}</span></td><td class="r">${t.due||'&mdash;'}</td></tr>`).join('')
      : `<tr><td colspan="8" style="padding:18px;color:#8B9694">No tenders match this filter.</td></tr>`}</tbody></table></div>`;
}
window.tnSetTab = v => { tnTab = v; renderRoute(); };
window.tnSetView = v => { tnView = v; renderRoute(); };
window.tnSetFolder = f => { tnFolder = f; renderRoute(); showToast('Folder: ' + f); };
window.tnSearch = v => { tnQuery = v; document.getElementById('tnList').innerHTML = tnView === 'grid' ? tnGrid() : tnListView(); };
window.railToggle = id => document.getElementById(id).classList.toggle('clps');

/* ── Page: /tenders/tender-details/ ──────────────────────────────────────── */

let rqMode = 'out';
function pgTenderDetail(){
  const name = q('tender') || 'biebly cover page';
  return `<div class="phead">
      <button class="lbtn" onclick="go('/tenders')"><span class="ms">keyboard_arrow_left</span> Back</button>
      <div class="h">${esc(name)}</div>
      <div class="sp">
        <button class="lbtn" data-toast="Start time tracking"><span class="ms" style="color:#F95246">play_circle</span> Start Time</button>
        <button class="lbtn pri" onclick="go('/tenders/build-tender/?tender=${encodeURIComponent(name)}')">Build Tender</button>
        <button class="lbtn gold" data-toast="Update tender">Update Tender</button>
        <span class="ms" data-toast="Tender options" style="color:#7C8886">more_vert</span>
      </div>
    </div>
    <div class="pbody">
      <div class="td-grid">
        <div class="tacc light" id="accInfo">
          <div class="tacc-h" onclick="taccToggle('accInfo')"><span class="ms car">expand_more</span> Tender information</div>
          <div class="tacc-b">
            <div style="display:flex;gap:22px;flex-wrap:wrap;margin-bottom:16px;font-size:13.5px">
              <span><b style="color:#8B9694;font-weight:500">STATUS:</b> <span class="st-pending" style="font-weight:600">Pending</span></span>
              <span><b style="color:#8B9694;font-weight:500">PRIORITY:</b> <span class="pri-high" style="font-weight:600">High</span></span>
              <span><b style="color:#8B9694;font-weight:500">Assignee:</b> Select Staff</span>
            </div>
            <div class="prow" style="gap:14px">
              ${[['Tender Name',esc(name)],['Tender Number',''],['Organisation',''],['Contact Name',''],['Contact Number',''],['Contact Email','']]
                .map(([k,v])=>`<div><label style="font-size:11.5px;color:#8B9694">${k}</label><input class="pin2" value="${v}" placeholder="${k}"></div>`).join('')}
              <div><label style="font-size:11.5px;color:#8B9694">Start Date</label><input class="pin2" type="date"></div>
              <div><label style="font-size:11.5px;color:#8B9694">Due Date</label><input class="pin2" type="date"></div>
            </div>
          </div>
        </div>
        <div class="tacc dark" id="accCheck">
          <div class="tacc-h" onclick="taccToggle('accCheck')"><span class="ms car">expand_more</span> Checklist
            <button class="lbtn pri sm act" data-toast="Add task" onclick="event.stopPropagation()">Add Task</button></div>
          <div class="tacc-b">
            <div class="ftabs" style="margin:0 0 12px">${['My Tasks','Assigned Tasks','Completed Tasks'].map((t,i)=>`<div class="ftab ${i?'':'on'}" onclick="tabPick(this)">${t}</div>`).join('')}</div>
            ${[['Confirm eligibility &amp; conflicts of interest','Done',1],['Compile insurances &amp; licences','Done',1],
               ['Draft methodology &amp; capability statement','Due 20 Jul',0],['Request subcontractor quotes','Due 22 Jul',0],
               ['Internal review &amp; sign-off','Due 27 Jul',0]]
              .map(([l,d,done])=>`<label class="tk-item${done?' done':''}"><input type="checkbox"${done?' checked':''} onchange="this.closest('.tk-item').classList.toggle('done',this.checked)"><span class="tk-label">${l}</span><span class="tk-due">${d}</span></label>`).join('')}
          </div>
        </div>
      </div>

      <div class="tacc dark collapsed" id="accDocs">
        <div class="tacc-h" onclick="taccToggle('accDocs')"><span class="ms car">expand_more</span> Tender documentation
          <button class="lbtn pri sm act" data-toast="Add document" onclick="event.stopPropagation()">Add Document</button></div>
        <div class="tacc-b">
          ${[['pdf','PDF','Request for Tender.pdf','3.1 MB'],['docx','DOCX','Response Schedule Template.docx','142 KB'],
             ['pdf','PDF','Conditions of Contract.pdf','880 KB'],['xlsx','XLSX','Pricing Schedule.xlsx','96 KB']]
            .map(([c,l,n,s])=>`<div class="td-doc"><span class="ftag ${c}">${l}</span><span class="nm">${n}</span><span class="by">${s}</span><span class="ms" data-toast="Open document">open_in_new</span></div>`).join('')}
        </div>
      </div>

      <div class="tacc dark collapsed" id="accNotes">
        <div class="tacc-h" onclick="taccToggle('accNotes')"><span class="ms car">expand_more</span> Notes
          <button class="lbtn pri sm act" data-toast="Add note" onclick="event.stopPropagation()">Add Notes</button></div>
        <div class="tacc-b">
          <div class="td-note"><div class="meta">Andrew Williams - 12 Jul 2026 - 2:14pm</div><div class="body2">Awaiting traffic management quote from Ironbark before finalising the methodology section. Chase by Friday.</div></div>
          <div class="td-note"><div class="meta">Andrew Williams - 8 Jul 2026 - 9:02am</div><div class="body2">Confirmed our public liability cover meets the $20M requirement in the conditions of contract.</div></div>
        </div>
      </div>

      <div class="rq" id="rqSec">
        <div class="rq-h" onclick="rqToggle()"><span class="ms car">expand_more</span> Quotes <span class="cnt" id="rqCnt"></span>
          <span class="rq-tabs" onclick="event.stopPropagation()">
            <span class="rq-tab ${rqMode==='out'?'on':''}" onclick="rqTab('out')">Out for Quote</span>
            <span class="rq-tab ${rqMode==='acc'?'on':''}" onclick="rqTab('acc')">Accepted Quotes</span></span>
          <span class="acts" onclick="event.stopPropagation()">
            <button class="lbtn sm" data-toast="Send a new request for quote"><span class="ms">send</span> Send New Request</button>
            <button class="lbtn sm pri" id="rqCompareBtn" onclick="openCompare()" style="${rqMode==='out'?'':'display:none'}"><span class="ms">compare_arrows</span><span id="rqCmpLbl">Compare</span></button>
          </span>
        </div>
        <div class="rq-b">
          <table class="rq-table"><thead><tr><th style="width:34px"></th><th>Subcontractor</th><th>Trade</th><th class="r">Value (inc. GST)</th><th class="c">Incl.</th><th class="c">Excl.</th><th class="c">Assum.</th><th>Status</th><th class="r">Quote</th></tr></thead>
            <tbody id="rqBody">${rqBodyHtml()}</tbody></table>
        </div>
      </div>
    </div>`;
}
function rqRow(qt, i, acc){
  return `<tr>
    <td>${acc ? '' : `<input type="checkbox" class="rq-chk" data-i="${i}" onchange="updateCompare()">`}</td>
    <td><span class="rq-sub"><span class="av" style="background:${qt.color}">${qt.av}</span>${esc(qt.sub)}</span></td>
    <td class="trade">${esc(qt.trade)}</td><td class="r rq-amount">${money(qt.total)}</td>
    <td class="c"><span class="rq-n i${qt.incl.length?'':' z'}">${qt.incl.length}</span></td>
    <td class="c"><span class="rq-n e${qt.excl.length?'':' z'}">${qt.excl.length}</span></td>
    <td class="c"><span class="rq-n a${qt.assum.length?'':' z'}">${qt.assum.length}</span></td>
    <td><span class="badge ${qt.badge}">${qt.status}</span></td>
    <td class="r"><a class="rq-view" data-toast="Open ${esc(qt.sub)} quote">View &rarr;</a></td></tr>`;
}
function rqBodyHtml(){
  let html = '', count = 0;
  if(rqMode === 'out'){
    const out = QUOTES.map((qt,i) => ({qt,i})).filter(x => x.qt.status !== 'Accepted');
    const groups = {};
    out.forEach(x => { (groups[x.qt.trade] = groups[x.qt.trade] || []).push(x); });
    html = Object.keys(groups).sort().map(t =>
      `<tr class="rq-group"><td colspan="9">${esc(t)} - ${groups[t].length} quote${groups[t].length===1?'':'s'}</td></tr>`
      + groups[t].map(x => rqRow(x.qt, x.i, false)).join('')).join('');
    count = out.length;
  } else {
    const acc = QUOTES.map((qt,i) => ({qt,i})).filter(x => x.qt.status === 'Accepted');
    html = acc.map(x => rqRow(x.qt, x.i, true)).join('');
    const tot = acc.reduce((s,x) => s + x.qt.total, 0);
    html += `<tr class="rq-total"><td></td><td colspan="2">Total accepted value</td><td class="r v">${money(tot)}</td><td colspan="5"></td></tr>`;
    count = acc.length;
  }
  setTimeout(() => { const c = document.getElementById('rqCnt'); if(c) c.textContent = '(' + count + ')'; }, 0);
  return html;
}
window.taccToggle = id => document.getElementById(id).classList.toggle('collapsed');
window.tabPick = el => { el.parentNode.querySelectorAll('.ftab').forEach(t=>t.classList.remove('on')); el.classList.add('on'); };
window.rqToggle = () => document.getElementById('rqSec').classList.toggle('collapsed');
window.rqTab = m => {
  rqMode = m;
  document.querySelectorAll('.rq-tabs .rq-tab').forEach((t,i) => t.classList.toggle('on', (i === 0) === (m === 'out')));
  document.getElementById('rqCompareBtn').style.display = m === 'out' ? '' : 'none';
  document.getElementById('rqBody').innerHTML = rqBodyHtml();
};
window.updateCompare = () => {
  const n = document.querySelectorAll('.rq-chk:checked').length;
  document.getElementById('rqCmpLbl').textContent = n > 1 ? ' Compare (' + n + ')' : 'Compare';
};
window.openCompare = () => {
  const n = document.querySelectorAll('.rq-chk:checked').length;
  if(n < 2){ showToast('Select at least 2 quotes to compare'); return; }
  showToast('Comparing ' + n + ' quotes side by side');
};

/* ── Page: /tenders/build-tender/ — matched to the live app ──────────────── */

const BT_SECS = [
  {k:'cover',  t:'Cover Page',          add:'Add Cover Page',         src:'cover-pages'},
  {k:'toc',    t:'Table of Contents',   add:'Add Table of Contents',  src:'table-of-contents'},
  {k:'docs',   t:'Tender Documents',    add:'Add Tender Documents',   src:'others'},
  {k:'resume', t:'Resumes',             add:'Add Resumes',            src:'resumes'},
  {k:'case',   t:'Case Studies',        add:'Add Case Studies',       src:'case-studies'},
  {k:'policy', t:'Policies',            add:'Add Policies',           src:'policies'},
  {k:'ins',    t:'Insurances',          add:'Add Insurances',         src:'insurances'},
  {k:'cert',   t:'Certifications',      add:'Add Certifications',     src:'certifications'},
  {k:'org',    t:'Organisation Chart',  add:'Add Organisation Chart', src:'organization-chart'},
  {k:'other',  t:'Others',              add:'Add Others',             src:'others'},
];
let btOrder = BT_SECS.map(s => s.k);
let btAdded = {
  cover: [{n:'Bielby Cover - Logo Right', prev:{kind:'cover', id:'cv1'}},
          {n:'Bielby Cover - Logo Bottom Right', prev:{kind:'cover', id:'cv2'}},
          {n:'Bielby Cover', prev:{kind:'cover', id:'cv3'}}],
};
let btSel = null;                  // {k, i}

function pgBuildTender(){
  const name = q('tender') || 'biebly cover page';
  return `<div class="phead">
      <button class="lbtn" onclick="go('/tenders/tender-details/?tender=${encodeURIComponent(name)}')"><span class="ms">keyboard_arrow_left</span> Back</button>
      <div class="h">Tender Attachments &nbsp;- ${esc(name)}</div>
      <div class="sp">
        <span class="ltop-ava" style="width:38px;height:38px;border-radius:50%;background:#5C6BC0;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700" title="Andrew Williams">AW</span>
        <button class="lbtn" data-toast="Choose a saved tender template"><span class="ms">library_books</span> Select Template <span class="ms">keyboard_arrow_down</span></button>
        <button class="lbtn" data-toast="Saved as a reusable tender template"><span class="ms">flag</span> Save as Template</button>
        <button class="lbtn pri icon" data-toast="Download the submission package"><span class="ms">download</span></button>
      </div>
    </div>
    <div class="bt2">
      <div class="bt2-card">
        <h3>Tender Attachments</h3>
        <div class="bt2-list" id="btList">${btSecsHtml()}</div>
      </div>
      <div class="bt2-prev" id="btPrev">${btPrevHtml()}</div>
    </div>`;
}
function btSecsHtml(){
  const byKey = Object.fromEntries(BT_SECS.map(s => [s.k, s]));
  return btOrder.map(k => byKey[k]).filter(Boolean).map(s => {
    const files = (btAdded[s.k] || []).map((f,i) => {
      const on = btSel && btSel.k === s.k && btSel.i === i;
      return `<div class="bt2-f ${on?'on':''}" onclick="btShow('${esc(s.k)}',${i})">
        <span class="ms g">drag_indicator</span>
        <span class="nm">${esc(f.n)}</span>
        <span class="ms pen" onclick="event.stopPropagation();btRename('${esc(s.k)}',${i})" title="Rename">edit</span>
        <span class="act">
          <span class="ms" onclick="event.stopPropagation();btShow('${esc(s.k)}',${i})" title="Preview">visibility</span>
          <span class="ms" onclick="btRowMenu(event,'${esc(s.k)}',${i})" title="More">more_horiz</span>
        </span></div>`;
    }).join('');
    const lib = s.src ? `onclick="libOpen('${esc(s.src)}','${esc(s.k)}')"` : `data-toast="${esc(s.add)}"`;
    return `<div class="bt2-sec" draggable="true" data-k="${esc(s.k)}">
      <div class="bt2-grip" title="Drag to reorder section"><span class="ms">drag_indicator</span></div>
      <div class="bt2-b">
        <div class="bt2-h">${esc(s.t)}
          ${s.src?`<span class="lib" ${lib} title="Add from File Manager"><span class="ms">library_add</span></span>`:''}
          ${s.custom?`<span class="lib" onclick="secMenu(event,'${esc(s.k)}')" title="Section options"><span class="ms">more_horiz</span></span>`:''}</div>
        ${files ? `<div class="bt2-items">${files}</div>` : ''}
        <div class="bt2-add" ${lib}><span class="ms">add</span> ${esc(s.add)}</div>
      </div></div>`;
  }).join('') + `<button class="lbtn pri bt2-addsec" onclick="secOpen()"><span class="ms">add</span> Add Section</button>`;
}
function btRerender(){
  const el = document.getElementById('btList');
  if(el){ el.innerHTML = btSecsHtml(); btWireDrag(); }
  const p = document.getElementById('btPrev');
  if(p) p.innerHTML = btPrevHtml();
}
function btWireDrag(){
  let dragKey = null;
  document.querySelectorAll('#btList .bt2-sec').forEach(el => {
    el.addEventListener('dragstart', e => { dragKey = el.dataset.k; el.style.opacity = '.4'; e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragend', () => { el.style.opacity = ''; });
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      const target = el.dataset.k;
      if(!dragKey || dragKey === target) return;
      const from = btOrder.indexOf(dragKey), to = btOrder.indexOf(target);
      btOrder.splice(from, 1); btOrder.splice(to, 0, dragKey);
      dragKey = null; btRerender(); showToast('Section reordered');
    });
  });
}
function btCur(){ return btSel ? (btAdded[btSel.k] || [])[btSel.i] : null; }
// A document keeps its cover identity even after it has been built out of blocks,
// so Simple <-> Advanced stays a two-way toggle rather than a one-way door.
function btCoverId(f){
  if(!f || !f.prev) return null;
  if(f.prev.kind === 'cover') return f.prev.id;
  if(f.prev.kind === 'blocks' && f.prev.doc) return f.prev.doc.coverId || null;
  return null;
}
function btPrevHtml(){
  const f = btCur();
  if(!f) return `<div class="bt2-empty">
      <span class="ms">picture_as_pdf</span><div class="t">Select file to preview</div></div>`;
  const advanced = f.prev && f.prev.kind === 'blocks';
  return `<div class="acts">
      <span class="modesw" title="Simple styles the cover; Advanced edits the document structure">
        <button class="${advanced?'':'on'}" onclick="csOpen()"><span class="ms">palette</span> Simple</button>
        <button class="${advanced?'on':''}" onclick="advOpen()"><span class="ms">bolt</span> Advanced</button>
      </span>
      <button class="lbtn" data-toast="Edit the details on this document"><span class="ms">edit</span> Edit Information</button>
    </div>
    <div class="bt2-stage">${btDocHtml(f)}</div>`;
}
function btDocHtml(f){
  const p = f.prev || {kind:'doc', title:f.n};
  if(p.kind === 'cover'){
    const c = COVERS.find(x => x.id === p.id) || COVERS[0];
    return `<div style="width:430px;max-width:100%">${coverHtml(c)}</div>`;
  }
  if(p.kind === 'resume'){
    const r = RESUMES.find(x => x.id === p.id) || RESUMES[0];
    return `<div class="a4" style="width:430px;min-height:0;box-shadow:none;border:1px solid #E3E8E7">${renderResume({layout:r.layout, brand:Object.assign({}, RESUME_BRAND_DEFAULT, {secondary:r.accent}), data:r.data || RESUME_DATA, density:.8})}</div>`;
  }
  if(p.kind === 'case'){
    const c = CASE_STUDIES.find(x => x.id === p.id) || CASE_STUDIES[0];
    return `<div class="a4" style="width:430px;min-height:0;box-shadow:none;border:1px solid #E3E8E7">${renderCaseStudy({layout:c.layout, brand:Object.assign({}, RESUME_BRAND_DEFAULT, {secondary:c.accent}), data:c.data || CS_DATA, density:.8})}</div>`;
  }
  if(p.kind === 'blocks'){
    const d = p.doc;
    return `<div class="a4" style="width:430px;min-height:0;box-shadow:none;border:1px solid #E3E8E7">${renderComposedDoc(d.items, d.brand, {header:d.header, footer:d.footer, density:.72})}</div>`;
  }
  return `<div class="a4" style="width:430px;min-height:0;box-shadow:none;border:1px solid #E3E8E7">${docPageHtml(p.title || f.n, p.desc || '')}</div>`;
}
function coverHtml(c){
  return `<div class="cvr" style="font-family:'${c.font==='Tungsten-Narrow'?'Manrope':c.font}',sans-serif;background:${c.bg}">
    <div class="art" style="background:linear-gradient(150deg,${c.bg} 0%, #6E7C77 42%, ${c.bg} 100%)"></div>
    <div class="brand">${c.logo==='right'?'&#x25B6;&#x25B6; Bielby':'&#x25B6;&#x25B6; Bielby'}</div>
    <div class="kick" style="background:${c.tx};color:${c.bg}">SUBMISSION</div>
    <div class="ttl" style="color:${c.tx};font-weight:${c.font==='Tungsten-Narrow'?'800':'700'};letter-spacing:${c.font==='Tungsten-Narrow'?'-1px':'-.5px'}">Enter title</div>
    <div class="foot" style="background:${c.bg}">
      <div><div class="k" style="color:${c.tx}">TENDER NUMBER</div><div class="v" style="color:#fff">Enter tendernumber</div></div>
      <div><div class="k" style="color:${c.tx}">PREPARED FOR</div><div class="v" style="color:#fff">Enter prepared for</div></div>
    </div></div>`;
}
function docPageHtml(title, desc){
  return `<div style="padding:34px;font-family:Outfit,sans-serif;min-height:460px;text-align:left">
    <div style="display:flex;align-items:center;gap:9px;padding-bottom:12px;border-bottom:2px solid #38988A">
      <span style="width:26px;height:26px;border-radius:6px;background:#27535C;color:#FFBE0B;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">TC</span>
      <span style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#27535C">Tenderfy Civil Pty Ltd</span></div>
    <div style="font-size:20px;font-weight:700;color:#2E3C3B;margin-top:18px;line-height:1.2">${esc(title)}</div>
    <div style="font-size:12.5px;color:#596262;line-height:1.65;margin-top:12px">${desc || ''}</div>
    <div style="margin-top:16px">${[100,96,92,98,88,94,70].map(w=>`<div style="height:7px;background:#EEF2F1;border-radius:3px;width:${w}%;margin-bottom:8px"></div>`).join('')}</div></div>`;
}
window.btShow = (k,i) => { btSel = {k,i}; btRerender(); };
window.btRename = (k,i) => showToast('Rename "' + btAdded[k][i].n + '"');
window.btRowMenu = (ev,k,i) => {
  const f = btAdded[k][i];
  const isCover = f.prev && f.prev.kind === 'cover';
  const items = [];
  if(isCover) items.push({label:'Edit Cover Style', run:()=>{ btSel={k,i}; btRerender(); csOpen(); }});
  items.push({label:'Edit Information', run:()=>showToast('Edit information - ' + f.n)});
  items.push({label:'Advanced Editor', run:()=>{ btSel={k,i}; btRerender(); advOpen(); }});
  items.push({label:'Remove From Tender', run:()=>{ btAdded[k].splice(i,1); if(btSel&&btSel.k===k&&btSel.i===i) btSel=null; btRerender(); showToast('Removed from tender'); }});
  openMenu(ev, items);
};

/* Advanced Editor — the same Document Builder used for Resumes, Case Studies
   and the Block Builder section, opened against this tender attachment. */
window.advOpen = () => {
  const f = btCur();
  if(!f) return;
  let doc;
  if(f.prev && f.prev.kind === 'blocks'){
    doc = f.prev.doc;
  } else {
    doc = newDoc('page', f.n);
    const p = f.prev || {};
    if(p.kind === 'cover'){
      const c = COVERS.find(x => x.id === p.id) || COVERS[0];
      doc.coverId = c.id;                       // keeps Simple mode reachable
      doc.brand.primary = c.bg; doc.brand.secondary = c.tx;
      doc.items = [
        docItem('element','cover', {0:{kicker:'Submission', title:f.n, meta:'Prepared for - Tender number'}}),
        docItem('block','doc-details', {0:{title:'Tender details'}}),
      ];
    } else if(p.kind === 'resume'){
      doc = seedResumeDoc(RESUMES.find(r => r.id === p.id));
    } else if(p.kind === 'case'){
      doc = seedCaseDoc(CASE_STUDIES.find(c => c.id === p.id));
    } else {
      doc.header = 'lh-brand'; doc.footer = 'lf-page';
      doc.items = [docItem('element','heading', {0:{title:f.n}}), docItem('element','paragraph')];
    }
    doc.name = f.n;
  }
  const target = {k:btSel.k, i:btSel.i};
  dbOpen({
    doc, backLabel:'Back to tender',
    sub:'Advanced editor - structure this tender attachment out of blocks. Switch to <strong>Simple</strong> for cover font and colour only.',
    onSave: d => { btAdded[target.k][target.i].prev = {kind:'blocks', doc:d}; btRerender(); },
  });
};

/* ── Edit Cover Style — the live "simple" builder ────────────────────────── */

let CS = {bg:'#172E39', tx:'#B4D33B', font:'Tungsten-Narrow'};
window.csOpen = () => {
  const f = btCur();
  const id = btCoverId(f);
  if(!id){ showToast('Simple mode styles a cover page - this document has no cover'); return; }
  const c = COVERS.find(x => x.id === id) || COVERS[0];
  CS = {bg:c.bg, tx:c.tx, font:c.font};
  document.getElementById('csFont').innerHTML = COVER_FONTS.map(f=>`<option${f===CS.font?' selected':''}>${f}</option>`).join('');
  csRender();
  document.getElementById('csOv').classList.add('open');
};
window.csClose = () => document.getElementById('csOv').classList.remove('open');
window.csSync = () => { CS.font = document.getElementById('csFont').value; csRender(); };
window.csHex = (which, v) => { if(/^#[0-9a-f]{6}$/i.test(v)){ CS[which] = v; csRender(true); } };
window.csPick = (which, v) => { CS[which] = v; csRender(); };
function csRender(skipInputs){
  const sw = (which, list, cur) => list.map(c => `<span class="swb ${c.toLowerCase()===cur.toLowerCase()?'on':''}" style="background:${c}" onclick="csPick('${which}','${c}')" title="${c}"></span>`).join('');
  document.getElementById('csBgV').innerHTML = sw('bg', PAL_VIBRANT, CS.bg);
  document.getElementById('csBgE').innerHTML = sw('bg', PAL_EARTHY,  CS.bg);
  document.getElementById('csTxV').innerHTML = sw('tx', PAL_VIBRANT, CS.tx);
  document.getElementById('csTxE').innerHTML = sw('tx', PAL_EARTHY,  CS.tx);
  if(!skipInputs){
    document.getElementById('csBgHex').value = CS.bg;
    document.getElementById('csTxHex').value = CS.tx;
    document.getElementById('csFont').value = CS.font;
  }
  document.getElementById('csPrev').innerHTML = coverHtml({font:CS.font, bg:CS.bg, tx:CS.tx, logo:'right'});
}
window.csSave = () => {
  const f = btCur();
  const id = btCoverId(f);
  const c = id && COVERS.find(x => x.id === id);
  if(c) Object.assign(c, {bg:CS.bg, tx:CS.tx, font:CS.font});
  // Keep an already-built block document in sync, so the two modes agree.
  if(f && f.prev && f.prev.kind === 'blocks'){
    f.prev.doc.brand.primary = CS.bg;
    f.prev.doc.brand.secondary = CS.tx;
  }
  csClose(); btRerender(); showToast('Cover style saved');
};
document.getElementById('csOv').addEventListener('click', e => { if(e.target.id === 'csOv') csClose(); });

/* ── Library picker (Build Tender "Add from File Manager") ───────────────── */

let libSrc = 'resumes', libTarget = 'resume', libPick = {};
function libItems(){
  if(libSrc === 'resumes')      return RESUMES.map(r => ({n:`${r.name} - ${r.role}`, prev:{kind:'resume', id:r.id}}));
  if(libSrc === 'case-studies') return CASE_STUDIES.map(c => ({n:c.title, prev:{kind:'case', id:c.id}}));
  if(libSrc === 'cover-pages')  return COVERS.map(c => ({n:c.name, prev:{kind:'cover', id:c.id}}));
  if(libSrc === 'table-of-contents') return TOCS.map(t => ({n:t.name, prev:{kind:'doc', title:t.name, desc:'A contents list generated from the tender sections.'}}));
  return (OTHER_DOCS[libSrc] || []).map(d => {
    const title = d.t.replace(/&amp;/g,'&').replace(/&rsquo;/g,"'");
    return {n:title, prev:{kind:'doc', title, desc:d.desc}};
  });
}
window.libOpen = (src, target) => {
  libSrc = src; libTarget = target; libPick = {};
  document.getElementById('attTitle').textContent = 'Add from File Manager - ' + (FM_META[src] ? FM_META[src].name : src);
  document.getElementById('attGq').style.display = 'none';
  document.getElementById('attQ').value = '';
  attRender();
  document.getElementById('attOv').classList.add('open');
};
window.attClose = () => document.getElementById('attOv').classList.remove('open');
window.attToggle = n => { libPick[n] = !libPick[n]; attRender(); };
window.attRender = () => {
  const query = (document.getElementById('attQ').value || '').toLowerCase();
  const items = libItems().filter(f => !query || f.n.toLowerCase().includes(query));
  document.getElementById('attFiles').innerHTML = items.length ? items.map(f =>
    `<div class="att-f ${libPick[f.n]?'on':''}" onclick="attToggle('${esc(f.n).replace(/'/g,'&#39;')}')">
      <div class="th"><span class="cb"><span class="ms">check</span></span><span class="tag">PDF</span>
        <div class="doc rich"><div style="width:${f.prev.kind==='cover'?430:620}px;transform:scale(${f.prev.kind==='cover'?.38:.26});transform-origin:top left">${libDocHtml(f)}</div></div></div>
      <div class="nm">${esc(f.n)}</div></div>`).join('') : '<div style="padding:10px;color:#8B9694">No matching documents.</div>';
};
function libDocHtml(f){
  const p = f.prev || {};
  if(p.kind === 'cover'){ const c = COVERS.find(x=>x.id===p.id); return coverHtml(c); }
  if(p.kind === 'resume'){ const r = RESUMES.find(x=>x.id===p.id); return renderResume({layout:r.layout, brand:Object.assign({}, RESUME_BRAND_DEFAULT, {secondary:r.accent}), data:r.data || RESUME_DATA}); }
  if(p.kind === 'case'){ const c = CASE_STUDIES.find(x=>x.id===p.id); return renderCaseStudy({layout:c.layout, brand:Object.assign({}, RESUME_BRAND_DEFAULT, {secondary:c.accent}), data:c.data || CS_DATA}); }
  return docPageHtml(p.title || f.n, p.desc || '');
}
window.attAdd = () => {
  const items = libItems();
  const picks = Object.keys(libPick).filter(k => libPick[k]);
  if(!picks.length){ showToast('Select at least one document to add'); return; }
  btAdded[libTarget] = btAdded[libTarget] || [];
  picks.forEach(n => {
    if(btAdded[libTarget].some(f => f.n === n)) return;
    const src = items.find(i => i.n === n) || {};
    btAdded[libTarget].push({n, prev:src.prev});
  });
  attClose(); btRerender();
  showToast(picks.length + ' document' + (picks.length===1?'':'s') + ' added to the tender');
};
document.getElementById('attOv').addEventListener('click', e => { if(e.target.id === 'attOv') attClose(); });

/* ── File Manager list pages — matched to the live app ───────────────────── */

let fmFolder = {}, fmView = {};
function pgLibrary(slug){
  const m = FM_META[slug];
  const folders = slug === 'resumes' ? ['Default Resumes','Evolve housing','Aviral']
                : slug === 'case-studies' ? ['Default Case Studies','evolve housing','Aviral','All format documents']
                : ['Default ' + m.name];
  const sel = fmFolder[slug] || folders[0];
  const view = fmView[slug] || 'grid';
  const cards = fmCards(slug, view);
  const acts = {
    'resumes':      `<button class="lbtn gold" data-toast="My Company's skills">My Company's skills</button>
                     <button class="lbtn" data-toast="Upload an existing resume">Upload Resume</button>
                     <button class="lbtn pri" onclick="go('/file-manager/resumes/add-resume')">Add New Resume</button>`,
    'case-studies': `<button class="lbtn" data-toast="Upload an existing case study">Upload Case Study</button>
                     <button class="lbtn pri" onclick="go('/file-manager/case-studies/add-edit-case-study/')">Create New Case Study</button>`,
    'cover-pages':  `<button class="lbtn" data-toast="Upload a cover page">Upload Cover Page</button>
                     <button class="lbtn pri" data-toast="Create a new cover page">Create New Cover Page</button>`,
  }[slug] || `<button class="lbtn pri" data-toast="Upload ${esc(m.sing)}"><span class="ms">upload</span> Upload ${esc(m.sing)}</button>`;

  return `<div class="phead">
      <div class="h">${esc(m.name)}</div>
      <span class="lseg">
        <button class="${view==='list'?'on':''}" onclick="fmSetView('${slug}','list')"><span class="ms">format_list_bulleted</span> List view</button>
        <button class="${view==='grid'?'on':''}" onclick="fmSetView('${slug}','grid')"><span class="ms">grid_view</span> Grid view</button>
      </span>
      <div class="lsearch"><span class="ms">search</span><input placeholder="Search"></div>
      <div class="sp">${acts}</div>
    </div>
    <div class="pbody">
      ${folderRail(folders, sel, `fmSetFolder.bind(null,'${slug}')`)}
      <div class="frail" id="railF2"><span class="ms car" onclick="railToggle('railF2')">expand_more</span> Files
        <span class="ms" data-toast="Sort" style="color:#7C8886;font-size:19px">sort</span></div>
      ${slug === 'resumes'
        ? `<div class="lsplit"><div class="lgrid">${cards}</div>${filterRail()}</div>`
        : `<div class="lgrid">${cards}</div>`}
      ${pager(slug)}
    </div>`;
}
window.fmSetFolder = (slug, f) => { fmFolder[slug] = f; renderRoute(); showToast('Folder: ' + f); };
window.fmSetView = (slug, v) => { fmView[slug] = v; renderRoute(); };
function filterRail(){
  return `<div class="filt">
    <div class="filt-h">Filter <span class="sp"><button class="lbtn sm" data-toast="Filters cleared">Clear Filter</button><button class="lbtn sm gold" data-toast="Filters applied">Apply</button></span></div>
    <div class="filt-b">
      <div class="grp"><h5>Skills</h5><input class="pin2" placeholder="Enter to search skills" style="padding:12px"></div>
      <div class="grp"><h5>Proficiency</h5><input class="rng" type="range" min="0" max="2" value="0">
        <div class="rng-lbls"><span>Entry level</span><span>Skilled</span><span>Advanced</span></div></div>
      <div class="grp"><h5>Experience</h5><input class="rng" type="range" min="1" max="5" value="1">
        <div class="rng-lbls"><span>1 year</span><span>2 year</span><span>3 year</span><span>4 year</span><span>5+ year</span></div></div>
    </div></div>`;
}
function pager(slug){
  const n = fmCount(slug);
  return `<div class="lpage"><span>Items per page:</span>
    <select><option>10</option><option>25</option><option>50</option></select>
    <span>1 &ndash; ${Math.min(10,n)} of ${n}</span>
    <span class="nav"><span class="ms" data-toast="First page">keyboard_arrow_left</span><span class="ms" data-toast="Previous page">chevron_left</span><span class="ms" data-toast="Next page">chevron_right</span><span class="ms" data-toast="Last page">keyboard_arrow_right</span></span></div>`;
}
function fmCount(slug){
  if(slug === 'resumes') return RESUMES.length;
  if(slug === 'case-studies') return CASE_STUDIES.length;
  if(slug === 'cover-pages') return COVERS.length;
  if(slug === 'table-of-contents') return TOCS.length;
  return (OTHER_DOCS[slug] || []).length;
}
function shrink(html, scale, w){
  return `<div class="shot"><div class="shrink" style="width:${w||620}px;transform:scale(${scale})">${html}</div></div>`;
}
function fmCards(slug){
  if(slug === 'resumes') return RESUMES.map(r => `
    <div class="lcard" onclick="go('/file-manager/resumes/add-resume?id=${r.id}')">
      <div class="ctop"><input type="checkbox" onclick="event.stopPropagation()"><span class="ms" data-toast="Resume options" onclick="event.stopPropagation()">more_vert</span></div>
      <div class="ava-lg" style="background:${r.av}">${esc(r.name.split(' ').map(w=>w[0]).join('').slice(0,2))}</div>
      <div class="cname">${esc(r.name)}</div>
      <div class="k">Job Position</div><div class="v">${esc(r.role)}</div>
      <div class="rule"><div class="k" style="margin-top:0">Top Skills</div>
        <div style="display:flex;align-items:center;gap:6px"><span class="chip">${esc(r.skills[0])}</span>
        <span class="ms" style="margin-left:auto;color:#9AA5A3" data-toast="All skills" onclick="event.stopPropagation()">more_vert</span></div></div>
    </div>`).join('');

  if(slug === 'case-studies') return CASE_STUDIES.map(c => `
    <div class="lcard" onclick="go('/file-manager/case-studies/add-edit-case-study/?id=${c.id}')">
      <div class="ctop"><input type="checkbox" onclick="event.stopPropagation()">
        <span class="cname" style="flex:1;min-width:0;font-size:16px">${esc(c.title)}</span>
        <span class="ms" data-toast="Case study options" onclick="event.stopPropagation()">more_vert</span></div>
      ${shrink(renderCaseStudy({layout:c.layout, brand:Object.assign({}, RESUME_BRAND_DEFAULT, {secondary:c.accent}), data:c.data || CS_DATA}), .38)}
      <div class="k">Categories</div><div class="v">${esc(c.cats)}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;color:#8B9694;font-size:13px;font-style:italic">
        <span class="ms" style="font-size:16px;color:var(--live-cta)">bookmark</span> ${esc(c.sector)}</div>
    </div>`).join('');

  if(slug === 'cover-pages') return COVERS.map(c => `
    <div class="lcard" onclick="showToast('Open cover page - ${esc(c.name)}')">
      <div class="ctop"><input type="checkbox" onclick="event.stopPropagation()">
        <span class="cname" style="flex:1;min-width:0;font-size:16px">${esc(c.name)}</span>
        <span class="ms" data-toast="Cover options" onclick="event.stopPropagation()">more_vert</span></div>
      ${shrink(coverHtml(c), .55, 430)}
      <div class="k">Cover Font</div><div class="v">${esc(c.font)}</div>
    </div>`).join('');

  if(slug === 'table-of-contents') return TOCS.map(t => `
    <div class="lcard" data-toast="Open ${esc(t.name)}">
      <div class="ctop"><input type="checkbox" onclick="event.stopPropagation()">
        <span class="cname" style="flex:1;min-width:0;font-size:16px">${esc(t.name)}</span>
        <span class="ms">more_vert</span></div>
      ${shrink(`<div style="padding:34px;font-family:Outfit,sans-serif;text-align:left">${renderPrimitive('heading',null,{title:'Contents'})}<div style="height:14px"></div>${renderPrimitive('toc')}</div>`, .38)}
      <div class="k">Updated</div><div class="v">${esc(t.updated)}</div>
    </div>`).join('');

  return (OTHER_DOCS[slug] || []).map(d => {
    const title = d.t.replace(/&amp;/g,'&').replace(/&rsquo;/g,"'");
    return `<div class="lcard" data-toast="Open ${esc(title)}">
      <div class="ctop"><input type="checkbox" onclick="event.stopPropagation()">
        <span class="cname" style="flex:1;min-width:0;font-size:16px">${d.t}</span>
        <span class="ms">more_vert</span></div>
      ${shrink(docPageHtml(title, d.desc), .38)}
      <div class="k">Uploaded by</div><div class="v">${esc(d.by)}</div>
      <div style="margin-top:8px;font-size:12.5px;color:${d.exp?'#B4530A':'#8B9694'}">${d.exp ? expLabel(d.exp, d.rem) : 'Updated ' + d.updated}</div>
    </div>`;
  }).join('');
}
function expLabel(iso, rem){
  const today = new Date(); today.setHours(0,0,0,0);
  const d = Math.ceil((new Date(iso + 'T00:00:00') - today) / 86400000);
  const fmt = new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {day:'numeric', month:'short', year:'numeric'});
  if(d < 0) return 'Expired ' + fmt;
  if(rem && d <= rem) return 'Expires in ' + d + ' day' + (d===1?'':'s');
  return 'Expires ' + fmt;
}


/* ── Add Section — a custom section on this tender ───────────────────────── */
const SEC_SOURCES = [['','Uploads only (no library)'],['cover-pages','Cover Pages'],
  ['table-of-contents','Table of Contents'],['resumes','Resumes'],['case-studies','Case Studies'],
  ['policies','Policies'],['insurances','Insurances'],['certifications','Certifications'],
  ['organization-chart','Organisation Chart'],['others','Others']];

window.secOpen = (editKey) => {
  const s = editKey ? BT_SECS.find(x => x.k === editKey) : null;
  document.getElementById('secTitle').textContent = s ? 'Rename section' : 'Add section';
  document.getElementById('secName').value = s ? s.t : '';
  document.getElementById('secSrc').innerHTML = SEC_SOURCES
    .map(([v,n]) => `<option value="${v}"${s && s.src === v ? ' selected' : ''}>${n}</option>`).join('');
  document.getElementById('secSrc').disabled = !!s;      // changing the source of a filled section would orphan its files
  document.getElementById('secBtn').textContent = s ? 'Save' : 'Add Section';
  document.getElementById('secBtn').onclick = () => secConfirm(editKey);
  document.getElementById('secOv').classList.add('open');
  setTimeout(() => document.getElementById('secName').focus(), 30);
};
window.secClose = () => document.getElementById('secOv').classList.remove('open');
function secConfirm(editKey){
  const name = document.getElementById('secName').value.trim();
  if(!name){ showToast('Give the section a name'); return; }
  if(editKey){
    const s = BT_SECS.find(x => x.k === editKey);
    s.t = name; s.add = 'Add ' + name;
    secClose(); btRerender(); showToast('Section renamed');
    return;
  }
  const src = document.getElementById('secSrc').value;
  const k = 'sec-' + Date.now().toString(36);
  BT_SECS.push({k, t:name, add:'Add ' + name, src: src || null, custom:true});
  btOrder.push(k);
  secClose(); btRerender();
  // bring the new section into view
  const el = document.querySelector(`#btList .bt2-sec[data-k="${k}"]`);
  if(el) el.scrollIntoView({block:'nearest', behavior:'smooth'});
  showToast('Added section - ' + name);
}
window.secMenu = (ev, k) => {
  const s = BT_SECS.find(x => x.k === k);
  openMenu(ev, [
    {label:'Rename section', run:() => secOpen(k)},
    {label:'Remove section', run:() => {
      const n = (btAdded[k] || []).length;
      BT_SECS.splice(BT_SECS.indexOf(s), 1);
      btOrder = btOrder.filter(x => x !== k);
      delete btAdded[k];
      if(btSel && btSel.k === k) btSel = null;
      btRerender();
      showToast('Removed section' + (n ? ' and ' + n + ' document' + (n===1?'':'s') : ''));
    }},
  ]);
};
