const VF = Vex.Flow;

const state = {
  mode: "sixteenth",
  tripletChance: 30,
  bpm: 90,
  click: true,
  settings: [
    { min: 1, max: 4 }, { min: 1, max: 4 },
    { min: 1, max: 4 }, { min: 1, max: 4 }
  ],
  rhythm: null,
  audio: null,
  timer: null,
  playing: false,
  nextBarTime: 0,
  beatIndex: -1
};

const $ = (id) => document.getElementById(id);

function maxSlots() {
  return state.mode === "triplet" ? 3 : 4;
}

function setupSelects() {
  for (let beat = 1; beat <= 4; beat++) {
    const min = $(`min${beat}`), max = $(`max${beat}`);
    min.innerHTML = ""; max.innerHTML = "";
    for (let i = 0; i <= maxSlots(); i++) {
      min.add(new Option(i, i));
      max.add(new Option(i, i));
    }
    const old = state.settings[beat - 1];
    const minVal = Math.min(old.min, maxSlots());
    const maxVal = Math.max(minVal, Math.min(old.max, maxSlots()));
    min.value = minVal; max.value = maxVal;
    min.onchange = () => {
      const s = state.settings[beat - 1];
      s.min = Number(min.value);
      if (s.max < s.min) { s.max = s.min; max.value = s.max; }
    };
    max.onchange = () => {
      const s = state.settings[beat - 1];
      s.max = Number(max.value);
      if (s.min > s.max) { s.min = s.max; min.value = s.min; }
    };
  }
}

function randomSubset(size, count) {
  const indices = Array.from({length:size}, (_,i)=>i);
  for (let i=size-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const result = Array(size).fill(false);
  indices.slice(0,count).forEach(i => result[i] = true);
  return result;
}

function generateRhythm() {
  const beats = [];
  for (let b=0; b<4; b++) {
    let type = state.mode;
    if (state.mode === "mixed") {
      type = Math.random()*100 < state.tripletChance ? "triplet" : "sixteenth";
    }
    const slots = type === "triplet" ? 3 : 4;
    const min = Math.min(state.settings[b].min, slots);
    const max = Math.min(Math.max(state.settings[b].max, min), slots);
    const count = min + Math.floor(Math.random()*(max-min+1));
    beats.push({ type, on: randomSubset(slots, count) });
  }
  state.rhythm = beats;
  renderScore();
  updateSummary();
}

function updateSummary() {
  if (!state.rhythm) return;
  const text = state.rhythm.map(b => b.type === "triplet" ? "3연음" : "16분").join(" · ");
  $("rhythmSummary").textContent = text;
}

function renderScore() {
  const el = $("score");
  el.innerHTML = "";
  const width = Math.max(820, window.innerWidth - 80);
  const factory = new VF.Factory({
    renderer: { elementId: "score", width, height: 190 }
  });
  const score = factory.EasyScore();
  const system = factory.System({ width: width - 20 });

  // For this first GitHub version, each slot is shown explicitly.
  // This keeps timing unambiguous; later we can improve rest grouping/beam engraving.
  const notes = [];
  const tuplets = [];

  state.rhythm.forEach((beat, bi) => {
    if (beat.type === "sixteenth") {
      beat.on.forEach((on, i) => {
        notes.push(score.notes(on ? "B4/16" : "B4/16r", { stem: "up" })[0]);
      });
    } else {
      beat.on.forEach((on, i) => {
        notes.push(score.notes(on ? "B4/8" : "B4/8r", { stem: "up" })[0]);
      });
    }
  });

  // Use low-level notation for predictable mixed-meter timing.
  const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
  const tickables = [];
  let cursor = 0;
  state.rhythm.forEach((beat) => {
    if (beat.type === "sixteenth") {
      beat.on.forEach(on => {
        const n = new VF.StaveNote({
          keys: ["b/4"],
          duration: on ? "16" : "16r",
          stem_direction: VF.Stem.UP
        });
        tickables.push(n);
      });
      cursor += 1;
    } else {
      beat.on.forEach(on => {
        const n = new VF.StaveNote({
          keys: ["b/4"],
          duration: on ? "8" : "8r",
          stem_direction: VF.Stem.UP
        });
        tickables.push(n);
      });
      cursor += 1;
    }
  });

  // Mixed 16th/triplet durations are not directly valid in one ordinary voice.
  // Therefore display each beat as its own 1/4 measure inside the same stave.
  // This gives correct visual grouping for this MVP.
  const beatWidth = Math.max(175, (width - 85) / 4);
  let x = 10;
  state.rhythm.forEach((beat, bi) => {
    const stave = new VF.Stave(x, 35, beatWidth);
    if (bi === 0) stave.addClef("treble").addTimeSignature("4/4");
    stave.setContext(factory.getContext()).draw();

    const local = beat.type === "sixteenth"
      ? beat.on.map(on => new VF.StaveNote({ keys:["b/4"], duration:on?"16":"16r", stem_direction: VF.Stem.UP }))
      : beat.on.map(on => new VF.StaveNote({ keys:["b/4"], duration:on?"8":"8r", stem_direction: VF.Stem.UP }));

    // Fill each beat with rests when needed so the voice totals one quarter.
    const totalSlots = beat.type === "sixteenth" ? 4 : 3;
    if (local.length === 0) {
      local.push(new VF.StaveNote({ keys:["b/4"], duration:"qr" }));
    } else {
      // add explicit rests for all missing slots already present in local.
      // Triplet voice is wrapped in a Tuplet below.
    }

    const localVoice = new VF.Voice({ num_beats: 1, beat_value: 4 });
    if (beat.type === "sixteenth") {
      localVoice.addTickables(local);
      const beams = VF.Beam.generateBeams(local, { stem_direction: VF.Stem.UP });
      new VF.Formatter().joinVoices([localVoice]).format([localVoice], beatWidth - 25);
      localVoice.draw(factory.getContext(), stave);
      beams.forEach(b => b.setContext(factory.getContext()).draw());
    } else {
      // 3 eighth-notated tuplets occupy one quarter.
      localVoice.addTickables(local);
      const tuplet = new VF.Tuplet(local, { num_notes: 3, notes_occupied: 2 });
      new VF.Formatter().joinVoices([localVoice]).format([localVoice], beatWidth - 25);
      localVoice.draw(factory.getContext(), stave);
      tuplet.setContext(factory.getContext()).draw();
    }
    x += beatWidth;
  });
}

function playClick(time, accent=false) {
  const ctx = state.audio;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1550 : 1050;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.18, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.04);
}

