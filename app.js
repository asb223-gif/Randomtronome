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
}

function renderPattern(){
  if($("summary")) {
    $("summary").textContent = S.rhythm
      .map(x => x.type === "triplet" ? "3연음" : "16분")
      .join(" · ");
  }

  const host = $("score");
  if(!host) return;

  host.innerHTML = "";
  host.removeAttribute("style");

  // 악보 렌더링은 오디오 엔진과 완전히 독립.
  // VexFlow가 실패해도 Play/Stop은 계속 작동한다.
  try {
    if(!window.Vex || !Vex.Flow) throw new Error("VexFlow not loaded");

    const VF = Vex.Flow;
    const mobile = window.innerWidth < 560;
    const width = Math.max(mobile ? 620 : 760, host.clientWidth || 620);
    const height = mobile ? 155 : 170;

    const renderer = new VF.Renderer(host, VF.Renderer.Backends.SVG);
    renderer.resize(width, height);

    const ctx = renderer.getContext();
    const margin = 8;
    const beatWidth = (width - margin * 2) / 4;

    S.rhythm.forEach((beat, beatIndex) => {
      const x = margin + beatIndex * beatWidth;
      const stave = new VF.Stave(x, 25, beatWidth + 1);

      if(beatIndex === 0) {
        stave.addClef("percussion");
        stave.addTimeSignature("4/4");
      }

      stave.setContext(ctx).draw();

      const notes = beat.on.map(on => {
        return new VF.StaveNote({
          clef: "percussion",
          keys: ["c/5"],
          duration: beat.type === "triplet"
            ? (on ? "8" : "8r")
            : (on ? "16" : "16r")
        });
      });

      const voice = new VF.Voice({
        num_beats: 1,
        beat_value: 4
      });

      voice.addTickables(notes);

      const usableWidth = Math.max(
        55,
        beatWidth - (beatIndex === 0 ? 58 : 20)
      );

      new VF.Formatter()
        .joinVoices([voice])
        .format([voice], usableWidth);

      voice.draw(ctx, stave);

      if(beat.type === "triplet") {
        const tuplet = new VF.Tuplet(notes, {
          num_notes: 3,
          notes_occupied: 2
        });
        tuplet.setContext(ctx).draw();
      } else {
        VF.Beam.generateBeams(notes).forEach(beam => {
          beam.setContext(ctx).draw();
        });
      }
    });

    // SVG를 모바일에서도 선명하게 유지
    const svg = host.querySelector("svg");
    if(svg) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "랜덤으로 생성된 한 마디 리듬 악보");
    }

  } catch(err) {
    console.error("Score render failed:", err);
    renderFallbackPattern(host);
  }
}

function renderFallbackPattern(host){
  host.innerHTML = "";
  Object.assign(host.style,{
    background:"#0d1014",
    display:"grid",
    gridTemplateColumns:"repeat(4,1fr)",
    gap:"8px",
    padding:"16px",
    height:"auto",
    minHeight:"130px"
  });

  S.rhythm.forEach((beat,i)=>{
    const card=document.createElement("div");
    Object.assign(card.style,{
      background:"#181c22",
      border:"1px solid #272c34",
      borderRadius:"12px",
      padding:"12px 6px"
    });

    const label=document.createElement("div");
    label.textContent=`${i+1}박`;
    Object.assign(label.style,{
      textAlign:"center",
      fontSize:"10px",
      color:"#858c96",
      marginBottom:"12px"
    });

    const dots=document.createElement("div");
    Object.assign(dots.style,{
      display:"flex",
      justifyContent:"center",
      gap:"6px"
    });

    beat.on.forEach(on=>{
      const d=document.createElement("span");
      Object.assign(d.style,{
        display:"block",
        width:"11px",
        height:"11px",
        borderRadius:"50%",
        background:on?"#d9ff4f":"#363c45"
      });
      dots.appendChild(d);
    });

    card.append(label,dots);
    host.appendChild(card);
  });
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

  let resizeTimer = null;
  window.addEventListener("resize",()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{ if(S.rhythm.length) renderPattern(); },180);
  });

});
