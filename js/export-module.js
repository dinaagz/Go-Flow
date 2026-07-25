/* ============================================================
   MODULE EXPORT IMAGES DESIGN — PNG 1080×1080 via canvas
   Sélection par cases à cocher dans le Catalogue, 6 templates,
   couleurs personnalisables, logo positionnable, aperçu live,
   téléchargement PNG unitaires ou ZIP (writer natif sans lib).
   Infos affichées : mêmes clés que les colonnes du catalogue —
   synchro par défaut, personnalisables + réordonnables (drag & drop).
   Préférences mémorisées dans gf_exp.
   ============================================================ */
const EXK='gf_exp';
const EXP_TPLS=[
  {k:'classique',lbl:'Classique',sw:'linear-gradient(180deg,#fff 60%,#F2F4FA 60%)'},
  {k:'gradient',lbl:'Gradient Go',sw:'linear-gradient(135deg,#FF2244,#FF6600,#FFD700,#00CC77,#0099FF,#7733FF)'},
  {k:'nuit',lbl:'Nuit premium',sw:'#1A1A2E'},
  {k:'minimal',lbl:'Minimal',sw:'#F4F6FA'},
  {k:'badge',lbl:'Badge prix',sw:'radial-gradient(circle at 72% 28%,#FFD700 20%,#E9EDF6 21%)'},
  {k:'catalogue',lbl:'Fiche catalogue',sw:'linear-gradient(90deg,#E9EDF6 50%,#fff 50%)'},
];
let expMode=false,expSel=new Set(),expIdx=0,expPrevSeq=0,expDragKey=null;
let expPrefs={tpl:'classique',bg:'#FFFFFF',txt:'#1A1D33',logoPos:'br',showMarge:false,infosOn:null,infosOrder:null};
// Les préférences persistées (IndexedDB) sont fusionnées dans l'objet existant (mêmes références) par expLoadPrefs(), appelée depuis init()
async function expLoadPrefs(){Object.assign(expPrefs,await IDB_GET(EXK,{}));}

/* ---- Informations affichées sur l'image ----
   Mêmes clés que les colonnes du catalogue (CM_DEFS.catalogue) : tant que
   l'utilisateur n'a pas personnalisé (infosOn===null), l'export reprend
   les colonnes visibles du catalogue ; ses choix et leur ordre sont ensuite
   mémorisés dans gf_exp (infosOn / infosOrder). */