function scheduleBar(startTime) {
  const beatDur = 60 / state.bpm;
  state.rhythm.forEach((beat, bi) => {
    const type = beat.type;
    const step = beatDur / (type === "triplet" ? 3 : 4);
    beat.on.forEach((on, si) => {
      if (on) playClick(startTime + bi*beatDur + si*step, bi === 0 && si === 0);
    });
    if (state.click) playClick(startTime + bi*beatDur, bi === 0);
  });
}

function scheduler() {
  if (!state.playing) return;
  const ahead = 0.15;
  while (state.nextBarTime < state.audio.currentTime + ahead) {
    scheduleBar(state.nextBarTime);
    state.nextBarTime += 4 * 60 / state.bpm;
  }
  state.timer = setTimeout(scheduler, 25);
}

async function play() {
  if (state.playing) return;
  if (!state.rhythm) generateRhythm();
  state.audio = state.audio || new (window.AudioContext || window.webkitAudioContext)();
  if (state.audio.state === "suspended") await state.audio.resume();

  state.playing = true;
  $("status").textContent = "PLAYING";
  $("status").classList.add("playing");
  state.nextBarTime = state.audio.currentTime + 0.08;
  scheduler();
}

function stop() {
  state.playing = false;
  clearTimeout(state.timer);
  state.timer = null;
  $("status").textContent = "STOPPED";
  $("status").classList.remove("playing");
  document.querySelectorAll(".beat-indicator span").forEach(x => x.classList.remove("active"));
}

function newRhythm() {
  stop();
  generateRhythm();
}

document.querySelectorAll(".mode").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
    setupSelects();
    generateRhythm();
  });
});

$("tripletChance").addEventListener("input", e => {
  state.tripletChance = Number(e.target.value);
  $("tripletChanceValue").textContent = `${state.tripletChance}%`;
});
$("bpm").addEventListener("change", e => {
  state.bpm = Math.min(240, Math.max(40, Number(e.target.value) || 90));
  e.target.value = state.bpm;
});
$("bpmDown").onclick = () => { $("bpm").value = Math.max(40, --state.bpm); };
$("bpmUp").onclick = () => { $("bpm").value = Math.min(240, ++state.bpm); };
$("clickEnabled").onchange = e => state.click = e.target.checked;
$("play").onclick = play;
$("stop").onclick = stop;
$("generate").onclick = newRhythm;
$("copyAll").onclick = () => {
  const source = state.settings[0];
  state.settings.forEach(s => { s.min = source.min; s.max = source.max; });
  setupSelects();
};

setupSelects();
generateRhythm();
