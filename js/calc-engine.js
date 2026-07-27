// ES module: no reference to the global `S` settings object or to `document` —
// every external value (settings, rates) is passed in as a parameter so this
// file is unit-testable in isolation (see tests/calc-engine.test.js).
export function xofRate(dev,settings){
  if(dev==='RMB')return settings.tauxChange;
  if(dev==='USD')return 600;
  if(dev==='EUR')return 655;
  return 1;
}
export function toXOF(v,dev,settings){return v?v*xofRate(dev,settings):0;}

/* ===== MOTEUR DE CALCUL (source unique de vérité) =====
   Étape 1 — Coût de revient HT en devise source :
     Coût d'achat HT = EXW × qté + fret local ; + frais transfert + Trade Assurance
   Étape 2 — Conversion en devise cible (XOF) PUIS marge sur le coût de revient unitaire converti
   Étape 3 — Frais logistiques transitaire tout-compris (fret + douane + taxes) → Prix de Vente TTC
   La TVA interne (clients assujettis) est affichée séparément, jamais ajoutée aux frais logistiques. */
export const r2=v=>Math.round((v+Number.EPSILON)*100)/100;
export function cbmOf(l,la,h,unit){const v=(l||0)*(la||0)*(h||0);return unit==='m'?v:v/1e6;}
export function fraisCfg(cfg,base){if(!cfg)return 0;return cfg.mode==='fixe'?(parseFloat(cfg.val)||0):r2(base*(parseFloat(cfg.val)||0)/100);}
export function calcEngine(i){
  const qty=Math.max(1,i.qty||1);
  // Étape 1 — coût de revient (devise source) ; le fret local vaut pour la commande entière
  const coutAchat=r2((i.exw||0)*qty+(i.fretLocal||0));
  const coutAchatU=r2(coutAchat/qty);
  const fTrf=fraisCfg(i.transfert,coutAchat);
  const fAss=(i.assurance&&i.assurance.on)?fraisCfg(i.assurance,coutAchat):0;
  const coutRevient=r2(coutAchat+fTrf+fAss);
  const coutRevientU=r2(coutRevient/qty);
  // Étape 2 — conversion avant marge
  const tc=i.tauxChange||1;
  const coutRevientUX=r2(coutRevientU*tc);
  const coutRevientX=r2(coutRevientUX*qty);
  const margeU=r2(coutRevientUX*(i.margePct||0)/100);
  const margeTot=r2(margeU*qty);
  const pvuBrut=r2(coutRevientUX+margeU);
  const remU=r2(pvuBrut*(i.remisePct||0)/100);
  const pvuHT=r2(pvuBrut-remU);
  const pvtHT=r2(pvuHT*qty);
  // Étape 3 — frais logistiques tout-compris puis TTC
  const cbm=cbmOf(i.l,i.la,i.h,i.dimU);
  const fraisLog=r2(i.mode==='Aérien'?(i.kg||0)*qty*(i.tarifAerien||0):cbm*qty*(i.tarifMaritime||0));
  const fraisLogU=r2(fraisLog/qty);
  const pvuTTC=r2(pvuHT+fraisLogU);
  const pvtTTC=r2(pvtHT+fraisLog);
  // TVA interne — assujettis uniquement, assise sur le montant HT (jamais sur les frais logistiques)
  const tvaM=(i.assujetti&&i.tvaInterne)?r2(pvtHT*i.tvaInterne/100):0;
  return{qty,dev:i.dev||'XOF',tauxChange:tc,mode:i.mode||'Maritime',
    exwUX:r2((i.exw||0)*tc),fretLocalX:r2((i.fretLocal||0)*tc),
    coutAchat,coutAchatU,fTrf,fAss,coutRevient,coutRevientU,coutRevientUX,coutRevientX,
    margeU,margeTot,margePct:i.margePct||0,remU,pvuHT,pvtHT,
    cbm,cbmTot:r2(cbm*qty*1e6)/1e6,fraisLog,fraisLogU,pvuTTC,pvtTTC,
    tvaM,tvaPct:i.assujetti?(i.tvaInterne||0):0,totalAvecTVA:r2(pvtTTC+tvaM)};
}
/* ===== FIN MOTEUR ===== */

// Adaptateur produit → moteur (o : surcharges {marge,rem,qty,tr,fa,fm,assu,assujetti})
// `settings` remplace l'ancien global `S` (tauxChange, tauxMarge, tarifAerien, tarifMaritime, trf, assu, tvaInterne).
export function calc(p,settings,o={}){
  const margePct=o.marge!==undefined?o.marge:(p.marge!==''&&p.marge!=null?parseFloat(p.marge):settings.tauxMarge);
  return calcEngine({
    exw:parseFloat(p.prix)||0,fretLocal:parseFloat(p.prach)||0,dev:p.dev||'RMB',
    qty:o.qty||1,tauxChange:xofRate(p.dev||'RMB',settings),
    margePct,remisePct:o.rem!==undefined?o.rem:(parseFloat(p.rem)||0),
    l:p.l,la:p.la,h:p.h,dimU:p.dimU||'cm',kg:p.kg,
    mode:o.tr||p.tr||'Maritime',
    tarifAerien:o.fa||settings.tarifAerien,tarifMaritime:o.fm||settings.tarifMaritime,
    transfert:settings.trf,assurance:o.assu!==undefined?{...settings.assu,on:o.assu}:settings.assu,
    tvaInterne:settings.tvaInterne,assujetti:!!o.assujetti});
}

// ---- Pont de compatibilité ascendante ----
// catalogue.js / devis.js / export-module.js / app-shell.js restent des
// classic <script> (pas des modules) et appellent calc(p,o), xofRate(dev),
// toXOF(v,dev), calcEngine(i), r2(v) comme des globales, en s'appuyant
// implicitement sur le global `S`. On republie donc ces mêmes signatures
// sur `window`, adossées au `S` global au moment de l'appel, pour que rien
// d'autre n'ait à changer.
if(typeof window!=='undefined'){
  window.xofRate=dev=>xofRate(dev,S);
  window.toXOF=(v,dev)=>toXOF(v,dev,S);
  window.r2=r2;
  window.cbmOf=cbmOf;
  window.fraisCfg=fraisCfg;
  window.calcEngine=calcEngine;
  window.calc=(p,o)=>calc(p,S,o);
}

/* ---- HISTORIQUE AUDIT ---- */
