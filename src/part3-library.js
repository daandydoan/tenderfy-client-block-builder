/* ── File Manager library data ───────────────────────────────────────────── */

const RESUMES = [
  {id:'r1', name:'Daniel Doan',  role:'Managing Director',        av:'#38988A', skills:['Email Marketing','Bid strategy'], layout:'left-panel', accent:'#38988A', status:'live',   by:'Andrew Williams', updated:'12 Jul 2026', pages:2},
  {id:'r2', name:'Priya Nair',   role:'Design Manager',           av:'#5C6BC0', skills:['Design coordination'],           layout:'top-band',   accent:'#2F6DF6', status:'live',   by:'Andrew Williams', updated:'04 Jul 2026', pages:2,
   data:{name:'Priya Nair', role:'Design Manager', contact:['priya.nair@example.com','+61 400 111 222','Brisbane, QLD'],
     summary:'Design manager coordinating multidisciplinary consultant teams across road, drainage and structures packages.',
     experience:[{t:'Design Manager - Tenderfy Civil', d:'2021-Present', b:'Coordinated 14 consultants across three concurrent D&C packages.'},{t:'Civil Designer - Harbour Civil', d:'2016-2021', b:'Detailed design for arterial upgrades and intersection works.'}],
     skills:['Design coordination','Civil 3D','Consultant management','Value engineering'],
     accreditations:['RPEQ - Civil','White Card - Construction Induction'], referees:['Available on request']}},
  {id:'r3', name:'Kenzie May',   role:'Site Supervisor',          av:'#EF6C00', skills:['Traffic control'],               layout:'minimal',    accent:'#B4530A', status:'draft',  by:'Kenzie May',      updated:'28 Jun 2026', pages:1,
   data:{name:'Kenzie May', role:'Site Supervisor', contact:['kenzie.may@example.com','+61 400 333 444','Ipswich, QLD'],
     summary:'Site supervisor with 9 years running civil crews on live traffic corridors and night-shift packages.',
     experience:[{t:'Site Supervisor - Tenderfy Civil', d:'2020-Present', b:'Ran night-shift crews of 18 on the Velocity Link extension.'}],
     skills:['Crew supervision','WHS & SWMS','Traffic control','Plant coordination'],
     accreditations:['White Card','Traffic Management Implementation'], referees:['Available on request']}},
  {id:'r4', name:'Sam Lee',      role:'Contracts Administrator',  av:'#6D4C41', skills:['Progress claims'],               layout:'timeline',   accent:'#8A46B8', status:'review', by:'Andrew Williams', updated:'21 Jun 2026', pages:2,
   data:{name:'Sam Lee', role:'Contracts Administrator', contact:['sam.lee@example.com','+61 400 555 666','Brisbane, QLD'],
     summary:'Contracts administrator managing subcontractor packages, variations and progress claims end to end.',
     experience:[{t:'Contracts Administrator - Tenderfy Civil', d:'2018-Present', b:'Administered 60+ subcontract packages worth $28M.'}],
     skills:['Subcontract packages','Progress claims','Variation management','AS 4000 / AS 2124'],
     accreditations:['Cert IV Building & Construction'], referees:['Available on request']}},
  {id:'r5', name:'AJ Jones',     role:'Estimator',                av:'#00838F', skills:['Cost planning'],                 layout:'minimal',    accent:'#0E7C86', status:'draft',  by:'AJ Jones',        updated:'18 Jun 2026', pages:1,
   data:{name:'AJ Jones', role:'Estimator', contact:['aj.jones@example.com','+61 400 777 888','Brisbane, QLD'],
     summary:'Estimator pricing civil and structures packages from first principles, with a focus on risk-adjusted rates.',
     experience:[{t:'Estimator - Tenderfy Civil', d:'2019-Present', b:'Priced $180M of submitted work at a 31% win rate.'}],
     skills:['First-principles estimating','Rate build-ups','Subcontractor comparison'],
     accreditations:['Cert IV Building & Construction'], referees:['Available on request']}},
  {id:'r6', name:'Jitender Balani', role:'Group General Manager', av:'#827717', skills:['Governance'],                    layout:'top-band',   accent:'#C0392B', status:'live',   by:'Andrew Williams', updated:'09 Jun 2026', pages:2,
   data:{name:'Jitender Balani', role:'Group General Manager', contact:['j.balani@example.com','+61 400 999 000','Sydney, NSW'],
     summary:'Group GM accountable for delivery, commercial performance and governance across three operating regions.',
     experience:[{t:'Group General Manager - Tenderfy Civil', d:'2017-Present', b:'Grew delivered revenue from $40M to $120M across three regions.'}],
     skills:['Governance','P&L ownership','Client relationships','Risk management'],
     accreditations:['MBA','RPEQ - Civil'], referees:['Available on request']}},
];

