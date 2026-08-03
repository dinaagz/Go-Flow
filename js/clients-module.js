/* ===== MODULE CLIENTS (CRM) =====
   Base de données Clients distincte du catalogue produits/fournisseurs.
   Stockage : IndexedDB, clé gf_clients (CK, voir js/data-store.js) — mêmes
   garanties de résilience que prods/fours/trans (IDB_GET/IDB_SET, repli
   localStorage transparent). Rien ici ne touche au moteur de calcul ni aux devis. */

let clients=[],editCli=null,clientView='grid',cliPhotoData='';
// Callback à usage unique posé par le module Devis avant d'ouvrir la modale en mode
// "création rapide" (devisOpenCreateClient) : reçoit le client fraîchement créé pour
// l'appliquer au devis. Remis à null après appel ou après fermeture/annulation
// (closeClientModal) pour ne jamais fuiter vers une création de client sans rapport.
let cliSaveHook=null;
function closeClientModal(){cliSaveHook=null;closeMod('client-modal');}

const CLI_TYPE_CODE={particulier:'PAR',entreprise:'ENT',institution:'INS'};
const CLI_TYPE_LABEL={particulier:'Particulier',entreprise:'Entreprise',institution:'Institution'};

const DEVISES=[
  {c:'XOF',l:'Franc CFA (XOF)'},{c:'EUR',l:'Euro (EUR)'},{c:'USD',l:'Dollar US (USD)'},
  {c:'RMB',l:'Yuan chinois (RMB/CNY)'},{c:'GBP',l:'Livre sterling (GBP)'},{c:'GHS',l:'Cedi ghanéen (GHS)'},
  {c:'NGN',l:'Naira nigérian (NGN)'},{c:'MAD',l:'Dirham marocain (MAD)'},{c:'TND',l:'Dinar tunisien (TND)'},
  {c:'DZD',l:'Dinar algérien (DZD)'},{c:'AED',l:'Dirham des Émirats (AED)'},{c:'CAD',l:'Dollar canadien (CAD)'},
  {c:'CHF',l:'Franc suisse (CHF)'},{c:'INR',l:'Roupie indienne (INR)'},{c:'ZAR',l:'Rand sud-africain (ZAR)'}
];

// Liste de pays (FR) — couvre l'essentiel des géographies utiles à Go Group (Afrique, Europe,
// Amériques, Asie, Moyen-Orient, Océanie). Pour tout pays non listé, l'utilisateur peut saisir
// librement dans le champ ville (voir cliVillesRefresh) — pas de blocage.
const PAYS_LIST=["Afghanistan","Afrique du Sud","Albanie","Algérie","Allemagne","Andorre","Angola","Arabie saoudite","Argentine","Arménie","Australie","Autriche","Azerbaïdjan","Bahamas","Bahreïn","Bangladesh","Belgique","Bénin","Bhoutan","Biélorussie","Birmanie","Bolivie","Bosnie-Herzégovine","Botswana","Brésil","Brunei","Bulgarie","Burkina Faso","Burundi","Cambodge","Cameroun","Canada","Cap-Vert","Chili","Chine","Chypre","Colombie","Comores","Congo-Brazzaville","Congo-Kinshasa (RDC)","Corée du Nord","Corée du Sud","Costa Rica","Côte d'Ivoire","Croatie","Cuba","Danemark","Djibouti","Égypte","Émirats arabes unis","Équateur","Érythrée","Espagne","Estonie","Eswatini","États-Unis","Éthiopie","Fidji","Finlande","France","Gabon","Gambie","Géorgie","Ghana","Grèce","Guatemala","Guinée","Guinée-Bissau","Guinée équatoriale","Haïti","Honduras","Hongrie","Inde","Indonésie","Irak","Iran","Irlande","Islande","Israël","Italie","Jamaïque","Japon","Jordanie","Kazakhstan","Kenya","Kirghizistan","Kosovo","Koweït","Laos","Lesotho","Lettonie","Liban","Liberia","Libye","Liechtenstein","Lituanie","Luxembourg","Macédoine du Nord","Madagascar","Malaisie","Malawi","Maldives","Mali","Malte","Maroc","Maurice","Mauritanie","Mexique","Moldavie","Monaco","Mongolie","Monténégro","Mozambique","Namibie","Népal","Nicaragua","Niger","Nigeria","Norvège","Nouvelle-Zélande","Oman","Ouganda","Ouzbékistan","Pakistan","Panama","Paraguay","Pays-Bas","Pérou","Philippines","Pologne","Portugal","Qatar","République centrafricaine","République dominicaine","République tchèque","Roumanie","Royaume-Uni","Russie","Rwanda","Salvador","Sao Tomé-et-Principe","Sénégal","Serbie","Seychelles","Sierra Leone","Singapour","Slovaquie","Slovénie","Somalie","Soudan","Soudan du Sud","Sri Lanka","Suède","Suisse","Suriname","Syrie","Tadjikistan","Taïwan","Tanzanie","Tchad","Thaïlande","Togo","Tonga","Trinité-et-Tobago","Tunisie","Turkménistan","Turquie","Ukraine","Uruguay","Vanuatu","Vatican","Venezuela","Vietnam","Yémen","Zambie","Zimbabwe"];

