// Car Bond: the app's logic. Listings live in Supabase (table "cars", photo bucket "car-photos").
(function () {
  "use strict";

  const CFG = window.CAR_BOND_CONFIG || {};
  const configured = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.startsWith("PASTE") &&
    CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.startsWith("PASTE");
  const sb = configured && window.supabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
  const BUCKET = "car-photos";

  const CAR_SVG = '<svg viewBox="0 0 64 32" fill="currentColor" aria-hidden="true"><path d="M6 22v-5l6-8h28l10 8h6c2 0 3 1 3 3v2h-4a6 6 0 0 0-12 0H22a6 6 0 0 0-12 0z"/><circle cx="16" cy="24" r="4.5"/><circle cx="49" cy="24" r="4.5"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const ICON_TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5" fill="currentColor"/></svg>';
  const ICON_CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

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
  };
  const PLACES = ["Kampala", "Wakiso", "Entebbe", "Mukono", "Jinja", "Mbarara", "Gulu", "Masaka"];
  const NOW_YEAR = new Date().getFullYear();

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ugx = (n) => Number(n || 0).toLocaleString("en-UG");
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const photoUrl = (path) => `${CFG.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  function inWords(n) {
    n = Number(n || 0);
    if (!n) return "";
    if (n >= 1e9) return `${+(n / 1e9).toFixed(2)} billion shillings`;
    if (n >= 1e6) return `${+(n / 1e6).toFixed(2)} million shillings`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(1)} thousand shillings`;
    return `${n} shillings`;
  }

  const state = { tab: "browse", q: "", body: "All", sort: "new", loading: true, error: "" };
  let cars = [];
  let me = null;
  const saved = new Set(store("cb-saved") || []);

  function toast(m) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = m;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- data ----------
  async function loadCars() {
    if (!sb) { state.loading = false; render(); return; }
    const { data, error } = await sb.from("cars").select("*").order("created_at", { ascending: false }).limit(500);
    state.loading = false;
    if (error) state.error = "Couldn’t load cars. Check your internet and try again.";
    else { state.error = ""; cars = data || []; }
    if (state.tab !== "sell") render();
  }

  async function ensureSeller() {
    if (me) return me;
    const { data: s } = await sb.auth.getSession();
    if (s && s.session) { me = s.session.user; return me; }
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error("Couldn’t set up your seller account. Check your internet and try again.");
    me = data.user; return me;
  }

  // ---------- browse ----------
  function photo(c) {
    const p = (c.photos || [])[0];
    return p ? `<img src="${esc(photoUrl(p))}" alt="${esc(c.year + " " + c.make + " " + c.model)}" loading="lazy">` : CAR_SVG;
  }

  function card(c) {
    const sold = c.status === "sold";
    return `<div class="card ${sold ? "is-sold" : ""}" role="button" tabindex="0" data-open="${esc(c.id)}">
      <div class="ph">${photo(c)}</div>
      ${sold ? '<span class="badge sold">Sold</span>' : ""}
      <button class="fav" aria-label="Save this car" aria-pressed="${saved.has(c.id)}" data-fav="${esc(c.id)}">${HEART}</button>
      <div class="cbody">
        <div class="price num"><small>UGX</small>${ugx(c.price)}</div>
        <div class="title">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</div>
        <div class="meta num"><span>${ugx(c.mileage)} km</span><span>${esc(c.trans)}</span><span>${esc(c.location)}</span></div>
        ${sold ? "" : '<div class="cta-line">Tap to see photos and call the seller</div>'}
      </div></div>`;
  }

  const exampleCard = `<div class="card" aria-label="Example listing">
    <div class="ph">${CAR_SVG}</div><span class="badge ex">Example</span>
    <div class="cbody"><div class="price num"><small>UGX</small>42,000,000</div><div class="title">2013 Toyota Harrier</div>
    <div class="meta num"><span>96,000 km</span><span>Automatic</span><span>Ntinda</span></div></div></div>`;

  function welcome(full) {
    if (!full) return `<div class="sellband"><p>Selling a car? List it free in 2 minutes.</p><button class="btn primary small" data-go="sell">Sell my car</button></div>`;
    return `<section class="hello">
      <div class="hero-logo"><img src="logo.jpg" alt="Car Bond" width="640" height="565"></div>
      <h2>Welcome to Car Bond</h2>
      <p>The easy way to buy or sell a car in Uganda. No brokers, no fees.</p>
      <div class="choices">
        <button class="choice buy" data-find>${ICON_SEARCH}<strong>Find a car</strong><span>Browse cars for sale near you</span></button>
        <button class="choice sell" data-go="sell">${ICON_TAG}<strong>Sell my car</strong><span>Post it free with photos</span></button>
      </div>
      <ol class="how">
        <li><div><b>Seller posts the car</b><small>Photos, price and a phone number.</small></div></li>
        <li><div><b>Buyer finds it here</b><small>Then calls or chats on WhatsApp.</small></div></li>
        <li><div><b>Meet and inspect</b><small>Check the car and logbook, then agree.</small></div></li>
      </ol>
    </section>`;
  }

  function renderBrowse() {
    if (!sb) {
      return `<div class="empty"><h2>Almost ready</h2><p>Car Bond needs its database details. Open config.js and paste your Supabase Project URL and key.</p></div>`;
    }
    const q = state.q.trim().toLowerCase();
    const list = cars.filter((c) => (state.body === "All" || c.body === state.body) &&
      (!q || [c.make, c.model, c.year, c.location, c.body, c.fuel].join(" ").toLowerCase().includes(q)));
    const s = state.sort;
    list.sort((a, b) => (a.status === "sold") - (b.status === "sold") ||
      (s === "low" ? a.price - b.price : s === "high" ? b.price - a.price : s === "year" ? b.year - a.year :
        new Date(b.created_at) - new Date(a.created_at)));
    const live = list.filter((c) => c.status !== "sold").length;
    const firstTime = !store("cb-seen-welcome");

    let body;
    if (state.loading) body = `<div class="empty"><h2>Loading cars…</h2><p>Getting the latest cars for sale.</p></div>`;
    else if (state.error && !cars.length) body = `<div class="empty"><h2>No internet connection</h2><p>${esc(state.error)}</p><div><button class="btn brand" data-reload>Try again</button></div></div>`;
    else if (!cars.length) body = `<div class="empty"><h2>No cars for sale yet</h2>
        <p>Cars people post will show here, like this example. Be the first to list yours.</p>
        <div class="grid" style="padding:0">${exampleCard}</div>
        <button class="btn primary wide" data-go="sell">Sell my car</button></div>`;
    else if (!list.length) body = `<div class="empty"><h2>No cars match</h2><p>Try another name, area or type, or show all cars.</p><div><button class="btn ghost" data-clear>Show all cars</button></div></div>`;
    else body = `<div class="grid">${list.map(card).join("")}</div>`;

    const showFull = !q && (firstTime || (!state.loading && !cars.length));
    return `${q ? "" : welcome(showFull)}
      <div id="listings"></div>
      <div class="filters" role="group" aria-label="Type of car">${["All", ...BODIES].map((b) =>
        `<button class="chip" data-body="${b}" aria-pressed="${state.body === b}">${b === "All" ? "All cars" : b}</button>`).join("")}</div>
      <div class="toolbar"><span class="num">${state.loading ? "" : live + " car" + (live === 1 ? "" : "s") + " for sale"}</span>
        <select id="sort" aria-label="Sort cars"><option value="new">Newest first</option><option value="low">Cheapest first</option><option value="high">Most expensive first</option><option value="year">Newest model first</option></select></div>
      ${body}`;
  }

  // ---------- sell wizard ----------
  const STEPS = [
    { key: "photos", title: "Add photos", sub: "Cars with clear photos sell faster." },
    { key: "car", title: "Which car is it?", sub: "Tap the make, then type or pick the model." },
    { key: "price", title: "Your price", sub: "How much do you want for it?" },
    { key: "details", title: "A few details", sub: "Tap the answers that fit your car." },
    { key: "contact", title: "How can buyers reach you?", sub: "Buyers will call or WhatsApp this number." },
    { key: "review", title: "Check and publish", sub: "This is what buyers will see." },
  ];
  let wiz = null;

  function newWiz(car) {
    const prof = store("cb-seller") || {};
    const d = car ? {
      make: car.make, model: car.model, year: String(car.year), price: String(car.price), mileage: car.mileage ? String(car.mileage) : "",
      body: car.body || "SUV", trans: car.trans || "Automatic", fuel: car.fuel || "Petrol", location: car.location || "",
      description: car.description || "", seller_name: car.seller_name || "", seller_phone: car.seller_phone || "",
    } : {
      make: "", model: "", year: "", price: "", mileage: "", body: "SUV", trans: "Automatic", fuel: "Petrol", location: "",
      description: "", seller_name: prof.name || "", seller_phone: prof.phone || "",
    };
    const otherMake = d.make && !MAKES[d.make];
    return { step: car ? 5 : 0, editId: car ? car.id : null, d, otherMake, photos: car ? (car.photos || []).map((path) => ({ path })) : [], err: "", busy: false };
  }

  const pick = (field, value, label) =>
    `<button type="button" class="pick" data-pick="${field}" data-val="${esc(value)}" aria-pressed="${wiz.d[field] === value}">${esc(label || value)}</button>`;

  function stepBody() {
    const d = wiz.d;
    switch (STEPS[wiz.step].key) {
      case "photos":
        return `<label class="photo-add" for="photos">${ICON_CAMERA}<strong>${wiz.photos.length ? "Add more photos" : "Tap to add photos"}</strong>
            <span>Up to 6. Front, back, inside and the dashboard work best.</span></label>
          <input id="photos" type="file" accept="image/*" multiple hidden>
          ${wiz.photos.length ? `<div class="thumbs">${wiz.photos.map((p, i) => `<div class="thumb"><img src="${esc(p.path ? photoUrl(p.path) : p.preview)}" alt="">
            ${i === 0 ? '<span class="cover">Main photo</span>' : ""}<button type="button" data-unphoto="${i}" aria-label="Remove photo">×</button></div>`).join("")}</div>` : ""}`;
      case "car": {
        const models = MAKES[d.make] || [];
        const years = []; for (let y = NOW_YEAR + 1; y >= 1985; y--) years.push(y);
        return `<div class="q"><div class="ql">Make</div><div class="picks">
            ${Object.keys(MAKES).map((m) => `<button type="button" class="pick" data-make="${esc(m)}" aria-pressed="${!wiz.otherMake && d.make === m}">${esc(m)}</button>`).join("")}
            <button type="button" class="pick" data-make="__other" aria-pressed="${wiz.otherMake}">Other</button></div>
            ${wiz.otherMake ? `<input class="inp" id="w-make" data-f="make" value="${esc(d.make)}" placeholder="Type the make, e.g. Volkswagen" autocomplete="off">` : ""}</div>
          <div class="q"><label class="ql" for="w-model">Model</label>
            <input class="inp" id="w-model" data-f="model" value="${esc(d.model)}" placeholder="${models[0] ? "e.g. " + esc(models[0]) : "Type the model"}" autocomplete="off">
            ${models.length ? `<div class="picks">${models.slice(0, 8).map((m) => `<button type="button" class="pick" data-model="${esc(m)}" aria-pressed="${d.model === m}">${esc(m)}</button>`).join("")}</div>` : ""}</div>
          <div class="q"><label class="ql" for="w-year">Year made</label>
            <select class="inp" id="w-year" data-f="year"><option value="">Choose the year</option>${years.map((y) => `<option ${String(y) === d.year ? "selected" : ""}>${y}</option>`).join("")}</select></div>`;
      }
      case "price":
        return `<div class="q"><label class="ql" for="w-price">Price in Uganda shillings</label>
            <input class="inp big-money num" id="w-price" data-f="price" inputmode="numeric" value="${d.price ? ugx(d.price) : ""}" placeholder="42,000,000" autocomplete="off">
            <div class="say" id="say">${esc(inWords(d.price))}</div></div>
          <div class="q"><label class="ql" for="w-mileage">Mileage <small>optional</small></label>
            <input class="inp num" id="w-mileage" data-f="mileage" inputmode="numeric" value="${d.mileage ? ugx(d.mileage) : ""}" placeholder="Kilometres on the dashboard, e.g. 96,000" autocomplete="off"></div>`;
      case "details":
        return `<div class="q"><div class="ql">Type of car</div><div class="picks">${BODIES.map((b) => pick("body", b)).join("")}</div></div>
          <div class="q"><div class="ql">Gearbox</div><div class="picks">${pick("trans", "Automatic")}${pick("trans", "Manual")}</div></div>
          <div class="q"><div class="ql">Fuel</div><div class="picks">${["Petrol", "Diesel", "Hybrid", "Electric"].map((f) => pick("fuel", f)).join("")}</div></div>
          <div class="q"><label class="ql" for="w-location">Where is the car?</label>
            <input class="inp" id="w-location" data-f="location" value="${esc(d.location)}" placeholder="Area, e.g. Ntinda, Kampala" autocomplete="off">
            <div class="picks">${PLACES.map((p) => `<button type="button" class="pick" data-place="${p}" aria-pressed="${d.location === p}">${p}</button>`).join("")}</div></div>
          <div class="q"><label class="ql" for="w-desc">Anything else? <small>optional</small></label>
            <textarea class="inp" id="w-desc" data-f="description" maxlength="1200" placeholder="e.g. Clean interior, new tyres, recently serviced">${esc(d.description)}</textarea></div>`;
      case "contact":
        return `<div class="q"><label class="ql" for="w-name">Your name</label>
            <input class="inp" id="w-name" data-f="seller_name" value="${esc(d.seller_name)}" placeholder="e.g. Peter" autocomplete="name"></div>
          <div class="q"><label class="ql" for="w-phone">Phone or WhatsApp number</label>
            <input class="inp num" id="w-phone" data-f="seller_phone" type="tel" inputmode="tel" value="${esc(d.seller_phone)}" placeholder="0772 123 456" autocomplete="tel"></div>
          <p class="note">You can change or remove your listing any time from <b>My cars</b> on this phone.</p>`;
      case "review": {
        const preview = { ...d, price: Number(d.price), mileage: Number(d.mileage || 0), photos: [] };
        const first = wiz.photos[0];
        const ph = first ? `<img src="${esc(first.path ? photoUrl(first.path) : first.preview)}" alt="">` : CAR_SVG;
        const row = (label, val, step) => `<div class="rv"><div><dt>${label}</dt><dd>${val}</dd></div><button type="button" data-goto="${step}">Change</button></div>`;
        return `<div class="card" style="cursor:default"><div class="ph">${ph}</div><div class="cbody">
            <div class="price num"><small>UGX</small>${ugx(preview.price)}</div>
            <div class="title">${esc(d.year)} ${esc(d.make)} ${esc(d.model)}</div>
            <div class="meta num"><span>${ugx(preview.mileage)} km</span><span>${esc(d.trans)}</span><span>${esc(d.location)}</span></div></div></div>
          <dl class="review" style="margin:0">
            ${row("Photos", wiz.photos.length ? wiz.photos.length + " photo" + (wiz.photos.length === 1 ? "" : "s") : "No photos", 0)}
            ${row("Car", `${esc(d.year)} ${esc(d.make)} ${esc(d.model)}`, 1)}
            ${row("Price", "UGX " + ugx(d.price), 2)}
            ${row("Details", `${esc(d.body)} · ${esc(d.trans)} · ${esc(d.fuel)} · ${esc(d.location)}`, 3)}
            ${row("Contact", `${esc(d.seller_name)} · ${esc(d.seller_phone)}`, 4)}
          </dl>`;
      }
    }
    return "";
  }

  function renderSell() {
    if (!sb) return renderBrowse();
    if (!wiz) wiz = newWiz(null);
    const st = STEPS[wiz.step], last = wiz.step === STEPS.length - 1;
    const nextLabel = last ? (wiz.editId ? "Save changes" : "Publish my car") :
      st.key === "photos" && !wiz.photos.length ? "Skip photos for now" : "Next";
    return `<form class="wiz" id="wiz" novalidate>
      <div class="prog"><div class="lbl"><span>Step ${wiz.step + 1} of ${STEPS.length}</span><span>${wiz.editId ? "Editing your car" : "Sell your car"}</span></div>
        <div class="bar"><i style="width:${((wiz.step + 1) / STEPS.length) * 100}%"></i></div></div>
      <h3>${st.title}</h3><p class="sub">${st.sub}</p>
      ${stepBody()}
      <p class="err" id="werr" role="alert">${esc(wiz.err)}</p>
      <div class="navrow ${wiz.step === 0 ? "single" : ""}">
        ${wiz.step > 0 ? '<button type="button" class="btn ghost" data-back>Back</button>' : ""}
        <button type="submit" class="btn primary" ${wiz.busy ? "disabled" : ""}>${wiz.busy ? esc(wiz.busy) : nextLabel}</button>
      </div>
      ${wiz.editId ? '<button type="button" class="btn ghost wide" data-canceledit>Cancel editing</button>' : ""}
    </form>`;
  }

  function checkStep() {
    const d = wiz.d;
    switch (STEPS[wiz.step].key) {
      case "car":
        if (!d.make.trim()) return "Tap the make of your car.";
        if (!d.model.trim()) return "Type or tap the model.";
        if (!d.year) return "Choose the year the car was made.";
        return "";
      case "price":
        if (!Number(d.price)) return "Enter your price, for example 42,000,000.";
        if (Number(d.price) < 100000) return "That price looks too low. Enter the full amount in shillings.";
        return "";
      case "details":
        return d.location.trim() ? "" : "Say where the car is, or tap an area.";
      case "contact":
        if (!d.seller_name.trim()) return "Enter your name.";
        if (waNumber(d.seller_phone).length < 12) return "Enter a full phone number, like 0772 123 456.";
        return "";
    }
    return "";
  }

  function showSell(focusFirst) {
    $("#main").innerHTML = renderSell();
    window.scrollTo(0, 0);
    if (focusFirst) { const f = document.querySelector("#wiz .inp"); if (f && !f.value) f.focus({ preventScroll: true }); }
  }

  async function wizNext() {
    const err = checkStep();
    if (err) { wiz.err = err; $("#werr").textContent = err; return; }
    wiz.err = "";
    if (wiz.step < STEPS.length - 1) { wiz.step++; showSell(false); return; }
    await publish();
  }

  async function publish() {
    const d = wiz.d;
    const setBusy = (t) => { wiz.busy = t; showSell(false); };
    try {
      setBusy("Getting ready…");
      const user = await ensureSeller();
      const paths = [];
      for (let i = 0; i < wiz.photos.length; i++) {
        const p = wiz.photos[i];
        if (p.path) { paths.push(p.path); continue; }
        setBusy(`Uploading photo ${i + 1} of ${wiz.photos.length}…`);
        const blob = await shrink(p.file);
        const path = `${user.id}/${Date.now().toString(36)}-${i}.jpg`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw new Error("A photo didn’t upload. Check your internet and try again.");
        p.path = path; paths.push(path);
      }
      setBusy("Publishing…");
      const row = {
        make: d.make.trim(), model: d.model.trim(), year: Number(d.year), price: Number(d.price),
        mileage: Number(d.mileage || 0), body: d.body, trans: d.trans, fuel: d.fuel,
        location: d.location.trim(), description: d.description.trim(), photos: paths,
        seller_name: d.seller_name.trim(), seller_phone: d.seller_phone.trim(),
      };
      store("cb-seller", { name: row.seller_name, phone: row.seller_phone });
      const edit = wiz.editId;
      const { error } = edit ? await sb.from("cars").update(row).eq("id", edit) : await sb.from("cars").insert(row);
      if (error) throw new Error("Your listing didn’t save. Check your internet and try again.");
      wiz = null;
      toast(edit ? "Your changes are saved" : "Your car is live! Buyers can see it now");
      await loadCars();
      go("mine");
    } catch (err) {
      wiz.busy = false; wiz.err = err.message || "Something went wrong. Try again.";
      showSell(false);
    }
  }

  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(u);
        cv.toBlob((b) => (b ? res(b) : rej(new Error("That photo couldn’t be prepared. Try another one."))), "image/jpeg", 0.82);
      };
      img.onerror = () => rej(new Error("One photo couldn’t be read. Remove it and choose a JPG or PNG."));
      img.src = u;
    });
  }

  // ---------- my cars / saved ----------
  function myCars() { return me ? cars.filter((c) => c.owner === me.id) : []; }

  function renderMine() {
    if (!sb) return renderBrowse();
    const list = myCars();
    if (!list.length) return `<div class="sec-head"><h2>My cars</h2><p>Cars you sell from this phone show here. You can change the price, mark them sold or remove them.</p></div>
      <div class="empty"><h2>You haven’t listed a car yet</h2><button class="btn primary wide" data-go="sell">Sell my car</button></div>`;
    return `<div class="sec-head"><h2>My cars</h2><p>${list.length} car${list.length === 1 ? "" : "s"} listed from this phone</p></div><div class="mine">${list.map((c) => `
      <div class="mrow"><div class="ph">${photo(c)}</div>
        <div style="min-width:0"><div class="title">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</div>
        <div class="num" style="font-weight:800;font-size:18px">UGX ${ugx(c.price)}</div>
        <span class="pill ${c.status === "sold" ? "sold" : ""}">${c.status === "sold" ? "Sold" : "For sale"}</span></div>
        <div class="acts">
          <button class="btn ghost small" data-edit="${esc(c.id)}">Edit</button>
          <button class="btn ${c.status === "sold" ? "brand" : "ghost"} small" data-sold="${esc(c.id)}">${c.status === "sold" ? "Sell again" : "Mark as sold"}</button>
          <button class="btn danger small" data-del="${esc(c.id)}">Remove this car</button>
        </div></div>`).join("")}</div>`;
  }

  function renderSaved() {
    const list = cars.filter((c) => saved.has(c.id));
    return `<div class="sec-head"><h2>Saved cars</h2><p>Tap the heart on any car to keep it here for later.</p></div>
      ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : '<div class="empty"><h2>No saved cars yet</h2><button class="btn brand wide" data-go="browse">Find a car</button></div>'}`;
  }

  // ---------- render ----------
  function render() {
    document.querySelectorAll("nav.tabs button").forEach((b) =>
      b.dataset.tab === state.tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $("#searchWrap").hidden = state.tab !== "browse";
    const m = $("#main");
    if (state.tab === "browse") { m.innerHTML = renderBrowse(); const s = $("#sort"); if (s) s.value = state.sort; }
    else if (state.tab === "sell") m.innerHTML = renderSell();
    else if (state.tab === "mine") m.innerHTML = renderMine();
    else m.innerHTML = renderSaved();
  }

  function go(tab) {
    if (state.tab === "browse" && tab !== "browse") store("cb-seen-welcome", 1);
    state.tab = tab;
    if (tab === "sell" && wiz && wiz.editId === null && wiz.step === STEPS.length) wiz = null;
    render(); window.scrollTo(0, 0);
    if (tab !== "sell") loadCars();
  }

  // ---------- detail sheet ----------
  function waNumber(p) {
    let d = digits(p);
    if (d.startsWith("0")) d = "256" + d.slice(1);
    else if (d.length === 9) d = "256" + d;
    return d;
  }

  function openCar(id) {
    const c = cars.find((x) => x.id === id);
    if (!c) return;
    const pics = (c.photos || []).length ? c.photos.map((p) => `<img src="${esc(photoUrl(p))}" alt="">`).join("") : `<div class="ph">${CAR_SVG}</div>`;
    const msg = encodeURIComponent(`Hello ${c.seller_name || ""}, I saw your ${c.year} ${c.make} ${c.model} (UGX ${ugx(c.price)}) on Car Bond. Is it still available?`);
    const num = waNumber(c.seller_phone);
    const sc = document.createElement("div");
    sc.className = "scrim";
    sc.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(c.make + " " + c.model)}">
      <div class="closer"><button aria-label="Close">×</button></div>
      <div class="gallery">${pics}</div>
      <div class="sbody">
        <div style="display:grid;gap:4px">${c.status === "sold" ? '<span class="pill sold" style="justify-self:start">Sold</span>' : ""}
          <h2 style="font-size:27px">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</h2>
          <div class="price num" style="font-size:30px"><small>UGX</small>${ugx(c.price)}</div>
          ${(c.photos || []).length > 1 ? `<div style="color:var(--muted);font-size:15px">Swipe the photo to see all ${c.photos.length}</div>` : ""}</div>
        <div class="seller"><strong>Seller: ${esc(c.seller_name || "Private seller")}</strong>
          <div class="phone"><code>${esc(c.seller_phone)}</code></div>
          <div class="contact">
            <a class="btn wa" href="https://wa.me/${num}?text=${msg}" target="_blank" rel="noopener">Chat on WhatsApp</a>
            <a class="btn brand" href="tel:+${num}">Call seller</a>
            <button class="btn ghost" data-copy>Copy number</button>
          </div></div>
        <dl class="specs">
          <div><dt>Mileage</dt><dd class="num">${ugx(c.mileage)} km</dd></div><div><dt>Year</dt><dd class="num">${esc(c.year)}</dd></div>
          <div><dt>Type</dt><dd>${esc(c.body)}</dd></div><div><dt>Gearbox</dt><dd>${esc(c.trans)}</dd></div>
          <div><dt>Fuel</dt><dd>${esc(c.fuel)}</dd></div><div><dt>Location</dt><dd>${esc(c.location)}</dd></div></dl>
        ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ""}
        <p class="note">Stay safe: meet in a public place, check the logbook, and never pay before seeing the car.</p>
      </div></div>`;
    const close = () => { sc.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    sc.addEventListener("click", (e) => {
      if (e.target === sc || e.target.closest(".closer button")) close();
      if (e.target.closest("[data-copy]")) {
        navigator.clipboard.writeText(c.seller_phone).then(() => toast("Number copied")).catch(() => {
          const r = document.createRange(); r.selectNodeContents(sc.querySelector("code"));
          const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Number selected");
        });
      }
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(sc);
  }

  // ---------- my-car actions ----------
  async function setStatus(id, btn) {
    const c = cars.find((x) => x.id === id); if (!c) return;
    btn.disabled = true;
    const { error } = await sb.from("cars").update({ status: c.status === "sold" ? "available" : "sold" }).eq("id", id);
    if (error) { toast("Couldn’t update. Try again."); btn.disabled = false; return; }
    toast(c.status === "sold" ? "Back on sale" : "Marked as sold"); await loadCars();
  }

  const delArmed = new Set();
  async function removeCar(id, btn) {
    if (!delArmed.has(id)) {
      delArmed.add(id); btn.textContent = "Tap again to remove";
      setTimeout(() => { delArmed.delete(id); if (btn.isConnected) btn.textContent = "Remove this car"; }, 4000);
      return;
    }
    btn.disabled = true;
    const c = cars.find((x) => x.id === id);
    const { error } = await sb.from("cars").delete().eq("id", id);
    if (error) { toast("Couldn’t remove. Try again."); btn.disabled = false; return; }
    if (c && c.photos && c.photos.length) await sb.storage.from(BUCKET).remove(c.photos).catch(() => {});
    toast("Car removed"); await loadCars();
  }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const t = e.target;
    const fav = t.closest("[data-fav]");
    if (fav) {
      e.stopPropagation();
      const k = fav.dataset.fav;
      saved.has(k) ? saved.delete(k) : saved.add(k);
      store("cb-saved", [...saved]);
      fav.setAttribute("aria-pressed", saved.has(k));
      toast(saved.has(k) ? "Saved. Find it in the Saved tab" : "Removed from saved");
      if (state.tab === "saved") render();
      return;
    }
    const tab = t.closest("nav.tabs button"); if (tab) return go(tab.dataset.tab);
    const g = t.closest("[data-go]"); if (g) return go(g.dataset.go);
    if (t.closest("[data-find]")) { store("cb-seen-welcome", 1); const l = $("#listings"); if (l) l.scrollIntoView({ behavior: "smooth" }); return; }
    if (t.closest("[data-reload]")) { state.loading = true; render(); return loadCars(); }
    if (t.closest("[data-clear]")) { state.q = ""; state.body = "All"; $("#q").value = ""; return render(); }
    const chip = t.closest("[data-body]"); if (chip) { state.body = chip.dataset.body; return render(); }
    const op = t.closest("[data-open]"); if (op) return openCar(op.dataset.open);

    // wizard
    if (wiz && state.tab === "sell") {
      const pk = t.closest("[data-pick]");
      if (pk) { wiz.d[pk.dataset.pick] = pk.dataset.val; pk.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === pk)); return; }
      const mk = t.closest("[data-make]");
      if (mk) {
        const v = mk.dataset.make;
        if (v === "__other") { wiz.otherMake = true; wiz.d.make = ""; }
        else { if (wiz.d.make !== v) wiz.d.model = ""; wiz.otherMake = false; wiz.d.make = v; }
        showSell(false);
        const f = v === "__other" ? $("#w-make") : null; if (f) f.focus();
        return;
      }
      const md = t.closest("[data-model]");
      if (md) { wiz.d.model = md.dataset.model; $("#w-model").value = wiz.d.model; md.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === md)); return; }
      const pl = t.closest("[data-place]");
      if (pl) { wiz.d.location = pl.dataset.place; $("#w-location").value = wiz.d.location; pl.parentElement.querySelectorAll(".pick").forEach((b) => b.setAttribute("aria-pressed", b === pl)); return; }
      const un = t.closest("[data-unphoto]");
      if (un) { wiz.photos.splice(Number(un.dataset.unphoto), 1); return showSell(false); }
      if (t.closest("[data-back]")) { wiz.err = ""; wiz.step = Math.max(0, wiz.step - 1); return showSell(false); }
      const gt = t.closest("[data-goto]"); if (gt) { wiz.step = Number(gt.dataset.goto); return showSell(false); }
      if (t.closest("[data-canceledit]")) { wiz = null; return go("mine"); }
    }

    const ed = t.closest("[data-edit]");
    if (ed) { const c = cars.find((x) => x.id === ed.dataset.edit); if (c) { wiz = newWiz(c); state.tab = "sell"; render(); window.scrollTo(0, 0); } return; }
    const so = t.closest("[data-sold]"); if (so) return setStatus(so.dataset.sold, so);
    const de = t.closest("[data-del]"); if (de) return removeCar(de.dataset.del, de);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches && e.target.matches("[data-open]")) openCar(e.target.dataset.open);
  });

  document.addEventListener("input", (e) => {
    const f = e.target.dataset && e.target.dataset.f;
    if (!f || !wiz) return;
    if (f === "price" || f === "mileage") {
      const raw = digits(e.target.value).slice(0, 12);
      wiz.d[f] = raw;
      e.target.value = raw ? ugx(raw) : "";
      if (f === "price") $("#say").textContent = inWords(raw);
    } else {
      wiz.d[f] = e.target.value;
      if (f === "location") document.querySelectorAll("[data-place]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.place === e.target.value));
      if (f === "model") document.querySelectorAll("[data-model]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.model === e.target.value));
    }
    if (wiz.err) { wiz.err = ""; const w = $("#werr"); if (w) w.textContent = ""; }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "sort") { state.sort = e.target.value; render(); }
    if (e.target.id === "w-year" && wiz) wiz.d.year = e.target.value;
    if (e.target.id === "photos" && wiz) {
      const files = [...e.target.files]; const room = 6 - wiz.photos.length;
      files.slice(0, room).forEach((f) => wiz.photos.push({ file: f, preview: URL.createObjectURL(f) }));
      if (files.length > room) toast("You can add up to 6 photos");
      showSell(false);
    }
  });

  document.addEventListener("submit", (e) => { if (e.target.id === "wiz") { e.preventDefault(); if (!wiz.busy) wizNext(); } });
  $("#q").addEventListener("input", (e) => { state.q = e.target.value; if (state.tab === "browse") render(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && state.tab !== "sell") loadCars(); });

  // ---------- install as an app ----------
  let installEvt = null;
  const installBtn = $("#installBtn");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; installBtn.hidden = false; });
  window.addEventListener("appinstalled", () => { installBtn.hidden = true; toast("Car Bond is on your home screen"); });
  installBtn.addEventListener("click", async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; installBtn.hidden = true; }
    else toast("Tap your browser’s Share or ⋮ menu, then “Add to Home Screen”.");
  });
  if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) installBtn.hidden = false;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").then((r) => r.update()).catch(() => {}));
  }

  // ---------- start ----------
  render();
  if (sb) sb.auth.getSession().then(({ data }) => { if (data && data.session) me = data.session.user; if (state.tab === "mine") render(); });
  loadCars();
})();
