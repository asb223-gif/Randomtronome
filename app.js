// Randomtronome - stable audio / random engine
console.log("Randomtronome app.js loaded!");

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
  nextBarTime: 0
};

const beatSettings = [
  { min: 1, max: 4 },
  { min: 1, max: 4 },
  { min: 1, max: 4 },
  { min: 1, max: 4 }
];

function $(id) {
  return document.getElementById(id);
}

// --------------------------------------------------
// 박별 음 개수 UI
// --------------------------------------------------

function currentMaxSlots() {
  return S.mode === "triplet" ? 3 : 4;
}

function buildBeatSettings() {
  const box = $("beatSettings");

  if (!box) return;

  box.innerHTML = "";

  const maxSlots = currentMaxSlots();

  for (let i = 0; i < 4; i++) {

    beatSettings[i].min =
      Math.min(beatSettings[i].min, maxSlots);

    beatSettings[i].max =
      Math.min(beatSettings[i].max, maxSlots);

    if (beatSettings[i].min > beatSettings[i].max) {
      beatSettings[i].min = beatSettings[i].max;
    }

    const div = document.createElement("div");

    div.className = "beat";

    div.innerHTML = `
      <b>${i + 1}박</b>

      <div class="range">

        <select class="min"></select>

        <span>~</span>

        <select class="max"></select>

      </div>
    `;

    const minSelect = div.querySelector(".min");
    const maxSelect = div.querySelector(".max");

    for (let n = 0; n <= maxSlots; n++) {

      minSelect.add(
        new Option(n, n)
      );

      maxSelect.add(
        new Option(n, n)
      );
    }

    minSelect.value = beatSettings[i].min;
    maxSelect.value = beatSettings[i].max;

    minSelect.addEventListener("change", () => {

      beatSettings[i].min =
        Number(minSelect.value);

      if (
        beatSettings[i].min >
        beatSettings[i].max
      ) {
        beatSettings[i].max =
          beatSettings[i].min;

        maxSelect.value =
          beatSettings[i].max;
      }
    });

    maxSelect.addEventListener("change", () => {

      beatSettings[i].max =
        Number(maxSelect.value);

      if (
        beatSettings[i].max <
        beatSettings[i].min
      ) {
        beatSettings[i].min =
          beatSettings[i].max;

        minSelect.value =
          beatSettings[i].min;
      }
    });

    box.appendChild(div);
  }
}

// --------------------------------------------------
// 랜덤 패턴
// --------------------------------------------------

function randomPattern(slots, count) {

  const positions =
    Array.from(
      { length: slots },
      (_, i) => i
    );

  // shuffle
  for (
    let i = positions.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      positions[i],
      positions[j]
    ] = [
      positions[j],
      positions[i]
    ];
  }

  const result =
    Array(slots).fill(false);

  positions
    .slice(0, count)
    .forEach(index => {
      result[index] = true;
    });

  return result;
}

function generateRhythm() {

  const result = [];

  for (let beat = 0; beat < 4; beat++) {

    let type = S.mode;

    if (S.mode === "mixed") {

      const triplet =
        Math.random() * 100 <
        S.chance;

      type =
        triplet
          ? "triplet"
          : "sixteenth";
    }

    const slots =
      type === "triplet"
        ? 3
        : 4;

    const min =
      Math.min(
        beatSettings[beat].min,
        slots
      );

    const max =
      Math.min(
        Math.max(
          beatSettings[beat].max,
          min
        ),
        slots
      );

    const count =
      min +
      Math.floor(
        Math.random() *
        (max - min + 1)
      );

    result.push({

      type: type,

      on:
        randomPattern(
          slots,
          count
        )
    });
  }

  S.rhythm = result;

  updateRhythmDisplay();

  console.log(
    "New rhythm:",
    S.rhythm
  );
}

// --------------------------------------------------
// 악보 대신 임시 리듬 표시
// VexFlow와 완전히 독립
// --------------------------------------------------

