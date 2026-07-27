/* ============================================================
   MODULE DEVIS — État global + Panier + PDF
   Séparé intentionnellement de calc() (simulation interne)
   ============================================================ */
const DK='gf_d',DCK='gf_dc',DPK='gf_dp',DFK='gf_dvfilt';
let devisCart=[],devisClient={},devisPrefs={},devisView='grid';
let devisFilters={q:'',cat:'',four:'',trans:'',sort:''};
let devisFX={dev:'XOF',taux:1};
let fxCache={rates:null,ts:0};
let fxReqSeq=0;
let pdfLang='fr'; // langue du PDF en cours de génération uniquement — n'affecte jamais l'interface

// Les colonnes du devis (aperçu ET export PDF) sont gérées par le gestionnaire universel (CM_DEFS.devis)
// assurance : Assurance Produit optionnelle du devis (distincte de la Trade Assurance globale des paramètres) —
// appliquée sur le Montant Total HT du devis, taux transitaire par défaut ou 2 %
const DV_PREFS_DEFAULT={strategy:'marge_fixe',margeFixe:35,margePerso:35,assurance:{on:false,val:null},pdfCgv:true};

/* ---- CHARGEMENT / PERSISTANCE ---- */
async function loadDevis(){
  devisCart=await IDB_GET(DK,[]);
  // Rétro-compatibilité : commentaire absent sur les anciens paniers + MOQ non figé dans le snapshot
  devisCart.forEach(it=>{
    if(typeof it.comment!=='string')it.comment='';
    if(it.snap&&it.snap.moq==null){const p=prods.find(x=>x.id===it.pid);it.snap.moq=p?(p.moq||1):1;}
    if(it.snap&&it.snap.marge===undefined){const p=prods.find(x=>x.id===it.pid);it.snap.marge=p?p.marge:'';}
    // Rétro-compatibilité : édition des champs devis absente sur les anciens paniers —
    // orig prend simplement le snapshot existant comme référence catalogue (pas d'historique antérieur connu)
    if(!it.orig){
      const s=it.snap||{};
      it.orig={nom:s.nom,ref:s.ref,cat:s.cat,dev:s.dev,tr:s.tr,desc:s.desc,specs:s.specs,
        prix:s.prix,prach:s.prach,kg:s.kg,l:s.l,la:s.la,h:s.h,moq:s.moq};
    }
    if(!it.nego)it.nego={};
    if(!it.active)it.active={prix:'cat',prach:'cat',kg:'cat',dims:'cat',moq:'cat'};
    if(!it.edited)it.edited={};
  });
  devisClient=(await IDB_GET(DCK,null))||{nom:'',ent:'',email:'',tel:'',adr:'',ville:''};
  const saved=await IDB_GET(DPK,null);
  devisPrefs=saved?{...DV_PREFS_DEFAULT,...saved}:{...DV_PREFS_DEFAULT};
  delete devisPrefs.show; // migré vers gf_cols (cmMigrateLegacy)
  if(saved&&saved.fx){devisFX={dev:saved.fx.dev||'XOF',taux:saved.fx.taux||1};}
  const savedFilt=LS_GET(DFK,null);
  devisFilters=savedFilt?{q:'',cat:'',four:'',trans:'',sort:'',...savedFilt}:{q:'',cat:'',four:'',trans:'',sort:''};
  updateCartBadge();
}
function saveDevisCartLS(){IDB_SET(DK,devisCart);updateCartBadge();}
function saveDevisClient(){
  devisClient={
    nom:document.getElementById('dv-nom').value,
    ent:document.getElementById('dv-ent').value,
    email:document.getElementById('dv-email').value,
    tel:document.getElementById('dv-tel').value,
    adr:document.getElementById('dv-adr').value,
    ville:document.getElementById('dv-ville').value,
    assujetti:document.getElementById('dv-assuj').checked,
  };
  IDB_SET(DCK,devisClient);
}
function saveDevisPrefs(){
  if(devisPrefs.strategy==='personnalise'){
    const el=document.getElementById('strat-perso-val');
    if(el)devisPrefs.margePerso=parseFloat(el.value)||35;
  }
  devisPrefs.fx={dev:devisFX.dev,taux:devisFX.taux};
  IDB_SET(DPK,devisPrefs);
  // Marge personnalisée : réécrite sur les produits du panier pour que le catalogue affiche le même PV HT
  if(devisPrefs.strategy==='personnalise')applyPersoMargeToCart();
}

// Propage la marge personnalisée du devis vers les produits du catalogue présents dans le panier
function applyPersoMargeToCart(){
  const m=parseFloat(devisPrefs.margePerso);
  if(isNaN(m)||!devisCart.length)return;
  let changed=false;
  devisCart.forEach(it=>{
    const p=prods.find(x=>x.id===it.pid);
    if(p&&parseFloat(p.marge)!==m){p.marge=m;changed=true;}
    if(it.snap)it.snap.marge=m;
  });
  if(changed){save('p');saveDevisCartLS();renderCat();}
}

// Rafraîchit les snapshots du panier depuis les produits vivants (après édition d'un produit)
function syncCartFromProds(){
  let changed=false;
  devisCart.forEach(it=>{
    const p=prods.find(x=>x.id===it.pid);
    if(!p||!it.snap)return;
    const f=fours.find(x=>x.id===p.fid);
    Object.assign(it.snap,{nom:p.nom,ref:p.ref||it.snap.ref,cat:p.cat,fid:p.fid,fn:p.fn,
      prix:p.prix,prach:p.prach||0,dev:p.dev||'RMB',marge:p.marge,
      l:p.l,la:p.la,h:p.h,kg:p.kg,tr:p.tr,moq:p.moq||1,
      photos:p.photos||[],desc:p.desc||'',specs:p.specs||'',
      four_nom:f?f.nom:it.snap.four_nom,four_pays:f?f.pays:it.snap.four_pays,four_contact:f?f.contact:it.snap.four_contact});
    changed=true;
  });
  if(changed){
    saveDevisCartLS();
    if(document.getElementById('t-devis').style.display!=='none')renderDevisCart();
  }
}

function updateCartBadge(){
  const n=devisCart.length,el=document.getElementById('cart-count');
  el.textContent=n;el.style.display=n?'inline-block':'none';
}

/* ---- TAUX DE CHANGE (API + cache 1h) ---- */
async function fetchFXRates(){
  const now=Date.now();
  if(fxCache.rates&&(now-fxCache.ts)<3600000)return fxCache.rates;
  try{
    const r=await fetch('https://open.er-api.com/v6/latest/USD');
    if(!r.ok)throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(!d.rates)throw new Error('Réponse invalide');
    fxCache={rates:d.rates,ts:now};
    return d.rates;
  }catch(e){console.warn('FX API:',e);return null;}
}

function xofPer(dev,rates){
  if(dev==='XOF')return 1;
  const fb={USD:600,EUR:655.957,RMB:S.tauxChange};
  if(!rates)return fb[dev]||1;
  const xpu=rates.XOF||600;
  const code=dev==='RMB'?'CNY':dev;
  const dpu=rates[code]||1;
  return xpu/dpu;
}

const DV_SYM={XOF:'F',USD:'$',EUR:'€',RMB:'¥'};
const DV_NAMES={XOF:'F CFA',USD:'USD ($)',EUR:'EUR (€)',RMB:'RMB (¥)'};

function toDevisDev(xof){return(devisFX.dev==='XOF'||!devisFX.taux)?xof:xof/devisFX.taux;}

