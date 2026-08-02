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
  await clientsInit();
  loadS();await loadDevis();
  cmMount('catalogue','cm-catalogue');
  cmMount('simulation','cm-simulation');
  cmMount('devis','cm-devis');
  cmMount('devis','cm-pdf',{inline:true}); // le modal PDF partage la sélection du devis
  // Auto-masquage mobile : re-rendre quand on franchit le seuil 768px
  try{window.matchMedia('(max-width:767px)').addEventListener('change',()=>{renderCat();simCalc();renderDevisCart();});}catch(e){}
  renderCat();renderFour();renderTrans();popSim();setSimTrans('Maritime');
  bkpWeeklyWarn();
  storQuotaWarn();
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

/* ---- ESPACE UTILISATEUR (avatar + menu déroulant) ----
   Phase 1C: ouverture/fermeture + détection du clic extérieur (@click.outside) migrées
   vers Alpine (userMenuCmp). userMenuToggle()/Close() restent les points d'entrée appelés
   par le reste de l'app (clavier, autres modules).
   Markup complet construit par JS (userMenuMount, innerHTML) plutôt que statique dans le
   HTML, et userMenuToggle()/Close() qui dispatchent un CustomEvent plutôt que de muter
   window.Alpine.$data(el) directement — voir le commentaire détaillé dans js/app-main.js
   (toastCmp) pour les deux raisons : (1) toute directive Alpine statique présente dans le
   HTML au chargement se fait scanner par Alpine avant que ce composant ne soit enregistré,
   et un Alpine.initTree() ultérieur ne "répare" pas ce qui a déjà été traité à vide ;
   (2) une mutation posée depuis l'extérieur d'Alpine (via $data(), Alpine.evaluate(), ou
   écriture directe sur l'objet réactif) ne déclenche pas sa réactivité — seule une
   évaluation faite PAR Alpine (@click="...", @event.window="...") la déclenche.
   userMenuAnyOpen() reste une simple LECTURE via $data() — lire l'état actuel n'a pas ce
   problème, seule l'écriture externe est concernée. */
Alpine.data('userMenuCmp',()=>({
  open:false,
  toggle(){this.open=!this.open;},
  close(){this.open=false;},
}));
(function userMenuMount(){
  const el=document.getElementById('user-area');
  if(!el)return;
  el.innerHTML=`
    <div x-data="userMenuCmp()" @click.outside="close()"
      @gf-usermenu-toggle.window="toggle()" @gf-usermenu-close.window="close()">
      <button id="user-avatar-btn" @click="toggle()" :aria-expanded="open" aria-haspopup="true" aria-label="Espace utilisateur"
        class="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-transparent text-[var(--nuit)] shadow-[var(--sh-xs)] transition-all duration-[180ms] [background:linear-gradient(var(--surface),var(--surface))_padding-box,var(--grad)_border-box] hover:-translate-y-px hover:shadow-[var(--sh-md)]"
        :class="open?'-translate-y-px shadow-[var(--sh-md)]':''">
        <svg class="ic h-[18px] w-[18px]" aria-hidden="true"><use href="#i-user"/></svg>
      </button>
      <div id="user-menu" role="menu" aria-label="Espace utilisateur"
        x-show="open"
        x-transition:enter="transition ease-out duration-150" x-transition:enter-start="opacity-0 -translate-y-0.5 scale-[.98]" x-transition:enter-end="opacity-100 translate-y-0 scale-100"
        :class="open?'max-[640px]:shadow-[0_0_0_100vmax_rgba(15,17,34,.45),var(--sh-lg)]':''"
        class="absolute right-0 top-[calc(100%+10px)] z-[300] min-w-[220px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[6px] shadow-[var(--sh-xl)] max-[640px]:fixed max-[640px]:left-3 max-[640px]:right-3 max-[640px]:top-auto max-[640px]:bottom-3 max-[640px]:min-w-0 max-[640px]:max-w-none max-[640px]:max-h-[min(70vh,520px)] max-[640px]:overflow-y-auto">
        <div class="mb-[6px] border-b border-[var(--border)] px-3 pb-3 pt-[10px]">
          <div class="font-['Montserrat',sans-serif] text-[13px] font-extrabold text-[var(--nuit)]">Go Group</div>
          <div class="mt-[2px] text-[11px] text-[var(--muted)]">globalgo.tg@gmail.com</div>
        </div>
        <button type="button" role="menuitem" @click="close();toggleSettings()"
          class="flex w-full items-center gap-[9px] rounded-[9px] px-3 py-[9px] text-left font-['Poppins',sans-serif] text-[13px] text-[var(--text)] transition-colors duration-150 hover:bg-[rgba(0,153,255,.08)]">
          <svg class="ic h-[15px] w-[15px] text-[var(--muted)]" aria-hidden="true"><use href="#i-settings"/></svg> Paramètres
        </button>
      </div>
    </div>`;
  Alpine.initTree(el);
})();
function userMenuData(){
  const el=document.getElementById('user-area');
  return el&&window.Alpine?window.Alpine.$data(el.firstElementChild):null;
}
function userMenuToggle(){
  window.dispatchEvent(new CustomEvent('gf-usermenu-toggle'));
}
function userMenuClose(){
  window.dispatchEvent(new CustomEvent('gf-usermenu-close'));
}
function userMenuAnyOpen(){
  const d=userMenuData();return !!(d&&d.open);
}


function tab(name){
  ['catalogue','fournisseurs','transitaires','clients','simulation','devis'].forEach(t=>{
    document.getElementById('t-'+t).style.display=t===name?'block':'none';
    const b=document.getElementById('tab-'+t);
    if(b){const on=t===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;}
  });
  if(name==='devis')renderDevis();
  if(name==='catalogue')renderCat(); // resynchronise les checkboxes/prix après actions dans le devis
  if(name==='clients')renderClients();
}

function setView(v){
  view=v;
  document.getElementById('vg').classList.toggle('active',v==='grid');
  document.getElementById('vl').classList.toggle('active',v==='list');
  renderCat();
}
// Menu "Plus d'actions" de la barre d'outils catalogue (regroupe les actions rares : import, export image)
function tbMoreToggle(btn){
  const wrap=btn.closest('.tb-more-wrap'),drop=wrap.querySelector('.tb-more-drop');
  const open=!drop.classList.contains('open');
  tbMoreCloseAll();
  drop.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',open);
  if(open){
    const close=e=>{
      if(wrap.contains(e.target))return;
      tbMoreCloseAll();
      document.removeEventListener('click',close);
    };
    setTimeout(()=>document.addEventListener('click',close),0);
  }
}
function tbMoreCloseAll(){
  document.querySelectorAll('.tb-more-drop.open').forEach(d=>{
    d.classList.remove('open');
    const b=d.closest('.tb-more-wrap').querySelector('.tb-more-btn');
    if(b)b.setAttribute('aria-expanded','false');
  });
}