function updateRhythmDisplay() {

  const summary =
    $("summary");

  if (summary) {

    summary.textContent =
      S.rhythm
        .map(beat => {

          return beat.type === "triplet"
            ? "3연음"
            : "16분";

        })
        .join(" · ");
  }

  const score =
    $("score");

  if (!score) return;

  score.innerHTML = "";

  score.style.background =
    "#0d1014";

  score.style.display =
    "grid";

  score.style.gridTemplateColumns =
    "repeat(4, 1fr)";

  score.style.gap =
    "8px";

  score.style.padding =
    "16px";

  score.style.height =
    "auto";

  score.style.minHeight =
    "130px";

  S.rhythm.forEach(
    (beat, beatIndex) => {

      const beatBox =
        document.createElement("div");

      beatBox.style.background =
        "#181c22";

      beatBox.style.border =
        "1px solid #272c34";

      beatBox.style.borderRadius =
        "12px";

      beatBox.style.padding =
        "12px 7px";

      const title =
        document.createElement("div");

      title.textContent =
        `${beatIndex + 1}`;

      title.style.textAlign =
        "center";

      title.style.fontSize =
        "11px";

      title.style.color =
        "#858c96";

      title.style.marginBottom =
        "12px";

      beatBox.appendChild(title);

      const slots =
        document.createElement("div");

      slots.style.display =
        "flex";

      slots.style.justifyContent =
        "center";

      slots.style.gap =
        "6px";

      beat.on.forEach(on => {

        const dot =
          document.createElement("span");

        dot.style.width =
          "11px";

        dot.style.height =
          "11px";

        dot.style.borderRadius =
          "50%";

        dot.style.display =
          "block";

        if (on) {

          dot.style.background =
            "#d9ff4f";

          dot.style.boxShadow =
            "0 0 8px rgba(217,255,79,.4)";

        } else {

          dot.style.background =
            "#363c45";
        }

        slots.appendChild(dot);
      });

      beatBox.appendChild(slots);

      const type =
        document.createElement("div");

      type.textContent =
        beat.type === "triplet"
          ? "3"
          : "16";

      type.style.textAlign =
        "center";

      type.style.marginTop =
        "11px";

      type.style.fontSize =
        "9px";

      type.style.color =
        "#606873";

      beatBox.appendChild(type);

      score.appendChild(beatBox);
    });
}

// --------------------------------------------------
// AUDIO
// --------------------------------------------------

function getAudioContext() {

  if (!S.ctx) {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {

      alert(
        "이 브라우저는 Web Audio API를 지원하지 않습니다."
      );

      return null;
    }

    S.ctx =
      new AudioContext();
  }

  return S.ctx;
}

// --------------------------------------------------
// 디지털 클릭
// --------------------------------------------------

function makeClick(
  time,
  type = "rhythm"
) {

  const ctx =
    getAudioContext();

  if (!ctx) return;

  const osc =
    ctx.createOscillator();

  const gain =
    ctx.createGain();

  // 디지털 느낌
  osc.type =
    "square";

  if (type === "metro") {

    osc.frequency
      .setValueAtTime(
        700,
        time
      );

  } else if (
    type === "accent"
  ) {

    osc.frequency
      .setValueAtTime(
        1800,
        time
      );

  } else {

    osc.frequency
      .setValueAtTime(
        1350,
        time
      );
  }

  gain.gain
    .setValueAtTime(
      0.0001,
      time
    );

  gain.gain
    .exponentialRampToValueAtTime(
      type === "metro"
        ? 0.06
        : 0.14,
      time + 0.002
    );

  gain.gain
    .exponentialRampToValueAtTime(
      0.0001,
      time + 0.045
    );

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);

  osc.stop(
    time + 0.05
  );
}

// --------------------------------------------------
// 한 마디 스케줄링
// --------------------------------------------------

function scheduleBar(startTime) {

  const beatDuration =
    60 / S.bpm;

  S.rhythm.forEach(
    (beat, beatIndex) => {

      const beatStart =
        startTime +
        beatIndex *
        beatDuration;

      // 메트로놈 Click
      if (S.click) {

        makeClick(
          beatStart,
          "metro"
        );
      }

      const subdivision =
        beatDuration /
        beat.on.length;

      beat.on.forEach(
        (on, slotIndex) => {

          if (!on) return;

          const time =
            beatStart +
            slotIndex *
            subdivision;

          const accent =
            beatIndex === 0 &&
            slotIndex === 0;

          makeClick(
            time,
            accent
              ? "accent"
              : "rhythm"
          );
        });

      scheduleBeatIndicator(
        beatStart,
        beatIndex
      );
    });
}

// --------------------------------------------------
// 화면 박자 표시
// --------------------------------------------------

function scheduleBeatIndicator(
  time,
  beat
) {

  const ctx =
    getAudioContext();

  const delay =
    Math.max(
      0,
      (
        time -
        ctx.currentTime
      ) * 1000
    );

  const id =
    setTimeout(
      () => {

        document
          .querySelectorAll(
            "#beatDots i"
          )
          .forEach(
            (dot, index) => {

              dot.classList
                .toggle(
                  "on",
                  index === beat
                );
            });

      },
      delay
    );

  S.uiTimers.push(id);
}

