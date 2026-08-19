/* ═══════════════════════════════════════════════════════════════════════════
   Tenderfy Business Admin — page recreations + Block Builder (advanced editor)

   Chrome, sidebar IA, Build Tender and the Edit Cover Style dialog are matched
   to the live app at stgbusinessadmin.tenderfy.org (read in-browser).
   The Block Builder is ported from the tenderfy-admin prototype
   (blocks-data.js / primitives.js / block-layouts.js) and wired in as the
   *advanced* mode of the same editor the live Simple mode already offers.
   ═══════════════════════════════════════════════════════════════════════════ */

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money = n => '$' + Number(n).toLocaleString('en-AU', {minimumFractionDigits:2, maximumFractionDigits:2});

let __toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-toast]');
  if(el){ e.preventDefault(); showToast(el.getAttribute('data-toast')); }
  if(!e.target.closest('#menu')) closeMenu();
});

/* ── Context menu ────────────────────────────────────────────────────────── */
function openMenu(ev, items){
  ev.preventDefault(); ev.stopPropagation();
  const m = document.getElementById('menu');
  m.innerHTML = items.map((it,i) => `<a data-i="${i}">${esc(it.label)}</a>`).join('');
  m.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
    e.stopPropagation(); closeMenu(); items[+a.dataset.i].run();
  }));
  m.classList.add('open');
  const r = ev.target.getBoundingClientRect();
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.min(r.left, innerWidth - w - 10) + 'px';
  m.style.top  = (r.bottom + h > innerHeight ? r.top - h : r.bottom + 4) + 'px';
}
function closeMenu(){ document.getElementById('menu').classList.remove('open'); }

/* ── Sidebar IA — read from the live app ─────────────────────────────────── */
const NAV = [
  {icon:'desktop_mac',       label:'Dashboard',    href:'/dashboard'},
  {icon:'domain',            label:'Tenders',      kids:[
    {label:'All Tenders',       href:'/tenders'},
    {label:'Cover Pages',       href:'/file-manager/cover-pages'},
    {label:'Table of Contents', href:'/file-manager/table-of-contents'},
  ]},
  {icon:'chat',              label:'Responses',    href:'/responses'},
  {icon:'insert_drive_file', label:'File manager', kids:[
    {label:'Resumes',            href:'/file-manager/resumes'},
    {label:'Case Studies',       href:'/file-manager/case-studies'},
    {label:'Policies',           href:'/file-manager/policies'},
    {label:'Insurances',         href:'/file-manager/insurances'},
    {label:'Certifications',     href:'/file-manager/certifications'},
    {label:'Organisation Chart', href:'/file-manager/organization-chart'},
    {label:'Others',             href:'/file-manager/others'},
    {label:'Block Library',      href:'/file-manager/block-library'},
  ]},
  {icon:'contacts',          label:'Manage Staff', kids:[
    {label:'Staff Management', href:'/manage-staff'},
    {label:'Role Management',  href:'/manage-staff/role-management'},
  ]},
];
function renderNav(path){
  const inGrp = g => g.kids && g.kids.some(k => path.startsWith(k.href));
  document.getElementById('lnav').innerHTML = NAV.map(g => {
    if(!g.kids){
      return `<a class="lrow ${path===g.href?'on':''}" href="#${g.href}"><span class="ms fill">${g.icon}</span><span class="lbl">${esc(g.label)}</span></a>`;
    }
    return `<div><div class="lrow ${inGrp(g)?'on':''}" onclick="go('${g.kids[0].href}')"><span class="ms fill">${g.icon}</span><span class="lbl">${esc(g.label)}</span></div>
      <div class="lgrp">${g.kids.map(k => `<a class="lsub ${path===k.href||path.startsWith(k.href+'/')?'on':''}" href="#${k.href}">${esc(k.label)}</a>`).join('')}</div></div>`;
  }).join('');
}

/* ── Data ────────────────────────────────────────────────────────────────── */

