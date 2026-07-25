const AK='gf_audit';
let auditHist=null; // cache mémoire, chargé une fois au démarrage (auditLoad)
async function auditLoad(){auditHist=await IDB_GET(AK,[]);}
function auditLog(type,data){
  if(!auditHist)auditHist=[];
  auditHist.unshift({ts:new Date().toISOString(),type,data});
  auditHist=auditHist.slice(0,100);
  IDB_SET(AK,auditHist);
}
// CSV avec BOM UTF-8 et « ; » pour ouverture directe dans Excel FR
function auditToCSV(h){
  const esc=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const lines=['date;type;details'];
  h.forEach(e=>lines.push([esc(e.ts),esc(e.type),esc(JSON.stringify(e.data))].join(';')));
  return '\uFEFF'+lines.join('\r\n');
}
async function exportAudit(){
  const h=auditHist||[];
  if(!h.length){toast('Aucun calcul dans l\'historique audit',true);return;}
  const sel=document.getElementById('audit-fmt');
  const fmt=(sel&&sel.value==='csv')?'csv':'json';
  const d=new Date(),pad=x=>String(x).padStart(2,'0');
  const fname=`goflow_audit_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.${fmt}`;
  const content=fmt==='csv'?auditToCSV(h):JSON.stringify(h,null,2);

  // 1) Écriture directe dans le dossier de sauvegarde préconfiguré (même logique que exportBackup)
  const dirName=await bkpTrySaveToDir(fname,content);
  if(dirName){toast(`✓ Historique exporté dans ${dirName} — ${fname}`);return;}

  // 2) Fallback : téléchargement classique du navigateur
  const blob=new Blob([content],{type:fmt==='csv'?'text/csv;charset=utf-8':'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=fname;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  toast(`Historique audit exporté ✓ — ${fname}`);
}

function N(n){if(isNaN(n)||n==null)return'—';return Math.round(n).toLocaleString('fr-FR')+' XOF';}
function Nd(n,d=2){return isNaN(n)?'—':n.toLocaleString('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:d});}


/* ---- CATALOGUE ---- */
function renderCat(){
  cols=cmVisible('catalogue');
  const q=(document.getElementById('cat-search').value||'').toLowerCase();
  const fc=document.getElementById('f-cat').value;
  const ff=document.getElementById('f-four');
  const curff=ff.value;
  ff.innerHTML='<option value="">Tous fournisseurs</option>';
  fours.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.nom;if(f.id===curff)o.selected=true;ff.appendChild(o);});
  const fv=ff.value;
  let list=prods.filter(p=>(!q||(p.nom.toLowerCase().includes(q)||p.ref.toLowerCase().includes(q)||(p.cat||'').toLowerCase().includes(q)))&&(!fc||p.cat===fc)&&(!fv||p.fid===fv));
  const totalV=prods.reduce((s,p)=>s+calc(p).coutRevientUX,0);
  document.getElementById('cat-stats').innerHTML=`
    <div class="stat"><div class="stat-ico">${ICO('box')}</div><div class="stat-txt"><div class="stat-val">${prods.length}</div><div class="stat-lbl">Produits</div></div></div>
    <div class="stat"><div class="stat-ico">${ICO('eye')}</div><div class="stat-txt"><div class="stat-val">${list.length}</div><div class="stat-lbl">Affichés</div></div></div>
    <div class="stat"><div class="stat-ico">${ICO('tag')}</div><div class="stat-txt"><div class="stat-val">${[...new Set(prods.map(p=>p.cat))].length}</div><div class="stat-lbl">Catégories</div></div></div>
    <div class="stat"><div class="stat-ico">${ICO('cash')}</div><div class="stat-txt"><div class="stat-val" style="font-size:15px">${N(totalV)}</div><div class="stat-lbl">Coût de revient catalogue</div></div></div>`;
  const c=document.getElementById('cat-cont');
  if(!list.length){c.innerHTML='<div class="empty"><div class="empty-ico">'+ICO('inbox')+'</div><h3>Aucun produit trouvé</h3><p>Ajustez vos filtres ou ajoutez un produit.</p></div>';return;}
  if(grouped){
    const groups=groupList(list);
    if(view==='grid'){c.innerHTML=`<div class="grid">${groups.map(g=>prodGroupCard(g)).join('')}</div>`;}
    else{c.innerHTML=prodGroupTable(groups);}
  }else{
    if(view==='grid'){c.innerHTML=`<div class="grid">${list.map(prodCard).join('')}</div>`;}
    else{c.innerHTML=prodTable(list);}
  }
}

/* ---- GROUPING ---- */
function toggleGrouped(){
  grouped=!grouped;
  document.getElementById('grp-btn').classList.toggle('active',grouped);
  document.getElementById('strat-sel').style.display=grouped?'':'none';
  renderCat();
}
function setStratPrix(v){stratPrix=v;renderCat();}

function groupList(list){
  const map={};
  list.forEach(p=>{
    const key=p.grp||('__solo_'+p.id);
    if(!map[key])map[key]=[];
    map[key].push(p);
  });
  return Object.values(map).map(prods=>({key:prods[0].grp||('__solo_'+prods[0].id),prods,winner:selectWinner(prods[0].grp||('__solo_'+prods[0].id),prods)}));
}

function selectWinner(key,prods){
  if(prods.length===1)return prods[0];
  if(winOverrides[key]){const ov=prods.find(p=>p.id===winOverrides[key]);if(ov)return ov;}
  if(stratPrix==='prix_bas')return prods.reduce((b,p)=>calc(p).coutRevientUX<calc(b).coutRevientUX?p:b);
  if(stratPrix==='meilleure_qualite')return prods.reduce((b,p)=>{
    const fp=fours.find(x=>x.id===p.fid),fb=fours.find(x=>x.id===b.fid);
    return(parseInt(fp&&fp.eval||0)||0)>(parseInt(fb&&fb.eval||0)||0)?p:b;
  });
  // meilleur_rapport: highest margin %
  return prods.reduce((b,p)=>{const cp=calc(p),cb=calc(b);return(cp.coutRevientUX>0?cp.margeU/cp.coutRevientUX:0)>(cb.coutRevientUX>0?cb.margeU/cb.coutRevientUX:0)?p:b;});
}

function setWinner(key,prodId,event){
  if(event)event.stopPropagation();
  winOverrides[key]=prodId;
  IDB_SET(WK,winOverrides);
  renderCat();toast('Fournisseur sélectionné comme gagnant ✓');
}

function toggleAccordion(key){
  const panel=document.getElementById('ap-'+CSS.escape(key));
  if(panel)panel.classList.toggle('open');
}

/* Bloc prix commun aux cartes produit — structure en 5 lignes :
   Coût de Revient HT (cliquable → détail) / Frais logistiques / Marge / Prix de Vente HT / Prix de Vente TTC */
function cardPriceRows(p,c){
  const sym={RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[c.dev]||c.dev;
  const detail=`<div class="cost-det" id="cd-${p.id}">
      <div class="cd-row"><span>Coût d'achat HT (EXW${c.fretLocalX?' + fret local':''})</span><span>${N(c.exwUX+c.fretLocalX)}</span></div>
      ${c.fTrf?`<div class="cd-row"><span>Frais transfert de fonds${S.trf.mode==='pct'?' ('+S.trf.val+'%)':''}</span><span>${N(c.fTrf*c.tauxChange)}</span></div>`:''}
      ${c.fAss?`<div class="cd-row"><span>Trade Assurance${S.assu.mode==='pct'?' ('+S.assu.val+'%)':''}</span><span>${N(c.fAss*c.tauxChange)}</span></div>`:''}
      <div class="cd-row cd-tot"><span>Coût de revient HT</span><span>${N(c.coutRevientUX)}</span></div>
      <div class="cd-note">${Nd(c.coutRevientU)} ${sym} × ${Nd(c.tauxChange,2)} XOF/${c.dev}</div>
    </div>`;
  return[
    cols.achat  ?`<div class="pr"><span class="pr-lbl">Achat EXW</span><span class="pr-val">${N(c.exwUX)}</span></div>`:'',
    cols.prach&&c.fretLocalX?`<div class="pr"><span class="pr-lbl">Fret local</span><span class="pr-val">${N(c.fretLocalX)}</span></div>`:'',
    cols.revient?`<div class="pr pr-click" id="cdt-${p.id}" onclick="toggleCostDetail('${p.id}',event)" title="Voir le détail du coût de revient"><span class="pr-lbl">Coût de Revient HT ${ICO('chev')}</span><span class="pr-val">${N(c.coutRevientUX)}</span></div>${detail}`:'',
    cols.fret   ?`<div class="pr"><span class="pr-lbl">Frais logistiques <small>(${c.mode})</small></span><span class="pr-val">${N(c.fraisLogU)}</span></div>`:'',
    cols.marge  ?`<div class="pr"><span class="pr-lbl">Marge</span><span class="pr-val" style="color:var(--vert-t)">${N(c.margeU)} <small>(${Nd(c.margePct,1)}%)</small></span></div>`:'',
    cols.vente  ?`<div class="pr pr-strong"><span class="pr-lbl">Prix de Vente HT</span><span class="pr-val">${N(c.pvuHT)}</span></div>`:'',
    cols.ttc    ?`<div class="pr"><span class="pr-lbl pr-ttc">Prix de Vente TTC</span><span class="pr-val pr-ttc">${N(c.pvuTTC)}</span></div>`:'',
    cols.marche&&p.conc?`<div class="pr" style="font-size:10px"><span class="pr-lbl">Marché</span><span style="color:var(--vert-t);font-weight:600">${parseInt(p.conc).toLocaleString('fr-FR')} XOF</span></div>`:'',
  ].join('');
}
function toggleCostDetail(id,ev){
  if(ev)ev.stopPropagation();
  const el=document.getElementById('cd-'+id),btn=document.getElementById('cdt-'+id);
  if(el)el.classList.toggle('open');
  if(btn)btn.classList.toggle('open');
}

/* Galerie d'images sur la carte : miniatures cliquables qui remplacent l'image principale */
function cardGallery(p){
  if(!p.photos||p.photos.length<2)return'';
  return`<div class="card-gal">${p.photos.slice(0,4).map(s=>`<img src="${s}" loading="lazy" alt="Vue supplémentaire de ${String(p.nom||'').replace(/"/g,'&quot;')}" onerror="this.remove()" onclick="swapCardImg(this)">`).join('')}</div>`;
}
function swapCardImg(t){
  const card=t.closest('.card');if(!card)return;
  const m=card.querySelector('.card-img img');
  if(m){m.src=t.src;m.style.display='';const ph=card.querySelector('.card-img .card-img-placeholder');if(ph)ph.style.display='none';}
}

function prodGroupCard(g){
  const{key,prods:gps,winner:w}=g;
  const others=gps.filter(p=>p.id!==w.id);
  const f=fours.find(x=>x.id===w.fid);
  const lbl=fourLabel(f);const bc=fourBadgeClass(f);
  const imgSrc=w.photos&&w.photos[0]?w.photos[0]:null;
  const imgHtml=imgSrc
    ?`<img src="${imgSrc}" alt="${String(w.nom||'').replace(/"/g,'&quot;')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`+'<div class="card-img-placeholder" style="display:none">'+PH_LG+'</div>'
    :`<div class="card-img-placeholder">${PH_LG}</div>`;
  const c=calc(w);
  const escapedKey=key.replace(/'/g,"\\'");
  const priceRows=cardPriceRows(w,c);
  const altCards=others.map(p=>{
    const fp=fours.find(x=>x.id===p.fid);
    const cp=calc(p);
    const pimg=p.photos&&p.photos[0]?`<img src="${p.photos[0]}" class="alt-card-img" alt="" loading="lazy" onerror="this.style.display='none'">`:'<span class="ph-sm" style="width:38px;justify-content:center">'+ICO('box')+'</span>';
    return`<div class="alt-card">
      ${pimg}
      <div class="alt-card-info">
        <div class="alt-card-nom">${p.nom}</div>
        <div class="alt-card-prix">${fourLabel(fp)} · ${N(cp.pvuTTC)} TTC</div>
      </div>
      <button class="alt-promote-btn" onclick="setWinner('${escapedKey}','${p.id}',event)">Choisir</button>
      <button class="btn btn-sm ${isInCart(p.id)?'btn-in-cart':'btn-sec'}" onclick="addToCart('${p.id}')" title="Ajouter au devis" style="padding:3px 8px;font-size:10px;border-radius:5px;flex-shrink:0">${isInCart(p.id)?ICO('check'):ICO('quote')}</button>
    </div>`;
  }).join('');
  const grpBadge=others.length?`<span class="grp-count-badge" onclick="toggleAccordion('${escapedKey}')">+${others.length} fournisseur${others.length>1?'s':''}</span>`:'';
  return`<div class="card">
  ${cols.photos?`<div class="card-img">${imgHtml}<span class="badge ${bc}">${lbl}</span>${expBox(w.id)}${grpBadge}</div>`:cardTopStrip(w.id,bc,lbl,grpBadge?`<span style="position:static" class="grp-count-badge" onclick="toggleAccordion('${escapedKey}')">+${others.length} fourn.</span>`:'')}
  <div class="card-body">
    ${cols.ref?`<div class="card-ref">${w.ref}</div>`:''}
    ${cols.nom?`<div class="card-title">${w.nom}</div>`:''}
    <div class="card-cat">${cols.cat?w.cat+' · ':''}${cols.four?fourLabel(f)+' · ':''}${TRI(w.tr)} ${w.tr}</div>
    ${catInfoRows(w)}
    ${cols.photos?cardGallery(w):''}
    ${priceRows?`<div class="card-prices">${priceRows}</div>`:''}
    <div class="card-acts">
      <button class="btn btn-sec btn-sm" onclick="openProdModal('${w.id}')">${ICO('pencil')}</button>
      <button class="btn btn-sec btn-sm" onclick="dupProd('${w.id}')" title="Dupliquer">${ICO('copy')}</button>
      <button class="btn btn-danger btn-sm" onclick="delProd('${w.id}')">${ICO('trash')}</button>
      <button class="btn btn-success btn-sm" onclick="qsim('${w.id}')" title="Simuler">${ICO('calc')}</button>
      <button class="btn btn-sm ${isInCart(w.id)?'btn-in-cart':'btn-sec'}" onclick="addToCart('${w.id}')" title="Ajouter au devis">${isInCart(w.id)?ICO('check')+' Devis':ICO('quote')}</button>
    </div>
  </div>
  ${others.length?`<div class="alt-panel" id="ap-${key}"><div class="alt-panel-inner"><div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Alternatives fournisseurs</div>${altCards}</div></div>`:''}</div>`;
}

function prodGroupTable(groups){
  const C=cols;
  const ths=['<th></th>',
    C.photos ?'<th>Photo</th>'             :'',
    C.ref    ?'<th>Réf</th>'               :'',
    C.nom    ?'<th>Désignation</th>'       :'',
    C.cat    ?'<th>Catégorie</th>'         :'',
    C.four   ?'<th>Fournisseur</th>'       :'',
    C.moq    ?'<th>MOQ</th>'               :'',
    C.specs  ?'<th>Spécificités</th>'      :'',
    C.desc   ?'<th>Description</th>'       :'',
    C.cbm    ?'<th>CBM</th>'               :'',
    C.poids  ?'<th>Poids</th>'             :'',
    C.achat  ?'<th>Achat EXW</th>'         :'',
    C.prach  ?'<th>Fret local</th>'        :'',
    C.revient?'<th>Coût de Revient HT</th>':'',
    C.fret   ?'<th>Frais logistiques (Transitaire)</th>':'',
    C.marge  ?'<th>Marge</th>'             :'',
    C.vente  ?'<th>Prix de Vente HT</th>'  :'',
    C.ttc    ?'<th>Prix de Vente TTC</th>' :'',
    C.delai  ?'<th>Délai</th>'             :'',
    C.marche ?'<th>Marché</th>'            :'',
    '<th class="no-print">Actions</th>',
  ].join('');
  const rows=groups.map(g=>{
    const{key,prods:gps,winner:w}=g;
    const others=gps.filter(p=>p.id!==w.id);
    const f=fours.find(x=>x.id===w.fid);const c=calc(w);
    const imgSrc=w.photos&&w.photos[0]?w.photos[0]:null;
    const escapedKey=key.replace(/'/g,"\\'");
    const expandBtn=others.length?`<button class="expand-cell" onclick="toggleGroupTblRow('${escapedKey}',this)" title="Voir alternatives" aria-label="Voir alternatives">${ICO('chev')}</button>`:'';
    const winRow=`<tr>
      <td class="no-print">${expandBtn}${C.photos?'':`<span style="position:relative;display:inline-block;width:22px;height:22px">${expBox(w.id)}</span>`}</td>
      ${C.photos ?`<td>${expBox(w.id)}${imgSrc?`<img src="${imgSrc}" style="width:44px;height:44px;object-fit:cover;border-radius:6px" alt="" loading="lazy">`:PH_SM}</td>`:''}
      ${C.ref    ?`<td><code style="font-size:10px">${w.ref}</code></td>`:''}
      ${C.nom    ?`<td style="font-weight:500;max-width:180px">${w.nom}${others.length?` <span class="pill-more">+${others.length}</span>`:''}</td>`:''}
      ${C.cat    ?`<td><span class="pill-cat">${w.cat}</span></td>`:''}
      ${C.four   ?`<td>${fourLabel(f)}</td>`:''}
      ${C.moq    ?`<td>${w.moq||1}</td>`:''}
      ${C.specs  ?`<td style="font-size:11px;color:var(--muted);max-width:180px">${truncTxt(w.specs,60)}</td>`:''}
      ${C.desc   ?`<td style="font-size:11px;color:var(--muted);max-width:220px">${truncTxt(w.desc,80)}</td>`:''}
      ${C.cbm    ?`<td>${Nd(c.cbm,4)} m³</td>`:''}
      ${C.poids  ?`<td>${w.kg} kg</td>`:''}
      ${C.achat  ?`<td>${N(c.exwUX)}</td>`:''}
      ${C.prach  ?`<td>${c.fretLocalX?N(c.fretLocalX):'—'}</td>`:''}
      ${C.revient?`<td style="font-weight:600">${N(c.coutRevientUX)}</td>`:''}
      ${C.fret   ?`<td>${N(c.fraisLogU)}</td>`:''}
      ${C.marge  ?`<td style="color:var(--vert-t);font-weight:600">${N(c.margeU)} <small style="opacity:.7">(${Nd(c.margePct,1)}%)</small></td>`:''}
      ${C.vente  ?`<td style="font-weight:700">${N(c.pvuHT)}</td>`:''}
      ${C.ttc    ?`<td style="color:var(--bleu-t);font-weight:600">${N(c.pvuTTC)}</td>`:''}
      ${C.delai  ?`<td>${prodDelai(w)}</td>`:''}
      ${C.marche ?`<td style="color:var(--vert-t)">${w.conc?parseInt(w.conc).toLocaleString('fr-FR')+' XOF':'—'}</td>`:''}
      <td class="no-print"><div style="display:flex;gap:4px">
        <button class="btn btn-sec btn-sm" onclick="showProdDetails('${w.id}')" title="Voir détails" aria-label="Voir tous les détails">${ICO('eye')}</button>
        <button class="btn btn-sec btn-sm" onclick="openProdModal('${w.id}')">${ICO('pencil')}</button>
        <button class="btn btn-sec btn-sm" onclick="dupProd('${w.id}')" title="Dupliquer">${ICO('copy')}</button>
        <button class="btn btn-danger btn-sm" onclick="delProd('${w.id}')">${ICO('trash')}</button>
        <button class="btn btn-success btn-sm" onclick="qsim('${w.id}')">${ICO('calc')}</button>
        <button class="btn btn-sm ${isInCart(w.id)?'btn-in-cart':'btn-sec'}" onclick="addToCart('${w.id}')" title="Ajouter au devis">${isInCart(w.id)?ICO('check'):ICO('quote')}</button>
      </div></td>
    </tr>`;
    const colCount=1+(Object.values(C).filter(Boolean).length)+1;
    const altRows=others.map(p=>{
      const fp=fours.find(x=>x.id===p.fid);const cp=calc(p);
      const pimg=p.photos&&p.photos[0]?`<img src="${p.photos[0]}" style="width:32px;height:32px;object-fit:cover;border-radius:4px" alt="" loading="lazy">`:PH_SM;
      return`<tr class="tbl-alt-row" id="tbl-alt-${key}" style="display:none">
        <td></td>
        ${C.photos ?`<td>${pimg}</td>`:''}
        ${C.ref    ?`<td><code style="font-size:9px">${p.ref}</code></td>`:''}
        ${C.nom    ?`<td style="color:var(--muted)">${p.nom}</td>`:''}
        ${C.cat    ?`<td></td>`:''}
        ${C.four   ?`<td>${fourLabel(fp)}</td>`:''}
        ${C.moq    ?`<td>${p.moq||1}</td>`:''}
        ${C.specs  ?`<td style="font-size:10px;color:var(--muted)">${truncTxt(p.specs,40)}</td>`:''}
        ${C.desc   ?`<td style="font-size:10px;color:var(--muted)">${truncTxt(p.desc,50)}</td>`:''}
        ${C.cbm    ?`<td>${Nd(cp.cbm,4)}</td>`:''}
        ${C.poids  ?`<td>${p.kg} kg</td>`:''}
        ${C.achat  ?`<td>${N(cp.exwUX)}</td>`:''}
        ${C.prach  ?`<td>${cp.fretLocalX?N(cp.fretLocalX):'—'}</td>`:''}
        ${C.revient?`<td>${N(cp.coutRevientUX)}</td>`:''}
        ${C.fret   ?`<td>${N(cp.fraisLogU)}</td>`:''}
        ${C.marge  ?`<td style="color:var(--vert-t)">${N(cp.margeU)}</td>`:''}
        ${C.vente  ?`<td>${N(cp.pvuHT)}</td>`:''}
        ${C.ttc    ?`<td style="color:var(--bleu-t)">${N(cp.pvuTTC)}</td>`:''}
        ${C.delai  ?`<td>${prodDelai(p)}</td>`:''}
        ${C.marche ?`<td>${p.conc?parseInt(p.conc).toLocaleString('fr-FR')+' XOF':'—'}</td>`:''}
        <td class="no-print"><div style="display:flex;gap:4px"><button class="alt-promote-btn" onclick="setWinner('${escapedKey}','${p.id}',event)">Choisir</button><button class="btn btn-sm ${isInCart(p.id)?'btn-in-cart':'btn-sec'}" onclick="addToCart('${p.id}')" style="padding:3px 7px;font-size:10px">${isInCart(p.id)?ICO('check'):ICO('quote')}</button></div></td>
      </tr>`;
    }).join('');
    return winRow+altRows;
  }).join('');
  return`<div class="tbl-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function toggleGroupTblRow(key,btn){
  const rows=document.querySelectorAll('#tbl-alt-'+CSS.escape(key));
  const open=rows.length&&rows[0].style.display!=='none';
  rows.forEach(r=>r.style.display=open?'none':'');
  if(btn)btn.classList.toggle('open',!open);
}

// Texte long (Spécificités / Description) : échappé, tronqué, tooltip au survol
function escH(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function truncTxt(s,n=60){
  s=String(s||'');
  if(!s)return'—';
  return s.length>n?`<span title="${escH(s)}">${escH(s.slice(0,n))}…</span>`:escH(s);
}
// Lignes d'info MOQ / Spécificités / Description sur les cartes du catalogue
function catInfoRows(p){
  const row=(lbl,val)=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;margin-top:2px"><span style="color:var(--muted)">${lbl}</span><span style="font-weight:600;text-align:right">${val}</span></div>`;
  return[
    cols.moq?row('MOQ',p.moq||1):'',
    cols.specs&&p.specs?row('Spécificités',`<span style="font-weight:400;color:var(--muted)">${truncTxt(p.specs,80)}</span>`):'',
    cols.desc&&p.desc?row('Description',`<span style="font-weight:400;color:var(--muted)">${truncTxt(p.desc,100)}</span>`):'',
  ].join('');
}
// Bandeau compact remplaçant l'image quand la colonne Photo est décochée
// (le badge fournisseur et la case de sélection export restent accessibles)
function cardTopStrip(id,bc,lbl,extra=''){
  return`<div style="display:flex;justify-content:flex-end;align-items:center;gap:6px;padding:10px 12px 0;position:relative">${expBox(id)}${extra}<span class="badge ${bc}" style="position:static">${lbl}</span></div>`;
}

// Délai indicatif du transitaire par défaut selon le mode de transport
function prodDelai(p){
  const t0=trans.length?trans[0]:null;
  const d=t0?(p.tr==='Aérien'?t0.aerd:t0.mard):'';
  return d?d+' j':'—';
}

/* ---- MODAL « VOIR DÉTAILS » — toutes les infos d'une ligne, colonnes masquées comprises ---- */
function openDetails(title,rows,img){
  document.getElementById('detail-title').textContent=title;
  document.getElementById('detail-body').innerHTML=
    (img?`<img src="${img}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:12px" onerror="this.style.display='none'">`:'')+
    rows.map(([l,v])=>`<div class="detail-row"><span>${l}</span><span>${v}</span></div>`).join('');
  openMod('detail-modal');
}
function showProdDetails(id){
  const p=prods.find(x=>x.id===id);if(!p)return;
  const f=fours.find(x=>x.id===p.fid);const c=calc(p);
  openDetails(p.nom,[
    ['Référence',p.ref],['Catégorie',p.cat],['Fournisseur',f?f.nom:p.fn||'—'],
    ['Prix EXW',`${p.prix} ${p.dev||'RMB'}`],['Fret local',p.prach?`${p.prach} ${p.dev||'RMB'}`:'—'],
    ['Dimensions',`${p.l}×${p.la}×${p.h} ${p.dimU||'cm'}`],['CBM',Nd(c.cbm,4)+' m³'],['Poids',p.kg+' kg'],
    ['Transport',p.tr],['Délai livraison',prodDelai(p)],['MOQ',p.moq||1],
    ...(p.specs?[['Spécificités',escH(p.specs)]]:[]),
    ...(p.desc?[['Description',escH(p.desc)]]:[]),
    ['Achat EXW (XOF)',N(c.exwUX)],['Coût de Revient HT',N(c.coutRevientUX)],
    ['Frais logistiques (Transitaire)',N(c.fraisLogU)],
    ['Marge',`${N(c.margeU)} (${Nd(c.margePct,1)}%)`],
    ['Prix de Vente HT',N(c.pvuHT)],['Prix de Vente TTC',N(c.pvuTTC)],
    ['Prix marché',p.conc?parseInt(p.conc).toLocaleString('fr-FR')+' XOF':'—'],
  ],p.photos&&p.photos[0]);
}
/* ---- ÉDITION DES CHAMPS D'UNE LIGNE DE DEVIS (modal « Voir détails ») ----
   Champs négociables (prix EXW, fret local, poids, dimensions, MOQ) : la valeur saisie est
   mémorisée sur cette ligne ET sur le produit du catalogue (p.nego), sans jamais modifier
   sa valeur par défaut — réutilisable telle quelle sur un autre devis, qui garde le choix
   Catalogue/Négocié (par défaut : Catalogue). Les autres champs (désignation, référence,
   description, spécificités, catégorie, devise, mode transport) s'éditent librement, propres
   à cette ligne uniquement, sans impact sur le catalogue. */
const DV_FIELD_GROUP={prix:'prix',prach:'prach',kg:'kg',moq:'moq',l:'dims',la:'dims',h:'dims'};
const DV_NEGO_GROUPS={prix:['prix'],prach:['prach'],kg:['kg'],moq:['moq'],dims:['l','la','h']};

function dvFlash(el){
  if(!el)return;
  el.classList.remove('dv-flash');void el.offsetWidth;el.classList.add('dv-flash');
}

// Édition d'un champ du devis (onchange sur un input/select) : le champ édité perd le focus au
// moment où son conteneur est réécrit (innerHTML), ce qui fait remonter le focus au <body> et,
// avec lui, le défilement de la page/modale — on capture donc la position de scroll avant le
// rendu et on la restaure juste après (et au frame suivant, une fois la mise en page recalculée).
function dvPreserveScroll(fn){
  const winY=window.scrollY;
  const modal=document.querySelector('.overlay.open .modal');
  const modalY=modal?modal.scrollTop:null;
  const restore=()=>{
    if(window.scrollY!==winY)window.scrollTo(0,winY);
    if(modal&&document.body.contains(modal)&&modal.scrollTop!==modalY)modal.scrollTop=modalY;
  };
  fn();
  restore();
  requestAnimationFrame(restore);
}

function refreshDevisAfterEdit(item,field){
  dvPreserveScroll(()=>{
    const list=getFilteredDevisCart();
    document.getElementById('dv-cart-cont').innerHTML=devisView==='grid'?buildDevisGrid(list):buildDevisTable(list);
    renderDevisTotal(list);
    const dm=document.getElementById('detail-modal');
    if(dm.classList.contains('open')){
      showDevisDetails(item.cid);
      if(field){const row=document.querySelector(`#detail-body [data-dv-field="${field}"]`);if(row)dvFlash(row);}
    }
  });
}

// Champ simple (texte / select / description) — ce devis uniquement, jamais répercuté au catalogue
function dvEditSimple(cid,field,val){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  item.snap[field]=val;
  item.edited=item.edited||{};
  item.edited[field]=(val!==item.orig[field]);
  saveDevisCartLS();
  toast('Modification enregistrée ✓');
  refreshDevisAfterEdit(item,field);
}

// Champ chiffré négociable — enregistre la valeur sur cette ligne ET comme valeur négociée
// réutilisable sur le produit du catalogue (dont la valeur par défaut reste inchangée)
function dvEditNego(cid,field,val){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  const num=parseFloat(val);
  if(isNaN(num)||num<0)return;
  const group=DV_FIELD_GROUP[field];
  item.snap[field]=num;
  item.nego=item.nego||{};item.nego[field]=num;
  item.active=item.active||{};item.active[group]='nego';
  item.edited=item.edited||{};item.edited[field]=(num!==item.orig[field]);
  const p=prods.find(x=>x.id===item.pid);
  if(p){p.nego=p.nego||{};p.nego[field]=num;save('p');}
  saveDevisCartLS();
  toast('Valeur négociée enregistrée ✓ (le catalogue garde sa valeur par défaut)');
  refreshDevisAfterEdit(item,field);
}

// Bascule Catalogue ⇄ Négocié pour un champ (ou groupe de champs) négociable
function dvToggleSource(cid,group,src){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  const fields=DV_NEGO_GROUPS[group];if(!fields)return;
  item.active=item.active||{};item.active[group]=src;
  fields.forEach(f=>{
    if(src==='cat')item.snap[f]=item.orig[f];
    else if(item.nego&&item.nego[f]!=null)item.snap[f]=item.nego[f];
  });
  item.edited=item.edited||{};
  fields.forEach(f=>{item.edited[f]=(item.snap[f]!==item.orig[f]);});
  saveDevisCartLS();
  refreshDevisAfterEdit(item,fields[0]);
}

function dvModalQty(cid,val){
  dvQty(cid,val);
  if(document.getElementById('detail-modal').classList.contains('open'))showDevisDetails(cid);
}

// Ligne éditable simple — pas de mémoire catalogue, badge « modifié » si différent de l'ajout au devis
function dvEditRow(item,field,label,inputHtml){
  const mod=item.edited&&item.edited[field];
  return`<div class="detail-row dv-edit-row" data-dv-field="${field}">
    <span>${label}${mod?`<span class="dv-mod-badge" title="Modifié pour ce devis">${ICO('pencil')}</span>`:''}</span>
    <span class="dv-edit-val">${inputHtml}</span>
  </div>`;
}
// Ligne éditable chiffrée « négociable » — bascule Catalogue / Négocié, valeur mémorisée sur le produit
function dvNegoRow(item,group,fields,label,unit){
  const active=(item.active&&item.active[group])||'cat';
  const hasNego=fields.some(f=>item.nego&&item.nego[f]!=null);
  const mod=fields.some(f=>item.edited&&item.edited[f]);
  const inputs=fields.map(f=>`<input type="number" class="fc dv-nego-inp" step="0.01" min="0"
    value="${item.snap[f]??''}" onchange="dvEditNego('${item.cid}','${f}',this.value)" aria-label="${label}">`).join('<span style="color:var(--muted);font-size:11px">×</span>');
  const toggle=hasNego?`<div class="dv-src-toggle">
      <button type="button" class="dv-src-pill${active==='cat'?' active':''}" onclick="dvToggleSource('${item.cid}','${group}','cat')">Catalogue</button>
      <button type="button" class="dv-src-pill${active==='nego'?' active':''}" onclick="dvToggleSource('${item.cid}','${group}','nego')">Négocié</button>
    </div>`:'';
  return`<div class="detail-row dv-edit-row" data-dv-field="${fields[0]}">
    <span>${label}${mod?`<span class="dv-mod-badge" title="Différent de la valeur catalogue">${ICO('pencil')}</span>`:''}</span>
    <span class="dv-edit-val">
      <span style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end">${inputs}${unit?`<small style="color:var(--muted)">${unit}</small>`:''}</span>
      ${toggle}
    </span>
  </div>`;
}

function showDevisDetails(cid){
  const item=devisCart.find(x=>x.cid===cid);if(!item)return;
  const c=calcDevis(item),p=item.snap;
  const devSymbol={RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[p.dev]||p.dev;
  const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const catOpts=(CATS[p.cat]?'':`<option selected>${esc(p.cat)}</option>`)+
    Object.keys(CATS).map(k=>`<option${p.cat===k?' selected':''}>${k}</option>`).join('');
  const devOpts=(DV_NAMES[p.dev]?'':`<option value="${esc(p.dev)}" selected>${esc(p.dev)}</option>`)+
    ['RMB','USD','EUR','XOF'].map(d=>`<option value="${d}"${p.dev===d?' selected':''}>${DV_NAMES[d]}</option>`).join('');
  const trOpts=['Maritime','Aérien'].map(t=>`<option${p.tr===t?' selected':''}>${t}</option>`).join('');
  document.getElementById('detail-title').textContent=p.nom;
  document.getElementById('detail-body').innerHTML=
    (p.photos&&p.photos[0]?`<img src="${p.photos[0]}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:12px" onerror="this.style.display='none'">`:'')+
    `<div class="detail-sec">Informations modifiables</div>`+
    dvEditRow(item,'nom','Désignation',`<input type="text" class="fc" style="width:170px" value="${esc(p.nom)}" onchange="dvEditSimple('${cid}','nom',this.value)">`)+
    dvEditRow(item,'ref','Référence',`<input type="text" class="fc" style="width:170px" value="${esc(p.ref)}" onchange="dvEditSimple('${cid}','ref',this.value)">`)+
    dvEditRow(item,'cat','Catégorie',`<select class="fc" style="width:170px" onchange="dvEditSimple('${cid}','cat',this.value)">${catOpts}</select>`)+
    dvEditRow(item,'dev','Devise',`<select class="fc" style="width:170px" onchange="dvEditSimple('${cid}','dev',this.value)">${devOpts}</select>`)+
    dvNegoRow(item,'prix',['prix'],'Prix EXW',devSymbol)+
    dvNegoRow(item,'prach',['prach'],'Frais locaux (/commande)',devSymbol)+
    dvEditRow(item,'tr','Mode transport',`<select class="fc" style="width:170px" onchange="dvEditSimple('${cid}','tr',this.value)">${trOpts}</select>`)+
    dvNegoRow(item,'dims',['l','la','h'],'Dimensions (L × l × h)',p.dimU||'cm')+
    dvNegoRow(item,'kg',['kg'],'Poids','kg')+
    dvNegoRow(item,'moq',['moq'],'MOQ','')+
    dvEditRow(item,'specs','Spécificités',`<textarea class="fc" rows="2" style="width:170px;resize:vertical" onchange="dvEditSimple('${cid}','specs',this.value)">${esc(p.specs)}</textarea>`)+
    dvEditRow(item,'desc','Description',`<textarea class="fc" rows="2" style="width:170px;resize:vertical" onchange="dvEditSimple('${cid}','desc',this.value)">${esc(p.desc)}</textarea>`)+
    `<div class="detail-row"><span>Quantité</span><span><input type="number" class="fc" style="width:70px;text-align:right" min="1" value="${item.qty}" onchange="dvModalQty('${cid}',this.value)"></span></div>`+
    (item.comment?`<div class="detail-row"><span>Commentaire</span><span class="dv-note-txt">${esc(item.comment)}</span></div>`:'')+
    `<div class="detail-sec">Valeurs calculées (lecture seule)</div>`+
    `<div class="detail-row"><span>CBM</span><span>${Nd(c.cbm,4)} m³</span></div>`+
    `<div class="detail-row"><span>Coût Total</span><span>${Nd(c.coutRevient,2)} ${devSymbol}</span></div>`+
    `<div class="detail-row"><span>Coût unit. HT</span><span>${Ndv(c.coutRevientUX)}</span></div>`+
    `<div class="detail-row"><span>Taux de Marge</span><span>${Nd(c.mgPct,1)}%</span></div>`+
    `<div class="detail-row"><span>Marge</span><span>${Ndv(c.margeU)}</span></div>`+
    `<div class="detail-row"><span>Prix HT</span><span>${Ndv(c.pvuHT)}</span></div>`+
    `<div class="detail-row"><span>Prix total HT</span><span>${Ndv(c.pvtHT)}</span></div>`+
    `<div class="detail-row"><span>Frais logistiques Estimé</span><span>${Ndv(c.fraisLog)}</span></div>`+
    (c.tvaM?`<div class="detail-row"><span>TVA interne</span><span>${Ndv(c.tvaM)}</span></div>`:'')+
    `<div class="detail-row"><span>Prix TTC Estimé</span><span>${Ndv(c.pvtTTC)}</span></div>`+
    `<div class="detail-row"><span>Fournisseur</span><span>${esc(p.fn)||'—'}</span></div>`+
    `<div class="detail-row"><span>Transitaire</span><span>${esc(p.trans_nom)||'—'}</span></div>`+
    `<div class="detail-row"><span>Délai estimé</span><span>${p.trans_delai?p.trans_delai+' j':'—'}</span></div>`;
  openMod('detail-modal');
}

function fourLabel(f){
  if(!f)return'—';
  if(f.nom.includes('Yateli'))return'Yateli';
  if(f.nom.includes('Oman'))return'Oman';
  return f.nom.split(' ')[0];
}

function fourBadgeClass(f){
  if(!f)return'b-other';
  if(f.nom.includes('Yateli'))return'b-yateli';
  if(f.nom.includes('Oman'))return'b-oman';
  return'b-other';
}

function prodCard(p){
  const f=fours.find(x=>x.id===p.fid);
  const lbl=fourLabel(f);
  const bc=fourBadgeClass(f);
  const imgSrc=p.photos&&p.photos[0]?p.photos[0]:null;
  const imgHtml=imgSrc
    ?`<img src="${imgSrc}" alt="${String(p.nom||'').replace(/"/g,'&quot;')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`+'<div class="card-img-placeholder" style="display:none">'+PH_LG+'</div>'
    :`<div class="card-img-placeholder">${PH_LG}</div>`;
  const c=calc(p);
  const priceRows=cardPriceRows(p,c);
  return`<div class="card">
  ${cols.photos?`<div class="card-img">${imgHtml}<span class="badge ${bc}">${lbl}</span>${expBox(p.id)}</div>`:cardTopStrip(p.id,bc,lbl)}
  <div class="card-body">
    ${cols.ref?`<div class="card-ref">${p.ref}</div>`:''}
    ${cols.nom?`<div class="card-title">${p.nom}</div>`:''}
    <div class="card-cat">${cols.cat?p.cat+' · ':''}${cols.four?fourLabel(f)+' · ':''}${TRI(p.tr)} ${p.tr}</div>
    ${catInfoRows(p)}
    ${cols.photos?cardGallery(p):''}
    ${priceRows?`<div class="card-prices">${priceRows}</div>`:''}
    <div class="card-acts">
      <button class="btn btn-sec btn-sm" onclick="openProdModal('${p.id}')">${ICO('pencil')}</button>
      <button class="btn btn-sec btn-sm" onclick="dupProd('${p.id}')" title="Dupliquer">${ICO('copy')}</button>
      <button class="btn btn-danger btn-sm" onclick="delProd('${p.id}')">${ICO('trash')}</button>
      <button class="btn btn-success btn-sm" onclick="qsim('${p.id}')" title="Simuler">${ICO('calc')}</button>
      <button class="btn btn-sm ${isInCart(p.id)?'btn-in-cart':'btn-sec'}" onclick="addToCart('${p.id}')" title="Ajouter au devis">${isInCart(p.id)?ICO('check')+' Devis':ICO('quote')}</button>
    </div>
  </div></div>`;
}

function prodTable(list){
  const C=cols;
  const ths=[
    C.photos ?'<th>Photo</th>'             :'',
    C.ref    ?'<th>Réf</th>'               :'',
    C.nom    ?'<th>Désignation</th>'       :'',
    C.cat    ?'<th>Catégorie</th>'         :'',
    C.four   ?'<th>Fournisseur</th>'       :'',
    C.moq    ?'<th>MOQ</th>'               :'',
    C.specs  ?'<th>Spécificités</th>'      :'',
    C.desc   ?'<th>Description</th>'       :'',
    C.cbm    ?'<th>CBM</th>'               :'',
    C.poids  ?'<th>Poids</th>'             :'',
    C.achat  ?'<th>Achat EXW</th>'         :'',
    C.prach  ?'<th>Fret local</th>'        :'',
    C.revient?'<th>Coût de Revient HT</th>':'',
    C.fret   ?'<th>Frais logistiques (Transitaire)</th>':'',
    C.marge  ?'<th>Marge</th>'             :'',
    C.vente  ?'<th>Prix de Vente HT</th>'  :'',
    C.ttc    ?'<th>Prix de Vente TTC</th>' :'',
    C.delai  ?'<th>Délai</th>'             :'',
    C.marche ?'<th>Marché</th>'            :'',
    '<th class="no-print">Actions</th>',
    '<th class="no-print">Devis</th>',
  ].join('');
  const rows=list.map(p=>{
    const f=fours.find(x=>x.id===p.fid);const c=calc(p);
    const imgSrc=p.photos&&p.photos[0]?p.photos[0]:null;
    return`<tr>
      ${C.photos ?`<td>${expBox(p.id)}${imgSrc?`<img src="${imgSrc}" style="width:44px;height:44px;object-fit:cover;border-radius:6px" alt="" loading="lazy">`:PH_SM}</td>`:''}
      ${C.ref    ?`<td><code style="font-size:10px">${p.ref}</code></td>`:''}
      ${C.nom    ?`<td style="font-weight:500;max-width:180px">${p.nom}</td>`:''}
      ${C.cat    ?`<td><span class="pill-cat">${p.cat}</span></td>`:''}
      ${C.four   ?`<td>${fourLabel(f)}</td>`:''}
      ${C.moq    ?`<td>${p.moq||1}</td>`:''}
      ${C.specs  ?`<td style="font-size:11px;color:var(--muted);max-width:180px">${truncTxt(p.specs,60)}</td>`:''}
      ${C.desc   ?`<td style="font-size:11px;color:var(--muted);max-width:220px">${truncTxt(p.desc,80)}</td>`:''}
      ${C.cbm    ?`<td>${Nd(c.cbm,4)} m³</td>`:''}
      ${C.poids  ?`<td>${p.kg} kg</td>`:''}
      ${C.achat  ?`<td>${N(c.exwUX)}</td>`:''}
      ${C.prach  ?`<td>${c.fretLocalX?N(c.fretLocalX):'—'}</td>`:''}
      ${C.revient?`<td style="font-weight:600">${N(c.coutRevientUX)}</td>`:''}
      ${C.fret   ?`<td>${N(c.fraisLogU)}</td>`:''}
      ${C.marge  ?`<td style="color:var(--vert-t);font-weight:600">${N(c.margeU)} <small style="opacity:.7">(${Nd(c.margePct,1)}%)</small></td>`:''}
      ${C.vente  ?`<td style="font-weight:700">${N(c.pvuHT)}</td>`:''}
      ${C.ttc    ?`<td style="color:var(--bleu-t);font-weight:600">${N(c.pvuTTC)}</td>`:''}
      ${C.delai  ?`<td>${prodDelai(p)}</td>`:''}
      ${C.marche ?`<td style="color:var(--vert-t)">${p.conc?parseInt(p.conc).toLocaleString('fr-FR')+' XOF':'—'}</td>`:''}
      <td class="no-print"><div style="display:flex;gap:4px;position:relative">
        ${C.photos?'':expBox(p.id)}
        <button class="btn btn-sec btn-sm" onclick="showProdDetails('${p.id}')" title="Voir détails" aria-label="Voir tous les détails">${ICO('eye')}</button>
        <button class="btn btn-sec btn-sm" onclick="openProdModal('${p.id}')">${ICO('pencil')}</button>
        <button class="btn btn-sec btn-sm" onclick="dupProd('${p.id}')" title="Dupliquer">${ICO('copy')}</button>
        <button class="btn btn-danger btn-sm" onclick="delProd('${p.id}')">${ICO('trash')}</button>
        <button class="btn btn-success btn-sm" onclick="qsim('${p.id}')" title="Simuler">${ICO('calc')}</button>
        <button class="btn btn-sm ${isInCart(p.id)?'btn-in-cart':'btn-sec'}" onclick="addToCart('${p.id}')" title="Ajouter au devis">${isInCart(p.id)?ICO('check'):ICO('quote')}</button>
      </div></td>
    </tr>`;
  }).join('');
  return`<div class="tbl-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---- PRODUCT MODAL ---- */
let dupSrc=null; // copie source lors d'une duplication — fusionnée à l'enregistrement
function openProdModal(id=null){
  editP=id;pics=[];dupSrc=null;
  document.getElementById('p-thumbs').innerHTML='';
  document.getElementById('calc-prev').style.display='none';
  const sel=document.getElementById('p-four');
  sel.innerHTML='<option value="">Sélectionner...</option>';
  fours.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.nom;sel.appendChild(o);});
  if(id){
    const p=prods.find(x=>x.id===id);
    document.getElementById('pm-title').textContent='Modifier le produit';
    document.getElementById('p-ref').value=p.ref;
    document.getElementById('p-nom').value=p.nom;
    document.getElementById('p-cat').value=p.cat;
    document.getElementById('p-four').value=p.fid;
    document.getElementById('p-prix').value=p.prix;
    document.getElementById('p-prach').value=p.prach||'';
    document.getElementById('p-dev').value=p.dev||'RMB';
    document.getElementById('p-l').value=p.l;
    document.getElementById('p-la').value=p.la;
    document.getElementById('p-h').value=p.h;
    document.getElementById('p-dimu').value=p.dimU||'cm';
    document.getElementById('p-poids').value=p.kg;
    document.getElementById('p-trans').value=p.tr;
    document.getElementById('p-marge').value=p.marge;
    document.getElementById('p-rem').value=p.rem||0;
    document.getElementById('p-conc').value=p.conc||'';
    document.getElementById('p-moq').value=p.moq||1;
    document.getElementById('p-desc').value=p.desc||'';
    document.getElementById('p-specs').value=p.specs||'';
    pics=[...(p.photos||[])];renderThumbs();calcPrev();
  }else{
    document.getElementById('pm-title').textContent='Nouveau produit';
    ['p-ref','p-nom','p-prix','p-prach','p-l','p-la','p-h','p-poids','p-marge','p-desc','p-specs','p-conc'].forEach(x=>document.getElementById(x).value='');
    document.getElementById('p-cat').value='';
    document.getElementById('p-trans').value='Maritime';
    document.getElementById('p-rem').value='0';
    document.getElementById('p-moq').value='1';
    document.getElementById('p-dev').value='RMB';
    document.getElementById('p-dimu').value='cm';
  }
  updateSLink();
  openMod('prod-modal');
}

/* Duplique un produit : ouvre le modal « nouveau produit » pré-rempli avec une
   copie complète (galerie d'images incluse via dupSrc) et une nouvelle référence
   incrémentée. Le produit original n'est jamais modifié ; l'ajout au catalogue
   n'a lieu qu'à la validation (saveProd). */
function dupProd(id){
  const p=prods.find(x=>x.id===id);
  if(!p)return;
  openProdModal(null);
  dupSrc=JSON.parse(JSON.stringify(p));
  document.getElementById('pm-title').textContent='Dupliquer le produit';
  document.getElementById('p-nom').value=p.nom;
  document.getElementById('p-cat').value=p.cat;
  document.getElementById('p-four').value=p.fid||'';
  document.getElementById('p-prix').value=p.prix;
  document.getElementById('p-prach').value=p.prach||'';
  document.getElementById('p-dev').value=p.dev||'RMB';
  document.getElementById('p-l').value=p.l;
  document.getElementById('p-la').value=p.la;
  document.getElementById('p-h').value=p.h;
  document.getElementById('p-dimu').value=p.dimU||'cm';
  document.getElementById('p-poids').value=p.kg;
  document.getElementById('p-trans').value=p.tr;
  document.getElementById('p-marge').value=p.marge;
  document.getElementById('p-rem').value=p.rem||0;
  document.getElementById('p-conc').value=p.conc||'';
  document.getElementById('p-moq').value=p.moq||1;
  document.getElementById('p-desc').value=p.desc||'';
  document.getElementById('p-specs').value=p.specs||'';
  pics=[...(p.photos||[])];renderThumbs();calcPrev();
  genRef();updateSLink();
}

function genRef(){
  if(editP)return;
  const cat=document.getElementById('p-cat').value;
  if(!cat)return;
  const code=CATS[cat]||'PRD';
  const cn=prods.filter(p=>p.cat===cat).length+1;
  const gn=prods.length+1;
  document.getElementById('p-ref').value=`${code}-${String(cn).padStart(3,'0')}-${String(gn).padStart(3,'0')}`;
}

function updateSLink(){
  const n=document.getElementById('p-nom').value;
  const c=document.getElementById('p-cat').value;
  const q=encodeURIComponent(`${n||c} prix vente marché FCFA XOF`);
  document.getElementById('p-glink').href=`https://www.google.com/search?q=${q}`;
}

function calcPrev(){
  const prix=parseFloat(document.getElementById('p-prix').value);
  const l=parseFloat(document.getElementById('p-l').value);
  const la=parseFloat(document.getElementById('p-la').value);
  const h=parseFloat(document.getElementById('p-h').value);
  const kg=parseFloat(document.getElementById('p-poids').value);
  updateSLink();
  if(!prix||!l||!la||!h||!kg){document.getElementById('calc-prev').style.display='none';return;}
  const p={prix,prach:parseFloat(document.getElementById('p-prach').value)||0,dev:document.getElementById('p-dev').value,l,la,h,dimU:document.getElementById('p-dimu').value,kg,tr:'Maritime',marge:document.getElementById('p-marge').value,rem:0};
  const c=calc(p);
  document.getElementById('calc-prev').style.display='block';
  document.getElementById('calc-prev-rows').innerHTML=`
    <div>CBM: <b>${Nd(c.cbm,4)} m³</b></div>
    <div>Coût d'achat HT: <b>${N(c.exwUX+c.fretLocalX)}</b></div>
    ${c.fTrf?`<div>Frais transfert: <b>${N(c.fTrf*c.tauxChange)}</b></div>`:''}
    ${c.fAss?`<div>Trade Assurance: <b>${N(c.fAss*c.tauxChange)}</b></div>`:''}
    <div>Coût de revient HT: <b>${N(c.coutRevientUX)}</b></div>
    <div>Marge (${document.getElementById('p-marge').value||S.tauxMarge}%): <b style="color:var(--vert-t)">${N(c.margeU)}</b></div>
    <div>Prix de Vente HT: <b>${N(c.pvuHT)}</b></div>
    <div>Frais logistiques: <b>${N(c.fraisLogU)}</b></div>
    <div>Prix de Vente TTC: <b style="color:var(--bleu-t)">${N(c.pvuTTC)}</b></div>`;
}

function saveProd(){
  const nom=document.getElementById('p-nom').value.trim();
  const cat=document.getElementById('p-cat').value;
  if(!nom||!cat){toast('Nom et catégorie requis',true);return;}
  const fid=document.getElementById('p-four').value;
  const f=fours.find(x=>x.id===fid);
  let d={nom,cat,fid,fn:f?f.nom:'',prix:parseFloat(document.getElementById('p-prix').value)||0,
    prach:parseFloat(document.getElementById('p-prach').value)||0,
    dev:document.getElementById('p-dev').value,l:parseFloat(document.getElementById('p-l').value)||0,
    la:parseFloat(document.getElementById('p-la').value)||0,h:parseFloat(document.getElementById('p-h').value)||0,
    dimU:document.getElementById('p-dimu').value,
    kg:parseFloat(document.getElementById('p-poids').value)||0,tr:document.getElementById('p-trans').value,
    marge:document.getElementById('p-marge').value,rem:parseFloat(document.getElementById('p-rem').value)||0,
    conc:document.getElementById('p-conc').value,moq:parseInt(document.getElementById('p-moq').value)||1,
    desc:document.getElementById('p-desc').value,specs:document.getElementById('p-specs').value,photos:[...pics]};
  if(editP){const i=prods.findIndex(p=>p.id===editP);prods[i]={...prods[i],...d};toast('Produit mis à jour ✓');}
  else{
    // Duplication : conserve les champs non couverts par le formulaire (galerie imgs, grp…)
    // sans jamais toucher au produit original (dupSrc est une copie profonde).
    if(dupSrc){d={...dupSrc,...d};}
    d.id='P'+String(Date.now()).slice(-8);d.ref=document.getElementById('p-ref').value||d.id;prods.push(d);
    toast(dupSrc?'Produit dupliqué ✓':'Produit ajouté ✓');
  }
  dupSrc=null;
  save('p');closeMod('prod-modal');renderCat();popSim();syncCartFromProds();
}

function delProd(id){
  if(!confirm('Supprimer ce produit ?'))return;
  prods=prods.filter(p=>p.id!==id);save('p');
  // Retirer aussi du panier de devis pour garder les deux vues synchronisées
  if(devisCart.some(x=>x.pid===id)){devisCart=devisCart.filter(x=>x.pid!==id);saveDevisCartLS();}
  renderCat();popSim();toast('Supprimé');
}

/* ---- PHOTOS ---- */
function addPics(inp){
  Array.from(inp.files).slice(0,3-pics.length).forEach(f=>{
    const r=new FileReader();r.onload=e=>{pics.push(e.target.result);renderThumbs();};r.readAsDataURL(f);
  });inp.value='';
}
function renderThumbs(){
  document.getElementById('p-thumbs').innerHTML=pics.map((s,i)=>`<div class="thumb"><img src="${s}" alt="Photo produit ${i+1}"><button onclick="pics.splice(${i},1);renderThumbs()" aria-label="Supprimer">✕</button></div>`).join('');
}
function addLogo(inp,pid,did){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{
    document.getElementById(did).value=e.target.result;
    document.getElementById(pid).innerHTML=`<div class="thumb"><img src="${e.target.result}" alt="Aperçu de la photo"><button onclick="document.getElementById('${did}').value='';this.closest('.thumb').remove()" aria-label="Supprimer">✕</button></div>`;
  };r.readAsDataURL(f);inp.value='';
}
function previewLogoUrl(){
  const url=document.getElementById('f-logo-url').value.trim();
  const prev=document.getElementById('f-logo-prev');
  const dat=document.getElementById('f-logo-dat');
  if(url){dat.value=url;prev.innerHTML=`<div class="thumb"><img src="${url}" alt="Aperçu du logo" onerror="this.style.display='none'"><button onclick="document.getElementById('f-logo-url').value='';document.getElementById('f-logo-dat').value='';document.getElementById('f-logo-prev').innerHTML=''" aria-label="Supprimer">✕</button></div>`;}
  else{dat.value='';prev.innerHTML='';}
}

/* ---- ALIBABA IMPORT ---- */
function parseAlibabaUrl(){
  const url=document.getElementById('f-ali-import').value.trim();
  if(!url){toast('Collez un lien Alibaba d\'abord',true);return;}
  let nom='',aliUrl=url;
  try{
    const u=new URL(url);
    const host=u.hostname;
    const m=host.match(/^([^.]+)\.(?:m\.)?en\.alibaba\.com$/);
    if(m){
      nom=m[1].replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    }
    if(!nom&&host.includes('alibaba.com')){
      const pathParts=u.pathname.split('/').filter(Boolean);
      const sup=pathParts.find(p=>p.length>3&&!p.includes('.html')&&isNaN(p));
      if(sup)nom=sup.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    }
  }catch(e){}
  if(!nom){toast('URL non reconnue — remplissez le nom manuellement',true);document.getElementById('f-ali-url').value=url;return;}
  document.getElementById('f-nom').value=nom;
  document.getElementById('f-pays').value='Chine';
  document.getElementById('f-lang').value='Chinois, Anglais';
  document.getElementById('f-ali').value='Vérifié';
  document.getElementById('f-ali-url').value=aliUrl;
  toast(`"${nom}" importé depuis Alibaba ✓`);
}

/* ---- FOURNISSEURS ---- */
function renderFour(){
  const q=(document.getElementById('four-search').value||'').toLowerCase();
  const list=fours.filter(f=>!q||f.nom.toLowerCase().includes(q)||(f.pays||'').toLowerCase().includes(q)||(f.contact||'').toLowerCase().includes(q));
  const c=document.getElementById('four-cont');
  if(!list.length){c.innerHTML='<div class="empty"><div class="empty-ico">'+ICO('factory')+'</div><h3>Aucun fournisseur</h3></div>';return;}
  c.innerHTML=`<div class="grid">${list.map(f=>{
    const np=prods.filter(p=>p.fid===f.id).length;
    const ev=parseInt(f.eval)||0;const stars=Array.from({length:5},(_,i)=>ICO('star','star'+(i<ev?' on':''))).join('');
    const logoEl=f.logo?`<img src="${f.logo}" class="four-logo" alt="${String(f.nom||'').replace(/"/g,'&quot;')}" onerror="this.style.display='none'">`:`<div class="ph-sm" style="width:56px;height:56px;border-radius:12px;background:var(--gris);border:1px solid var(--border);flex-shrink:0">${ICO('factory')}</div>`;
    return`<div class="card">
      <div class="card-body">
        <div class="four-card-hdr">
          ${logoEl}
          <div class="four-info">
            <div class="card-title" style="font-size:14px">${f.nom}</div>
            <div style="font-size:11px;color:var(--muted)">${f.pays||''}</div>
            <div style="margin-top:3px">${stars} <span style="font-size:10px;color:var(--muted)">${np} produit${np>1?'s':''}</span></div>
          </div>
        </div>
        ${f.contact?`<div class="info-row">${ICO('user')} <b>${f.contact}</b></div>`:''}
        ${f.email?`<div class="info-row">${ICO('mail')} <a href="mailto:${f.email}">${f.email}</a></div>`:''}
        ${f.wa?`<div class="info-row">${ICO('phone')} <a href="https://wa.me/${f.wa.replace(/\D/g,'')}">${f.wa}</a></div>`:''}
        ${f.wc?`<div class="info-row">${ICO('msg')} WeChat : ${f.wc}</div>`:''}
        ${f.dom?`<div class="info-row" style="margin-top:4px">${ICO('factory')} ${f.dom}</div>`:''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          ${f.ali!=='Non disponible'?`<span style="background:${f.ali==='Vérifié'?'var(--ok-bg)':'#fef3c7'};color:${f.ali==='Vérifié'?'var(--ok)':'#92400e'};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${f.ali==='Vérifié'?'✓ Vérifié Alibaba':'Alibaba'}</span>`:''}
          ${f.ali_url?`<a href="${f.ali_url}" target="_blank" style="font-size:10px;color:var(--bleu);text-decoration:none;padding:2px 8px;border:1px solid var(--bleu);border-radius:10px">↗ Alibaba</a>`:''}
          ${f.devis?`<a href="${f.devis}" target="_blank" class="devis-btn">${ICO('file')} Devis PDF</a>`:''}
        </div>
        <div class="card-acts">
          <button class="btn btn-sec btn-sm" onclick="openFourModal('${f.id}')">${ICO('pencil')} Modifier</button>
          <button class="btn btn-danger btn-sm" onclick="delFour('${f.id}')">${ICO('trash')}</button>
        </div>
      </div></div>`;
  }).join('')}</div>`;
}

function openFourModal(id=null){
  editF=id;
  document.getElementById('f-logo-dat').value='';
  document.getElementById('f-logo-prev').innerHTML='';
  document.getElementById('f-logo-url').value='';
  document.getElementById('f-ali-import').value='';
  if(id){
    const f=fours.find(x=>x.id===id);
    document.getElementById('fm-title').textContent='Modifier le fournisseur';
    document.getElementById('f-nom').value=f.nom||'';
    document.getElementById('f-contact').value=f.contact||'';
    document.getElementById('f-pays').value=f.pays||'';
    document.getElementById('f-email').value=f.email||'';
    document.getElementById('f-wa').value=f.wa||'';
    document.getElementById('f-wc').value=f.wc||'';
    document.getElementById('f-dom').value=f.dom||'';
    document.getElementById('f-an').value=f.an||'';
    document.getElementById('f-eval').value=f.eval||3;
    document.getElementById('f-ali').value=f.ali||'Non disponible';
    document.getElementById('f-ali-url').value=f.ali_url||'';
    document.getElementById('f-devis').value=f.devis||'';
    document.getElementById('f-lang').value=f.lang||'';
    document.getElementById('f-mkt').value=f.mkt||'';
    document.getElementById('f-desc').value=f.desc||'';
    document.getElementById('f-com').value=f.com||'';
    if(f.logo){
      document.getElementById('f-logo-dat').value=f.logo;
      if(f.logo.startsWith('http')){
        document.getElementById('f-logo-url').value=f.logo;
        document.getElementById('f-logo-prev').innerHTML=`<div class="thumb"><img src="${f.logo}" alt="Logo" onerror="this.style.display='none'"><button onclick="document.getElementById('f-logo-url').value='';document.getElementById('f-logo-dat').value='';document.getElementById('f-logo-prev').innerHTML=''" aria-label="Supprimer">✕</button></div>`;
      }else{
        document.getElementById('f-logo-prev').innerHTML=`<div class="thumb"><img src="${f.logo}" alt="Logo"><button onclick="document.getElementById('f-logo-dat').value='';document.getElementById('f-logo-prev').innerHTML=''" aria-label="Supprimer">✕</button></div>`;
      }
    }
  }else{
    document.getElementById('fm-title').textContent='Nouveau fournisseur';
    ['f-nom','f-contact','f-pays','f-email','f-wa','f-wc','f-dom','f-an','f-ali-url','f-devis','f-lang','f-mkt','f-desc','f-com'].forEach(x=>document.getElementById(x).value='');
    document.getElementById('f-eval').value=3;document.getElementById('f-ali').value='Non disponible';
  }
  openMod('four-modal');
}

function saveFour(){
  const nom=document.getElementById('f-nom').value.trim();
  if(!nom){toast('Nom requis',true);return;}
  const logoVal=document.getElementById('f-logo-dat').value||document.getElementById('f-logo-url').value;
  const d={nom,contact:document.getElementById('f-contact').value,pays:document.getElementById('f-pays').value,
    email:document.getElementById('f-email').value,
    wa:document.getElementById('f-wa').value,wc:document.getElementById('f-wc').value,dom:document.getElementById('f-dom').value,
    an:document.getElementById('f-an').value,eval:document.getElementById('f-eval').value,
    ali:document.getElementById('f-ali').value,ali_url:document.getElementById('f-ali-url').value,
    devis:document.getElementById('f-devis').value,
    lang:document.getElementById('f-lang').value,mkt:document.getElementById('f-mkt').value,
    desc:document.getElementById('f-desc').value,com:document.getElementById('f-com').value,
    logo:logoVal};
  if(editF){const i=fours.findIndex(f=>f.id===editF);fours[i]={...fours[i],...d};toast('Fournisseur mis à jour ✓');}
  else{d.id='F'+String(Date.now()).slice(-6);fours.push(d);toast('Fournisseur ajouté ✓');}
  save('f');closeMod('four-modal');renderFour();
}

function delFour(id){
  if(!confirm('Supprimer ce fournisseur ?'))return;
  fours=fours.filter(f=>f.id!==id);save('f');renderFour();toast('Supprimé');
}

/* ---- TRANSITAIRES ---- */
function renderTrans(){
  const q=(document.getElementById('tr-search').value||'').toLowerCase();
  const list=trans.filter(t=>!q||t.nom.toLowerCase().includes(q));
  const c=document.getElementById('trans-cont');
  if(!list.length){c.innerHTML='<div class="empty"><div class="empty-ico">'+ICO('ship')+'</div><h3>Aucun transitaire</h3><p>Ajoutez votre premier transitaire.</p></div>';return;}
  c.innerHTML=`<div class="grid">${list.map(t=>`<div class="card">
    <div class="card-img" style="height:80px">${t.logo?`<img src="${t.logo}" alt="">`:PH_SM}</div>
    <div class="card-body">
      <div class="card-title">${t.nom}</div>
      <div class="card-cat">${t.dep||''} → ${t.arr||''} · ${t.type||''}</div>
      <div style="font-size:11px;margin-top:6px;display:flex;flex-direction:column;gap:3px">
        ${t.mar?`<span>${ICO('ship')} ${parseInt(t.mar).toLocaleString('fr-FR')} XOF/CBM${t.mard?' · '+t.mard+'j':''}</span>`:''}
        ${t.aer?`<span>${ICO('plane')} ${parseInt(t.aer).toLocaleString('fr-FR')} XOF/kg${t.aerd?' · '+t.aerd+'j':''}</span>`:''}
        ${t.wa?`<span>${ICO('phone')} ${t.wa}</span>`:''}
      </div>
      <div class="card-acts">
        <button class="btn btn-sec btn-sm" onclick="openTransModal('${t.id}')">${ICO('pencil')}</button>
        <button class="btn btn-danger btn-sm" onclick="delTrans('${t.id}')">${ICO('trash')}</button>
      </div>
    </div></div>`).join('')}</div>`;
}

function openTransModal(id=null){
  editT=id;
  document.getElementById('t-logo-dat').value='';document.getElementById('t-logo-prev').innerHTML='';
  if(id){
    const t=trans.find(x=>x.id===id);
    document.getElementById('tm-title').textContent='Modifier le transitaire';
    document.getElementById('t-nom').value=t.nom||'';document.getElementById('t-dep').value=t.dep||'';
    document.getElementById('t-arr').value=t.arr||'';document.getElementById('t-contact').value=t.contact||'';
    document.getElementById('t-wa').value=t.wa||'';document.getElementById('t-tel').value=t.tel||'';
    document.getElementById('t-type').value=t.type||'Maritime';document.getElementById('t-ent').value=t.ent||0;
    document.getElementById('t-mar').value=t.mar||'';document.getElementById('t-mard').value=t.mard||'';
    document.getElementById('t-aer').value=t.aer||'';document.getElementById('t-aerd').value=t.aerd||'';
    document.getElementById('t-ass').value=t.ass||'0';
    if(t.logo){document.getElementById('t-logo-dat').value=t.logo;document.getElementById('t-logo-prev').innerHTML=`<div class="thumb"><img src="${t.logo}" alt="Logo"></div>`;}
  }else{
    document.getElementById('tm-title').textContent='Nouveau transitaire';
    ['t-nom','t-dep','t-arr','t-contact','t-wa','t-tel','t-mar','t-mard','t-aer','t-aerd'].forEach(x=>document.getElementById(x).value='');
    document.getElementById('t-type').value='Maritime';document.getElementById('t-ent').value=0;document.getElementById('t-ass').value='0';
  }
  openMod('trans-modal');
}

function saveTrans(){
  const nom=document.getElementById('t-nom').value.trim();
  if(!nom){toast('Nom requis',true);return;}
  const d={nom,dep:document.getElementById('t-dep').value,arr:document.getElementById('t-arr').value,
    contact:document.getElementById('t-contact').value,wa:document.getElementById('t-wa').value,
    tel:document.getElementById('t-tel').value,type:document.getElementById('t-type').value,
    ent:document.getElementById('t-ent').value,mar:document.getElementById('t-mar').value,
    mard:document.getElementById('t-mard').value,aer:document.getElementById('t-aer').value,
    aerd:document.getElementById('t-aerd').value,ass:document.getElementById('t-ass').value,
    logo:document.getElementById('t-logo-dat').value};
  if(editT){const i=trans.findIndex(t=>t.id===editT);trans[i]={...trans[i],...d};toast('Transitaire mis à jour ✓');}
  else{d.id='T'+String(Date.now()).slice(-6);trans.push(d);toast('Transitaire ajouté ✓');}
  save('t');closeMod('trans-modal');renderTrans();popSim();
}

function delTrans(id){
  if(!confirm('Supprimer ?'))return;
  trans=trans.filter(t=>t.id!==id);save('t');renderTrans();popSim();toast('Supprimé');
}

/* ---- SIMULATION ---- */
function popSim(){
  const sp=document.getElementById('sim-prod'),cur=sp.value;
  sp.innerHTML='<option value="">— Sélectionner —</option>';
  prods.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.ref} — ${p.nom}`;if(p.id===cur)o.selected=true;sp.appendChild(o);});
  const sf=document.getElementById('sim-four'),curf=sf.value;
  sf.innerHTML='<option value="">— Auto —</option>';
  fours.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.nom;if(f.id===curf)o.selected=true;sf.appendChild(o);});
  const st=document.getElementById('sim-trans'),curt=st.value;
  st.innerHTML='<option value="">— Défaut —</option>';
  trans.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.nom;if(t.id===curt)o.selected=true;st.appendChild(o);});
}

function setSimTrans(m){
  simTr=m;
  document.getElementById('tb-mar').classList.toggle('active',m==='Maritime');
  document.getElementById('tb-aer').classList.toggle('active',m==='Aérien');
  simCalc();
}

function simSelProd(){
  const id=document.getElementById('sim-prod').value;
  const prev=document.getElementById('sim-prev');
  if(!id){prev.style.display='none';document.getElementById('sim-rows').innerHTML='<div style="text-align:center;opacity:.4;padding:40px 0;font-size:13px">Sélectionnez un produit</div>';return;}
  const p=prods.find(x=>x.id===id);
  prev.style.display='flex';
  document.getElementById('sim-name').textContent=p.nom;
  document.getElementById('sim-ref').textContent=p.ref;
  document.getElementById('sim-specs').textContent=`${p.l}×${p.la}×${p.h} ${p.dimU||'cm'} · ${p.kg} kg · ${p.cat}`;
  const ico=document.getElementById('sim-ico');
  if(p.photos&&p.photos[0]){
    ico.innerHTML=`<img src="${p.photos[0]}" style="width:70px;height:70px;object-fit:cover" alt="" onerror="phFallback(this)">`;
  }else{
    ico.innerHTML=PH_LG;
  }
  setSimTrans(p.tr||'Maritime');
  const c=calc(p);
  document.getElementById('sim-pv').value=Math.round(c.pvuHT);
  simCalc();
}

function simCalc(){
  const id=document.getElementById('sim-prod').value;
  if(!id)return;
  const p=prods.find(x=>x.id===id);
  const qty=parseInt(document.getElementById('sim-qty').value)||1;
  const rem=parseFloat(document.getElementById('sim-rem').value)||0;
  const assujetti=document.getElementById('sim-tva').value==='1';
  const assSel=document.getElementById('sim-ass').value;
  const tid=document.getElementById('sim-trans').value;
  const tr=trans.find(x=>x.id===tid);
  const fa=tr&&tr.aer?parseFloat(tr.aer):S.tarifAerien;
  const fm=tr&&tr.mar?parseFloat(tr.mar):S.tarifMaritime;
  const o={tr:simTr,fa,fm,qty,rem,assujetti};
  if(assSel!=='def')o.assu=assSel==='1';
  let c=calc(p,o);
  // Un Prix de Vente HT saisi remplace le prix calculé ; la marge est alors recalculée
  const pvInput=parseFloat(document.getElementById('sim-pv').value);
  if(pvInput){
    const pvuHT=r2(pvInput-pvInput*rem/100);
    const margeU=r2(pvuHT-c.coutRevientUX);
    const pvtHT=r2(pvuHT*qty);
    const tvaM=(assujetti&&S.tvaInterne)?r2(pvtHT*S.tvaInterne/100):0;
    c={...c,pvuHT,pvtHT,margeU,margeTot:r2(margeU*qty),
      margePct:c.coutRevientUX>0?r2(margeU/c.coutRevientUX*100):0,
      pvuTTC:r2(pvuHT+c.fraisLogU),pvtTTC:r2(pvtHT+c.fraisLog),
      tvaM,totalAvecTVA:r2(pvtHT+c.fraisLog+tvaM)};
  }
  const f=fours.find(x=>x.id===p.fid);
  const sym={RMB:'¥',USD:'$',EUR:'€',XOF:'F'}[c.dev]||c.dev;
  const D=v=>Nd(v,2)+' '+sym;
  const V=cmVisible('simulation');
  document.getElementById('sim-rows').innerHTML=`
    ${V.produit?`<div class="sim-row"><span>Produit</span><span style="text-align:right;max-width:200px">${p.nom}</span></div>`:''}
    ${V.ref?`<div class="sim-row"><span>Référence</span><span>${p.ref}</span></div>`:''}
    ${V.four?`<div class="sim-row"><span>Fournisseur</span><span>${f?fourLabel(f):'—'}</span></div>`:''}
    ${V.moq?`<div class="sim-row"><span>MOQ</span><span>${p.moq||1}</span></div>`:''}
    ${V.specs?`<div class="sim-row"><span>Spécificités</span><span style="text-align:right;max-width:220px">${truncTxt(p.specs,80)}</span></div>`:''}
    ${V.desc?`<div class="sim-row"><span>Description</span><span style="text-align:right;max-width:220px">${truncTxt(p.desc,100)}</span></div>`:''}
    ${V.qte?`<div class="sim-row"><span>Quantité</span><span>${qty} unité${qty>1?'s':''}</span></div>`:''}
    ${V.transport?`
    <div class="sim-row"><span>Transport</span><span>${simTr==='Maritime'?ICO('ship'):ICO('plane')} ${simTr}</span></div>
    <div class="sim-row"><span>CBM total</span><span>${Nd(c.cbmTot,4)} m³</span></div>
    <div class="sim-row"><span>Poids total</span><span>${Nd(p.kg*qty,2)} kg</span></div>`:''}
    ${V.achat||V.revient_u?`<div class="sim-sec">Étape 1 · Coût de revient HT (${c.dev})</div>`:''}
    ${V.achat?`
    <div class="sim-row"><span>Coût d'achat HT (EXW × qté${parseFloat(p.prach)?' + fret local':''})</span><span>${D(c.coutAchat)}</span></div>
    ${c.fTrf?`<div class="sim-row"><span>Frais transfert de fonds${S.trf.mode==='pct'?' ('+S.trf.val+'%)':''}</span><span>${D(c.fTrf)}</span></div>`:''}
    ${c.fAss?`<div class="sim-row"><span>Trade Assurance${S.assu.mode==='pct'?' ('+S.assu.val+'%)':''}</span><span>${D(c.fAss)}</span></div>`:''}
    <div class="sim-row"><span>Coût de revient HT</span><span style="font-weight:600">${D(c.coutRevient)}</span></div>`:''}
    ${V.revient_u?`<div class="sim-row"><span>Coût de revient unitaire HT</span><span>${D(c.coutRevientU)}</span></div>`:''}
    ${V.taux||V.marge||V.vente_ht||V.revient_u?`<div class="sim-sec">Étape 2 · Prix de Vente HT (XOF)</div>`:''}
    ${V.taux?`<div class="sim-row"><span>Taux de change</span><span>1 ${c.dev} = ${Nd(c.tauxChange,2)} XOF</span></div>`:''}
    ${V.revient_u?`<div class="sim-row"><span>Coût de revient unitaire (XOF)</span><span>${N(c.coutRevientUX)}</span></div>`:''}
    ${V.marge?`<div class="sim-row"><span>Marge unitaire</span><span style="color:#4ade80">${N(c.margeU)} (${Nd(c.margePct,1)}%)</span></div>
    ${rem>0?`<div class="sim-row"><span>Remise (${rem}%)</span><span>incluse</span></div>`:''}`:''}
    ${V.vente_ht?`
    <div class="sim-row"><span>Prix de Vente unitaire HT</span><span style="font-weight:600">${N(c.pvuHT)}</span></div>
    <div class="sim-row"><span>Prix de Vente total HT</span><span style="font-weight:600">${N(c.pvtHT)}</span></div>`:''}
    ${V.fret||V.vente_ttc?`<div class="sim-sec">Étape 3 · Prix de Vente TTC (estimation)</div>`:''}
    ${V.fret?`<div class="sim-row"><span>Frais logistiques (Transitaire) — tout-compris</span><span>${N(c.fraisLog)}</span></div>`:''}
    ${V.vente_ttc?`<div class="sim-row"><span>Prix de Vente unitaire TTC</span><span>${N(c.pvuTTC)}</span></div>`:''}
    ${c.tvaM?`<div class="sim-row"><span>TVA interne (${S.tvaInterne}%) — client assujetti</span><span>${N(c.tvaM)}</span></div>`:''}
    <hr style="border-color:rgba(255,255,255,.08);margin:6px 0">
    <div class="sim-row sim-total"><span>PRIX DE VENTE TOTAL TTC</span><span>${N(c.totalAvecTVA)}</span></div>
    ${V.marge_tot?`<div class="sim-row sim-marge"><span>Marge totale</span><span>${N(c.margeTot)} (${Nd(c.margePct,1)}%)</span></div>`:''}`;
}

function qsim(id){tab('simulation');document.getElementById('sim-prod').value=id;simSelProd();}

/* ---- EXPORT CSV ----
   Synchronisé sur les colonnes cochées dans le catalogue (sélection brute,
   sans auto-masquage mobile) : une colonne décochée n'apparaît pas dans le CSV. */
function exportCSV(){
  const csvEsc=v=>{v=String(v??'');return/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  // clé catalogue → colonnes CSV [en-tête, valeur(p, calc, fournisseur)]
  const MAP={
    ref:    [['Référence',(p)=>p.ref]],
    nom:    [['Désignation',(p)=>p.nom]],
    cat:    [['Catégorie',(p)=>p.cat]],
    four:   [['Fournisseur',(p,c,f)=>f?f.nom:p.fn||'']],
    moq:    [['MOQ',(p)=>p.moq||1]],
    specs:  [['Spécificités',(p)=>p.specs||'']],
    desc:   [['Description',(p)=>p.desc||'']],
    cbm:    [['CBM m3',(p,c)=>Nd(c.cbm,4)]],
    poids:  [['Poids kg',(p)=>p.kg]],
    achat:  [['Devise',(p)=>p.dev||'RMB'],['Prix EXW (devise)',(p)=>p.prix],['Coût achat HT (devise)',(p,c)=>Nd(c.coutAchat)]],
    prach:  [['Fret local (devise)',(p)=>p.prach||0]],
    revient:[['Frais transfert (devise)',(p,c)=>Nd(c.fTrf)],['Trade Assurance (devise)',(p,c)=>Nd(c.fAss)],['Coût de revient HT (devise)',(p,c)=>Nd(c.coutRevient)],['Taux change',(p,c)=>c.tauxChange],['Coût de revient HT (XOF)',(p,c)=>Math.round(c.coutRevientUX)]],
    fret:   [['Transport',(p)=>p.tr],['Frais logistiques Transitaire (XOF)',(p,c)=>Math.round(c.fraisLogU)]],
    marge:  [['Marge %',(p,c)=>Nd(c.margePct,1)],['Marge (XOF)',(p,c)=>Math.round(c.margeU)],['Remise %',(p)=>p.rem||0]],
    vente:  [['Prix de Vente HT (XOF)',(p,c)=>Math.round(c.pvuHT)]],
    ttc:    [['Prix de Vente TTC (XOF)',(p,c)=>Math.round(c.pvuTTC)]],
    delai:  [['Délai',(p)=>prodDelai(p)]],
    marche: [['Prix marché XOF',(p)=>p.conc||'']],
  };
  const active=CM_DEFS.catalogue.filter(d=>colStore.catalogue.visible.includes(d.k)&&MAP[d.k]).flatMap(d=>MAP[d.k]);
  if(!active.length){toast('Aucune colonne cochée — rien à exporter',true);return;}
  const rows=prods.map(p=>{
    const f=fours.find(x=>x.id===p.fid);const c=calc(p);
    return active.map(([,fn])=>csvEsc(fn(p,c,f))).join(';');
  });
  const csv=[active.map(([h])=>csvEsc(h)).join(';'),...rows].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`GoFlow_Catalogue_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  toast('Export CSV téléchargé ✓');
}

