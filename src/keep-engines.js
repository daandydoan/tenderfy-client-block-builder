/* ── Resume engine (ported from tenderfy-admin/resume-render.js) ─────────── */

const RESUME_BRAND_DEFAULT = {primary:'#27535C', secondary:'#38988A', background:'#F7F9F8', font:'Outfit', bodyFont:'Outfit'};
const RESUME_DATA = {
  name:'Jordan Avery', role:'Senior Project Manager',
  contact:['jordan.avery@example.com','+61 400 000 000','Sydney, NSW'],
  summary:'Delivery-focused project manager with 12+ years leading civil and commercial construction projects from tender through to handover.',
  experience:[
    {t:'Senior Project Manager · Northwind Constructions', d:'2019–Present', b:'Led $40M+ infrastructure packages; managed multidisciplinary teams of 30+.'},
    {t:'Project Manager · Harbour Civil', d:'2014–2019', b:'Delivered road and drainage upgrades on time and 6% under budget.'},
  ],
  skills:['Programme & cost control','Stakeholder management','WHS & compliance','Tender & bid strategy','Contract administration'],
  accreditations:['RPEQ · Registered Professional Engineer','White Card · Construction Induction','PRINCE2 Practitioner'],
  referees:['Available on request'],
};
const RESUME_SECTIONS = [
  {id:'profile',        name:'Profile Picture', icon:'account_circle'},
  {id:'contact',        name:'Contact',         icon:'contact_mail'},
  {id:'summary',        name:'Summary',         icon:'notes'},
  {id:'experience',     name:'Experience',      icon:'work_history'},
  {id:'skills',         name:'Skills',          icon:'star'},
  {id:'accreditations', name:'Accreditations',  icon:'verified'},
  {id:'referees',       name:'Referees',        icon:'contact_page'},
];
const RESUME_SECTION_NAME = Object.fromEntries(RESUME_SECTIONS.map(s => [s.id, s.name]));
const RESUME_SECTION_ICON = Object.fromEntries(RESUME_SECTIONS.map(s => [s.id, s.icon]));

const RESUME_LAYOUTS = (function(){
  const sk = (w,h,d) => `<div class="sk${d?' d':''}" style="width:${w};height:${h||'6px'}"></div>`;
  return [
    {id:'left-panel', name:'Left Panel', desc:'Coloured sidebar beside a main column.',
     regions:[{id:'sidebar',name:'Sidebar'},{id:'main',name:'Main column'}],
     defaults:{sidebar:['profile','contact','skills'], main:['summary','experience','accreditations','referees']},
     thumb:`<div style="width:34%;background:#9fb2ac;border-radius:4px;padding:6px;display:flex;flex-direction:column;gap:5px">${sk('80%','8px',1)+sk('100%')+sk('90%')+sk('70%')}</div><div style="flex:1;padding:6px;display:flex;flex-direction:column;gap:5px">${sk('70%','9px',1)+sk('100%')+sk('96%')+sk('88%')+sk('60%')}</div>`},
    {id:'top-band', name:'Header Band', desc:'Brand band over two columns.',
     regions:[{id:'left',name:'Left column'},{id:'right',name:'Right column'}],
     defaults:{left:['summary','experience'], right:['profile','contact','skills','accreditations']},
     thumb:`<div style="width:100%;display:flex;flex-direction:column;gap:5px"><div style="height:24px;background:#9fb2ac;border-radius:4px"></div><div style="flex:1;display:flex;gap:5px"><div style="flex:1;display:flex;flex-direction:column;gap:4px">${sk('90%')+sk('80%')+sk('86%')}</div><div style="flex:1;display:flex;flex-direction:column;gap:4px">${sk('84%')+sk('92%')+sk('70%')}</div></div></div>`},
    {id:'timeline', name:'Timeline', desc:'Centered header over a single column.',
     regions:[{id:'body',name:'Body'}],
     defaults:{body:['contact','summary','experience','skills','accreditations']},
     thumb:`<div style="width:100%;display:flex;flex-direction:column;gap:6px;align-items:center;padding:4px">${sk('56%','9px',1)}<div style="width:100%;border-left:2px solid #9fb2ac;padding-left:8px;display:flex;flex-direction:column;gap:6px;margin-top:2px">${sk('80%')+sk('66%')+sk('74%')}</div></div>`},
    {id:'minimal', name:'Minimal', desc:'Clean single column.',
     regions:[{id:'body',name:'Body'}],
     defaults:{body:['profile','contact','summary','experience','skills','accreditations']},
     thumb:`<div style="width:100%;padding:6px;display:flex;flex-direction:column;gap:6px">${sk('60%','9px',1)+sk('100%')+sk('94%')+sk('88%')+sk('96%')+sk('70%')}</div>`},
  ];
})();