const CASE_STUDIES = [
  {id:'c1', title:'Velocity Link Highway Extension', client:'Dept of Transport & Main Roads', sector:'Civil Infrastructure', cats:'Conservation', layout:'hero',   accent:'#38988A', status:'live',   by:'Andrew Williams', updated:'14 Jul 2026', pages:3},
  {id:'c2', title:'Northside School Upgrade',        client:'Hansen Projects',                sector:'Education',            cats:'N/A',          layout:'split',  accent:'#2F6DF6', status:'live',   by:'Priya Nair',      updated:'02 Jul 2026', pages:2,
   data:Object.assign({}, CS_DATA, {title:'Northside School Upgrade', client:'Hansen Projects', sector:'Education', location:'Northside, QLD', value:'$4.8M', duration:'11 months', completed:'January 2026',
     challenge:'A two-storey teaching block had to be delivered inside a fully operational primary school, with all noisy works confined to holiday periods and a hard handover date before term one.',
     approach:'We compressed the structural programme into two school holiday blocks, used modular bathroom pods to remove wet-trade sequencing, and kept a dedicated liaison on site for the school executive.',
     outcome:'Handed over three days before term one with a defect list of eleven minor items, all closed within the first fortnight.',
     results:[{v:'3 days',l:'Early handover'},{v:'11',l:'Defects at PC'},{v:'0',l:'Complaints logged'},{v:'100%',l:'Term-time noise compliance'}],
     services:['Structural works','Modular fit-out','Services upgrade','Stakeholder liaison'],
     quote:'They understood that a school does not stop for a builder. Not one lesson was lost.', quoteBy:'Sam Lee - Business Manager, Hansen Projects'})},
  {id:'c3', title:'Civic Centre Redevelopment',      client:'Buildcorp QLD',                  sector:'Commercial',           cats:'Conservation', layout:'report', accent:'#B4530A', status:'draft',  by:'Andrew Williams', updated:'19 Jun 2026', pages:2,
   data:Object.assign({}, CS_DATA, {title:'Civic Centre Redevelopment', client:'Buildcorp QLD', sector:'Commercial', location:'Brisbane, QLD', value:'$9.1M', duration:'14 months', completed:'November 2025',
     challenge:'A heritage-listed civic hall required structural strengthening without altering the protected facade or interrupting the council chamber sitting calendar.',
     approach:'We worked from a heritage impact statement agreed up front, used internal moment frames instead of external bracing, and scheduled all chamber-adjacent works around the sitting roster.',
     outcome:'Full heritage compliance sign-off first time, and the chamber never lost a sitting day.',
     results:[{v:'0',l:'Sitting days lost'},{v:'1st',l:'Heritage sign-off pass'},{v:'2%',l:'Under budget'}],
     services:['Structural strengthening','Heritage compliance','Services upgrade'],
     quote:'The heritage approach was thought through before a single tool came out of the truck.', quoteBy:'Jordan Apex - Council Project Lead'})},
  {id:'c4', title:'City of Rockingham Foreshore',    client:'City of Rockingham',             sector:'Marine & Coastal',     cats:'Conservation', layout:'hero',   accent:'#0E7C86', status:'live',   by:'Priya Nair',      updated:'30 May 2026', pages:3,
   data:Object.assign({}, CS_DATA, {title:'City of Rockingham Foreshore', client:'City of Rockingham', sector:'Marine & Coastal', location:'Rockingham, WA', value:'$6.7M', duration:'9 months', completed:'April 2026',
     challenge:'Seawall renewal along an active public foreshore, with seagrass meadows inside the works footprint and beach access to be maintained through summer.',
     approach:'Marine works were sequenced outside the seagrass growth window, silt curtains were maintained daily, and a staged access plan kept two of three beach entries open at all times.',
     outcome:'Zero environmental non-conformances and no summer closure of the foreshore.',
     results:[{v:'0',l:'Environmental NCRs'},{v:'2 of 3',l:'Beach entries kept open'},{v:'100%',l:'Seagrass survival'}],
     services:['Marine construction','Seawall renewal','Environmental management'],
     quote:'The community barely noticed a major seawall renewal was under way. That is the highest praise we can give.', quoteBy:'Kenzie May - Coastal Asset Manager'})},
];

