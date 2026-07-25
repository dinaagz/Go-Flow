let toastTimer=null;
function toast(msg,err=false){
  const t=document.getElementById('toast');
  t.innerHTML='<span class="toast-msg"></span>';
  t.querySelector('.toast-msg').textContent=msg;
  t.style.setProperty('--toast-dot',err?'var(--rouge)':'var(--vert)');
  t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}
// Toast avec "Annuler" — délai de grâce avant que l'action destructive soit définitive.
function toastUndo(msg,undoFn,ms=6000){
  const t=document.getElementById('toast');
  t.innerHTML='<span class="toast-msg"></span><button class="toast-undo-btn">Annuler</button>';
  t.querySelector('.toast-msg').textContent=msg;
  t.style.setProperty('--toast-dot','var(--vert)');
  let done=false;
  t.querySelector('.toast-undo-btn').onclick=()=>{
    if(done)return;done=true;
    t.classList.remove('show');clearTimeout(toastTimer);
    undoFn();
  };
  t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(!done)t.classList.remove('show');},ms);
}

// Sur Mac, « Ctrl » n'est pas la touche réellement utilisée (Cmd) — le raccourci accepte déjà les deux (ctrlKey||metaKey), seul le libellé doit s'adapter
if(/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent)){
  document.querySelectorAll('#shortcuts-modal kbd').forEach(k=>{if(k.textContent==='Ctrl')k.textContent='⌘';});
}
init();
bkpDirUI();
