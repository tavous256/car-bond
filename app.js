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
  const BODIES = ["SUV", "Saloon", "Hatchback", "Station wagon", "Pickup", "Van", "Bus"];

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ugx = (n) => Number(n || 0).toLocaleString("en-UG");
  const photoUrl = (path) => `${CFG.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;

  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  const state = { tab: "browse", q: "", body: "All", sort: "new", loading: true, error: "" };
  let cars = [];
  let me = null; // the signed-in seller (anonymous account tied to this phone)
  let editingId = null;
  let pending = [];
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
    if (error) { state.error = "Couldn’t load cars. Check your internet and pull down to try again."; }
    else { state.error = ""; cars = data || []; }
    if (state.tab !== "sell" || !$("#sellForm")) render();
  }

  async function ensureSeller() {
    if (me) return me;
    const { data: s } = await sb.auth.getSession();
    if (s && s.session) { me = s.session.user; return me; }
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error("Couldn’t set up your seller account. Check your internet and try again.");
    me = data.user; return me;
  }

  // ---------- views ----------
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
        <div class="meta num"><span>${ugx(c.mileage)} km</span><span>${esc(c.trans)}</span><span>${esc(c.fuel)}</span><span>${esc(c.location)}</span></div>
      </div></div>`;
  }

  const exampleCard = `<div class="card" aria-label="Example listing">
    <div class="ph">${CAR_SVG}</div><span class="badge ex">Example</span>
    <div class="cbody"><div class="price num"><small>UGX</small>42,000,000</div><div class="title">2013 Toyota Harrier</div>
    <div class="meta num"><span>96,000 km</span><span>Automatic</span><span>Petrol</span><span>Ntinda</span></div></div></div>`;

  function renderBrowse() {
    if (!sb) {
      return `<div class="sec-head"><h2>Almost ready</h2></div><div class="empty">
        <h2>Connect your database</h2>
        <p>Car Bond needs its database details before it can show cars. Open <strong>config.js</strong> and paste your Supabase Project URL and anon public key, as described in the setup guide (step 2).</p></div>`;
    }
    const q = state.q.trim().toLowerCase();
    const list = cars.filter((c) => (state.body === "All" || c.body === state.body) &&
      (!q || [c.make, c.model, c.year, c.location, c.body, c.fuel].join(" ").toLowerCase().includes(q)));
    const s = state.sort;
    list.sort((a, b) => (a.status === "sold") - (b.status === "sold") ||
      (s === "low" ? a.price - b.price : s === "high" ? b.price - a.price : s === "year" ? b.year - a.year :
        new Date(b.created_at) - new Date(a.created_at)));
    const live = list.filter((c) => c.status !== "sold").length;

    let body;
    if (state.loading) body = `<div class="empty"><h2>Loading cars…</h2><p>Fetching the latest listings.</p></div>`;
    else if (state.error && !cars.length) body = `<div class="empty"><h2>Can’t reach Car Bond</h2><p>${esc(state.error)}</p><div><button class="btn brand" data-reload>Try again</button></div></div>`;
    else if (!cars.length) body = `<div class="empty"><h2>No cars listed yet</h2>
        <p>Every car people post shows up here with its price, photos and the seller’s number, so buyers can call or WhatsApp them directly. Be the first to list one.</p>
        <div class="grid" style="padding:0">${exampleCard}</div>
        <div><button class="btn primary" data-go="sell">List your car</button></div></div>`;
    else if (!list.length) body = `<div class="empty"><h2>No matches</h2><p>Nothing fits that search. Try another make, area or body type.</p></div>`;
    else body = `<div class="grid">${list.map(card).join("")}</div>`;

    return `<div class="filters" role="group" aria-label="Body type">${["All", ...BODIES].map((b) =>
      `<button class="chip" data-body="${b}" aria-pressed="${state.body === b}">${b}</button>`).join("")}</div>
      <div class="toolbar"><span class="num">${state.loading ? "" : live + " car" + (live === 1 ? "" : "s") + " for sale"}</span>
      <label>Sort <select id="sort"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="year">Year: newest</option></select></label></div>${body}`;
  }

  const field = (id, label, attrs = "", hint = "") =>
    `<label class="f" for="${id}">${label}${hint ? ` <span class="hint">${hint}</span>` : ""}<input id="${id}" ${attrs}></label>`;
  const sel = (id, label, opts) =>
    `<label class="f" for="${id}">${label}<select id="${id}">${opts.map((o) => `<option>${o}</option>`).join("")}</select></label>`;

  function renderSell() {
    if (!sb) return renderBrowse();
    return `<div class="sec-head"><h2>${editingId ? "Edit your listing" : "Sell your car"}</h2><p>Buyers contact you directly. No middlemen.</p></div>
    <form class="sell" id="sellForm" novalidate>
      <div class="legend">The car</div>
      <div class="row2">${field("make", "Make", 'required autocomplete="off" placeholder="Toyota"')}${field("model", "Model", 'required autocomplete="off" placeholder="Harrier"')}</div>
      <div class="row2">${field("year", "Year", 'type="number" inputmode="numeric" min="1960" max="2030" required placeholder="2013"')}${field("price", "Price", 'type="number" inputmode="numeric" min="0" step="1000" required placeholder="42000000"', "in UGX")}</div>
      <div class="row2">${field("mileage", "Mileage", 'type="number" inputmode="numeric" min="0" placeholder="96000"', "km")}${sel("body", "Body type", BODIES)}</div>
      <div class="row2">${sel("trans", "Gearbox", ["Automatic", "Manual"])}${sel("fuel", "Fuel", ["Petrol", "Diesel", "Hybrid", "Electric"])}</div>
      ${field("location", "Where is the car?", 'required placeholder="Ntinda, Kampala"')}
      <label class="f" for="desc">Description <span class="hint">condition, service history, why you’re selling</span><textarea id="desc" maxlength="1200" placeholder="Clean interior, new tyres, serviced at 90,000 km…"></textarea></label>
      <label class="f" for="photos">Photos <span class="hint">up to 6</span><input id="photos" type="file" accept="image/*" multiple></label>
      <div class="thumbs" id="thumbs"></div>
      <div class="legend">How buyers reach you</div>
      <div class="row2">${field("sname", "Your name", 'required autocomplete="name" placeholder="Peter"')}${field("sphone", "Phone or WhatsApp", 'type="tel" inputmode="tel" autocomplete="tel" required placeholder="0772 123 456"')}</div>
      <p class="note">Your listings are linked to this phone. You can edit them from the My cars tab on this phone.</p>
      <div class="status" id="formStatus" role="status"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary" type="submit" id="submitBtn" style="flex:1">${editingId ? "Save changes" : "Publish listing"}</button>
        ${editingId ? '<button class="btn ghost" type="button" id="cancelEdit">Cancel</button>' : ""}
      </div>
    </form>`;
  }

  function fillForm() {
    const prof = store("cb-seller") || {};
    $("#sname").value = prof.name || "";
    $("#sphone").value = prof.phone || "";
    pending = [];
    if (editingId) {
      const c = cars.find((x) => x.id === editingId);
      if (!c) return;
      const map = { make: "make", model: "model", year: "year", price: "price", mileage: "mileage", body: "body", trans: "trans", fuel: "fuel", location: "location", desc: "description", sname: "seller_name", sphone: "seller_phone" };
      for (const [el, k] of Object.entries(map)) $("#" + el).value = c[k] ?? "";
      pending = (c.photos || []).map((path) => ({ path }));
    }
    drawThumbs();
  }

  function drawThumbs() {
    const t = $("#thumbs");
    if (t) t.innerHTML = pending.map((p) => `<img src="${esc(p.path ? photoUrl(p.path) : p.preview)}" alt="">`).join("");
  }

  function myCars() { return me ? cars.filter((c) => c.owner === me.id) : []; }

  function renderMine() {
    if (!sb) return renderBrowse();
    const list = myCars();
    if (!list.length) return `<div class="sec-head"><h2>My cars</h2><p>Cars you list from this phone appear here so you can edit them, mark them sold or take them down.</p></div>
      <div class="empty"><h2>You haven’t listed a car</h2><div><button class="btn primary" data-go="sell">List your car</button></div></div>`;
    return `<div class="sec-head"><h2>My cars</h2><p>${list.length} listing${list.length === 1 ? "" : "s"}</p></div><div class="mine">${list.map((c) => `
      <div class="mrow"><div class="ph">${photo(c)}</div>
        <div style="min-width:0"><div class="title">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</div>
        <div class="num" style="font-weight:700">UGX ${ugx(c.price)}</div>
        <span class="pill ${c.status === "sold" ? "sold" : ""}">${c.status === "sold" ? "Sold" : "For sale"}</span></div>
        <div class="acts">
          <button class="btn ghost" data-edit="${esc(c.id)}">Edit</button>
          <button class="btn ${c.status === "sold" ? "brand" : "ghost"}" data-sold="${esc(c.id)}">${c.status === "sold" ? "Put back on sale" : "Mark as sold"}</button>
          <button class="btn danger" data-del="${esc(c.id)}">Remove</button>
        </div></div>`).join("")}</div>`;
  }

  function renderSaved() {
    const list = cars.filter((c) => saved.has(c.id));
    return `<div class="sec-head"><h2>Saved cars</h2><p>Tap the heart on any car to keep it here. Saved cars stay on this phone.</p></div>
      ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : '<div class="empty"><h2>Nothing saved yet</h2><div><button class="btn brand" data-go="browse">Browse cars</button></div></div>'}`;
  }

  function render() {
    document.querySelectorAll("nav.tabs button").forEach((b) =>
      b.dataset.tab === state.tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    $("#searchWrap").hidden = state.tab !== "browse";
    const m = $("#main");
    if (state.tab === "browse") { m.innerHTML = renderBrowse(); const s = $("#sort"); if (s) s.value = state.sort; }
    else if (state.tab === "sell") { m.innerHTML = renderSell(); if ($("#sellForm")) fillForm(); }
    else if (state.tab === "mine") m.innerHTML = renderMine();
    else m.innerHTML = renderSaved();
  }

  function go(tab) {
    state.tab = tab;
    if (tab !== "sell") editingId = null;
    render(); window.scrollTo(0, 0);
    if (tab === "browse" || tab === "mine" || tab === "saved") loadCars();
  }

  // ---------- detail sheet ----------
  function waNumber(p) {
    let d = String(p || "").replace(/\D/g, "");
    if (d.startsWith("0")) d = "256" + d.slice(1);
    else if (d.length === 9) d = "256" + d;
    return d;
  }

  function openCar(id) {
    const c = cars.find((x) => x.id === id);
    if (!c) return;
    const pics = (c.photos || []).length ? c.photos.map((p) => `<img src="${esc(photoUrl(p))}" alt="">`).join("") : `<div class="ph">${CAR_SVG}</div>`;
    const msg = encodeURIComponent(`Hello ${c.seller_name || ""}, I saw your ${c.year} ${c.make} ${c.model} (UGX ${ugx(c.price)}) on Car Bond. Is it still available?`);
    const sc = document.createElement("div");
    sc.className = "scrim";
    sc.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(c.make + " " + c.model)}">
      <div class="closer"><button aria-label="Close">×</button></div>
      <div class="gallery">${pics}</div>
      <div class="sbody">
        <div style="display:grid;gap:2px">${c.status === "sold" ? '<span class="pill sold" style="justify-self:start">Sold</span>' : ""}
          <h2 style="font-size:24px">${esc(c.year)} ${esc(c.make)} ${esc(c.model)}</h2>
          <div class="price num" style="font-size:26px"><small>UGX</small>${ugx(c.price)}</div>
          ${(c.photos || []).length > 1 ? `<div style="color:var(--muted);font-size:13px">Swipe for ${c.photos.length} photos</div>` : ""}</div>
        <dl class="specs">
          <div><dt>Mileage</dt><dd class="num">${ugx(c.mileage)} km</dd></div><div><dt>Year</dt><dd class="num">${esc(c.year)}</dd></div>
          <div><dt>Body</dt><dd>${esc(c.body)}</dd></div><div><dt>Gearbox</dt><dd>${esc(c.trans)}</dd></div>
          <div><dt>Fuel</dt><dd>${esc(c.fuel)}</dd></div><div><dt>Location</dt><dd>${esc(c.location)}</dd></div></dl>
        ${c.description ? `<p class="desc">${esc(c.description)}</p>` : ""}
        <div class="seller"><strong>Seller: ${esc(c.seller_name || "Private seller")}</strong>
          <div class="phone"><code>${esc(c.seller_phone)}</code>
            <a class="btn ghost" href="tel:${esc(waNumber(c.seller_phone) ? "+" + waNumber(c.seller_phone) : "")}" style="padding:9px 12px">Call</a>
            <button class="btn ghost" data-copy style="padding:9px 12px">Copy</button></div>
          <a class="btn wa" href="https://wa.me/${waNumber(c.seller_phone)}?text=${msg}" target="_blank" rel="noopener">Chat on WhatsApp</a>
          <div style="font-size:12.5px;color:var(--muted)">Meet in a public place and check the logbook before paying.</div></div>
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
    sc.querySelector(".closer button").focus();
  }

  // ---------- selling ----------
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
      img.onerror = () => rej(new Error("That file isn’t a photo we can read. Choose a JPG or PNG."));
      img.src = u;
    });
  }

  async function submitSell(e) {
    e.preventDefault();
    const st = $("#formStatus"), btn = $("#submitBtn");
    const v = (id) => $("#" + id).value.trim();
    const need = ["make", "model", "year", "price", "location", "sname", "sphone"].filter((id) => !v(id));
    if (need.length) { st.className = "status err"; st.textContent = "Fill in make, model, year, price, location, your name and phone number."; $("#" + need[0]).focus(); return; }
    if (waNumber(v("sphone")).length < 10) { st.className = "status err"; st.textContent = "Enter a full phone number, like 0772 123 456."; $("#sphone").focus(); return; }
    btn.disabled = true; st.className = "status";
    try {
      st.textContent = "Getting ready…";
      const user = await ensureSeller();
      const paths = [];
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        if (p.path) { paths.push(p.path); continue; }
        st.textContent = `Uploading photo ${i + 1} of ${pending.length}…`;
        const blob = await shrink(p.file);
        const path = `${user.id}/${Date.now().toString(36)}-${i}.jpg`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw new Error("A photo didn’t upload. Check your internet and try again.");
        paths.push(path);
      }
      st.textContent = "Publishing…";
      const row = {
        make: v("make"), model: v("model"), year: Number(v("year")), price: Number(v("price")),
        mileage: Number(v("mileage") || 0), body: v("body"), trans: v("trans"), fuel: v("fuel"),
        location: v("location"), description: $("#desc").value.trim(), photos: paths,
        seller_name: v("sname"), seller_phone: v("sphone"),
      };
      store("cb-seller", { name: row.seller_name, phone: row.seller_phone });
      const wasEdit = !!editingId;
      const q = wasEdit ? sb.from("cars").update(row).eq("id", editingId) : sb.from("cars").insert(row);
      const { error } = await q;
      if (error) throw new Error("Your listing didn’t save. Check your internet and try again.");
      editingId = null;
      toast(wasEdit ? "Listing updated" : "Your car is live");
      await loadCars();
      go("mine");
    } catch (err) {
      st.className = "status err"; st.textContent = err.message || "Something went wrong. Try again.";
      btn.disabled = false;
    }
  }

  async function setStatus(id, btn) {
    const c = cars.find((x) => x.id === id); if (!c) return;
    btn.disabled = true;
    const { error } = await sb.from("cars").update({ status: c.status === "sold" ? "available" : "sold" }).eq("id", id);
    if (error) { toast("Couldn’t update. Try again."); btn.disabled = false; return; }
    toast("Listing updated"); await loadCars();
  }

  const delArmed = new Set();
  async function removeCar(id, btn) {
    if (!delArmed.has(id)) {
      delArmed.add(id); btn.textContent = "Tap again to remove";
      setTimeout(() => { delArmed.delete(id); if (btn.isConnected) btn.textContent = "Remove"; }, 4000);
      return;
    }
    btn.disabled = true;
    const c = cars.find((x) => x.id === id);
    const { error } = await sb.from("cars").delete().eq("id", id);
    if (error) { toast("Couldn’t remove. Try again."); btn.disabled = false; return; }
    if (c && c.photos && c.photos.length) await sb.storage.from(BUCKET).remove(c.photos).catch(() => {});
    toast("Listing removed"); await loadCars();
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
      if (state.tab === "saved") render();
      return;
    }
    const tab = t.closest("nav.tabs button"); if (tab) return go(tab.dataset.tab);
    const g = t.closest("[data-go]"); if (g) return go(g.dataset.go);
    if (t.closest("[data-reload]")) { state.loading = true; render(); return loadCars(); }
    const chip = t.closest("[data-body]"); if (chip) { state.body = chip.dataset.body; return render(); }
    const op = t.closest("[data-open]"); if (op) return openCar(op.dataset.open);
    if (t.id === "cancelEdit") { editingId = null; return go("mine"); }
    const ed = t.closest("[data-edit]"); if (ed) { editingId = ed.dataset.edit; state.tab = "sell"; render(); return window.scrollTo(0, 0); }
    const so = t.closest("[data-sold]"); if (so) return setStatus(so.dataset.sold, so);
    const de = t.closest("[data-del]"); if (de) return removeCar(de.dataset.del, de);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches && e.target.matches("[data-open]")) openCar(e.target.dataset.open);
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "sort") { state.sort = e.target.value; render(); }
    if (e.target.id === "photos") {
      const files = [...e.target.files]; const room = 6 - pending.length;
      files.slice(0, room).forEach((f) => pending.push({ file: f, preview: URL.createObjectURL(f) }));
      if (files.length > room) toast("Up to 6 photos per car");
      e.target.value = ""; drawThumbs();
    }
  });
  document.addEventListener("submit", (e) => { if (e.target.id === "sellForm") submitSell(e); });
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
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // ---------- start ----------
  render();
  if (sb) {
    sb.auth.getSession().then(({ data }) => { if (data && data.session) me = data.session.user; if (state.tab === "mine") render(); });
  }
  loadCars();
})();
