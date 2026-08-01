/* ============================================================
   MODULE IMPORT EN MASSE — CSV / Excel / PDF / HTML
   CSV : parseur natif (guillemets, délimiteur auto ; , tab)
   Excel : SheetJS chargé à la demande · PDF : pdf.js à la demande
   HTML : analyse riche (titres, textes, images, contacts, listes) —
   produits : table ou heuristique nom+prix + panneau « contenu extrait » ;
   fournisseurs/transitaires : fiche pré-remplie à valider manuellement.
   Colonne « Image URL » : URL web, chemin local ou nom de fichier
   (résolu vers assets/Products images/), aperçu avant import,
   avertissement non bloquant si absente + upload d'images en masse.
   Dernier mapping mémorisé par type + dernier HTML re-parsable (gf_imp).
   ============================================================ */
const IMPK='gf_imp';
let impPrefsCache=null; // cache mémoire, chargé une fois au démarrage (impLoadPrefs) — peut contenir un HTML jusqu'à 400 Ko (lastHtml)
async function impLoadPrefs(){impPrefsCache=(await IDB_GET(IMPK,null))||{};}
function impPrefs(){return impPrefsCache||(impPrefsCache={});}
function impPrefsSave(){IDB_SET(IMPK,impPrefsCache||{});}
const impNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
const impT=v=>String(v==null?'':v).trim();
const impNum=v=>{if(v==null||v==='')return 0;const n=parseFloat(String(v).replace(/\s/g,'').replace(/,/g,'.').replace(/[^\d.\-]/g,''));return isNaN(n)?0:n;};
const impUrl=v=>/^https?:\/\//.test(impT(v))?impT(v):'';
const impLogoUrl=v=>{const s=impT(v);return/^(https?:|data:image\/)/i.test(s)?s:'';};
const impId=(pfx,ix)=>pfx+String(Date.now()).slice(-5)+String(ix%1000).padStart(3,'0');
const IMP_IMG_DIR='assets/Products%20images/';
const impImgExt=/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;
/* Résout la colonne « Image URL » : URL web ou data: conservée telle quelle ;
   chemin local (C:\Images\… ou /Images/…) ou simple nom de fichier → le fichier
   est supposé présent dans assets/Products images/ (nom de base conservé). */
function impResolveImg(v){
  const s=impT(v);
  if(!s)return'';
  if(/^(https?:|data:image\/)/i.test(s))return s;
  const base=s.split(/[\\/]/).pop();
  if(!base||!impImgExt.test(base))return'';
  return IMP_IMG_DIR+encodeURIComponent(base);
}
const IMP_LBL={produits:'produits',fournisseurs:'fournisseurs',transitaires:'transitaires'};
const IMP_FIELDS={
  produits:[
    {k:'nom',lbl:'Nom / Désignation',req:true,syn:['nom','designation','produit','product','productname','name','item','article','libelle']},
    {k:'cat',lbl:'Catégorie',syn:['categorie','category','cat','famille']},
    {k:'four',lbl:'Fournisseur',syn:['fournisseur','supplier','fabricant','vendor','marque','brand']},
    {k:'prix',lbl:'Prix EXW',num:true,syn:['prix','prixexw','exw','price','unitprice','prixunitaire','cout','cost']},
    {k:'dev',lbl:'Devise',syn:['devise','currency','monnaie']},
    {k:'prach',lbl:'Fret local',num:true,syn:['fretlocal','prach','fret','freight']},
    {k:'l',lbl:'Longueur',num:true,syn:['longueur','length','long','l']},
    {k:'la',lbl:'Largeur',num:true,syn:['largeur','width','larg','la']},
    {k:'h',lbl:'Hauteur',num:true,syn:['hauteur','height','haut','h']},
    {k:'kg',lbl:'Poids (kg)',num:true,syn:['poids','weight','kg','poidskg']},
    {k:'tr',lbl:'Transport',syn:['transport','livraison','shipping','tr']},
    {k:'marge',lbl:'Marge %',num:true,syn:['marge','margin','margepct']},
    {k:'moq',lbl:'MOQ',num:true,syn:['moq','minorder','quantitemini']},
    {k:'desc',lbl:'Description',syn:['description','desc','details']},
    {k:'specs',lbl:'Spécifications',syn:['specifications','specs','specificites','caracteristiques']},
    {k:'photo',lbl:'Image URL',req:true,syn:['photo','image','img','imageurl','imgurl','urlimage','photourl','picture','lienimage','cheminimage']},
  ],
  fournisseurs:[
    {k:'nom',lbl:'Nom entreprise',req:true,syn:['nom','entreprise','company','societe','supplier','fournisseur','name']},
    {k:'contact',lbl:'Contact',syn:['contact','personne','representant']},
    {k:'pays',lbl:'Pays',syn:['pays','country']},
    {k:'email',lbl:'Email',syn:['email','mail','courriel']},
    {k:'wa',lbl:'WhatsApp',syn:['whatsapp','telephone','phone','mobile','tel','wa']},
    {k:'wc',lbl:'WeChat',syn:['wechat','weixin','wc']},
    {k:'dom',lbl:'Domaine',syn:['domaine','activite','secteur','business','domain']},
    {k:'eval',lbl:'Évaluation /5',num:true,syn:['evaluation','eval','note','rating','etoiles']},
    {k:'ali_url',lbl:'Lien Alibaba',syn:['alibaba','aliurl','lienalibaba','lien','url','site','website']},
    {k:'lang',lbl:'Langues',syn:['langues','languages','lang']},
    {k:'mkt',lbl:'Marchés',syn:['marches','markets','mkt']},
    {k:'desc',lbl:'Description',syn:['description','desc']},
    {k:'logo',lbl:'Logo (URL)',syn:['logo','logourl']},
  ],
  transitaires:[
    {k:'nom',lbl:'Nom entreprise',req:true,syn:['nom','entreprise','company','transitaire','forwarder','name']},
    {k:'dep',lbl:'Pays départ',syn:['depart','paysdepart','origine','origin','from']},
    {k:'arr',lbl:'Pays arrivée',syn:['arrivee','paysarrivee','destination','to']},
    {k:'contact',lbl:'Contact',syn:['contact','email','mail']},
    {k:'wa',lbl:'WhatsApp',syn:['whatsapp','mobile','wa']},
    {k:'tel',lbl:'Téléphone',syn:['telephone','phone','tel']},
    {k:'type',lbl:'Type logistique',syn:['type','logistique']},
    {k:'mar',lbl:'Tarif maritime (XOF/CBM)',num:true,syn:['maritime','tarifmaritime','cbm','sea','mar']},
    {k:'mard',lbl:'Délai maritime (j)',num:true,syn:['delaimaritime','mard']},
    {k:'aer',lbl:'Tarif aérien (XOF/kg)',num:true,syn:['aerien','tarifaerien','air','aer']},
    {k:'aerd',lbl:'Délai aérien (j)',num:true,syn:['delaiaerien','aerd']},
    {k:'logo',lbl:'Logo (URL)',syn:['logo','logourl']},
  ],
};
let impState=null,impCtx=null;

