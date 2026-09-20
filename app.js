console.log("Randomtronome v3 loaded");

const S = {
  mode: "sixteenth",
  chance: 30,
  bpm: 90,
  click: true,
  rhythm: [],
  ctx: null,
  playing: false,
  schedulerTimer: null,
  uiTimers: [],
  nextBarTime: 0,
  activeSounds: []
};

const beatSettings = Array.from({length:4}, () => ({min:1,max:4}));
const $ = id => document.getElementById(id);

function currentMaxSlots(){ return S.mode === "triplet" ? 3 : 4; }

function buildBeatSettings(){
  const box=$("beatSettings"); if(!box) return;
  box.innerHTML="";
  const limit=currentMaxSlots();
  beatSettings.forEach((s,i)=>{
    s.min=Math.min(s.min,limit); s.max=Math.min(s.max,limit);
    if(s.min>s.max) s.min=s.max;
    const div=document.createElement("div");
    div.className="beat";
    div.innerHTML=`<b>${i+1}박</b><div class="range"><select class="min"></select><span>~</span><select class="max"></select></div>`;
    const mn=div.querySelector(".min"), mx=div.querySelector(".max");
    for(let n=0;n<=limit;n++){ mn.add(new Option(n,n)); mx.add(new Option(n,n)); }
    mn.value=s.min; mx.value=s.max;
    mn.onchange=()=>{s.min=+mn.value;if(s.min>s.max){s.max=s.min;mx.value=s.max;}};
    mx.onchange=()=>{s.max=+mx.value;if(s.max<s.min){s.min=s.max;mn.value=s.min;}};
    box.appendChild(div);
  });
}

function randomPattern(slots,count){
  const ids=Array.from({length:slots},(_,i)=>i);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  const out=Array(slots).fill(false);
  ids.slice(0,count).forEach(i=>out[i]=true);
  return out;
}

function generateRhythm(){
  S.rhythm=[];
  for(let b=0;b<4;b++){
    let type=S.mode;
    if(type==="mixed") type=Math.random()*100<S.chance ? "triplet":"sixteenth";
    const slots=type==="triplet"?3:4;
    const lo=Math.min(beatSettings[b].min,slots);
    const hi=Math.max(lo,Math.min(beatSettings[b].max,slots));
    const count=lo+Math.floor(Math.random()*(hi-lo+1));
    S.rhythm.push({type,on:randomPattern(slots,count)});
  }
  renderPattern();
  renderNotation();
}

