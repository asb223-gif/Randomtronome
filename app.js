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

  const NS="http://www.w3.org/2000/svg";
  const W=900,H=205;
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
  const line=(x1,y1,x2,y2,w=1.35)=>add("line",{x1,y1,x2,y2,stroke:"#aeb4bc","stroke-width":w,"stroke-linecap":"round"});
  const txt=(x,y,t,size=14,weight=500,anchor="start")=>{
    const e=add("text",{x,y,fill:"#f0f2f4","font-size":size,"font-family":"Georgia, 'Times New Roman', serif","font-weight":weight,"text-anchor":anchor});
    e.textContent=t; return e;
  };
  const noteHead=(x,y)=>{
    add("ellipse",{cx:x,cy:y,rx:7.2,ry:5.1,fill:"#f0f2f4",transform:`rotate(-18 ${x} ${y})`});
  };
  const stem=(x,y,h=38)=>line(x+6.2,y-1,x+6.2,y-h,1.8);

  const staffLeft=72, staffRight=875, staffTop=69, gap=11;
  for(let i=0;i<5;i++) line(staffLeft,staffTop+i*gap,staffRight,staffTop+i*gap,1.05);
  line(staffLeft,staffTop,staffLeft,staffTop+4*gap,1.8);
  line(staffRight,staffTop,staffRight,staffTop+4*gap,2.4);

  // Minimal percussion-style header: 4/4 only, cleaner for rhythm reading.
  const ts1=txt(87,88,"4",22,700,"middle");
  const ts2=txt(87,110,"4",22,700,"middle");
  ts1.setAttribute("fill","#dfe3e7");
  ts2.setAttribute("fill","#dfe3e7");

  const contentStart=118, contentEnd=860;
  const beatW=(contentEnd-contentStart)/4;
  const y=staffTop+2*gap;

  // Small beat guides below the stave.
  for(let b=0;b<4;b++){
    const beatNo=txt(contentStart+b*beatW+beatW/2,153,String(b+1),11,700,"middle");
    beatNo.setAttribute("fill","#6f7782");
  }

  function drawSixteenthRest(x){
    // Custom compact 16th rest, avoids OS music-font dependency.
    line(x+2,y-26,x-2,y+5,1.8);
    add("circle",{cx:x+4,cy:y-23,r:2.7,fill:"#f0f2f4"});
    add("circle",{cx:x+1,cy:y-12,r:2.7,fill:"#f0f2f4"});
    line(x+3,y-20,x+9,y-15,1.4);
    line(x,y-9,x+6,y-4,1.4);
  }
  function drawEighthRest(x){
    add("circle",{cx:x-1,cy:y-16,r:3,fill:"#f0f2f4"});
    line(x+1,y-14,x+7,y-8,1.7);
    line(x+7,y-8,x+1,y+6,1.7);
  }

  S.rhythm.forEach((beat,bi)=>{
    const bx=contentStart+bi*beatW;
    const slots=beat.on.length;
    const pad=beat.type==="triplet"?26:20;
    const xs=Array.from({length:slots},(_,i)=>bx+pad+(beatW-2*pad)*(slots===1?.5:i/(slots-1)));

    if(beat.type==="sixteenth"){
      // First draw noteheads/rests and stems.
      beat.on.forEach((on,i)=>{
        if(on){ noteHead(xs[i],y); stem(xs[i],y); }
        else drawSixteenthRest(xs[i]);
      });

      // Beam only contiguous note groups. This looks much closer to engraved notation
      // than stretching a beam across rests.
      let i=0;
      while(i<slots){
        if(!beat.on[i]){i++;continue;}
        let j=i;
        while(j+1<slots && beat.on[j+1]) j++;
        if(j>i){
          const x1=xs[i]+6.2, x2=xs[j]+6.2;
          line(x1,y-38,x2,y-38,4.4);
          line(x1,y-31.5,x2,y-31.5,4.0);
        }else{
          const x=xs[i]+6.2;
          line(x,y-38,x+12,y-34,3.6);
          line(x,y-31.5,x+11,y-27.5,3.4);
        }
        i=j+1;
      }
    }else{
      beat.on.forEach((on,i)=>{
        if(on){ noteHead(xs[i],y); stem(xs[i],y,34); }
        else drawEighthRest(xs[i]);
      });

      // Single beam for contiguous triplet eighth notes.
      let i=0;
      while(i<slots){
        if(!beat.on[i]){i++;continue;}
        let j=i;
        while(j+1<slots && beat.on[j+1]) j++;
        if(j>i){
          line(xs[i]+6.2,y-34,xs[j]+6.2,y-34,4.2);
        }else{
          line(xs[i]+6.2,y-34,xs[i]+18,y-30,3.7);
        }
        i=j+1;
      }

      // Elegant triplet bracket above the beat.
      const l=bx+14, r=bx+beatW-14, by=33, mid=(l+r)/2;
      line(l,by,l,by+7,1.1);
      line(l,by,mid-13,by,1.1);
      line(mid+13,by,r,by,1.1);
      line(r,by,r,by+7,1.1);
      txt(mid,by+5,"3",15,700,"middle");
    }

    // Tiny beat separator below the staff only.
    if(bi<3){
      const sep=bx+beatW;
      line(sep,staffTop+4*gap+8,sep,staffTop+4*gap+14,.75);
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