/* ---- Chargement de bibliothèques à la demande (CDN) ---- */
const impLibs={};
function ensureLib(globalName,src,integrity){
  if(window[globalName])return Promise.resolve();
  if(!impLibs[src])impLibs[src]=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=src;
    if(integrity){s.integrity=integrity;s.crossOrigin='anonymous';}
    s.onload=()=>res();s.onerror=()=>{delete impLibs[src];rej(new Error('bibliothèque inaccessible ou intégrité invalide — connexion Internet requise'));};
    document.head.appendChild(s);
  });
  return impLibs[src];
}
async function ensurePDF(){
  await ensureLib('pdfjsLib','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ---- Ouverture / navigation ---- */
function openImportModal(type){
  document.getElementById('imp-type').value=type||'produits';
  impBack();
  openMod('import-modal');
}
function impBack(){
  impState=null;
  document.getElementById('imp-step1').style.display='';
  document.getElementById('imp-step2').style.display='none';
  document.getElementById('imp-file').value='';
  document.getElementById('imp-load').style.display='none';
  document.getElementById('imp-errs').innerHTML='';
  document.getElementById('imp-prog').style.display='none';
  document.getElementById('imp-go').disabled=false;
  impRenderLastHtml();
}
function impTypeChange(){
  if(!impState)return;
  // Source HTML : on re-analyse selon le nouveau type (tableau produits ↔ fiche)
  if(impState.rawHtml){try{impFromHTML({name:impState.fileName},impState.rawHtml);}catch(e){toast('Re-analyse impossible — '+(e.message||e),true);}return;}
  if(impState.mode==='fiche')return;
  impRenderMap();impRenderPrev();impUpdTools();
}
// Bouton « Uploader des images en masse » : visible uniquement pour un import produits
function impUpdTools(){
  const el=document.getElementById('imp-img-tools');
  if(el)el.style.display=(impState&&impState.mode!=='fiche'&&document.getElementById('imp-type').value==='produits')?'flex':'none';
}
function impLoading(on,msg){
  document.getElementById('imp-load').style.display=on?'block':'none';
  if(msg)document.getElementById('imp-load-lbl').textContent=msg;
}
function impFileInput(inp){const f=inp.files[0];if(f)impHandleFile(f);inp.value='';}
(function(){
  const dz=document.getElementById('imp-drop');
  if(!dz)return;
  ['dragover','dragenter'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
  dz.addEventListener('drop',e=>{const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)impHandleFile(f);});
})();

/* ---- Lecture des fichiers ---- */
async function impHandleFile(file){
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  try{
    if(ext==='csv'){
      impLoading(true,'Lecture du CSV…');
      impSetTabular(file,parseCSVText(await file.text()));
    }else if(ext==='xlsx'||ext==='xls'){
      impLoading(true,'Chargement du lecteur Excel…');
      await ensureLib('XLSX','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw');
      impLoading(true,'Lecture du fichier Excel…');
      const wb=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});
      const grid=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''}).map(r=>r.map(v=>String(v??'')));
      impSetTabular(file,grid);
    }else if(ext==='pdf'){
      impLoading(true,'Chargement du lecteur PDF…');
      await ensurePDF();
      impLoading(true,'Extraction du texte du PDF…');
      impSetExtracted(file,impExtractRows(await pdfToLines(await file.arrayBuffer())),'PDF');
    }else if(ext==='html'||ext==='htm'){
      impLoading(true,'Analyse du HTML…');
      impFromHTML(file,await file.text());
    }else{
      toast('Format non pris en charge : .'+ext+' — utilisez CSV, Excel, PDF ou HTML',true);return;
    }
  }catch(e){
    console.error('Import:',e);
    impLoading(false);
    toast('Import impossible — '+(e.message||e),true);
    return;
  }
  impLoading(false);
}
function parseCSVText(text){
  text=text.replace(/^﻿/,'').replace(/\r\n?/g,'\n');
  const head=text.split('\n')[0]||'';
  const delim=[';',',','\t'].map(d=>[d,head.split(d).length-1]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let row=[],cell='',inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQ){
      if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else inQ=false;}
      else cell+=ch;
    }
    else if(ch==='"')inQ=true;
    else if(ch===delim){row.push(cell);cell='';}
    else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>String(c).trim()!==''));
}
async function pdfToLines(buf){
  const doc=await pdfjsLib.getDocument({data:buf}).promise;
  const lines=[];
  for(let pg=1;pg<=doc.numPages;pg++){
    const tc=await(await doc.getPage(pg)).getTextContent();
    const byY={};
    tc.items.forEach(it=>{
      if(!it.str||!it.str.trim())return;
      const y=Math.round(it.transform[5]/4)*4; // regroupe les items par ligne visuelle
      (byY[y]=byY[y]||[]).push(it);
    });
    Object.keys(byY).map(Number).sort((a,b)=>b-a).forEach(y=>{
      lines.push(byY[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(it=>it.str).join(' ').replace(/\s+/g,' ').trim());
    });
  }
  return lines;
}
// Heuristique nom + prix sur du texte libre (PDF / HTML sans table)
function impExtractRows(lines){
  // « devise puis nombre » testé en premier — évite de capturer le 1 de « 14-en-1 ¥2999 »
  const reCurFirst=/(?:[¥$€£]|USD|RMB|CNY|EUR|XOF|FCFA)\s*([\d][\d\s.,]{0,11})/i;
  const reNumFirst=/([\d][\d\s.,]{0,11}?)\s*(?:[¥$€£]|USD|RMB|CNY|EUR|XOF|FCFA)(?![a-z0-9])/i;
  const out=[];
  lines.forEach(l=>{
    if(l.length<6)return;
    const m=l.match(reCurFirst)||l.match(reNumFirst);
    if(!m)return;
    const prix=impNum(m[1]);
    if(!prix)return;
    let nom=l.slice(0,m.index).replace(/[\s·:|,;–-]+$/,'').trim();
    if(!nom)nom=l.slice(m.index+m[0].length).replace(/^[\s·:|,;–-]+/,'').trim();
    if(nom.length<3||/^(total|soustotal|tva|prix|montant|quantite|qty|subtotal|page)/.test(impNorm(nom)))return;
    out.push([nom.slice(0,120),String(prix),'','']);
  });
  return out;
}
/* ---- Analyse riche d'un document HTML : titres, textes, images, contacts, listes ---- */
function impAbsUrl(src,base){
  const s=impT(src);
  if(!s)return'';
  if(/^data:image\//i.test(s))return s;
  if(/^\/\//.test(s))return'https:'+s;
  if(/^https?:/i.test(s))return s;
  if(base){try{return new URL(s,base).href;}catch(_){}}
  return'';
}
function impRichParse(doc){
  const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
  const meta=n=>{const m=doc.querySelector(`meta[name="${n}"],meta[property="${n}"]`);return m?impT(m.getAttribute('content')):'';};
  const r={
    title:txt(doc.querySelector('title'))||meta('og:title'),
    metaDesc:meta('description')||meta('og:description'),
    headings:[...doc.querySelectorAll('h1,h2,h3')].map(h=>({tag:h.tagName.toLowerCase(),txt:txt(h)})).filter(h=>h.txt).slice(0,30),
    paragraphs:[...doc.querySelectorAll('p')].map(p=>txt(p)).filter(t=>t.length>40).slice(0,20),
    lists:[...doc.querySelectorAll('ul,ol')].map(l=>[...l.querySelectorAll(':scope>li')].map(li=>txt(li)).filter(Boolean).slice(0,30)).filter(l=>l.length).slice(0,10),
    images:[...doc.querySelectorAll('img')].map(im=>({src:impT(im.getAttribute('src')),alt:impT(im.getAttribute('alt')),hint:((im.getAttribute('class')||'')+' '+(im.getAttribute('id')||'')).trim()})).filter(i=>i.src).slice(0,40),
    links:[...doc.querySelectorAll('a[href]')].map(a=>({href:impT(a.getAttribute('href')),txt:txt(a)})).filter(l=>l.href).slice(0,120),
    custom:[],
  };
  const cano=doc.querySelector('link[rel="canonical"]');
  r.site=impUrl(cano&&cano.getAttribute('href'))||impUrl(meta('og:url'))||impUrl((r.links.find(l=>/^https?:/i.test(l.href))||{}).href);
  const body=doc.body?doc.body.textContent:'';
  r.textLow=body.slice(0,30000).toLowerCase();
  r.emails=[...new Set([
    ...r.links.filter(l=>/^mailto:/i.test(l.href)).map(l=>l.href.slice(7).split('?')[0].trim()),
    ...(body.match(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g)||[])
  ])].filter(e=>/^\S+@\S+\.\S+$/.test(e)).slice(0,6);
  r.phones=[...new Set([
    ...r.links.filter(l=>/^tel:/i.test(l.href)).map(l=>l.href.slice(4)),
    ...(body.match(/(?:\+|00)\d[\d\s().\/-]{7,17}\d/g)||[])
  ].map(t=>t.replace(/\s+/g,' ').trim()))].slice(0,6);
  r.address=txt(doc.querySelector('address'));
  r.images.forEach(im=>{im.abs=impAbsUrl(im.src,r.site);});
  return r;
}
// Associe les images du HTML aux lignes extraites via l'attribut alt ou le nom de fichier
function impAutoImgs(rows,rich,nomIx,imgIx){
  if(!rich||!rich.images.length)return 0;
  let n=0;
  rows.forEach(r=>{
    if(impT(r[imgIx]))return;
    const pn=impNorm(r[nomIx]);if(!pn)return;
    const hit=rich.images.find(im=>{
      if(!im.abs)return false;
      const k1=impNorm(im.alt),k2=impNorm((im.src.split(/[\\/]/).pop()||'').replace(/\.[^.]+$/,''));
      return(k1.length>=4&&(pn.includes(k1)||k1.includes(pn)))||(k2.length>=4&&(pn.includes(k2)||k2.includes(pn)));
    });
    if(hit){r[imgIx]=hit.abs;n++;}
  });
  return n;
}
function impFromHTML(file,txt){
  const doc=new DOMParser().parseFromString(txt,'text/html');
  const rich=impRichParse(doc);
  impSaveLastHtml(file.name,txt);
  // Fournisseur / transitaire : le HTML (site web) devient une fiche à valider (étape 4)
  const type=document.getElementById('imp-type').value;
  if(type==='fournisseurs'||type==='transitaires'){impSetFiche(file,type,rich,txt);return;}
  let best=null;
  doc.querySelectorAll('table').forEach(t=>{
    const n=t.querySelectorAll('tr').length;
    if(n>1&&(!best||n>best.querySelectorAll('tr').length))best=t;
  });
  if(best){
    const grid=[...best.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>td.textContent.replace(/\s+/g,' ').trim()));
    impSetTabular(file,grid.filter(r=>r.some(c=>c!=='')),{rich,rawHtml:txt});
  }else{
    // pas de table : lignes candidates depuis titres, listes et paragraphes, puis texte aplati
    // (innerText d'un document non rendu ne sépare pas les blocs : on force des \n aux frontières)
    const lines=[...rich.headings.map(h=>h.txt),...rich.lists.flat(),...rich.paragraphs];
    const flat=(doc.body?doc.body.innerHTML:txt).replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article)[^>]*>/gi,'\n');
    const text=new DOMParser().parseFromString(flat,'text/html').body.textContent||'';
    text.split('\n').forEach(l=>{l=l.replace(/\s+/g,' ').trim();if(l)lines.push(l);});
    const seen=new Set();
    const rows=impExtractRows(lines.filter(l=>{const k=impNorm(l);if(seen.has(k))return false;seen.add(k);return true;}));
    const nImg=impAutoImgs(rows,rich,0,3);
    impSetExtracted(file,rows,'HTML',{rich,rawHtml:txt});
    if(nImg)toast(`${nImg} image${nImg>1?'s':''} associée${nImg>1?'s':''} automatiquement aux produits`);
  }
}
/* Le HTML original est mémorisé (gf_imp.lastHtml, IndexedDB) pour pouvoir re-parser sans re-téléverser */
function impSaveLastHtml(name,txt){
  if(txt.length>5000000)return; // plafond raisonnable même sur IndexedDB (évite de gonfler la mémoire indéfiniment)
  const prefs=impPrefs();
  prefs.lastHtml={name,txt,ts:new Date().toISOString()};
  impPrefsSave();
}
function impRenderLastHtml(){
  const el=document.getElementById('imp-last-html');
  if(!el)return;
  const lh=impPrefs().lastHtml;
  if(!lh){el.style.display='none';el.innerHTML='';return;}
  el.style.display='block';
  el.innerHTML=`<button class="btn btn-ghost btn-sm" onclick="impReparseLast()">${ICO('file')} Re-analyser le dernier HTML importé — ${String(lh.name).replace(/</g,'&lt;')} (${new Date(lh.ts).toLocaleDateString('fr-FR')})</button>`;
}
function impReparseLast(){
  const lh=impPrefs().lastHtml;
  if(!lh){toast('Aucun HTML mémorisé',true);return;}
  try{impFromHTML({name:lh.name},lh.txt);}catch(e){toast('Re-analyse impossible — '+(e.message||e),true);}
}
function impSetTabular(file,grid,extra){
  if(!grid||grid.length<2)throw new Error('aucune donnée exploitable (ligne d\'en-tête + lignes de données attendues)');
  impState={mode:'map',fileName:file.name,headers:grid[0].map(h=>String(h).trim()||'(colonne sans nom)'),rows:grid.slice(1),...(extra||{})};
  impShowStep2();
}
function impSetExtracted(file,rows,srcLbl,extra){
  if(!rows.length)throw new Error('aucun produit détecté dans ce '+srcLbl+' — essayez le format CSV ou Excel');
  rows.forEach(r=>{while(r.length<4)r.push('');});
  impState={mode:'edit',fileName:file.name,headers:['Nom','Prix','Description','Image URL'],rows,...(extra||{})};
  impShowStep2();
}
function impShowStep2(){
  document.getElementById('imp-step1').style.display='none';
  document.getElementById('imp-step2').style.display='block';
  document.getElementById('imp-errs').innerHTML='';
  document.getElementById('imp-prog').style.display='none';
  document.getElementById('imp-go').disabled=false;
  const fiche=impState.mode==='fiche';
  const n=impState.rows.length;
  document.getElementById('imp-file-line').innerHTML=fiche
    ?`${ICO('file')} <b>${impState.fileName.replace(/</g,'&lt;')}</b> — <span style="color:var(--warn)">fiche extraite automatiquement : vérification manuelle obligatoire avant création</span>`
    :`${ICO('file')} <b>${impState.fileName.replace(/</g,'&lt;')}</b> — ${n} ligne${n>1?'s':''} détectée${n>1?'s':''}${impState.mode==='edit'?' <span style="color:var(--warn)">· extraction automatique — corrigez ci-dessous si besoin</span>':''}`;
  document.getElementById('imp-map-sec').style.display=fiche?'none':'';
  document.getElementById('imp-prev-lbl').style.display=fiche?'none':'';
  document.getElementById('imp-prev').style.display=fiche?'none':'';
  const go=document.getElementById('imp-go-lbl');
  if(go)go.textContent=fiche?(impState.type==='fournisseurs'?'Créer la fiche fournisseur':'Créer la fiche transitaire'):'Valider l\'import';
  if(!fiche){impRenderMap();impRenderPrev();}
  impUpdTools();impRenderRich();impRenderFiche();
}

