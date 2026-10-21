/* Key Room — coach layer (0.31). Shared by the Windows and phone builds.
   1. Mastery-gated pace: a box is learned by passing a mic check; the next week unlocks
      once this week's core boxes (1–3) pass. Later weeks stay open to preview.
   2. Mic-checked review: review runs are blind (no diagram, no next note). A miss steps back one level.
   3. Same box, new home: show the box with its relative root (E minor pentatonic = G major pentatonic). */
(function(){
  'use strict';
  if(typeof render!=='function'||typeof S==='undefined')return;
  const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

  /* ---------- 1. Pace ---------- */
  function paceAdvance(){let moved=0;
    while((S.current||1)<11&&WEEKS[S.current]&&coreDone(S.current)){S.current=(S.current||1)+1;moved=S.current}
    if(moved){save();setTimeout(()=>toast('Week '+moved+' unlocked: '+wkScName(WEEKS[moved].s)),60)}}
  const locked=w=>w>(S.current||1)&&!S.done[w];

  const _next=nextAction;
  nextAction=function(){const w=UI.week;
    if(locked(w)){const c=S.current||1,left=coreN(c)-[...Array(coreN(c)).keys()].filter(i=>learned(c,i)).length;
      return{small:'Preview',txt:'Unlocks after week '+c+"'s core boxes ("+left+' to go)',btn:'Go to week '+c,act:()=>selectWeek(c)}}
    return _next()};

  async function boxCheck(){
    if(!LS.on)await lsStart();
    if(!LS.on){toast('No mic here. Use Mark learned instead.');return}
    lsRunStart();if(LS.run){LS.run.check=true;LS.run.label='Check · '+LS.run.label}lsPanel()}

  /* ---------- 2. Blind review ---------- */
  function boxNotes(w,i){const saved=HKN;let n=null;
    try{HKN=wkKey(WEEKS[w].s);n=wkPositions(w)[i]}catch(e){}finally{HKN=saved}return n}
  async function reviewCheck(k){
    const[w,i]=k.split('-').map(Number),notes=boxNotes(w,i);if(!notes)return;
    if(!LS.on)await lsStart();
    if(!LS.on){toast('No mic here. Rate it yourself: Shaky or Solid.');return}
    const seen=new Set(),up=notes.map(n=>({s:n.s,f:n.f,m:STR[n.s]+n.f})).sort((a,b)=>a.m-b.m||a.s-b.s).filter(n=>!seen.has(n.m)&&seen.add(n.m));
    LS.run={k,label:'Week '+w+' · Box '+(i+1),seq:up.concat(up.slice(0,-1).reverse()),i:0,miss:0,prev:null,t0:performance.now(),review:true,blind:true};
    LS.done=null;lsMark();lsPanel()}

  const _panel=lsPanel;
  lsPanel=function(){_panel();
    const blind=!!(LS.on&&LS.run&&LS.run.blind);document.body.classList.toggle('kr-blind',blind);
    const D=LS.done,g=document.getElementById('lsGo');
    if(D&&g){if(D.review&&D.k)g.onclick=()=>reviewCheck(D.k);else if(D.check&&!D.learned)g.onclick=boxCheck}};
  const _stop=lsStop;
  lsStop=function(){_stop.apply(this,arguments);document.body.classList.remove('kr-blind')};

  window.krAfterRun=function(D){
    if(D.learned)toast('Box learned ✓');
    if(D.learned||D.review){render();lsPanel()}};

  /* ---------- 3. Same box, new home ---------- */
  // interval of the relative root inside the scale, and the name of the scale built on it
  const REL={minPent:[3,'major pentatonic'],blues:[3,'major blues'],natMin:[3,'major'],dorian:[10,'major'],phryg:[8,'major'],
    majPent:[9,'minor pentatonic'],major:[9,'natural minor'],mixo:[5,'major'],lyd:[7,'major']};
  let HOME=store.get('kr-home','0')==='1';
  function homeHTML(sc,names,s){const r=REL[s];if(!r)return'';const rn=names[r[0]],hn=names[0];
    return `<div class="homeTog" role="group" aria-label="Where the box lives"><span>Same box, home on</span><div class="seg sm">
      <button data-home="0" aria-pressed="${!HOME}" class="${HOME?'':'on'}">${hn} · ${(LBL[s]||'this scale').toLowerCase()}</button>
      <button data-home="1" aria-pressed="${HOME}" class="${HOME?'on':''}">${rn} · ${r[1]}</button></div></div>`}
  function applyHome(){
    if(UI.tab!=='weekly')return;const W=WEEKS[UI.week];if(!W)return;const s=W.s,r=REL[s],sc=SCALES[s];
    const hero=document.querySelector('.hero .hl');if(!hero||!r)return;
    let names;try{names=wkNames(sc,s)}catch(e){return}
    hero.insertAdjacentHTML('beforeend',homeHTML(sc,names,s));
    hero.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>{HOME=b.dataset.home==='1';store.set('kr-home',HOME?'1':'0');render()});
    if(!HOME)return;
    const off=r[0],rn=names[off];
    // hero chips: the relative root becomes home, degrees are counted from it
    hero.querySelectorAll('.notes .note').forEach((el,i)=>{const v=sc.iv[i];if(v==null)return;const d=((v-off)%12+12)%12;
      el.classList.toggle('root',v===off);const sm=el.querySelector('small');if(sm)sm.textContent=LAB[d]});
    // diagrams: old home dots become plain, the relative root's dots become home
    document.querySelectorAll('#app svg circle').forEach(c=>{const t=c.nextElementSibling;if(!t||t.tagName.toLowerCase()!=='text')return;
      const lab=t.textContent.trim(),f=c.getAttribute('fill');
      if(f==='var(--root)'&&lab!==rn){c.setAttribute('fill','var(--dot)');t.setAttribute('fill','var(--dotText)')}
      else if(lab===rn&&f!=='var(--root)'&&f!=='var(--surface)'){c.setAttribute('fill','var(--root)');t.setAttribute('fill','var(--onRoot)')}});
    document.body.classList.add('kr-rel')}

  /* ---------- render hook ---------- */
  const _render=render;
  render=function(){paceAdvance();document.body.classList.remove('kr-rel');_render.apply(this,arguments);if(UI.tab!=='weekly')return;
    const cb=document.getElementById('chkBtn');if(cb)cb.onclick=boxCheck;
    document.querySelectorAll('[data-rvc]').forEach(b=>b.onclick=()=>reviewCheck(b.dataset.rvc));
    document.querySelectorAll('.wk[data-w]').forEach(b=>{const w=+b.dataset.w;if(locked(w)){b.classList.add('soft');const wn=b.querySelector('.wn');
      if(wn&&!wn.querySelector('.wklk'))wn.insertAdjacentHTML('beforeend','<span class="wklk">'+ICON.lock+'</span>');b.title='Unlocks after week '+(S.current||1)+"'s core boxes · open to preview"}});
    applyHome()};
  render();
})();