// Villes par pays — curatée pour les géographies clés de Go Group (Togo, Chine, principaux
// partenaires ouest-africains et internationaux). Pour un pays hors de cette liste, le champ
// Ville reste un texte libre (datalist vide) : aucune saisie n'est bloquée.
const VILLES_PAR_PAYS={
  "Togo":["Lomé","Sokodé","Kara","Kpalimé","Atakpamé","Dapaong","Tsévié","Aného","Notsé","Bassar"],
  "Chine":["Shenzhen","Guangzhou","Yiwu","Shanghai","Pékin","Ningbo","Foshan","Dongguan","Hangzhou","Xi'an"],
  "France":["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Bordeaux","Lille","Rennes"],
  "Côte d'Ivoire":["Abidjan","Bouaké","Yamoussoukro","San-Pédro","Korhogo","Daloa"],
  "Bénin":["Cotonou","Porto-Novo","Parakou","Abomey-Calavi","Djougou"],
  "Ghana":["Accra","Kumasi","Tamale","Sekondi-Takoradi","Cape Coast"],
  "Nigeria":["Lagos","Abuja","Kano","Ibadan","Port Harcourt"],
  "Sénégal":["Dakar","Thiès","Kaolack","Saint-Louis","Ziguinchor"],
  "Mali":["Bamako","Sikasso","Mopti","Kayes"],
  "Burkina Faso":["Ouagadougou","Bobo-Dioulasso","Koudougou"],
  "Cameroun":["Douala","Yaoundé","Garoua","Bafoussam"],
  "Gabon":["Libreville","Port-Gentil","Franceville"],
  "Congo-Kinshasa (RDC)":["Kinshasa","Lubumbashi","Goma","Mbuji-Mayi"],
  "Maroc":["Casablanca","Rabat","Marrakech","Tanger","Fès"],
  "Tunisie":["Tunis","Sfax","Sousse"],
  "Algérie":["Alger","Oran","Constantine"],
  "États-Unis":["New York","Los Angeles","Chicago","Houston","Miami"],
  "Émirats arabes unis":["Dubaï","Abou Dabi","Charjah"],
  "Belgique":["Bruxelles","Anvers","Gand"],
  "Allemagne":["Berlin","Munich","Hambourg","Francfort"],
  "Royaume-Uni":["Londres","Manchester","Birmingham"],
  "Inde":["Mumbai","New Delhi","Bangalore","Chennai"],
  "Canada":["Toronto","Montréal","Vancouver"]
};

async function clientsInit(){
  clients=await IDB_GET(CK,[]);
  cliFillPaysSelects();
  cliFillDeviseSelect();
  renderClients();
}
function saveClients(){IDB_SET(CK,clients);}

function cliFillPaysSelects(){
  const opts='<option value="">—</option>'+PAYS_LIST.map(p=>`<option>${escH(p)}</option>`).join('');
  ['cli-pays','cli-ent-pays','cli-ins-pays','cli-pays-origine'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.innerHTML=opts;
  });
}
function cliFillDeviseSelect(){
  const el=document.getElementById('cli-devise');if(!el)return;
  el.innerHTML=DEVISES.map(d=>`<option value="${d.c}">${escH(d.l)}</option>`).join('');
}
function cliVillesRefresh(paysSelId,villeInputId,datalistId){
  const pays=document.getElementById(paysSelId).value;
  const villes=VILLES_PAR_PAYS[pays]||[];
  document.getElementById(datalistId).innerHTML=villes.map(v=>`<option value="${escH(v)}">`).join('');
}

