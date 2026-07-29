/* ---- UTILS ---- */
// Anime les barres de progression via transform (composite GPU) plutôt que width (déclenche un reflow à chaque tick de chunk)
function setProgress(el,pct){
  el.style.transform=`scaleX(${pct/100})`;
  const bar=el.closest('.progress');
  if(bar)bar.setAttribute('aria-valuenow',Math.round(pct));
}
// Limite les recalculs coûteux (filtrage + reconstruction complète du DOM) déclenchés à chaque frappe dans un champ de recherche
function debounce(fn,ms=180){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
// renderCatDeb a été retiré : la recherche catalogue utilise maintenant le debounce natif
// d'Alpine (@input.debounce.180ms, voir catFiltersCmp dans js/catalogue.js).
const renderFourDeb=debounce(renderFour),renderTransDeb=debounce(renderTrans),dvFilterChangeDeb=debounce(dvFilterChange);
let modReturnFocus=null;
function openMod(id){
  modReturnFocus=document.activeElement;
  const ov=document.getElementById(id);
  ov.classList.add('open');
  const first=ov.querySelector('.fg input.fc:not([readonly]),.fg select.fc,.fg textarea.fc')||ov.querySelector('button');
  if(first)first.focus();
}
function closeMod(id){
  document.getElementById(id).classList.remove('open');
  if(modReturnFocus&&document.contains(modReturnFocus)){modReturnFocus.focus();modReturnFocus=null;}
}
// Confirmation maison (remplace confirm() natif) : nomme l'élément, cohérente avec le reste du système de modales.
let cfmResolve=null;
function askConfirm(message,{title='Confirmer',okLabel='Supprimer'}={}){
  if(cfmResolve){const r=cfmResolve;cfmResolve=null;r(false);} // une confirmation en attente est annulée par la suivante (modales exclusives)
  document.getElementById('cfm-title').textContent=title;
  document.getElementById('cfm-msg').textContent=message;
  document.getElementById('cfm-ok').textContent=okLabel;
  openMod('confirm-modal');
  return new Promise(res=>{cfmResolve=res;});
}
function cfmCancel(){const r=cfmResolve;cfmResolve=null;closeMod('confirm-modal');if(r)r(false);}
function cfmConfirm(){const r=cfmResolve;cfmResolve=null;closeMod('confirm-modal');if(r)r(true);}
// Raccourcis clavier desktop (Alex power user) : sans effet si l'utilisateur est en train de taper dans un champ
function isTypingTarget(el){
  if(!el)return false;
  return el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable;
}
const KB_NEW_MODAL={catalogue:openProdModal,fournisseurs:openFourModal,transitaires:openTransModal};
const KB_SEARCH_ID={catalogue:'cat-search',fournisseurs:'four-search',transitaires:'tr-search',devis:'dv-search'};
const KB_SAVE_FOR_MODAL={'prod-modal':saveProd,'four-modal':saveFour,'trans-modal':saveTrans};
function currentTabName(){
  const b=document.querySelector('.tab.active');
  return b?b.id.replace('tab-',''):'catalogue';
}
// Clavier : Échap ferme modales et menus ; Tab reste piégé dans la modale ouverte ; flèches sur les onglets
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
    const ov=document.querySelector('.overlay.open');
    const fn=ov&&KB_SAVE_FOR_MODAL[ov.id];
    if(fn){e.preventDefault();fn();}
    return;
  }
  if(!isTypingTarget(e.target)&&!document.querySelector('.overlay.open,.user-menu.open')&&!cmAnyOpen()&&!userMenuAnyOpen()){
    if(e.key==='/'){
      const id=KB_SEARCH_ID[currentTabName()];
      if(id){e.preventDefault();document.getElementById(id).focus();}
      return;
    }
    if(e.key==='n'||e.key==='N'){
      const fn=KB_NEW_MODAL[currentTabName()];
      if(fn){e.preventDefault();fn();}
      return;
    }
    if(e.key==='?'){e.preventDefault();openMod('shortcuts-modal');return;}
  }
  if(e.key==='Escape'){
    const ov=document.querySelector('.overlay.open');
    if(ov){ov.id==='confirm-modal'?cfmCancel():closeMod(ov.id);return;}
    cmCloseAll();
    tbMoreCloseAll();
    userMenuClose();
    return;
  }
  if(e.key==='Tab'){
    const ov=document.querySelector('.overlay.open');
    if(!ov)return;
    const foc=[...ov.querySelectorAll('button,input:not([type=hidden]):not([readonly]),select,textarea,a[href]')].filter(el=>el.offsetParent!==null);
    if(!foc.length)return;
    const first=foc[0],last=foc[foc.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    return;
  }
  if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&e.target.closest&&e.target.closest('[role=tablist]')){
    const names=['catalogue','fournisseurs','transitaires','simulation','devis'];
    const cur=names.findIndex(n=>document.getElementById('tab-'+n)===e.target);
    if(cur<0)return;
    e.preventDefault();
    const next=names[(cur+(e.key==='ArrowRight'?1:names.length-1))%names.length];
    tab(next);document.getElementById('tab-'+next).focus();
  }
});
document.querySelectorAll('.overlay').forEach(el=>el.addEventListener('click',e=>{
  if(e.target!==el)return;
  el.id==='confirm-modal'?cfmCancel():el.classList.remove('open');
}));
/* ===== SAUVEGARDE & RESTAURATION (backup JSON — localStorage pour gf_s/gf_v, IndexedDB pour le reste) ===== */
// Clés incluses dans le backup (voir bkpSnapshot) : gf_s/gf_v restent en localStorage (réglages légers),
// gf_p/gf_f/gf_t/gf_win/gf_audit/gf_d/gf_dc/gf_dp/gf_cols/gf_imp/gf_exp vivent en IndexedDB
const BKP_LS_KEYS=new Set([SK,VK]);
const BKP_WARN_K='gf_warn';