function resumeInitials(name){ return (String(name||'').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2) || '—').toUpperCase(); }

function resumeSection(id, b, o){
  o = o || {};
  const data = o.data || RESUME_DATA, dark = !!o.dark, D = o.density || 1;
  const H = `font-family:'${b.font}',sans-serif`, T = `font-family:'${b.bodyFont}',sans-serif`;
  const body = dark ? 'rgba(255,255,255,.9)' : '#3A4442';
  const acc  = dark ? 'rgba(255,255,255,.85)' : b.secondary;
  const title = t => dark
    ? `<div style="${H};color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;opacity:.9;margin:${Math.round(16*D)}px 0 ${Math.round(8*D)}px">${t}</div>`
    : `<div style="${H};color:${b.primary};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid ${b.secondary};padding-bottom:4px;margin:${Math.round(18*D)}px 0 ${Math.round(9*D)}px">${t}</div>`;
  switch(id){
    case 'profile': {
      const ini = o.logoInitials || resumeInitials(data.name), sz = dark ? 66 : 92;
      return `<div style="display:flex;justify-content:${dark?'flex-start':'center'};margin:${dark?'2px 0 6px':'0 0 16px'}"><div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${dark?'rgba(255,255,255,.16)':b.secondary+'22'};border:2px solid ${dark?'rgba(255,255,255,.55)':b.secondary};display:flex;align-items:center;justify-content:center;${H};font-weight:700;font-size:${Math.round(sz/2.6)}px;color:${dark?'#fff':b.primary}">${esc(ini)}</div></div>`;
    }
    case 'contact':
      return title('Contact')+`<div style="${T};font-size:${dark?11:12}px;color:${body};display:flex;flex-direction:column;gap:4px">${data.contact.map(c=>`<span>${esc(c)}</span>`).join('')}</div>`;
    case 'summary':
      return title('Summary')+`<div style="${T};font-size:12.5px;color:${body};line-height:1.55">${esc(data.summary)}</div>`;
    case 'experience':
      if(o.timeline) return title('Experience')+`<div style="border-left:2px solid ${b.secondary};padding-left:16px;margin-top:2px">${data.experience.map(e=>`<div style="position:relative;margin-bottom:14px"><span style="position:absolute;left:-23px;top:3px;width:10px;height:10px;border-radius:50%;background:${b.secondary};border:2px solid #fff;box-shadow:0 0 0 2px ${b.secondary}"></span><div style="${H};font-weight:700;font-size:12.5px;color:${dark?'#fff':'#26332F'}">${esc(e.t)}</div><div style="${T};font-size:11px;color:${acc};font-weight:600;margin:1px 0 3px">${esc(e.d)}</div><div style="${T};font-size:12px;color:${body};line-height:1.5">${esc(e.b)}</div></div>`).join('')}</div>`;
      return title('Experience')+data.experience.map(e=>`<div style="margin-bottom:11px"><div style="${H};font-weight:700;font-size:12.5px;color:${dark?'#fff':'#26332F'}">${esc(e.t)}</div><div style="${T};font-size:11px;color:${acc};font-weight:600;margin:1px 0 3px">${esc(e.d)}</div><div style="${T};font-size:12px;color:${body};line-height:1.5">${esc(e.b)}</div></div>`).join('');
    case 'skills':
      if(dark) return title('Skills')+data.skills.map(s=>`<div style="${T};font-size:11.5px;color:rgba(255,255,255,.9);padding:2px 0">${esc(s)}</div>`).join('');
      return title('Skills')+`<div style="display:flex;flex-wrap:wrap;gap:6px">${data.skills.map(s=>`<span style="${T};font-size:11.5px;background:${b.background};color:#3A4442;border:1px solid ${b.secondary}44;border-radius:100px;padding:3px 10px">${esc(s)}</span>`).join('')}</div>`;
    case 'accreditations':
      return title('Accreditations')+data.accreditations.map(a=>`<div style="${T};font-size:12px;color:${body};padding:3px 0;display:flex;gap:7px"><span class="ms" style="font-size:15px;color:${acc}">verified</span>${esc(a)}</div>`).join('');
    case 'referees':
      return title('Referees')+`<div style="${T};font-size:12px;color:${body}">${esc(data.referees.join(', '))}</div>`;
    default: return '';
  }
}

