// ─────────────────────────────────────────────────────────────
// AKASHA · main.js
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// 1. COSMOS BACKGROUND CANVAS
// Three layers: nebulae (RadialGradient ellipses) + stars (Arc + sin opacity)
// + meteors (LinearGradient lines). Driven by requestAnimationFrame at ~60fps.
// ─────────────────────────────────────────────────────────────
(function cosmosBackground() {
  const cvs = document.getElementById('cosmos-canvas');
  const ctx = cvs.getContext('2d');
  let W, H, stars=[], nebulae=[], meteors=[], t=0;

  function resize() {
    W = cvs.width = window.innerWidth;
    H = cvs.height = window.innerHeight;
    stars=[]; nebulae=[];
    const n = Math.floor(W*H/3000);
    for(let i=0;i<n;i++){
      const tp=Math.random();
      stars.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5,op:Math.random()*0.6+0.1,tw:Math.random()*Math.PI*2,spd:Math.random()*0.018+0.004,rgb:tp<0.15?'77,217,232':tp<0.23?'200,168,75':'255,255,255'});
    }
    nebulae=[
      {x:W*0.2,y:H*0.3,rx:380,ry:210,col:'139,92,246',op:0.025},
      {x:W*0.78,y:H*0.6,rx:300,ry:190,col:'77,217,232',op:0.02},
      {x:W*0.5,y:H*0.08,rx:420,ry:160,col:'200,168,75',op:0.018},
      {x:W*0.88,y:H*0.22,rx:240,ry:170,col:'232,121,168',op:0.014},
    ];
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(4,4,15,0.35)'; ctx.fillRect(0,0,W,H);
    nebulae.forEach(n=>{
      ctx.save(); ctx.scale(1,n.ry/n.rx);
      const g=ctx.createRadialGradient(n.x,n.y*n.rx/n.ry,0,n.x,n.y*n.rx/n.ry,n.rx);
      g.addColorStop(0,`rgba(${n.col},${n.op})`); g.addColorStop(1,`rgba(${n.col},0)`);
      ctx.beginPath(); ctx.arc(n.x,n.y*n.rx/n.ry,n.rx,0,Math.PI*2); ctx.fillStyle=g; ctx.fill(); ctx.restore();
    });
    stars.forEach(s=>{
      s.tw+=s.spd;
      const op=s.op*(0.55+0.45*Math.sin(s.tw));
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(${s.rgb},${op})`; ctx.fill();
    });
    if(Math.random()>0.997) meteors.push({x:Math.random()*W,y:0,len:80+Math.random()*130,spd:9+Math.random()*9,life:1});
    meteors=meteors.filter(m=>m.life>0);
    meteors.forEach(m=>{
      m.x+=m.spd*0.7; m.y+=m.spd; m.life-=0.028;
      const g=ctx.createLinearGradient(m.x,m.y,m.x-m.len*0.7,m.y-m.len);
      g.addColorStop(0,`rgba(255,255,255,${m.life*0.85})`); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(m.x-m.len*0.7,m.y-m.len);
      ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke();
    });
    t++; requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize); resize(); draw();
})();

// ─────────────────────────────────────────────────────────────
// 2. djb2 HASH — same string → always the same integer
// ─────────────────────────────────────────────────────────────
function djb2(str){let h=5381;for(let i=0;i<str.length;i++)h=((h<<5)+h)+str.charCodeAt(i)&0x7fffffff;return h;}

// ─────────────────────────────────────────────────────────────
// 3. LINEAR CONGRUENTIAL PRNG
// s = (s * 9301 + 49297) mod 233280  → returns [0, 1)
// Same seed + same call order = completely identical sequence
// ─────────────────────────────────────────────────────────────
function seededRng(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}

// ─────────────────────────────────────────────────────────────
// 4. WIKIPEDIA REST API (CORS: origin=* — no proxy needed)
// Step 1: search for best matching article title
// Step 2: fetch full article plaintext
// ─────────────────────────────────────────────────────────────
async function fetchWikipedia(query){
  const sd=await(await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5`)).json();
  if(!sd.query.search.length)throw new Error('No Wikipedia results found — try a different question');
  const title=sd.query.search[0].title;
  const ed=await(await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=false&explaintext=true&format=json&origin=*`)).json();
  const page=Object.values(ed.query.pages)[0];
  return{title:page.title,extract:page.extract||'',url:`https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`};
}

// ─────────────────────────────────────────────────────────────
// 5. WORD FREQUENCY ANALYSIS + WEIGHTED KEYWORD SELECTION
// TF = raw count of each word after stop-word filtering
// Weighted random: high-frequency words more likely to be chosen,
// but the seed controls exactly which ones — deterministic every time.
// This is where the "oracle's" apparent wisdom comes from:
// the data shapes the probability distribution, the seed picks the result.
// ─────────────────────────────────────────────────────────────
const STOP=new Set('the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us was were been has had is are am did does more through during before above below between each few such those being while upon much many still own under last long great little world every found since again here further once i with been have not'.split(' '));

// A small bias lexicon of *abstract* themes.
// NOTE: This is NOT a data source — the final theme word is always selected
// from words that actually appear in the scraped Wikipedia article.
// The lexicon only nudges selection toward broad, interpretable words.
const ABSTRACT=new Set([
  "trust","care","control","change","choice","hope","fear","desire","pressure","boundary",
  "patience","timing","loss","grief","growth","belonging","identity","silence","conflict",
  "communication","distance","responsibility","freedom","routine","habit","attention",
  "uncertainty","risk","comfort","regret","forgiveness","memory","expectation","power",
  "shame","pride","loneliness","connection","courage","discipline","balance","rest",
  "meaning","purpose","focus","clarity","relationship","family","love"
]);

function normalizeWords(str){
  return String(str||"")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g,' ')
    .split(/\s+/)
    .filter(Boolean);
}

function pickThemeWord(keywords,question,seed){
  const rng=seededRng(seed+99);
  const qWords=new Set(normalizeWords(question).filter(w=>w.length>2));
  // Score ONLY among extracted keyword candidates (all from Wikipedia text)
  const scored=keywords.map(k=>{
    const w=k.word;
    let score=k.freq;                 // relevance from Wikipedia
    if(qWords.has(w)) score+=6;       // question overlap → stronger perceived link
    if(ABSTRACT.has(w)) score+=10;    // abstract bias → more "answer-book" readable
    if(w.endsWith("tion")||w.endsWith("ment")||w.endsWith("ness")) score+=2;
    score+=rng()*0.5;                // deterministic tiny tie-break
    return {word:w,score};
  }).sort((a,b)=>b.score-a.score);

  return scored[0]?.word || (keywords[0]?.word || "clarity");
}

function extractKeywords(text,seed,count=12){
  const rng=seededRng(seed);
  const words=text.toLowerCase().replace(/[^a-z\s'-]/g,' ').split(/\s+/).filter(w=>w.length>3&&!STOP.has(w)&&!/^\d/.test(w));
  const freq={};words.forEach(w=>{freq[w]=(freq[w]||0)+1;});
  const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,50);
  const sel=[],pool=[...sorted];
  while(sel.length<count&&pool.length>0){
    const tot=pool.reduce((s,[,f])=>s+f,0);let r=rng()*tot,idx=0;
    for(let i=0;i<pool.length;i++){r-=pool[i][1];if(r<=0){idx=i;break;}}
    sel.push(pool[idx]);pool.splice(idx,1);
  }
  return sel.map(([word,freq])=>({word,freq}));
}

// ─────────────────────────────────────────────────────────────
// 6. DATA → VISUAL PARAMETER MAPPING
// Every visual property traces back to a real Wikipedia data field.
// ─────────────────────────────────────────────────────────────
function computeMapping(keywords,seed){
  const rng=seededRng(seed+1);
  const avgLen=keywords.reduce((s,k)=>s+k.word.length,0)/(keywords.length||1);
  const totalFreq=keywords.reduce((s,k)=>s+k.freq,0);
  const scales=['Pentatonic','Phrygian','Dorian','Lydian','Chromatic','Harmonic Minor','Whole Tone'];
  const timbres=['FMSynth (ethereal)','AMSynth (pulsing)','PolySynth (harmonic)','MetalSynth (crystalline)','MembraneSynth (percussive)'];
  return{
    bpm:Math.round(55+(totalFreq%75)),      // total keyword frequency → BPM
    scale:scales[Math.floor(rng()*scales.length)],  // seed → scale
    timbre:timbres[Math.floor(rng()*timbres.length)],
    reverb:(avgLen*0.38).toFixed(1),        // avg word length → reverb decay
    voices:Math.min(Math.max(Math.round(keywords.length/3),2),5),
    hue:Math.round(seed%360),               // seed → colour hue
  };
}

// ─────────────────────────────────────────────────────────────
// 7. MAIN VISUALIZATION CANVAS — 5-layer architecture
//
// Layer 0: Deep-space background gradient + slow rotating rays
// Layer 1: Flow-field particles
//   angle = sin(x/scale + phase + t) * cos(y/scale + t) * 2π
//   Simplified Perlin noise field — particles drift along "wind direction"
//   and respawn at random positions when their life expires.
// Layer 2: Pulsing energy rings
//   Rotating dashed circles; count/spacing/rotation direction from seed.
//   Opacity pulsed via sin(t).
// Layer 3: Keyword constellation
//   Keywords as nodes — size ∝ word frequency.
//   Nodes within threshold distance are connected by lines.
//   Colour tiers: high-freq = gold, mid = cyan, lower = violet.
// Layer 4: Central mandala
//   6-spoke (forward rotation) + inner triangle (reverse) = rotating sigil.
// Layer 5: Word labels
//   Label above node if node.y < centre, otherwise below.
// ─────────────────────────────────────────────────────────────
let vizAF=null;

function renderVisualization(keywords,seed,mapping,containerEl){
  if(vizAF)cancelAnimationFrame(vizAF);
  const cvs=document.getElementById('viz-canvas');
  const ctx=cvs.getContext('2d');
  const mob=window.innerWidth<600;
  const W=cvs.width=containerEl.clientWidth||500;
  const H=cvs.height=mob?Math.round(W*0.92):Math.round(W*0.7);
  const cx=W/2,cy=H/2;
  const rng=seededRng(seed);

  const PC=mob?90:180;
  const pts=Array.from({length:PC},()=>({
    x:rng()*W,y:rng()*H,life:rng(),maxL:0.6+rng()*0.4,
    r:0.6+rng()*1.3,phase:rng()*Math.PI*2,spd:0.5+rng()*0.9,
    col:rng()<0.5?'200,168,75':rng()<0.75?'77,217,232':'139,92,246'
  }));

  const maxF=keywords[0]?.freq||1;
  const nodes=keywords.map((kw,i)=>{
    const ang=(i/keywords.length)*Math.PI*2+rng()*0.9-0.45;
    const minR=Math.min(W,H)*0.19,maxR=Math.min(W,H)*0.43;
    const rad=minR+rng()*(maxR-minR);
    return{ox:cx+Math.cos(ang)*rad,oy:cy+Math.sin(ang)*rad,x:0,y:0,
      r:2.5+(kw.freq/maxF)*7.5,kw,pulse:rng()*Math.PI*2,
      col:kw.freq>maxF*0.6?'200,168,75':kw.freq>maxF*0.3?'77,217,232':'139,92,246'};
  });

  const rings=Array.from({length:3+Math.floor(rng()*3)},(_,i)=>({
    r:(0.14+i*0.1)*Math.min(W,H),phase:rng()*Math.PI*2,
    spd:(0.003+rng()*0.004)*(rng()<0.5?1:-1),
    dash:3+Math.floor(rng()*8),col:['200,168,75','77,217,232','139,92,246'][i%3]
  }));

  let t=0;
  const SCALE=W*0.28;

  function draw(){
    ctx.clearRect(0,0,W,H);
    const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*0.8);
    bg.addColorStop(0,'rgba(20,16,60,0.98)'); bg.addColorStop(0.5,'rgba(10,8,32,0.99)'); bg.addColorStop(1,'rgba(4,4,15,1)');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.0012);
    for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*Math.max(W,H),Math.sin(a)*Math.max(W,H)); ctx.strokeStyle='rgba(200,168,75,0.022)'; ctx.lineWidth=1; ctx.stroke();}
    ctx.restore();

    pts.forEach(p=>{
      const ang=Math.sin(p.x/SCALE+p.phase+t*0.004)*Math.cos(p.y/SCALE+t*0.003)*Math.PI*2;
      p.x+=Math.cos(ang)*p.spd; p.y+=Math.sin(ang)*p.spd; p.life-=0.004;
      if(p.life<=0||p.x<0||p.x>W||p.y<0||p.y>H){p.x=rng()*W;p.y=rng()*H;p.life=p.maxL;}
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.col},${(p.life/p.maxL)*0.38})`; ctx.fill();
    });

    rings.forEach(ring=>{
      ring.phase+=ring.spd;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(ring.phase);
      ctx.beginPath(); ctx.arc(0,0,ring.r,0,Math.PI*2);
      ctx.setLineDash([ring.dash,ring.dash*2]);
      ctx.strokeStyle=`rgba(${ring.col},${0.07+0.05*Math.sin(t*0.03+ring.phase)})`;
      ctx.lineWidth=0.9; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    });

    const CDIST=Math.min(W,H)*0.33;
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<CDIST){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(200,168,75,${(1-d/CDIST)*0.2})`;ctx.lineWidth=0.5;ctx.stroke();}
    }

    const mR=Math.min(W,H)*0.1;
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,mR*3);
    cg.addColorStop(0,'rgba(200,168,75,0.22)');cg.addColorStop(0.4,'rgba(77,217,232,0.07)');cg.addColorStop(1,'rgba(200,168,75,0)');
    ctx.beginPath();ctx.arc(cx,cy,mR*3,0,Math.PI*2);ctx.fillStyle=cg;ctx.fill();

    ctx.save();ctx.translate(cx,cy);ctx.rotate(t*0.004);
    for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2; ctx.beginPath();ctx.moveTo(Math.cos(a)*mR*0.48,Math.sin(a)*mR*0.48);ctx.lineTo(Math.cos(a)*mR,Math.sin(a)*mR);ctx.strokeStyle=`rgba(200,168,75,${0.48+0.28*Math.sin(t*0.05)})`;ctx.lineWidth=1;ctx.stroke();}
    ctx.rotate(-t*0.009);
    ctx.beginPath();
    for(let i=0;i<3;i++){const a=(i/3)*Math.PI*2-Math.PI/2; i===0?ctx.moveTo(Math.cos(a)*mR*0.44,Math.sin(a)*mR*0.44):ctx.lineTo(Math.cos(a)*mR*0.44,Math.sin(a)*mR*0.44);}
    ctx.closePath();ctx.strokeStyle='rgba(77,217,232,0.38)';ctx.lineWidth=0.8;ctx.stroke();
    ctx.restore();
    ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.fillStyle='rgba(200,168,75,0.95)';ctx.fill();

    nodes.forEach((n,i)=>{
      n.pulse+=0.045;
      n.x=n.ox+Math.sin(t*0.009+i*1.1)*5.5;
      n.y=n.oy+Math.cos(t*0.007+i*1.7)*4.5;
      const glR=n.r+4+Math.sin(n.pulse)*2.5;
      const ng=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,glR*3.5);
      ng.addColorStop(0,`rgba(${n.col},0.4)`);ng.addColorStop(1,`rgba(${n.col},0)`);
      ctx.beginPath();ctx.arc(n.x,n.y,glR*3.5,0,Math.PI*2);ctx.fillStyle=ng;ctx.fill();
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=`rgba(${n.col},0.92)`;ctx.fill();
      ctx.beginPath();ctx.arc(n.x,n.y,n.r+0.5,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.28)';ctx.lineWidth=0.5;ctx.stroke();
      const fs=mob?9:11;ctx.font=`${fs}px 'Cinzel',serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const tw=ctx.measureText(n.kw.word).width;
      const off=n.r+(mob?13:15);
      const ly=n.y<cy?n.y-off:n.y+off;
      ctx.fillStyle='rgba(4,4,15,0.78)';ctx.fillRect(n.x-tw/2-4,ly-fs/2-3,tw+8,fs+6);
      ctx.fillStyle=`rgba(${n.col},0.95)`;ctx.fillText(n.kw.word,n.x,ly);
    });

    t++;vizAF=requestAnimationFrame(draw);
  }
  draw();
}