/* ---- GÉNÉRATION D'IDENTIFIANT ---- */
// Format [TYPE]-[NNN]-[MMAA], ex. PAR-001-0826. NNN s'incrémente par type de client
// (nombre de clients existants de ce type + 1), MMAA = mois/année de création.
function genClientId(type){
  const code=CLI_TYPE_CODE[type]||'CLI';
  const now=new Date();
  const mmYY=String(now.getMonth()+1).padStart(2,'0')+String(now.getFullYear()).slice(-2);
  const n=clients.filter(c=>c.type===type).length+1;
  return `${code}-${String(n).padStart(3,'0')}-${mmYY}`;
}

/* ---- FORMULAIRE DYNAMIQUE ---- */
function cliTypeChange(){
  const t=document.getElementById('cli-type').value;
  document.getElementById('cli-sec-particulier').style.display=t==='particulier'?'block':'none';
  document.getElementById('cli-sec-entreprise').style.display=t==='entreprise'?'block':'none';
  document.getElementById('cli-sec-institution').style.display=t==='institution'?'block':'none';
  document.getElementById('cli-type-ro').value=CLI_TYPE_LABEL[t]||'';
  if(!editCli)document.getElementById('cli-id').value=t?genClientId(t):'';
}

const CLI_RESET_IDS=['cli-civ','cli-nom','cli-sexe','cli-piece-type','cli-piece-num','cli-prof','cli-email','cli-tel','cli-wa','cli-adresse','cli-pays','cli-ville',
  'cli-ent-raison','cli-ent-forme','cli-ent-acteur','cli-ent-immat','cli-ent-secteur','cli-ent-desc','cli-ent-site','cli-ent-adresse','cli-ent-pays','cli-ent-ville','cli-ent-email','cli-ent-tel',
  'cli-ent-c-civ','cli-ent-c-nom','cli-ent-c-tel','cli-ent-c-wa','cli-ent-c-email','cli-ent-c-fonction',
  'cli-ins-raison','cli-ins-type','cli-ins-dept','cli-ins-agrement','cli-ins-secteur','cli-ins-desc','cli-ins-site','cli-ins-adresse','cli-ins-pays','cli-ins-ville','cli-ins-email','cli-ins-tel',
  'cli-ins-c-civ','cli-ins-c-nom','cli-ins-c-tel','cli-ins-c-wa','cli-ins-c-email','cli-ins-c-fonction',
  'cli-canal','cli-pays-origine','cli-langue','cli-cible','cli-zone'];

/* ---- UPLOAD PHOTO/LOGO (1 image, 2 Mo max, PNG/JPEG/WebP) ---- */
function addCliPhoto(inp){
  const f=inp.files[0];if(!f)return;
  const allowed=['image/png','image/jpeg','image/jpg','image/webp'];
  if(!allowed.includes(f.type)){toast('Format non autorisé (PNG, JPEG, WebP uniquement)',true);inp.value='';return;}
  if(f.size>2*1024*1024){toast('Image trop volumineuse (2 Mo max)',true);inp.value='';return;}
  const r=new FileReader();
  r.onload=e=>{
    cliPhotoData=e.target.result;
    document.getElementById('cli-photo-prev').innerHTML=`<div class="thumb"><img src="${cliPhotoData}" alt="Aperçu"><button onclick="cliPhotoData='';document.getElementById('cli-photo-prev').innerHTML=''" aria-label="Supprimer">✕</button></div>`;
  };
  r.readAsDataURL(f);inp.value='';
}