function renderResume(opts){
  opts = opts || {};
  const layoutId = opts.layout || 'left-panel';
  const lay = RESUME_LAYOUTS.find(l => l.id === layoutId) || RESUME_LAYOUTS[0];
  const b = opts.brand || RESUME_BRAND_DEFAULT;
  const data = opts.data || RESUME_DATA;
  const H = `font-family:'${b.font}',sans-serif`, T = `font-family:'${b.bodyFont}',sans-serif`;
  let placement = opts.placement;
  if(!placement){
    placement = {};
    Object.keys(lay.defaults).forEach(r => { placement[r] = lay.defaults[r].slice(); });
  }
  const D = opts.density || 1;
  const p = (...vals) => vals.map(v => Math.round(v*D)).join('px ') + 'px';
  const sec = (id, o) => resumeSection(id, b, Object.assign({data, logoInitials:opts.logoInitials, density:D}, o||{}));
  const reg = (r, o) => (placement[r]||[]).map(id => sec(id, o)).join('');

  if(layoutId === 'left-panel'){
    return `<div style="display:flex;${T}">
      <div style="width:210px;background:${b.primary};color:#fff;padding:${p(26,20)};min-height:877px">
        <div style="${H};font-size:20px;font-weight:700;line-height:1.15">${esc(data.name)}</div>
        <div style="${T};font-size:12px;opacity:.9;margin-top:3px">${esc(data.role)}</div>
        ${reg('sidebar',{dark:true})}
      </div>
      <div style="flex:1;padding:${p(26,26,26,24)}">${reg('main')}</div>
    </div>`;
  }
  if(layoutId === 'top-band'){
    return `<div style="background:${b.primary};color:#fff;padding:${p(26,30)}"><div style="${H};font-size:25px;font-weight:700">${esc(data.name)}</div><div style="${T};font-size:13px;opacity:.9;margin-top:2px">${esc(data.role)}</div></div>
      <div style="display:flex;gap:${p(18)};padding:${p(24,30)};${T}"><div style="flex:1">${reg('left')}</div><div style="width:210px;flex:none">${reg('right')}</div></div>`;
  }
  const align = layoutId === 'timeline' ? 'center' : 'left';
  const rule  = align === 'center' ? `width:60px;margin:${p(16)} auto` : `margin:${p(16)} 0`;
  return `<div style="padding:${p(32,42)};${T}">
    <div style="${H};text-align:${align}"><div style="font-size:26px;font-weight:700;color:${b.primary};line-height:1.1">${esc(data.name)}</div><div style="${T};font-size:13.5px;color:${b.secondary};font-weight:600;margin-top:3px">${esc(data.role)}</div></div>
    <div style="height:2px;background:${b.secondary};${rule}"></div>
    ${reg('body',{timeline:layoutId==='timeline'})}
  </div>`;
}