function renderPattern(){
  const score=$("score"); if(!score) return;
  score.innerHTML="";
  Object.assign(score.style,{background:"#0d1014",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",padding:"16px",height:"auto",minHeight:"130px"});
  S.rhythm.forEach((beat,i)=>{
    const card=document.createElement("div");
    Object.assign(card.style,{background:"#181c22",border:"1px solid #272c34",borderRadius:"12px",padding:"12px 6px"});
    const label=document.createElement("div");
    label.textContent=`${i+1}박`;
    Object.assign(label.style,{textAlign:"center",fontSize:"10px",color:"#858c96",marginBottom:"12px"});
    const dots=document.createElement("div");
    Object.assign(dots.style,{display:"flex",justifyContent:"center",gap:"6px"});
    beat.on.forEach(on=>{
      const d=document.createElement("span");
      Object.assign(d.style,{display:"block",width:"11px",height:"11px",borderRadius:"50%",background:on?"#d9ff4f":"#363c45",boxShadow:on?"0 0 8px rgba(217,255,79,.35)":"none"});
      dots.appendChild(d);
    });
    const type=document.createElement("div");
    type.textContent=beat.type==="triplet"?"TRIPLET":"16TH";
    Object.assign(type.style,{textAlign:"center",marginTop:"11px",fontSize:"8px",letterSpacing:".08em",color:"#606873"});
    card.append(label,dots,type); score.appendChild(card);
  });
}


function renderNotation(){
  const host=$("notation");
  if(!host || !S.rhythm || !S.rhythm.length) return;
  host.innerHTML="";

  const NS="http://www.w3.org/2000/svg";
  const W=900,H=190;
  const svg=document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label","랜덤 리듬 악보");
  svg.style.background="transparent";

  const add=(tag,attrs={})=>{
    const e=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));
    svg.appendChild(e); return e;
  };
  const line=(x1,y1,x2,y2,w=1.35,color="#aeb4bc")=>add("line",{x1,y1,x2,y2,stroke:color,"stroke-width":w,"stroke-linecap":"round"});
  const path=(d,w=1.8,fill="none",color="#f0f2f4")=>add("path",{d,fill,stroke:color,"stroke-width":w,"stroke-linecap":"round","stroke-linejoin":"round"});
  const txt=(x,y,t,size=14,weight=500,anchor="start",color="#f0f2f4")=>{
    const e=add("text",{x,y,fill:color,"font-size":size,"font-family":"Georgia, 'Times New Roman', serif","font-weight":weight,"text-anchor":anchor});
    e.textContent=t; return e;
  };
  const head=(x,y,scale=1)=>{
    add("ellipse",{cx:x,cy:y,rx:8.5*scale,ry:6.5*scale,fill:"#f0f2f4",transform:`rotate(-12 ${x} ${y})`});
  };
  const stem=(x,y,h=42)=>line(x+7.2,y-1,x+7.2,y-h,2,"#f0f2f4");

  const top=62,gap=12,left=54,right=884;
  for(let i=0;i<5;i++) line(left,top+i*gap,right,top+i*gap,1.15,"#7d858f");
  line(left,top,left,top+4*gap,1.7,"#aeb4bc");
  line(right,top,right,top+4*gap,2.5,"#dfe3e7");

  // Properly center 4/4 inside the five-line staff.
  const tsX=78;
  txt(tsX,top+20,"4",24,700,"middle","#dfe3e7");
  txt(tsX,top+43,"4",24,700,"middle","#dfe3e7");

  const contentStart=110,contentEnd=868;
  const beatW=(contentEnd-contentStart)/4;
  const y=top+2*gap;

  function draw16Rest(x){
    path(`M ${x+4} ${y-29} C ${x+11} ${y-29}, ${x+10} ${y-20}, ${x+4} ${y-19}
          M ${x+3} ${y-19} C ${x+10} ${y-18}, ${x+8} ${y-9}, ${x+1} ${y-8}
          M ${x+6} ${y-27} L ${x-2} ${y+8}`,2.2);
  }
  function draw8Rest(x){
    add("ellipse",{cx:x+1,cy:y-20,rx:4.3,ry:3.5,fill:"#f0f2f4",transform:`rotate(-20 ${x+1} ${y-20})`});
    path(`M ${x+4} ${y-18} C ${x+13} ${y-12}, ${x+8} ${y-3}, ${x+1} ${y+9}`,2.5);
  }
  function drawQuarterRest(x){
    path(`M ${x+4} ${y-30} L ${x-3} ${y-16} L ${x+5} ${y-8} L ${x-1} ${y+1}
          C ${x+8} ${y+2}, ${x+7} ${y+10}, ${x+1} ${y+11}`,2.7);
  }

  // Compact notation mapping for 16th-grid onset patterns.
  // Notes are sustained visually to the next onset/end of beat where practical.
  function drawSixteenthBeat(beat,bx){
    // ON = 16분음표, OFF = 16분쉼표. 항상 네 칸을 그대로 표시한다.
    const slotW=beatW/4;
    const xs=[0,1,2,3].map(i=>bx+slotW*(i+.5));
    beat.on.forEach((on,i)=>{ if(on){ head(xs[i],y); stem(xs[i],y); } else draw16Rest(xs[i]); });
    let i=0;
    while(i<4){
      if(!beat.on[i]){ i++; continue; }
      let j=i; while(j+1<4 && beat.on[j+1]) j++;
      if(j>i){
        const x1=xs[i]+7.2, x2=xs[j]+7.2;
        line(x1,y-42,x2,y-42,4.8,"#f0f2f4");
        line(x1,y-34.5,x2,y-34.5,4.3,"#f0f2f4");
      }else{
        const x=xs[i]+7.2;
        line(x,y-42,x+13,y-37.5,4,"#f0f2f4");
        line(x,y-34.5,x+12,y-30.5,3.7,"#f0f2f4");
      }
      i=j+1;
    }
  }

  function drawTripletBeat(beat,bx){
    const pad=29;
    const xs=Array.from({length:3},(_,i)=>bx+pad+(beatW-2*pad)*i/2);
    beat.on.forEach((on,i)=>{
      if(on){head(xs[i],y);stem(xs[i],y,38);}
      else draw8Rest(xs[i]);
    });
    let i=0;
    while(i<3){
      if(!beat.on[i]){i++;continue;}
      let j=i;while(j+1<3&&beat.on[j+1])j++;
      if(j>i)line(xs[i]+7.2,y-38,xs[j]+7.2,y-38,4.7,"#f0f2f4");
      else line(xs[i]+7.2,y-38,xs[i]+20,y-33.5,4,"#f0f2f4");
      i=j+1;
    }
    const l=bx+16,r=bx+beatW-16,by=25,mid=(l+r)/2;
    line(l,by,l,by+7,1.2,"#aeb4bc");
    line(l,by,mid-14,by,1.2,"#aeb4bc");
    line(mid+14,by,r,by,1.2,"#aeb4bc");
    line(r,by,r,by+7,1.2,"#aeb4bc");
    txt(mid,by+5,"3",16,700,"middle","#dfe3e7");
  }

  S.rhythm.forEach((beat,bi)=>{
    const bx=contentStart+bi*beatW;
    if(beat.type==="sixteenth") drawSixteenthBeat(beat,bx);
    else drawTripletBeat(beat,bx);
  });

  host.appendChild(svg);
}
function getAudioContext(){
  if(!S.ctx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC){alert("이 브라우저는 Web Audio API를 지원하지 않습니다.");return null;}
    S.ctx=new AC();
  }
  return S.ctx;
}