/* ---- OUVERTURE MODALE ---- */
function openClientModal(id=null){
  editCli=id;cliPhotoData='';
  document.getElementById('cli-photo-prev').innerHTML='';
  document.getElementById('cli-sec-system').style.display=id?'block':'none';
  const typeSel=document.getElementById('cli-type');
  if(id){
    const c=clients.find(x=>x.id===id);
    document.getElementById('cm-title').textContent='Modifier le client';
    typeSel.value=c.type;typeSel.disabled=true; // le type détermine le préfixe de l'ID : verrouillé après création
    cliTypeChange();
    document.getElementById('cli-id').value=c.id;
    document.getElementById('cli-devise').value=c.devise||'XOF';
    if(c.photo){
      cliPhotoData=c.photo;
      document.getElementById('cli-photo-prev').innerHTML=`<div class="thumb"><img src="${c.photo}" alt="Aperçu"><button onclick="cliPhotoData='';document.getElementById('cli-photo-prev').innerHTML=''" aria-label="Supprimer">✕</button></div>`;
    }
    if(c.type==='particulier'){
      document.getElementById('cli-civ').value=c.civilite||'';
      document.getElementById('cli-nom').value=c.nomPrenom||'';
      document.getElementById('cli-sexe').value=c.sexe||'';
      document.getElementById('cli-piece-type').value=c.pieceType||'';
      document.getElementById('cli-piece-num').value=c.pieceNum||'';
      document.getElementById('cli-prof').value=c.profession||'';
      document.getElementById('cli-email').value=c.email||'';
      document.getElementById('cli-tel').value=c.tel||'';
      document.getElementById('cli-wa').value=c.whatsapp||'';
      document.getElementById('cli-adresse').value=c.adresse||'';
      document.getElementById('cli-pays').value=c.pays||'';
      cliVillesRefresh('cli-pays','cli-ville','cli-ville-dl');
      document.getElementById('cli-ville').value=c.ville||'';
    }else if(c.type==='entreprise'){
      document.getElementById('cli-ent-raison').value=c.raisonSociale||'';
      document.getElementById('cli-ent-forme').value=c.formeJuridique||'';
      document.getElementById('cli-ent-acteur').value=c.typeActeur||'';
      document.getElementById('cli-ent-immat').value=c.numImmat||'';
      document.getElementById('cli-ent-secteur').value=c.secteur||'';
      document.getElementById('cli-ent-desc').value=c.descActivites||'';
      document.getElementById('cli-ent-site').value=c.site||'';
      document.getElementById('cli-ent-adresse').value=c.adresseSiege||'';
      document.getElementById('cli-ent-pays').value=c.paysActivite||'';
      cliVillesRefresh('cli-ent-pays','cli-ent-ville','cli-ent-ville-dl');
      document.getElementById('cli-ent-ville').value=c.villeActivite||'';
      document.getElementById('cli-ent-email').value=c.emailPro||'';
      document.getElementById('cli-ent-tel').value=c.telPro||'';
      document.getElementById('cli-ent-c-civ').value=c.contactCivilite||'';
      document.getElementById('cli-ent-c-nom').value=c.contactNom||'';
      document.getElementById('cli-ent-c-tel').value=c.contactTelPerso||'';
      document.getElementById('cli-ent-c-wa').value=c.contactWhatsapp||'';
      document.getElementById('cli-ent-c-email').value=c.contactEmailPerso||'';
      document.getElementById('cli-ent-c-fonction').value=c.contactFonction||'';
    }else if(c.type==='institution'){
      document.getElementById('cli-ins-raison').value=c.raisonSociale||'';
      document.getElementById('cli-ins-type').value=c.typeInstitution||'';
      document.getElementById('cli-ins-dept').value=c.departement||'';
      document.getElementById('cli-ins-agrement').value=c.numAgrement||'';
      document.getElementById('cli-ins-secteur').value=c.secteur||'';
      document.getElementById('cli-ins-desc').value=c.descActivites||'';
      document.getElementById('cli-ins-site').value=c.site||'';
      document.getElementById('cli-ins-adresse').value=c.adresseSiege||'';
      document.getElementById('cli-ins-pays').value=c.paysActivite||'';
      cliVillesRefresh('cli-ins-pays','cli-ins-ville','cli-ins-ville-dl');
      document.getElementById('cli-ins-ville').value=c.villeActivite||'';
      document.getElementById('cli-ins-email').value=c.emailPro||'';
      document.getElementById('cli-ins-tel').value=c.telPro||'';
      document.getElementById('cli-ins-c-civ').value=c.contactCivilite||'';
      document.getElementById('cli-ins-c-nom').value=c.contactNom||'';
      document.getElementById('cli-ins-c-tel').value=c.contactTelPerso||'';
      document.getElementById('cli-ins-c-wa').value=c.contactWhatsapp||'';
      document.getElementById('cli-ins-c-email').value=c.contactEmailPerso||'';
      document.getElementById('cli-ins-c-fonction').value=c.contactFonction||'';
    }
    document.getElementById('cli-serv-import').checked=(c.services||[]).includes('Import/Sourcing');
    document.getElementById('cli-serv-mkt').checked=(c.services||[]).includes('Marketing');
    document.getElementById('cli-serv-dist').checked=(c.services||[]).includes('Distribution');
    document.getElementById('cli-canal').value=c.canalPref||'';
    document.getElementById('cli-pays-origine').value=c.paysOrigineProduit||'';
    document.getElementById('cli-langue').value=c.langue||'';
    document.getElementById('cli-cible').value=c.clienteleCible||'';
    document.getElementById('cli-zone').value=c.zoneGeo||'';
    cliRenderStars(c.note||3);
    document.getElementById('cli-eval-com').textContent=c.commentaireEval||'Aucune évaluation pour le moment.';
    document.getElementById('cli-log-created').textContent=c.dateCreation?new Date(c.dateCreation).toLocaleString('fr-FR'):'—';
    document.getElementById('cli-log-modif').textContent=c.dateModif?new Date(c.dateModif).toLocaleString('fr-FR'):'—';
  }else{
    document.getElementById('cm-title').textContent='Nouveau client';
    typeSel.disabled=false;typeSel.value='';
    cliTypeChange();
    document.getElementById('cli-id').value='';
    document.getElementById('cli-devise').value='XOF';
    CLI_RESET_IDS.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    ['cli-serv-import','cli-serv-mkt','cli-serv-dist'].forEach(id=>document.getElementById(id).checked=false);
  }
  openMod('client-modal');
}