/* Cover pages — the live app keeps these under Tenders > Cover Pages. */
const COVERS = [
  {id:'cv1', name:'Bielby Cover - Logo Right',       font:'Tungsten-Narrow', bg:'#172E39', tx:'#B4D33B', logo:'right',  logoFile:'Tenderfy_Civil_logo.svg', status:'live'},
  {id:'cv2', name:'Bielby Cover - Logo Bottom Right',font:'Tungsten-Narrow', bg:'#1B2422', tx:'#FFBE0B', logo:'bottom', logoFile:'Tenderfy_Civil_logo.svg', status:'live'},
  {id:'cv3', name:'Bielby Cover',                    font:'Manrope',         bg:'#094074', tx:'#ACBDE3', logo:'right',  logoFile:'Tenderfy_Civil_logo.svg', status:'draft'},
];
const COVER_FONTS = ['Tungsten-Narrow','Manrope','Outfit','Inter','Poppins','Lora','Roboto'];
const PAL_VIBRANT = ['#FFBE0B','#FB5607','#DE0663','#8338EC','#3A86FF'];
const PAL_EARTHY  = ['#ACBDE3','#EF8354','#584A4B','#094074','#2C3232'];

/* Contents templates. Live styles each one through "Edit Table of Contents
   Style" - a font, a background and a secondary colour - so they carry the
   same three fields the dialog edits. */
const TOCS = [
  {id:'t1', name:'Standard Contents',            font:'Manrope', bg:'#2C3232', sec:'#38988A', logo:'Tenderfy_Civil_logo.svg', status:'live',  by:'Andrew Williams', updated:'11 Jul 2026'},
  {id:'t2', name:'Standard Contents - Light',    font:'Manrope', bg:'#F7F9F8', sec:'#38988A', logo:'Tenderfy_Civil_logo.svg', status:'live',  by:'Andrew Williams', updated:'11 Jul 2026'},
  {id:'t3', name:'Detailed Contents (numbered)', font:'Outfit',  bg:'#094074', sec:'#ACBDE3', logo:'Tenderfy_Civil_logo.svg', status:'draft', by:'Priya Nair',      updated:'26 Jun 2026'},
  {id:'t4', name:'Contents - Accent',            font:'Poppins', bg:'#584A4B', sec:'#EF8354', logo:'Tenderfy_Civil_logo.svg', status:'live',  by:'Priya Nair',      updated:'26 Jun 2026'},
];
// Live's font picker lists 90 families; these are the head of that list.
const STYLE_FONTS = ['Manrope-Regular','Roboto','Open Sans','Lato','Montserrat','Oswald','Raleway','Poppins',
  'Merriweather','Nunito','PT Sans','Playfair Display','Noto Sans','Roboto Condensed','Ubuntu','Rubik',
  'Work Sans','Inter','Source Sans Pro','Quicksand','Josefin Sans','Karla','Fira Sans','Mulish','Cabin',
  'DM Sans','Anton','Bebas Neue','Comfortaa','Lora','Outfit','Manrope','Tungsten-Narrow'];