const TENDERS = [
  {name:'Harbourview Stage 2 Civil Works',   org:'Harbourview Housing',     contact:'Elena Vasquez', who:'Jordan Avery', pri:'High',   st:'In progress', due:'12/09/2026'},
  {name:'Lakeside Foreshore Renewal',        org:'Lakeside Council',        contact:'Tom Brennan',   who:'Morgan Ellis', pri:'High',   st:'Pending',     due:'26/09/2026'},
  {name:'Northern Arterial Upgrade',         org:'State Roads Authority',   contact:'Priya Raman',   who:'Jordan Avery', pri:'High',   st:'In progress', due:'03/10/2026'},
  {name:'Halewood Depot Expansion',          org:'Halewood Group',          contact:'Chris Nolan',   who:'Riley Chen',   pri:'Medium', st:'Pending',     due:'17/10/2026'},
  {name:'Riverbend Drainage Package',        org:'Lakeside Council',        contact:'Tom Brennan',   who:'Morgan Ellis', pri:'Medium', st:'Pending',     due:'24/10/2026'},
  {name:'Civic Centre Redevelopment',        org:'Lakeside Council',        contact:'Dana Whitfield',who:'Jordan Avery', pri:'High',   st:'Submitted',   due:'08/08/2026'},
  {name:'Southgate School Refurbishment',    org:'Halewood Group',          contact:'Chris Nolan',   who:'Casey Brooks', pri:'Low',    st:'Pending',     due:'14/11/2026'},
  {name:'Westfield Interchange Works',       org:'State Roads Authority',   contact:'Priya Raman',   who:'Riley Chen',   pri:'Medium', st:'In progress', due:'21/11/2026'},
  {name:'Parkside Amenities Block',          org:'Lakeside Council',        contact:'Dana Whitfield',who:'Casey Brooks', pri:'Low',    st:'Pending',     due:'05/12/2026'},
  {name:'Harbourview Stage 3 Early Works',   org:'Harbourview Housing',     contact:'Elena Vasquez', who:'Morgan Ellis', pri:'Medium', st:'Pending',     due:'19/12/2026'},
];
const PRI = {High:'pri-high', Medium:'pri-med', Low:'pri-low'};
const ST  = {'Pending':'st-pending','In progress':'st-progress','In review':'st-review'};

const QUOTES = [
  {sub:'Northolt Construction', av:'NC', color:'#38988A', trade:'Traffic Management', total:11290, status:'Quote submitted', badge:'b-submitted',
   incl:['GST (10%)','After-hours loading 1.5x','Plant within labour rates'],
   excl:['ROL coordination fees - variation +15%','Permits & approvals'],
   assum:['Rev 3 drawings (1 Mar 2026)','Clear site access','Power & water on site']},
  {sub:'Redgum Traffic Traffic', av:'IT', color:'#795548', trade:'Traffic Management', total:10850, status:'Quote updated', badge:'b-updated',
   incl:['GST (10%)','Weekend rates','Signage & devices','Permits & approvals'], excl:['After-hours work'],
   assum:['Single mobilisation','Prices valid 30 days']},
  {sub:'Metro Civil', av:'MS', color:'#5C6BC0', trade:'Civil Works', total:12400, status:'Quote submitted', badge:'b-submitted',
   incl:['GST (10%)','Traffic control'], excl:['Rock excavation','Dewatering','Service relocations'],
   assum:['Standard hours','Materials at current market rates']},
  {sub:'Apex Civil Group', av:'AC', color:'#00838F', trade:'Civil Works', total:13100, status:'Accepted', badge:'b-accepted',
   incl:['GST (10%)','Plant & equipment','Permits & approvals','After-hours','Site cleanup'], excl:[],
   assum:['Rev 3 drawings (1 Mar 2026)']},
  {sub:'Buildcorp QLD', av:'BQ', color:'#6D4C41', trade:'Demolition', total:9980, status:'Not awarded', badge:'b-notawarded',
   incl:['GST (10%)','Disposal fees'], excl:['Asbestos removal','Site remediation','Out-of-hours work'],
   assum:['Asbestos-free site','Access via main gate']},
];