function Ndv(xof){
  const v=toDevisDev(xof);
  if(devisFX.dev==='XOF')return N(v);
  const sym=DV_SYM[devisFX.dev]||devisFX.dev;
  return sym+' '+v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

async function onDevisDevChange(){
  const dev=document.getElementById('dv-dev').value;
  devisFX.dev=dev;
  const spin=document.getElementById('dv-fx-spin');
  const msg=document.getElementById('dv-fx-msg');
  const inp=document.getElementById('dv-taux');
  document.getElementById('dv-taux-lbl').textContent='XOF pour 1 '+(DV_NAMES[dev]||dev);
  if(dev==='XOF'){
    inp.value=1;devisFX.taux=1;msg.innerHTML='';
    renderDevisCart();saveDevisPrefs();return;
  }
  spin.style.display='inline-block';inp.value='';
  msg.innerHTML='<span style="color:var(--muted)">Récupération du taux en cours…</span>';
  const reqId=++fxReqSeq;
  const rates=await fetchFXRates();
  if(reqId!==fxReqSeq)return; // une devise plus récente a été sélectionnée entre-temps
  spin.style.display='none';
  const t=xofPer(dev,rates);
  inp.value=t.toFixed(4);devisFX.taux=t;
  if(rates){
    const hm=new Date(fxCache.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    msg.innerHTML=`<span style="color:var(--vert-t)">✓ Taux marché (${hm}) — modifiable librement</span>`;
  }else{
    msg.innerHTML=`<span style="color:var(--warn)">API indisponible — taux de secours utilisé. Saisissez le bon taux si besoin.</span>`;
  }
  renderDevisCart();saveDevisPrefs();
}

function onDevisTauxChange(){
  const v=parseFloat(document.getElementById('dv-taux').value);
  if(v>0){devisFX.taux=v;document.getElementById('dv-fx-msg').innerHTML=`<span style="color:var(--bleu-t)">Taux saisi manuellement</span>`;renderDevisCart();}
}

/* ---- CALCUL DEVIS (mêmes règles que le moteur central, marge selon la stratégie du devis) ---- */
// Marge effective d'un item : celle du produit vivant du catalogue (fallback : snapshot),
// modulée par la stratégie du devis — garantit le même PV HT que le catalogue en stratégie standard
function devisItemMarge(item){
  const live=prods.find(x=>x.id===item.pid);
  const src=live||item.snap||{};
  const base=(src.marge!==''&&src.marge!=null&&!isNaN(parseFloat(src.marge)))?parseFloat(src.marge):S.tauxMarge;
  const strat=devisPrefs.strategy||'marge_fixe';
  if(strat==='competitif')return base*0.6;
  if(strat==='premium')return base*1.2;
  if(strat==='personnalise')return parseFloat(devisPrefs.margePerso)||base;
  return base;
}
// Taux d'application devise d'achat → XOF pour un item du devis : conversion directe et cohérente
// avec le taux devise du devis → XOF (dv-dev/dv-taux), pour éviter toute perte de précision liée
// à un double aller-retour par deux tables de taux différentes (bug : « Prix HT » d'un produit acheté
// et devisé dans la même devise devait être une identité, ce qui n'était pas garanti auparavant).
function devisTauxAchat(srcDev){
  const dev=srcDev||'RMB';
  if(dev===devisFX.dev)return devisFX.taux; // même devise des deux côtés : taux forcément identique
  if(fxCache.rates)return xofPer(dev,fxCache.rates); // taux live, cohérent avec celui du devis
  return xofRate(dev); // secours hors-ligne (comportement historique)
}
function calcDevis(item){
  const p=item.snap;
  const mgPct=devisItemMarge(item);
  const e=calcEngine({
    exw:parseFloat(p.prix)||0,fretLocal:parseFloat(p.prach)||0,dev:p.dev||'RMB',
    qty:item.qty||1,tauxChange:devisTauxAchat(p.dev),
    margePct:mgPct,remisePct:0,
    l:p.l,la:p.la,h:p.h,dimU:p.dimU||'cm',kg:p.kg,mode:p.tr||'Maritime',
    tarifAerien:S.tarifAerien,tarifMaritime:S.tarifMaritime,
    transfert:S.trf,assurance:S.assu,
    tvaInterne:S.tvaInterne,assujetti:!!devisClient.assujetti});
  return{...e,mgPct:r2(mgPct),prix_src:p.prix};
}

/* ---- ACTIONS PANIER ---- */
function addToCart(pid){
  const p=prods.find(x=>x.id===pid);if(!p)return;
  // Toggle : un second clic retire le produit du devis (la quantité s'ajuste dans l'onglet Devis)
  if(devisCart.some(x=>x.pid===pid)){
    devisCart=devisCart.filter(x=>x.pid!==pid);
    saveDevisCartLS();renderCat();toast(p.nom+' retiré du devis');return;
  }
  const f=fours.find(x=>x.id===p.fid);
  const t0=trans.length?trans[0]:null;
  devisCart.push({
    cid:'C'+String(Date.now()).slice(-8),pid,qty:1,comment:'',
    snap:{
      nom:p.nom,ref:p.ref,cat:p.cat,fid:p.fid,fn:p.fn,
      prix:p.prix,prach:p.prach||0,dev:p.dev||'RMB',marge:p.marge,
      l:p.l,la:p.la,h:p.h,kg:p.kg,tr:p.tr,moq:p.moq||1,
      photos:p.photos||[],desc:p.desc||'',specs:p.specs||'',
      four_nom:f?f.nom:'',four_pays:f?f.pays:'',four_contact:f?f.contact:'',
      trans_nom:t0?t0.nom:'',trans_type:t0?t0.type:'',
      trans_delai:t0?(p.tr==='Aérien'?t0.aerd:t0.mard)||'':''
    },
    // Édition devis : orig = valeurs catalogue figées à l'ajout (référence pour le bouton « Catalogue »)
    // nego = valeurs négociées connues pour ce produit (héritées du catalogue, réutilisables entre devis)
    // active = source actuellement appliquée par champ négociable ; edited = marqueurs « modifié » (badge)
    orig:{nom:p.nom,ref:p.ref,cat:p.cat,dev:p.dev||'RMB',tr:p.tr,desc:p.desc||'',specs:p.specs||'',
      prix:p.prix,prach:p.prach||0,kg:p.kg,l:p.l,la:p.la,h:p.h,moq:p.moq||1},
    nego:{...(p.nego||{})},
    active:{prix:'cat',prach:'cat',kg:'cat',dims:'cat',moq:'cat'},
    edited:{}
  });
  saveDevisCartLS();renderCat();toast(p.nom+' ajouté au devis ✓');
}

function removeFromCart(cid){
  devisCart=devisCart.filter(x=>x.cid!==cid);
  saveDevisCartLS();renderDevisCart();renderCat();
}

function updateCartQty(cid,qty){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  item.qty=Math.max(1,parseInt(qty)||1);
  saveDevisCartLS();
}

/* ---- COMMENTAIRE PAR PRODUIT (note interne, sauvegardée avec l'item du panier) ---- */
function dvComment(cid,val){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  item.comment=String(val).slice(0,300);
  saveDevisCartLS();
  // Le bouton × n'apparaît que s'il y a un commentaire — sans re-render pour garder le focus
  const btn=document.querySelector(`[data-dvnote-clear="${cid}"]`);
  if(btn)btn.style.display=item.comment?'inline-flex':'none';
}
function dvClearComment(cid){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  item.comment='';saveDevisCartLS();
  dvPreserveScroll(()=>{
    const list=getFilteredDevisCart();
    document.getElementById('dv-cart-cont').innerHTML=devisView==='grid'?buildDevisGrid(list):buildDevisTable(list);
  });
}
// Auto-resize du textarea commentaire : hauteur adaptée au contenu, plafonnée à 120px (scroll au-delà)
function dvNoteGrow(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,120)+'px';
}
// Champ de saisie inline (carte et table) — textarea multi-lignes, éditable au clic, auto-sauvegardé.
// fs = taille de police, alignée sur la désignation du contexte (13.5px carte / 12.5px table)
function dvNoteField(item,fs){
  const esc=String(item.comment||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const rows=Math.min(6,Math.max(2,String(item.comment||'').split('\n').length));
  return`<div style="display:flex;align-items:flex-start;gap:6px">
    <span style="color:var(--muted);flex-shrink:0;margin-top:4px" title="Commentaire client">${ICO('pencil')}</span>
    <textarea class="dv-note-ta" rows="${rows}" maxlength="300" placeholder="Ajouter une note..."
      aria-label="Commentaire sur ${String(item.snap.nom||'').replace(/"/g,'&quot;')}"
      oninput="dvComment('${item.cid}',this.value);dvNoteGrow(this)"
      onfocus="dvNoteGrow(this)"
      style="font-size:${fs||'12.5px'}">${esc}</textarea>
    <button data-dvnote-clear="${item.cid}" onclick="dvClearComment('${item.cid}')" title="Effacer le commentaire" aria-label="Effacer le commentaire"
      style="display:${item.comment?'inline-flex':'none'};align-items:center;border:none;background:transparent;cursor:pointer;color:var(--muted);padding:2px">${ICO('x')}</button>
  </div>`;
}

function clearCart(){
  if(!devisCart.length)return;
  const n=devisCart.length;
  askConfirm(`Vider les ${n} article${n>1?'s':''} du panier de devis ?`,{title:'Vider le panier',okLabel:'Vider'}).then(ok=>{
    if(!ok)return;
    const prev=devisCart;
    devisCart=[];saveDevisCartLS();renderDevisCart();renderCat();
    toastUndo('Panier de devis vidé',()=>{
      devisCart=prev;saveDevisCartLS();renderDevisCart();renderCat();toast('Suppression annulée');
    });
  });
}

function isInCart(pid){return devisCart.some(x=>x.pid===pid);}

/* ---- RECHERCHE / FILTRES / TRI DU DEVIS ----
   État persistant (gf_dvfilt) : recherche texte + filtres catégorie/fournisseur/transitaire
   + tri. S'applique à l'aperçu (grille/liste), à la barre de totaux ET au PDF généré,
   qui doivent toujours refléter exactement les mêmes lignes, dans le même ordre. */
const DV_SORT_LABELS={
  nom_asc:'Nom (A→Z)',nom_desc:'Nom (Z→A)',
  prix_asc:'Prix HT croissant',prix_desc:'Prix HT décroissant',
  qty_asc:'Quantité croissante',qty_desc:'Quantité décroissante',
  four_asc:'Fournisseur (A→Z)',four_desc:'Fournisseur (Z→A)',
  cat_asc:'Catégorie (A→Z)',cat_desc:'Catégorie (Z→A)',
};
function saveDevisFilters(){LS_SET(DFK,devisFilters);}
function dvFilterChange(){
  devisFilters.q=document.getElementById('dv-search').value||'';
  devisFilters.cat=document.getElementById('dv-f-cat').value||'';
  devisFilters.four=document.getElementById('dv-f-four').value||'';
  devisFilters.trans=document.getElementById('dv-f-trans').value||'';
  devisFilters.sort=document.getElementById('dv-sort').value||'';
  saveDevisFilters();
  renderDevisCart();
}
function dvClearFilter(key){
  devisFilters[key]='';
  saveDevisFilters();
  renderDevisCart();
}
function resetDevisFilters(){
  devisFilters={q:'',cat:'',four:'',trans:'',sort:''};
  localStorage.removeItem(DFK);
  renderDevisCart();
}
// Retourne le panier filtré + trié selon devisFilters — source unique pour l'aperçu et le PDF
function getFilteredDevisCart(){
  const q=(devisFilters.q||'').toLowerCase().trim();
  let list=devisCart.filter(it=>{
    const p=it.snap;
    if(q&&!((p.nom||'').toLowerCase().includes(q)||(p.ref||'').toLowerCase().includes(q)||(p.fn||'').toLowerCase().includes(q)))return false;
    if(devisFilters.cat&&p.cat!==devisFilters.cat)return false;
    if(devisFilters.four&&p.fn!==devisFilters.four)return false;
    if(devisFilters.trans&&p.trans_nom!==devisFilters.trans)return false;
    return true;
  });
  if(devisFilters.sort){
    const ix=devisFilters.sort.lastIndexOf('_');
    const key=devisFilters.sort.slice(0,ix),dir=devisFilters.sort.slice(ix+1);
    const mul=dir==='desc'?-1:1;
    list=[...list].sort((a,b)=>{
      let va,vb;
      if(key==='nom'){va=(a.snap.nom||'').toLowerCase();vb=(b.snap.nom||'').toLowerCase();}
      else if(key==='prix'){va=calcDevis(a).pvuHT;vb=calcDevis(b).pvuHT;}
      else if(key==='qty'){va=a.qty||0;vb=b.qty||0;}
      else if(key==='four'){va=(a.snap.fn||'').toLowerCase();vb=(b.snap.fn||'').toLowerCase();}
      else if(key==='cat'){va=(a.snap.cat||'').toLowerCase();vb=(b.snap.cat||'').toLowerCase();}
      else return 0;
      if(va<vb)return-1*mul;
      if(va>vb)return 1*mul;
      return 0;
    });
  }
  return list;
}
// Remplit les <select> de filtres à partir des valeurs présentes dans le panier
// (et nettoie un filtre devenu orphelin, ex : dernier produit d'une catégorie retiré)
function dvPopulateFilterSelects(){
  const cats=[...new Set(devisCart.map(i=>i.snap.cat).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const fours_=[...new Set(devisCart.map(i=>i.snap.fn).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const transs=[...new Set(devisCart.map(i=>i.snap.trans_nom).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(devisFilters.cat&&!cats.includes(devisFilters.cat))devisFilters.cat='';
  if(devisFilters.four&&!fours_.includes(devisFilters.four))devisFilters.four='';
  if(devisFilters.trans&&!transs.includes(devisFilters.trans))devisFilters.trans='';
  const fill=(id,items,curVal,allLbl)=>{
    document.getElementById(id).innerHTML=`<option value="">${allLbl}</option>`+
      items.map(v=>`<option value="${escH(v)}"${v===curVal?' selected':''}>${escH(v)}</option>`).join('');
  };
  fill('dv-f-cat',cats,devisFilters.cat,'Toutes catégories');
  fill('dv-f-four',fours_,devisFilters.four,'Tous fournisseurs');
  fill('dv-f-trans',transs,devisFilters.trans,'Tous transitaires');
}
// Puces de filtres actifs, chacune supprimable individuellement
function dvRenderChips(){
  const chips=[];
  if(devisFilters.q)chips.push(['q','Recherche : "'+devisFilters.q+'"']);
  if(devisFilters.cat)chips.push(['cat','Catégorie : '+devisFilters.cat]);
  if(devisFilters.four)chips.push(['four','Fournisseur : '+devisFilters.four]);
  if(devisFilters.trans)chips.push(['trans','Transitaire : '+devisFilters.trans]);
  if(devisFilters.sort)chips.push(['sort','Tri : '+(DV_SORT_LABELS[devisFilters.sort]||devisFilters.sort)]);
  document.getElementById('dv-filter-chips').innerHTML=chips.map(([key,lbl])=>
    `<span class="dv-chip">${escH(lbl)}<button onclick="dvClearFilter('${key}')" aria-label="Retirer ce filtre">${ICO('x')}</button></span>`
  ).join('');
}

/* ---- STRATÉGIE DE PRIX ---- */
function setStrategy(s){
  devisPrefs.strategy=s;saveDevisPrefs();
  ['strat-marge','strat-comp','strat-prem','strat-perso'].forEach(id=>document.getElementById(id).classList.remove('active'));
  const map={marge_fixe:'strat-marge',competitif:'strat-comp',premium:'strat-prem',personnalise:'strat-perso'};
  document.getElementById(map[s]).classList.add('active');
  const base=devisPrefs.margeFixe||35;
  const persoRow=document.getElementById('strat-perso-row');
  persoRow.style.display=s==='personnalise'?'flex':'none';
  const msgs={
    marge_fixe:`Marge du catalogue appliquée à chaque produit (marge produit, sinon ${S.tauxMarge}% par défaut) — mêmes prix que dans le Catalogue.`,
    competitif:`Prix compétitif : marge de chaque produit réduite de 40 % pour séduire le client.`,
    premium:`Position premium : marge de chaque produit majorée de 20 % pour clientèle haut de gamme.`,
    personnalise:`Marge personnalisée : entrez librement votre taux ci-dessus — il est aussi appliqué aux produits du panier dans le Catalogue.`
  };
  document.getElementById('strat-detail').textContent=msgs[s]||'';
  renderDevisCart();
}

/* ---- ASSURANCE PRODUIT DU DEVIS (optionnelle, sur le Montant Total HT) ---- */
// Taux par défaut : celui du transitaire (champ "Assurance incluse", t.ass) sinon 2 %
function devisAssuDefaultRate(){
  const t0=trans&&trans.length?trans[0]:null;
  const r=t0?parseFloat(t0.ass):NaN;
  return(!isNaN(r)&&r>0)?r:2;
}
function devisAssuRate(){
  const v=devisPrefs.assurance&&devisPrefs.assurance.val;
  return(v!=null&&v!=='')?parseFloat(v):devisAssuDefaultRate();
}
function onDevisAssuToggle(){
  const on=document.getElementById('dv-assu-on').checked;
  if(!devisPrefs.assurance)devisPrefs.assurance={on:false,val:null};
  devisPrefs.assurance.on=on;
  if(on&&(devisPrefs.assurance.val==null||devisPrefs.assurance.val===''))devisPrefs.assurance.val=devisAssuDefaultRate();
  syncDevisAssuUI();saveDevisPrefs();renderDevisCart();
}
function onDevisAssuValChange(){
  const v=parseFloat(document.getElementById('dv-assu-val').value);
  devisPrefs.assurance.val=isNaN(v)?devisAssuDefaultRate():v;
  saveDevisPrefs();renderDevisCart();
}
function syncDevisAssuUI(){
  const a=devisPrefs.assurance||{on:false,val:null};
  const onEl=document.getElementById('dv-assu-on'),wrap=document.getElementById('dv-assu-val-wrap'),valEl=document.getElementById('dv-assu-val');
  if(!onEl)return;
  onEl.checked=!!a.on;
  wrap.style.display=a.on?'inline-flex':'none';
  valEl.value=a.val!=null?a.val:devisAssuDefaultRate();
}

/* ---- VUE GRILLE / LISTE ---- */
function setDevisView(v){
  devisView=v;
  document.getElementById('dvg').classList.toggle('active',v==='grid');
  document.getElementById('dvl').classList.toggle('active',v==='list');
  renderDevisCart();
}

/* ---- RENDU DE L'ONGLET DEVIS ---- */
function renderDevis(){
  document.getElementById('dv-nom').value=devisClient.nom||'';
  document.getElementById('dv-ent').value=devisClient.ent||'';
  document.getElementById('dv-email').value=devisClient.email||'';
  document.getElementById('dv-tel').value=devisClient.tel||'';
  document.getElementById('dv-adr').value=devisClient.adr||'';
  document.getElementById('dv-ville').value=devisClient.ville||'';
  document.getElementById('dv-assuj').checked=!!devisClient.assujetti;
  const persoEl=document.getElementById('strat-perso-val');
  if(persoEl)persoEl.value=devisPrefs.margePerso||35;
  syncDevisAssuUI();
  // Restaurer l'UI devise
  const devSel=document.getElementById('dv-dev');
  if(devSel)devSel.value=devisFX.dev;
  const tauxInp=document.getElementById('dv-taux');
  if(tauxInp)tauxInp.value=devisFX.dev==='XOF'?1:devisFX.taux;
  const lbl=document.getElementById('dv-taux-lbl');
  if(lbl)lbl.textContent='XOF pour 1 '+(DV_NAMES[devisFX.dev]||devisFX.dev);
  setStrategy(devisPrefs.strategy||'marge_fixe');
  renderDevisCart();
}

function renderDevisCart(){
  const cont=document.getElementById('dv-cart-cont');
  const tb=document.getElementById('dv-toolbar');
  if(!devisCart.length){
    document.getElementById('dv-count').textContent='0';
    cont.innerHTML=`<div class="empty"><div class="empty-ico">${ICO('cart')}</div><h3>Panier vide</h3><p>Ajoutez des produits depuis le Catalogue.</p></div>`;
    document.getElementById('dv-total-bar').innerHTML='';
    if(tb)tb.style.display='none';
    document.getElementById('dv-filter-chips').innerHTML='';
    return;
  }
  if(tb)tb.style.display='';
  dvPopulateFilterSelects();
  const se=document.getElementById('dv-search');
  if(se.value!==(devisFilters.q||''))se.value=devisFilters.q||'';
  document.getElementById('dv-sort').value=devisFilters.sort||'';
  dvRenderChips();
  const list=getFilteredDevisCart();
  document.getElementById('dv-count').textContent=list.length+' / '+devisCart.length;
  if(!list.length){
    cont.innerHTML=`<div class="empty"><div class="empty-ico">${ICO('inbox')}</div><h3>Aucun produit ne correspond aux filtres</h3><p>Ajustez ou réinitialisez les filtres et le tri.</p></div>`;
  }else{
    cont.innerHTML=devisView==='grid'?buildDevisGrid(list):buildDevisTable(list);
  }
  renderDevisTotal(list);
}

function buildDevisGrid(list){
  list=list||getFilteredDevisCart();
  const SH=cmVisible('devis');
  // ligne d'info « label / valeur » — une par colonne cochée
  const row=(lbl,val)=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;margin-top:2px"><span style="color:var(--muted)">${lbl}</span><span style="font-weight:600;text-align:right">${val}</span></div>`;
  // Le TTC du panier reprend le traitement .pr-ttc de la carte catalogue plutôt que la ligne row() générique :
  // c'est le même chiffre, sur l'écran à plus fort enjeu (devis client) — il ne doit pas être plus discret ailleurs.
  const rowTTC=(lbl,val)=>`<div class="pr" style="margin-top:6px"><span class="pr-lbl pr-ttc">${lbl}</span><span class="pr-val pr-ttc">${val}</span></div>`;
  return`<div class="grid">${list.map(item=>{
    const c=calcDevis(item),p=item.snap;
    const devSymbol={RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[c.dev]||c.dev;
    const imgHtml=p.photos&&p.photos[0]
      ?`<img src="${p.photos[0]}" alt="${escH(p.nom)}" loading="lazy" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-img-placeholder" style="display:none">${PH_LG}</div>`
      :`<div class="card-img-placeholder">${PH_LG}</div>`;
    // SECTION PRODUIT (infos complémentaires) — Qté placée avant les colonnes de totaux
    const infosProduit=[
      SH.specs&&p.specs?row('Spécificités',`<span style="font-weight:400;color:var(--muted)">${truncTxt(p.specs,80)}</span>`):'',
      SH.fournisseur?row('Fournisseur',escH(p.fn||'—')):'',
      SH.poids?row('Poids',(p.poids||p.kg||'—')+' kg'):'',
      SH.cbm?row('CBM',Nd(c.cbm,4)+' m³'):'',
    ].filter(Boolean).join('');
    // SECTION SOURCING (devise d'achat)
    const infosSourcing=[
      SH.prix_exw?row('Prix EXW',`${Nd(parseFloat(c.prix_src)||0,2)} ${devSymbol}`):'',
      SH.cout_total?row('Coût Total',`${Nd(c.coutRevient,2)} ${devSymbol}`):'',
    ].filter(Boolean).join('');
    // SECTION VENTE (devise du devis)
    const infosVente=[
      SH.cr_unitaire?row('Coût unit. HT',Ndv(c.coutRevientUX)):'',
      SH.taux_marge?row('Taux de Marge',`<span style="color:var(--vert-t)">${Nd(c.mgPct,1)}%</span>`):'',
      SH.marge?row('Marge',Ndv(c.margeU)):'',
    ].filter(Boolean).join('');
    return`<div class="cart-item-grid">
      ${SH.photos?`<div class="card-img" style="height:130px">${imgHtml}</div>`:''}
      <div class="card-body">
        ${SH.ref?`<div class="card-ref">${escH(p.ref)}</div>`:''}
        ${SH.nom?`<div class="card-title">${escH(p.nom)}</div>`:''}
        ${SH.commentaire?`<div style="margin:2px 0 4px">${dvNoteField(item,'13.5px')}</div>`:''}
        ${SH.cat?`<div class="card-cat">${escH(p.cat)}</div>`:''}
        ${infosProduit}
        ${SH.qte?`<div class="cart-qty-ctrl">
          <button onclick="dvQty('${item.cid}',${item.qty-1})">−</button>
          <input type="number" value="${item.qty}" min="1" onchange="dvQty('${item.cid}',this.value)">
          <button onclick="dvQty('${item.cid}',${item.qty+1})">+</button>
        </div>`:''}
        ${infosSourcing}
        ${infosVente}
        ${SH.prix_ht?`<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
          <div class="cart-price-tag">${Ndv(c.pvuHT)} <small style="font-weight:400;font-size:10px;color:var(--muted)">Prix HT/u</small></div>
        </div>`:''}
        ${SH.total_ht?row('Prix total HT',Ndv(c.pvtHT)):''}
        ${SH.frais_log?row('Frais logistiques Estimé',Ndv(c.fraisLog)):''}
        ${SH.prix_ttc?rowTTC('Prix TTC Estimé',Ndv(c.pvtTTC)):''}
        <button class="btn btn-danger btn-sm" style="margin-top:8px;width:100%" onclick="removeFromCart('${item.cid}')">${ICO('trash')} Retirer du devis</button>
      </div></div>`;
  }).join('')}</div>`;
}

function buildDevisTable(list){
  list=list||getFilteredDevisCart();
  const SH=cmVisible('devis');
  const devL=devisFX.dev!=='XOF'?' ('+devisFX.dev+')':'';
  const ths=[
    // SECTION PRODUIT
    SH.ref?'<th>Réf</th>':'',
    SH.photos?'<th>Photo</th>':'',
    SH.nom?'<th>Désignation</th>':'',
    SH.commentaire?'<th>Commentaire</th>':'',
    SH.cat?'<th>Catégorie</th>':'',
    SH.specs?'<th>Spécificités</th>':'',
    SH.fournisseur?'<th>Fournisseur</th>':'',
    SH.qte?'<th>Qté</th>':'',
    SH.poids?'<th>Poids (kg)</th>':'',
    SH.cbm?'<th>CBM (m³)</th>':'',
    // SECTION SOURCING (devise d'achat)
    SH.prix_exw?'<th>Prix EXW</th>':'',
    SH.cout_total?'<th>Coût Total</th>':'',
    // SECTION VENTE (devise du devis)
    SH.cr_unitaire?`<th>Coût unit. HT${devL}</th>`:'',
    SH.taux_marge?'<th>Taux de Marge</th>':'',
    SH.marge?`<th>Marge${devL}</th>`:'',
    SH.prix_ht?`<th>Prix HT${devL}</th>`:'',
    SH.total_ht?`<th>Prix total HT${devL}</th>`:'',
    // SECTION LOGISTIQUE (devise du devis)
    SH.frais_log?`<th>Frais logistiques Estimé${devL}</th>`:'',
    SH.prix_ttc?`<th>Prix TTC Estimé${devL}</th>`:'',
    '<th class="no-print">Actions</th>',
  ].join('');
  const rows=list.map(item=>{
    const c=calcDevis(item),p=item.snap;
    const imgSrc=p.photos&&p.photos[0];
    const devSymbol={RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[c.dev]||c.dev;
    return`<tr>
      ${SH.ref?`<td><code style="font-size:10px">${escH(p.ref)}</code></td>`:''}
      ${SH.photos?`<td>${imgSrc?`<img src="${imgSrc}" style="width:40px;height:40px;object-fit:cover;border-radius:6px" loading="lazy">`:PH_SM}</td>`:''}
      ${SH.nom?`<td style="font-weight:500;max-width:160px">${escH(p.nom)}</td>`:''}
      ${SH.commentaire?`<td style="min-width:180px">${dvNoteField(item,'12.5px')}</td>`:''}
      ${SH.cat?`<td><span class="pill-cat">${escH(p.cat)}</span></td>`:''}
      ${SH.specs?`<td style="font-size:11px;color:var(--muted);max-width:180px">${truncTxt(p.specs,60)}</td>`:''}
      ${SH.fournisseur?`<td style="font-size:12px">${escH(p.fn||'—')}</td>`:''}
      ${SH.qte?`<td><div class="cart-qty-ctrl" style="margin:0">
        <button onclick="dvQty('${item.cid}',${item.qty-1})">−</button>
        <input type="number" value="${item.qty}" min="1" onchange="dvQty('${item.cid}',this.value)" style="width:40px">
        <button onclick="dvQty('${item.cid}',${item.qty+1})">+</button>
      </div></td>`:''}
      ${SH.poids?`<td style="font-size:11px">${p.poids||p.kg||'—'} kg</td>`:''}
      ${SH.cbm?`<td style="font-size:11px">${Nd(c.cbm,4)} m³</td>`:''}
      ${SH.prix_exw?`<td style="font-size:11px;font-weight:600">${Nd(parseFloat(c.prix_src)||0,2)} ${devSymbol}</td>`:''}
      ${SH.cout_total?`<td style="font-size:11px">${Nd(c.coutRevient,2)} ${devSymbol}</td>`:''}
      ${SH.cr_unitaire?`<td style="font-size:11px">${Ndv(c.coutRevientUX)}</td>`:''}
      ${SH.taux_marge?`<td style="font-size:11px;color:var(--vert-t);font-weight:600">${Nd(c.mgPct,1)}%</td>`:''}
      ${SH.marge?`<td style="font-size:11px">${Ndv(c.margeU)}</td>`:''}
      ${SH.prix_ht?`<td style="font-weight:600">${Ndv(c.pvuHT)}</td>`:''}
      ${SH.total_ht?`<td style="font-weight:700">${Ndv(c.pvtHT)}</td>`:''}
      ${SH.frais_log?`<td style="font-size:11px">${Ndv(c.fraisLog)}</td>`:''}
      ${SH.prix_ttc?`<td class="ttc-hero" style="font-size:13px">${Ndv(c.pvtTTC)}</td>`:''}
      <td class="no-print"><div style="display:flex;gap:4px">
        <button class="btn btn-sec btn-sm" onclick="showDevisDetails('${item.cid}')" title="Voir détails" aria-label="Voir tous les détails">${ICO('eye')}</button>
        <button class="btn btn-danger btn-sm" onclick="removeFromCart('${item.cid}')">${ICO('trash')}</button>
      </div></td>
    </tr>`;
  }).join('');
  return`<div class="tbl-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function dvQty(cid,qty){
  updateCartQty(cid,qty);
  dvPreserveScroll(()=>{
    const list=getFilteredDevisCart();
    document.getElementById('dv-cart-cont').innerHTML=devisView==='grid'?buildDevisGrid(list):buildDevisTable(list);
    renderDevisTotal(list);
  });
}

/* ---- RÉCAPITULATIF DU DEVIS ----
   1. Coût Total HT       = somme des coûts de revient totaux de tous les items, en devise de vente
                             (ligne permanente de l'aperçu écran, indépendante des colonnes cochées)
   2. Montant Total HT    = somme des Prix total HT de tous les items
   3. Frais logistiques   = somme des frais logistiques estimés de tous les items
   4. Frais Assurance     = Montant Total HT × (taux assurance / 100), si activée
   5. Montant Total TTC   = Montant Total HT + Frais logistiques (+ Assurance) (+ TVA interne si assujetti) */
function renderDevisTotal(list){
  list=list||getFilteredDevisCart();
  if(!list.length){document.getElementById('dv-total-bar').innerHTML='';return;}
  const cs=list.map(calcDevis);
  const totQty=list.reduce((s,i)=>s+i.qty,0);
  const totMarge=cs.reduce((s,c)=>s+c.margeTot,0);
  const totCout=cs.reduce((s,c)=>s+c.coutRevientX,0);
  const totHT=cs.reduce((s,c)=>s+c.pvtHT,0);
  const totLog=cs.reduce((s,c)=>s+c.fraisLog,0);
  const totTVA=cs.reduce((s,c)=>s+c.tvaM,0);
  const assuOn=!!(devisPrefs.assurance&&devisPrefs.assurance.on);
  const assuRate=devisAssuRate();
  const totAssurance=assuOn?r2(totHT*assuRate/100):0;
  const montantFinal=totHT+totLog+totAssurance+totTVA;
  const devLabel=devisFX.dev!=='XOF'?` (${devisFX.dev})`:'';
  document.getElementById('dv-total-bar').innerHTML=`
    <div class="devis-total-bar">
      <div class="devis-total-item"><div class="val">${totQty}</div><div class="lbl">Unités</div></div>
      <div class="devis-total-item"><div class="val" style="color:var(--vert)">${N(totMarge)}</div><div class="lbl">Marge (XOF)</div></div>
      <div class="devis-total-item"><div class="val" style="font-size:14px;color:rgba(255,255,255,.65)">${Ndv(totCout)}</div><div class="lbl">Coût Total HT${devLabel}</div></div>
      <div class="devis-total-item"><div class="val">${Ndv(totHT)}</div><div class="lbl">Montant Total HT${devLabel}</div></div>
      <div class="devis-total-item"><div class="val" style="font-size:14px;color:rgba(255,255,255,.65)">${Ndv(totLog)}</div><div class="lbl">Frais logistiques Estimé${devLabel}</div></div>
      ${assuOn?`<div class="devis-total-item"><div class="val" style="font-size:14px;color:rgba(255,255,255,.65)">${Ndv(totAssurance)}</div><div class="lbl">Assurance Produit (${Nd(assuRate,1)}%)${devLabel}</div></div>`:''}
      ${devisClient.assujetti?`<div class="devis-total-item"><div class="val" style="font-size:14px;color:rgba(255,255,255,.65)">${Ndv(totTVA)}</div><div class="lbl">TVA interne (${S.tvaInterne}%)${devLabel}</div></div>`:''}
      <div class="devis-total-item"><div class="val" style="color:var(--jaune);font-size:22px">${Ndv(montantFinal)}</div><div class="lbl">MONTANT TOTAL TTC${devLabel}</div></div>
    </div>`;
}

/* ---- GÉNÉRATION PDF (impression navigateur via template HTML dédié) ---- */
function openPdfConfig(){
  if(!devisCart.length){toast('Panier vide — ajoutez des produits au devis',true);return;}
  cmRefresh('devis');
  const langSel=document.getElementById('pdf-lang');
  if(langSel)langSel.value=pdfLang;
  const cgvChk=document.getElementById('pdf-cgv');
  if(cgvChk)cgvChk.checked=devisPrefs.pdfCgv!==false;
  openMod('pdf-modal');
}
/* ---- Référence devis : DV_[INITIALES].[NNN + lettre].[YYMMDD] ----
   Initiales (3 lettres) : initiale de chaque mot du nom client ; si <3, complétées
   par la dernière consonne du premier mot ("BINIZI Mèwè" → B+Z+M = BZM).
   Numéro : compteur global persistant (gf_devref) — tant que le contenu du devis
   (client + lignes) est inchangé, les téléchargements réutilisent le même numéro ;
   un devis modifié incrémente le compteur. */
const DVREFK='gf_devref';
let devRefCache=null; // cache mémoire, chargé une fois au démarrage (devRefLoad)
async function devRefLoad(){devRefCache=(await IDB_GET(DVREFK,null))||{seq:0,sig:''};}
function devisInitiales(){
  const nom=String(devisClient.nom||devisClient.ent||'CLIENT').trim();
  const words=nom.split(/\s+/).filter(Boolean);
  const norm=w=>w.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z]/g,'').toUpperCase();
  let letters=words.map(w=>norm(w)[0]).filter(Boolean);
  if(letters.length>3)letters=letters.slice(0,3);
  const w1=norm(words[0]||'');
  if(letters.length<3&&w1.length>1){
    const cons=w1.slice(1).replace(/[AEIOUY]/g,'');
    const extra=cons?cons[cons.length-1]:w1[w1.length-1];
    if(extra)letters.splice(1,0,extra);
  }
  while(letters.length<3)letters.push('X');
  return letters.slice(0,3).join('');
}
function devisSignature(){
  return JSON.stringify({
    c:[devisClient.nom||'',devisClient.ent||''],
    items:devisCart.map(i=>[i.pid,i.qty,i.comment||''])
  });
}
function devisRef(now){
  const st=devRefCache||(devRefCache={seq:0,sig:''});
  const sig=devisSignature();
  if(st.sig!==sig||!st.seq){st.seq=(st.seq||0)+1;st.sig=sig;IDB_SET(DVREFK,st);}
  const num=String(st.seq).padStart(3,'0')+'A';
  const d=String(now.getFullYear()%100).padStart(2,'0')
    +String(now.getMonth()+1).padStart(2,'0')
    +String(now.getDate()).padStart(2,'0');
  return`DV_${devisInitiales()}.${num}.${d}`;
}
/* ---- TRADUCTION DU PDF (fr par défaut — texte identique à l'original, en/zh disponibles) ----
   Le choix de langue ne s'applique qu'au document généré, jamais à l'interface. */
const PDF_LOCALE={fr:'fr-FR',en:'en-US',zh:'zh-CN'};
const PDF_I18N={
  fr:{
    th:{photo:'Photo',nom:'Désignation',commentaire:'Commentaire',ref:'Réf.',cat:'Catégorie',fournisseur:'Fournisseur',
      specs:'Spécificités',cbm:'CBM (m³)',poids:'Poids',qte:'Qté',
      prixExw:'Prix EXW',coutTotal:'Coût Total',crUnitaire:'Coût unit. HT',tauxMarge:'Taux de Marge',
      marge:'Marge',prixHT:'Prix HT',totalHT:'Prix total HT',fraisLog:'Frais logistiques Estimé*',prixTTC:'Prix TTC Estimé'},
    client:{email:'Email : ',tel:'Tél : ',adr:'Adresse : ',assujetti:'Client assujetti à la TVA',aucune:'Aucune information client'},
    hdr:{devisNum:'DEVIS N° ',date:'Date : ',valable:'Valable 30 jours',destinataire:'Destinataire'},
    mode:{aerien:'Aérien',maritime:'Maritime'},
    foot:{coutRevientTotal:'Coût de Revient Total',sousTotalHT:'Sous-Total HT',montantTotalHT:'Montant Total HT',
      fraisLog:'Total Frais Logistiques Estimé* — tout-compris',
      tva:pct=>`TVA interne (${pct}%) — sur le montant HT`,
      assurance:rate=>`Total Frais d'Assurance (${Nd(rate,1)}%) — sur le Sous-Total HT`,
      montantTotalTTC:'Montant Total TTC'},
    cgv:{
      titre:'Conditions générales :',
      devise:dev=>dev==='XOF'?'Francs CFA (XOF)':dev+' — convertis depuis XOF',
      taux:(dev,taux)=>dev!=='XOF'?`<strong>Taux de change appliqué : 1 ${dev} = ${Nd(taux,4)} XOF</strong> (taux indicatif) — `:'<strong>Taux de change du jour appliqué</strong> — ',
      intro:(devisePhrase,tauxPhrase)=>`Ce devis est établi par Go Group et est valable 30 jours à compter de sa date d'émission. Les prix sont exprimés en ${devisePhrase}. ${tauxPhrase}de légères variations peuvent être constatées au moment de la commande.<br>`,
      fraisLog:'<strong>Frais logistiques (*) :</strong> Tarif transitaire <strong>tout-compris (fret + douane + taxes)</strong> — aucune TVA ni taxe supplémentaire ne s\'ajoute aux frais logistiques. Les montants indiqués sont des estimations ; le montant définitif pourra différer légèrement.<br>',
      assurance:rate=>`<strong>Assurance Produit :</strong> Protection optionnelle au taux de ${Nd(rate,1)}%, calculée sur le Sous-Total HT et incluse dans le montant total ci-dessus.<br>`,
      tva:pct=>`<strong>TVA :</strong> Client assujetti — la TVA interne (${pct}%) est calculée sur le montant HT des marchandises et affichée séparément ci-dessus.<br>`,
      validation:()=>`<strong>Validation de commande :</strong> Pour confirmer la commande, le client doit régler la <strong>totalité du montant TTC</strong> indiqué ci-dessus. Aucune commande ne sera lancée avant réception du paiement intégral.<br>`,
      post:'<strong>Post-acheminement :</strong> Les frais de livraison locale (post-acheminement) sont également à la charge du client et ne sont pas inclus dans ce devis.<br>',
      delais:'<strong>Délais :</strong> Les délais de livraison indiqués sont estimatifs et peuvent varier selon le mode de transport et les conditions douanières.<br><br>',
      footer:'<strong>Go Group</strong> · globalgo.tg@gmail.com · +228 96 02 39 03 · Lomé, Togo · <em>Promis. Livré.</em>'
    }
  },
  en:{
    th:{photo:'Photo',nom:'Description',commentaire:'Comment',ref:'Ref.',cat:'Category',fournisseur:'Supplier',
      specs:'Specifications',cbm:'CBM (m³)',poids:'Weight',qte:'Qty',
      prixExw:'EXW price',coutTotal:'Total Cost',crUnitaire:'Unit cost excl. tax',tauxMarge:'Margin rate',
      marge:'Margin',prixHT:'Price excl. tax',totalHT:'Total excl. tax',fraisLog:'Estimated freight cost*',prixTTC:'Estimated price incl. tax'},
    client:{email:'Email: ',tel:'Phone: ',adr:'Address: ',assujetti:'VAT-registered client',aucune:'No client information'},
    hdr:{devisNum:'QUOTE NO. ',date:'Date: ',valable:'Valid for 30 days',destinataire:'Recipient'},
    mode:{aerien:'Air',maritime:'Sea'},
    foot:{coutRevientTotal:'Total Cost Price',sousTotalHT:'Sub-Total excl. tax',montantTotalHT:'Total Amount excl. tax',
      fraisLog:'Estimated freight costs* — all-inclusive',
      tva:pct=>`Local VAT (${pct}%) — on amount excl. tax`,
      assurance:rate=>`Total Insurance Cost (${Nd(rate,1)}%) — on Sub-Total excl. tax`,
      montantTotalTTC:'TOTAL AMOUNT incl. tax'},
    cgv:{
      titre:'Terms and conditions:',
      devise:dev=>dev==='XOF'?'CFA Francs (XOF)':dev+' — converted from XOF',
      taux:(dev,taux)=>dev!=='XOF'?`<strong>Exchange rate applied: 1 ${dev} = ${Nd(taux,4)} XOF</strong> (indicative rate) — `:'<strong>Current day\'s exchange rate applied</strong> — ',
      intro:(devisePhrase,tauxPhrase)=>`This quote is issued by Go Group and is valid for 30 days from its issue date. Prices are expressed in ${devisePhrase}. ${tauxPhrase}slight variations may occur at order time.<br>`,
      fraisLog:'<strong>Freight costs (*):</strong> Forwarder rate <strong>all-inclusive (freight + customs + taxes)</strong> — no VAT or additional tax is added on top of freight costs. Amounts shown are estimates; the final amount may differ slightly.<br>',
      assurance:rate=>`<strong>Product Insurance:</strong> Optional protection at a rate of ${Nd(rate,1)}%, calculated on the Sub-Total excl. tax and included in the total amount above.<br>`,
      tva:pct=>`<strong>VAT:</strong> VAT-registered client — local VAT (${pct}%) is calculated on the merchandise amount excl. tax and shown separately above.<br>`,
      validation:()=>`<strong>Order confirmation:</strong> To confirm the order, the client must pay the <strong>full amount incl. tax</strong> shown above. No order will be placed before full payment is received.<br>`,
      post:'<strong>Last-mile delivery:</strong> Local delivery costs (last-mile) are also the client\'s responsibility and are not included in this quote.<br>',
      delais:'<strong>Lead times:</strong> The delivery lead times shown are estimates and may vary depending on the mode of transport and customs conditions.<br><br>',
      footer:'<strong>Go Group</strong> · globalgo.tg@gmail.com · +228 96 02 39 03 · Lomé, Togo · <em>Promised. Delivered.</em>'
    }
  },
  zh:{
    th:{photo:'图片',nom:'品名',commentaire:'备注',ref:'参考号',cat:'类别',fournisseur:'供应商',
      specs:'规格',cbm:'体积 (CBM/m³)',poids:'重量',qte:'数量',
      prixExw:'EXW价格',coutTotal:'总成本',crUnitaire:'单位不含税成本',tauxMarge:'利润率',
      marge:'利润',prixHT:'不含税单价',totalHT:'不含税总额',fraisLog:'预估物流费*',prixTTC:'预估含税单价'},
    client:{email:'邮箱：',tel:'电话：',adr:'地址：',assujetti:'需缴纳增值税客户',aucune:'无客户信息'},
    hdr:{devisNum:'报价单编号 ',date:'日期：',valable:'有效期30天',destinataire:'客户'},
    mode:{aerien:'空运',maritime:'海运'},
    foot:{coutRevientTotal:'总成本价',sousTotalHT:'不含税小计',montantTotalHT:'不含税总金额',
      fraisLog:'预估物流费*（全包价）',
      tva:pct=>`内部增值税 (${pct}%) — 基于不含税金额`,
      assurance:rate=>`产品保险 (${Nd(rate,1)}%) — 基于不含税小计`,
      montantTotalTTC:'总金额（含税）'},
    cgv:{
      titre:'一般条款：',
      devise:dev=>dev==='XOF'?'非洲法郎 (XOF)':dev+' — 由XOF换算',
      taux:(dev,taux)=>dev!=='XOF'?`<strong>已应用汇率：1 ${dev} = ${Nd(taux,4)} XOF</strong>（参考汇率）— `:'<strong>已应用当日汇率</strong> — ',
      intro:(devisePhrase,tauxPhrase)=>`本报价单由Go Group出具，自开具之日起30天内有效。价格以${devisePhrase}计。${tauxPhrase}下单时可能出现小幅波动。<br>`,
      fraisLog:'<strong>物流费用 (*)：</strong>货运代理费用为<strong>全包价（运费+关税+税费）</strong>——物流费用之外不再另收增值税或其他税费。所示金额为估算，最终金额可能略有不同。<br>',
      assurance:rate=>`<strong>产品保险：</strong>可选保护，费率为不含税小计的${Nd(rate,1)}%，已包含在上方总金额中。<br>`,
      tva:pct=>`<strong>增值税：</strong>客户需缴纳增值税——内部增值税 (${pct}%) 按不含税货值计算，并在上方单独列出。<br>`,
      validation:()=>`<strong>订单确认：</strong>为确认订单，客户须支付上述<strong>全部含税金额</strong>。在收到全额付款前，订单不会启动。<br>`,
      post:'<strong>末端运输：</strong>本地配送费用（末端运输）由客户自行承担，不包含在本报价单中。<br>',
      delais:'<strong>交货期：</strong>所示交货期为估算值，可能因运输方式及清关情况而有所变化。<br><br>',
      footer:'<strong>Go Group</strong> · globalgo.tg@gmail.com · +228 96 02 39 03 · Lomé, Togo · <em>承诺。交付。</em>'
    }
  }
};
// Catégories connues traduites ; toute catégorie personnalisée non répertoriée conserve son texte d'origine
const PDF_CAT_I18N={
  'Hydrafacial':{en:'Hydrafacial',zh:'水光仪'},
  'Picolaser/Tatouage':{en:'Picolaser/Tattoo removal',zh:'皮秒/纹身'},
  'Analyse de peau':{en:'Skin analysis',zh:'皮肤检测'},
  'RF Microneedling':{en:'RF Microneedling',zh:'射频微针'},
  'HIFU':{en:'HIFU',zh:'高强度聚焦超声(HIFU)'},
  'Photothérapie LED':{en:'LED phototherapy',zh:'LED光疗'},
  'Équipement & Accessoires':{en:'Equipment & accessories',zh:'设备与配件'},
  'Dentaire':{en:'Dental',zh:'牙科'}
};
function pdfT(lang){return PDF_I18N[lang]||PDF_I18N.fr;}
// Contenu produit (nom/description/spécificités) : utilise un champ traduit optionnel (ex. nom_en, desc_zh)
// s'il existe sur le produit, sinon conserve le contenu d'origine — aucune donnée n'est requise pour que ça fonctionne.
function trF(obj,field,lang){
  if(!obj||!lang||lang==='fr')return obj?obj[field]:'';
  const v=obj[field+'_'+lang];
  return(v!=null&&String(v).trim()!=='')?v:obj[field];
}
function trCat(cat,lang){
  if(!cat||!lang||lang==='fr')return cat;
  const m=PDF_CAT_I18N[cat];
  return(m&&m[lang])?m[lang]:cat;
}
function generateDevisPDF(){
  if(!devisCart.length){toast('Panier vide — ajoutez des produits au devis',true);return;}
  // Le PDF suit exactement l'aperçu affiché : mêmes lignes, même ordre (recherche/filtres/tri actifs)
  const dvList=getFilteredDevisCart();
  if(!dvList.length){toast('Aucun produit ne correspond aux filtres actuels',true);return;}
  const now=new Date();
  const lang=PDF_I18N[pdfLang]?pdfLang:'fr'; // langue choisie pour ce document uniquement
  const T=pdfT(lang);
  const dateFr=now.toLocaleDateString(PDF_LOCALE[lang]||'fr-FR',{day:'numeric',month:'long',year:'numeric'});
  const ref=devisRef(now);
  // Sélection brute du gestionnaire de colonnes (sans auto-masquage mobile) :
  // le PDF reflète exactement les cases cochées dans le modal, sur tout écran
  const SH={};CM_DEFS.devis.forEach(d=>{SH[d.k]=colStore.devis.visible.includes(d.k);});
  // Bloc client
  const cl=devisClient;
  const escC=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const clientHtml=[
    cl.nom||cl.ent?`<strong>${escC([cl.nom,cl.ent].filter(Boolean).join(' — '))}</strong>`:'',
    cl.email?`${T.client.email}${escC(cl.email)}`:'',
    cl.tel?`${T.client.tel}${escC(cl.tel)}`:'',
    cl.adr?`${T.client.adr}${escC(cl.adr)}`:'',
    escC(cl.ville||''),
    cl.assujetti?`<em>${T.client.assujetti}</em>`:''
  ].filter(Boolean).join('<br>')||`<span style="color:var(--muted);font-style:italic">${T.client.aucune}</span>`;
  // En-têtes : toutes les colonnes suivent la sélection de l'aperçu — aucune colonne forcée.
  const devL=devisFX.dev!=='XOF'?' ('+devisFX.dev+')':'';
  const colH=[
    SH.ref?`<th>${T.th.ref}</th>`:'',
    SH.photos?`<th>${T.th.photo}</th>`:'',
    SH.nom?`<th>${T.th.nom}</th>`:'',
    SH.commentaire?`<th>${T.th.commentaire}</th>`:'',
    SH.cat?`<th>${T.th.cat}</th>`:'',
    SH.specs?`<th>${T.th.specs}</th>`:'',
    SH.fournisseur?`<th>${T.th.fournisseur}</th>`:'',
    SH.qte?`<th>${T.th.qte}</th>`:'',
    SH.poids?`<th>${T.th.poids}</th>`:'',
    SH.cbm?`<th>${T.th.cbm}</th>`:'',
    // SECTION SOURCING (devise d'achat)
    SH.prix_exw?`<th style="white-space:nowrap">${T.th.prixExw}</th>`:'',
    SH.cout_total?`<th style="white-space:nowrap">${T.th.coutTotal}</th>`:'',
    // SECTION VENTE (devise du devis)
    SH.cr_unitaire?`<th style="white-space:nowrap">${T.th.crUnitaire}${devL}</th>`:'',
    SH.taux_marge?`<th>${T.th.tauxMarge}</th>`:'',
    SH.marge?`<th style="white-space:nowrap">${T.th.marge}${devL}</th>`:'',
    SH.prix_ht?`<th style="white-space:nowrap">${T.th.prixHT}${devL}</th>`:'',
    SH.total_ht?`<th style="white-space:nowrap">${T.th.totalHT}${devL}</th>`:'',
    // SECTION LOGISTIQUE (devise du devis)
    SH.frais_log?`<th style="white-space:nowrap">${T.th.fraisLog}${devL}</th>`:'',
    SH.prix_ttc?`<th style="white-space:nowrap">${T.th.prixTTC}${devL}</th>`:'',
  ].join('');
  const nbCols=Math.max(1,colH.split('<th').length-1);
  const spanVal=Math.min(2,Math.max(1,nbCols-1)),spanLbl=Math.max(1,nbCols-spanVal);
  // Lignes
  const rowsHtml=dvList.map(item=>{
    const c=calcDevis(item),p=item.snap;
    const imgCell=SH.photos?`<td style="text-align:center">${p.photos&&p.photos[0]?`<img src="${p.photos[0]}" style="width:36px;height:36px;object-fit:cover;border-radius:4px" onerror="this.style.display='none'">`:''}</td>`:'';
    const devSymbol={RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[c.dev]||c.dev;
    return`<tr>
      ${SH.ref?`<td><code style="font-size:9px">${escC(p.ref)}</code></td>`:''}
      ${imgCell}
      ${SH.nom?`<td><strong>${escC(trF(p,'nom',lang))}</strong></td>`:''}
      ${SH.commentaire?`<td style="font-style:italic;white-space:pre-wrap;word-wrap:break-word;line-height:1.4">${item.comment?escC(item.comment):''}</td>`:''}
      ${SH.cat?`<td>${escC(trCat(p.cat,lang))}</td>`:''}
      ${SH.specs?`<td style="font-size:9px">${escH(trF(p,'specs',lang))||'—'}</td>`:''}
      ${SH.fournisseur?`<td>${escC(p.fn||'—')}</td>`:''}
      ${SH.qte?`<td style="text-align:center">${item.qty}</td>`:''}
      ${SH.poids?`<td>${p.poids||p.kg||'—'} kg</td>`:''}
      ${SH.cbm?`<td>${Nd(c.cbm,4)}</td>`:''}
      ${SH.prix_exw?`<td style="white-space:nowrap">${Nd(parseFloat(c.prix_src)||0,2)} ${devSymbol}</td>`:''}
      ${SH.cout_total?`<td style="white-space:nowrap">${Nd(c.coutRevient,2)} ${devSymbol}</td>`:''}
      ${SH.cr_unitaire?`<td style="white-space:nowrap">${Ndv(c.coutRevientUX)}</td>`:''}
      ${SH.taux_marge?`<td>${Nd(c.mgPct,1)}%</td>`:''}
      ${SH.marge?`<td style="white-space:nowrap">${Ndv(c.margeU)}</td>`:''}
      ${SH.prix_ht?`<td style="font-weight:600;white-space:nowrap">${Ndv(c.pvuHT)}</td>`:''}
      ${SH.total_ht?`<td style="font-weight:700;white-space:nowrap">${Ndv(c.pvtHT)}</td>`:''}
      ${SH.frais_log?`<td style="white-space:nowrap">${Ndv(c.fraisLog)}</td>`:''}
      ${SH.prix_ttc?`<td class="ttc-hero" style="font-size:13px;white-space:nowrap">${Ndv(c.pvtTTC)}</td>`:''}
    </tr>`;
  }).join('');
  const cs=dvList.map(calcDevis);
  const totHT=cs.reduce((s,c)=>s+c.pvtHT,0);
  const totLog=cs.reduce((s,c)=>s+c.fraisLog,0);
  const totTVA=cs.reduce((s,c)=>s+c.tvaM,0);
  const assuOn=!!(devisPrefs.assurance&&devisPrefs.assurance.on);
  const assuRate=devisAssuRate();
  const totAssurance=assuOn?r2(totHT*assuRate/100):0;
  const montantFinal=totHT+totLog+totAssurance+totTVA;
  // Le récapitulatif suit lui aussi la sélection : pas de ligne totaux si aucune colonne prix n'est cochée
  const anyHT=SH.prix_ht||SH.total_ht,anyTTC=SH.prix_ttc;
  const anyTot=anyHT||anyTTC;
  // Frais logistiques et TTC s'affichent chacun selon leur propre colonne (indépendants l'un de l'autre) ;
  // le montant du TTC inclut toujours totLog, que la ligne "Frais Logistiques" soit affichée ou non.
  const showFraisLog=!!SH.frais_log;
  const showTTC=!!SH.prix_ttc;
  // Fiche de coût : colonnes coût cochées ET colonnes prix de vente masquées — le PDF sert alors
  // de document interne de coûts (jamais destiné au client), le total est exprimé en devise d'achat
  const ficheCout=!!(SH.cout_total||SH.cr_unitaire)&&!anyTot;
  const coutRevientParDev={};
  if(ficheCout)cs.forEach(c=>{coutRevientParDev[c.dev]=r2((coutRevientParDev[c.dev]||0)+c.coutRevient);});
  const includeCgv=devisPrefs.pdfCgv!==false; // option du modal PDF, activée par défaut
  // ---- Récapitulatif des totaux : ordre fixe Sous-Total HT > Assurance > Montant Total HT > Frais Log > Montant TTC ----
  const subRow=(lbl,val)=>`
        <tr style="background:#f5f5f7">
          <td colspan="${spanLbl}" style="text-align:right;font-weight:600;font-size:12px">${lbl}</td>
          <td colspan="${spanVal}" style="font-weight:700;font-size:13px;white-space:nowrap">${val}</td>
        </tr>`;
  const plainRow=(lbl,val)=>`
        <tr>
          <td colspan="${spanLbl}" style="text-align:right;font-size:11px;color:var(--muted)">${lbl}</td>
          <td colspan="${spanVal}" style="font-size:12px;white-space:nowrap">${val}</td>
        </tr>`;
  // Bandeau de total imprimé (fond sombre, texte blanc) : même famille/graisse que la valeur héros
  // (La Règle du Montant), mais la couleur reste blanche ici — inversion de contexte légitime, pas une dérive.
  const finalRow=(lbl,val)=>`
        <tr style="background:#1A1A2E;color:#fff">
          <td colspan="${spanLbl}" style="text-align:right;font-weight:700;font-size:13px">${lbl}</td>
          <td colspan="${spanVal}" style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:15px;white-space:nowrap">${val}</td>
        </tr>`;
  let recapRows='';
  if(anyTot){
    let baseHT=totHT,baseLbl=T.foot.montantTotalHT;
    if(assuOn){
      recapRows+=subRow(T.foot.sousTotalHT+devL,Ndv(totHT));
      recapRows+=plainRow(T.foot.assurance(assuRate)+devL,Ndv(totAssurance));
      baseHT=r2(totHT+totAssurance);
    }
    if(showTTC){
      recapRows+=subRow(baseLbl+devL,Ndv(baseHT));
      if(showFraisLog)recapRows+=plainRow(T.foot.fraisLog+devL,Ndv(totLog));
      let totalTTC=r2(baseHT+totLog);
      if(cl.assujetti){recapRows+=plainRow(T.foot.tva(S.tvaInterne)+devL,Ndv(totTVA));totalTTC=r2(totalTTC+totTVA);}
      recapRows+=finalRow(T.foot.montantTotalTTC+devL,Ndv(totalTTC));
    }else if(showFraisLog){
      recapRows+=subRow(baseLbl+devL,Ndv(baseHT));
      recapRows+=finalRow(T.foot.fraisLog+devL,Ndv(totLog));
    }else{
      let totalHTFinal=baseHT;
      if(cl.assujetti){recapRows+=plainRow(T.foot.tva(S.tvaInterne)+devL,Ndv(totTVA));totalHTFinal=r2(totalHTFinal+totTVA);}
      recapRows+=finalRow(baseLbl+devL,Ndv(totalHTFinal));
    }
  }else if(showFraisLog){
    recapRows+=finalRow(T.foot.fraisLog+devL,Ndv(totLog));
  }
  // Injecter dans la zone d'impression
  document.body.classList.add('printing-devis');
  document.getElementById('devis-print-area').innerHTML=`
    <div class="dv-hdr">
      <div>
        <div class="dv-logo">Go<span style="color:#0099FF">.</span>Group</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Go Group · Lomé, Togo</div>
        <div style="font-size:11px;color:var(--muted)">globalgo.tg@gmail.com · +228 96 02 39 03</div>
      </div>
      <div class="dv-meta">
        <div class="dv-num" style="font-size:16px;font-weight:800;color:#1A1A2E">${T.hdr.devisNum}${ref}</div>
        <div>${T.hdr.date}${dateFr}</div>
        <div style="margin-top:6px;font-size:10px;color:var(--muted)">${T.hdr.valable}</div>
      </div>
    </div>
    <div class="dv-client-box">
      <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${T.hdr.destinataire}</div>
      ${clientHtml}
    </div>
    <table class="dv-table">
      <thead><tr>${colH}</tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        ${ficheCout?Object.keys(coutRevientParDev).map(dev=>`
        <tr>
          <td colspan="${spanLbl}" style="text-align:right;font-size:11px;color:var(--muted)">${T.foot.coutRevientTotal}${Object.keys(coutRevientParDev).length>1?' ('+dev+')':''}</td>
          <td colspan="${spanVal}" style="font-size:12px;white-space:nowrap">${Nd(coutRevientParDev[dev],2)} ${{RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[dev]||dev}</td>
        </tr>
        `).join(''):''}
        ${recapRows}
      </tfoot>
    </table>
    ${includeCgv?`<div class="dv-cgs">
      <strong>${T.cgv.titre}</strong><br>
      ${T.cgv.intro(T.cgv.devise(devisFX.dev),T.cgv.taux(devisFX.dev,devisFX.taux))}
      ${T.cgv.fraisLog}
      ${assuOn?T.cgv.assurance(assuRate):''}
      ${cl.assujetti?T.cgv.tva(S.tvaInterne):''}
      ${T.cgv.validation()}
      ${T.cgv.post}
      ${T.cgv.delais}
      ${T.cgv.footer}
    </div>`:''}`;
  auditLog('devis_pdf',{ref,client:{...cl},devise:devisFX.dev,taux:devisFX.taux,lang,
    strategie:devisPrefs.strategy,parametres:{...S},
    lignes:dvList.map((item,ix)=>({ref:item.snap.ref,nom:item.snap.nom,qty:item.qty,comment:item.comment||'',calc:cs[ix]})),
    totaux:{totHT:r2(totHT),fraisLog:r2(totLog),assurance:r2(totAssurance),tva:r2(totTVA),montantTotal:r2(montantFinal)}});
  // Nom de fichier suggéré à l'enregistrement PDF : GoShip_[REFDEVIS].pdf
  const prevTitle=document.title;
  document.title='GoShip_'+ref;
  window.print();
  document.title=prevTitle;
  document.body.classList.remove('printing-devis');
}

/* ---- FIN MODULE DEVIS ---- */

