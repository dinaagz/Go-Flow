/* ============================================================
   MODULE ENTREPRISE & MENTIONS LÉGALES (Phase 2 step 2.2/2.3)
   Centralise les informations de Go Group et les textes légaux qui seront
   réutilisés plus tard dans la génération des devis/factures PDF, sans toucher
   au moteur de calcul (js/calc-engine.js) ni aux réglages tarifaires (gf_s).
   getCompanyInfo()/getLegalTexts() sont le point d'accès unique prévu pour
   cet usage futur — ils renvoient toujours un objet complet (valeurs par
   défaut si rien n'a encore été enregistré).
   ============================================================ */
const CPK='gf_company',LGK='gf_legal';

const CP_PM_TYPES=['Virement','Mobile Money','Espèces','Autre'];
const CP_DEFAULT_PAYMENTS=[
  {id:'pm-virement',type:'Virement',nom:'Virement bancaire',infos:''},
  {id:'pm-mixx',type:'Mobile Money',nom:'Mixx by Yas',infos:''},
  {id:'pm-moov',type:'Mobile Money',nom:'Moov Money',infos:''},
  {id:'pm-especes',type:'Espèces',nom:'Espèces',infos:''},
];
const CP_DEFAULT={nom:'Go Group',logo:'',rccm:'',cfe:'',adresse:'',email:'',tel:'',site:'',paiements:[]};
const LG_DEFAULT={cgv:'',mentions:'',paiement:'',livraison:''};

let company={...CP_DEFAULT,paiements:CP_DEFAULT_PAYMENTS.map(p=>({...p}))};
let legalTxt={...LG_DEFAULT};

async function companyLegalLoad(){
  const c=await IDB_GET(CPK,null);
  company=c?{...CP_DEFAULT,...c,paiements:(c.paiements&&c.paiements.length)?c.paiements:CP_DEFAULT_PAYMENTS.map(p=>({...p}))}
    :{...CP_DEFAULT,paiements:CP_DEFAULT_PAYMENTS.map(p=>({...p}))};
  legalTxt={...LG_DEFAULT,...(await IDB_GET(LGK,null)||{})};
}
// Accès unique prévu pour la future génération PDF (devis/factures) — toujours un objet complet
function getCompanyInfo(){return company;}
function getLegalTexts(){return legalTxt;}

/* ---- Informations de l'entreprise + coordonnées ---- */
function companySave(){
  company.nom=document.getElementById('cp-nom').value.trim()||'Go Group';
  company.rccm=document.getElementById('cp-rccm').value.trim();
  company.cfe=document.getElementById('cp-cfe').value.trim();
  company.adresse=document.getElementById('cp-adresse').value.trim();
  company.email=document.getElementById('cp-email').value.trim();
  company.tel=document.getElementById('cp-tel').value.trim();
  company.site=document.getElementById('cp-site').value.trim();
  IDB_SET(CPK,company);
  auditLog('entreprise',{nom:company.nom,rccm:company.rccm,cfe:company.cfe});
  toast('Informations entreprise enregistrées ✓');
}
function companyLogoUpload(input){
  const file=input.files&&input.files[0];
  input.value='';
  if(!file)return;
  const rd=new FileReader();
  rd.onerror=()=>toast('Lecture du logo impossible',true);
  rd.onload=()=>{
    company.logo=rd.result;
    IDB_SET(CPK,company);
    renderCompanyLogo();
    toast('Logo mis à jour ✓');
  };
  rd.readAsDataURL(file);
}
function companyLogoRemove(){
  company.logo='';
  IDB_SET(CPK,company);
  renderCompanyLogo();
}
function renderCompanyLogo(){
  const el=document.getElementById('cp-logo-preview');
  if(!el)return;
  el.innerHTML=company.logo
    ?`<img src="${company.logo}" alt="Logo de l'entreprise" style="max-width:120px;max-height:60px;object-fit:contain;border-radius:6px;border:1px solid var(--border)">
       <button type="button" class="btn btn-sec btn-sm" onclick="companyLogoRemove()">${ICO('trash')} Retirer</button>`
    :`<span style="color:var(--muted);font-size:11.5px">Aucun logo</span>`;
}

/* ---- Moyens de paiement (libres — ajout / modification / suppression) ---- */
function companyRenderPayments(){
  const el=document.getElementById('cp-payments-list');
  if(!el)return;
  el.innerHTML=company.paiements.map(p=>`
    <div class="fg" style="grid-template-columns:1.1fr 1.3fr 2fr auto;gap:8px;align-items:end;margin-bottom:8px">
      <div class="fgrp"><label class="flbl">Type</label>
        <select class="fc" onchange="companyPmField('${p.id}','type',this.value)">
          ${CP_PM_TYPES.map(t=>`<option value="${t}"${p.type===t?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="fgrp"><label class="flbl">Nom</label><input class="fc" value="${escH(p.nom)}" oninput="companyPmField('${p.id}','nom',this.value)" placeholder="Ex : Flooz"></div>
      <div class="fgrp"><label class="flbl">Informations de paiement</label><input class="fc" value="${escH(p.infos)}" oninput="companyPmField('${p.id}','infos',this.value)" placeholder="RIB, numéro, etc."></div>
      <button class="btn btn-danger btn-sm" onclick="companyPmRemove('${p.id}')" title="Supprimer ce moyen de paiement" aria-label="Supprimer ${escH(p.nom||'ce moyen de paiement')}"><svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg></button>
    </div>`).join('')||'<div style="color:var(--muted);font-size:12px">Aucun moyen de paiement — ajoutez-en un.</div>';
}
function companyPmField(id,field,val){
  const p=company.paiements.find(x=>x.id===id);if(!p)return;
  p[field]=val;IDB_SET(CPK,company);
}
function companyPmAdd(){
  company.paiements.push({id:'pm'+Date.now(),type:'Autre',nom:'',infos:''});
  IDB_SET(CPK,company);
  companyRenderPayments();
}
function companyPmRemove(id){
  company.paiements=company.paiements.filter(p=>p.id!==id);
  IDB_SET(CPK,company);
  companyRenderPayments();
}

function loadCompanyUI(){
  document.getElementById('cp-nom').value=company.nom||'';
  document.getElementById('cp-rccm').value=company.rccm||'';
  document.getElementById('cp-cfe').value=company.cfe||'';
  document.getElementById('cp-adresse').value=company.adresse||'';
  document.getElementById('cp-email').value=company.email||'';
  document.getElementById('cp-tel').value=company.tel||'';
  document.getElementById('cp-site').value=company.site||'';
  renderCompanyLogo();
  companyRenderPayments();
}

/* ---- Documents & mentions légales (CGV, mentions, conditions de paiement/livraison) ---- */
function legalSave(){
  legalTxt.cgv=document.getElementById('lg-cgv').value;
  legalTxt.mentions=document.getElementById('lg-mentions').value;
  legalTxt.paiement=document.getElementById('lg-paiement').value;
  legalTxt.livraison=document.getElementById('lg-livraison').value;
  IDB_SET(LGK,legalTxt);
  auditLog('mentions_legales',{});
  toast('Documents & mentions légales enregistrés ✓');
}
function loadLegalUI(){
  document.getElementById('lg-cgv').value=legalTxt.cgv||'';
  document.getElementById('lg-mentions').value=legalTxt.mentions||'';
  document.getElementById('lg-paiement').value=legalTxt.paiement||'';
  document.getElementById('lg-livraison').value=legalTxt.livraison||'';
}
/* ---- FIN MODULE ENTREPRISE & MENTIONS LÉGALES ---- */
