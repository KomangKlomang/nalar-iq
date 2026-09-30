const state = {
  sessionId: (SESSIONS[0] && SESSIONS[0].id) || "peta",
  picks: JSON.parse(localStorage.getItem("nalar-picks") || "{}"),
  opened: JSON.parse(localStorage.getItem("nalar-opened") || "{}"),
  understood: JSON.parse(localStorage.getItem("nalar-ok") || "{}"),
  remaining: null,
  tick: null,
};

function save() {
  localStorage.setItem("nalar-picks", JSON.stringify(state.picks));
  localStorage.setItem("nalar-opened", JSON.stringify(state.opened));
  localStorage.setItem("nalar-ok", JSON.stringify(state.understood));
}

function sessionById(id) {
  return SESSIONS.find((s) => s.id === id) || SESSIONS[0];
}

function allQuestionIds() {
  return SESSIONS.flatMap((s) => (s.questions || []).map((q) => q.id));
}

function render(opts) {
  const keepScroll = opts && opts.keepScroll;
  const y = keepScroll ? window.scrollY : 0;
  const session = sessionById(state.sessionId);
  const ids = allQuestionIds();
  const understood = ids.filter((id) => state.understood[id]).length;

  document.getElementById("app").innerHTML = `
    <aside class="sidebar">
      <p class="brand">NALAR<span>.</span></p>
      <p class="tagline">Bank soal latihan tes IQ untuk seleksi ketat. Bukan tes klinis. Soal original, logika sama dengan tes sulit.</p>
      <p class="nav-label">Sesi</p>
      <div class="mobile-nav">
        ${SESSIONS.map((s) => `
          <button class="${s.id === session.id ? "active" : ""}" data-go="${s.id}">
            <span class="num">${s.n}</span>${s.title}
          </button>
        `).join("")}
      </div>
      ${SESSIONS.map((s) => `
        <button class="nav-item ${s.id === session.id ? "active" : ""}" data-go="${s.id}">
          <span class="num">${s.n}</span>
          <span class="ttl">${s.title}</span>
        </button>
      `).join("")}
      <div class="progress-mini">
        Tertandai paham: <b>${understood}</b> / ${ids.length} soal<br>
        Pilih jawaban dulu, baru buka kunci.
      </div>
    </aside>
    <main class="main">
      <article class="sheet">
        <header class="sheet-head">
          <p class="kicker">Sesi ${session.n} · ${session.tag}</p>
          <h1>${session.title}</h1>
          <p class="lede">${session.blurb}</p>
        </header>
        <div class="sheet-body">
          ${renderIntro(session)}
          ${session.timed ? renderTimer(session) : ""}
          ${session.questions && session.questions.length ? renderToolbar(session) : ""}
          ${(session.questions || []).map(renderQuestion).join("")}
        </div>
      </article>
    </main>
  `;

  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      stopTimer();
      state.sessionId = el.dataset.go;
      render();
      window.scrollTo(0, 0);
    });
  });

  document.querySelectorAll("[data-pick]").forEach((el) => {
    el.addEventListener("click", () => {
      const qid = el.dataset.qid;
      if (state.opened[qid]) return;
      state.picks[qid] = el.dataset.pick;
      save();
      render({ keepScroll: true });
    });
  });

  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => {
      state.opened[el.dataset.open] = !state.opened[el.dataset.open];
      save();
      render({ keepScroll: true });
    });
  });

  document.querySelectorAll("[data-ok]").forEach((el) => {
    el.addEventListener("click", () => {
      state.understood[el.dataset.ok] = !state.understood[el.dataset.ok];
      save();
      render({ keepScroll: true });
    });
  });

  const openAll = document.querySelector("[data-open-all]");
  if (openAll) {
    openAll.addEventListener("click", () => {
      (session.questions || []).forEach((q) => { state.opened[q.id] = true; });
      save();
      render({ keepScroll: true });
    });
  }
  const hideAll = document.querySelector("[data-hide-all]");
  if (hideAll) {
    hideAll.addEventListener("click", () => {
      (session.questions || []).forEach((q) => { state.opened[q.id] = false; });
      save();
      render({ keepScroll: true });
    });
  }
  const startT = document.querySelector("[data-start-timer]");
  if (startT) startT.addEventListener("click", () => startTimer(session.seconds || 1200));
  if (keepScroll) window.scrollTo(0, y);
}

