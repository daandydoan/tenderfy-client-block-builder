/* ═══ Simple mode for cover pages and contents pages ═══════════════════════
   Live styles these in a modal. That made toggling to Advanced jump from a
   centred dialog to a full-screen editor, so the controls live here in the
   same shell the Document Builder uses: the shared header, the same three
   columns at the same widths, and the same A4 canvas rendered by the same
   paginator. Toggling now only swaps the left column.

   Every control, label and palette is still live's - Cover Font, Background
   Color (Vibrant / Earthy / custom), Text or Secondary Color, and the logo
   row - and both modes edit one document, so nothing is lost on the way over. */

let PS = null;

window.psOpen = (kind, id) => {
  const rec = kind === 'cover' ? (COVERS.find(c => c.id === id) || COVERS[0])
                               : (TOCS.find(t => t.id === id) || TOCS[0]);
  const doc = docFor(kind, rec.id);
  PS = {kind, rec, doc, back: kind === 'cover' ? '/file-manager/cover-pages' : '/file-manager/table-of-contents',
        orig: {primary: doc.brand.primary, secondary: doc.brand.secondary, font: doc.brand.font,
               bg: doc.docStyle.bg}};
  document.getElementById('ps').classList.add('open');
  psRenderAll();
};
window.psClose = () => { document.getElementById('ps').classList.remove('open'); PS = null; };
window.psExit  = () => exitEditor(PS.doc, PS.back, () => psClose(), window.psSave);
window.psSave  = () => {
  const {kind, rec, doc, back} = PS;
  // Push the style back onto the record the listing reads.
  if(kind === 'cover') Object.assign(rec, {bg:doc.brand.primary, tx:doc.brand.secondary, font:doc.brand.font});
  else                 Object.assign(rec, {bg:doc.brand.primary, sec:doc.brand.secondary, font:doc.brand.font});
  rec.doc = doc;
  doc.dirty = false;
  psClose(); go(back);
  showToast((kind === 'cover' ? 'Cover style saved' : 'Table of Contents style saved'));
};
window.psRevert = () => {
  Object.assign(PS.doc.brand, {primary:PS.orig.primary, secondary:PS.orig.secondary, font:PS.orig.font, bodyFont:PS.orig.font});
  PS.doc.docStyle.bg = PS.orig.bg;
  psSyncBg(); psRenderAll(); showToast('Reverted to the original style');
};
/* Advanced opens the same document in the builder - no reseed, no jump. */
window.psToAdvanced = () => {
  const {kind, doc, back, rec} = PS;
  psClose();
  dbOpen({doc, backRoute:back, sub: (kind === 'cover' ? 'Cover page' : 'Table of Contents') + ' - Advanced',
          onSave: d => { rec.doc = d; }});
};

