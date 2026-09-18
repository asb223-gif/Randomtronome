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
  if($("summary")) $("summary").textContent=S.rhythm.map(x=>x.type==="triplet"?"3연음":"16분").join(" · ");
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

  // 외부 악보 라이브러리 없이 브라우저 SVG로 직접 그린다.
  // 따라서 CDN/VexFlow 로딩 실패와 무관하게 항상 표시된다.
  const NS="http://www.w3.org/2000/svg";
  const W=760,H=170;
  const svg=document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
  svg.setAttribute("width","100%");
  svg.setAttribute("height","170");
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label","랜덤 리듬 악보");
  svg.style.background="#f4f3ee";

  const line=(x1,y1,x2,y2,w=1.4)=>{
    const e=document.createElementNS(NS,"line");
    e.setAttribute("x1",x1);e.setAttribute("y1",y1);
    e.setAttribute("x2",x2);e.setAttribute("y2",y2);
    e.setAttribute("stroke","#111");e.setAttribute("stroke-width",w);
    svg.appendChild(e);return e;
  };
  const text=(x,y,t,size=15,weight="400")=>{
    const e=document.createElementNS(NS,"text");
    e.setAttribute("x",x);e.setAttribute("y",y);
    e.setAttribute("fill","#111");e.setAttribute("font-size",size);
    e.setAttribute("font-family","serif");e.setAttribute("font-weight",weight);
    e.textContent=t;svg.appendChild(e);return e;
  };
  const ellipse=(cx,cy,rx=6,ry=4)=>{
    const e=document.createElementNS(NS,"ellipse");
    e.setAttribute("cx",cx);e.setAttribute("cy",cy);
    e.setAttribute("rx",rx);e.setAttribute("ry",ry);
    e.setAttribute("fill","#111");
    e.setAttribute("transform",`rotate(-18 ${cx} ${cy})`);
    svg.appendChild(e);return e;
  };

  const top=48, gap=10, left=62, right=742;
  for(let i=0;i<5;i++) line(left,top+i*gap,right,top+i*gap,1.1);
  line(left,top,left,top+4*gap,1.5);
  line(right,top,right,top+4*gap,1.5);

  // 4/4
  text(69,63,"4",19,"700"); text(69,82,"4",19,"700");

  const usableStart=98, usableEnd=730;
  const beatW=(usableEnd-usableStart)/4;
  const noteY=top+2*gap;

  function drawRest(x, y, small=false){
    // 간단하지만 명확한 쉼표 기호
    if(small){
      text(x-5,y+5,"𝄿",18,"700");
    }else{
      text(x-5,y+5,"𝄾",18,"700");
    }
  }

  function drawStemNote(x,y,stem=28){
    ellipse(x,y);
    line(x+5,y-1,x+5,y-stem,1.7);
  }

  S.rhythm.forEach((beat,bi)=>{
    const bx=usableStart+bi*beatW;
    const slots=beat.on.length;
    const step=beatW/slots;
    const xs=beat.on.map((_,si)=>bx+step*(si+.5));

    // 박 구분용 아주 옅은 작은 숫자
    text(bx+4,118,String(bi+1),10,"700");

    beat.on.forEach((on,si)=>{
      const x=xs[si];
      if(on) drawStemNote(x,noteY);
      else drawRest(x,noteY,beat.type==="sixteenth");
    });

    const active=beat.on.map((on,i)=>on?i:-1).filter(i=>i>=0);
    if(beat.type==="sixteenth"){
      // 음표가 2개 이상이면 위쪽 빔을 그려 리듬 덩어리를 읽기 쉽게 함
      if(active.length>=2){
        const first=xs[active[0]]+5, last=xs[active[active.length-1]]+5;
        line(first,noteY-28,last,noteY-28,3.5);
        line(first,noteY-23,last,noteY-23,3.5);
      }else if(active.length===1){
        const x=xs[active[0]]+5;
        line(x,noteY-28,x+10,noteY-24,3);
        line(x,noteY-23,x+9,noteY-19,3);
      }
    }else{
      // 3연음 bracket + 3
      const y=28;
      line(xs[0]-10,y,xs[2]+10,y,1.2);
      line(xs[0]-10,y,xs[0]-10,y+6,1.2);
      line(xs[2]+10,y,xs[2]+10,y+6,1.2);
      const bg=document.createElementNS(NS,"rect");
      const mid=(xs[0]+xs[2])/2;
      bg.setAttribute("x",mid-8);bg.setAttribute("y",18);
      bg.setAttribute("width",16);bg.setAttribute("height",15);
      bg.setAttribute("fill","#f4f3ee");svg.appendChild(bg);
      text(mid-4,30,"3",13,"700");
    }

    if(bi<3){
      // 박 경계는 악보를 방해하지 않도록 짧게 표시
      line(bx+beatW,top+4*gap+4,bx+beatW,top+4*gap+10,.8);
    }
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

  setTransportPlaying(false);
});

let notationResizeTimer=null;
window.addEventListener("resize",()=>{
  clearTimeout(notationResizeTimer);
  notationResizeTimer=setTimeout(()=>renderNotation(),180);
});