/* ---- ENREGISTREMENT ---- */
function saveClient(){
  const type=document.getElementById('cli-type').value;
  if(!type){toast('Le type de client est requis',true);return;}
  const base={
    type,
    devise:document.getElementById('cli-devise').value,
    photo:cliPhotoData,
    services:[
      document.getElementById('cli-serv-import').checked?'Import/Sourcing':null,
      document.getElementById('cli-serv-mkt').checked?'Marketing':null,
      document.getElementById('cli-serv-dist').checked?'Distribution':null
    ].filter(Boolean),
    canalPref:document.getElementById('cli-canal').value,
    paysOrigineProduit:document.getElementById('cli-pays-origine').value,
    langue:document.getElementById('cli-langue').value,
    clienteleCible:document.getElementById('cli-cible').value,
    zoneGeo:document.getElementById('cli-zone').value
  };
  if(type==='particulier'){
    const nom=document.getElementById('cli-nom').value.trim();
    if(!nom){toast('Nom et prénoms requis',true);return;}
    Object.assign(base,{
      civilite:document.getElementById('cli-civ').value,nomPrenom:nom,
      sexe:document.getElementById('cli-sexe').value,pieceType:document.getElementById('cli-piece-type').value,
      pieceNum:document.getElementById('cli-piece-num').value,profession:document.getElementById('cli-prof').value,
      email:document.getElementById('cli-email').value,tel:document.getElementById('cli-tel').value,
      whatsapp:document.getElementById('cli-wa').value,adresse:document.getElementById('cli-adresse').value,
      pays:document.getElementById('cli-pays').value,ville:document.getElementById('cli-ville').value
    });
  }else if(type==='entreprise'){
    const raison=document.getElementById('cli-ent-raison').value.trim();
    if(!raison){toast('Raison sociale requise',true);return;}
    Object.assign(base,{
      raisonSociale:raison,formeJuridique:document.getElementById('cli-ent-forme').value,
      typeActeur:document.getElementById('cli-ent-acteur').value,numImmat:document.getElementById('cli-ent-immat').value,
      secteur:document.getElementById('cli-ent-secteur').value,descActivites:document.getElementById('cli-ent-desc').value,
      site:document.getElementById('cli-ent-site').value,adresseSiege:document.getElementById('cli-ent-adresse').value,
      paysActivite:document.getElementById('cli-ent-pays').value,villeActivite:document.getElementById('cli-ent-ville').value,
      emailPro:document.getElementById('cli-ent-email').value,telPro:document.getElementById('cli-ent-tel').value,
      contactCivilite:document.getElementById('cli-ent-c-civ').value,contactNom:document.getElementById('cli-ent-c-nom').value,
      contactTelPerso:document.getElementById('cli-ent-c-tel').value,contactWhatsapp:document.getElementById('cli-ent-c-wa').value,
      contactEmailPerso:document.getElementById('cli-ent-c-email').value,contactFonction:document.getElementById('cli-ent-c-fonction').value
    });
  }else if(type==='institution'){
    const raison=document.getElementById('cli-ins-raison').value.trim();
    if(!raison){toast('Raison sociale requise',true);return;}
    Object.assign(base,{
      raisonSociale:raison,typeInstitution:document.getElementById('cli-ins-type').value,
      departement:document.getElementById('cli-ins-dept').value,numAgrement:document.getElementById('cli-ins-agrement').value,
      secteur:document.getElementById('cli-ins-secteur').value,descActivites:document.getElementById('cli-ins-desc').value,
      site:document.getElementById('cli-ins-site').value,adresseSiege:document.getElementById('cli-ins-adresse').value,
      paysActivite:document.getElementById('cli-ins-pays').value,villeActivite:document.getElementById('cli-ins-ville').value,
      emailPro:document.getElementById('cli-ins-email').value,telPro:document.getElementById('cli-ins-tel').value,
      contactCivilite:document.getElementById('cli-ins-c-civ').value,contactNom:document.getElementById('cli-ins-c-nom').value,
      contactTelPerso:document.getElementById('cli-ins-c-tel').value,contactWhatsapp:document.getElementById('cli-ins-c-wa').value,
      contactEmailPerso:document.getElementById('cli-ins-c-email').value,contactFonction:document.getElementById('cli-ins-c-fonction').value
    });
  }
  const now=new Date().toISOString();
  if(editCli){
    const i=clients.findIndex(c=>c.id===editCli);
    clients[i]={...clients[i],...base,dateModif:now};
    toast('Client mis à jour ✓');
  }else{
    base.id=genClientId(type);
    base.note=3;base.commentaireEval='';
    base.dateCreation=now;base.dateModif=now;
    clients.push(base);
    toast('Client ajouté ✓');
    if(cliSaveHook){const fn=cliSaveHook;cliSaveHook=null;fn(base);}
  }
  saveClients();
  document.getElementById('cli-type').disabled=false;
  editCli=null;
  closeMod('client-modal');
  renderClients();
}