// ─────────────────────────────────────────────────────────────
// 8. FREQUENCY BAR CHART RENDERER
// width:0 → delayed set to width:x% triggers CSS transition animation
// ─────────────────────────────────────────────────────────────
function renderFreqBars(keywords){
  const c=document.getElementById('freq-bars');c.innerHTML='';
  const maxF=keywords[0]?.freq||1;
  keywords.forEach((kw,i)=>{
    const pct=(kw.freq/maxF*100).toFixed(1);
    const row=document.createElement('div');row.className='freq-row';
    row.innerHTML=`<div class="freq-word">${kw.word}</div><div class="freq-bar-wrap"><div class="freq-bar" id="fb${i}"></div></div><div class="freq-count">${kw.freq}×</div>`;
    c.appendChild(row);
    setTimeout(()=>{const b=document.getElementById(`fb${i}`);if(b)b.style.width=pct+'%';},80+i*55);
  });
}

// ─────────────────────────────────────────────────────────────
// 9. ORACLE PRONOUNCEMENT GENERATOR
// Keywords fill sentence templates via seeded PRNG selection.
// Answer-Book style: direct, short, personal-feeling.
// The meaning you read into it is yours — not the data's.
// ─────────────────────────────────────────────────────────────
function generatePronounc(keywords,seed,question){
  // "Answer-book" mode: return ONE broad theme word.
  // Always chosen from scraped Wikipedia keywords; seeded + biased toward abstract terms.
  return pickThemeWord(keywords, question, seed);
}