const EXP_INFOS=[
  {k:'cat',    lbl:'Catégorie',          v:p=>p.cat||''},
  {k:'four',   lbl:'Fournisseur',        v:p=>{const f=fours.find(x=>x.id===p.fid);return f?f.nom:(p.fn||'');}},
  {k:'moq',    lbl:'MOQ',                v:p=>String(p.moq||1)},
  {k:'specs',  lbl:'Spécificités',       v:p=>p.specs?String(p.specs).slice(0,60):''},
  {k:'desc',   lbl:'Description',        v:p=>p.desc?String(p.desc).slice(0,60):''},
  {k:'cbm',    lbl:'CBM',                v:(p,c)=>c.cbm?Nd(c.cbm,4)+' m³':''},
  {k:'poids',  lbl:'Poids',              v:p=>p.kg?p.kg+' kg':''},
  {k:'achat',  lbl:'Achat EXW',          v:(p,c)=>N(c.exwUX)},
  {k:'prach',  lbl:'Fret local',         v:(p,c)=>c.fretLocalX?N(c.fretLocalX):''},
  {k:'revient',lbl:'Coût de Revient HT', v:(p,c)=>N(c.coutRevientUX)},
  {k:'fret',   lbl:'Frais logistiques',  v:(p,c)=>N(c.fraisLogU)},
  {k:'marge',  lbl:'Marge',              v:(p,c)=>N(c.margeU)+' ('+Nd(c.margePct,1)+'%)'},
  {k:'vente',  lbl:'Prix de Vente HT',   v:(p,c)=>N(c.pvuHT)},
  {k:'ttc',    lbl:'Prix de Vente TTC',  v:(p,c)=>N(c.pvuTTC),big:true},
  {k:'delai',  lbl:'Délai livraison',    v:p=>prodDelai(p)},
  {k:'marche', lbl:'Prix marché',        v:p=>p.conc?parseInt(p.conc).toLocaleString('fr-FR')+' XOF':''},
];
// État effectif {order:[clé…], on:[clé…]} — infosOn null en prefs = synchro catalogue
function expInfoState(){
  const all=EXP_INFOS.map(i=>i.k);
  const so=Array.isArray(expPrefs.infosOrder)?expPrefs.infosOrder.filter(k=>all.includes(k)):[];
  const order=so.concat(all.filter(k=>!so.includes(k)));
  let on;
  if(Array.isArray(expPrefs.infosOn))on=expPrefs.infosOn.filter(k=>all.includes(k));
  else{
    const vis=cmVisible('catalogue');
    on=all.filter(k=>vis[k]);
    if(expPrefs.showMarge&&!on.includes('marge'))on.push('marge'); // reprise de l'ancienne préférence
  }
  return{order,on};
}
function expInfoSave(st){
  expPrefs.infosOrder=st.order;expPrefs.infosOn=st.on;
  IDB_SET(EXK,expPrefs);expRenderInfos();expPreview();
}
function expInfoToggle(k,on){
  const st=expInfoState();
  st.on=st.order.filter(x=>x===k?on:st.on.includes(x));
  expInfoSave(st);
}
function expInfoMove(k,d){
  const st=expInfoState();
  const i=st.order.indexOf(k),j=i+d;
  if(i<0||j<0||j>=st.order.length)return;
  st.order.splice(j,0,st.order.splice(i,1)[0]);
  st.on=st.order.filter(x=>st.on.includes(x));
  expInfoSave(st);
}
function expInfoMoveTo(k,before){
  const st=expInfoState();
  const from=st.order.indexOf(k),to=st.order.indexOf(before);
  if(from<0||to<0||from===to)return;
  st.order.splice(to,0,st.order.splice(from,1)[0]);
  st.on=st.order.filter(x=>st.on.includes(x));
  expInfoSave(st);
}
function expSyncCat(){
  expPrefs.infosOn=null;expPrefs.infosOrder=null;
  IDB_SET(EXK,expPrefs);expRenderInfos();expPreview();
  toast('Informations synchronisées avec les colonnes du catalogue ✓');
}
function expInfoDragStart(e,k){expDragKey=k;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',k);}catch(_){}}
function expInfoDragOver(e,k){if(!expDragKey||expDragKey===k)return;e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drag-over');}
function expInfoDrop(e,k){
  e.preventDefault();e.currentTarget.classList.remove('drag-over');
  if(expDragKey&&expDragKey!==k)expInfoMoveTo(expDragKey,k);
  expDragKey=null;
}
function expRenderInfos(){
  const host=document.getElementById('exp-infos');if(!host)return;
  const st=expInfoState();
  host.innerHTML=st.order.map((k,i)=>{
    const d=EXP_INFOS.find(x=>x.k===k),on=st.on.includes(k);
    return`<div class="exp-info-row${on?'':' off'}" draggable="true" ondragstart="expInfoDragStart(event,'${k}')" ondragover="expInfoDragOver(event,'${k}')" ondragleave="this.classList.remove('drag-over')" ondrop="expInfoDrop(event,'${k}')" ondragend="expDragKey=null">
      <span class="exp-drag" title="Glisser pour réordonner" aria-hidden="true"><i></i><i></i><i></i></span>
      <label><input type="checkbox" ${on?'checked':''} onchange="expInfoToggle('${k}',this.checked)" aria-label="Afficher ${d.lbl} sur l'image">${d.lbl}</label>
      <span class="exp-updown">
        <button onclick="expInfoMove('${k}',-1)" ${i===0?'disabled':''} aria-label="Monter ${d.lbl}"><svg class="ic" style="transform:rotate(-90deg)" aria-hidden="true"><use href="#i-chev"/></svg></button>
        <button onclick="expInfoMove('${k}',1)" ${i===st.order.length-1?'disabled':''} aria-label="Descendre ${d.lbl}"><svg class="ic" style="transform:rotate(90deg)" aria-hidden="true"><use href="#i-chev"/></svg></button>
      </span>
    </div>`;
  }).join('');
  const hint=document.getElementById('exp-infos-hint');
  if(hint)hint.textContent=(Array.isArray(expPrefs.infosOn)?'Personnalisé':'Synchronisé avec le catalogue')+` — ${st.on.length}/${st.order.length} infos`;
  const sync=document.getElementById('exp-sync-btn');
  if(sync)sync.style.display=Array.isArray(expPrefs.infosOn)?'':'none';
}

/* ---- Mode sélection dans le Catalogue ---- */
function expBox(id){
  if(!expMode)return'';
  return`<label class="exp-check"><input type="checkbox" ${expSel.has(id)?'checked':''} onchange="expToggle('${id}',this.checked)" aria-label="Sélectionner ce produit pour l'export image"></label>`;
}
function expToggle(id,on){if(on)expSel.add(id);else expSel.delete(id);expBarUpdate();}
function expToggleMode(){
  expMode=!expMode;
  if(!expMode)expSel.clear();
  const b=document.getElementById('exp-mode-btn');
  if(b)b.setAttribute('aria-pressed',expMode);
  document.getElementById('exp-bar').style.display=expMode?'flex':'none';
  expBarUpdate();renderCat();
  if(expMode)toast('Cochez les produits à exporter, puis « Exporter en image »');
}
function expBarUpdate(){
  const n=expSel.size;
  document.getElementById('exp-count').textContent=`${n} produit${n>1?'s':''} sélectionné${n>1?'s':''}`;
}
function expSelectAll(){
  const q=(document.getElementById('cat-search').value||'').toLowerCase();
  const fc=document.getElementById('f-cat').value,fv=document.getElementById('f-four').value;
  prods.filter(p=>(!q||p.nom.toLowerCase().includes(q)||p.ref.toLowerCase().includes(q)||(p.cat||'').toLowerCase().includes(q))&&(!fc||p.cat===fc)&&(!fv||p.fid===fv))
    .forEach(p=>expSel.add(p.id));
  expBarUpdate();renderCat();
}

/* ---- Modal de personnalisation + aperçu ---- */
function openExportModal(){
  if(!expSel.size){toast('Cochez au moins un produit à exporter',true);return;}
  expIdx=0;
  document.getElementById('exp-bg').value=expPrefs.bg;
  document.getElementById('exp-txt').value=expPrefs.txt;
  document.getElementById('exp-logo').value=expPrefs.logoPos;
  expRenderTpls();expRenderInfos();
  openMod('export-modal');
  expPreview();
}
function expRenderTpls(){
  document.getElementById('exp-tpls').innerHTML=EXP_TPLS.map(t=>
    `<button class="tpl-btn${expPrefs.tpl===t.k?' active':''}" onclick="expSetTpl('${t.k}')" aria-pressed="${expPrefs.tpl===t.k}"><span class="tpl-sw" style="background:${t.sw}"></span>${t.lbl}</button>`).join('');
}
function expSetTpl(k){expPrefs.tpl=k;IDB_SET(EXK,expPrefs);expRenderTpls();expPreview();}
function expPrefChange(){
  expPrefs.bg=document.getElementById('exp-bg').value;
  expPrefs.txt=document.getElementById('exp-txt').value;
  expPrefs.logoPos=document.getElementById('exp-logo').value;
  IDB_SET(EXK,expPrefs);expPreview();
}
function expNav(d){const n=expSel.size;if(!n)return;expIdx=(expIdx+d+n)%n;expPreview();}
async function expPreview(){
  const ids=[...expSel];if(!ids.length)return;
  if(expIdx>=ids.length)expIdx=0;
  document.getElementById('exp-nav-lbl').textContent=`${expIdx+1}/${ids.length}`;
  const p=prods.find(x=>x.id===ids[expIdx]);if(!p)return;
  const seq=++expPrevSeq;
  await document.fonts.ready;
  const img=await expLoadImg(p.photos&&p.photos[0]);
  if(seq!==expPrevSeq)return; // une prévisualisation plus récente est en cours
  expDraw(document.getElementById('exp-canvas'),p,img);
}
// crossOrigin obligatoire : une image sans CORS rendrait le canvas inexportable (taint)
function expLoadImg(src){
  return new Promise(res=>{
    if(!src)return res(null);
    const im=new Image();
    im.crossOrigin='anonymous';
    im.onload=()=>res(im);im.onerror=()=>res(null);
    im.src=src;
  });
}

/* ---- Rendu canvas 1080×1080 ---- */
function expRRect(x,px,py,w,h,r){
  x.beginPath();x.moveTo(px+r,py);
  x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);
  x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();
}
function expCover(x,img,px,py,w,h,r){
  x.save();
  if(r)expRRect(x,px,py,w,h,r);else{x.beginPath();x.rect(px,py,w,h);}
  x.clip();
  if(img){
    const s=Math.max(w/img.width,h/img.height);
    x.drawImage(img,px+(w-img.width*s)/2,py+(h-img.height*s)/2,img.width*s,img.height*s);
  }else{
    x.fillStyle='#E9EDF6';x.fillRect(px,py,w,h);
    x.strokeStyle='#C4CBDE';x.lineWidth=7;x.lineJoin='round';
    const cx=px+w/2,cy=py+h/2;
    x.strokeRect(cx-70,cy-70,140,140);
    x.beginPath();x.moveTo(cx-70,cy-22);x.lineTo(cx+70,cy-22);x.moveTo(cx,cy-22);x.lineTo(cx,cy+70);x.stroke();
  }
  x.restore();
}
function expGrad(x,x0,y0,x1,y1){
  const g=x.createLinearGradient(x0,y0,x1,y1);
  [['#FF2244',0],['#FF6600',.2],['#FFD700',.4],['#00CC77',.6],['#0099FF',.8],['#7733FF',1]].forEach(([c,s])=>g.addColorStop(s,c));
  return g;
}
function expWrap(x,text,px,py,maxW,lh,maxLines){
  const words=String(text||'').split(/\s+/);let line='',lines=[];
  words.forEach(w=>{const t=line?line+' '+w:w;if(x.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;});
  if(line)lines.push(line);
  if(lines.length>maxLines){lines=lines.slice(0,maxLines);lines[maxLines-1]=lines[maxLines-1].slice(0,-2)+'…';}
  lines.forEach((l,i)=>x.fillText(l,px,py+i*lh));
  return lines.length;
}
function expFitFont(x,text,maxW,fam,weight,size,min){
  let s=size;
  do{x.font=`${weight} ${s}px ${fam}`;if(x.measureText(text).width<=maxW)break;s-=2;}while(s>min);
  return s;
}
function expLogo(x,pos,color,shadow){
  if(pos==='none')return;
  x.save();x.textAlign='left';x.font='900 40px Montserrat,sans-serif';
  if(shadow){x.shadowColor='rgba(10,12,30,.55)';x.shadowBlur=14;x.shadowOffsetY=2;}
  const t1='Go',t2='.',t3='Group',pad=48;
  const w=x.measureText(t1+t2+t3).width;
  const px=(pos==='tl'||pos==='bl')?pad:1080-pad-w;
  const py=(pos==='tl'||pos==='tr')?pad+34:1080-pad+8;
  x.fillStyle=color;x.fillText(t1,px,py);
  x.fillStyle='#0099FF';x.fillText(t2,px+x.measureText(t1).width,py);
  x.fillStyle=color;x.fillText(t3,px+x.measureText(t1+t2).width,py);
  x.restore();
}
/* Lignes d'infos génériques (libellé à gauche, valeur à droite), ancrées au bas
   du bloc [x0…x1, yBot] ; la hauteur de ligne s'adapte au nombre d'infos. */
function expInfoRows(p,c){
  const st=expInfoState();
  return st.order.filter(k=>st.on.includes(k)).map(k=>{
    const d=EXP_INFOS.find(i=>i.k===k);
    return{k,lbl:d.lbl,val:String(d.v(p,c)||'').trim(),big:!!d.big};
  }).filter(r=>r.val&&r.val!=='—');
}
function expFitText(x,text,maxW){
  let t=String(text);
  if(x.measureText(t).width<=maxW)return t;
  while(t.length>1&&x.measureText(t+'…').width>maxW)t=t.slice(0,-1);
  return t+'…';
}
function expRowsH(rows,maxH){
  if(!rows.length)return 0;
  const u=rows.reduce((s,r)=>s+(r.big?1.35:1),0);
  return Math.round(u*Math.max(24,Math.min(62,Math.floor(maxH/u))));
}
function expRowsBlock(x,rows,o){
  if(!rows.length)return;
  const u=rows.reduce((s,r)=>s+(r.big?1.35:1),0);
  const rh=Math.max(24,Math.min(62,Math.floor(o.maxH/u)));
  let y=o.yBot-Math.round(u*rh);
  x.save();
  rows.forEach(r=>{
    const h=Math.round(rh*(r.big?1.35:1)),base=y+Math.round(h*.72);
    x.textAlign='left';
    x.font=`${r.big?600:500} ${Math.round(rh*(r.big?.52:.46))}px Poppins,sans-serif`;
    x.fillStyle=o.color;x.globalAlpha=.72;
    const lbl=expFitText(x,r.lbl,(o.x1-o.x0)*.52);
    x.fillText(lbl,o.x0,base);
    const lw=x.measureText(lbl).width;
    x.globalAlpha=1;
    expFitFont(x,r.val,o.x1-o.x0-lw-26,'Montserrat,sans-serif',r.big?800:700,Math.round(rh*(r.big?.92:.62)),15);
    x.textAlign='right';x.fillStyle=r.big?o.accent:o.color;x.fillText(r.val,o.x1,base);
    x.textAlign='left';
    y+=h;
  });
  x.restore();
}
function expDraw(cv,p,img){
  const x=cv.getContext('2d');
  const W=1080,H=1080;
  cv.width=W;cv.height=H;
  const c=calc(p),o=expPrefs;
  const rows=expInfoRows(p,c);
  x.textAlign='left';x.textBaseline='alphabetic';
  switch(o.tpl){
    case'gradient':{
      x.fillStyle=expGrad(x,0,0,W,H);x.fillRect(0,0,W,H);
      x.fillStyle='#fff';expRRect(x,50,50,980,980,32);x.fill();
      const yBot=988,ih=expRowsH(rows,400);
      const imgH=Math.max(260,Math.min(500,yBot-ih-90-176));
      expCover(x,img,90,90,900,imgH,20);
      x.fillStyle=o.txt;x.font='800 52px Montserrat,sans-serif';
      const ny=90+imgH+64;
      const n=expWrap(x,p.nom,90,ny,900,60,2);
      x.font='500 27px Poppins,sans-serif';x.globalAlpha=.6;x.fillText(p.ref||'',90,ny+n*60+2);x.globalAlpha=1;
      expRowsBlock(x,rows,{x0:90,x1:990,yBot,maxH:Math.max(40,yBot-(ny+n*60+30)),color:o.txt,accent:'#0066CC'});
      break;
    }
    case'nuit':{
      x.fillStyle='#1A1A2E';x.fillRect(0,0,W,H);
      x.fillStyle=expGrad(x,0,0,W,0);x.fillRect(0,0,W,10);
      const yBot=1006,ih=expRowsH(rows,430);
      const imgH=Math.max(280,Math.min(530,yBot-ih-64-186));
      expCover(x,img,60,64,960,imgH,24);
      x.fillStyle='#fff';x.font='800 54px Montserrat,sans-serif';
      const ny=64+imgH+70;
      const n=expWrap(x,p.nom,60,ny,960,64,2);
      x.font='500 28px Poppins,sans-serif';x.globalAlpha=.55;x.fillText(p.ref||'',60,ny+n*64+2);x.globalAlpha=1;
      expRowsBlock(x,rows,{x0:60,x1:1020,yBot,maxH:Math.max(40,yBot-(ny+n*64+30)),color:'#fff',accent:'#FFD700'});
      expLogo(x,o.logoPos,'#fff');
      break;
    }
    case'minimal':{
      x.fillStyle=o.bg;x.fillRect(0,0,W,H);
      const ih=expRowsH(rows,360);
      const s=Math.max(330,Math.min(580,H-84-176-ih-56));
      expCover(x,img,(W-s)/2,84,s,s,18);
      x.textAlign='center';
      x.fillStyle=o.txt;x.font='700 48px Montserrat,sans-serif';
      const ny=84+s+64;
      const n=expWrap(x,p.nom,W/2,ny,900,58,2);
      x.font='400 26px Poppins,sans-serif';x.globalAlpha=.55;x.fillText(p.ref||'',W/2,ny+n*58);x.globalAlpha=1;
      const top=ny+n*58+26;
      x.globalAlpha=.16;x.strokeStyle=o.txt;x.lineWidth=2;
      x.beginPath();x.moveTo(240,top);x.lineTo(840,top);x.stroke();x.globalAlpha=1;
      x.textAlign='left';
      expRowsBlock(x,rows,{x0:200,x1:880,yBot:1014,maxH:Math.max(40,1014-top-14),color:o.txt,accent:o.txt});
      expLogo(x,o.logoPos==='bl'||o.logoPos==='br'?(o.logoPos==='bl'?'tl':'tr'):o.logoPos,o.txt);
      break;
    }
    case'badge':{
      expCover(x,img,0,0,W,H,0);
      const ttc=rows.find(r=>r.k==='ttc'),others=rows.filter(r=>r.k!=='ttc');
      const ih=expRowsH(others,330);
      const gh=Math.max(430,ih+250);
      const g=x.createLinearGradient(0,H-gh,0,H);
      g.addColorStop(0,'rgba(10,12,30,0)');g.addColorStop(1,'rgba(10,12,30,.92)');
      x.fillStyle=g;x.fillRect(0,H-gh,W,gh);
      if(ttc){
        x.fillStyle='#FFD700';x.beginPath();x.arc(880,190,148,0,7);x.fill();
        x.fillStyle=expGrad(x,732,42,1028,338);x.lineWidth=8;x.strokeStyle=x.fillStyle;
        x.beginPath();x.arc(880,190,158,0,7);x.stroke();
        x.fillStyle='#1A1A2E';x.textAlign='center';
        x.font='700 30px Poppins,sans-serif';x.fillText('Prix TTC',880,150);
        const num=Math.round(c.pvuTTC).toLocaleString('fr-FR');
        expFitFont(x,num,240,'Montserrat,sans-serif',800,54,26);x.fillText(num,880,212);
        x.font='700 28px Poppins,sans-serif';x.fillText('XOF',880,252);
        x.textAlign='left';
      }
      x.fillStyle='#fff';x.font='800 56px Montserrat,sans-serif';
      expWrap(x,p.nom,60,H-160-ih,960,64,2);
      expRowsBlock(x,others,{x0:60,x1:1020,yBot:H-56,maxH:330,color:'#fff',accent:'#FFD700'});
      expLogo(x,o.logoPos==='br'?'tl':o.logoPos,'#fff',true);
      break;
    }
    case'catalogue':{
      x.fillStyle=o.bg;x.fillRect(0,0,W,H);
      expCover(x,img,0,0,528,H,0);
      x.fillStyle=expGrad(x,0,0,0,H);x.fillRect(528,0,12,H);
      const x0=600,x1=1020;
      x.fillStyle=o.txt;x.globalAlpha=.55;
      x.font='600 26px Poppins,sans-serif';x.fillText((p.ref||'').toUpperCase(),x0,160);
      x.globalAlpha=1;
      x.font='800 50px Montserrat,sans-serif';
      const n=expWrap(x,p.nom,x0,230,x1-x0,60,3);
      let top=230+n*60+10;
      if(p.specs){x.font='400 24px Poppins,sans-serif';x.globalAlpha=.6;top+=expWrap(x,p.specs,x0,top+24,x1-x0,34,2)*34+14;x.globalAlpha=1;}
      expRowsBlock(x,rows,{x0,x1,yBot:1002,maxH:Math.max(40,1002-top-30),color:o.txt,accent:'#0066CC'});
      expLogo(x,o.logoPos==='tl'||o.logoPos==='bl'?'tr':o.logoPos,o.txt);
      break;
    }
    default:{ // classique
      x.fillStyle=o.bg;x.fillRect(0,0,W,H);
      x.fillStyle=expGrad(x,0,0,W,0);x.fillRect(0,0,W,14);
      const yBot=1012,ih=expRowsH(rows,430);
      const imgH=Math.max(280,Math.min(540,yBot-ih-74-186));
      expCover(x,img,60,74,960,imgH,24);
      x.fillStyle=o.txt;x.font='800 54px Montserrat,sans-serif';
      const ny=74+imgH+70;
      const n=expWrap(x,p.nom,60,ny,960,64,2);
      x.font='500 28px Poppins,sans-serif';x.globalAlpha=.6;
      x.fillText(p.ref||'',60,ny+n*64+2);x.globalAlpha=1;
      expRowsBlock(x,rows,{x0:60,x1:1020,yBot,maxH:Math.max(40,yBot-(ny+n*64+30)),color:o.txt,accent:'#0066CC'});
      expLogo(x,o.logoPos,o.txt);
    }
  }
}

/* ---- Téléchargement PNG / ZIP + progression ---- */
function expSlug(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);}
function expSaveBlob(blob,name){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
async function expDownload(zip){
  const ids=[...expSel];
  if(!ids.length)return;
  const prog=document.getElementById('exp-prog'),fill=document.getElementById('exp-prog-fill'),lbl=document.getElementById('exp-prog-lbl');
  const b1=document.getElementById('exp-dl-one'),b2=document.getElementById('exp-dl-zip');
  prog.style.display='block';fill.style.width='0%';
  b1.disabled=b2.disabled=true;
  try{
    await document.fonts.ready;
    const cv=document.createElement('canvas');cv.width=1080;cv.height=1080;
    const files=[];
    for(let i=0;i<ids.length;i++){
      const p=prods.find(x=>x.id===ids[i]);
      if(!p)continue;
      lbl.textContent=`Génération ${i+1}/${ids.length} — ${p.nom}`;
      const img=await expLoadImg(p.photos&&p.photos[0]);
      expDraw(cv,p,img);
      const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
      if(!blob)throw new Error('génération PNG impossible (image externe sans CORS ?)');
      const name='GoFlow_'+expSlug(p.ref+'_'+p.nom)+'.png';
      if(zip)files.push({name,blob});
      else{expSaveBlob(blob,name);await new Promise(r=>setTimeout(r,350));}
      fill.style.width=Math.round((i+1)/ids.length*100)+'%';
    }
    if(zip){
      lbl.textContent='Assemblage du ZIP…';
      expSaveBlob(await zipStore(files),'GoFlow_Images_'+new Date().toISOString().slice(0,10)+'.zip');
    }
    lbl.textContent='Terminé ✓';
    auditLog('export_images',{template:expPrefs.tpl,nb:files.length||ids.length,zip:!!zip,infos:expInfoState().on.join(',')});
    toast(`${ids.length} image${ids.length>1?'s':''} ${zip?'dans le ZIP ':''}téléchargée${ids.length>1?'s':''} ✓`);
  }catch(e){
    console.error('Export images:',e);
    toast('Export échoué — '+(e.message||e),true);
  }finally{
    b1.disabled=b2.disabled=false;
    setTimeout(()=>{prog.style.display='none';},1800);
  }
}
/* ZIP « store » minimal (sans compression) — suffisant pour des PNG déjà compressés */
const zipCRCTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
function zipCRC(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=zipCRCTable[(c^u8[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
async function zipStore(files){
  const enc=new TextEncoder();
  const parts=[],central=[];let offset=0,cdLen=0;
  for(const f of files){
    const data=new Uint8Array(await f.blob.arrayBuffer());
    const name=enc.encode(f.name);
    const crc=zipCRC(data);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);
    lh.setUint16(26,name.length,true);
    parts.push(lh.buffer,name,data);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);
    ch.setUint16(28,name.length,true);ch.setUint32(42,offset,true);
    central.push(ch.buffer,name);
    cdLen+=46+name.length;
    offset+=30+name.length+data.length;
  }
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);
  end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);
  end.setUint32(12,cdLen,true);end.setUint32(16,offset,true);
  return new Blob([...parts,...central,end.buffer],{type:'application/zip'});
}
/* ===== FIN MODULE EXPORT IMAGES ===== */