async function delClient(id){
  const c=clients.find(x=>x.id===id);if(!c)return;
  const ok=await askConfirm(`Supprimer le client "${cliDisplayName(c)}" ?`,{title:'Supprimer le client'});
  if(!ok)return;
  clients=clients.filter(x=>x.id!==id);
  saveClients();renderClients();toast('Client supprimé');
}

/* ---- AFFICHAGE (grille / liste) ---- */
function cliDisplayName(c){
  return c.type==='particulier'?(c.nomPrenom||'—'):(c.raisonSociale||'—');
}
function cliInitials(name){
  const parts=(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return '?';
  return (parts[0][0]+(parts[1]?parts[1][0]:'')).toUpperCase();
}
function cliAvatar(c){
  const name=cliDisplayName(c);
  if(c.photo)return `<img src="${c.photo}" class="four-logo" alt="${escH(name)}" loading="lazy" onerror="this.style.display='none'">`;
  return `<div class="ph-sm" style="width:56px;height:56px;border-radius:50%;background:var(--gris);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:var(--muted);flex-shrink:0">${escH(cliInitials(name))}</div>`;
}
function cliContact(c){
  if(c.type==='particulier')return{email:c.email,tel:c.tel,wa:c.whatsapp};
  return{email:c.emailPro||c.contactEmailPerso,tel:c.telPro||c.contactTelPerso,wa:c.contactWhatsapp};
}
function cliLoc(c){
  return c.type==='particulier'?{pays:c.pays,ville:c.ville}:{pays:c.paysActivite,ville:c.villeActivite};
}
function cliStars(note){
  const ev=Math.round(note||3);
  return Array.from({length:5},(_,i)=>ICO('star','star'+(i<ev?' on':''))).join('');
}
function cliRenderStars(note){
  const el=document.getElementById('cli-stars');if(el)el.innerHTML=cliStars(note);
}

function renderClients(){
  const searchEl=document.getElementById('cli-search');
  const q=(searchEl?searchEl.value:'').toLowerCase();
  const ft=document.getElementById('cli-filter-type').value;
  const list=clients.filter(c=>{
    if(ft&&c.type!==ft)return false;
    if(!q)return true;
    const name=cliDisplayName(c).toLowerCase();
    const contact=cliContact(c);
    return name.includes(q)||(c.id||'').toLowerCase().includes(q)||(contact.email||'').toLowerCase().includes(q)||(contact.tel||'').includes(q);
  });
  const cont=document.getElementById('cli-cont');
  if(!cont)return;
  if(!list.length){cont.innerHTML='<div class="empty"><div class="empty-ico">'+ICO('users')+'</div><h3>Aucun client</h3></div>';return;}
  if(clientView==='list'){
    cont.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>Client</th><th>Type</th><th>Contact</th><th>Pays</th><th>Note</th><th></th></tr></thead><tbody>${list.map(c=>{
      const name=cliDisplayName(c),contact=cliContact(c),loc=cliLoc(c);
      return`<tr>
        <td style="display:flex;align-items:center;gap:8px">${cliAvatar(c)}<div><div style="font-weight:600">${escH(name)}</div><div style="font-size:11px;color:var(--muted)">${escH(c.id)}</div></div></td>
        <td>${CLI_TYPE_LABEL[c.type]||''}</td>
        <td>${contact.email?`<div>${escH(contact.email)}</div>`:''}${contact.tel?`<div>${escH(contact.tel)}</div>`:''}</td>
        <td>${escH(loc.pays||'')}</td>
        <td>${cliStars(c.note)}</td>
        <td><div style="display:flex;gap:6px"><button class="btn btn-sec btn-sm" onclick="openClientModal('${c.id}')" aria-label="Modifier ${escH(name)}">${ICO('pencil')}</button><button class="btn btn-danger btn-sm" onclick="delClient('${c.id}')" aria-label="Supprimer ${escH(name)}">${ICO('trash')}</button></div></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
    return;
  }
  cont.innerHTML=`<div class="grid">${list.map(c=>{
    const name=cliDisplayName(c),contact=cliContact(c),loc=cliLoc(c);
    return`<div class="card">
      <div class="card-body">
        <div class="four-card-hdr">
          ${cliAvatar(c)}
          <div class="four-info">
            <div class="card-title" style="font-size:14px">${escH(name)}</div>
            <div style="font-size:11px;color:var(--muted)">${escH(c.id)} · ${CLI_TYPE_LABEL[c.type]||''}</div>
            <div style="margin-top:3px">${cliStars(c.note)}</div>
          </div>
        </div>
        ${contact.email?`<div class="info-row">${ICO('mail')} <a href="mailto:${escH(contact.email)}">${escH(contact.email)}</a></div>`:''}
        ${contact.tel?`<div class="info-row">${ICO('phone')} <a href="tel:${escH(contact.tel)}">${escH(contact.tel)}</a></div>`:''}
        ${contact.wa?`<div class="info-row">${ICO('msg')} WhatsApp : ${escH(contact.wa)}</div>`:''}
        ${loc.pays?`<div class="info-row">${ICO('globe')} ${escH(loc.pays)}${loc.ville?' · '+escH(loc.ville):''}</div>`:''}
        <div class="card-acts">
          <button class="btn btn-sec btn-sm" onclick="openClientModal('${c.id}')">${ICO('pencil')} Modifier</button>
          <button class="btn btn-danger btn-sm" onclick="delClient('${c.id}')" title="Supprimer" aria-label="Supprimer ${escH(name)}">${ICO('trash')}</button>
        </div>
      </div></div>`;
  }).join('')}</div>`;
}
const renderClientsDeb=debounce(renderClients);

function setClientView(v){
  clientView=v;
  document.getElementById('cvg').classList.toggle('active',v==='grid');
  document.getElementById('cvl').classList.toggle('active',v==='list');
  renderClients();
}
/* ===== FIN MODULE CLIENTS ===== */
