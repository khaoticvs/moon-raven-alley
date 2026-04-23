/* =========================
   WHEEL OF THE YEAR COUNTDOWN
========================= */
(function () {

  const dateEl = document.getElementById("seasonDate");
  const countdownEl = document.getElementById("seasonCountdown");
  const nameInlineEl = document.getElementById("seasonNameInline");

  if (!dateEl || !countdownEl || !nameInlineEl) return;

  const HOLIDAYS = [
    { name: "Ostara",       at: new Date(2026, 2, 20, 0, 0, 0) },
    { name: "Beltane",      at: new Date(2026, 4,  1, 0, 0, 0) },
    { name: "Litha",        at: new Date(2026, 5, 21, 0, 0, 0) },
    { name: "Lughnasadh",   at: new Date(2026, 7,  1, 0, 0, 0) },
    { name: "Fall Equinox", at: new Date(2026, 8, 22, 0, 0, 0) },
    { name: "Samhain",      at: new Date(2026, 9, 31, 0, 0, 0) },
    { name: "Yule",         at: new Date(2026,11, 21, 0, 0, 0) },
    { name: "Imbolc",       at: new Date(2027, 1,  1, 0, 0, 0) },
  ].sort((a, b) => a.at - b.at);

  const SWITCH_DELAY_MS = 12 * 60 * 60 * 1000;

  let currentIdx = 0;
  let zeroStartedAt = null;

  function pad2(n) { return String(n).padStart(2, "0"); }

  function initIndex(now) {
    const i = HOLIDAYS.findIndex(h => h.at.getTime() > now.getTime());
    currentIdx = (i === -1) ? 0 : i;
  }

  function setDateText(d) {
    dateEl.textContent = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function update() {
    const now = new Date();

    if (zeroStartedAt === null) {
      initIndex(now);
      zeroStartedAt = now.getTime();
    }

    const holiday = HOLIDAYS[currentIdx];
    const timeLeft = holiday.at.getTime() - now.getTime();

    if (timeLeft <= 0) {
      countdownEl.textContent = "00:00:00:00";

      if (now.getTime() - zeroStartedAt > SWITCH_DELAY_MS) {
        currentIdx = (currentIdx + 1) % HOLIDAYS.length;
        zeroStartedAt = null;
        update();
        return;
      }
      return;
    }

    const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((timeLeft % (60 * 1000)) / 1000);

    countdownEl.textContent =
      `${pad2(days)}:${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;

    setDateText(holiday.at);
    nameInlineEl.textContent = holiday.name;
  }

  update();
  setInterval(update, 1000);

})();

/* ===== Open/Closed widget logic ===== */
(() => {
  const box = document.querySelector(".open-status");
  const dot = document.getElementById("openDot");
  const label = document.getElementById("openLabel");
  const sub = document.getElementById("openSub");
  if (!box || !dot || !label || !sub) return;

  // Store hours (America/New_York assumed because browser local time)
  // day: 0=Sun ... 6=Sat
  // null = closed all day
  const HOURS = {
    0: null, // Sun
    1: null, // Mon
    2: null, // Tue
    3: { open: "12:30", close: "18:00" }, // Wed
    4: { open: "12:30", close: "19:00" }, // Thu
    5: { open: "12:30", close: "19:00" }, // Fri
    6: { open: "11:00", close: "19:00" }, // Sat
  };

  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function parseHM(hm){
    const [h,m] = hm.split(":").map(Number);
    return { h, m };
  }

  function atTime(baseDate, hm){
    const { h, m } = parseHM(hm);
    const d = new Date(baseDate);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function fmtTime(dt){
    return dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function fmtDayTime(dt){
    const day = DAY_NAMES[dt.getDay()];
    return `${day} ${fmtTime(dt)}`;
  }

  function nextOpenFrom(now){
    // search next 8 days max
    for (let i=0; i<8; i++){
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const rule = HOURS[d.getDay()];
      if (!rule) continue;

      const openAt = atTime(d, rule.open);
      const closeAt = atTime(d, rule.close);

      // if today and already past close, keep searching
      if (i === 0 && now >= closeAt) continue;

      // if today and before open, return today's open
      if (i === 0 && now < openAt) return openAt;

      // if future day, return that day's open
      if (i > 0) return openAt;
    }
    return null;
  }

  function render(){
    const now = new Date();
    const rule = HOURS[now.getDay()];

    // closed all day
    if (!rule){
      box.dataset.state = "closed";
      label.textContent = "Closed";
      const next = nextOpenFrom(now);
      sub.textContent = next ? `Opens ${fmtDayTime(next)}` : "—";
      return;
    }

    const openAt = atTime(now, rule.open);
    const closeAt = atTime(now, rule.close);

    if (now >= openAt && now < closeAt){
      box.dataset.state = "open";
      label.textContent = "Open Now";
      sub.textContent = `Closes at ${fmtTime(closeAt)}`;
      return;
    }

    // before open or after close
    box.dataset.state = "closed";
    label.textContent = "Closed";
    const next = nextOpenFrom(now);
    sub.textContent = next ? `Opens ${fmtDayTime(next)}` : "—";
  }

  render();
  setInterval(render, 30 * 1000); // update every 30s
})();

/* =========================
   MOON PHASE WIDGET
========================= */
(function () {
  const icon = document.getElementById("moonIcon");
  const nameEl = document.getElementById("moonName");
  const dateEl = document.getElementById("moonDate");
  const illumEl = document.getElementById("moonIllum");
  const nextFullEl = document.getElementById("moonNextFull");

  if (!icon || !nameEl || !dateEl || !illumEl || !nextFullEl) return;

  function toJulian(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  const now = new Date();
  const jd = toJulian(now);

  const knownNewMoonJD = 2451550.1; // 2000-01-06 18:14 UTC approx
  const synodicMonth = 29.53058867;

  const daysSince = jd - knownNewMoonJD;
  const phaseDays = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const phaseFrac = phaseDays / synodicMonth; // 0..1

  // illumination percentage
  const illum = 0.5 * (1 - Math.cos(2 * Math.PI * phaseFrac));
  illumEl.textContent = Math.round(illum * 100);

  // next full moon
  const fullMoonAge = 14.765;
  let daysUntilFull = fullMoonAge - phaseDays;
  if (daysUntilFull < 0) daysUntilFull += synodicMonth;

  const nextFullDate = new Date(now.getTime() + daysUntilFull * 86400000);

  nextFullEl.textContent = nextFullDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // phase naming by moon age
 let phaseName = "";

if (phaseDays < 1 || phaseDays >= 28.5) phaseName = "New Moon";
else if (phaseDays < 7.4) phaseName = "Waxing Crescent";
else if (phaseDays < 8.9) phaseName = "First Quarter";
else if (phaseDays < 13.8) phaseName = "Waxing Gibbous";
else if (phaseDays < 15.8) phaseName = "Full Moon";
else if (phaseDays < 20.7) phaseName = "Waning Gibbous";
else if (phaseDays < 22.2) phaseName = "Last Quarter";
else phaseName = "Waning Crescent";
  // --- Clean SVG moon render ---
  const moonSize = 64;
  const r = moonSize / 2;
  const cx = r;
  const cy = r;

  // cosine-based terminator width
  const k = Math.cos(2 * Math.PI * phaseFrac);
  const rx = Math.abs(k) * (r - 1);

  let litSide;
  if (phaseFrac === 0 || phaseFrac === 1) litSide = "none";
  else if (phaseFrac < 0.5) litSide = "right";
  else litSide = "left";

  let svg = `
    <svg viewBox="0 0 ${moonSize} ${moonSize}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="lit" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.95)"/>
          <stop offset="55%" stop-color="rgba(215,215,215,0.98)"/>
          <stop offset="100%" stop-color="rgba(160,160,160,0.95)"/>
        </radialGradient>
        <clipPath id="moonClip">
          <circle cx="${cx}" cy="${cy}" r="${r - 1}" />
        </clipPath>
      </defs>

      <!-- dark base -->
      <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="rgba(10,12,16,1)"/>
  `;

  if (litSide === "right") {
    svg += `
      <g clip-path="url(#moonClip)">
        <rect x="${cx}" y="0" width="${r}" height="${moonSize}" fill="url(#lit)"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r - 1}" fill="url(#lit)"/>
      </g>
    `;
  } else if (litSide === "left") {
    svg += `
      <g clip-path="url(#moonClip)">
        <rect x="0" y="0" width="${r}" height="${moonSize}" fill="url(#lit)"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r - 1}" fill="url(#lit)"/>
      </g>
    `;
  }

  svg += `
      <circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
    </svg>
  `;

  icon.innerHTML = svg;

  nameEl.textContent = phaseName;
  dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
})();
/* =========================
   HOURS: open/closed message (DO NOT CHANGE TIMES)
========================= */
(() => {
  const el = document.getElementById("hoursMessageText");
  if (!el) return;

  // 0=Sun ... 6=Sat
  const SCHEDULE = {
    0: null, // Sun closed
    1: null, // Mon closed
    2: null, // Tue closed
    3: { open: [12, 30], close: [18, 0] }, // Wed 12:30 - 6:00
    4: { open: [12, 30], close: [19, 0] }, // Thu 12:30 - 7:00
    5: { open: [12, 30], close: [19, 0] }, // Fri 12:30 - 7:00
    6: { open: [11, 0],  close: [19, 0] }, // Sat 11:00 - 7:00
  };

  const fmtTime = (d) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const nextOccurrence = (from, dayIndex, hm) => {
    const d = new Date(from);
    const delta = (dayIndex - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + delta);
    d.setHours(hm[0], hm[1], 0, 0);
    return d;
  };

  function getStatus(now) {
    const today = SCHEDULE[now.getDay()];
    if (today) {
      const open = new Date(now); open.setHours(today.open[0], today.open[1], 0, 0);
      const close = new Date(now); close.setHours(today.close[0], today.close[1], 0, 0);
      if (now >= open && now < close) return { open: true, nextChange: close, nextLabel: "Closes" };
      if (now < open) return { open: false, nextChange: open, nextLabel: "Opens" };
    }

    // find next opening day/time
    for (let i = 1; i <= 7; i++) {
      const di = (now.getDay() + i) % 7;
      const sch = SCHEDULE[di];
      if (!sch) continue;
      const when = nextOccurrence(now, di, sch.open);
      if (when > now) return { open: false, nextChange: when, nextLabel: "Opens" };
    }

    return { open: false, nextChange: null, nextLabel: "" };
  }

  function render() {
    const now = new Date();
    const s = getStatus(now);

    if (s.open) {
      el.textContent = `COME JOIN UP TODAY — ${s.nextLabel} AT ${fmtTime(s.nextChange)}`;
    } else {
      el.textContent = s.nextChange
        ? `SEE YOU NEXT TIME — ${s.nextLabel} AT ${fmtTime(s.nextChange)}`
        : `SEE YOU NEXT TIME`;
    }
  }

  render();
  setInterval(render, 30_000);
})();
