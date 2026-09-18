const S={mode:"sixteenth",chance:30,bpm:90,click:true,rhythm:null,ctx:null,playing:false,timer:null,next:0,uiTimers:[]};
const $=x=>document.getElementById(x);
const settings=[{min:1,max:4},{min:1,max:4},{min:1,max:4},{min:1,max:4}];

function slotLimitForMode(){return S.mode==="triplet"?3:4}
function buildSettings(){
  const box=$("beatSettings"); box.innerHTML="";
  for(let i=0;i<4;i++){
    settings[i].min=Math.min(settings[i].min,slotLimitForMode());
    settings[i].max=Math.min(settings[i].max,slotLimitForMode());
    if(settings[i].max<settings[i].min)settings[i].min=settings[i].max;
    const d=document.createElement("div");d.className="beat";
    d.innerHTML=`<b>${i+1}박</b><div class="range"><select class="min"></select><span>~</span><select class="max"></select></div>`;
    const a=d.querySelector(".min"),b=d.querySelector(".max");
    for(let n=0;n<=slotLimitForMode();n++){a.add(new Option(n,n));b.add(new Option(n,n))}
    a.value=settings[i].min;b.value=settings[i].max;
    a.onchange=()=>{settings[i].min=+a.value;if(settings[i].min>settings[i].max){settings[i].max=settings[i].min;b.value=settings[i].max}};
    b.onchange=()=>{settings[i].max=+b.value;if(settings[i].max<settings[i].min){settings[i].min=settings[i].max;a.value=settings[i].min}};
    box.appendChild(d);
  }
}
function subset(n,count){let ids=[...Array(n).keys()];for(let i=n-1;i;i--){let j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}let a=Array(n).fill(false);ids.slice(0,count).forEach(i=>a[i]=true);return a}
function generate(){
  S.rhythm=[];
  for(let i=0;i<4;i++){
    let type=S.mode==="mixed"?(Math.random()*100<S.chance?"triplet":"sixteenth"):S.mode;
    const slots=type==="triplet"?3:4;
    const lo=Math.min(settings[i].min,slots),hi=Math.max(lo,Math.min(settings[i].max,slots));
    const count=lo+Math.floor(Math.random()*(hi-lo+1));
    S.rhythm.push({type,on:subset(slots,count)});
  }
  $("summary").textContent=S.rhythm.map(x=>x.type==="triplet"?"3연음":"16분").join("  ·  ");
  renderScore();
}
function renderScore(){
  const host=$("score");host.innerHTML="";
  try{
    if(!window.Vex||!Vex.Flow)throw Error("VexFlow load failed");
    const VF=Vex.Flow, width=Math.max(650,host.clientWidth||650), renderer=new VF.Renderer(host,VF.Renderer.Backends.SVG);
    renderer.resize(width,155);const ctx=renderer.getContext();ctx.setFillStyle("#111318");ctx.setStrokeStyle("#111318");
    const left=10, total=width-20, beatW=total/4;
    S.rhythm.forEach((beat,i)=>{
      const stave=new VF.Stave(left+i*beatW,24,beatW+1);
      if(i===0)stave.addClef("percussion").addTimeSignature("4/4");
      stave.setContext(ctx).draw();
      const notes=beat.on.map(on=>new VF.StaveNote({clef:"percussion",keys:["c/5"],duration:beat.type==="triplet"?(on?"8":"8r"):(on?"16":"16r")}));
      const voice=new VF.Voice({num_beats:1,beat_value:4});
      voice.addTickables(notes);
      new VF.Formatter().joinVoices([voice]).format([voice],Math.max(55,beatW-(i===0?58:20)));
      voice.draw(ctx,stave);
      if(beat.type==="triplet")new VF.Tuplet(notes,{num_notes:3,notes_occupied:2}).setContext(ctx).draw();
      else VF.Beam.generateBeams(notes).forEach(b=>b.setContext(ctx).draw());
    });
  }catch(e){host.innerHTML='<div style="color:#111;padding:55px 18px;text-align:center;font:13px sans-serif">악보 엔진을 불러오지 못했습니다.<br>인터넷 연결 후 새로고침해 주세요.</div>';console.error(e)}
}
function audio(){
  if(!S.ctx)S.ctx=new (window.AudioContext||window.webkitAudioContext)();
  return S.ctx;
}
function hit(time,kind){
  const c=audio(),o=c.createOscillator(),g=c.createGain();
  o.type="square";o.frequency.setValueAtTime(kind==="metro"?880:kind==="accent"?1760:1380,time);
  g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(kind==="metro"?.055:.12,time+.001);
  g.gain.exponentialRampToValueAtTime(.0001,time+.045);
  o.connect(g).connect(c.destination);o.start(time);o.stop(time+.05);
}
function scheduleBar(t){
  const beatDur=60/S.bpm;
  S.rhythm.forEach((beat,bi)=>{
    const step=beatDur/beat.on.length;
    if(S.click)hit(t+bi*beatDur,"metro");
    beat.on.forEach((on,si)=>{if(on)hit(t+bi*beatDur+si*step,(bi===0&&si===0)?"accent":"rhythm")});
    const delay=Math.max(0,(t+bi*beatDur-audio().currentTime)*1000);
    const id=setTimeout(()=>showBeat(bi),delay);S.uiTimers.push(id);
  });
}
function scheduler(){
  if(!S.playing)return;
  while(S.next<audio().currentTime+.12){scheduleBar(S.next);S.next+=4*60/S.bpm}
  S.timer=setTimeout(scheduler,25);
}
function showBeat(i){document.querySelectorAll("#beatDots i").forEach((x,j)=>x.classList.toggle("on",i===j))}
async function play(){
  if(S.playing)return;
  // requirement: every fresh Play after Stop creates a new bar
  generate();
  const c=audio();if(c.state==="suspended")await c.resume();
  S.playing=true;$("status").textContent="PLAYING";$("status").classList.add("live");
  S.next=c.currentTime+.08;scheduler();
}
function stop(){
  S.playing=false;clearTimeout(S.timer);S.uiTimers.forEach(clearTimeout);S.uiTimers=[];
  $("status").textContent="STOPPED";$("status").classList.remove("live");showBeat(-1);
}
document.querySelectorAll(".modes button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".modes button").forEach(x=>x.classList.remove("active"));b.classList.add("active");S.mode=b.dataset.mode;buildSettings();generate()});
$("tripletChance").oninput=e=>{S.chance=+e.target.value;$("chanceText").textContent=S.chance+"%"};
$("minus").onclick=()=>{$("bpm").value=S.bpm=Math.max(40,S.bpm-1)};
$("plus").onclick=()=>{$("bpm").value=S.bpm=Math.min(240,S.bpm+1)};
$("bpm").onchange=e=>{S.bpm=Math.max(40,Math.min(240,+e.target.value||90));e.target.value=S.bpm};
$("click").onchange=e=>S.click=e.target.checked;
$("generate").onclick=()=>{stop();generate()};
$("play").onclick=play;$("stop").onclick=stop;
$("applyAll").onclick=()=>{for(let i=1;i<4;i++)settings[i]={...settings[0]};buildSettings()};
window.addEventListener("resize",()=>{clearTimeout(window._rr);window._rr=setTimeout(renderScore,150)});
buildSettings();generate();