const OTHER_DOCS = {
  policies:[
    {t:'WHS Policy 2026', tag:'PDF', pages:4, by:'Andrew Williams', updated:'02 Jul 2026', desc:'Work Health &amp; Safety Policy - Tenderfy Civil Pty Ltd. Sets out responsibilities, consultation arrangements and the hazard management framework applied on every site&hellip;'},
    {t:'Environmental Policy', tag:'PDF', pages:3, by:'Andrew Williams', updated:'02 Jul 2026', desc:'Commitment to environmental protection, waste minimisation and compliance with the Environmental Protection Act on all works&hellip;'},
    {t:'Quality Management Policy', tag:'DOCX', pages:2, by:'Priya Nair', updated:'18 Jun 2026', desc:'Quality objectives, ITP framework and non-conformance handling aligned to ISO 9001:2015&hellip;'},
    {t:'Drug &amp; Alcohol Policy', tag:'PDF', pages:2, by:'Kenzie May', updated:'11 Jun 2026', desc:'Testing regime, thresholds and rehabilitation pathway for all site-based personnel and subcontractors&hellip;'},
  ],
  insurances:[
    {t:'Public Liability Insurance', tag:'PDF', pages:3, by:'Andrew Williams', updated:'01 Jul 2026', exp:'2026-09-30', rem:30, desc:'Certificate of Currency - Public Liability. Insured: Tenderfy Civil Pty Ltd. Limit of liability: $20,000,000 any one occurrence&hellip;'},
    {t:'Workers Comp Certificate', tag:'PDF', pages:2, by:'Andrew Williams', updated:'01 Jul 2026', exp:'2026-09-05', rem:30, desc:'Confirms a current workers&rsquo; compensation policy under the Workers&rsquo; Compensation and Rehabilitation Act&hellip;'},
    {t:'Professional Indemnity', tag:'PDF', pages:2, by:'Andrew Williams', updated:'01 Jul 2026', exp:'2027-02-28', rem:60, desc:'Professional Indemnity cover to $10,000,000 for design and construct obligations&hellip;'},
    {t:'Plant &amp; Equipment Cover', tag:'PDF', pages:1, by:'Kenzie May', updated:'22 Jun 2026', exp:'2026-08-31', rem:30, desc:'Mobile plant and contractors&rsquo; equipment cover, scheduled items to $2,400,000&hellip;'},
  ],
  certifications:[
    {t:'QBCC Contractor Licence', tag:'PDF', pages:1, by:'Andrew Williams', updated:'20 May 2026', exp:'2027-05-20', rem:60, desc:'Licence No. QLD 000 749-0. Class: Civil &amp; Traffic Management. Authorised to carry out the classes of work listed&hellip;'},
    {t:'ISO 9001:2015 Certificate', tag:'PDF', pages:2, by:'Priya Nair', updated:'14 Apr 2026', exp:'2027-04-14', rem:60, desc:'Certified quality management system covering civil construction and infrastructure delivery&hellip;'},
    {t:'ISO 45001 Certificate', tag:'PDF', pages:2, by:'Priya Nair', updated:'14 Apr 2026', exp:'2027-04-14', rem:60, desc:'Certified occupational health and safety management system, scope: civil construction&hellip;'},
    {t:'White Card - K. May', tag:'PDF', pages:1, by:'Kenzie May', updated:'15 Jan 2026', exp:'2027-01-15', rem:60, desc:'General Construction Induction Card No. 0048213 issued under the Work Health and Safety Regulation&hellip;'},
  ],
  'organization-chart':[
    {t:'Company Org Chart 2026', tag:'PDF', pages:1, by:'Andrew Williams', updated:'09 Jul 2026', desc:'Board, executive, delivery and support functions with reporting lines for Tenderfy Civil Pty Ltd&hellip;'},
    {t:'Project Org Chart - Velocity Link', tag:'DOCX', pages:1, by:'Priya Nair', updated:'27 Jun 2026', desc:'Project-specific structure: project director, PM, design manager, site supervision and subcontract interfaces&hellip;'},
  ],
  others:[
    {t:'Capability Statement 2026', tag:'PDF', pages:8, by:'Andrew Williams', updated:'12 Jul 2026', desc:'Company profile, key personnel, plant and equipment schedule, recent projects and referees for Tenderfy Civil Pty Ltd&hellip;'},
    {t:'Plant &amp; Equipment Schedule', tag:'XLSX', pages:3, by:'Kenzie May', updated:'30 Jun 2026', desc:'Owned and hired plant with capacities, service status and current allocation by project&hellip;'},
    {t:'Referee List', tag:'DOCX', pages:1, by:'Andrew Williams', updated:'12 Jun 2026', desc:'Nominated client referees with role, project and contact details, refreshed each quarter&hellip;'},
    {t:'Sustainability Statement', tag:'PDF', pages:4, by:'Priya Nair', updated:'05 Jun 2026', desc:'Emissions reduction targets, recycled material commitments and reporting method for tender responses&hellip;'},
  ],
};