/* The page fill follows the brand primary unless it has been set apart. */
function psSyncBg(){
  const d = PS.doc;
  if(PS.kind === 'cover') d.docStyle.bg = d.brand.primary;
  else d.docStyle.bg = isLight(d.brand.primary) ? '#FFFFFF' : d.brand.primary;
}
window.psPick = (which, v) => {
  const d = PS.doc;
  if(which === 'bg'){ d.brand.primary = v; psSyncBg(); if(d.bg.regions[0]) d.bg.regions[0].color = v; }
  else d.brand.secondary = v;
  markDirty(d); psRenderAll();
};
window.psHex = (which, v) => { if(/^#[0-9a-f]{6}$/i.test(v)) psPick(which, v); };
window.psFont = v => { PS.doc.brand.font = PS.doc.brand.bodyFont = v; markDirty(PS.doc); psRenderAll(); };
window.psDocStyle = (k, v) => { PS.doc.docStyle[k] = +v; markDirty(PS.doc); psRenderAll(); };

function psRenderAll(){ psHead(); psSide(); psStage(); psProps(); }

function psHead(){
  document.getElementById('psHead').innerHTML = edHeadHtml({
    doc: PS.doc, mode:'simple',
    sub: (PS.kind === 'cover' ? 'Cover page' : 'Table of Contents') + ' - Simple',
    exit:'psExit()', save:'psSave()',
    rename:"PS.doc.name=this.value;PS.rec.name=this.value;markDirty(PS.doc)",
  });
}
/* Left column: live's controls, in the palette's slot. */
function psSide(){
  const d = PS.doc, isCover = PS.kind === 'cover';
  const sw = (which, list, cur) => list.map(c =>
    `<span class="swb ${String(c).toLowerCase() === String(cur).toLowerCase() ? 'on' : ''}" style="background:${c}" onclick="psPick('${which}','${c}')" title="${c}"></span>`).join('');
  document.getElementById('psSide').innerHTML = `
    <div class="card">
      <h3 class="ed-h">${isCover ? 'Cover' : 'Table of Content'} Font</h3>
      <select class="selin" onchange="psFont(this.value)">
        ${STYLE_FONTS.map(f => `<option${f === d.brand.font ? ' selected' : ''}>${esc(f)}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <h3 class="ed-h">Background Color</h3>
      <div class="sub">Vibrant</div><div class="sws">${sw('bg', PAL_VIBRANT, d.brand.primary)}</div>
      <div class="sub">Earthy</div><div class="sws">${sw('bg', PAL_EARTHY, d.brand.primary)}</div>
      <div class="sub">Custom Background Color</div>
      <div class="hexwrap"><input class="hexin" value="${esc(d.brand.primary)}" oninput="psHex('bg',this.value)"><span class="ms">palette</span></div>
    </div>
    <div class="card">
      <h3 class="ed-h">${isCover ? 'Text' : 'Secondary'} Color</h3>
      <div class="sub">Vibrant</div><div class="sws">${sw('tx', PAL_VIBRANT, d.brand.secondary)}</div>
      <div class="sub">Earthy</div><div class="sws">${sw('tx', PAL_EARTHY, d.brand.secondary)}</div>
      <div class="sub">Custom ${isCover ? 'Text' : 'Secondary'} Color</div>
      <div class="hexwrap"><input class="hexin" value="${esc(d.brand.secondary)}" oninput="psHex('tx',this.value)"><span class="ms">palette</span></div>
    </div>
    <div class="card">
      <h3 class="ed-h">${isCover ? 'Cover' : 'Table of Content'} Logo</h3>
      <div class="logorow"><span class="fn">${esc(PS.rec.logoFile || PS.rec.logo || 'No logo')}</span>
        <span class="ms" data-toast="Replace the logo" title="Replace">edit</span>
        <span class="ms" data-toast="Remove the logo" title="Remove">delete</span></div>
    </div>`;
}
/* Middle: the same canvas and the same A4 pages the builder shows. */
function psStage(){
  const note = PS.kind === 'cover'
    ? 'Update key details such as title, date, and author when building your tender.'
    : 'The Table of Contents will dynamically populate as you build your tender. You can also edit it if needed';
  const host = document.getElementById('psCanvas');
  host.innerHTML = `<div class="vb-bar"><span class="ms" style="font-size:16px;color:var(--live-cta)">description</span>
      <span>${esc(PS.doc.name)}</span></div>
    <div class="note" style="width:620px;margin:0 auto 16px"><span class="ms">info</span> ${note}</div>
    <div class="vb-stage" id="psPages"></div>`;
  renderDocPages(document.getElementById('psPages'), PS.doc, {cls:'vb-page'});
}
/* Right: the same Properties panel Advanced shows, so it does not appear or
   disappear across the toggle. */
function psProps(){
  const ds = PS.doc.docStyle;
  const row = (k, label, min, max) => `
    <div class="ds-row"><label>${label}</label>
      <div class="ds-ctl"><input type="range" min="${min}" max="${max}" value="${ds[k]}" oninput="psDocStyle('${k}',this.value)">
        <span class="ds-u">${ds[k]}<i>px</i></span></div></div>`;
  document.getElementById('psRight').innerHTML = `
    <div class="card">
      <h3 class="ed-h">Style</h3>
      <div class="ds-row"><label>Fill</label><div class="ds-ctl">
        <input type="color" value="${esc(ds.bg)}" oninput="PS.doc.docStyle.bg=this.value;markDirty(PS.doc);psStage()">
        <input class="ds-hex" value="${esc(ds.bg).toUpperCase()}" oninput="if(/^#[0-9a-f]{6}$/i.test(this.value)){PS.doc.docStyle.bg=this.value;markDirty(PS.doc);psStage()}"></div></div>
      ${row('pad','Padding',0,80)}
      ${row('gap','Spacing',0,60)}
      ${row('rad','Radius',0,24)}
      <div class="fhint" style="margin-top:10px">Page-level styling. Switch to Advanced to add or rearrange blocks.</div>
    </div>
    <div class="card">
      <h3 class="ed-h">Reset</h3>
      <button class="lbtn danger" style="width:100%" onclick="psRevert()">Revert to Original</button>
    </div>`;
}
