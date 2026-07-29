/* Phase 1C: état visuel du toast (affichage, couleur du point, transition) porté par
   Alpine (toastCmp). La logique métier — timing, annulation — reste en JS vanilla dans
   toast()/toastUndo() ci-dessous.
   IMPORTANT — pourquoi le markup complet (x-data, x-show, écouteurs d'événement...) est
   construit par JS (toastMount, innerHTML) plutôt que statique dans index.html : le vendor
   Alpine (js/vendor/alpinejs.min.js) déclenche Alpine.start() via queueMicrotask() juste
   après sa propre exécution, donc AVANT que le 2e script `defer` (js/data-store.js) ne
   s'exécute — bien avant tout Alpine.data() enregistré dans un fichier ultérieur comme
   celui-ci. Toute directive Alpine présente dans le HTML statique au chargement se fait
   donc scanner sur un composant pas encore enregistré ; et un Alpine.initTree() manuel
   ultérieur sur ce même nœud ne "répare" pas les directives déjà traitées une première
   fois à vide (bug constaté en test local pour x-data seul, PUIS pour x-show, PUIS pour
   des écouteurs @event.window — le problème touche toute directive statique, pas
   seulement x-data). Solution alignée sur cmMount/cmRefresh (column-manager.js) : rien
   n'existe dans le DOM avant que ce script ne construise tout le sous-arbre d'un coup via
   innerHTML, puis Alpine.initTree() une seule fois sur du contenu 100% neuf.
   IMPORTANT #2 — pourquoi toast()/toastUndo() dispatchent un CustomEvent (écouté via
   @gf-toast-show.window / @gf-toast-hide.window ci-dessous) plutôt que de muter
   window.Alpine.$data(el) directement : une mutation posée depuis l'extérieur d'Alpine
   (via $data(), via Alpine.evaluate(), ou en écrivant directement sur l'objet réactif
   interne) ne déclenche pas la réactivité de x-show — seules les mutations évaluées PAR
   Alpine lui-même (@click="...", @event.window="...") la déclenchent. */
Alpine.data('toastCmp',()=>({
  show:false,err:false,msg:'',undoFn:null,
  runUndo(){
    if(!this.undoFn)return;
    const fn=this.undoFn;this.undoFn=null;this.show=false;
    fn();
  },
}));
(function toastMount(){
  const t=document.getElementById('toast');
  if(!t)return;
  t.innerHTML=`
    <div x-data="toastCmp()"
      @gf-toast-show.window="msg=$event.detail.msg;err=$event.detail.err;undoFn=$event.detail.undoFn;show=true"
      @gf-toast-hide.window="show=false">
      <div x-show="show"
        x-transition:enter="transition-all duration-300 ease-out" x-transition:enter-start="opacity-0 translate-y-[100px]" x-transition:enter-end="opacity-100 translate-y-0"
        x-transition:leave="transition-all duration-300 ease-out" x-transition:leave-start="opacity-100 translate-y-0" x-transition:leave-end="opacity-0 translate-y-[100px]"
        class="fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-5 z-[300] flex max-w-[min(92vw,420px)] items-center gap-[10px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-[18px] py-[13px] text-[13px] font-medium text-[var(--text)] shadow-[var(--sh-lg)]">
        <span class="h-[9px] w-[9px] flex-shrink-0 rounded-full"
          :class="err?'bg-[var(--rouge)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--rouge)_18%,transparent)]':'bg-[var(--vert)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--vert)_18%,transparent)]'"></span>
        <span class="toast-msg flex-1" x-text="msg"></span>
        <button type="button" x-show="undoFn" class="toast-undo-btn flex-shrink-0 min-h-[32px] rounded-md px-2 py-1 text-[12.5px] font-bold text-[var(--bleu-t)] hover:bg-[var(--gris)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bleu)] focus-visible:outline-offset-1" @click="runUndo()">Annuler</button>
      </div>
    </div>`;
  Alpine.initTree(t);
})();
let toastTimer=null;
function toast(msg,err=false){
  window.dispatchEvent(new CustomEvent('gf-toast-show',{detail:{msg,err,undoFn:null}}));
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>window.dispatchEvent(new CustomEvent('gf-toast-hide')),3000);
}
// Toast avec "Annuler" — délai de grâce avant que l'action destructive soit définitive.
function toastUndo(msg,undoFn,ms=6000){
  const wrapped=()=>{clearTimeout(toastTimer);undoFn();};
  window.dispatchEvent(new CustomEvent('gf-toast-show',{detail:{msg,err:false,undoFn:wrapped}}));
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>window.dispatchEvent(new CustomEvent('gf-toast-hide')),ms);
}

// Sur Mac, « Ctrl » n'est pas la touche réellement utilisée (Cmd) — le raccourci accepte déjà les deux (ctrlKey||metaKey), seul le libellé doit s'adapter
if(/Mac|iPhone|iPad|iPod/.test(navigator.platform||navigator.userAgent)){
  document.querySelectorAll('#shortcuts-modal kbd').forEach(k=>{if(k.textContent==='Ctrl')k.textContent='⌘';});
}
init();
bkpDirUI();
