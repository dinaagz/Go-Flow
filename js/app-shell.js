let S={},prods=[],fours=[],trans=[],editP=null,editF=null,editT=null,view='grid',pics=[],simTr='Maritime',cols={};
let grouped=false,stratPrix='prix_bas',winOverrides={};
const WK='gf_win';

async function init(){
  await migrateToIdb();
  // Fusion avec les défauts + migration : l'ancien champ `tva` devient `tvaInterne`
  const s0=LS_GET(SK,null)||{};
  S={...DS,...s0,trf:{...DS.trf,...(s0.trf||{})},assu:{...DS.assu,...(s0.assu||{})}};
  if(s0.tva!=null&&s0.tvaInterne==null)S.tvaInterne=s0.tva;
  delete S.tva;
  await cmLoad();
  // Réinitialisation si version de données obsolète (anciens chemins Produit_devis/, anciens noms Bailey/Clara)
  const storedVer=parseInt(localStorage.getItem(VK)||'0');
  if(storedVer<DATA_VER){
    await IDB_DELETE(PK);
    await IDB_DELETE(FK);
    localStorage.setItem(VK,DATA_VER);
  }
  fours=await IDB_GET(FK,null);
  if(!fours||!fours.length)fours=DF.map(f=>({...f}));
  prods=await IDB_GET(PK,null);
  if(!prods||!prods.length){prods=buildProds();save('p');}
  // Semis des fournisseurs par défaut ajoutés après coup (ex. Paine F003)
  DF.forEach(d=>{if(!fours.some(f=>f.id===d.id||f.nom===d.nom))fours.push({...d});});
  // Mise à jour silencieuse des fournisseurs par défaut si données manquantes
  fours.forEach((f,i)=>{
    const df=DF.find(d=>d.id===f.id);
    if(df){
      if(!f.email)f.email=df.email;
      if(!f.devis)f.devis=df.devis;
      if(!f.logo||f.logo==='')f.logo=df.logo;
      if(!f.ali_url)f.ali_url=df.ali_url;
    }
  });
  save('f');
  trans=await IDB_GET(TK,[]);
  // Semis du transitaire par défaut s'il n'existe pas encore dans la liste
  if(!trans.some(t=>t.nom===DT[0].nom)){trans.unshift({...DT[0]});save('t');}
  winOverrides=await IDB_GET(WK,{});
  // Silent migration: add grp field to products that lack it
  let migrated=false;
  prods.forEach(p=>{
    if(!p.grp){const dp=DP.find(d=>d.fn===p.fn&&d.nom===p.nom);if(dp&&dp.grp){p.grp=dp.grp;migrated=true;}}
  });
  if(migrated)save('p');
  document.getElementById('ph-date').textContent='Généré le '+new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  await auditLoad();
  await devRefLoad();
  await impLoadPrefs();
  await expLoadPrefs();
  loadS();await loadDevis();
  cmMount('catalogue','cm-catalogue');
  cmMount('simulation','cm-simulation');
  cmMount('devis','cm-devis');
  cmMount('devis','cm-pdf',{inline:true}); // le modal PDF partage la sélection du devis
  // Auto-masquage mobile : re-rendre quand on franchit le seuil 768px
  try{window.matchMedia('(max-width:767px)').addEventListener('change',()=>{renderCat();simCalc();renderDevisCart();});}catch(e){}
  renderCat();renderFour();renderTrans();popSim();setSimTrans('Maritime');
  bkpWeeklyWarn();
}