function bkpCounts(data){
  const n=k=>{try{const v=JSON.parse(data[k]||'null');return Array.isArray(v)?v.length:0;}catch(e){return 0;}};
  return{produits:n(PK),fournisseurs:n(FK),transitaires:n(TK),devis:n(DK)};
}
// Instantané des données actuelles (mémoire + localStorage) au format {clé: chaîne JSON}, prêt pour bkpCounts / export
function bkpSnapshot(){
  const data={};
  data[SK]=localStorage.getItem(SK);
  data[VK]=localStorage.getItem(VK);
  data[PK]=JSON.stringify(prods);
  data[FK]=JSON.stringify(fours);
  data[TK]=JSON.stringify(trans);
  data[WK]=JSON.stringify(winOverrides);
  data[AK]=JSON.stringify(auditHist||[]);
  data[DK]=JSON.stringify(devisCart);
  data[DCK]=JSON.stringify(devisClient);
  data[DPK]=JSON.stringify(devisPrefs);
  data['gf_cols']=JSON.stringify(cmSerialize());
  data['gf_imp']=JSON.stringify(impPrefs());
  data['gf_exp']=JSON.stringify(expPrefs);
  Object.keys(data).forEach(k=>{if(data[k]==null)delete data[k];});
  return data;
}

/* ---- SUIVI DE L'UTILISATION & NETTOYAGE DU STOCKAGE ---- */
function storBytes(v){try{return new Blob([JSON.stringify(v)]).size;}catch(e){return 0;}}
function storFmt(n){
  if(n<1024)return n+' o';
  if(n<1048576)return(n/1024).toFixed(1)+' Ko';
  return(n/1048576).toFixed(2)+' Mo';
}
// Répartition détaillée des données actuelles par catégorie (comptage + poids JSON approximatif)
function storBreakdown(){
  const lastHtmlSize=impPrefs().lastHtml?storBytes(impPrefs().lastHtml):0;
  return[
    {lbl:'Produits (photos incluses)',n:prods.length,size:storBytes(prods)},
    {lbl:'Fournisseurs',n:fours.length,size:storBytes(fours)},
    {lbl:'Transitaires',n:trans.length,size:storBytes(trans)},
    {lbl:'Panier devis',n:devisCart.length,size:storBytes(devisCart)+storBytes(devisClient)+storBytes(devisPrefs)},
    {lbl:'Historique des calculs',n:(auditHist||[]).length,size:storBytes(auditHist||[])},
    {lbl:'HTML mémorisé (import)',n:lastHtmlSize?1:0,size:lastHtmlSize},
    {lbl:'Préférences (colonnes, export, réglages)',n:'',size:storBytes(cmSerialize())+storBytes(expPrefs)+storBytes(winOverrides)+(localStorage.getItem(SK)||'').length},
  ];
}
async function renderStoragePanel(){
  const el=document.getElementById('stor-panel');
  if(!el)return;
  const rows=storBreakdown();
  const total=rows.reduce((s,r)=>s+r.size,0);
  let quotaLine='';
  if(navigator.storage&&navigator.storage.estimate){
    try{
      const est=await navigator.storage.estimate();
      if(est.quota)quotaLine=`<div style="margin-top:6px">Utilisé par le navigateur (toutes données du site) : <b>${storFmt(est.usage||0)}</b> / ${storFmt(est.quota)} (${Math.round(100*(est.usage||0)/est.quota)}%)</div>`;
    }catch(e){}
  }
  const hasHtml=!!impPrefs().lastHtml;
  const hasAudit=(auditHist||[]).length>0;
  el.innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:11.5px">
      ${rows.map(r=>`<tr><td style="padding:2px 0">${r.lbl}${r.n!==''?` <span style="color:var(--muted)">(${r.n})</span>`:''}</td><td style="padding:2px 0;text-align:right;font-variant-numeric:tabular-nums">${storFmt(r.size)}</td></tr>`).join('')}
      <tr style="border-top:1px solid rgba(0,204,119,.3);font-weight:700"><td style="padding:4px 0">Total (données Go.Flow)</td><td style="padding:4px 0;text-align:right">${storFmt(total)}</td></tr>
    </table>
    ${quotaLine}
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sec btn-sm" onclick="storClearAudit()" ${hasAudit?'':'disabled'}><svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg> Vider l'historique des calculs</button>
      <button class="btn btn-sec btn-sm" onclick="storClearLastHtml()" ${hasHtml?'':'disabled'}><svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg> Supprimer le HTML mémorisé</button>
    </div>`;
}
function storClearAudit(){
  if(!(auditHist||[]).length)return;
  const n=auditHist.length;
  askConfirm(`Vider les ${n} entrée${n>1?'s':''} de l'historique des calculs ?`,{title:"Vider l'historique",okLabel:'Vider'}).then(ok=>{
    if(!ok)return;
    const prev=auditHist;
    auditHist=[];
    IDB_SET(AK,auditHist);
    renderStoragePanel();
    toastUndo(`Historique des calculs vidé (${n} entrée${n>1?'s':''})`,()=>{
      auditHist=prev;IDB_SET(AK,auditHist);renderStoragePanel();toast('Suppression annulée');
    });
  });
}
function storClearLastHtml(){
  const p=impPrefs();
  if(!p.lastHtml)return;
  delete p.lastHtml;
  impPrefsSave();
  toast('HTML mémorisé supprimé ✓');
  renderStoragePanel();
}

