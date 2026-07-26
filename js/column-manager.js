/* ===== GESTION UNIVERSELLE DES COLONNES (store + composant réutilisable) =====
   Préférences persistées dans gf_cols : {vue:{visible:[clé…], touched:bool, known:[clé…]}}
   - visible : colonnes affichées, dans l'ordre des définitions
   - touched : l'utilisateur a personnalisé → désactive l'auto-masquage mobile
   - known   : clés existant lors de la sauvegarde → une colonne ajoutée au code après coup
               reprend sa valeur par défaut ; une colonne supprimée du code est ignorée.
   @typedef {{k:string, lbl:string, def:boolean, mob?:boolean, g?:string}} ColumnDef
   (def : visible par défaut · mob:false : auto-masquée sur mobile · g : groupe du dropdown) */
const CMK='gf_cols';
const CM_DEFS={
  catalogue:[
    {k:'photos', g:'Produit',    lbl:'Photo',                           def:true},
    {k:'ref',    g:'Produit',    lbl:'Référence',                       def:true},
    {k:'nom',    g:'Produit',    lbl:'Désignation',                     def:true},
    {k:'cat',    g:'Produit',    lbl:'Catégorie',                       def:true, mob:false},
    {k:'four',   g:'Produit',    lbl:'Fournisseur',                     def:true},
    {k:'moq',    g:'Produit',    lbl:'MOQ',                             def:false,mob:false},
    {k:'specs',  g:'Produit',    lbl:'Spécificités',                    def:false,mob:false},
    {k:'desc',   g:'Produit',    lbl:'Description',                     def:false,mob:false},
    {k:'cbm',    g:'Logistique', lbl:'CBM',                             def:false,mob:false},
    {k:'poids',  g:'Logistique', lbl:'Poids',                           def:false,mob:false},
    {k:'delai',  g:'Logistique', lbl:'Délai livraison',                 def:false,mob:false},
    {k:'achat',  g:'Sourcing',   lbl:'Achat EXW',                       def:false,mob:false},
    {k:'prach',  g:'Sourcing',   lbl:'Fret local',                      def:false,mob:false},
    {k:'revient',g:'Vente',      lbl:'Coût de Revient HT',              def:true, mob:false},
    {k:'fret',   g:'Vente',      lbl:'Frais logistiques (Transitaire)', def:true, mob:false},
    {k:'marge',  g:'Vente',      lbl:'Marge',                           def:true},
    {k:'vente',  g:'Vente',      lbl:'Prix de Vente HT',                def:true},
    {k:'ttc',    g:'Vente',      lbl:'Prix de Vente TTC',               def:true},
    {k:'marche', g:'Vente',      lbl:'Prix marché',                     def:false,mob:false},
  ],
  simulation:[
    {k:'produit',  g:'Produit', lbl:'Produit',                          def:true},
    {k:'ref',      g:'Produit', lbl:'Référence',                        def:false,mob:false},
    {k:'four',     g:'Produit', lbl:'Fournisseur',                      def:true, mob:false},
    {k:'moq',      g:'Produit', lbl:'MOQ',                              def:false,mob:false},
    {k:'specs',    g:'Produit', lbl:'Spécificités',                     def:false,mob:false},
    {k:'desc',     g:'Produit', lbl:'Description',                      def:false,mob:false},
    {k:'qte',      g:'Calcul',  lbl:'Quantité',                         def:true},
    {k:'transport',g:'Calcul',  lbl:'Transport / CBM / Poids',          def:true, mob:false},
    {k:'achat',    g:'Calcul',  lbl:'Coût d\'achat + frais (étape 1)',  def:true, mob:false},
    {k:'revient_u',g:'Calcul',  lbl:'Coût de revient unitaire',         def:true},
    {k:'taux',     g:'Calcul',  lbl:'Taux de change',                   def:true, mob:false},
    {k:'marge',    g:'Résultat',lbl:'Marge unitaire (%)',               def:true},
    {k:'marge_tot',g:'Résultat',lbl:'Marge totale',                     def:true, mob:false},
    {k:'vente_ht', g:'Résultat',lbl:'Prix de Vente HT',                 def:true},
    {k:'fret',     g:'Résultat',lbl:'Frais logistiques (Transitaire)',  def:true},
    {k:'vente_ttc',g:'Résultat',lbl:'Prix de Vente TTC unitaire',       def:true},
  ],
  devis:[
    // SECTION PRODUIT — informations de base (indépendantes de toute devise)
    {k:'ref',         g:'Produit',    lbl:'Réf',                def:true},
    {k:'photos',      g:'Produit',    lbl:'Photo',              def:true},
    {k:'nom',         g:'Produit',    lbl:'Désignation',        def:true},
    {k:'commentaire', g:'Produit',    lbl:'Commentaire',        def:true},
    {k:'cat',         g:'Produit',    lbl:'Catégorie',          def:false,mob:false},
    {k:'specs',       g:'Produit',    lbl:'Spécificités',       def:false,mob:false},
    {k:'fournisseur', g:'Produit',    lbl:'Fournisseur',        def:false,mob:false},
    {k:'qte',         g:'Produit',    lbl:'Qté',                def:true}, // avant les colonnes de totaux (Coût Total, Prix total HT, Frais logistiques, Prix TTC)
    {k:'poids',       g:'Produit',    lbl:'Poids (kg)',         def:false,mob:false},
    {k:'cbm',         g:'Produit',    lbl:'CBM (m³)',           def:false,mob:false},
    // SECTION SOURCING — devise d'achat du produit
    {k:'prix_exw',    g:'Sourcing',   lbl:'Prix EXW',           def:false,mob:false},
    {k:'cout_total',  g:'Sourcing',   lbl:'Coût Total',         def:false,mob:false},
    // SECTION VENTE — devise du devis (taux de change : paramètre global du devis, non affiché par produit)
    {k:'cr_unitaire', g:'Vente',      lbl:'Coût unit. HT',      def:false,mob:false},
    {k:'taux_marge',  g:'Vente',      lbl:'Taux de Marge',      def:false,mob:false},
    {k:'marge',       g:'Vente',      lbl:'Marge',              def:false,mob:false},
    {k:'prix_ht',     g:'Vente',      lbl:'Prix HT',            def:true},
    {k:'total_ht',    g:'Vente',      lbl:'Prix total HT',      def:true},
    // SECTION LOGISTIQUE — devise du devis
    {k:'frais_log',   g:'Logistique', lbl:'Frais logistiques Estimé', def:false,mob:false},
    {k:'prix_ttc',    g:'Logistique', lbl:'Prix TTC Estimé',          def:false,mob:false},
  ],
};
// Lignes toujours présentes, listées à titre indicatif dans le gestionnaire
// (catalogue et devis n'en ont plus : toutes leurs colonnes sont librement cochables,
//  et l'export PDF partage exactement la même sélection que l'aperçu)
const CM_FIXED={
  simulation:['Prix de Vente total TTC','TVA interne (si assujetti)'],
};
const CM_TITLES={catalogue:'Colonnes',simulation:'Lignes',devis:'Colonnes devis'};
let colStore={};
const isMob=()=>window.matchMedia('(max-width:767px)').matches;

