const SK='gf_s',PK='gf_p',FK='gf_f',TK='gf_t',VK='gf_v',CK='gf_clients';
// Stockage résilient : données corrompues → valeur de repli ; quota plein → toast au lieu d'un crash silencieux
function LS_GET(k,fb){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v===null?fb:v;}catch(e){console.warn('localStorage corrompu:',k,e);return fb;}}
function LS_SET(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){toast('Espace de stockage saturé. Veuillez exporter vos données (Paramètres) et supprimer les éléments inutiles.',true);}}

/* ===== STOCKAGE LOCAL VOLUMINEUX (IndexedDB) =====
   localStorage (gf_s réglages, gf_v version, gf_warn rappel) reste en place pour les
   petites valeurs. Toutes les données volumineuses (produits, fournisseurs, transitaires,
   colonnes, historique, devis, import/export — photos et HTML en base64 inclus) vivent
   dans IndexedDB (base gf_store, magasin kv) pour éviter la saturation du quota
   localStorage (5-10 Mo selon navigateur). Migration automatique et transparente au
   premier chargement après mise à jour : voir migrateToIdb(). */
const IDB_NAME='gf_store',IDB_STORE='kv';
let _idbDbP=null;
function idbDb(){
  if(_idbDbP)return _idbDbP;
  _idbDbP=new Promise((res,rej)=>{
    if(!window.indexedDB){rej(new Error('IndexedDB indisponible'));return;}
    const rq=indexedDB.open(IDB_NAME,1);
    rq.onupgradeneeded=()=>{if(!rq.result.objectStoreNames.contains(IDB_STORE))rq.result.createObjectStore(IDB_STORE);};
    rq.onsuccess=()=>res(rq.result);
    rq.onerror=()=>rej(rq.error);
  });
  return _idbDbP;
}
function idbGetRaw(key){
  return idbDb().then(db=>new Promise((res,rej)=>{
    const rq=db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
    rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);
  }));
}
function idbSetRaw(key,val){
  return idbDb().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put(val,key);
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  }));
}
function idbDeleteRaw(key){
  return idbDb().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);
  }));
}
function idbAllEntries(){
  return idbDb().then(db=>new Promise((res,rej)=>{
    const store=db.transaction(IDB_STORE).objectStore(IDB_STORE);
    const ks=store.getAllKeys(),vs=store.getAll();
    let done=0,out={};
    const fin=()=>{if(++done===2)res(out);};
    ks.onsuccess=()=>{out._keys=ks.result;fin();};
    vs.onsuccess=()=>{out._vals=vs.result;fin();};
    ks.onerror=vs.onerror=()=>rej(ks.error||vs.error);
  }));
}
// Détection unique : bascule silencieuse sur localStorage si IndexedDB est indisponible
// (navigation privée stricte de certains navigateurs anciens) — compatibilité avant tout.
let _idbAvailP=null;
function idbAvailable(){
  if(!_idbAvailP)_idbAvailP=idbDb().then(()=>true,()=>false);
  return _idbAvailP;
}
// Lecture/écriture résilientes, même contrat que LS_GET/LS_SET mais asynchrone
async function IDB_GET(k,fb){
  if(!await idbAvailable())return LS_GET(k,fb);
  try{const v=await idbGetRaw(k);return v===undefined||v===null?fb:v;}catch(e){console.warn('IndexedDB corrompu ou indisponible:',k,e);return LS_GET(k,fb);}
}
function IDB_SET(k,v){
  return idbAvailable().then(ok=>{
    if(!ok){LS_SET(k,v);return;}
    return idbSetRaw(k,v).catch(e=>{
      console.warn('Échec écriture IndexedDB:',k,e);
      toast('Espace de stockage saturé. Veuillez exporter vos données (Paramètres) et supprimer les éléments inutiles.',true);
    });
  });
}
async function IDB_DELETE(k){
  if(!await idbAvailable()){localStorage.removeItem(k);return;}
  try{await idbDeleteRaw(k);}catch(e){console.warn('Échec suppression IndexedDB:',k,e);}
}

// Clés autrefois en localStorage, désormais dans IndexedDB (données volumineuses)
const IDB_MIGRATE_KEYS=['gf_p','gf_f','gf_t','gf_cols','gf_win','gf_audit','gf_d','gf_dc','gf_dp','gf_imp','gf_exp','gf_devref'];
const IDB_MIGR_FLAG='__migrated_v1';
// Migration automatique, une seule fois : copie chaque clé de localStorage vers IndexedDB
// puis la retire de localStorage pour libérer immédiatement le quota. Idempotent (flag posé après coup).
async function migrateToIdb(){
  if(!await idbAvailable())return; // pas d'IndexedDB : on reste sur localStorage pour ces clés (compat maximale)
  if(await IDB_GET(IDB_MIGR_FLAG,false))return;
  let moved=0;
  for(const k of IDB_MIGRATE_KEYS){
    const raw=localStorage.getItem(k);
    if(raw!=null){
      try{await idbSetRaw(k,JSON.parse(raw));moved++;}catch(e){console.warn('Migration : donnée corrompue ignorée',k,e);}
      localStorage.removeItem(k);
    }
  }
  await idbSetRaw(IDB_MIGR_FLAG,true);
  if(moved)console.info(`Go.Flow : ${moved} clé(s) migrée(s) de localStorage vers IndexedDB`);
}
/* ===== FIN STOCKAGE LOCAL VOLUMINEUX ===== */