/* ---- Dossier de sauvegarde automatique (File System Access API) ---- */
// Le FileSystemDirectoryHandle ne peut pas être stocké en localStorage : on le persiste en IndexedDB.
const BKP_FS_OK=typeof window.showDirectoryPicker==='function';

function bkpIdb(){
  return new Promise((res,rej)=>{
    const rq=indexedDB.open('gf_fs',1);
    rq.onupgradeneeded=()=>rq.result.createObjectStore('handles');
    rq.onsuccess=()=>res(rq.result);
    rq.onerror=()=>rej(rq.error);
  });
}
async function bkpDirGet(){
  try{
    const db=await bkpIdb();
    return await new Promise((res,rej)=>{
      const rq=db.transaction('handles').objectStore('handles').get('backupDir');
      rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);
    });
  }catch(e){return null;}
}
async function bkpDirSet(handle){
  const db=await bkpIdb();
  return new Promise((res,rej)=>{
    const tx=db.transaction('handles','readwrite');
    tx.objectStore('handles').put(handle,'backupDir');
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  });
}
// Vérifie/redemande la permission d'écriture sur le dossier mémorisé
async function bkpDirPerm(handle,ask){
  const opt={mode:'readwrite'};
  try{
    if(await handle.queryPermission(opt)==='granted')return true;
    if(ask&&await handle.requestPermission(opt)==='granted')return true;
  }catch(e){}
  return false;
}
// Ouvre le sélecteur natif, mémorise le handle et retourne le handle (ou null si annulé/échec)
async function bkpChooseDir(){
  if(!BKP_FS_OK)return null;
  try{
    const handle=await window.showDirectoryPicker({mode:'readwrite'});
    await bkpDirSet(handle);
    await bkpDirUI();
    toast(`Dossier de sauvegarde défini : ${handle.name} ✓`);
    return handle;
  }catch(e){
    if(e&&e.name!=='AbortError')toast('Impossible de sélectionner le dossier',true);
    return null;
  }
}
// Désactive la sauvegarde automatique → retour au téléchargement classique
async function bkpRemoveDir(){
  try{
    const db=await bkpIdb();
    await new Promise((res,rej)=>{
      const tx=db.transaction('handles','readwrite');
      tx.objectStore('handles').delete('backupDir');
      tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
    });
    await bkpDirUI();
    toast('Sauvegarde automatique désactivée — les exports repassent en téléchargement classique');
  }catch(e){toast('Impossible de supprimer le dossier de sauvegarde',true);}
}
// Met à jour la section « Sauvegarde automatique » des paramètres
async function bkpDirUI(){
  const st=document.getElementById('bkp-dir-status'),hint=document.getElementById('bkp-dir-hint'),
        btn=document.getElementById('bkp-dir-btn'),btnLbl=document.getElementById('bkp-dir-btn-lbl'),
        del=document.getElementById('bkp-dir-del');
  if(!st)return;
  if(!BKP_FS_OK){
    document.getElementById('bkp-dir-actions').style.display='none';
    st.textContent='Cette fonctionnalité n\'est disponible que sur Chrome ou Edge.';
    hint.textContent='Les exports seront téléchargés dans votre dossier par défaut.';
    return;
  }
  const h=await bkpDirGet();
  if(h){
    // Le navigateur n'expose que le nom du dossier, jamais son chemin complet (sécurité)
    st.innerHTML=`Dossier actuel : <b></b>`;st.querySelector('b').textContent=h.name;
    hint.textContent='Les exports JSON s\'enregistrent automatiquement dans ce dossier (nom horodaté, aucune sauvegarde écrasée).';
    btnLbl.textContent='Changer de dossier';
    del.style.display='';
  }else{
    st.textContent='Aucun dossier défini';
    hint.textContent='Sans dossier défini, l\'export vous proposera d\'en choisir un, sinon téléchargement classique.';
    btnLbl.textContent='Définir le dossier de sauvegarde';
    del.style.display='none';
  }
}