function buildProds(){
  const cc={};let g=0;
  return DP.map(d=>{
    g++;cc[d.cat]=(cc[d.cat]||0)+1;
    const code=CATS[d.cat]||'PRD';
    const ref=`${code}-${String(cc[d.cat]).padStart(3,'0')}-${String(g).padStart(3,'0')}`;
    const f=fours.find(x=>x.nom===d.fn);
    return{id:'P'+String(g).padStart(4,'0'),ref,nom:d.nom,cat:d.cat,grp:d.grp||'',fid:f?f.id:'',fn:d.fn,prix:d.prix,prach:0,dev:'RMB',l:d.l,la:d.la,h:d.h,kg:d.kg,tr:d.tr,marge:'',rem:0,conc:'',moq:d.moq||1,desc:'',specs:d.specs,photos:d.imgs?[...d.imgs]:(d.img?[d.img]:[])};
  });
}

function save(t){
  if(t==='p')IDB_SET(PK,prods);
  if(t==='f')IDB_SET(FK,fours);
  if(t==='t')IDB_SET(TK,trans);
  if(t==='s')LS_SET(SK,S); // réglages légers : restent en localStorage
}

function loadS(){
  document.getElementById('s_tc').value=S.tauxChange;
  document.getElementById('s_fa').value=S.tarifAerien;
  document.getElementById('s_fm').value=S.tarifMaritime;
  document.getElementById('s_mg').value=S.tauxMarge;
  document.getElementById('s_trf_mode').value=S.trf.mode;
  document.getElementById('s_trf_val').value=S.trf.val;
  document.getElementById('s_ass_on').value=S.assu.on?'1':'0';
  document.getElementById('s_ass_mode').value=S.assu.mode;
  document.getElementById('s_ass_val').value=S.assu.val;
  document.getElementById('s_tvi').value=S.tvaInterne;
}

function saveSettings(){
  S.tauxChange=parseFloat(document.getElementById('s_tc').value)||95;
  S.tarifAerien=parseFloat(document.getElementById('s_fa').value)||11000;
  S.tarifMaritime=parseFloat(document.getElementById('s_fm').value)||230000;
  S.tauxMarge=parseFloat(document.getElementById('s_mg').value)||35;
  S.trf={mode:document.getElementById('s_trf_mode').value,val:parseFloat(document.getElementById('s_trf_val').value)||0};
  S.assu={on:document.getElementById('s_ass_on').value==='1',mode:document.getElementById('s_ass_mode').value,val:parseFloat(document.getElementById('s_ass_val').value)||0};
  S.tvaInterne=parseFloat(document.getElementById('s_tvi').value)||18;
  save('s');auditLog('parametres',{...S});
  renderCat();simCalc();toast('Paramètres enregistrés ✓');
}

function toggleSettings(){
  const ov=document.getElementById('spanel');
  if(ov.classList.contains('open'))closeMod('spanel');else{openMod('spanel');renderStoragePanel();}
}

/* ---- ESPACE UTILISATEUR (avatar + menu déroulant) ---- */
function userMenuToggle(){
  const m=document.getElementById('user-menu'),b=document.getElementById('user-avatar-btn');
  const open=!m.classList.contains('open');
  m.classList.toggle('open',open);
  b.setAttribute('aria-expanded',open);
  if(open){
    const close=e=>{
      if(document.getElementById('user-area').contains(e.target))return;
      userMenuClose();
      document.removeEventListener('click',close);
    };
    setTimeout(()=>document.addEventListener('click',close),0);
  }
}
function userMenuClose(){
  document.getElementById('user-menu').classList.remove('open');
  document.getElementById('user-avatar-btn').setAttribute('aria-expanded','false');
}


function tab(name){
  ['catalogue','fournisseurs','transitaires','simulation','devis'].forEach(t=>{
    document.getElementById('t-'+t).style.display=t===name?'block':'none';
    const b=document.getElementById('tab-'+t);
    if(b){const on=t===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;}
  });
  if(name==='devis')renderDevis();
  if(name==='catalogue')renderCat(); // resynchronise les checkboxes/prix après actions dans le devis
}

function setView(v){
  view=v;
  document.getElementById('vg').classList.toggle('active',v==='grid');
  document.getElementById('vl').classList.toggle('active',v==='list');
  renderCat();
}
