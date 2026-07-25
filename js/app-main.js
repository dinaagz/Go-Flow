function toast(msg,err=false){
  const t=document.getElementById('toast');t.textContent=msg;
  t.style.setProperty('--toast-dot',err?'var(--rouge)':'var(--vert)');
  t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);
}

init();
bkpDirUI();
