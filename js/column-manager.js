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
// API pour les modules externes (raccourcis clavier) qui devaient auparavant lire/fermer
// la classe .col-picker-drop.open — l'état d'ouverture vit maintenant dans Alpine (x-data.open)
function cmAnyOpen(){
  return !!window.Alpine&&[...document.querySelectorAll('[data-cm-view] [x-data]')].some(el=>window.Alpine.$data(el).open);
}
function cmCloseAll(){
  if(!window.Alpine)return;
  document.querySelectorAll('[data-cm-view] [x-data]').forEach(el=>{window.Alpine.$data(el).open=false;});
}
function cmToggle(view,k,on){
  const st=colStore[view];
  st.touched=true;
  st.visible=CM_DEFS[view].filter(d=>d.k===k?on:st.visible.includes(d.k)).map(d=>d.k);
  cmSave();
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
// Regroupement des définitions de colonnes par en-tête de groupe (g), dans l'ordre de CM_DEFS
function cmGroupedDefs(view){
  const groups={},order=[];
  CM_DEFS[view].forEach(d=>{const g=d.g||'';if(!(g in groups)){groups[g]=[];order.push(g);}groups[g].push(d);});
  return order.map(g=>({g,items:groups[g]}));
}
// Miroir visuel {clé:bool} de colStore[view].visible, pour l'état réactif Alpine des cases à cocher
function cmCheckedState(view){
  const out={};
  CM_DEFS[view].forEach(d=>{out[d.k]=colStore[view].visible.includes(d.k);});
  return out;
}
/* État visuel Alpine du composant — ouverture/fermeture du dropdown et cochage des cases.
   Toute la logique métier (persistance, calcul des colonnes visibles) reste dans les fonctions
   vanilla ci-dessus (cmToggle/cmShowAll/cmReset) : les méthodes Alpine ne font que les appeler.
   Enregistré directement (pas via l'événement 'alpine:init') : column-manager.js est un script
   `defer` chargé juste après le vendor Alpine et cmMount() construit le composant avant que
   DOMContentLoaded — donc Alpine.start() et l'événement 'alpine:init' — n'ait eu lieu. */
Alpine.data('cmColumns',(view,inline)=>({
    open:false,
    inline,
    groups:cmGroupedDefs(view),
    fixed:CM_FIXED[view]||[],
    checked:cmCheckedState(view),
    get total(){return CM_DEFS[view].length;},
    get count(){return Object.values(this.checked).filter(Boolean).length;},
    toggleCol(k,on){
      this.checked[k]=on;
      cmToggle(view,k,on);
    },
    showAll(){cmShowAll(view);},
    reset(){cmReset(view);},
}));
/* Composant ColumnManager : cmMount(vue, idHôte, {inline}) — bouton+dropdown, ou liste inline (modal PDF) */
function cmMount(view,hostId,opts={}){
  const host=document.getElementById(hostId);
  if(!host)return;
  host.dataset.cmView=view;
  if(opts.inline)host.dataset.cmInline='1';
  cmRefresh(view);
}
const CM_ITEM_CLS='flex items-center gap-2 text-xs cursor-pointer px-2 py-[6px] rounded-lg transition-colors duration-150 hover:bg-[var(--gris)] [@media(pointer:coarse)]:py-[11px]';
const CM_CHECKBOX_CLS='w-[14px] h-[14px] accent-[var(--bleu-t)] cursor-pointer [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5';
const CM_TITLE_CLS='text-[10px] font-bold text-[var(--muted)] uppercase tracking-[.6px] mb-[10px]';
function cmRefresh(view){
  document.querySelectorAll(`[data-cm-view="${view}"]`).forEach(host=>{
    const inline=host.dataset.cmInline==='1';
    const prevRoot=host.querySelector('[x-data]');
    const wasOpen=!!(prevRoot&&window.Alpine&&window.Alpine.$data(prevRoot).open);
    const focusLbl=document.activeElement&&host.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;

    const groupsHtml=cmGroupedDefs(view).map(({g,items})=>`
      ${g?`<div class="${CM_TITLE_CLS} mt-[10px] first:mt-0">${g}</div>`:''}
      <div class="grid grid-cols-2 gap-1" role="group" aria-label="${g||'Colonnes optionnelles'}">
        ${items.map(d=>`
          <label class="${CM_ITEM_CLS}">
            <input type="checkbox" class="${CM_CHECKBOX_CLS}" :checked="checked['${d.k}']" @change="toggleCol('${d.k}',$event.target.checked)" aria-label="Colonne ${d.lbl}">
            <span>${d.lbl}</span>
          </label>`).join('')}
      </div>`).join('');
    const fixedHtml=(CM_FIXED[view]||[]).map(l=>`
      <label class="${CM_ITEM_CLS} opacity-45 pointer-events-none">
        <input type="checkbox" class="${CM_CHECKBOX_CLS}" checked disabled aria-label="Colonne ${l}, toujours affichée">
        <span>${l}</span>
      </label>`).join('');
    const body=`
      ${fixedHtml?`<div class="${CM_TITLE_CLS}">Toujours affichées</div><div class="grid grid-cols-2 gap-1">${fixedHtml}</div><div class="${CM_TITLE_CLS} mt-3">Colonnes optionnelles</div>`:''}
      ${groupsHtml}
      <div class="flex gap-[6px] mt-3 pt-[10px] border-t border-[var(--border)]">
        <button type="button" class="btn btn-sec btn-sm flex-1" @click="showAll()" aria-label="Afficher toutes les colonnes">Tout afficher</button>
        <button type="button" class="btn btn-sec btn-sm flex-1" @click="reset()" aria-label="Rétablir les colonnes par défaut">Réinitialiser</button>
      </div>`;

    if(inline){
      host.innerHTML=`<div x-data="cmColumns('${view}',true)" class="border border-[var(--border)] rounded-xl p-[14px] bg-[var(--gris)]" aria-label="${CM_TITLES[view]}">${body}</div>`;
    }else{
      host.innerHTML=`
        <div x-data="cmColumns('${view}',false)" class="relative" @click.outside="open=false">
          <button type="button" class="inline-flex items-center gap-[7px] px-[14px] py-[10px] border border-[var(--border2)] rounded-[10px] bg-[var(--surface)] cursor-pointer font-['Poppins',sans-serif] text-[13px] font-medium whitespace-nowrap shadow-[var(--sh-xs)] transition-all duration-[180ms] text-[var(--text)] hover:bg-[var(--gris)] hover:border-[var(--border-hover)] [@media(pointer:coarse)]:py-[13px]"
            @click="open=!open" :aria-expanded="open" aria-haspopup="true" aria-controls="cmd-${view}" title="Gérer les colonnes visibles">
            ${ICO('cols')} ${CM_TITLES[view]}
            <span class="ml-1 bg-[var(--gris)] border border-[var(--border)] rounded-lg px-[7px] py-[1px] text-[10px] font-semibold text-[var(--muted)] [font-variant-numeric:tabular-nums]" :aria-label="count+' colonnes visibles sur '+total"><span x-text="count"></span>/<span x-text="total"></span></span>
          </button>
          <div id="cmd-${view}" x-show="open"
            x-transition:enter="transition ease-out duration-150" x-transition:enter-start="opacity-0 -translate-y-0.5 scale-[.98]" x-transition:enter-end="opacity-100 translate-y-0 scale-100"
            :class="open?'max-[640px]:shadow-[0_0_0_100vmax_rgba(15,17,34,.45),var(--sh-lg)]':''"
            class="absolute top-[calc(100%+8px)] right-0 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-[var(--sh-lg)] z-[150] p-4 min-w-[270px] max-[640px]:fixed max-[640px]:left-3 max-[640px]:right-3 max-[640px]:top-auto max-[640px]:bottom-3 max-[640px]:min-w-0 max-[640px]:max-w-none max-[640px]:max-h-[min(70vh,520px)] max-[640px]:overflow-y-auto"
            role="group" aria-label="Gestion des colonnes — ${CM_TITLES[view]}">
            ${body}
          </div>
        </div>`;
    }
    if(window.Alpine){
      window.Alpine.initTree(host);
      if(wasOpen){const root=host.querySelector('[x-data]');if(root)window.Alpine.$data(root).open=true;}
    }
    if(focusLbl){const nf=[...host.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===focusLbl);if(nf)nf.focus();}
  });
}
/* ===== FIN GESTION DES COLONNES ===== */