const ACCENTS = ['#38988A','#1D9E75','#2F6DF6','#B4530A','#8A46B8','#C0392B','#0E7C86'];
const FONTS = ['Outfit','Manrope','Inter','Poppins','Lora','Roboto'];
const STATUS_LABEL = {live:'Live', draft:'Draft', review:'In review'};

const FM_META = {
  'cover-pages':      {name:'Cover Pages',        sing:'Cover Page',    crumb:['Tenders','Cover Pages']},
  'table-of-contents':{name:'Table of Contents',  sing:'Contents',      crumb:['Tenders','Table of Contents']},
  'resumes':          {name:'Resumes',            sing:'Resume',        crumb:['File manager','Resumes']},
  'case-studies':     {name:'Case Studies',       sing:'Case Study',    crumb:['File manager','Case Studies']},
  'policies':         {name:'Policies',           sing:'Policy',        crumb:['File manager','Policies']},
  'insurances':       {name:'Insurances',         sing:'Insurance',     crumb:['File manager','Insurances']},
  'certifications':   {name:'Certifications',     sing:'Certification', crumb:['File manager','Certifications']},
  'organization-chart':{name:'Organisation Chart',sing:'Org Chart',     crumb:['File manager','Organisation Chart']},
  'others':           {name:'Others',             sing:'Other',         crumb:['File manager','Others']},
};

/* ── Router ──────────────────────────────────────────────────────────────── */