// Tente d'écrire un fichier dans le dossier de sauvegarde préconfiguré.
// Retourne le nom du dossier si OK, null si fallback téléchargement requis (toast d'erreur déjà affiché).
async function bkpTrySaveToDir(fname,content){
  if(!BKP_FS_OK)return null;
  let dir=await bkpDirGet();
  // Aucun dossier défini → proposer d'en choisir un maintenant (annulable → téléchargement classique)
  if(!dir)dir=await bkpChooseDir();
  if(!dir)return null;
  try{
    if(!await bkpDirPerm(dir,true))throw Object.assign(new Error('perm'),{name:'NotAllowedError'});
    const fh=await dir.getFileHandle(fname,{create:true});
    const w=await fh.createWritable();
    await w.write(content);await w.close();
    return dir.name;
  }catch(e){
    // Dossier déplacé/supprimé, permission révoquée ou disque plein → fallback téléchargement
    const msg=(e&&e.name==='NotFoundError')
      ?'Le dossier de sauvegarde n\'est plus accessible. Veuillez le re-sélectionner (Paramètres).'
      :(e&&e.name==='NotAllowedError')
        ?'Permission d\'écriture refusée — re-sélectionnez le dossier dans Paramètres.'
        :'Écriture impossible dans le dossier de sauvegarde.';
    toast(`${msg} Téléchargement classique utilisé.`,true);
    return null;
  }
}