/* ── Case-study engine (same shape as the resume renderer) ───────────────── */

const CS_LAYOUTS = [
  {id:'hero',   name:'Hero Cover',  desc:'Full-bleed cover band, then the story.'},
  {id:'split',  name:'Split',       desc:'Facts rail beside the narrative.'},
  {id:'report', name:'Report',      desc:'Sober single column, no cover art.'},
];
const CS_DATA = {
  title:'Northern Arterial Extension',
  client:'State Roads Authority',
  sector:'Civil Infrastructure', location:'Ipswich, QLD',
  value:'$12.4M', duration:'18 months', completed:'March 2026',
  challenge:'A 4.2 km arterial extension had to be delivered through a live traffic corridor with no full closures permitted, while protecting an adjacent koala habitat listed under state environmental offsets.',
  approach:'We staged the works into six night-shift packages with a dedicated traffic management subcontractor, pre-fabricated the bridge deck units off site, and ran continuous ecological monitoring with a nominated environmental officer.',
  outcome:'Delivered two weeks ahead of programme with zero lost-time injuries and no environmental non-conformances. The client extended the panel agreement for a further three years.',
  results:[
    {v:'14 days', l:'Ahead of programme'},
    {v:'0', l:'Lost-time injuries'},
    {v:'6%', l:'Under budget'},
    {v:'98%', l:'Spoil reused on site'},
  ],
  services:['Bulk earthworks','Bridge construction','Traffic management','Environmental offsets','Stakeholder engagement'],
  quote:'Tenderfy Civil ran the most disciplined night-works programme we have seen on a live corridor. Communication was exceptional throughout.',
  quoteBy:'Lara Blake · Project Director, TMR',
};
const CS_SECTIONS = [
  {id:'cover',    name:'Cover & title',  icon:'image'},
  {id:'facts',    name:'Project facts',  icon:'description'},
  {id:'challenge',name:'The challenge',  icon:'construction'},
  {id:'approach', name:'Our approach',   icon:'work'},
  {id:'outcome',  name:'The outcome',    icon:'check_circle'},
  {id:'results',  name:'Key results',    icon:'star'},
  {id:'services', name:'Services',       icon:'bookmark'},
  {id:'quote',    name:'Testimonial',    icon:'format_quote'},
];
const CS_SECTION_NAME = Object.fromEntries(CS_SECTIONS.map(s => [s.id, s.name]));
const CS_SECTION_ICON = Object.fromEntries(CS_SECTIONS.map(s => [s.id, s.icon]));

