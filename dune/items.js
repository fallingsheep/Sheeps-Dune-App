// ==============================
// ITEMS TAB (Filters + Search + Sort + Compare)
// (No inline onclick; safe event listeners)
// - Hides zero/blank stats on cards
// - Compare: shows 0 when the other side has a numeric value; hides rows only if BOTH sides are blank/zero
// - Adds "Clear Compare" buttons (top and bottom)
// - Highlights cards of currently compared items (same color for A & B)
// ==============================

(function () {
  const LABEL_MAP = {
    // Common
    name: "Name",
    type: "Type",
    vol: "Volume",
    volume: "Volume",
    tier: "Tier",
    selltovendor: "Sell to Vendor",
    sell_to_vendor: "Sell to Vendor",
    weight: "Weight",
    // Weapons
    damagetype: "Damage Type",
    firemode: "Fire Mode",
    damagepershot: "Damage Per Shot",
    shielddamage: "Shield Damage",
    rateoffirerpm: "Rate of Fire",
    clipsize: "Clip Size",
    reloadseconds: "Reload Speed",
    effectiverangemeters: "Effective Range",
    accuracy: "Accuracy",
    stability: "Stability",
    powerconsumption: "Power Consumption",
    // Melee
    damageperhit: "Damage Per Hit",
    attackspeed: "Attack Speed",
    // Garments / Armour-ish
    armorvalue: "Armor Value",
    armourvalue: "Armor Value",
    firemitigation: "Fire Mitigation",
    radiationmitigation: "Radiation Mitigation",
    heatprotection: "Heat Protection",
    blademitigation: "Blade Mitigation",
    concussivemitigation: "Concussive Mitigation",
    heavydartmitigation: "Heavy Dart Mitigation",
    lightdartmitigation: "Light Dart Mitigation",
    energymitigation: "Energy Mitigation",
    dashstaminacost: "Dash Stamina Cost",
    climbingstaminacost: "Climbing Stamina Cost",
    // Utility misc
    hydrationcapture: "Hydration Capture",
    scannerange: "Scanner Range",
    wormthreat: "Worm Threat",
  };

  const EXCLUDE_KEYS = new Set([
    "name",
    "type",
    "image",
    "images",
    "id",
    "unique",
    "_cat",
  ]);

  const EXCLUDE_COMPARE_KEYS = new Set(["type"]);

  // Sort options -> item key + type
  const SORT_OPTIONS = [
    { key: "name", label: "Name (A→Z)", type: "string" },
    { key: "tier", label: "Tier", type: "number" },
    { key: "sellToVendor", label: "Sell to Vendor", type: "number" },
    { key: "damagePerHit", label: "Damage Per Hit", type: "number" },
    { key: "damagePerShot", label: "Damage Per Shot", type: "number" },
    { key: "rateOfFireRPM", label: "Rate of Fire", type: "number" },
    { key: "armorValue", label: "Armor Value", type: "number" },
  ];

  // --- State ---
  let ALL_ITEMS = [];
  let FILTER = localStorage.getItem("items_filter") || "all";
  let SEARCH = localStorage.getItem("items_search") || "";
  let SORT_KEY = localStorage.getItem("items_sort_key") || "name";
  let SORT_DIR = localStorage.getItem("items_sort_dir") || "asc"; // 'asc' | 'desc'
  let COMP_A = null;
  let COMP_B = null;

  // -- Utils --
  const debounce = (fn, ms = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function prettyLabel(key) {
    const k = String(key).toLowerCase().trim();
    if (LABEL_MAP[k]) return LABEL_MAP[k];
    return String(key)
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Cards: treat 0 as "not present" (hide it)
  function isPresent(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === "number") return !Number.isNaN(val) && val !== 0;
    if (typeof val === "string") return val.trim() !== "";
    return true;
  }

  // For compare logic: whether a side has a meaningful value (0 is not)
  function hasValueForCompare(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === "number") return !Number.isNaN(val) && val !== 0;
    if (typeof val === "string") return val.trim() !== "";
    return true;
  }

  function formatValue(key, val) {
    const lk = String(key).toLowerCase();
    if (typeof val === "number") {
      let s = val.toFixed(2);
      s = s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
      if (lk.includes("volume")) return `${s}v`;
      return s;
    }
    return String(val);
  }

  // Expose loader
  window.loadItems = function loadItems() {
    const list = document.getElementById("itemsList");
    if (!list) return; // not on this page

    Promise.all([
      fetch("Data/weapons.json").then((r) => r.json()).catch(() => []),
      fetch("Data/garments.json").then((r) => r.json()).catch(() => []),
      fetch("Data/utility.json").then((r) => r.json()).catch(() => []),
    ]).then(([weapons, garments, utility]) => {
      function norm(rec) {
        const out = { ...rec };
        if (!out.name) out.name = "(Unnamed)";
        if (!out.type) out.type = "misc";
        return out;
      }
      ALL_ITEMS = []
        .concat((weapons || []).map(norm))
        .concat((garments || []).map(norm))
        .concat((utility || []).map(norm));

      renderFilters(ALL_ITEMS);
      renderList(ALL_ITEMS);
      renderCompare();
    });
  };

  // === Filters / Search / Sort UI ===
  function renderFilters(items) {
    const wrap = document.getElementById("itemsFilters");
    if (!wrap) return;

    const types = Array.from(
      new Set(items.map((i) => (i.type || "misc").toLowerCase()))
    ).sort();

    const filterBtns =
      [`<button class="filter-btn ${FILTER === "all" ? "active" : ""}" data-type="all">All</button>`]
        .concat(
          types.map((t) => {
            const active = FILTER === t ? "active" : "";
            const label = t.replace(/^\w/, (m) => m.toUpperCase());
            return `<button class="filter-btn ${active}" data-type="${t}">${label}</button>`;
          })
        )
        .join("");

    const sortOptions = SORT_OPTIONS.map((o) => {
      const sel = o.key === SORT_KEY ? "selected" : "";
      return `<option value="${o.key}" ${sel}>${o.label}</option>`;
    }).join("");

    const dirIcon = SORT_DIR === "asc" ? "↑" : "↓";

    wrap.innerHTML = `
      <div class="toolbar" style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        <div class="filters" style="display:flex; gap:6px; flex-wrap:wrap;">${filterBtns}</div>
        <div style="flex:1 1 220px;"></div>
        <input id="itemsSearch" class="search-input" type="search" placeholder="Search items by name…" value="${escapeHtml(SEARCH)}" style="min-width:220px; padding:6px 8px;">
        <label for="itemsSort" class="muted" style="margin-left:8px;">Sort:</label>
        <select id="itemsSort" style="padding:6px 8px;">${sortOptions}</select>
        <button id="itemsSortDir" class="small" title="Toggle sort direction">${dirIcon}</button>
      </div>
    `;

    // Wire filter buttons (event delegation)
    wrap.querySelector(".filters").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-type]");
      if (!btn) return;
      FILTER = btn.getAttribute("data-type");
      localStorage.setItem("items_filter", FILTER);
      renderFilters(ALL_ITEMS); // refresh active styles
      renderList(ALL_ITEMS);
    });

    // Search
    const onSearch = debounce((val) => {
      SEARCH = String(val || "");
      localStorage.setItem("items_search", SEARCH);
      renderList(ALL_ITEMS);
    }, 250);
    wrap.querySelector("#itemsSearch").addEventListener("input", (e) =>
      onSearch(e.target.value)
    );

    // Sort key
    wrap.querySelector("#itemsSort").addEventListener("change", (e) => {
      SORT_KEY = e.target.value;
      localStorage.setItem("items_sort_key", SORT_KEY);
      renderList(ALL_ITEMS);
    });

    // Sort dir
    wrap.querySelector("#itemsSortDir").addEventListener("click", () => {
      SORT_DIR = SORT_DIR === "asc" ? "desc" : "asc";
      localStorage.setItem("items_sort_dir", SORT_DIR);
      renderFilters(ALL_ITEMS); // to update arrow
      renderList(ALL_ITEMS);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // === List Rendering ===
  function cardStatsHTML(item) {
    const keys = Object.keys(item);
    const mainKeys = [
      "vol",
      "tier",
      "sellToVendor",
      "damageType",
      "fireMode",
      "damagePerShot",
      "damagePerHit",
      "rateOfFireRPM",
      "clipSize",
      "reloadSeconds",
      "effectiveRangeMeters",
      "armorValue",
    ];
    const order = [];
    for (const k of mainKeys) if (k in item) order.push(k);
    for (const k of keys) {
      const kl = k.toLowerCase();
      if (EXCLUDE_KEYS.has(kl)) continue;
      if (order.includes(k)) continue;
      if (!isPresent(item[k])) continue; // hide 0/blank
      order.push(k);
      if (order.length > 9) break; // keep cards compact
    }

    const lines = order
      .map((k) => {
        const v = item[k];
        if (!isPresent(v)) return "";
        return `<span class="buildFont">${prettyLabel(k)}:</span> <span class="value">${formatValue(k, v)}</span><br>`;
      })
      .join("");

    return lines;
  }

  function applyFilterSearchSort(items) {
    // type filter
    let out =
      FILTER === "all"
        ? items.slice()
        : items.filter((i) => (i.type || "").toLowerCase() === FILTER);

    // search by name
    const q = SEARCH.trim().toLowerCase();
    if (q) out = out.filter((i) => String(i.name || "").toLowerCase().includes(q));

    // sort
    const opt = SORT_OPTIONS.find((o) => o.key === SORT_KEY) || SORT_OPTIONS[0];
    const dirMul = SORT_DIR === "desc" ? -1 : 1;

    out.sort((a, b) => {
      const va = a[opt.key];
      const vb = b[opt.key];

      if (opt.type === "number") {
        const na = typeof va === "number" ? va : 0;
        const nb = typeof vb === "number" ? vb : 0;
        if (na !== nb) return (na - nb) * dirMul;
        return String(a.name || "").localeCompare(String(b.name || "")) * dirMul;
      } else {
        const sa = String(va || "").toLowerCase();
        const sb = String(vb || "").toLowerCase();
        if (sa !== sb) return sa.localeCompare(sb) * dirMul;
        return String(a.name || "").localeCompare(String(b.name || "")) * dirMul;
      }
    });

    return out;
  }

  function renderList(items) {
    const list = document.getElementById("itemsList");
    if (!list) return;
    list.innerHTML = "";

    const subset = applyFilterSearchSort(items);

    subset.forEach((it) => {
      const div = document.createElement("div");
      div.className = "building";
      div.setAttribute("data-type", (it.type || "misc").toLowerCase());

      const slug = slugify(it.name);
      const img = `./images/items/${slug}.png`;

      const isCompared =
        (COMP_A && COMP_A.name === it.name && COMP_A.type === it.type) ||
        (COMP_B && COMP_B.name === it.name && COMP_B.type === it.type);

      // Same highlight color for A & B
      const highlightStyle = isCompared ? "box-shadow: 0 0 0 2px rgba(66,133,244,0.7) inset;" : "";

      const statsHTML = cardStatsHTML(it);

      // Build inner static HTML (no inline handlers)
      div.innerHTML = `
        <div style="${highlightStyle} padding:6px; border-radius:8px;">
          <div class="buildTitle" style="margin-bottom:5px;">${escapeHtml(it.name)}</div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div>
              <span class="buildFont">
                ${statsHTML}
              </span>
              <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                <button class="small btn-compare-a ${isCompared && COMP_A && COMP_A.name === it.name ? "active" : ""}" type="button">Compare A</button>
                <button class="small btn-compare-b ${isCompared && COMP_B && COMP_B.name === it.name ? "active" : ""}" type="button">Compare B</button>
              </div>
            </div>
            <img src="${img}" alt="${escapeHtml(it.name)}" class="building-image" onerror="this.style.display='none';" />
          </div>
        </div>
      `;

      // Attach safe listeners with captured values
      const btnA = div.querySelector(".btn-compare-a");
      const btnB = div.querySelector(".btn-compare-b");
      btnA.addEventListener("click", () => setItemCompare("A", it.name, it.type || ""));
      btnB.addEventListener("click", () => setItemCompare("B", it.name, it.type || ""));

      list.appendChild(div);
    });
  }

  // Now setItemCompare accepts plain strings (no URI encoding needed)
  window.setItemCompare = function setItemCompare(slot, name, type) {
    const found = ALL_ITEMS.find((i) => i.name === name && (i.type || "") === type);
    if (!found) return;

    if (slot === "A") {
      COMP_A = found;
      localStorage.setItem("itemCompareA", JSON.stringify({ name, type }));
    } else {
      COMP_B = found;
      localStorage.setItem("itemCompareB", JSON.stringify({ name, type }));
    }
    renderList(ALL_ITEMS); // refresh highlight/active state
    renderCompare();
  };

  window.clearItemCompare = function clearItemCompare() {
    COMP_A = null;
    COMP_B = null;
    localStorage.removeItem("itemCompareA");
    localStorage.removeItem("itemCompareB");
    renderList(ALL_ITEMS);
    renderCompare();
  };

  function canonicalKey(key) {
    const raw = String(key);
    const mapped = LABEL_MAP[raw.toLowerCase()] || raw;
    return mapped.trim().toLowerCase();
  }

  function collectStats(item) {
    // Do not filter here; we want zeros available for compare.
    const out = Object.create(null);
    for (const [k, v] of Object.entries(item)) {
      const kl = k.toLowerCase();
      if (EXCLUDE_KEYS.has(kl)) continue;
      const canon = canonicalKey(k);
      if (EXCLUDE_COMPARE_KEYS.has(canon)) continue;
      out[canon] = v;
    }
    return out;
  }

  function renderCompare() {
    const wrap = document.getElementById("itemsCompareWrapper");
    const table = document.getElementById("itemsCompare");
    if (!wrap || !table) return;

    // Restore from localStorage if empty
    if (!COMP_A) {
      try {
        const a = JSON.parse(localStorage.getItem("itemCompareA") || "null");
        if (a) COMP_A = ALL_ITEMS.find((i) => i.name === a.name && (i.type || "") === a.type) || null;
      } catch {}
    }
    if (!COMP_B) {
      try {
        const b = JSON.parse(localStorage.getItem("itemCompareB") || "null");
        if (b) COMP_B = ALL_ITEMS.find((i) => i.name === b.name && (i.type || "") === b.type) || null;
      } catch {}
    }

    if (!COMP_A && !COMP_B) {
      wrap.classList.add("hidden");
      table.innerHTML = "";
      return;
    }

    wrap.classList.remove("hidden");

    const A = COMP_A ? collectStats(COMP_A) : null;
    const B = COMP_B ? collectStats(COMP_B) : null;

    // Union of keys
    const keys = new Set();
    if (A) Object.keys(A).forEach((k) => keys.add(k));
    if (B) Object.keys(B).forEach((k) => keys.add(k));

    // TOP Clear button
    const topBar = `
      <div class="compare-toolbar" style="display:flex; justify-content:flex-end; margin:6px 0;">
        <button id="btnClearCompareTop" class="small">Clear Compare</button>
      </div>
    `;

    // Header row with names
    const head = `
      <div class="compare-row compare-head" style="display:grid;grid-template-columns:minmax(140px,1fr) 1fr 1fr;gap:8px;font-weight:bold;border-bottom:1px solid var(--border, #ccc);padding:8px 0;">
        <div>Stat</div>
        <div>${escapeHtml(COMP_A ? COMP_A.name : "-")} ${COMP_A ? `<span class="muted">(${escapeHtml(COMP_A.type || "item")})</span>` : ""}</div>
        <div>${escapeHtml(COMP_B ? COMP_B.name : "-")} ${COMP_B ? `<span class="muted">(${escapeHtml(COMP_B.type || "item")})</span>` : ""}</div>
      </div>
    `;

    const rows = [];

    for (const k of Array.from(keys).sort()) {
      const label = prettyLabel(k);
      const va = A ? A[k] : undefined;
      const vb = B ? B[k] : undefined;

      const aHas = hasValueForCompare(va);
      const bHas = hasValueForCompare(vb);
      const aIsNum = typeof va === "number";
      const bIsNum = typeof vb === "number";

      // Show row if either side has a non-zero/non-blank value,
      // OR exactly one side is a numeric zero (missing) while the other side has a value -> show 0.
      const oneSideNumericMissing = (aIsNum && !aHas) !== (bIsNum && !bHas); // XOR
      const showRow = (aHas || bHas) || oneSideNumericMissing;
      if (!showRow) continue; // both sides "" or 0 -> skip

      // Determine numeric values for highlighting (treat missing numeric as 0 for diff)
      const na = aIsNum ? va : (bIsNum && bHas ? 0 : null);
      const nb = bIsNum ? vb : (aIsNum && aHas ? 0 : null);

      // Cell rendering with zero-fallback
      function cellHTML(val, otherVal, key) {
        if (typeof val === "number") {
          return `<span>${formatValue(key, val)}</span>`;
        }
        // If the other side is a numeric value (non-zero), show 0 here
        if (typeof otherVal === "number" && hasValueForCompare(otherVal)) {
          return `<span>${formatValue(key, 0)}</span>`;
        }
        // Strings: show if present
        if (typeof val === "string" && val.trim() !== "") {
          return `<span>${escapeHtml(val)}</span>`;
        }
        return ""; // otherwise blank
      }

      let aHTML = cellHTML(va, vb, k);
      let bHTML = cellHTML(vb, va, k);

      // numeric diff highlight
      if (na !== null && nb !== null) {
        if (na > nb) aHTML = `<span class="better">${formatValue(k, na)}</span>`;
        if (nb > na) bHTML = `<span class="better">${formatValue(k, nb)}</span>`;
      }

      rows.push(`
        <div class="compare-row" style="display:grid;grid-template-columns:minmax(140px,1fr) 1fr 1fr;gap:8px;padding:6px 0;">
          <div>${label}</div>
          <div>${aHTML}</div>
          <div>${bHTML}</div>
        </div>
      `);
    }

    // BOTTOM Clear button
    const bottomBar = `
      <div class="compare-toolbar" style="display:flex; justify-content:flex-end; margin:6px 0;">
        <button id="btnClearCompareBottom" class="small">Clear Compare</button>
      </div>
    `;

    table.innerHTML = topBar + head + rows.join("") + bottomBar;

    // Wire both Clear Compare buttons
    const btnTop = document.getElementById("btnClearCompareTop");
    const btnBottom = document.getElementById("btnClearCompareBottom");
    if (btnTop) btnTop.addEventListener("click", clearItemCompare);
    if (btnBottom) btnBottom.addEventListener("click", clearItemCompare);
  }
})();