async function exportBackup(){
  const data=bkpSnapshot();
  const c=bkpCounts(data);
  const backup={app:'Go-Flow',type:'backup',ver:DATA_VER,date:new Date().toISOString(),data};
  const d=new Date(),pad=x=>String(x).padStart(2,'0');
  // Horodatage à la minute : jamais d'écrasement silencieux d'une sauvegarde précédente
  const fname=`goflow_backup_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.json`;
  const json=JSON.stringify(backup,null,2);
  const okMsg=`${c.produits} produits, ${c.fournisseurs} fournisseurs, ${c.transitaires} transitaires, ${c.devis} articles devis`;

  // 1) Écriture directe dans le dossier choisi (Chrome/Edge desktop)
  const dirName=await bkpTrySaveToDir(fname,json);
  if(dirName){
    auditLog('export_backup',c);
    toast(`✓ Sauvegarde enregistrée dans ${dirName} — ${okMsg}`);
    return;
  }

  // 2) Fallback : téléchargement classique du navigateur
  const blob=new Blob([json],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=fname;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  auditLog('export_backup',c);
  toast(`Sauvegarde exportée ✓ — ${okMsg}`);
}

function importBackup(){document.getElementById('bkp-file').click();}

function handleBackupFile(input){
  const file=input.files&&input.files[0];
  input.value='';// permet de re-sélectionner le même fichier
  if(!file)return;
  const rd=new FileReader();
  rd.onerror=()=>toast('Lecture du fichier impossible — données actuelles inchangées',true);
  rd.onload=async()=>{
    let j;
    try{j=JSON.parse(rd.result);}catch(e){toast('Fichier corrompu ou format invalide — données actuelles inchangées',true);return;}
    if(!j||j.app!=='Go-Flow'||j.type!=='backup'||!j.data||typeof j.data!=='object'){
      toast('Ce fichier n\'est pas une sauvegarde Go-Flow valide — données actuelles inchangées',true);return;
    }
    const c=bkpCounts(j.data);
    const when=j.date?new Date(j.date).toLocaleDateString('fr-FR'):'date inconnue';
    const ok=await askConfirm(`Restaurer la sauvegarde du ${when} ?\n\n`+
      `• ${c.produits} produits\n• ${c.fournisseurs} fournisseurs\n• ${c.transitaires} transitaires\n• ${c.devis} articles au panier devis\n\n`+
      `Toutes les données actuelles seront remplacées.`,{title:'Restaurer la sauvegarde',okLabel:'Restaurer'});
    if(!ok)return;
    try{
      for(const k of Object.keys(j.data)){
        if(k.indexOf('gf_')!==0||typeof j.data[k]!=='string')continue;
        if(BKP_LS_KEYS.has(k)){localStorage.setItem(k,j.data[k]);continue;}
        try{await IDB_SET(k,JSON.parse(j.data[k]));}catch(e){console.warn('Restauration : donnée ignorée',k,e);}
      }
      // Empêche la migration DATA_VER de purger les données restaurées au rechargement
      const bv=parseInt(j.data[VK]||'0');
      localStorage.setItem(VK,String(Math.max(DATA_VER,isNaN(bv)?0:bv)));
      // Recharge l'historique tout juste restauré (cache mémoire) avant d'y ajouter l'entrée d'import,
      // sinon l'ancien cache écraserait l'historique restauré
      auditHist=await IDB_GET(AK,[]);
      auditLog('import_backup',c);
      toast('Sauvegarde restaurée ✓ — rechargement…');
      setTimeout(()=>location.reload(),800);
    }catch(e){
      toast('Espace de stockage saturé. Veuillez exporter vos données et supprimer les éléments inutiles.',true);
    }
  };
  rd.readAsText(file);
}

// Rappel d'export : au plus une fois par semaine
function bkpWeeklyWarn(){
  const last=parseInt(localStorage.getItem(BKP_WARN_K)||'0');
  if(Date.now()-last<7*864e5)return;
  try{localStorage.setItem(BKP_WARN_K,String(Date.now()));}catch(e){return;}
  setTimeout(()=>toast('Données stockées localement — pensez à « Exporter mes données » (Paramètres)',true),1500);
}
/* ===== FIN SAUVEGARDE & RESTAURATION ===== */