function renderCaseStudy(o){
  o = o || {};
  const d = o.data || CS_DATA, b = o.brand || RESUME_BRAND_DEFAULT;
  const lay = o.layout || 'hero';
  const on = o.sections || CS_SECTIONS.map(s => s.id);
  const has = id => on.indexOf(id) !== -1;
  const D = o.density || 1;
  const H = `font-family:'${b.font}',sans-serif`, T = `font-family:'${b.bodyFont}',sans-serif`;
  const pad = Math.round(34*D);
  const h2 = t => `<div style="${H};color:${b.primary};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid ${b.secondary};padding-bottom:4px;margin:${Math.round(20*D)}px 0 ${Math.round(9*D)}px">${t}</div>`;
  const para = t => `<div style="${T};font-size:12.5px;color:#3A4442;line-height:1.6">${esc(t)}</div>`;

  const cover = () => lay === 'report' ? '' : `
    <div style="height:${lay==='hero'?200:150}px;background:linear-gradient(135deg,${b.primary} 0%,${b.secondary} 100%);position:relative;display:flex;align-items:flex-end;padding:${pad}px">
      <div style="position:absolute;inset:0;opacity:.16;background:repeating-linear-gradient(115deg,#fff 0 2px,transparent 2px 16px)"></div>
      <div style="position:relative">
        <div style="${T};font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.82)">Case Study</div>
        <div style="${H};font-size:${lay==='hero'?27:23}px;font-weight:700;color:#fff;line-height:1.14;margin-top:6px;max-width:440px">${esc(d.title)}</div>
        <div style="${T};font-size:12.5px;color:rgba(255,255,255,.88);margin-top:6px">${esc(d.client)}</div>
      </div>
    </div>`;

  const factRows = [['Client',d.client],['Sector',d.sector],['Location',d.location],['Contract value',d.value],['Duration',d.duration],['Completed',d.completed]];
  const facts = style => `<div style="${T};font-size:11.5px;${style||''}">${factRows.map(([k,v])=>`
      <div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #EAEDEC">
        <span style="color:#8A9694;font-weight:500">${k}</span><span style="color:#2E3C3B;font-weight:600;text-align:right">${esc(v)}</span>
      </div>`).join('')}</div>`;

  const results = () => `<div style="display:grid;grid-template-columns:repeat(${Math.min(d.results.length,4)},1fr);gap:10px;margin-top:${Math.round(6*D)}px">${d.results.map(r=>`
      <div style="border:1px solid ${b.secondary}33;border-radius:9px;padding:11px 9px;text-align:center;background:${b.background}">
        <div style="${H};font-size:19px;font-weight:700;color:${b.primary};line-height:1">${esc(r.v)}</div>
        <div style="${T};font-size:9.5px;color:#697573;margin-top:4px;line-height:1.25">${esc(r.l)}</div>
      </div>`).join('')}</div>`;

  const services = () => `<div style="display:flex;flex-wrap:wrap;gap:6px">${d.services.map(s=>`<span style="${T};font-size:11.5px;background:${b.background};color:#3A4442;border:1px solid ${b.secondary}44;border-radius:100px;padding:3px 10px">${esc(s)}</span>`).join('')}</div>`;

  const quote = () => `<div style="border-left:3px solid ${b.secondary};padding:2px 0 2px 15px;margin-top:${Math.round(18*D)}px">
      <div style="${T};font-size:13px;color:#2E3C3B;font-style:italic;line-height:1.6">&ldquo;${esc(d.quote)}&rdquo;</div>
      <div style="${T};font-size:11px;color:${b.secondary};font-weight:600;margin-top:7px">${esc(d.quoteBy)}</div>
    </div>`;

  const story = () =>
    (has('challenge') ? h2('The challenge') + para(d.challenge) : '') +
    (has('approach')  ? h2('Our approach')  + para(d.approach)  : '') +
    (has('outcome')   ? h2('The outcome')   + para(d.outcome)   : '') +
    (has('results')   ? h2('Key results')   + results()         : '') +
    (has('services')  ? h2('Services delivered') + services()   : '') +
    (has('quote')     ? quote() : '');

  if(lay === 'split'){
    return `${has('cover')?cover():''}
      <div style="display:flex;gap:${Math.round(22*D)}px;padding:${pad}px">
        <div style="width:170px;flex:none">${has('facts') ? `<div style="${H};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${b.primary};margin-bottom:6px">Project facts</div>${facts()}` : ''}</div>
        <div style="flex:1;min-width:0">${story()}</div>
      </div>`;
  }
  if(lay === 'report'){
    return `<div style="padding:${pad}px">
      <div style="${T};font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${b.secondary}">Case Study</div>
      <div style="${H};font-size:24px;font-weight:700;color:${b.primary};line-height:1.15;margin-top:5px">${esc(d.title)}</div>
      <div style="${T};font-size:12.5px;color:#697573;margin-top:4px">${esc(d.client)}</div>
      <div style="height:2px;background:${b.secondary};margin:${Math.round(16*D)}px 0"></div>
      ${has('facts') ? facts('margin-bottom:4px') : ''}
      ${story()}
    </div>`;
  }
  return `${has('cover')?cover():''}
    <div style="padding:${pad}px">
      ${has('facts') ? `<div style="border:1px solid #EAEDEC;border-radius:10px;padding:12px 14px;margin-bottom:4px">${facts()}</div>` : ''}
      ${story()}
    </div>`;
}

