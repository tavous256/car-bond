// Car Bond app. Data lives in Supabase: tables "cars" and "profiles", photo bucket "car-photos".
(function () {
  "use strict";

  // ---------- setup ----------
  const CFG = window.CAR_BOND_CONFIG || {};
  const sb = CFG.SUPABASE_URL && window.supabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
  const BUCKET = "car-photos";
  const SELECT = "*, profiles(name, verified, dealer_name)";
  const PAGE = 20;
  const MAX_PHOTOS = 10;

  const I = {
    car: '<svg viewBox="0 0 64 32" fill="currentColor" aria-hidden="true"><path d="M6 22v-5l6-8h28l10 8h6c2 0 3 1 3 3v2h-4a6 6 0 0 0-12 0H22a6 6 0 0 0-12 0z"/><circle cx="16" cy="24" r="4.5"/><circle cx="49" cy="24" r="4.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 14.6 4.3 18 4l.9 3.3L22 9l-1.4 3L22 15l-3.1 1.7L18 20l-3.4-.3L12 22l-2.6-2.3L6 20l-.9-3.3L2 15l1.4-3L2 9l3.1-1.7L6 4l3.4.3z"/><path d="m8 12 3 3 5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 4 6M21 9l-4 6"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
    photos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>',
  };

  const BODIES = ["SUV", "Saloon", "Hatchback", "Station wagon", "Pickup", "Van", "Bus"];
  const MAKES = {
    Toyota: ["Harrier", "Premio", "Allion", "Wish", "Noah", "Vitz", "Fielder", "Mark X", "RAV4", "Land Cruiser Prado", "Hilux", "Ipsum", "Probox", "Rush", "Corolla"],
    Subaru: ["Forester", "Impreza", "Legacy", "Outback", "XV"],
    Nissan: ["X-Trail", "Note", "Tiida", "Navara", "Murano", "Dualis"],
    Mitsubishi: ["Pajero", "Outlander", "RVR", "Canter"],
    Honda: ["Fit", "CR-V", "Stream", "Vezel"],
    Mazda: ["Demio", "Axela", "CX-5", "Atenza"],
    "Mercedes-Benz": ["C-Class", "E-Class", "ML", "GLE"],
    Isuzu: ["D-Max", "Elf", "Forward"],
    "Land Rover": ["Range Rover", "Discovery", "Defender"],
    Volkswagen: ["Golf", "Tiguan", "Touareg"],
  };
  const PLACES = ["Kampala", "Wakiso", "Entebbe", "Mukono", "Jinja", "Mbarara", "Gulu", "Masaka"];
  const PRICES = [["Under 20M", 0, 20e6], ["20M – 40M", 20e6, 40e6], ["40M – 70M", 40e6, 70e6], ["70M – 120M", 70e6, 120e6], ["Over 120M", 120e6, 0]];
  const YEARS = [2020, 2018, 2015, 2012, 2010, 2005];
  const NOW_YEAR = new Date().getFullYear();

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ugx = (n) => Number(n || 0).toLocaleString("en-UG");
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const photoUrl = (p) => `${CFG.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p.split("/").map(encodeURIComponent).join("/")}`;
  const initial = (n) => (String(n || "?").trim()[0] || "?").toUpperCase();
  function waNumber(p) { let d = digits(p); if (d.startsWith("0")) d = "256" + d.slice(1); else if (d.length === 9) d = "256" + d; return d; }
  const phoneEmail = (p) => `${waNumber(p)}@carbond.app`;
  function short(n) { n = Number(n || 0); if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${Math.round(n / 1e3)}K`; return String(n); }
  function inWords(n) {
    n = Number(n || 0); if (!n) return "";
    if (n >= 1e9) return `${+(n / 1e9).toFixed(2)} billion shillings`;
    if (n >= 1e6) return `${+(n / 1e6).toFixed(2)} million shillings`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(1)} thousand shillings`;
    return `${n} shillings`;
  }
  function store(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { return null; }
  }
  function toast(m) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = document.createElement("div"); t.className = "toast"; t.textContent = m;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
  }
  const sellerName = (c) => (c.profiles && c.profiles.dealer_name) || (c.profiles && c.profiles.name) || c.seller_name || "Private seller";
  const isVerified = (c) => !!(c.profiles && c.profiles.verified);

  // ---------- state ----------
  let me = null, profile = null;
  const saved = new Set(store("cb-saved") || []);
  const cache = new Map();
  const F0 = () => ({ q: "", make: "", priceMin: 0, priceMax: 0, yearMin: 0, body: "", trans: "", fuel: "", location: "", sort: "new" });
  let F = F0();
  let tab = "home";
  let renderId = 0;
  let wiz = null;
  let authMode = "in";
  const remember = (list) => (list || []).forEach((c) => cache.set(c.id, c));

  // ---------- data ----------
  async function q(fn) {
    if (!sb) throw new Error("not configured");
    const { data, error } = await fn(sb);
    if (error) throw error;
    return data;
  }
  function applyFilters(qb) {
    const s = F.q.replace(/[,()%*\\]/g, " ").trim();
    if (s) qb = qb.or(`make.ilike.%${s}%,model.ilike.%${s}%,location.ilike.%${s}%`);
    if (F.make) qb = qb.eq("make", F.make);
    if (F.priceMin) qb = qb.gte("price", F.priceMin);
    if (F.priceMax) qb = qb.lte("price", F.priceMax);
    if (F.yearMin) qb = qb.gte("year", F.yearMin);
    if (F.body) qb = qb.eq("body", F.body);
    if (F.trans) qb = qb.eq("trans", F.trans);
    if (F.fuel) qb = qb.eq("fuel", F.fuel);
    if (F.location) qb = qb.ilike("location", `%${F.location.replace(/[,()%*\\]/g, " ").trim()}%`);
    qb = qb.order("status", { ascending: true });
    if (F.sort === "low") qb = qb.order("price", { ascending: true });
    else if (F.sort === "high") qb = qb.order("price", { ascending: false });
    else if (F.sort === "year") qb = qb.order("year", { ascending: false });
    return qb.order("created_at", { ascending: false });
  }
  const filterCount = () => ["make", "priceMin", "priceMax", "yearMin", "body", "trans", "fuel", "location"].filter((k) => F[k]).length - (F.priceMin && F.priceMax ? 1 : 0);

  async function loadProfile() {
    profile = null;
    if (!me) return;
    try { profile = await q((s) => s.from("profiles").select("*").eq("id", me.id).maybeSingle()); } catch (e) { profile = null; }
  }

  // ---------- pieces ----------
  function tags(c) {
    const t = [];
    if (c.status === "sold") t.push('<span class="tag sold">Sold</span>');
    if (c.featured) t.push(`<span class="tag red">${I.star}Featured</span>`);
    if (isVerified(c)) t.push(`<span class="tag">${I.check}Verified</span>`);
    return t.length ? `<div class="tags">${t.join("")}</div>` : "";
  }
  function carCard(c) {
    const p = (c.photos || [])[0];
    return `<article class="car ${c.status === "sold" ? "sold" : ""}" data-open="${esc(c.id)}" tabindex="0" role="button" aria-label="${esc(c.year + " " + c.make + " " + c.model)}">
      <div class="ph">${p ? `<img src="${esc(photoUrl(p))}" alt="" loading="lazy">` : I.car}
        ${(c.photos || []).length > 1 ? `<span class="pcount">${I.photos}${c.photos.length}</span>` : ""}</div>
      ${tags(c)}
      <button class="fav" data-fav="${esc(c.id)}" aria-pressed="${saved.has(c.id)}" aria-label="Save">${I.heart}</button>
      <div class="cb">
        <div class="price num"><small>UGX</small>${ugx(c.price)}</div>
        <div class="nm">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</div>
        <div class="mt num"><span>${short(c.mileage)} km</span><span>${esc(c.trans)}</span><span>${esc(c.location)}</span></div>
      </div></article>`;
  }
  const skeletons = (n) => Array.from({ length: n }, () => '<div class="skel"><i class="img"></i><i style="width:45%"></i><i style="width:70%"></i></div>').join("");
  const emptyBox = (title, text, btn) => `<div class="empty">${I.car}<h3>${title}</h3>${text ? `<p>${text}</p>` : ""}${btn || ""}</div>`;
  const offline = (retry) => emptyBox("Can’t connect", "Check your internet, then try again.", `<button class="btn black" data-retry="${retry}">Try again</button>`);

  // ---------- screens ----------
  // Home banner video (hero.mp4). Falls back to the logo picture if the video is missing or can't play.
  function playHero() {
    const v = $("#heroVid"); if (!v) return;
    v.addEventListener("error", () => v.closest(".herovid").classList.add("novid"), { once: true });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  }
  // Redraw Home but keep the same video element, so it doesn't restart when the cars finish loading.
  function redrawHome(html) {
    const keep = $("#main .herovid");
    $("#main").innerHTML = html;
    const fresh = $("#main .herovid");
    if (keep && fresh) fresh.replaceWith(keep);
    playHero();
  }
  async function homeScreen(id) {
    const firstTime = !store("cb-welcomed");
    const shell = (featured, latest) => `<div class="screen">
      <div class="herovid"><video id="heroVid" src="hero.mp4" poster="hero-poster.jpg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>
        <button class="snd" data-sound aria-label="Turn sound on">${I.mute}</button>
        <div class="hv-txt"><span>Car <b>Bond</b></span><small>Buy and sell cars in Uganda</small></div></div>
      <div class="hero"><h1>Find your next car</h1>
        <button class="searchbox" data-go="#search">${I.search}<span>Search Harrier, Premio, Ntinda…</span></button></div>
      <div class="hscroll" style="margin-top:.8rem">${Object.keys(MAKES).map((m) => `<button class="make" data-make-go="${esc(m)}">${esc(m)}</button>`).join("")}</div>
      ${firstTime ? `<section class="welcome">
        <div class="wb"><p>Buy or sell a car directly with the owner. No brokers, no fees.</p>
        <div class="row"><button class="btn white" data-go="#search">Find a car</button><button class="btn red" data-go="#sell">Sell my car</button></div>
        <button class="link" data-dismiss style="color:#fff;justify-self:center">Got it, hide this</button></div></section>` : ""}
      ${featured}
      <div class="sec"><h2>Browse by type</h2></div>
      <div class="types">${["SUV", "Saloon", "Hatchback", "Pickup", "Van", "Station wagon"].map((b) => `<button class="type" data-body-go="${b}">${I.car}${b === "Station wagon" ? "Wagon" : b}</button>`).join("")}</div>
      <div class="sec"><h2>Latest cars</h2><button class="link" data-go="#search">See all</button></div>
      ${latest}
      <div class="sellcta"><h3>Selling a car?</h3><p>Post it free in 2 minutes. Buyers call you directly.</p><button class="btn red" data-go="#sell">Sell my car</button></div>
    </div>`;
    $("#main").innerHTML = shell("", `<div class="list">${skeletons(2)}</div>`); playHero();
    try {
      const [feat, latest] = await Promise.all([
        q((s) => s.from("cars").select(SELECT).eq("featured", true).eq("status", "available").order("created_at", { ascending: false }).limit(10)),
        q((s) => s.from("cars").select(SELECT).order("status").order("created_at", { ascending: false }).limit(8)),
      ]);
      if (id !== renderId) return;
      remember(feat); remember(latest);
      const fs = feat.length ? `<div class="sec"><h2>Featured</h2><span class="verified">${I.check}Verified dealers</span></div><div class="feat">${feat.map(carCard).join("")}</div>` : "";
      const ls = latest.length ? `<div class="list">${latest.map(carCard).join("")}</div><button class="btn ghost wide" data-go="#search" style="margin-top:1rem">See all cars</button>`
        : emptyBox("No cars yet", "Be the first to post a car on Car Bond.", '<button class="btn red" data-go="#sell">Sell my car</button>');
      redrawHome(shell(fs, ls));
    } catch (e) {
      if (id !== renderId) return;
      redrawHome(shell("", offline("home")));
    }
  }

  let results = [], more = false, searching = false;
  function activeChips() {
    const c = [];
    if (F.make) c.push(["make", F.make]);
    if (F.priceMin || F.priceMax) c.push(["price", !F.priceMin ? `Under ${short(F.priceMax)}` : F.priceMax ? `${short(F.priceMin)} – ${short(F.priceMax)}` : `Over ${short(F.priceMin)}`]);
    if (F.yearMin) c.push(["yearMin", `${F.yearMin} or newer`]);
    ["body", "trans", "fuel", "location"].forEach((k) => F[k] && c.push([k, F[k]]));
    return c.map(([k, l]) => `<button class="achip" data-unf="${k}">${esc(l)} ✕</button>`).join("");
  }
  function searchShell() {
    const n = filterCount();
    return `<div class="screen"><div class="sbar">
        <label class="sfield">${I.search}<input id="sq" type="search" enterkeyhint="search" placeholder="Make, model or area" value="${esc(F.q)}" autocomplete="off"></label>
        <div class="srow"><button class="filterbtn" data-go="#filters">${I.filter}Filters${n ? `<b>${n}</b>` : ""}</button>
          <select class="sortsel" id="sort" aria-label="Sort"><option value="new">Newest</option><option value="low">Cheapest</option><option value="high">Most expensive</option><option value="year">Newest model</option></select></div>
        ${n ? `<div class="hscroll">${activeChips()}</div>` : ""}
      </div><div id="res"></div></div>`;
  }
  function drawResults() {
    const r = $("#res"); if (!r) return;
    if (searching && !results.length) { r.innerHTML = `<div class="list">${skeletons(3)}</div>`; return; }
    if (!results.length) { r.innerHTML = emptyBox("No cars found", "Try fewer filters or another word.", filterCount() || F.q ? '<button class="btn black" data-clearall>Clear search</button>' : ""); return; }
    r.innerHTML = `<p class="resn num">${results.length}${more ? "+" : ""} car${results.length === 1 ? "" : "s"}</p><div class="list">${results.map(carCard).join("")}</div>
      ${more ? `<button class="btn ghost wide" data-more style="margin-top:1rem" ${searching ? "disabled" : ""}>${searching ? "Loading…" : "Show more cars"}</button>` : ""}`;
  }
  async function runSearch(reset) {
    const id = ++searchSeq;
    if (reset) { results = []; more = false; }
    searching = true; drawResults();
    try {
      const from = results.length;
      const data = await q((s) => applyFilters(s.from("cars").select(SELECT)).range(from, from + PAGE - 1));
      if (id !== searchSeq) return;
      remember(data); results = results.concat(data); more = data.length === PAGE;
      searching = false; drawResults();
    } catch (e) {
      if (id !== searchSeq) return;
      searching = false; const r = $("#res"); if (r) r.innerHTML = offline("search");
    }
  }
  let searchSeq = 0, qTimer = null;
  function searchScreen() {
    $("#main").innerHTML = searchShell();
    $("#sort").value = F.sort;
    runSearch(true);
  }

  async function savedScreen(id) {
    $("#main").innerHTML = `<div class="screen"><div class="sec"><h2>Saved cars</h2></div><div id="sv" class="list">${saved.size ? skeletons(2) : ""}</div></div>`;
    if (!saved.size) { $("#sv").outerHTML = emptyBox("No saved cars", "Tap the heart on any car to keep it here.", '<button class="btn black" data-go="#search">Find a car</button>'); return; }
    try {
      const data = await q((s) => s.from("cars").select(SELECT).in("id", [...saved]));
      if (id !== renderId) return;
      remember(data);
      const found = new Set(data.map((c) => c.id));
      [...saved].forEach((k) => { if (!found.has(k)) saved.delete(k); });
      store("cb-saved", [...saved]);
      $("#sv").innerHTML = data.length ? data.map(carCard).join("") : emptyBox("No saved cars", "Cars you saved were removed by their sellers.", "");
    } catch (e) { if (id === renderId) $("#sv").innerHTML = offline("saved"); }
  }

  // ---------- account ----------
  function authForm(context) {
    const up = authMode === "up";
    return `<div class="card">
      <div class="seg"><button data-auth="in" aria-pressed="${!up}">Sign in</button><button data-auth="up" aria-pressed="${up}">Create account</button></div>
      ${context ? `<p style="margin:0;color:var(--muted)">${context}</p>` : ""}
      <form id="authForm" class="fsec" novalidate>
        ${up ? '<label class="fl" for="a-name">Your name or business name<input class="inp" id="a-name" autocomplete="name" placeholder="e.g. Peter"></label>' : ""}
        <label class="fl" for="a-phone">Phone number<input class="inp num" id="a-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0772 123 456"></label>
        <label class="fl" for="a-pin">${up ? "Create a PIN <small>at least 6 numbers, remember it</small>" : "Your PIN"}<input class="inp num" id="a-pin" type="password" inputmode="numeric" autocomplete="${up ? "new-password" : "current-password"}" placeholder="••••••"></label>
        <p class="err" id="aerr" role="alert"></p>
        <button class="btn red wide" type="submit" id="authBtn">${up ? "Create my account" : "Sign in"}</button>
      </form></div>`;
  }
  async function doAuth(e) {
    e.preventDefault();
    const up = authMode === "up";
    const name = up ? $("#a-name").value.trim() : "";
    const phone = $("#a-phone").value.trim(), pin = $("#a-pin").value;
    const err = $("#aerr"), btn = $("#authBtn");
    if (up && !name) { err.textContent = "Enter your name."; return; }
    if (waNumber(phone).length < 12) { err.textContent = "Enter a full phone number, like 0772 123 456."; return; }
    if (pin.length < 6) { err.textContent = "Your PIN must be at least 6 numbers."; return; }
    btn.disabled = true; btn.textContent = up ? "Creating account…" : "Signing in…"; err.textContent = "";
    try {
      if (up) {
        const { data, error } = await sb.auth.signUp({ email: phoneEmail(phone), password: pin, options: { data: { name, phone } } });
        if (error) throw error;
        if (!data.session) throw new Error("confirm");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: phoneEmail(phone), password: pin });
        if (error) throw error;
      }
      toast(up ? "Welcome to Car Bond!" : "Signed in");
    } catch (x) {
      const m = String((x && x.message) || "");
      err.textContent = m === "confirm" ? "Account created, but sign-in is waiting for setup. Ask the Car Bond owner to turn off “Confirm email” in Supabase."
        : /already registered|already exists/i.test(m) ? "This number already has an account. Tap Sign in instead."
        : /invalid login|invalid credentials/i.test(m) ? "Wrong phone number or PIN. Try again."
        : /network|fetch/i.test(m) ? "No internet connection. Try again."
        : "Something went wrong. Try again.";
      btn.disabled = false; btn.textContent = up ? "Create my account" : "Sign in";
    }
  }

  async function accountScreen(id) {
    if (!me) {
      $("#main").innerHTML = `<div class="screen"><div class="sec"><h2>Your account</h2></div>
        ${authForm("Sign in to sell cars and manage them from any phone. Buyers don’t need an account.")}</div>`;
      return;
    }
    const p = profile || {};
    $("#main").innerHTML = `<div class="screen">
      <div class="card" style="margin-top:1rem"><div class="prof"><div class="avatar big">${esc(initial(p.dealer_name || p.name))}</div>
        <div><h2>${esc(p.dealer_name || p.name || "Your account")}</h2>
        <p class="num">${esc(p.phone || "")}${p.location ? " · " + esc(p.location) : ""}</p>
        ${p.verified ? `<span class="verified">${I.check}Verified dealer</span>` : ""}</div></div>
        <div class="pair"><button class="btn ghost sm" data-editprof>Edit profile</button><button class="btn ghost sm" data-go="#seller-${esc(me.id)}">My public page</button></div>
      </div>
      <div class="sec"><h2>My cars</h2><button class="link" data-go="#sell">+ Sell a car</button></div>
      <div id="mine" class="list">${skeletons(1)}</div>
      <button class="btn ghost wide" data-signout style="margin-top:1.6rem">Sign out</button>
    </div>`;
    try {
      const data = await q((s) => s.from("cars").select(SELECT).eq("owner", me.id).order("created_at", { ascending: false }));
      if (id !== renderId) return;
      remember(data);
      $("#mine").innerHTML = data.length ? data.map((c) => `<div class="mrow">
          <div class="ph">${(c.photos || [])[0] ? `<img src="${esc(photoUrl(c.photos[0]))}" alt="" loading="lazy">` : I.car}</div>
          <div><div class="nm">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</div><div class="num" style="font-weight:800">UGX ${ugx(c.price)}</div>
            <span class="pill ${c.status === "sold" ? "sold" : ""}">${c.status === "sold" ? "Sold" : "For sale"}</span>${c.featured ? ' <span class="pill feat">Featured</span>' : ""}</div>
          <div class="acts"><button class="btn ghost sm" data-edit="${esc(c.id)}">Edit</button>
            <button class="btn ghost sm" data-sold="${esc(c.id)}">${c.status === "sold" ? "Sell again" : "Sold"}</button>
            <button class="btn soft sm" data-del="${esc(c.id)}">Remove</button></div></div>`).join("")
        : emptyBox("No cars yet", "Cars you post will show here.", '<button class="btn red" data-go="#sell">Sell my car</button>');
    } catch (e) { if (id === renderId) $("#mine").innerHTML = offline("account"); }
  }

  function editProfile() {
    const p = profile || {};
    openOverlay(`<div class="phead"><div class="in"><button class="iconbtn" data-close aria-label="Back">${I.back}</button><h2>Edit profile</h2></div></div>
      <form class="pbody" id="profForm" novalidate>
        <label class="fl" for="p-name">Name<input class="inp" id="p-name" value="${esc(p.name)}" autocomplete="name"></label>
        <label class="fl" for="p-phone">Phone or WhatsApp number <small>buyers see this</small><input class="inp num" id="p-phone" type="tel" inputmode="tel" value="${esc(p.phone)}"></label>
        <label class="fl" for="p-loc">Area <small>optional</small><input class="inp" id="p-loc" value="${esc(p.location)}" placeholder="e.g. Ntinda, Kampala"></label>
        ${p.dealer_name ? `<p class="note">Your dealer name “${esc(p.dealer_name)}” is set by Car Bond.</p>` : ""}
        <p class="err" id="perr"></p>
        <button class="btn red wide" type="submit">Save</button>
      </form>`, false);
  }
  async function saveProfile(e) {
    e.preventDefault();
    const name = $("#p-name").value.trim(), phone = $("#p-phone").value.trim(), location = $("#p-loc").value.trim();
    if (!name) { $("#perr").textContent = "Enter your name."; return; }
    if (waNumber(phone).length < 12) { $("#perr").textContent = "Enter a full phone number."; return; }
    try {
      await q((s) => s.from("profiles").update({ name, phone, location }).eq("id", me.id));
      await q((s) => s.from("cars").update({ seller_name: name, seller_phone: phone }).eq("owner", me.id));
      await loadProfile(); toast("Profile saved"); closeOverlay();
    } catch (x) { $("#perr").textContent = "Couldn’t save. Check your internet and try again."; }
  }

  // ---------- sell wizard ----------
  const STEPS = [
    { key: "photos", title: "Add photos", sub: "Cars with clear photos sell faster." },
    { key: "car", title: "Which car is it?", sub: "Tap the make, then the model." },
    { key: "price", title: "Your price", sub: "How much do you want for it?" },
    { key: "details", title: "A few details", sub: "Tap what fits your car." },
    { key: "review", title: "Check and publish", sub: "This is how buyers will see it." },
  ];
  function newWiz(c) {
    const d = c ? { make: c.make, model: c.model, year: String(c.year), price: String(c.price), mileage: c.mileage ? String(c.mileage) : "", body: c.body || "SUV", trans: c.trans || "Automatic", fuel: c.fuel || "Petrol", location: c.location || "", description: c.description || "" }
      : { make: "", model: "", year: "", price: "", mileage: "", body: "SUV", trans: "Automatic", fuel: "Petrol", location: (profile && profile.location) || "", description: "" };
    return { step: c ? 4 : 0, editId: c ? c.id : null, d, other: !!(d.make && !MAKES[d.make]), photos: c ? (c.photos || []).map((path) => ({ path })) : [], err: "", busy: "" };
  }
  const pick = (f, v, l) => `<button type="button" class="pick" data-pick="${f}" data-val="${esc(v)}" aria-pressed="${wiz.d[f] === v}">${esc(l || v)}</button>`;
  function stepBody() {
    const d = wiz.d;
    switch (STEPS[wiz.step].key) {
      case "photos":
        return `<label class="photo-add" for="photos">${I.camera}<strong>${wiz.photos.length ? "Add more photos" : "Tap to add photos"}</strong><span>Up to ${MAX_PHOTOS}. Front, back, inside and dashboard.</span></label>
          <input id="photos" type="file" accept="image/*" multiple hidden>
          ${wiz.photos.length ? `<div class="thumbs">${wiz.photos.map((p, i) => `<div class="thumb"><img src="${esc(p.path ? photoUrl(p.path) : p.preview)}" alt="">${i === 0 ? '<span class="cover">Main</span>' : ""}<button type="button" data-unphoto="${i}" aria-label="Remove photo">×</button></div>`).join("")}</div>` : ""}`;
      case "car": {
        const models = MAKES[d.make] || [];
        const years = []; for (let y = NOW_YEAR + 1; y >= 1985; y--) years.push(y);
        return `<div class="q"><div class="ql">Make</div><div class="picks">${Object.keys(MAKES).map((m) => `<button type="button" class="pick" data-wmake="${esc(m)}" aria-pressed="${!wiz.other && d.make === m}">${esc(m)}</button>`).join("")}<button type="button" class="pick" data-wmake="__other" aria-pressed="${wiz.other}">Other</button></div>
            ${wiz.other ? `<input class="inp" id="w-make" data-f="make" value="${esc(d.make)}" placeholder="Type the make" autocomplete="off">` : ""}</div>
          <div class="q"><label class="ql" for="w-model">Model</label><input class="inp" id="w-model" data-f="model" value="${esc(d.model)}" placeholder="${models[0] ? "e.g. " + esc(models[0]) : "Type the model"}" autocomplete="off">
            ${models.length ? `<div class="picks">${models.slice(0, 9).map((m) => `<button type="button" class="pick" data-wmodel="${esc(m)}" aria-pressed="${d.model === m}">${esc(m)}</button>`).join("")}</div>` : ""}</div>
          <div class="q"><label class="ql" for="w-year">Year made</label><select class="inp" id="w-year"><option value="">Choose the year</option>${years.map((y) => `<option ${String(y) === d.year ? "selected" : ""}>${y}</option>`).join("")}</select></div>`;
      }
      case "price":
        return `<div class="q"><label class="ql" for="w-price">Price in Uganda shillings</label>
            <input class="inp big-money num" id="w-price" data-f="price" inputmode="numeric" value="${d.price ? ugx(d.price) : ""}" placeholder="42,000,000" autocomplete="off">
            <div class="say" id="say">${esc(inWords(d.price))}</div></div>
          <div class="q"><label class="ql" for="w-mileage">Mileage <small>optional</small></label>
            <input class="inp num" id="w-mileage" data-f="mileage" inputmode="numeric" value="${d.mileage ? ugx(d.mileage) : ""}" placeholder="Kilometres, e.g. 96,000" autocomplete="off"></div>`;
      case "details":
        return `<div class="q"><div class="ql">Type</div><div class="picks">${BODIES.map((b) => pick("body", b)).join("")}</div></div>
          <div class="q"><div class="ql">Gearbox</div><div class="picks">${pick("trans", "Automatic")}${pick("trans", "Manual")}</div></div>
          <div class="q"><div class="ql">Fuel</div><div class="picks">${["Petrol", "Diesel", "Hybrid", "Electric"].map((f) => pick("fuel", f)).join("")}</div></div>
          <div class="q"><label class="ql" for="w-location">Where is the car?</label><input class="inp" id="w-location" data-f="location" value="${esc(d.location)}" placeholder="e.g. Ntinda, Kampala" autocomplete="off">
            <div class="picks">${PLACES.map((p) => `<button type="button" class="pick" data-wplace="${p}" aria-pressed="${d.location === p}">${p}</button>`).join("")}</div></div>
          <div class="q"><label class="ql" for="w-desc">Anything else? <small>optional</small></label><textarea class="inp" id="w-desc" data-f="description" maxlength="1200" placeholder="e.g. Clean interior, new tyres, recently serviced">${esc(d.description)}</textarea></div>`;
      case "review": {
        const f = wiz.photos[0];
        const pv = { id: "preview", make: d.make, model: d.model, year: d.year, price: Number(d.price), mileage: Number(d.mileage || 0), trans: d.trans, location: d.location, photos: [], status: "available" };
        const row = (l, v, s) => `<div class="rv"><div><dt>${l}</dt><dd>${v}</dd></div><button type="button" class="link" data-goto="${s}">Change</button></div>`;
        return `<div class="car" style="cursor:default"><div class="ph">${f ? `<img src="${esc(f.path ? photoUrl(f.path) : f.preview)}" alt="">` : I.car}</div>
            <div class="cb"><div class="price num"><small>UGX</small>${ugx(pv.price)}</div><div class="nm">${esc(d.year)} ${esc(d.make)} ${esc(d.model)}</div>
            <div class="mt num"><span>${short(pv.mileage)} km</span><span>${esc(d.trans)}</span><span>${esc(d.location)}</span></div></div></div>
          <dl class="review">
            ${row("Photos", wiz.photos.length ? `${wiz.photos.length} photo${wiz.photos.length === 1 ? "" : "s"}` : "No photos", 0)}
            ${row("Car", `${esc(d.year)} ${esc(d.make)} ${esc(d.model)}`, 1)}
            ${row("Price", "UGX " + ugx(d.price), 2)}
            ${row("Details", `${esc(d.body)} · ${esc(d.trans)} · ${esc(d.fuel)} · ${esc(d.location)}`, 3)}
            <div class="rv"><div><dt>Buyers contact</dt><dd>${esc((profile && profile.name) || "")} · ${esc((profile && profile.phone) || "")}</dd></div><button type="button" class="link" data-editprof>Change</button></div>
          </dl>`;
      }
    }
    return "";
  }
  function sellScreen() {
    if (!me) {
      $("#main").innerHTML = `<div class="screen"><div class="sec"><h2>Sell your car</h2></div>${authForm("Create a free account first. It takes 30 seconds, then you can post your car.")}</div>`;
      return;
    }
    if (!wiz) wiz = newWiz(null);
    const st = STEPS[wiz.step], last = wiz.step === STEPS.length - 1;
    const label = wiz.busy || (last ? (wiz.editId ? "Save changes" : "Publish my car") : st.key === "photos" && !wiz.photos.length ? "Skip for now" : "Next");
    $("#main").innerHTML = `<form class="wiz screen" id="wiz" novalidate>
      <div class="prog"><div class="lbl"><span>Step ${wiz.step + 1} of ${STEPS.length}</span><span>${wiz.editId ? "Editing" : "Sell your car"}</span></div><div class="bar"><i style="width:${((wiz.step + 1) / STEPS.length) * 100}%"></i></div></div>
      <h2>${st.title}</h2><p class="sub">${st.sub}</p>
      ${stepBody()}
      <p class="err" id="werr" role="alert">${esc(wiz.err)}</p>
      <div class="navrow ${wiz.step ? "" : "one"}">${wiz.step ? '<button type="button" class="btn ghost" data-wback>Back</button>' : ""}<button type="submit" class="btn red" ${wiz.busy ? "disabled" : ""}>${esc(label)}</button></div>
      ${wiz.editId ? '<button type="button" class="btn ghost wide" data-wcancel>Cancel editing</button>' : ""}
    </form>`;
    window.scrollTo(0, 0);
  }
  function checkStep() {
    const d = wiz.d;
    switch (STEPS[wiz.step].key) {
      case "car": return !d.make.trim() ? "Tap the make of your car." : !d.model.trim() ? "Type or tap the model." : !d.year ? "Choose the year it was made." : "";
      case "price": return !Number(d.price) ? "Enter your price, for example 42,000,000." : Number(d.price) < 100000 ? "That price looks too low. Enter the full amount." : "";
      case "details": return d.location.trim() ? "" : "Say where the car is, or tap an area.";
      case "review": return !(profile && profile.name && waNumber(profile.phone).length >= 12) ? "Add your name and phone number first. Tap Change next to Buyers contact." : "";
    }
    return "";
  }
  // Turn any phone photo into a JPEG the browser can show. Some phones save HEIC photos that Chrome can't open.
  async function toJpeg(file) {
    const draw = (src, w, h) => {
      const k = Math.min(1, 1600 / Math.max(w, h));
      const cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
      return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("bad"))), "image/jpeg", 0.82));
    };
    try { const bmp = await createImageBitmap(file); const b = await draw(bmp, bmp.width, bmp.height); bmp.close && bmp.close(); return b; }
    catch (e) {
      return new Promise((res, rej) => {
        const img = new Image(), u = URL.createObjectURL(file);
        img.onload = () => { draw(img, img.naturalWidth, img.naturalHeight).then(res, rej); URL.revokeObjectURL(u); };
        img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("bad")); };
        img.src = u;
      });
    }
  }
  async function addPhotos(files) {
    const room = MAX_PHOTOS - wiz.photos.length;
    if (!files.length) return;
    wiz.busy = "Preparing photos…"; sellScreen();
    let bad = 0;
    for (const f of files.slice(0, room)) {
      try { const blob = await toJpeg(f); wiz.photos.push({ blob, preview: URL.createObjectURL(blob) }); }
      catch (e) { bad++; }
    }
    wiz.busy = "";
    wiz.err = bad ? `${bad} photo${bad === 1 ? "" : "s"} couldn’t be opened. Your phone may save photos as HEIC: in Camera settings choose JPG, or take a screenshot of the photo and add that.` : "";
    sellScreen();
    if (files.length > room) toast(`You can add up to ${MAX_PHOTOS} photos`);
  }

  async function publish() {
    const d = wiz.d;
    const busy = (t) => { wiz.busy = t; sellScreen(); };
    try {
      const paths = [];
      for (let i = 0; i < wiz.photos.length; i++) {
        const p = wiz.photos[i];
        if (p.path) { paths.push(p.path); continue; }
        busy(`Uploading photo ${i + 1} of ${wiz.photos.length}…`);
        const path = `${me.id}/${Date.now().toString(36)}-${i}.jpg`;
        const { error } = await sb.storage.from(BUCKET).upload(path, p.blob, { contentType: "image/jpeg" });
        if (error) throw new Error("A photo didn’t upload. Check your internet and try again.");
        p.path = path; paths.push(path);
      }
      busy("Publishing…");
      const row = { make: d.make.trim(), model: d.model.trim(), year: Number(d.year), price: Number(d.price), mileage: Number(d.mileage || 0), body: d.body, trans: d.trans, fuel: d.fuel,
        location: d.location.trim(), description: d.description.trim(), photos: paths, seller_name: profile.name, seller_phone: profile.phone };
      const edit = wiz.editId;
      const { error } = edit ? await sb.from("cars").update(row).eq("id", edit) : await sb.from("cars").insert(row);
      if (error) throw new Error("Your car didn’t save. Check your internet and try again.");
      wiz = null;
      toast(edit ? "Changes saved" : "Your car is live!");
      nav("#account");
    } catch (x) { wiz.busy = ""; wiz.err = x.message || "Something went wrong. Try again."; sellScreen(); }
  }

  // ---------- overlays: car page, seller page, filters ----------
  let overlayDepth = 0;
  function openOverlay(html, actionbar) {
    const o = $("#overlay");
    o.innerHTML = `<div class="overlay"><div class="wrap">${html}</div>${actionbar ? `<div class="actionbar">${actionbar}</div>` : ""}</div>`;
    document.body.style.overflow = "hidden";
    o.querySelector(".overlay").scrollTop = 0;
  }
  let pushed = 0;
  const isOverlayHash = (h) => /^#(car-|seller-|filters$)/.test(h);
  function closeOverlay() {
    if (isOverlayHash(location.hash)) {
      if (pushed > 0) { pushed--; history.back(); } else location.replace("#" + tab);
      return;
    }
    hideOverlay();
  }
  function hideOverlay() { $("#overlay").innerHTML = ""; document.body.style.overflow = ""; }

  async function carPage(id) {
    let c = cache.get(id);
    const head = (title) => `<div class="phead"><div class="in"><button class="iconbtn" data-close aria-label="Back">${I.back}</button><h2>${title}</h2><button class="iconbtn" data-share="${esc(id)}" aria-label="Share">${I.share}</button></div></div>`;
    if (!c) {
      openOverlay(head("Loading…") + `<div class="pbody">${skeletons(1)}</div>`);
      try { c = await q((s) => s.from("cars").select(SELECT).eq("id", id).maybeSingle()); } catch (e) { c = undefined; }
      if (!/^#car-/.test(location.hash)) return;
      if (!c) { openOverlay(head("Car not found") + `<div class="pbody">${c === null ? emptyBox("This car is no longer listed", "The seller may have removed it.", '<button class="btn black" data-go="#search">Find other cars</button>') : offline("car")}</div>`); return; }
      cache.set(c.id, c);
    }
    const pics = (c.photos || []).length ? c.photos.map((p) => `<div><img src="${esc(photoUrl(p))}" alt=""></div>`).join("") : `<div>${I.car}</div>`;
    const num = waNumber(c.seller_phone);
    const mine = me && c.owner === me.id;
    const msg = encodeURIComponent(`Hello ${sellerName(c)}, I saw your ${c.year} ${c.make} ${c.model} (UGX ${ugx(c.price)}) on Car Bond. Is it still available?`);
    const bar = mine ? `<div class="in"><button class="btn ghost" data-edit="${esc(c.id)}">Edit</button><button class="btn black" data-sold="${esc(c.id)}">${c.status === "sold" ? "Sell again" : "Mark as sold"}</button></div>`
      : c.status === "sold" ? `<div class="in one"><button class="btn ghost" data-go="#search">This car is sold. Find others</button></div>`
      : `<div class="in"><a class="btn wa" href="https://wa.me/${num}?text=${msg}" target="_blank" rel="noopener">${I.wa}WhatsApp</a><a class="btn red" href="tel:+${num}">${I.phone}Call</a></div>`;
    openOverlay(`${head(esc(c.make + " " + c.model))}
      <div class="gal"><div class="track" id="track">${pics}</div>${(c.photos || []).length > 1 ? `<span class="ctr" id="ctr">1 / ${c.photos.length}</span>` : ""}</div>
      <div class="pbody">
        <div class="dtitle">
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">${c.status === "sold" ? '<span class="pill sold">Sold</span>' : ""}${c.featured ? '<span class="pill feat">Featured</span>' : ""}</div>
          <h1>${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</h1>
          <div class="price num"><small>UGX</small>${ugx(c.price)}</div>
          <div class="mt num"><span>${ugx(c.mileage)} km</span><span>${esc(c.location)}</span></div>
        </div>
        <div class="seller"><div class="avatar">${esc(initial(sellerName(c)))}</div>
          <div><div class="sn">${esc(sellerName(c))}</div><div class="sd">${isVerified(c) ? `<span class="verified">${I.check}Verified dealer</span>` : "Private seller"}</div></div>
          <button class="btn ghost sm" data-go="#seller-${esc(c.owner)}">See all cars from this seller</button></div>
        <div class="phoneline"><code>${esc(c.seller_phone)}</code><button class="btn ghost sm" data-copy="${esc(c.seller_phone)}">Copy</button></div>
        <dl class="specs">
          <div><dt>Year</dt><dd class="num">${esc(c.year)}</dd></div><div><dt>Mileage</dt><dd class="num">${ugx(c.mileage)} km</dd></div>
          <div><dt>Type</dt><dd>${esc(c.body)}</dd></div><div><dt>Gearbox</dt><dd>${esc(c.trans)}</dd></div>
          <div><dt>Fuel</dt><dd>${esc(c.fuel)}</dd></div><div><dt>Location</dt><dd>${esc(c.location)}</dd></div></dl>
        ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ""}
        <p class="note">Stay safe: meet in a public place, check the logbook, and never pay before seeing the car.</p>
      </div>`, bar);
    const tr = $("#track"), ctr = $("#ctr");
    if (tr && ctr) tr.addEventListener("scroll", () => { ctr.textContent = `${Math.round(tr.scrollLeft / tr.clientWidth) + 1} / ${c.photos.length}`; }, { passive: true });
  }

  async function sellerPage(uid) {
    const head = (t) => `<div class="phead"><div class="in"><button class="iconbtn" data-close aria-label="Back">${I.back}</button><h2>${t}</h2></div></div>`;
    openOverlay(head("Seller") + `<div class="pbody">${skeletons(1)}</div>`);
    try {
      const [p, list] = await Promise.all([
        q((s) => s.from("profiles").select("*").eq("id", uid).maybeSingle()),
        q((s) => s.from("cars").select(SELECT).eq("owner", uid).order("status").order("created_at", { ascending: false })),
      ]);
      if (!/^#seller-/.test(location.hash)) return;
      remember(list);
      const name = (p && (p.dealer_name || p.name)) || "Seller";
      const num = waNumber(p && p.phone);
      const live = list.filter((c) => c.status !== "sold").length;
      openOverlay(head(esc(name)) + `<div class="pbody">
        <div class="card"><div class="prof"><div class="avatar big">${esc(initial(name))}</div>
          <div><h2>${esc(name)}</h2>${p && p.verified ? `<span class="verified">${I.check}Verified dealer</span>` : "<p>Private seller</p>"}
          <p class="num">${live} car${live === 1 ? "" : "s"} for sale${p && p.location ? " · " + esc(p.location) : ""}</p></div></div></div>
        <div class="list">${list.length ? list.map(carCard).join("") : emptyBox("No cars right now", "", "")}</div></div>`,
        num.length >= 12 && !(me && me.id === uid) ? `<div class="in"><a class="btn wa" href="https://wa.me/${num}" target="_blank" rel="noopener">${I.wa}WhatsApp</a><a class="btn red" href="tel:+${num}">${I.phone}Call</a></div>` : "");
    } catch (e) { openOverlay(head("Seller") + `<div class="pbody">${offline("seller")}</div>`); }
  }

  let draft = null;
  function filtersPage() {
    if (!draft) draft = { ...F };
    const D = draft;
    const p = (f, v, l) => `<button type="button" class="pick" data-fpick="${f}" data-val="${esc(v)}" aria-pressed="${String(D[f]) === String(v)}">${esc(l || v)}</button>`;
    const priceKey = `${D.priceMin}-${D.priceMax}`;
    openOverlay(`<div class="phead"><div class="in"><button class="iconbtn" data-close aria-label="Back">${I.back}</button><h2>Filters</h2><button class="link" data-fclear style="color:#fff">Clear all</button></div></div>
      <div class="pbody">
        <div class="fsec"><h3>Make</h3><div class="picks">${p("make", "", "Any")}${Object.keys(MAKES).map((m) => p("make", m)).join("")}</div></div>
        <div class="fsec"><h3>Price</h3><div class="picks"><button type="button" class="pick" data-fprice="0-0" aria-pressed="${priceKey === "0-0"}">Any</button>
          ${PRICES.map(([l, a, b]) => `<button type="button" class="pick" data-fprice="${a}-${b}" aria-pressed="${priceKey === `${a}-${b}`}">${l}</button>`).join("")}</div></div>
        <div class="fsec"><h3>Year</h3><div class="picks">${p("yearMin", 0, "Any")}${YEARS.map((y) => p("yearMin", y, `${y} or newer`)).join("")}</div></div>
        <div class="fsec"><h3>Type</h3><div class="picks">${p("body", "", "Any")}${BODIES.map((b) => p("body", b)).join("")}</div></div>
        <div class="fsec"><h3>Gearbox</h3><div class="picks">${p("trans", "", "Any")}${p("trans", "Automatic")}${p("trans", "Manual")}</div></div>
        <div class="fsec"><h3>Fuel</h3><div class="picks">${p("fuel", "", "Any")}${["Petrol", "Diesel", "Hybrid", "Electric"].map((f) => p("fuel", f)).join("")}</div></div>
        <div class="fsec"><h3>Area</h3><div class="picks">${p("location", "", "Anywhere")}${PLACES.map((l) => p("location", l)).join("")}</div></div>
      </div>`, `<div class="in one"><button class="btn red" data-fapply>Show cars</button></div>`);
  }

  // ---------- router ----------
  function setTabUI() {
    document.querySelectorAll("nav.tabs button").forEach((b) => b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  }
  function nav(h) { if (location.hash === h) return route(); if (isOverlayHash(h)) pushed++; location.hash = h; }
  function route() {
    const h = location.hash || "#home";
    const m = h.match(/^#(car|seller)-(.+)$/);
    if (m || h === "#filters") {
      overlayDepth = 1;
      if (m && m[1] === "car") carPage(decodeURIComponent(m[2]));
      else if (m) sellerPage(decodeURIComponent(m[2]));
      else filtersPage();
      return;
    }
    const wasOverlay = overlayDepth > 0;
    pushed = 0; overlayDepth = 0; draft = null; hideOverlay();
    const t = h.slice(1);
    const next = ["home", "search", "sell", "saved", "account"].includes(t) ? t : "home";
    if (wasOverlay && next === tab && tab !== "account" && tab !== "search") return; // keep scroll position after closing a page
    if (wasOverlay && next === "search" && tab === "search") { refreshSearchHeader(); runSearch(true); return; }
    tab = next; setTabUI(); window.scrollTo(0, 0);
    const id = ++renderId;
    if (tab === "home") homeScreen(id);
    else if (tab === "search") searchScreen();
    else if (tab === "sell") sellScreen();
    else if (tab === "saved") savedScreen(id);
    else accountScreen(id);
  }
  function refreshSearchHeader() {
    const sbar = $(".sbar"); if (!sbar) return searchScreen();
    const tmp = document.createElement("div"); tmp.innerHTML = searchShell();
    sbar.replaceWith(tmp.querySelector(".sbar")); $("#sort").value = F.sort;
  }

  // ---------- events ----------
  document.addEventListener("click", async (e) => {
    const t = e.target;
    const fav = t.closest("[data-fav]");
    if (fav) {
      e.stopPropagation();
      const k = fav.dataset.fav; saved.has(k) ? saved.delete(k) : saved.add(k); store("cb-saved", [...saved]);
      document.querySelectorAll(`[data-fav="${CSS.escape(k)}"]`).forEach((b) => b.setAttribute("aria-pressed", saved.has(k)));
      toast(saved.has(k) ? "Saved. Find it in Saved" : "Removed from Saved"); return;
    }
    const tb = t.closest("nav.tabs button"); if (tb) return nav("#" + tb.dataset.tab);
    if (t.closest("#topAccount")) return nav("#account");
    if (t.closest("[data-close]")) return closeOverlay();
    const g = t.closest("[data-go]"); if (g) { const h = g.dataset.go; if (h === "#filters") draft = null; return nav(h); }
    const op = t.closest("[data-open]"); if (op && !t.closest(".fav")) return nav("#car-" + op.dataset.open);
    const mg = t.closest("[data-make-go]"); if (mg) { F = { ...F0(), make: mg.dataset.makeGo }; return nav("#search"); }
    const bg = t.closest("[data-body-go]"); if (bg) { F = { ...F0(), body: bg.dataset.bodyGo }; return nav("#search"); }
    const snd = t.closest("[data-sound]");
    if (snd) { const v = $("#heroVid"); if (v) { v.muted = !v.muted; if (!v.muted) v.play().catch(() => {}); snd.innerHTML = v.muted ? I.mute : I.sound; snd.setAttribute("aria-label", v.muted ? "Turn sound on" : "Turn sound off"); } return; }
    if (t.closest("[data-dismiss]")) { store("cb-welcomed", 1); const w = $(".welcome"); if (w) w.remove(); return; }
    const rt = t.closest("[data-retry]"); if (rt) { if (/^(car|seller)$/.test(rt.dataset.retry)) return route(); renderId++; return route(); }
    if (t.closest("[data-more]")) return runSearch(false);
    if (t.closest("[data-clearall]")) { F = F0(); return searchScreen(); }
    const un = t.closest("[data-unf]");
    if (un) { const k = un.dataset.unf; if (k === "price") { F.priceMin = 0; F.priceMax = 0; } else F[k] = k === "yearMin" ? 0 : ""; refreshSearchHeader(); return runSearch(true); }
    const cp = t.closest("[data-copy]");
    if (cp) { const v = cp.dataset.copy; navigator.clipboard.writeText(v).then(() => toast("Number copied")).catch(() => toast(v)); return; }
    const sh = t.closest("[data-share]");
    if (sh) {
      const c = cache.get(sh.dataset.share); const url = location.href.split("#")[0] + "#car-" + sh.dataset.share;
      const text = c ? `${c.year} ${c.make} ${c.model} – UGX ${ugx(c.price)} on Car Bond` : "Car Bond";
      if (navigator.share) navigator.share({ title: "Car Bond", text, url }).catch(() => {});
      else navigator.clipboard.writeText(url).then(() => toast("Link copied")).catch(() => toast(url));
      return;
    }

    // filters
    const fp = t.closest("[data-fpick]");
    if (fp && draft) { const f = fp.dataset.fpick; draft[f] = f === "yearMin" ? Number(fp.dataset.val) : fp.dataset.val; fp.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === fp)); return; }
    const fpr = t.closest("[data-fprice]");
    if (fpr && draft) { const [a, b] = fpr.dataset.fprice.split("-").map(Number); draft.priceMin = a; draft.priceMax = b; fpr.parentElement.querySelectorAll(".pick").forEach((x) => x.setAttribute("aria-pressed", x === fpr)); return; }
    if (t.closest("[data-fclear]") && draft) { draft = { ...F0(), q: F.q, sort: F.sort }; return filtersPage(); }
    if (t.closest("[data-fapply]") && draft) { F = { ...draft }; draft = null; return closeOverlay(); }

    // account
    const am = t.closest("[data-auth]"); if (am) { authMode = am.dataset.auth; return tab === "sell" ? sellScreen() : route(); }
    if (t.closest("[data-signout]")) { await sb.auth.signOut(); toast("Signed out"); return; }
    if (t.closest("[data-editprof]")) return editProfile();

    // wizard
    if (wiz && tab === "sell" && t.closest("#wiz")) {
      const pk = t.closest("[data-pick]"); if (pk) { wiz.d[pk.dataset.pick] = pk.dataset.val; pk.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === pk)); return; }
      const mk = t.closest("[data-wmake]");
      if (mk) { const v = mk.dataset.wmake; if (v === "__other") { wiz.other = true; wiz.d.make = ""; } else { if (wiz.d.make !== v) wiz.d.model = ""; wiz.other = false; wiz.d.make = v; } sellScreen(); if (v === "__other") $("#w-make").focus(); return; }
      const md = t.closest("[data-wmodel]"); if (md) { wiz.d.model = md.dataset.wmodel; $("#w-model").value = wiz.d.model; md.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === md)); return; }
      const pl = t.closest("[data-wplace]"); if (pl) { wiz.d.location = pl.dataset.wplace; $("#w-location").value = wiz.d.location; pl.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === pl)); return; }
      const up = t.closest("[data-unphoto]"); if (up) { wiz.photos.splice(Number(up.dataset.unphoto), 1); return sellScreen(); }
      if (t.closest("[data-wback]")) { wiz.err = ""; wiz.step--; return sellScreen(); }
      const gt = t.closest("[data-goto]"); if (gt) { wiz.err = ""; wiz.step = Number(gt.dataset.goto); return sellScreen(); }
      if (t.closest("[data-wcancel]")) { wiz = null; return nav("#account"); }
    }

    // my cars
    const ed = t.closest("[data-edit]");
    if (ed) { const c = cache.get(ed.dataset.edit); if (c) { wiz = newWiz(c); hideOverlay(); overlayDepth = 0; tab = "sell"; nav("#sell"); } return; }
    const so = t.closest("[data-sold]");
    if (so) {
      const c = cache.get(so.dataset.sold); if (!c) return; so.disabled = true;
      try { await q((s) => s.from("cars").update({ status: c.status === "sold" ? "available" : "sold" }).eq("id", c.id)); c.status = c.status === "sold" ? "available" : "sold"; toast(c.status === "sold" ? "Marked as sold" : "Back on sale"); }
      catch (x) { toast("Couldn’t update. Try again."); }
      if (overlayDepth) carPage(c.id); else { renderId++; accountScreen(renderId); }
      return;
    }
    const de = t.closest("[data-del]");
    if (de) {
      if (de.dataset.armed !== "1") { de.dataset.armed = "1"; de.textContent = "Tap again"; setTimeout(() => { if (de.isConnected) { de.dataset.armed = ""; de.textContent = "Remove"; } }, 4000); return; }
      const c = cache.get(de.dataset.del); de.disabled = true;
      try { await q((s) => s.from("cars").delete().eq("id", de.dataset.del)); if (c && c.photos && c.photos.length) sb.storage.from(BUCKET).remove(c.photos).catch(() => {}); cache.delete(de.dataset.del); toast("Car removed"); }
      catch (x) { toast("Couldn’t remove. Try again."); }
      renderId++; accountScreen(renderId);
    }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches && e.target.matches("[data-open]")) nav("#car-" + e.target.dataset.open); });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "sq") { F.q = el.value; clearTimeout(qTimer); qTimer = setTimeout(() => runSearch(true), 350); return; }
    const f = el.dataset && el.dataset.f; if (!f || !wiz) return;
    if (f === "price" || f === "mileage") {
      const raw = digits(el.value).slice(0, 12); wiz.d[f] = raw; el.value = raw ? ugx(raw) : "";
      if (f === "price") $("#say").textContent = inWords(raw);
    } else {
      wiz.d[f] = el.value;
      if (f === "location") document.querySelectorAll("[data-wplace]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.wplace === el.value));
      if (f === "model") document.querySelectorAll("[data-wmodel]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.wmodel === el.value));
    }
    if (wiz.err) { wiz.err = ""; const w = $("#werr"); if (w) w.textContent = ""; }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "sort") { F.sort = el.value; runSearch(true); }
    if (el.id === "w-year" && wiz) wiz.d.year = el.value;
    if (el.id === "photos" && wiz) addPhotos([...el.files]);
  });

  document.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = e.target.id;
    if (id === "authForm") return doAuth(e);
    if (id === "profForm") return saveProfile(e);
    if (id === "wiz" && wiz && !wiz.busy) {
      const err = checkStep();
      if (err) { wiz.err = err; $("#werr").textContent = err; return; }
      wiz.err = "";
      if (wiz.step < STEPS.length - 1) { wiz.step++; sellScreen(); } else publish();
    }
  });

  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !overlayDepth && (tab === "home")) { renderId++; homeScreen(renderId); } });

  // ---------- install ----------
  let installEvt = null;
  const installBtn = $("#installBtn");
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; installBtn.hidden = false; });
  window.addEventListener("appinstalled", () => { installBtn.hidden = true; toast("Car Bond is on your home screen"); });
  installBtn.addEventListener("click", async () => { if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; installBtn.hidden = true; } });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then((r) => r.update()).catch(() => {}));

  // ---------- start ----------
  async function start() {
    if (!sb) { $("#main").innerHTML = emptyBox("Almost ready", "Add your Supabase details to config.js.", ""); return; }
    try {
      const { data } = await sb.auth.getSession();
      me = data && data.session ? data.session.user : null;
      if (me && me.is_anonymous) { await sb.auth.signOut(); me = null; }
      await loadProfile();
    } catch (e) { me = null; }
    sb.auth.onAuthStateChange(async (_ev, session) => {
      const u = session ? session.user : null;
      if ((u && u.id) === (me && me.id)) return;
      me = u && !u.is_anonymous ? u : null; await loadProfile();
      if (!overlayDepth && (tab === "account" || tab === "sell")) { renderId++; tab === "sell" ? sellScreen() : accountScreen(renderId); }
    });
    route();
  }
  start();
})();