function makeClick(time,type="rhythm"){
  const ctx=getAudioContext(); if(!ctx) return;
  const osc=ctx.createOscillator(), gain=ctx.createGain();
  osc.type="square";
  osc.frequency.setValueAtTime(type==="metro"?700:type==="accent"?1800:1350,time);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.exponentialRampToValueAtTime(type==="metro"?.055:.14,time+.002);
  gain.gain.exponentialRampToValueAtTime(.0001,time+.045);
  osc.connect(gain).connect(ctx.destination);
  const item={osc,gain}; S.activeSounds.push(item);
  osc.onended=()=>{const i=S.activeSounds.indexOf(item);if(i>=0)S.activeSounds.splice(i,1);};
  osc.start(time); osc.stop(time+.05);
}

function scheduleBeatIndicator(time,beat){
  const delay=Math.max(0,(time-getAudioContext().currentTime)*1000);
  const id=setTimeout(()=>{
    if(!S.playing)return;
    document.querySelectorAll("#beatDots i").forEach((d,i)=>d.classList.toggle("on",i===beat));
  },delay);
  S.uiTimers.push(id);
}

function scheduleBar(t){
  const beatDur=60/S.bpm;
  S.rhythm.forEach((beat,bi)=>{
    const beatStart=t+bi*beatDur;
    if(S.click) makeClick(beatStart,"metro");
    const sub=beatDur/beat.on.length;
    beat.on.forEach((on,si)=>{
      if(on) makeClick(beatStart+si*sub,(bi===0&&si===0)?"accent":"rhythm");
    });
    scheduleBeatIndicator(beatStart,bi);
  });
}

function scheduler(){
  if(!S.playing)return;
  const ctx=getAudioContext();
  while(S.nextBarTime<ctx.currentTime+.12){
    scheduleBar(S.nextBarTime);
    S.nextBarTime+=4*(60/S.bpm);
  }
  S.schedulerTimer=setTimeout(scheduler,25);
}

function setTransportPlaying(on){
  const b=$("play"); if(!b)return;
  b.classList.toggle("is-playing",on);
  b.innerHTML=on?'■ <span>STOP</span>':'▶ <span>PLAY</span>';
  if($("status")){
    $("status").textContent=on?"PLAYING":"STOPPED";
    $("status").classList.toggle("live",on);
  }
}

