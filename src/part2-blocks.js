/* ═══ Block system — ported from tenderfy-admin ════════════════════════════
   primitives.js  → PRIMITIVES / renderPrimitive
   blocks-data.js → BLOCKS / blockSchematic
   block-layouts.js → P2DOC / composeBlock / renderStationery
   An ELEMENT is one primitive; a BLOCK is primitives arranged in a layout, so a
   new block needs no new code — only a new arrangement.                       */

const PRIM_ICON = {heading:'title',subheading:'subtitles',paragraph:'notes',list:'format_list_bulleted',
  quote:'format_quote',image:'image',table:'table_chart',keyvalue:'list_alt',signature:'draw',
  divider:'horizontal_rule',spacer:'height',field:'data_object',callout:'campaign',stat:'trending_up',
  button:'smart_button',cover:'title',toc:'toc',pagebreak:'insert_page_break'};

// Fields marked `data-f` are editable straight on the canvas and are stored as
// rich text, so they render raw rather than escaped. (A real implementation
// would sanitise on the way in; here the author is editing their own document.)
function renderPrimitive(id, b, c){
  b = b || {primary:'#27535C', secondary:'#38988A', background:'#F7F9F8', font:'Outfit', bodyFont:'Outfit'};
  c = c || {};
  const H = `font-family:'${b.font}',sans-serif`, T = `font-family:'${b.bodyFont}',sans-serif`;
  const soft = '#3A4442', e = v => esc(v == null ? '' : v);
  // rich value: use the stored markup when present, else the escaped default
  const r = (v, def) => (v != null && v !== '') ? String(v) : esc(def);
  const F = f => `data-f="${f}"`;
  switch(id){
    case 'heading':
      return `<h3 ${F('title')} style="${H};margin:0;color:${b.primary};font-size:20px;font-weight:700;border-bottom:2px solid ${b.secondary};padding-bottom:6px">${r(c.title,'Project Overview')}</h3>`;
    case 'subheading':
      return `<h4 ${F('title')} style="${H};margin:0;color:${b.primary};font-size:15px;font-weight:600">${r(c.title,'Scope of works')}</h4>`;
    case 'paragraph':
      return `<p ${F('body')} style="${T};margin:0;color:${soft};font-size:13px;line-height:1.6">${r(c.body,'Our team delivered the full civil works package on time and on budget - coordinating traffic management, bulk earthworks and drainage across a live site.')}</p>`;
    case 'list':{
      const items = c.items || ['Traffic management plan','Bulk earthworks & drainage','Reinstatement & handover'];
      return `<ul style="${T};margin:0;padding-left:18px;color:${soft};font-size:13px;line-height:1.7">${items.map((i,n)=>`<li ${F('items')} data-i="${n}">${r(i,'')}</li>`).join('')}</ul>`;
    }
    case 'quote':
      return `<blockquote style="${T};margin:0;border-left:3px solid ${b.secondary};padding:2px 0 2px 14px;color:${b.primary};font-style:italic;font-size:13.5px">"<span ${F('body')}>${r(c.body,'Delivered ahead of schedule with zero safety incidents.')}</span>"</blockquote>`;
    case 'image':
      // "Company asset" stands in for the logo pulled from Company Settings.
      return c.src === 'client'
        ? `<div style="height:118px;background:${b.primary}12;border:1px solid ${b.primary}44;border-radius:8px;display:flex;flex-direction:column;gap:5px;align-items:center;justify-content:center;color:${b.primary}"><span class="ms" style="font-size:30px">domain</span><span style="font-size:11px;font-weight:600">${esc(b.company||'Company logo')}</span></div>`
        : `<div style="height:118px;background:${b.secondary}1f;border:1px solid ${b.secondary}55;border-radius:8px;display:flex;align-items:center;justify-content:center;color:${b.secondary}"><span class="ms" style="font-size:34px">image</span></div>`;
    case 'table':{
      const headers = c.headers || ['Item','Qty','Rate'];
      const rows = c.rows || [['Traffic management','1','$8,400'],['Earthworks','320 m3','$46/m3'],['Drainage','1','$21,750']];
      return `<table style="${T};width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:${b.primary};color:#fff">${headers.map((h,i)=>`<th ${F('headers')} data-i="${i}" style="text-align:${i?'right':'left'};padding:6px 10px;font-weight:600">${e(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((row,ri)=>`<tr style="border-bottom:1px solid #E6EAE9;color:${soft}">${row.map((cell,i)=>`<td ${F('rows')} data-r="${ri}" data-c="${i}" style="padding:6px 10px;text-align:${i?'right':'left'}">${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    case 'keyvalue':{
      const pairs = c.pairs || [['Client','Department of Transport'],['Value','$553,560'],['Sector','Civil / Roads'],['Duration','18 weeks']];
      return `<div style="${T}">${pairs.map((kv,n)=>`<div style="display:flex;gap:12px;padding:5px 0;border-bottom:1px solid #EEF1F0;font-size:12.5px"><span ${F('pairs')} data-r="${n}" data-c="0" style="color:#7A8583;width:120px;flex-shrink:0">${e(kv[0])}</span><span ${F('pairs')} data-r="${n}" data-c="1" style="color:${soft};font-weight:600">${e(kv[1])}</span></div>`).join('')}</div>`;
    }
    case 'signature':
      return `<div style="${T}"><div style="border-bottom:1px solid #9AA5A3;width:64%;height:24px;margin-bottom:7px"></div><div style="font-size:12.5px;color:${soft}"><strong ${F('name')} style="color:${b.primary}">${r(c.name,'Riley Chen')}</strong> - <span ${F('role')}>${r(c.role,'Project Director')}</span></div><div style="font-size:11.5px;color:#8A938F;margin-top:1px">Date: <span ${F('date')}>${r(c.date,'30 Jul 2026')}</span></div></div>`;
    case 'divider':
      return `<hr style="border:none;border-top:1px solid ${b.secondary}66;margin:0">`;
    case 'spacer':
      return `<div style="height:26px"></div>`;
    case 'field':
      return `<span style="${T};background:${b.secondary}1f;color:${b.primary};border:1px solid ${b.secondary}55;border-radius:5px;padding:1px 8px;font-size:12.5px;font-weight:600">{{ ${e(c.field||'Client name')} }}</span>`;
    case 'callout':
      return `<div style="${T};background:${b.secondary}1f;border:1px solid ${b.secondary}55;border-left:4px solid ${b.secondary};border-radius:8px;padding:12px 14px;color:${soft};font-size:13px;line-height:1.55"><strong ${F('label')} style="color:${b.primary}">${r(c.label,'Note')}</strong> - <span ${F('body')}>${r(c.body,'key information the reader should not miss.')}</span></div>`;
    case 'stat':
      return `<div style="${T}"><div ${F('value')} style="${H};color:${b.primary};font-size:30px;font-weight:700;line-height:1">${r(c.value,'98%')}</div><div ${F('label')} style="color:#7A8583;font-size:12px;margin-top:2px">${r(c.label,'On-time completion')}</div></div>`;
    case 'button':
      return `<a style="${T};display:inline-block;background:${b.primary};color:#fff;font-size:13px;font-weight:600;padding:9px 18px;border-radius:7px;text-decoration:none"><span ${F('label')}>${r(c.label,'View full submission')}</span></a>`;
    case 'cover':
      return `<div style="${H};background:${b.primary};color:#fff;border-radius:8px;padding:38px 34px 32px">
        <div ${F('kicker')} style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${b.secondary};font-weight:600">${r(c.kicker,'Tender Response')}</div>
        <div ${F('title')} style="font-size:30px;font-weight:700;margin-top:12px;line-height:1.12">${r(c.title,'Project Overview')}</div>
        <div style="width:56px;height:4px;background:${b.secondary};margin:18px 0"></div>
        <div ${F('meta')} style="font-size:12.5px;opacity:.85">${r(c.meta,'Prepared for the client - Submission')}</div></div>`;
    case 'toc':{
      const rows = c.rows || [['1. Executive summary','2'],['2. Company profile','4'],['3. Methodology','7'],['4. Pricing','12']];
      return `<div style="${T};font-size:13px;color:${soft}">${rows.map((row,n)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #cfd6d4"><span ${F('rows')} data-r="${n}" data-c="0">${e(row[0])}</span><span ${F('rows')} data-r="${n}" data-c="1" style="color:#7A8583">${e(row[1])}</span></div>`).join('')}</div>`;
    }
    case 'pagebreak':
      return `<div style="${T};display:flex;align-items:center;gap:10px;color:#9aa5a3;font-size:11px;text-transform:uppercase;letter-spacing:.4px"><span style="flex:1;border-top:1.5px dashed #c2ccc9"></span>Page break<span style="flex:1;border-top:1.5px dashed #c2ccc9"></span></div>`;
    default: return '';
  }
}

const BLOCKS = [
  {id:'heading',    name:'Heading',              label:'Heading',             cat:'Title Blocks', desc:'A single section heading.', p:'heading'},
  {id:'subheading', name:'Sub-Heading',          label:'Sub-heading',         cat:'Title Blocks', desc:'A smaller heading with a supporting line.', p:'subheading'},
  {id:'divider',    name:'Section Divider',      label:'Section divider',     cat:'Title Blocks', desc:'A titled rule that separates sections.', p:'divider'},
  {id:'cover',      name:'Cover Title Band',     label:'Cover title',         cat:'Title Blocks', desc:'A branded cover heading band for the top of a document.', p:'cover'},
  {id:'paragraph',  name:'Paragraph',            label:'Paragraph',           cat:'Text Blocks',  desc:'A block of body text.', p:'paragraph'},
  {id:'double',     name:'Double Paragraph',     label:'Two columns of text', cat:'Text Blocks',  desc:'Body text in two side-by-side columns.', p:'double'},
  {id:'headpara',   name:'Heading & Paragraph',  label:'Heading beside text', cat:'Text Blocks',  desc:'A heading on the left with body text on the right.', p:'headpara'},
  {id:'parahead',   name:'Paragraph & Heading',  label:'Text beside heading', cat:'Text Blocks',  desc:'Body text on the left with a heading on the right.', p:'parahead'},
  {id:'quote',      name:'Pull Quote',           label:'Quote',               cat:'Text Blocks',  desc:'A highlighted quote or testimonial.', p:'quote'},
  {id:'list',       name:'Bulleted List',        label:'Bulleted list',       cat:'Text Blocks',  desc:'A list of short points.', p:'list'},
  {id:'callout',    name:'Branded Callout',      label:'Highlight box',       cat:'Text Blocks',  desc:'A coloured box that draws attention to key text.', p:'callout'},
  {id:'doc-details',name:'Document Details Grid',label:'Details grid',        cat:'Text Blocks',  desc:'A section title beside a grid of label / value detail rows.', p:'docdetails'},
  {id:'doc-para',   name:'Document Paragraph',   label:'Document paragraph',  cat:'Text Blocks',  desc:'A section title beside a paragraph.', p:'docpara'},
  {id:'doc-dblpara',name:'Document Double Paragraph',label:'Document double paragraph',cat:'Text Blocks',desc:'A section title beside two paragraphs.', p:'docdblpara'},
  {id:'signature',  name:'Signature Block',      label:'Signature',           cat:'Text Blocks',  desc:'A sign-off area with name, role and date.', p:'signature'},
  {id:'sig2',       name:'Double Signature',     label:'Double signature',    cat:'Text Blocks',  desc:'Two sign-off areas side by side, for two signatories.', p:'sig2'},
  {id:'img1',       name:'Single Image',         label:'One image',           cat:'Images',       desc:'A single full-width image.', p:'img1'},
  {id:'img2',       name:'Double Images',        label:'Two images',          cat:'Images',       desc:'Two images side by side.', p:'img2'},
  {id:'img3',       name:'Triple Images',        label:'Three images',        cat:'Images',       desc:'Three images in a row.', p:'img3'},
  {id:'imggrid',    name:'Image Grid',           label:'Image grid',          cat:'Images',       desc:'A four-image grid.', p:'imggrid'},
  {id:'imgtext',    name:'Image & Text',         label:'Image with text',     cat:'Image & Text', desc:'An image on the left, text on the right.', p:'imgtext'},
  {id:'textimg',    name:'Text & Image',         label:'Text with image',     cat:'Image & Text', desc:'Text on the left, an image on the right.', p:'textimg'},
  {id:'imgcap',     name:'Image + Caption',      label:'Image with caption',  cat:'Image & Text', desc:'An image with a caption underneath.', p:'imgcap'},
  {id:'feature',    name:'Two-Column Feature',   label:'Feature panel',       cat:'Image & Text', desc:'An image beside a headline and supporting text.', p:'feature'},
  {id:'catalogue',  name:'Catalogue',            label:'Catalogue',           cat:'Image & Text', desc:'A list of items with an image, title and details.', p:'catalogue'},
  {id:'headimg',    name:'Heading on Image',     label:'Heading on image',    cat:'Image & Text', desc:'A heading laid over a full-width image.', p:'headimg'},
  {id:'table',      name:'Table',                label:'Table',               cat:'Table & Data', desc:'Rows and columns for rates, schedules or comparisons.', p:'table'},
  {id:'itemprice',  name:'Item Pricing',         label:'Item pricing',        cat:'Table & Data', desc:'A list of priced line items — description with a unit amount.', p:'itemprice'},
  {id:'totalprice', name:'Total Pricing',        label:'Total pricing',       cat:'Table & Data', desc:'A subtotal / total summary with a highlighted grand total.', p:'totalprice'},
  {id:'toc',        name:'Contents List',        label:'Table of contents',   cat:'Table & Data', desc:'A contents list with page numbers.', p:'toc'},
  {id:'lh-brand',   name:'Branded Letterhead',   label:'Branded letterhead',  cat:'Headers & Footers', desc:'Logo, company name and a brand rule across the top of every page.', p:'lh-brand',   slot:'header'},
  {id:'lh-contact', name:'Contact Letterhead',   label:'Contact letterhead',  cat:'Headers & Footers', desc:'Company name with contact details in a top bar.', p:'lh-contact', slot:'header'},
  {id:'lh-min',     name:'Minimal Letterhead',   label:'Minimal letterhead',  cat:'Headers & Footers', desc:'A small logo with a thin rule — understated.', p:'lh-min',     slot:'header'},
  {id:'lf-page',    name:'Page-number Footer',   label:'Page-number footer',  cat:'Headers & Footers', desc:'Company name with a page number on every page.', p:'lf-page',    slot:'footer'},
  {id:'lf-legal',   name:'Legal Footer',         label:'Legal footer',        cat:'Headers & Footers', desc:'A confidentiality or disclaimer line across the bottom.', p:'lf-legal',   slot:'footer'},
  {id:'lf-contact', name:'Contact Footer',       label:'Contact footer',      cat:'Headers & Footers', desc:'Address, phone and web in a bottom strip.', p:'lf-contact', slot:'footer'},
];
const BLOCK_CATS = ['Title Blocks','Text Blocks','Images','Image & Text','Table & Data','Headers & Footers'];
const BLOCK_ELEMENT_IDS = new Set(['heading','subheading','divider','paragraph','quote','list','callout','img1','table','signature','cover','toc']);
BLOCKS.forEach(b => { b.kind = BLOCK_ELEMENT_IDS.has(b.id) ? 'element' : 'block'; });
const BLOCK_BY_ID = Object.fromEntries(BLOCKS.map(b => [b.id, b]));

const P2DOC = {
  heading:[{cols:[['heading']]}], subheading:[{cols:[['subheading']]}],
  divider:[{cols:[['heading','divider','paragraph']]}], paragraph:[{cols:[['paragraph']]}],
  double:[{cols:[['paragraph'],['paragraph']]}], headpara:[{cols:[['subheading'],['paragraph']]}],
  parahead:[{cols:[['paragraph'],['subheading']]}], quote:[{cols:[['quote']]}], list:[{cols:[['list']]}],
  callout:[{cols:[['callout']]}], docdetails:[{cols:[['subheading'],['keyvalue']]}],
  docpara:[{cols:[['subheading'],['paragraph']]}], docdblpara:[{cols:[['subheading'],['paragraph'],['paragraph']]}],
  img1:[{cols:[['image']]}], img2:[{cols:[['image'],['image']]}], img3:[{cols:[['image'],['image'],['image']]}],
  imggrid:[{cols:[['image'],['image']]},{cols:[['image'],['image']]}], imgtext:[{cols:[['image'],['paragraph']]}],
  textimg:[{cols:[['paragraph'],['image']]}], imgcap:[{cols:[['image','subheading']]}],
  feature:[{cols:[['image'],['heading','paragraph']]}], table:[{cols:[['table']]}],
  headimg:[{cols:[['image','heading']]}],
  itemprice:[{cols:[['subheading'],['table']]}], totalprice:[{cols:[['keyvalue']]}],
  signature:[{cols:[['signature']]}], catalogue:[{cols:[['image'],['subheading','paragraph']]}],
  sig2:[{cols:[['signature'],['signature']]}], cover:[{cols:[['cover']]}], toc:[{cols:[['toc']]}],
  'lh-brand':[{cols:[['image','heading'],['paragraph']]}], 'lh-contact':[{cols:[['heading'],['paragraph']]}],
  'lh-min':[{cols:[['image'],['heading']]}], 'lf-page':[{cols:[['paragraph'],['paragraph']]}],
  'lf-legal':[{cols:[['paragraph'],['paragraph']]}], 'lf-contact':[{cols:[['paragraph'],['paragraph']]}],
};

function renderStationery(p, b){
  b = b || {primary:'#27535C', secondary:'#38988A', font:'Outfit', bodyFont:'Outfit'};
  // A letterhead or footer built in the Block Builder renders from its own
  // composition, like any other custom block.
  if(typeof CUSTOM_BLOCK_DEF !== 'undefined' && CUSTOM_BLOCK_DEF[p]) return customBlockHtml(CUSTOM_BLOCK_DEF[p], b);
  const H = `font-family:'${b.font}',sans-serif`, T = `font-family:'${b.bodyFont}',sans-serif`;
  const co = b.company || 'Northwind Civil';
  switch(p){
    case 'lh-brand':
      return `<div style="${H};display:flex;align-items:center;gap:11px;border-bottom:3px solid ${b.secondary};padding-bottom:11px"><div style="width:30px;height:30px;border-radius:7px;background:${b.primary};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px">${esc(co[0])}</div><div style="font-size:16px;font-weight:700;color:${b.primary}">${esc(co)}</div></div>`;
    case 'lh-contact':
      return `<div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid ${b.secondary}66;padding-bottom:10px"><div style="${H};font-size:16px;font-weight:700;color:${b.primary}">${esc(co)}</div><div style="${T};font-size:10.5px;color:#7A8583;text-align:right;line-height:1.5">1300 000 000 - meridiancivil.au<br>Level 3, 210 Grey St, Brisbane QLD</div></div>`;
    case 'lh-min':
      return `<div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid ${b.secondary}55;padding-bottom:8px"><div style="width:18px;height:18px;border-radius:5px;background:${b.primary}"></div><span style="${H};font-size:12px;font-weight:600;color:${b.primary};letter-spacing:.6px">${esc(co.toUpperCase())}</span></div>`;
    case 'lf-page':
      return `<div style="${T};display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${b.secondary}66;padding-top:9px;font-size:10.5px;color:#7A8583"><span>${esc(co)} - Tender submission</span><span>Page 1 of 12</span></div>`;
    case 'lf-legal':
      return `<div style="${T};border-top:1px solid ${b.secondary}44;padding-top:9px;font-size:9.5px;color:#8A938F;text-align:center;line-height:1.5">Commercial-in-confidence - this document and its contents are the property of ${esc(co)} Pty Ltd and may not be reproduced without written consent.</div>`;
    case 'lf-contact':
      return `<div style="${T};display:flex;justify-content:space-between;gap:10px;border-top:2px solid ${b.secondary};padding-top:9px;font-size:10.5px;color:#7A8583"><span>Level 3, 210 Grey St, Brisbane QLD</span><span>1300 000 000</span><span>meridiancivil.au</span></div>`;
    default: return '';
  }
}

// rows -> columns -> primitives, in a brand. `content` overrides per primitive index.
function composeBlock(block, brand, content){
  if(/^l[hf]-/.test(block.p)) return renderStationery(block.p, brand);
  // Blocks built in the Block Builder carry their own row/column layout and
  // per-element styles; the editor exposes the renderer so both agree.
  if(typeof CUSTOM_BLOCK_DEF !== 'undefined' && CUSTOM_BLOCK_DEF[block.p]){
    return customBlockHtml(CUSTOM_BLOCK_DEF[block.p], brand, content);
  }
  const doc = P2DOC[block.p] || [{cols:[[block.p]]}];
  let n = -1;
  return doc.map(row => {
    const render = col => col.map(id => { n++; return `<span class="dp" data-pi="${n}">${renderPrimitive(id, brand, (content||{})[n])}</span>`; }).join('');
    if(row.cols.length > 1){
      return `<div style="display:flex;gap:24px;margin-bottom:18px">${row.cols.map(col=>`<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:11px">${render(col)}</div>`).join('')}</div>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:11px;margin-bottom:18px">${render(row.cols[0])}</div>`;
  }).join('');
}
function blockElements(block){
  const doc = P2DOC[block.p] || [];
  const seen = [];
  doc.forEach(row => row.cols.forEach(col => col.forEach(id => { if(!seen.includes(id)) seen.push(id); })));
  return seen;
}

/* Schematic thumbnails — data-free, derived from the block's real composition. */
function primSchematic(id, compact){
  const bar = (w,h) => `<div class="blk-bar${h?' h':''}" style="width:${w}"></div>`;
  const img = () => `<div class="blk-img"><span class="ms">image</span></div>`;
  const rows = compact ? 2 : 3;
  switch(id){
    case 'heading':    return bar('60%',1);
    case 'subheading': return bar('72%',1);
    case 'cover':      return `<div style="background:#9FB2AC;border-radius:4px;padding:9px;display:flex;flex-direction:column;gap:5px"><div class="blk-bar" style="width:38%;background:#d6e4df"></div><div class="blk-bar h" style="width:74%;background:#fff"></div></div>`;
    case 'paragraph':  return compact ? bar('92%')+bar('74%') : bar('94%')+bar('88%')+bar('70%');
    case 'list':       return ['82%','74%','66%'].slice(0,rows).map(w=>`<div class="blk-list-row"><span class="dot"></span>${bar(w)}</div>`).join('');
    case 'quote':      return `<div class="blk-quote">${bar('88%')+bar('64%')}</div>`;
    case 'image':      return img();
    case 'table':      return `<div class="blk-table">${['h',''].concat(compact?[]:['']).map(r=>`<div class="tr ${r}"><span></span><span></span><span></span></div>`).join('')}</div>`;
    case 'keyvalue':   return [0,1,2].slice(0,rows).map(()=>`<div class="blk-pr">${bar('42%')}<div class="blk-bar blk-amt"></div></div>`).join('');
    case 'signature':  return `${bar('48%')}<div style="height:1px;background:#B4C6C1;margin:9px 0 5px"></div>${bar('36%',1)}`;
    case 'divider':    return `<div style="height:2px;background:#B4C6C1;border-radius:2px;margin:2px 0"></div>`;
    case 'callout':    return `<div style="background:rgba(56,152,138,.14);border-radius:6px;padding:9px;display:flex;flex-direction:column;gap:6px">${bar('66%',1)+bar('84%')}</div>`;
    case 'stat':       return `<div class="blk-bar h" style="width:34%;height:15px"></div>${bar('58%')}`;
    case 'button':     return `<div style="width:44%;height:15px;background:#38988A;opacity:.75;border-radius:5px"></div>`;
    case 'toc':        return [0,1,2].slice(0,rows).map(()=>`<div class="blk-pr">${bar('62%')}<div class="blk-bar" style="width:9%"></div></div>`).join('');
    case 'field':      return bar('46%');
    case 'spacer':     return `<div style="height:10px"></div>`;
    default:           return bar('72%');
  }
}
function blockSchematic(block){
  const bar = (w,h) => `<div class="blk-bar${h?' h':''}" style="width:${w}"></div>`;
  // A block written in Code mode has no primitives to diagram, so the tile
  // shows the markup's own shape instead of an empty frame.
  if(typeof CUSTOM_BLOCK_DEF !== 'undefined'){
    const cd = CUSTOM_BLOCK_DEF[block.p];
    if(cd && isCodeBlock(cd)) return `<div class="blk-code"><span class="ms">code</span></div>`;
  }
  switch(block.p){
    case 'lh-brand':  return `<div style="display:flex;align-items:center;gap:7px;border-bottom:2px solid #38988A;padding-bottom:8px"><span style="width:19px;height:19px;border-radius:5px;background:#38988A;flex:none"></span>${bar('44%',1)}</div>`;
    case 'lh-contact':return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #38988A;padding-bottom:8px">${bar('36%',1)}<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;flex:1">${bar('60%')}${bar('44%')}</div></div>`;
    case 'lh-min':    return `<div style="display:flex;align-items:center;gap:6px;border-bottom:1px solid #c2ccc9;padding-bottom:6px"><span style="width:13px;height:13px;border-radius:4px;background:#38988A;flex:none"></span>${bar('34%',1)}</div>`;
    case 'lf-page':   return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #38988A;padding-top:8px">${bar('46%')}<div class="blk-bar" style="width:18%"></div></div>`;
    case 'lf-legal':  return `<div style="border-top:1px solid #c2ccc9;padding-top:8px;display:flex;flex-direction:column;gap:4px;align-items:center">${bar('90%')}${bar('68%')}</div>`;
    case 'lf-contact':return `<div style="display:flex;justify-content:space-between;gap:8px;border-top:2px solid #38988A;padding-top:8px">${bar('26%')}${bar('22%')}${bar('24%')}</div>`;
  }
  const doc = P2DOC[block.p] || [{cols:[[block.p]]}];
  return doc.map(row => row.cols.length > 1
    ? `<div class="blk-cols">${row.cols.map(col=>`<div>${col.map(id=>primSchematic(id,true)).join('')}</div>`).join('')}</div>`
    : row.cols[0].map(id=>primSchematic(id,false)).join('')).join('');
}