async function cmLoad(){
  let saved=await IDB_GET(CMK,null),migrated=false;
  if(!saved){saved=await cmMigrateLegacy();migrated=!!saved;}
  colStore={};
  Object.keys(CM_DEFS).forEach(v=>{
    const defs=CM_DEFS[v],sv=saved&&saved[v];
    let visible=sv&&Array.isArray(sv.visible)?sv.visible.filter(k=>defs.some(d=>d.k===k)):null;
    if(visible&&Array.isArray(sv.known))
      defs.forEach(d=>{if(d.def&&!sv.known.includes(d.k)&&!visible.includes(d.k))visible.push(d.k);});
    colStore[v]={visible:visible??defs.filter(d=>d.def).map(d=>d.k),touched:!!(sv&&sv.touched)};
  });
  if(migrated)cmSave();
}
async function cmMigrateLegacy(){
  // Reprise des anciens réglages gf_c (catalogue, resté en localStorage — négligeable) et gf_dp.show (devis)
  const out={};
  const c=LS_GET('gf_c',null);
  if(c)out.catalogue={visible:Object.keys(c).filter(k=>c[k]),touched:true,known:Object.keys(c)};
  const dp=await IDB_GET(DPK,null);
  if(dp&&dp.show)out.devis={visible:Object.keys(dp.show).filter(k=>dp.show[k]),touched:true,known:Object.keys(dp.show)};
  return Object.keys(out).length?out:null;
}
function cmSerialize(){
  const o={};
  Object.keys(colStore).forEach(v=>{o[v]={visible:colStore[v].visible,touched:colStore[v].touched,known:CM_DEFS[v].map(d=>d.k)};});
  return o;
}
function cmSave(){
  IDB_SET(CMK,cmSerialize());
}
// Ensemble effectif {clé:bool} — auto-masque les colonnes non essentielles sur mobile
// tant que l'utilisateur n'a pas personnalisé la vue (touched)
function cmVisible(view){
  const st=colStore[view],defs=CM_DEFS[view];
  let vis=st.visible;
  if(isMob()&&!st.touched)vis=vis.filter(k=>{const d=defs.find(x=>x.k===k);return d&&d.mob!==false;});
  const set={};defs.forEach(d=>{set[d.k]=vis.includes(d.k);});
  return set;
}
const CM_RENDER={catalogue:()=>renderCat(),simulation:()=>simCalc(),devis:()=>renderDevisCart()};
function cmAnnounce(msg){const el=document.getElementById('cm-live');if(el)el.textContent=msg;}
function cmToggle(view,k,on){
  const st=colStore[view];
  st.touched=true;
  st.visible=CM_DEFS[view].filter(d=>d.k===k?on:st.visible.includes(d.k)).map(d=>d.k);
  cmSave();cmRefreshCount(view);
  const d=CM_DEFS[view].find(x=>x.k===k);
  cmAnnounce(`Colonne ${d?d.lbl:k} ${on?'affichée':'masquée'} — ${st.visible.length}/${CM_DEFS[view].length} colonnes visibles`);
  CM_RENDER[view]();
}
function cmShowAll(view){
  const st=colStore[view];st.touched=true;st.visible=CM_DEFS[view].map(d=>d.k);
  cmSave();cmRefresh(view);cmAnnounce(`Toutes les colonnes affichées (${st.visible.length})`);CM_RENDER[view]();
}
function cmReset(view){
  const st=colStore[view];st.visible=CM_DEFS[view].filter(d=>d.def).map(d=>d.k);st.touched=false;
  cmSave();cmRefresh(view);cmAnnounce(`Colonnes réinitialisées — ${st.visible.length}/${CM_DEFS[view].length} visibles`);CM_RENDER[view]();
}
/* Composant ColumnManager : cmMount(vue, idHôte, {inline}) — bouton+dropdown, ou liste inline (modal PDF) */
function cmMount(view,hostId,opts={}){
  const host=document.getElementById(hostId);
  if(!host)return;
  host.dataset.cmView=view;
  if(opts.inline)host.dataset.cmInline='1';
  cmRefresh(view);
}
function cmRefresh(view){
  document.querySelectorAll(`[data-cm-view="${view}"]`).forEach(host=>{
    const inline=host.dataset.cmInline==='1';
    const st=colStore[view],defs=CM_DEFS[view];
    const wasOpen=!!host.querySelector('.col-picker-drop.open');
    const focusLbl=document.activeElement&&host.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
    const groups={},order=[];
    defs.forEach(d=>{const g=d.g||'';if(!(g in groups)){groups[g]=[];order.push(g);}groups[g].push(d);});
    const list=order.map(g=>`
      ${g?`<div class="cp-title" style="margin-top:10px">${g}</div>`:''}
      <div class="cp-grid" role="group" aria-label="${g||'Colonnes optionnelles'}">
        ${groups[g].map(d=>`<label class="cp-item"><input type="checkbox" ${st.visible.includes(d.k)?'checked':''} aria-label="Colonne ${d.lbl}" onchange="cmToggle('${view}','${d.k}',this.checked)">${d.lbl}</label>`).join('')}
      </div>`).join('');
    const fixed=(CM_FIXED[view]||[]).map(l=>`<label class="cp-item cp-fixed"><input type="checkbox" checked disabled aria-label="Colonne ${l}, toujours affichée">${l}</label>`).join('');
    const body=`
      ${fixed?`<div class="cp-title">Toujours affichées</div><div class="cp-grid">${fixed}</div><div class="cp-title" style="margin-top:12px">Colonnes optionnelles</div>`:''}
      ${list}
      <div class="cm-acts">
        <button class="btn btn-sec btn-sm" onclick="cmShowAll('${view}')" aria-label="Afficher toutes les colonnes">Tout afficher</button>
        <button class="btn btn-sec btn-sm" onclick="cmReset('${view}')" aria-label="Rétablir les colonnes par défaut">Réinitialiser</button>
      </div>`;
    if(inline){host.innerHTML=`<div class="cm-inline" aria-label="${CM_TITLES[view]}">${body}</div>`;}
    else{host.innerHTML=`
      <button class="col-picker-btn" aria-expanded="${wasOpen}" aria-haspopup="true" aria-controls="cmd-${view}" onclick="cmOpen(this)" title="Gérer les colonnes visibles">${ICO('cols')} ${CM_TITLES[view]} <span class="cm-count" aria-label="${st.visible.length} colonnes visibles sur ${defs.length}">${st.visible.length}/${defs.length}</span></button>
      <div class="col-picker-drop${wasOpen?' open':''}" id="cmd-${view}" role="group" aria-label="Gestion des colonnes — ${CM_TITLES[view]}">${body}</div>`;}
    if(focusLbl){const nf=[...host.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===focusLbl);if(nf)nf.focus();}
  });
}
function cmRefreshCount(view){
  document.querySelectorAll(`[data-cm-view="${view}"] .cm-count`).forEach(el=>{
    el.textContent=`${colStore[view].visible.length}/${CM_DEFS[view].length}`;
  });
}
function cmOpen(btn){
  const host=btn.closest('[data-cm-view]');
  const d=host.querySelector('.col-picker-drop');
  const open=!d.classList.contains('open');
  d.classList.toggle('open',open);
  btn.setAttribute('aria-expanded',open);
  if(open){
    const close=e=>{
      if(host.contains(e.target))return;
      const dd=host.querySelector('.col-picker-drop'),bb=host.querySelector('.col-picker-btn');
      if(dd)dd.classList.remove('open');
      if(bb)bb.setAttribute('aria-expanded','false');
      document.removeEventListener('click',close);
    };
    setTimeout(()=>document.addEventListener('click',close),10);
  }
}
/* ===== FIN GESTION DES COLONNES ===== */