async function play(){
  if(S.playing)return;
  generateRhythm();
  const ctx=getAudioContext(); if(!ctx)return;
  if(ctx.state==="suspended") await ctx.resume();
  S.playing=true;
  setTransportPlaying(true);
  S.nextBarTime=ctx.currentTime+.06;
  scheduler();
}

function stop(){
  if(!S.playing){setTransportPlaying(false);return;}
  S.playing=false;
  clearTimeout(S.schedulerTimer); S.schedulerTimer=null;
  S.uiTimers.forEach(clearTimeout); S.uiTimers=[];

  const ctx=S.ctx;
  if(ctx){
    const now=ctx.currentTime;
    S.activeSounds.slice().forEach(({osc,gain})=>{
      try{
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(.0001,now);
        osc.stop(now);
      }catch(_){}
    });
  }
  S.activeSounds=[];
  document.querySelectorAll("#beatDots i").forEach(d=>d.classList.remove("on"));
  setTransportPlaying(false);
}

document.addEventListener("DOMContentLoaded",()=>{
  buildBeatSettings(); generateRhythm();

  document.querySelectorAll(".modes button").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".modes button").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active"); S.mode=btn.dataset.mode; buildBeatSettings(); generateRhythm();
    };
  });

  $("tripletChance").oninput=e=>{S.chance=+e.target.value;$("chanceText").textContent=S.chance+"%";};
  $("minus").onclick=()=>{$("bpm").value=S.bpm=Math.max(40,S.bpm-1);};
  $("plus").onclick=()=>{$("bpm").value=S.bpm=Math.min(240,S.bpm+1);};
  $("bpm").onchange=e=>{S.bpm=Math.max(40,Math.min(240,+e.target.value||90));e.target.value=S.bpm;};
  $("click").onchange=e=>S.click=e.target.checked;
  $("generate").onclick=()=>{stop();generateRhythm();};
  $("applyAll").onclick=()=>{for(let i=1;i<4;i++)beatSettings[i]={...beatSettings[0]};buildBeatSettings();};

  // One button controls both states.
  $("play").onclick=()=>S.playing?stop():play();

  // 박별 음 개수: 모바일에서 기본 닫힘, 탭하면 펼침
  const beatToggle=$("beatToggle");
  const beatBody=$("beatPanelBody");
  if(beatToggle && beatBody){
    beatToggle.onclick=()=>{
      const open=beatToggle.getAttribute("aria-expanded")==="true";
      beatToggle.setAttribute("aria-expanded",String(!open));
      beatBody.hidden=open;
      beatToggle.classList.toggle("open",!open);
    };
  }

  // BPM swipe: 오른쪽으로 밀면 증가, 왼쪽으로 밀면 감소.
  const swipe=$("bpmSwipe");
  if(swipe){
    let startX=null, startBpm=null, lastApplied=0;
    const begin=x=>{startX=x;startBpm=S.bpm;lastApplied=0;swipe.classList.add("swiping");};
    const move=x=>{
      if(startX===null)return;
      const delta=x-startX;
      const steps=Math.trunc(delta/12); // 약 12px당 1 BPM
      if(steps!==lastApplied){
        S.bpm=Math.max(40,Math.min(240,startBpm+steps));
        $("bpm").value=S.bpm;
        lastApplied=steps;
      }
    };
    const end=()=>{startX=null;startBpm=null;swipe.classList.remove("swiping");};

    swipe.addEventListener("pointerdown",e=>{begin(e.clientX);swipe.setPointerCapture?.(e.pointerId);});
    swipe.addEventListener("pointermove",e=>move(e.clientX));
    swipe.addEventListener("pointerup",end);
    swipe.addEventListener("pointercancel",end);
  }

  setTransportPlaying(false);
});

let notationResizeTimer=null;
window.addEventListener("resize",()=>{
  clearTimeout(notationResizeTimer);
  notationResizeTimer=setTimeout(()=>renderNotation(),180);
});
