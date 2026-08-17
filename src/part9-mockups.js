/* ═══ Mocked surfaces, copied from the live app ════════════════════════════
   Presentation only — nothing computes. Everything here was read off
   stgbusinessadmin.tenderfy.org; where a screen could not be reached, the
   action toasts rather than showing invented content.                        */

/* ── Ray — the Tenderfy Co-Pilot. Live shows a 423x576 panel pinned 24px from
   the bottom-right, holding one greeting message and a View Responses button.
   There is no message input yet. Text is verbatim from live. ─────────────── */
const RAY_GREETING = [
  `\u{1F44B} Hello! I'm Ray — your Tenderfy Co-Pilot.`,
  `I can help you review tender documents and extract key information. Click <b>"Review All"</b> or use the three dots in the menu to review documents for a specific tender.`,
  `I'll automatically pull out questions and answers to start building your <b>Response Library</b> — making it easier to reuse quality content across future bids.`,
];
window.rayOpen = () => {
  document.getElementById('rayBody').innerHTML = `
    <div class="ray-msg">
      <span class="ray-ava"><img src="${RAY_IMG}" alt=""></span>
      <div class="ray-bubble">${RAY_GREETING.map(p => `<p>${p}</p>`).join('')}
        <button class="lbtn pri sm ray-cta" data-toast="Response Library - mocked for this prototype">View Responses</button>
      </div>
    </div>`;
  document.getElementById('rayPanel').classList.add('open');
  document.getElementById('rayFab').style.display = 'none';
};
window.rayClose = () => {
  document.getElementById('rayPanel').classList.remove('open');
  document.getElementById('rayFab').style.display = '';
};

/* ── Tender row menu. Verified on live: AI Review / View Time / Add Reminder /
   Delete Tender. Folder menu: Edit / Delete. ────────────────────────────── */
window.tenderMenu = (ev, name) => {
  ev.stopPropagation();
  openMenu(ev, [
    {label:'AI Review',     run:() => rayOpen()},
    {label:'View Time',     run:() => timeSheet()},
    {label:'Add Reminder',  run:() => showToast('Add Reminder - opens the reminder dialog on live')},
    {label:'Delete Tender', run:() => {
      const i = TENDERS.findIndex(t => t.name === name);
      if(i >= 0){ TENDERS.splice(i, 1); renderRoute(); showToast('Deleted "' + name + '"'); }
    }},
  ]);
};
window.folderMenu = (ev, name) => {
  ev.stopPropagation();
  openMenu(ev, [
    {label:'Edit',   run:() => showToast('Edit folder - ' + name)},
    {label:'Delete', run:() => showToast('Delete folder - ' + name)},
  ]);
};

/* ── Time Sheet. Live shows EMPLOYEE / TIME SPENT with no rows recorded and a
   total of 00h 00m, so this shows the same empty state. ─────────────────── */
function timeSheet(){
  document.getElementById('tsOv').classList.add('open');
}
window.tsClose = () => document.getElementById('tsOv').classList.remove('open');

// Paint Ray's artwork into the chrome once the assets are in scope.
(function(){
  const set = (id, src) => { const el = document.getElementById(id); if(el) el.src = src; };
  set('rayFabImg', RAY_IMG);
  set('rayHeadImg', RAY_IMG);
  set('rayToolImg', RAY_TOOLBAR_IMG);
})();