function renderIntro(session) {
  if (!session.intro) return "";
  const i = session.intro;
  return `
    <section class="method">
      <h2>${i.heading}</h2>
      ${i.why ? `<p>${i.why}</p>` : ""}
      ${i.steps ? `<ol>${i.steps.map((s) => `<li>${s}</li>`).join("")}</ol>` : ""}
      ${i.catalog ? `<div class="catalog">${i.catalog.map((c) => `<div class="cat"><b>${c.k}</b>${c.v}</div>`).join("")}</div>` : ""}
    </section>
    ${i.note ? `<p class="note">${i.note}</p>` : ""}
  `;
}

function renderToolbar(session) {
  return `
    <div class="toolbar">
      <button class="btn" data-open-all>Buka semua kunci</button>
      <button class="btn" data-hide-all>Tutup semua kunci</button>
      <span class="chip">${session.questions.length} soal</span>
    </div>
  `;
}

function renderTimer(session) {
  const mm = state.remaining == null ? Math.floor(session.seconds / 60) : Math.floor(state.remaining / 60);
  const ss = state.remaining == null ? session.seconds % 60 : state.remaining % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `
    <div class="toolbar">
      <span class="timer" id="clock">${label}</span>
      <button class="btn primary" data-start-timer>${state.tick ? "Berjalan" : "Mulai timer " + Math.round(session.seconds / 60) + " menit"}</button>
      <span class="note">Kerjakan tanpa buka kunci. Ini simulasi tekanan kursi sempit.</span>
    </div>
  `;
}

function startTimer(seconds) {
  stopTimer();
  state.remaining = seconds;
  const clock = () => {
    const el = document.getElementById("clock");
    if (!el) return;
    const mm = Math.floor(state.remaining / 60);
    const ss = state.remaining % 60;
    el.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    if (state.remaining <= 0) {
      stopTimer();
      el.textContent = "00:00 · waktu habis";
      return;
    }
    state.remaining -= 1;
  };
  clock();
  state.tick = setInterval(clock, 1000);
}

function stopTimer() {
  if (state.tick) clearInterval(state.tick);
  state.tick = null;
}

function renderQuestion(q) {
  const opened = !!state.opened[q.id];
  const pick = state.picks[q.id];
  const ok = !!state.understood[q.id];
  return `
    <section class="q" id="${q.id}">
      <div class="q-top">
        <span class="q-id">${q.code}</span>
        <span class="chip ${q.level}">${levelLabel(q.level)}</span>
      </div>
      <div class="stem">${q.stem}</div>
      ${q.visual ? `<div class="visual">${q.visual}</div>` : ""}
      ${q.options ? `<div class="options">${q.options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        let cls = "opt";
        if (pick === letter) cls += " picked";
        if (opened && letter === q.key) cls += " correct";
        if (opened && pick === letter && letter !== q.key) cls += " wrong";
        return `<button class="${cls}" data-pick="${letter}" data-qid="${q.id}"><span class="letter">${letter}</span><span>${opt}</span></button>`;
      }).join("")}</div>` : ""}
      <div class="toolbar">
        <button class="btn primary" data-open="${q.id}">${opened ? "Tutup pembahasan" : "Buka kunci & logika"}</button>
        <button class="btn ${ok ? "primary" : ""}" data-ok="${q.id}">${ok ? "Sudah paham" : "Tandai sudah paham"}</button>
      </div>
      <div class="answer ${opened ? "open" : ""}"${opened ? "" : " hidden"}>
        <p class="keyline">Jawaban: ${q.answer}</p>
        <h3>Cara pengerjaan</h3>
        <ol>${q.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
        <h3>Logika dasar</h3>
        <p>${q.logic}</p>
        ${q.trap ? `<h3>Jebakan</h3><p>${q.trap}</p>` : ""}
        ${q.transfer ? `<h3>Kenapa ini muncul di tes sulit</h3><p>${q.transfer}</p>` : ""}
      </div>
    </section>
  `;
}

function levelLabel(level) {
  return ({
    fondasi: "Fondasi",
    seleksi: "Seleksi",
    brutal: "Brutal",
    otb: "Di luar kotak",
  })[level] || level;
}

render();