/* ---- Mapping colonnes → champs (auto-détection + mémorisation) ---- */
function impRenderMap(){
  const type=document.getElementById('imp-type').value;
  const sec=document.getElementById('imp-map-sec');
  if(impState.mode==='edit'){sec.style.display='none';return;}
  sec.style.display='block';
  const saved=(impPrefs().map||{})[type]||{};
  const fields=IMP_FIELDS[type],used=[];
  const guess={};
  fields.forEach(f=>{
    let idx=impState.headers.findIndex(h=>saved[impNorm(h)]===f.k);
    if(idx<0)idx=impState.headers.findIndex((h,i)=>{
      if(used.includes(i))return false;
      const nh=impNorm(h);
      return f.syn.some(s=>nh===s||(s.length>3&&nh.includes(s)));
    });
    if(idx>-1)used.push(idx);
    guess[f.k]=idx;
  });
  document.getElementById('imp-map').innerHTML=fields.map(f=>`
    <div class="imp-map-row">
      <span class="flbl">${f.lbl}${f.req?' *':''}</span>
      <select class="fc" id="imap-${f.k}" onchange="impRenderPrev()" aria-label="Colonne du fichier pour ${f.lbl}">
        <option value="-1">— ignorer —</option>
        ${impState.headers.map((h,i)=>`<option value="${i}" ${guess[f.k]===i?'selected':''}>${h.replace(/</g,'&lt;')}</option>`).join('')}
      </select>
    </div>`).join('');
}
function impMapping(type){
  const m={};
  if(impState.mode==='edit'){m.nom=0;if(IMP_FIELDS[type].some(f=>f.k==='prix'))m.prix=1;m.desc=2;if(IMP_FIELDS[type].some(f=>f.k==='photo'))m.photo=3;return m;}
  IMP_FIELDS[type].forEach(f=>{const el=document.getElementById('imap-'+f.k);const i=el?parseInt(el.value):-1;if(i>-1)m[f.k]=i;});
  return m;
}
function impRenderPrev(){
  const editable=impState.mode==='edit';
  const type=document.getElementById('imp-type').value;
  const imgCol=type==='produits'?impMapping(type).photo:null;
  const showImg=imgCol!=null&&imgCol>-1;
  const rows=editable?impState.rows:impState.rows.slice(0,6);
  document.getElementById('imp-prev-lbl').textContent=editable?'Données extraites — modifiables avant validation':`Aperçu des ${Math.min(6,impState.rows.length)} premières lignes`;
  // Aperçu de l'image résolue (URL web / chemin local / nom de fichier → assets)
  const thumb=r=>{
    const raw=impT(r[imgCol]),u=impResolveImg(raw);
    return`<td>${u
      ?`<img class="imp-thumb" src="${u.replace(/"/g,'&quot;')}" alt="" loading="lazy" onerror="this.classList.add('bad');this.title='Image introuvable — le produit sera importé sans image'">`
      :`<span class="imp-thumb none" title="${raw?'Lien image illisible — le produit sera importé sans image':'Aucune image'}">${ICO('image')}</span>`}</td>`;
  };
  document.getElementById('imp-prev').innerHTML=`<table><thead><tr>${editable?'<th></th>':''}${showImg?'<th>Aperçu</th>':''}${impState.headers.map(h=>`<th>${String(h).replace(/</g,'&lt;')}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r,ri)=>`<tr>${editable?`<td><button class="expand-cell" onclick="impDelRow(${ri})" title="Retirer cette ligne" aria-label="Retirer la ligne ${ri+1}">${ICO('trash')}</button></td>`:''}${showImg?thumb(r):''}${impState.headers.map((h,ci)=>`<td>${
      editable
        ?`<input value="${String(r[ci]??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" oninput="impState.rows[${ri}][${ci}]=this.value" onchange="if(${showImg?'true':'false'})impRenderPrev()" aria-label="${h} — ligne ${ri+1}">`
        :String(r[ci]??'').replace(/</g,'&lt;').slice(0,60)
    }</td>`).join('')}</tr>`).join('')
  }</tbody></table>`;
}
function impDelRow(i){impState.rows.splice(i,1);impShowStep2();}

/* ---- Validation + import (par lots, avec barre de progression) ---- */
function impExistingKeys(type){
  const s=new Set();
  if(type==='produits')prods.forEach(p=>s.add(impNorm(p.nom)+'|'+(p.fid||'')));
  if(type==='fournisseurs')fours.forEach(f=>s.add(impNorm(f.nom)));
  if(type==='transitaires')trans.forEach(t=>s.add(impNorm(t.nom)));
  return s;
}
function impCat(v){
  const n=impNorm(v);
  if(!n)return'Équipement & Accessoires';
  const keys=Object.keys(CATS);
  return keys.find(c=>impNorm(c)===n)||keys.find(c=>impNorm(c).includes(n)||n.includes(impNorm(c)))||'Équipement & Accessoires';
}
function impBuild(type,o,ix,existing){
  const nom=impT(o.nom);
  if(!nom)return{err:'nom manquant'};
  if(type==='produits'){
    const rawPrix=impT(o.prix);
    if(rawPrix&&!/\d/.test(rawPrix))return{err:`prix illisible « ${rawPrix} »`};
    const fn=impT(o.four),nf=impNorm(fn);
    const f=nf?fours.find(x=>{const n=impNorm(x.nom);return n===nf||n.includes(nf)||nf.includes(n);}):null;
    const key=impNorm(nom)+'|'+(f?f.id:'');
    if(existing.has(key))return{err:'doublon — déjà au catalogue'};
    existing.add(key);
    const cat=impCat(o.cat);
    // Image : jamais bloquante — le produit est importé sans image, avec avertissement
    const rawImg=impT(o.photo),img=impResolveImg(rawImg);
    const warn=img||impCtx.noImgCol?'':(rawImg?`image illisible « ${rawImg.slice(0,40)} » — importé sans image`:'image manquante — importé sans image');
    impCtx.tot++;
    const cn=prods.filter(p=>p.cat===cat).length+(impCtx.cc[cat]=(impCtx.cc[cat]||0)+1);
    return{warn,ent:{
      id:impId('P',ix),
      ref:`${CATS[cat]||'PRD'}-${String(cn).padStart(3,'0')}-${String(impCtx.tot).padStart(3,'0')}`,
      nom,cat,grp:'',fid:f?f.id:'',fn:f?f.nom:fn,
      prix:impNum(rawPrix),prach:impNum(o.prach),
      dev:(String(o.dev||'').toUpperCase().match(/RMB|USD|EUR|XOF/)||['RMB'])[0],
      l:impNum(o.l),la:impNum(o.la),h:impNum(o.h),dimU:'cm',kg:impNum(o.kg),
      tr:/a[ée]r|air|avion|plane/i.test(impT(o.tr))?'Aérien':'Maritime',
      marge:impT(o.marge)?String(impNum(o.marge)):'',rem:0,conc:'',
      moq:Math.max(1,Math.round(impNum(o.moq))||1),
      desc:impT(o.desc),specs:impT(o.specs),
      photos:img?[img]:[]
    }};
  }
  if(type==='fournisseurs'){
    const email=impT(o.email);
    if(email&&!/^\S+@\S+\.\S+$/.test(email))return{err:`email invalide « ${email} »`};
    const key=impNorm(nom);
    if(existing.has(key))return{err:'doublon — fournisseur déjà enregistré'};
    existing.add(key);
    let ev=Math.round(impNum(o.eval));ev=ev?Math.min(5,Math.max(1,ev)):3;
    return{ent:{id:impId('F',ix),nom,contact:impT(o.contact),pays:impT(o.pays),email,
      wa:impT(o.wa),wc:impT(o.wc),dom:impT(o.dom),an:'',eval:ev,
      ali:impUrl(o.ali_url)?'Non vérifié':'Non disponible',ali_url:impUrl(o.ali_url),devis:'',
      lang:impT(o.lang),mkt:impT(o.mkt),desc:impT(o.desc),com:'',logo:impLogoUrl(o.logo)}};
  }
  // transitaires
  const key=impNorm(nom);
  if(existing.has(key))return{err:'doublon — transitaire déjà enregistré'};
  existing.add(key);
  return{ent:{id:impId('T',ix),nom,dep:impT(o.dep),arr:impT(o.arr),contact:impT(o.contact),
    wa:impT(o.wa),tel:impT(o.tel),type:impT(o.type)||'Multimodale',ent:0,
    mar:impNum(o.mar)||'',mard:impNum(o.mard)||'',aer:impNum(o.aer)||'',aerd:impNum(o.aerd)||'',
    ass:'0',logo:impLogoUrl(o.logo)}};
}
function impRun(){
  const type=document.getElementById('imp-type').value;
  if(impState&&impState.mode==='fiche'){impRunFiche(type);return;}
  const map=impMapping(type);
  if(map.nom==null){toast('Associez la colonne « Nom » — champ obligatoire',true);return;}
  if(impState.mode==='map'){
    const prefs=impPrefs();prefs.map=prefs.map||{};
    const m={};Object.keys(map).forEach(k=>{m[impNorm(impState.headers[map[k]])]=k;});
    prefs.map[type]=m;impPrefsSave();
  }
  const rows=impState.rows;
  const added=[],errs=[],warns=[];
  const existing=impExistingKeys(type);
  impCtx={cc:{},tot:prods.length,noImgCol:type==='produits'&&map.photo==null};
  if(impCtx.noImgCol)warns.push({n:'—',msg:'colonne « Image URL » non associée — tous les produits seront importés sans image'});
  document.getElementById('imp-go').disabled=true;
  document.getElementById('imp-errs').innerHTML='';
  const prog=document.getElementById('imp-prog');prog.style.display='block';
  const fill=document.getElementById('imp-prog-fill'),lbl=document.getElementById('imp-prog-lbl');
  setProgress(fill,0);
  let i=0;
  const CH=25,hdrOff=impState.mode==='map'?2:1;
  (function step(){
    const end=Math.min(i+CH,rows.length);
    for(;i<end;i++){
      const o={};Object.keys(map).forEach(k=>{o[k]=rows[i][map[k]];});
      const r=impBuild(type,o,i,existing);
      if(r.err)errs.push({n:i+hdrOff,msg:r.err});
      else{added.push(r.ent);if(r.warn)warns.push({n:i+hdrOff,msg:r.warn});}
    }
    setProgress(fill,Math.round(i/rows.length*100));
    lbl.textContent=`${i}/${rows.length} lignes traitées…`;
    if(i<rows.length){setTimeout(step,0);return;}
    impFinish(type,added,errs,warns);
  })();
}
function impFinish(type,added,errs,warns=[]){
  if(added.length){
    if(type==='produits'){prods=prods.concat(added);save('p');renderCat();popSim();}
    if(type==='fournisseurs'){fours=fours.concat(added);save('f');renderFour();renderCat();popSim();}
    if(type==='transitaires'){trans=trans.concat(added);save('t');renderTrans();popSim();}
  }
  setProgress(document.getElementById('imp-prog-fill'),100);
  document.getElementById('imp-prog-lbl').textContent='Terminé';
  const errHtml=errs.length?`<div class="imp-summary warn"><b>${errs.length} ligne${errs.length>1?'s':''} ignorée${errs.length>1?'s':''} :</b><br>${errs.slice(0,8).map(e=>`Ligne ${e.n} — ${e.msg}`).join('<br>')}${errs.length>8?'<br>… et '+(errs.length-8)+' autres':''}</div>`:'';
  const warnHtml=warns.length?`<div class="imp-summary warn"><b>${warns.length} avertissement${warns.length>1?'s':''} (lignes importées) :</b><br>${warns.slice(0,8).map(e=>`Ligne ${e.n} — ${e.msg}`).join('<br>')}${warns.length>8?'<br>… et '+(warns.length-8)+' autres':''}</div>`:'';
  document.getElementById('imp-errs').innerHTML=
    `<div class="imp-summary ok"><b>${added.length} ${IMP_LBL[type]} importé${added.length>1?'s':''} ✓</b>${added.length?' — visibles immédiatement dans l\'application.':''}</div>`+warnHtml+errHtml;
  auditLog('import',{type,fichier:impState.fileName,importes:added.length,ignores:errs.length,avertissements:warns.length});
  toast(added.length?`${added.length} ${IMP_LBL[type]} importé${added.length>1?'s':''} ✓`:'Aucune ligne importée — voir le détail dans la fenêtre',!added.length);
}

/* ---- Fiche fournisseur / transitaire depuis un site HTML (étape 4) ----
   Extraction heuristique (nom, logo, description, contacts, routes) puis
   validation manuelle obligatoire dans un éditeur avec aperçu de la fiche. */
const IMP_FICHE_FIELDS={
  fournisseurs:[
    {k:'nom',lbl:'Nom entreprise *'},
    {k:'contact',lbl:'Personne de contact'},
    {k:'pays',lbl:'Pays'},
    {k:'email',lbl:'Email'},
    {k:'wa',lbl:'WhatsApp / Téléphone'},
    {k:'wc',lbl:'WeChat'},
    {k:'dom',lbl:'Domaine d\'activité'},
    {k:'ali_url',lbl:'Site web / Alibaba'},
    {k:'lang',lbl:'Langues'},
    {k:'mkt',lbl:'Marchés'},
    {k:'adresse',lbl:'Adresse'},
  ],
  transitaires:[
    {k:'nom',lbl:'Nom entreprise *'},
    {k:'contact',lbl:'Contact (email)'},
    {k:'tel',lbl:'Téléphone'},
    {k:'wa',lbl:'WhatsApp'},
    {k:'dep',lbl:'Pays de départ'},
    {k:'arr',lbl:'Pays d\'arrivée'},
    {k:'type',lbl:'Type logistique'},
    {k:'mar',lbl:'Tarif maritime (XOF/CBM)'},
    {k:'mard',lbl:'Délai maritime (j)'},
    {k:'aer',lbl:'Tarif aérien (XOF/kg)'},
    {k:'aerd',lbl:'Délai aérien (j)'},
    {k:'site',lbl:'Site web'},
    {k:'adresse',lbl:'Adresse'},
  ],
};
function impExtractFiche(type,rich){
  const h1=(rich.headings.find(h=>h.tag==='h1')||{}).txt||'';
  const nom=((h1||rich.title||'').split(/\s*[|–—•·]\s*/)[0]||'').trim().slice(0,80);
  const logo=(rich.images.find(im=>im.abs&&/logo/i.test(im.src+' '+im.alt+' '+im.hint))||{}).abs||'';
  const desc=(rich.metaDesc||[...rich.paragraphs.slice(0,4)].sort((a,b)=>b.length-a.length)[0]||'').slice(0,500);
  const t=rich.textLow||'';
  const base={nom,logo,desc,adresse:rich.address||''};
  if(type==='fournisseurs')return{...base,
    contact:'',pays:/chin|shenzhen|guangzhou|ningbo|yiwu|shanghai|shaanxi/.test(t)?'Chine':'',
    email:rich.emails[0]||'',wa:rich.phones[0]||'',wc:'',dom:'',
    ali_url:rich.site||'',lang:'',mkt:''};
  const modes=(/a[ée]rien|air freight|air cargo|avion/.test(t)?1:0)+(/maritime|sea freight|ocean|bateau|conteneur|container/.test(t)?2:0);
  return{...base,
    contact:rich.emails[0]||'',tel:rich.phones[0]||'',wa:rich.phones[1]||rich.phones[0]||'',
    dep:/chin|china|guangzhou|shenzhen/.test(t)?'Chine':'',
    arr:/togo|lom[eé]|afrique|africa|west africa|abidjan|cotonou|dakar/.test(t)?'Afrique de l\'Ouest':'',
    type:modes===3?'Multimodale':modes===1?'Aérienne':modes===2?'Maritime':'Multimodale',
    mar:'',mard:'',aer:'',aerd:'',site:rich.site||''};
}
function impSetFiche(file,type,rich,rawHtml){
  impState={mode:'fiche',fileName:file.name,type,fiche:impExtractFiche(type,rich),rich,rawHtml,headers:[],rows:[]};
  impShowStep2();
}
function impRenderFiche(){
  const sec=document.getElementById('imp-fiche-sec');
  if(!sec)return;
  if(!impState||impState.mode!=='fiche'){sec.style.display='none';sec.innerHTML='';return;}
  sec.style.display='block';
  const f=impState.fiche,type=impState.type;
  const okImgs=impState.rich?impState.rich.images.filter(im=>im.abs):[];
  sec.innerHTML=`
    <div class="fiche-grid">
      <div>
        <div class="fg" style="grid-template-columns:1fr 1fr">
          ${IMP_FICHE_FIELDS[type].map(fd=>`<div class="fgrp"><label class="flbl" for="fic-${fd.k}">${fd.lbl}</label><input class="fc" id="fic-${fd.k}" value="${impEsc(f[fd.k])}" oninput="impState.fiche.${fd.k}=this.value;impFichePrev()"></div>`).join('')}
        </div>
        <div class="fgrp" style="margin-top:8px"><label class="flbl" for="fic-desc">Description</label><textarea class="fc" id="fic-desc" rows="3" oninput="impState.fiche.desc=this.value;impFichePrev()">${impEsc(f.desc)}</textarea></div>
        <div class="fgrp" style="margin-top:8px"><label class="flbl" for="fic-logo">Logo (URL)</label>
          <div style="display:flex;gap:8px;align-items:center">
            <img id="fic-logo-prev" class="imp-thumb" src="${impEsc(f.logo)}" alt="" style="${f.logo?'':'display:none'}" onerror="this.style.display='none'">
            <input class="fc" id="fic-logo" value="${impEsc(f.logo)}" style="flex:1" oninput="impState.fiche.logo=this.value;impFicheLogoPrev()">
          </div>
        </div>
        ${okImgs.length?`
        <div class="flbl" style="margin:12px 0 6px">Images du site (${okImgs.length}) — cliquez pour définir le logo</div>
        <div class="rich-imgs">${okImgs.slice(0,12).map((im,i)=>`<button class="rich-img fiche-imgbtn${f.logo===im.abs?' sel':''}" onclick="impFicheSetLogo(${i})" title="Utiliser comme logo" aria-label="Utiliser cette image comme logo"><img src="${impEsc(im.abs)}" alt="${impEsc(im.alt)}" loading="lazy" onerror="this.closest('.rich-img').classList.add('bad')"></button>`).join('')}</div>
        <div style="margin-top:10px"><button class="btn btn-sec btn-sm" onclick="impImgsZip('supplier')">${ICO('download')} Télécharger logo + images (ZIP → assets/supplier/)</button></div>`:''}
      </div>
      <div>
        <div class="flbl" style="margin-bottom:6px">Aperçu de la fiche</div>
        <div class="fiche-card" id="fiche-card"></div>
      </div>
    </div>`;
  impFichePrev();
}
function impFicheSetLogo(i){
  const im=impState.rich.images.filter(x=>x.abs)[i];
  if(!im)return;
  impState.fiche.logo=impState.fiche.logo===im.abs?'':im.abs;
  impRenderFiche();
}
function impFicheLogoPrev(){
  const im=document.getElementById('fic-logo-prev');
  if(!im)return;
  const u=impT(impState.fiche.logo);
  im.src=u;im.style.display=u?'':'none';
  impFichePrev();
}
function impFichePrev(){
  const el=document.getElementById('fiche-card');
  if(!el||!impState||impState.mode!=='fiche')return;
  const f=impState.fiche,type=impState.type;
  const line=(ico,val)=>impT(val)?`<div class="fiche-line">${ICO(ico)}<span>${impEsc(val)}</span></div>`:'';
  el.innerHTML=`
    <div class="fiche-head">
      ${impT(f.logo)?`<img src="${impEsc(f.logo)}" alt="" onerror="this.style.display='none'">`:''}
      <div><div class="fiche-nom">${impEsc(f.nom)||'<span style="color:var(--muted)">Nom manquant</span>'}</div>
      <div class="fiche-sub">${impEsc(type==='fournisseurs'?[f.pays,f.dom].filter(Boolean).join(' · '):[f.dep&&'De '+f.dep,f.arr&&'vers '+f.arr,f.type].filter(Boolean).join(' · '))}</div></div>
    </div>
    ${impT(f.desc)?`<div class="fiche-desc">${impEsc(f.desc)}</div>`:''}
    ${line('mail',type==='fournisseurs'?f.email:f.contact)}
    ${line('phone',type==='fournisseurs'?f.wa:(f.tel||f.wa))}
    ${line('globe',type==='fournisseurs'?f.ali_url:f.site)}
    ${type==='fournisseurs'?line('user',f.contact):''}
    ${line('target',f.adresse)}
    ${type==='transitaires'?line('ship',impT(f.mar)?f.mar+' XOF/CBM · '+(f.mard||'—')+' j':''):''}
    ${type==='transitaires'?line('plane',impT(f.aer)?f.aer+' XOF/kg · '+(f.aerd||'—')+' j':''):''}`;
}
/* Création de la fiche — réutilise impBuild (validation email, doublons, format
   d'entité) pour rester cohérent avec l'import tabulaire. */
function impRunFiche(type){
  const f=impState.fiche;
  if(!impT(f.nom)){toast('Le nom de l\'entreprise est obligatoire',true);return;}
  const o=type==='fournisseurs'
    ?{nom:f.nom,contact:f.contact,pays:f.pays,email:f.email,wa:f.wa,wc:f.wc,dom:f.dom,
      ali_url:f.ali_url,lang:f.lang,mkt:f.mkt,logo:f.logo,
      desc:[impT(f.desc),impT(f.adresse)?'Adresse : '+impT(f.adresse):''].filter(Boolean).join('\n')}
    :{nom:f.nom,dep:f.dep,arr:f.arr,contact:f.contact,wa:f.wa,tel:f.tel,type:f.type,
      mar:f.mar,mard:f.mard,aer:f.aer,aerd:f.aerd,logo:f.logo};
  const r=impBuild(type,o,0,impExistingKeys(type));
  if(r.err){
    document.getElementById('imp-errs').innerHTML=`<div class="imp-summary warn"><b>Création impossible :</b> ${r.err}</div>`;
    toast('Création impossible — '+r.err,true);return;
  }
  if(type==='transitaires')r.ent.desc=[impT(f.desc),impT(f.site)?'Site : '+impT(f.site):'',impT(f.adresse)?'Adresse : '+impT(f.adresse):''].filter(Boolean).join('\n');
  impFinish(type,[r.ent],[],[]);
  document.getElementById('imp-go').disabled=true; // évite une double création au re-clic
}

/* ---- Panneau « contenu extrait » du HTML : sections éditables (étape 3) ---- */
const impEsc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function impRichRef(path){
  const parts=String(path).split('.');
  let obj=impState.rich;
  for(let i=0;i<parts.length-1&&obj;i++)obj=obj[parts[i]];
  return{obj,key:parts[parts.length-1]};
}
function impRichSet(path,val){
  const{obj,key}=impRichRef(path);
  if(obj)obj[key]=val;
}
function impRichDel(path){
  const{obj,key}=impRichRef(path);
  if(Array.isArray(obj))obj.splice(parseInt(key),1);
  else if(obj)obj[key]='';
  impRenderRich();
}
function impRichAdd(){
  if(!impState.rich)return;
  impState.rich.custom.push({k:'',v:''});
  impRenderRich();
}
function impRenderRich(){
  const sec=document.getElementById('imp-rich-sec');
  if(!sec)return;
  const r=impState&&impState.rich;
  if(!r||impState.mode==='fiche'){sec.style.display='none';sec.innerHTML='';return;}
  sec.style.display='block';
  const inp=(path,val,ph)=>`<div class="rich-row"><input class="fc" value="${impEsc(val)}" placeholder="${ph||''}" oninput="impRichSet('${path}',this.value)" aria-label="${ph||'Information extraite'}"><button class="expand-cell" onclick="impRichDel('${path}')" title="Supprimer" aria-label="Supprimer cette information">${ICO('trash')}</button></div>`;
  const sect=(title,inner,open)=>inner?`<details class="rich-sect"${open?' open':''}><summary>${title}</summary><div class="rich-body">${inner}</div></details>`:'';
  const gen=[
    r.title?inp('title',r.title,'Titre de la page'):'',
    r.metaDesc?inp('metaDesc',r.metaDesc,'Meta description'):'',
    ...r.headings.map((h,i)=>inp(`headings.${i}.txt`,h.txt,'Titre '+h.tag)),
  ].join('');
  const desc=r.paragraphs.map((t,i)=>inp(`paragraphs.${i}`,t,'Paragraphe')).join('');
  const contact=[
    ...r.emails.map((e,i)=>inp(`emails.${i}`,e,'Email')),
    ...r.phones.map((t,i)=>inp(`phones.${i}`,t,'Téléphone')),
    r.address?inp('address',r.address,'Adresse'):'',
    r.site?inp('site',r.site,'Site web'):'',
  ].join('');
  const lists=r.lists.map((l,i)=>l.map((it,j)=>inp(`lists.${i}.${j}`,it,'Élément de liste')).join('')).join('<hr class="rich-hr">');
  const okImgs=r.images.filter(im=>im.abs);
  const nRel=r.images.length-okImgs.length;
  const imgs=okImgs.length?`<div class="rich-imgs">${okImgs.map((im,i)=>`
    <div class="rich-img">
      <img src="${impEsc(im.abs)}" alt="${impEsc(im.alt)}" loading="lazy" onerror="this.closest('.rich-img').classList.add('bad')">
      <select class="fc" onchange="impRichUseImg(${i},this)" aria-label="Associer cette image à une ligne du tableau">
        <option value="">Associer à…</option>
        ${impState.rows.slice(0,80).map((row,ri)=>`<option value="${ri}">L${ri+1} — ${impEsc(String(row[0]||'').slice(0,26))}</option>`).join('')}
      </select>
    </div>`).join('')}</div>
    ${nRel?`<div style="font-size:11px;color:var(--muted);margin-top:6px">${nRel} image(s) au chemin relatif non résolu (site source inconnu) ignorée(s)</div>`:''}
    <div style="margin-top:10px"><button class="btn btn-sec btn-sm" onclick="impImgsZip('produits')">${ICO('download')} Télécharger les images (ZIP → assets/Products images/)</button></div>`:'';
  const custom=r.custom.map((cst,i)=>`<div class="rich-row"><input class="fc" style="max-width:150px;flex:0 1 auto" value="${impEsc(cst.k)}" placeholder="Nom du champ" oninput="impRichSet('custom.${i}.k',this.value)" aria-label="Nom du champ ajouté"><input class="fc" value="${impEsc(cst.v)}" placeholder="Valeur" oninput="impRichSet('custom.${i}.v',this.value)" aria-label="Valeur du champ ajouté"><button class="expand-cell" onclick="impRichDel('custom.${i}')" title="Supprimer" aria-label="Supprimer ce champ">${ICO('trash')}</button></div>`).join('');
  sec.innerHTML=`
    <div class="flbl" style="margin:2px 0 8px">Contenu extrait du HTML <span style="text-transform:none;letter-spacing:0;font-weight:400">(vérifiez, corrigez ou supprimez — les tarifs restent dans le tableau ci-dessus)</span></div>
    ${sect('Infos générales',gen,true)}
    ${sect('Description',desc)}
    ${sect('Contact',contact)}
    ${sect(`Images (${okImgs.length})`,imgs)}
    ${sect('Listes à puces',lists)}
    ${custom?sect('Champs ajoutés',custom,true):''}
    <div style="margin:8px 0 14px"><button class="btn btn-ghost btn-sm" onclick="impRichAdd()">${ICO('plus')} Ajouter un champ</button></div>`;
}
function impRichUseImg(i,sel){
  const ri=parseInt(sel.value);sel.value='';
  if(isNaN(ri))return;
  const im=impState.rich.images.filter(x=>x.abs)[i];
  if(!im)return;
  const col=impEnsureImgCol();
  impState.rows[ri][col]=im.abs;
  impRenderPrev();
  toast(`Image associée à la ligne ${ri+1} ✓`);
}
/* Télécharge les images extraites en ZIP, nommées avec le dossier assets cible */
async function impImgsZip(kind){
  const r=impState&&impState.rich;
  if(!r)return;
  const imgs=(kind==='supplier'&&impState.fiche?[{abs:impState.fiche.logo,alt:'logo'}].filter(x=>x.abs):[]).concat(r.images.filter(im=>im.abs));
  const seen=new Set(),list=imgs.filter(im=>{if(seen.has(im.abs))return false;seen.add(im.abs);return true;});
  if(!list.length){toast('Aucune image téléchargeable',true);return;}
  const dir=kind==='supplier'?'assets/supplier/':'assets/Products images/';
  const prog=document.getElementById('imp-prog'),fill=document.getElementById('imp-prog-fill'),lbl=document.getElementById('imp-prog-lbl');
  prog.style.display='block';setProgress(fill,0);
  const files=[];let fail=0;const used=new Set();
  const uniq=n=>{let b=n,i=2;while(used.has(b)){b=n.replace(/(\.[^.]+)$/,`-${i}$1`);i++;}used.add(b);return b;};
  for(let i=0;i<list.length;i++){
    lbl.textContent=`Téléchargement ${i+1}/${list.length}…`;
    try{
      const res=await fetch(list[i].abs);
      if(!res.ok)throw new Error(res.status);
      const blob=await res.blob();
      let name=decodeURIComponent((list[i].abs.split('/').pop()||'').split('?')[0]).trim()||'image-'+(i+1)+'.jpg';
      if(/^data:/.test(list[i].abs))name=(impNorm(list[i].alt)||'image-'+(i+1))+'.jpg';
      if(!impImgExt.test(name))name+='.jpg';
      files.push({name:dir+uniq(name.replace(/[^\w .()À-ſ-]/g,'_')),blob});
    }catch(_){fail++;}
    setProgress(fill,Math.round((i+1)/list.length*100));
  }
  prog.style.display='none';
  if(!files.length){toast('Téléchargement impossible — le site source bloque l\'accès (CORS)',true);return;}
  expSaveBlob(await zipStore(files),'GoFlow_ImagesHTML_'+new Date().toISOString().slice(0,10)+'.zip');
  auditLog('html_images_zip',{fichier:impState.fileName,images:files.length,echecs:fail,dossier:dir});
  toast(`${files.length} image${files.length>1?'s':''} dans le ZIP ✓ — à déposer dans ${dir.replace(/\/$/,'')}${fail?` (${fail} échec${fail>1?'s':''} CORS)`:''}`);
}

/* ---- Upload d'images en masse : dossier (ou fichiers) → association par nom ----
   Les images sont réduites (700 px max, JPEG) et stockées en data-URL dans la
   colonne « Image URL » de la ligne dont le nom de produit correspond au nom
   de fichier (ex. hydrafacial.jpg → « Hydrafacial 17-en-1 »). */
function impFileToDataURL(f,max=700){
  return new Promise(res=>{
    const url=URL.createObjectURL(f);
    const im=new Image();
    im.onload=()=>{
      const s=Math.min(1,max/Math.max(im.width,im.height));
      const cv=document.createElement('canvas');
      cv.width=Math.max(1,Math.round(im.width*s));cv.height=Math.max(1,Math.round(im.height*s));
      cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg',.82));
    };
    im.onerror=()=>{URL.revokeObjectURL(url);res('');};
    im.src=url;
  });
}
/* Garantit une colonne « Image URL » dans les données en cours (la crée au besoin,
   en préservant le mapping déjà choisi par l'utilisateur). Retourne son index. */
function impEnsureImgCol(){
  let col=impMapping('produits').photo;
  if(col!=null)return col;
  const saveSel={};
  if(impState.mode==='map')IMP_FIELDS.produits.forEach(f=>{const el=document.getElementById('imap-'+f.k);if(el)saveSel[f.k]=el.value;});
  impState.headers.push('Image URL');
  impState.rows.forEach(r=>r.push(''));
  col=impState.headers.length-1;
  if(impState.mode==='map'){
    impRenderMap();
    Object.keys(saveSel).forEach(k=>{const el=document.getElementById('imap-'+k);if(el&&saveSel[k]!=null)el.value=saveSel[k];});
    const ph=document.getElementById('imap-photo');if(ph)ph.value=String(col);
  }
  return col;
}
async function impBulkImgs(inp){
  const files=[...inp.files].filter(f=>/^image\//.test(f.type)||impImgExt.test(f.name));
  inp.value='';
  if(!impState||document.getElementById('imp-type').value!=='produits')return;
  if(!files.length){toast('Aucune image dans la sélection',true);return;}
  const prog=document.getElementById('imp-prog'),fill=document.getElementById('imp-prog-fill'),lbl=document.getElementById('imp-prog-lbl');
  prog.style.display='block';setProgress(fill,0);lbl.textContent='Lecture des images…';
  const col=impEnsureImgCol();
  const nomCol=impMapping('produits').nom??0;
  const keyOf=n=>impNorm(String(n).split(/[\\/]/).pop().replace(/\.[^.]+$/,''));
  const items=[];
  for(let i=0;i<files.length;i++){
    const d=await impFileToDataURL(files[i]);
    if(d)items.push({key:keyOf(files[i].name),data:d});
    setProgress(fill,Math.round((i+1)/files.length*100));
    lbl.textContent=`Lecture des images… ${i+1}/${files.length}`;
  }
  let hits=0;
  impState.rows.forEach(r=>{
    const pn=impNorm(r[nomCol]);
    if(!pn)return;
    let best=null,bs=0;
    items.forEach(it=>{
      if(!it.key)return;
      let s=0;
      if(it.key===pn)s=3;
      else if(pn.includes(it.key)&&it.key.length>=4)s=2;
      else if(it.key.includes(pn)&&pn.length>=4)s=1;
      if(s>bs){bs=s;best=it;}
    });
    if(best){r[col]=best.data;hits++;}
  });
  impRenderPrev();
  prog.style.display='none';
  toast(hits?`${hits} produit${hits>1?'s':''} associé${hits>1?'s':''} à une image ✓`:'Aucune correspondance entre noms de fichiers et noms de produits',!hits);
}
/* ===== FIN MODULE IMPORT ===== */