// --------------------------------------------------
// scheduler
// --------------------------------------------------

function scheduler() {

  if (!S.playing)
    return;

  const ctx =
    getAudioContext();

  const scheduleAhead =
    0.12;

  while (
    S.nextBarTime <
    ctx.currentTime +
    scheduleAhead
  ) {

    scheduleBar(
      S.nextBarTime
    );

    S.nextBarTime +=
      4 *
      (60 / S.bpm);
  }

  S.schedulerTimer =
    setTimeout(
      scheduler,
      25
    );
}

// --------------------------------------------------
// PLAY
// --------------------------------------------------

async function play() {

  if (S.playing)
    return;

  console.log("PLAY");

  // 다시 Play 할 때마다
  // 새로운 랜덤 리듬
  generateRhythm();

  const ctx =
    getAudioContext();

  if (!ctx) return;

  try {

    if (
      ctx.state ===
      "suspended"
    ) {

      await ctx.resume();
    }

  } catch (error) {

    console.error(
      error
    );
  }

  S.playing = true;

  const status =
    $("status");

  if (status) {

    status.textContent =
      "PLAYING";

    status.classList.add(
      "live"
    );
  }

  S.nextBarTime =
    ctx.currentTime +
    0.08;

  scheduler();
}

// --------------------------------------------------
// STOP
// --------------------------------------------------

function stop() {

  console.log("STOP");

  S.playing =
    false;

  clearTimeout(
    S.schedulerTimer
  );

  S.schedulerTimer =
    null;

  S.uiTimers
    .forEach(
      clearTimeout
    );

  S.uiTimers = [];

  const status =
    $("status");

  if (status) {

    status.textContent =
      "STOPPED";

    status.classList.remove(
      "live"
    );
  }

  document
    .querySelectorAll(
      "#beatDots i"
    )
    .forEach(
      dot =>
        dot.classList
          .remove("on")
    );
}

// --------------------------------------------------
// UI 연결
// --------------------------------------------------

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "Randomtronome DOM ready"
    );

    buildBeatSettings();

    generateRhythm();

    // MODE
    document
      .querySelectorAll(
        ".modes button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".modes button"
              )
              .forEach(
                b =>
                  b.classList
                    .remove(
                      "active"
                    )
              );

            button.classList
              .add("active");

            S.mode =
              button.dataset.mode;

            buildBeatSettings();

            generateRhythm();
          });
      });

    // Triplet chance
    if ($("tripletChance")) {

      $("tripletChance")
        .addEventListener(
          "input",
          event => {

            S.chance =
              Number(
                event.target.value
              );

            $("chanceText")
              .textContent =
              S.chance + "%";
          });
    }

    // BPM minus
    if ($("minus")) {

      $("minus")
        .addEventListener(
          "click",
          () => {

            S.bpm =
              Math.max(
                40,
                S.bpm - 1
              );

            $("bpm").value =
              S.bpm;
          });
    }

    // BPM plus
    if ($("plus")) {

      $("plus")
        .addEventListener(
          "click",
          () => {

            S.bpm =
              Math.min(
                240,
                S.bpm + 1
              );

            $("bpm").value =
              S.bpm;
          });
    }

    // BPM input
    if ($("bpm")) {

      $("bpm")
        .addEventListener(
          "change",
          event => {

            S.bpm =
              Math.max(
                40,
                Math.min(
                  240,
                  Number(
                    event.target.value
                  ) || 90
                )
              );

            event.target.value =
              S.bpm;
          });
    }

    // CLICK
    if ($("click")) {

      $("click")
        .addEventListener(
          "change",
          event => {

            S.click =
              event.target.checked;
          });
    }

    // PLAY
    if ($("play")) {

      $("play")
        .addEventListener(
          "click",
          play
        );
    }

    // STOP
    if ($("stop")) {

      $("stop")
        .addEventListener(
          "click",
          stop
        );
    }

    // 새 리듬
    if ($("generate")) {

      $("generate")
        .addEventListener(
          "click",
          () => {

            stop();

            generateRhythm();
          });
    }

    // 1박 설정 전체 적용
    if ($("applyAll")) {

      $("applyAll")
        .addEventListener(
          "click",
          () => {

            for (
              let i = 1;
              i < 4;
              i++
            ) {

              beatSettings[i] = {
                ...beatSettings[0]
              };
            }

            buildBeatSettings();
          });
    }

    console.log(
      "Randomtronome initialized"
    );
  });