// ─────────────────────────────────────────────────────────────
// MAIN FLOW
// ─────────────────────────────────────────────────────────────
let currentState=null,loadingInterval=null;
const MSGS=['CONSULTING THE AKASHIC RECORDS...','EXTRACTING SEMANTIC PATTERNS...','COMPUTING DESTINY COEFFICIENTS...','WEAVING THE CONSTELLATION...','THE ORACLE STIRS...','TRAVERSING PROBABILITY FIELDS...','DECODING THE SIGNAL...'];

async function invokeOracle(){
  const q=document.getElementById('question').value.trim();
  const pp=document.getElementById('passphrase').value.trim();
  const err=document.getElementById('error-msg');
  if(!q||!pp){err.classList.add('active');return;}
  err.classList.remove('active');
  document.getElementById('input-section').style.display='none';
  document.getElementById('oracle-result').classList.remove('active');
  const ls=document.getElementById('loading-state');ls.classList.add('active');
  let mi=0;const lt=document.getElementById('loading-text');
  loadingInterval=setInterval(()=>{mi=(mi+1)%MSGS.length;lt.textContent=MSGS[mi];},1300);

  try{
    const seed=djb2(q.toLowerCase()+'|'+pp.toLowerCase());
    const wiki=await fetchWikipedia(q);
    const kw=extractKeywords(wiki.extract,seed,12);
    const map=computeMapping(kw,seed);
    const pronounce=generatePronounc(kw,seed,q);
    currentState={seed,wiki,kw,map,pronounce};

    const grid=document.getElementById('keywords-grid');grid.innerHTML='';
    kw.forEach((k,i)=>{
      const c=document.createElement('div');c.className='keyword-card';
      c.style.animationDelay=`${i*0.09}s`;
      c.title=`"${k.word}" appears ${k.freq} time${k.freq>1?'s':''} in the Wikipedia article about your question.`;
      c.innerHTML=`${k.word}<span class="keyword-freq">${k.freq}×</span>`;
      grid.appendChild(c);
    });

    renderFreqBars(kw);
    document.getElementById('pronouncement-text').innerHTML=`<div style="font-size:2.4rem;font-style:normal;letter-spacing:0.22em;line-height:1.2"><em>${pronounce.toUpperCase()}</em></div>`;
    document.getElementById('seed-display').textContent=`From "${wiki.title}" · ${kw.length} words extracted · Your ritual word became seed #${seed}`;

    document.getElementById('dv-source').innerHTML=`The oracle consulted: <strong style="color:var(--gold-pale)">${wiki.title}</strong><br><a href="${wiki.url}" target="_blank" rel="noopener">${wiki.url}</a><br><span style="font-size:0.82rem;color:var(--silver-dim)">This Wikipedia article (${wiki.extract.length.toLocaleString()} characters) is the only data source. No AI was used. No mystical database was queried.</span>`;
    document.getElementById('dv-seed').innerHTML=`Your ritual word <em style="color:var(--gold)">"${pp}"</em> was converted into the number <strong style="font-family:'Share Tech Mono';color:var(--cyan)">${seed}</strong> using a hash function.<br><span style="font-size:0.82rem;color:var(--silver-dim)">That number controlled everything: which words appeared, how large each node is, where it sits in the constellation. Same word + same question = exactly the same result every time. There is no randomness. There is no oracle. There is only a number.</span>`;
    document.getElementById('dv-mapping').innerHTML=[
      ['Total keyword frequency','→',`BPM: ${map.bpm}`],
      ['Average word length','→',`Reverb decay: ${map.reverb}s`],
      [`Keyword count (${kw.length})`,'→',`${map.voices} layered voices`],
      ['Seed mod 7','→',`Scale: ${map.scale}`],
      ['Seed mod 5','→',`Timbre: ${map.timbre}`],
      ['Word freq ratio','→','Node size in constellation'],
      [`Seed hue (${map.hue}°)`,'→','Particle colour tint'],
    ].map(([a,,c])=>`<tr><td>${a}</td><td>→</td><td>${c}</td></tr>`).join('');
    document.getElementById('dv-excerpt').textContent=(wiki.extract||'').slice(0,420)+'…';
    document.getElementById('dv-critical').innerHTML=`Here is what actually happened:<br><br>
You typed a question. The system searched Wikipedia for an article related to it, then counted how many times each word appeared in that article. It then selected a single theme word from the extracted keywords (always from Wikipedia), with an explicit bias toward abstract terms to keep the answer legible. Your ritual word was turned into a number — seed #${seed} — and that number decided which words to highlight and how to arrange them in the constellation above.<br><br>
The oracle did not "read" your question. It does not know anything about your life. The words it chose are simply the words that Wikipedia uses most often when writing about that topic.<br><br>
And yet — the answer probably felt like it fit. That feeling is real. It is called <em style="color:var(--rose)">apophenia</em>: the human mind's tendency to find meaning in patterns, even when the patterns are random. We do it with clouds, with horoscopes, with dreams, and with AI chatbots that sound confident and wise. The mechanism is identical.<br><br>
The oracle is a mirror. What you saw in it was already yours.`;

    clearInterval(loadingInterval);ls.classList.remove('active');
    document.getElementById('oracle-result').classList.add('active');
    setView('oracle');
    requestAnimationFrame(()=>{ const con=document.querySelector('.viz-wrap'); renderVisualization(kw,seed,map,con); });

  }catch(e){
    clearInterval(loadingInterval);ls.classList.remove('active');
    document.getElementById('input-section').style.display='block';
    const err=document.getElementById('error-msg');err.textContent=`Oracle unreachable: ${e.message}`;err.classList.add('active');
    console.error(e);
  }
}

function setView(v){
  document.getElementById('oracle-view').classList.toggle('active',v==='oracle');
  document.getElementById('data-view').classList.toggle('active',v==='data');
  document.getElementById('btn-oracle').classList.toggle('active',v==='oracle');
  document.getElementById('btn-data').classList.toggle('active',v==='data');
  if(v==='oracle'&&currentState){requestAnimationFrame(()=>renderVisualization(currentState.kw,currentState.seed,currentState.map,document.querySelector('.viz-wrap')));}
  else{if(vizAF){cancelAnimationFrame(vizAF);vizAF=null;}}
}

function resetOracle(){
  if(vizAF){cancelAnimationFrame(vizAF);vizAF=null;}
  currentState=null;
  document.getElementById('oracle-result').classList.remove('active');
  document.getElementById('input-section').style.display='block';
  document.getElementById('question').value='';document.getElementById('passphrase').value='';
  document.getElementById('error-msg').classList.remove('active');
}

document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')invokeOracle();});