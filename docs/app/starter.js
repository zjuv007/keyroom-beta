/* Key Room — Start here (0.32). Shared by the Windows and phone builds.
   A short, visual, one-idea-per-screen tutorial: progress bar on top, a big picture in the middle,
   one small thing to tap, and a big Continue button. Runs on first launch and from "Start here". */
(function(){
  'use strict';
  if(typeof render!=='function')return;
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  const MOBILE=matchMedia('(max-width:820px)').matches||/iPhone|iPad|Android/i.test(navigator.userAgent);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------- sound (quiet, optional) ---------- */
  function note(m,when,dur){try{const c=ac();if(c.state==='suspended')c.resume();pluck(m,c.currentTime+(when||0)+.02,dur||1.2,.14)}catch(e){}}
  function ding(){note(76,0,1);note(83,.12,1.2)}

  /* ---------- pictures ---------- */
  // Box 1 of E minor pentatonic, open position. s: 0 = low E … 5 = high e
  const BOX1=[[0,0,'E',40],[0,3,'G',43],[1,0,'A',45],[1,2,'B',47],[2,0,'D',50],[2,2,'E',52],[3,0,'G',55],[3,2,'A',57],[4,0,'B',59],[4,3,'D',62],[5,0,'E',64],[5,3,'G',67]];
  function neck(o){o=o||{};const W=360,H=196,L=58,T=26,FW=72,G=29,fx=f=>f===0?L-26:L+(f-.5)*FW,sy=s=>T+(5-s)*G;
    let g=`<svg class="tut-neck" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Guitar neck, open position')}">`;
    g+=`<rect x="${L}" y="${T-10}" width="${FW*4+10}" height="${G*5+20}" rx="6" class="tn-wood"/>`;
    if(o.box)g+=`<rect x="${L-44}" y="${T-16}" width="${FW*3+44}" height="${G*5+32}" rx="16" class="tn-box"/>`;
    for(let f=1;f<=4;f++)g+=`<line x1="${L+f*FW}" y1="${T-10}" x2="${L+f*FW}" y2="${T+G*5+10}" class="tn-fret"/>`;
    g+=`<rect x="${L-4}" y="${T-10}" width="7" height="${G*5+20}" rx="2" class="tn-nut"/>`;
    for(let s=0;s<6;s++)g+=`<line x1="${L-40}" y1="${sy(s)}" x2="${L+FW*4+10}" y2="${sy(s)}" class="tn-str" stroke-width="${1+(5-s)*.32}"/>`;
    [3].forEach(f=>g+=`<circle cx="${L+(f-.5)*FW}" cy="${T+G*2.5}" r="4" class="tn-inlay"/>`);
    for(let f=0;f<=3;f++)g+=`<text x="${f===0?L-26:L+(f-.5)*FW}" y="${H-4}" class="tn-fn">${f}</text>`;
    BOX1.forEach(([s,f,n,m],i)=>{const cls=['tn-dot'];if(o.roots&&n==='E')cls.push('root');if(o.hide&&o.hide(n))cls.push('ghost');if(o.lit&&o.lit===i)cls.push('lit');
      g+=`<g class="${cls.join(' ')}" data-i="${i}" data-n="${n}" data-m="${m}" ${o.tap?'role="button" tabindex="0" aria-label="'+n+'"':''}><circle cx="${fx(f)}" cy="${sy(s)}" r="13"/><text x="${fx(f)}" y="${sy(s)+4.5}">${o.names===false?'':n}</text></g>`});
    return g+'</svg>'}

  const IC={
    learn:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="15" r="1.6"/></svg>',
    mic:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg>',
    play:'<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
    review:'<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 11-2.1-5M19 4v4h-4"/></svg>',
    lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 017 0"/></svg>',
    open:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 016.7-1.4"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    speaker:'<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a7.5 7.5 0 010 11"/></svg>'
  };

  function path(){ // the 11-week path, Duolingo-style
    let g='<svg class="tut-path" viewBox="0 0 320 210" aria-hidden="true">';const pts=[];
    for(let i=0;i<11;i++){const row=Math.floor(i/4),k=i%4,x=row%2?260-k*66:60+k*66,y=36+row*68;pts.push([x,y])}
    g+=`<path d="M${pts.map(p=>p.join(' ')).join(' L')}" class="tp-line"/>`;
    const ph=i=>i<3?'p1':i<7?'p2':'p3';
    pts.forEach(([x,y],i)=>{g+=`<g class="tp-node ${ph(i)}${i===0?' now':''}"><circle cx="${x}" cy="${y}" r="${i===0?21:17}"/><text x="${x}" y="${y+5}">${i+1}</text></g>`});
    return g+'</svg>'}
  function loop(){const st=[['learn','Learn'],['mic','Check'],['play','Play'],['review','Review']];
    return `<div class="tut-loop">${st.map(([k,l],i)=>`<div class="tl-step" style="--d:${i*90}ms"><span class="tl-ic">${IC[k]}</span><b>${l}</b></div>${i<3?'<i class="tl-arr"></i>':''}`).join('')}</div>`}
  function unlock(){return `<div class="tut-unlock"><div class="tu-boxes">${[1,2,3].map(i=>`<span class="tu-b" style="--d:${i*180}ms"><b>Box ${i}</b><i>${IC.check}</i></span>`).join('')}</div><i class="tl-arr"></i><span class="tu-lock">${IC.open}<b>Week 2</b></span></div>`}
  function places(){const P=[['weekly','Home','This week + roadmap'],['learn','Scales','How scales work'],['chords','Chords','Chords + builder'],['snd','Sound','Sounds, tempo, mic']];
    const ic=k=>k==='snd'?'<path d="M3 8h3l5-4v12l-5-4H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 7.5a3.5 3.5 0 010 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>':SIDE_ICON[k];
    return `<div class="tut-places${MOBILE?' bar':''}">${P.map(([k,l,d],i)=>`<div class="tp" style="--d:${i*80}ms"><svg viewBox="0 0 20 20" aria-hidden="true">${ic(k)}</svg><b>${l}</b><small>${d}</small></div>`).join('')}</div>`}
  function legend(){return `<div class="tut-legend"><span><i class="lg root">E</i><b>Home note</b><small>the root</small></span><span><i class="lg">G</i><b>Scale note</b><small>safe to play</small></span><span><i class="lg new">B♭</i><b>New note</b><small>this week's change</small></span></div>`}
  function confetti(){let g='<div class="tut-conf" aria-hidden="true">';const C=['#FFD45C','#FF6B2C','#6A3DFF','#30B0C7','#8BC34A','#FF2D55'];
    for(let i=0;i<26;i++)g+=`<i style="--x:${Math.round(Math.random()*100)}%;--d:${Math.round(Math.random()*500)}ms;--r:${Math.round(Math.random()*360)}deg;background:${C[i%C.length]}"></i>`;return g+'</div>'}

  /* ---------- the lessons ---------- */
  const STEPS=[
    {art:()=>path(),t:'Learn the guitar neck, one scale a week',b:'11 weeks. 10 scales. Every one grows from a single shape.',btn:"Let's go"},
    {art:()=>neck({names:true}),t:'Meet minor pentatonic',b:'5 notes, no wrong ones. The sound of rock and blues.',
      task:'listen',hint:'Tap <b>Hear it</b> to play it up and down.',ok:'That’s the whole scale. Everything else adds to it.'},
    {art:()=>neck({tap:true}),t:'Tap an E',b:'E is this scale’s <b>home note</b>. Tap any E on the neck.',
      task:'tap',ok:'Home notes are <b>orange</b> everywhere in Key Room. Melodies feel finished there.',no:n=>`That’s ${n}. Look for an <b>E</b>.`},
    {art:()=>neck({roots:true,box:true}),t:'A box is one hand position',b:'Learn the neck one box at a time. Each week has <b>3 core boxes</b>.'},
    {art:()=>loop(),t:'Your week in 4 steps',b:'<b>Learn</b> a box, <b>check</b> it with the mic, <b>play</b> over chords, <b>review</b> it later.'},
    {art:()=>`<div class="tut-mic"><span class="tm-ic">${IC.mic}</span><div class="tm-dots">${Array.from({length:12},(_,i)=>`<i style="--d:${i*110}ms"></i>`).join('')}</div></div>`,
      t:'Check a box with the mic',b:'Play it up and down. <b>2 misses or fewer</b> and it’s learned. No mic? Mark it yourself.'},
    {art:()=>unlock(),t:'How do you unlock week 2?',b:'Pick one.',task:'quiz',
      opts:['Pass its 3 core boxes','Practise for 7 days','Learn all 5 boxes'],right:0,
      ok:'Yes. Boxes 4 and 5 are optional stretch. You can still peek ahead any time.',no:'Not quite. It’s the <b>3 core boxes</b>.'},
    {art:()=>legend(),t:'Read the dots',b:'Same colours on every screen, guitar or piano.'},
    {art:()=>places(),t:'Where things live',b:MOBILE?'The tab bar at the bottom. Mic tools live under <b>Sound</b>.':'The sidebar on the left. Mic tools sit under <b>Tempo &amp; Tune</b>.'},
    {art:()=>`<div class="tut-done">${confetti()}<span class="td-badge">${IC.check}</span></div>`,t:'You’re ready',b:'10 focused minutes a day is plenty. First up: <b>Week 1, Box 1</b>.',btn:'Start week 1',last:true}
  ];

  /* ---------- the player ---------- */
  let ix=0,state=null,el=null,lastFocus=null;
  function open(start){lastFocus=document.activeElement;ix=start||0;
    if(!el){el=document.createElement('div');el.className='tut';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Key Room tutorial');document.body.appendChild(el);document.addEventListener('keydown',key)}
    document.documentElement.classList.add('tut-open');show()}
  function close(done){if(!el)return;document.removeEventListener('keydown',key);el.remove();el=null;document.documentElement.classList.remove('tut-open');
    store.set('kr-tut',done?'done':'seen');try{if(window.__krBeta){const U=window.__krBeta.data();U.welcome=true}}catch(e){}
    if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
  function key(e){if(!el)return;if(e.key==='Escape'){e.preventDefault();close(false)}
    else if(e.key==='Enter'&&!e.target.closest('[data-i],[data-o]')){const b=el.querySelector('.tut-go:not(:disabled)');if(b){e.preventDefault();b.click()}}}
  function show(){const st=STEPS[ix];state={done:!st.task,msg:null,good:false};
    el.innerHTML=`<div class="tut-top"><button class="tut-x" data-close aria-label="Close tutorial">${IC.x}</button>
        <div class="tut-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${ix+1}"><i style="width:${Math.round((ix+1)/STEPS.length*100)}%"></i></div>
        <span class="tut-n">${ix+1}/${STEPS.length}</span></div>
      <div class="tut-body"><div class="tut-art">${st.art()}</div><h2>${st.t}</h2><p>${st.b}</p>
        ${st.task==='listen'?`<button class="tut-hear" data-hear>${IC.speaker}<span>Hear it</span></button>`:''}
        ${st.task==='quiz'?`<div class="tut-opts">${st.opts.map((o,i)=>`<button data-o="${i}">${o}</button>`).join('')}</div>`:''}</div>
      <div class="tut-foot"><div class="tut-fb" aria-live="polite"></div><div class="tut-row">${ix>0?'<button class="tut-back" data-back>Back</button>':'<button class="tut-back" data-close>Skip</button>'}
        <button class="tut-go" data-go ${st.task?'disabled':''}>${st.btn||'Continue'}</button></div></div>`;
    el.querySelector('.tut-body').classList.add('in');
    el.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>close(false));
    const bk=el.querySelector('[data-back]');if(bk)bk.onclick=()=>{ix--;show()};
    el.querySelector('[data-go]').onclick=next;
    const hr=el.querySelector('[data-hear]');if(hr)hr.onclick=()=>{const seq=BOX1.map(x=>x[3]);seq.concat(seq.slice(0,-1).reverse()).forEach((m,i)=>{note(m,i*.2,.6);setTimeout(()=>lightUp(m),i*200)});hr.classList.add('on');setTimeout(()=>pass(st.ok),seq.length*2*200)};
    if(st.task==='tap')el.querySelectorAll('.tn-dot').forEach(d=>{const go=()=>tap(d,st);d.onclick=go;d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
    if(st.task==='quiz')el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{if(state.good)return;const i=+b.dataset.o;
      if(i===st.right){b.classList.add('right');el.querySelectorAll('[data-o]').forEach(x=>x.disabled=true);pass(st.ok)}else{b.classList.add('wrong');setTimeout(()=>b.classList.remove('wrong'),500);fail(st.no)}});
    const f=el.querySelector('.tut-go:not(:disabled)')||el.querySelector('[data-hear],.tn-dot,[data-o]');if(f)setTimeout(()=>f.focus({preventScroll:true}),40)}
  function lightUp(m){if(!el)return;el.querySelectorAll('.tn-dot').forEach(d=>d.classList.toggle('lit',+d.dataset.m===m))}
  function tap(d,st){if(state.good)return;note(+d.dataset.m,0,1);const n=d.dataset.n;
    if(n==='E'){el.querySelectorAll('.tn-dot[data-n="E"]').forEach(x=>x.classList.add('root','pop'));pass(st.ok)}
    else{d.classList.add('shake');setTimeout(()=>d.classList.remove('shake'),450);fail(st.no(n))}}
  function pass(msg){if(!el)return;state.good=true;state.done=true;ding();fb(true,msg);const g=el.querySelector('[data-go]');g.disabled=false;g.focus({preventScroll:true})}
  function fail(msg){fb(false,msg)}
  function fb(ok,msg){const f=el.querySelector('.tut-fb');f.className='tut-fb show '+(ok?'good':'bad');f.innerHTML=`<span class="fb-ic">${ok?IC.check:'!'}</span><span><b>${ok?['Nice!','Got it!','Exactly.'][ix%3]:'Not quite'}</b><small>${msg||''}</small></span>`;
    el.querySelector('.tut-foot').classList.toggle('good',ok);el.querySelector('.tut-foot').classList.toggle('bad',!ok)}
  function next(){const st=STEPS[ix];if(st.last){close(true);try{UI.tab='weekly';UI.hv='learn';selectWeek(1);setTimeout(()=>go('m1'),120)}catch(e){}return}ix++;show()}

  /* ---------- ways in ---------- */
  window.krTutorial=open;
  const _render=render;
  render=function(){_render.apply(this,arguments);
    const b=document.getElementById('tutBtn');if(b)b.onclick=()=>open(0);
    // a friendly nudge on Home until the first box is learned
    if(UI.tab==='weekly'&&!Object.keys(S.pos||{}).some(k=>S.pos[k])&&!document.querySelector('.tut-nudge')){
      const hero=document.querySelector('#app .dgrid');if(hero)hero.insertAdjacentHTML('beforebegin',`<button class="tut-nudge" id="tutNudge"><span class="tn-ic">${IC.learn}</span><span><b>New here? Take the 2-minute tour</b><small>10 quick screens · how Key Room works</small></span><i class="tn-go"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg></i></button>`);
      const n=document.getElementById('tutNudge');if(n)n.onclick=()=>open(0)}};
  render();
})();