const ROUTES = [
  {path:'/dashboard',                                      crumb:['Dashboard'],                title:'Dashboard',    render:()=>pgStub('Dashboard','desktop_mac','Revenue, active tenders and team activity live here in the real app.')},
  {path:'/tenders',                                        crumb:['Tenders'],                  title:'Tenders',      render:pgTenders, key:1},
  {path:'/tenders/tender-details/',                        crumb:['Tenders','Tender Details'], title:'Tender Details', render:pgTenderDetail, key:1},
  {path:'/tenders/build-tender/',                          crumb:['Tenders','Tender Details','Build Tender'], title:'Build Tender', render:pgBuildTender, key:1},
  {path:'/responses',                                      crumb:['Responses'],                title:'Responses',    render:()=>pgStub('Responses','chat','Subcontractor quote responses against each tender.')},
  {path:'/file-manager/cover-pages',                       crumb:['Tenders','Cover Pages'],    title:'Cover Pages',  render:()=>pgLibrary('cover-pages'), key:1},
  {path:'/file-manager/cover-pages/edit/',                 crumb:['Tenders','Cover Pages','Cover Page Builder'], title:'Cover Page Builder', render:pgCoverEdit, key:1},
  {path:'/file-manager/table-of-contents',                 crumb:['Tenders','Table of Contents'], title:'Table of Contents', render:()=>pgLibrary('table-of-contents')},
  {path:'/file-manager/table-of-contents/edit/',           crumb:['Tenders','Table of Contents','Contents Builder'], title:'Contents Builder', render:pgTocEdit, key:1},
  {path:'/file-manager/resumes',                           crumb:['File manager','Resumes'],   title:'Resumes',      render:()=>pgLibrary('resumes'), key:1},
  {path:'/file-manager/resumes/resume-preview/',            crumb:['File manager','Resumes','Resume Details'], title:'Resume Preview', render:pgResumePreview, key:1},
  {path:'/file-manager/resumes/add-resume',                crumb:['File manager','Resumes','Add New Resume'], title:'Add Resume', render:pgAddResume, key:1},
  {path:'/file-manager/case-studies',                      crumb:['File manager','Case Studies'], title:'Case Studies', render:()=>pgLibrary('case-studies'), key:1},
  {path:'/file-manager/case-studies/case-study/',          crumb:['File manager','Case Studies','Case Study'], title:'Case Study', render:pgCaseStudyView, key:1},
  {path:'/file-manager/case-studies/add-edit-case-study/', crumb:['File manager','Case Studies','Add/Edit Case Study'], title:'Add/Edit Case Study', render:pgCaseStudyEdit, key:1},
  {path:'/file-manager/policies',                          crumb:['File manager','Policies'],  title:'Policies',     render:()=>pgLibrary('policies')},
  {path:'/file-manager/insurances',                        crumb:['File manager','Insurances'],title:'Insurances',   render:()=>pgLibrary('insurances')},
  {path:'/file-manager/certifications',                    crumb:['File manager','Certifications'], title:'Certifications', render:()=>pgLibrary('certifications')},
  {path:'/file-manager/organization-chart',                crumb:['File manager','Organisation Chart'], title:'Organisation Chart', render:()=>pgLibrary('organization-chart')},
  {path:'/file-manager/others',                            crumb:['File manager','Others'],    title:'Others',       render:()=>pgLibrary('others')},
  {path:'/file-manager/block-library',                     crumb:['File manager','Block Library'],   title:'Block Library',    render:pgBBBlocks, key:1},
  {path:'/manage-staff',                                   crumb:['Manage Staff','Staff Management'], title:'Staff Management', render:()=>pgStub('Staff Management','contacts','Staff records, roles and access.')},
  {path:'/manage-staff/role-management',                   crumb:['Manage Staff','Role Management'],  title:'Role Management',  render:()=>pgStub('Role Management','manage_accounts','Permission sets for each role.')},
];

function currentPath(){
  const h = location.hash.replace(/^#/, '');
  const p = h.split('?')[0] || '/tenders';
  return ROUTES.some(r => r.path === p) ? p : '/tenders';
}
function q(name){
  const h = location.hash.replace(/^#/, '');
  return new URLSearchParams(h.split('?')[1] || '').get(name);
}
function go(path){ location.hash = path; }
window.go = go;

function renderRoute(){
  const path = currentPath();
  // A dialog belongs to the screen that opened it — never let one outlive a
  // route change (e.g. the create-case-study chooser hanging over Build Tender).
  document.querySelectorAll('.ov.open').forEach(o => o.classList.remove('open'));
  closeMenu();
  const r = ROUTES.find(x => x.path === path);
  renderNav(path);
  document.getElementById('crumb').innerHTML =
    '<span class="ms fill">home</span>' +
    r.crumb.map(c => `<span>${esc(c)}</span>`).join('<span class="sep">&#x25CF;</span>');
  document.getElementById('rtCur').textContent = r.path;
  document.getElementById('rtMenu').innerHTML =
    '<div class="hd">Recreated pages</div>' +
    ROUTES.filter(x => x.key).map(x => `<a href="#${x.path}" class="${x.path===path?'on':''}" onclick="document.getElementById('rt').classList.remove('open')"><b>${esc(x.title)}</b><code>${esc(x.path)}</code></a>`).join('');
  document.getElementById('view').innerHTML = r.render();
  document.getElementById('view').scrollTop = 0;
  if(path === '/tenders/build-tender/') btWireDrag();
}
window.addEventListener('hashchange', renderRoute);

function pgStub(title, icon, note){
  return `<div class="phead"><div class="h">${esc(title)}</div></div>
    <div class="pbody"><div class="stub"><span class="ms">${icon}</span><b>${esc(title)}</b>${esc(note)}<br><span style="font-size:13px">Not part of this recreation.</span></div></div>`;
}
