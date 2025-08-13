///////////////////
// VEHICLE LOGIC (Optimised + Set Compare)
// - faster rendering
// - no duplicate listeners/options
// - stats layout under image/name
// - Save Set A / Set B and side-by-side comparison (numeric sums, text merged)
// - Compare excludes Description, Crafted At (MadeAt), Cat/Category/VehicleType/Type
// - Canonicalises keys so Armour/Armor never duplicates
///////////////////
const landsraadBonusTopVeh = document.getElementById("landsraadBonusTopVeh");
const landsraadBonusBottomVeh = document.getElementById(
  "landsraadBonusBottomVeh"
);

landsraadBonusTopVeh.checked =
  localStorage.getItem("landsraadBonusTop") === "true";
landsraadBonusBottomVeh.checked =
  localStorage.getItem("landsraadBonusBottom") === "true";

landsraadBonusTopVeh.addEventListener("change", () =>
  synclandsraadToggles(landsraadBonusTopVeh)
);
landsraadBonusBottomVeh.addEventListener("change", () =>
  synclandsraadToggles(landsraadBonusBottomVeh)
);

// Sync both landsraad checkboxes and recalc when either changes
const synclandsraadToggles = (source) => {
  const value = source.checked;
  landsraadBonusTopVeh.checked = value;
  landsraadBonusBottomVeh.checked = value;
  localStorage.setItem("landsraad_veh", value);
  loadVehicles();
};

// ===== Helpers (created once) =====
const LABEL_MAP = {
  description: "Description",
  madeat: "MadeAt",
  volume: "Volume",
  durability: "Durability",
  armour: "Armor",
  armor: "Armor",
  powerconsumption: "Power Consumption",
  glidespeed: "Glide Speed",
  speed: "Speed",
  turnrating: "Turn Rating",
  agility: "Agility",
  acceleration: "Acceleration",
  griprating: "Grip Rating",
  vibrationlevel: "Vibration Level",
  thrustrating: "Thrust Rating",
  extraheat: "Extra Heat",
  temperaturerating: "Temperature Rating",
  fuelefficiency: "Fuel Efficiency",
  fuelcapacity: "Fuel Capacity",
  seats: "Seats",
  utilityslots: "Utility Slots",
  maxvolume: "Max Volume",
  itemslots: "Item Slots",
  heatincrease: "Heat Increase",
  heatincreasespeed: "Heat Increase Speed",
  ammotype: "Ammo Type",
  damage: "Damage",
  aoeradius: "AoE Radius",
  rateoffire: "Rate of Fire",
};

// fields never shown as “stats” (per part display)
const EXCLUDE_KEYS = new Set([
  "id",
  "name",
  "type",
  "vehicletype",
  "unique",
  "amount",
  "components",
  "image",
  "images",
  "skins",
  "_cat",
]);

// === NEW: fields to EXCLUDE from the COMPARE panel specifically (canonical keys) ===
const EXCLUDE_COMPARE_CANON = new Set([
  "description",
  "madeat", // (displayed as "Crafted At" but compare hides it)
  "crafted at", // safety if something already saved that way
  "cat",
  "category",
  "vehicletype",
  "type",
]);

// stats ordering priority (for part cards + compare)
const ORDERED_KEYS = [
  "Description",
  "MadeAt",
  "Volume",
  "Durability",
  "Armour",
];
const ORDERED_KEYS_LC = ORDERED_KEYS.map((k) => k.toLowerCase());

function prettyLabel(key) {
  const k = String(key).toLowerCase();
  if (LABEL_MAP[k]) {
    if (LABEL_MAP[k].toLowerCase() === "madeat") return "Crafted At";
    return LABEL_MAP[k].replace(/\bAdvanced\b/gi, "Adv.");
  }
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\bMadeat\b/gi, "Crafted At");
}

// Canonicalise a raw key name into a consistent bucket id,
// so Armour/Armor both map to 'armor', etc.
function canonicalKey(key) {
  const raw = String(key);
  const mapped = LABEL_MAP[raw.toLowerCase()] || raw; // e.g. armour -> Armor
  return mapped.trim().toLowerCase(); // 'Armor' -> 'armor'
}

function isPresent(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const t = val.trim();
    return t !== "" && t !== "0";
  }
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

function formatValue(key, val) {
  const lk = String(key).toLowerCase();
  let output = Array.isArray(val) ? val.join(", ") : String(val);

  // shorten "Advanced" in the value
  output = output.replace(/\bAdvanced\b/gi, "Adv.");

  // helper for custom rounding
  function round2Custom(num) {
    if (!Number.isFinite(num)) return num;
    const str = num.toString();
    const match = /^(-?\d+)\.(\d)(\d)(\d?)/.exec(str);
    let rounded;
    if (match) {
      const thirdDigit = parseInt(match[4] || "0", 10);
      if (thirdDigit >= 6) {
        rounded = (Math.round(num * 1000) / 1000).toFixed(3).slice(0, -1); // drop the 3rd decimal
      } else {
        rounded = num.toFixed(2);
      }
    } else {
      rounded = num.toFixed(2);
    }
    // Strip trailing .00 or .0
    return rounded.replace(/\.00$|\.0$/, "");
  }

  if (lk === "volume" || lk === "max volume" || lk === "maxvolume") {
    const n = Number(output);
    return Number.isFinite(n) ? `${round2Custom(n)}v` : output;
  }

  if (!isNaN(output) && output.trim() !== "") {
    const n = Number(output);
    return round2Custom(n);
  }

  return output;
}

function formatPartName(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Normalise a part name to an image slug
function partNameToImgSlug(name) {
  return (
    name
      .toLowerCase()
      .replace(/ornithopter/g, "")
      // Buggy
      .replace(/rear/g, "")
      .replace(/rattler boost module /gi, "buggy_booster")
      .replace(/focused buggy cutteray/gi, "buggy_cutteray")
      .replace(/bluddshot buggy engine/gi, "buggy_engine")
      .replace(/bigger buggy boot/gi, "buggy_storage")
      // Sandbike
      .replace(/mohandis sandbike engine/gi, "sandbike_engine")
      .replace(/night rider sandbike boost/gi, "sandbike_booster")
      // Crawler
      .replace(/walker sandcrawler engine/gi, "sandcrawler_engine")
      .replace(/dampened sandcrawler treads/gi, "sandcrawler_tread")
      .replace(/upgraded regis spice container/gi, "sandcrawler_centrifuge")
      // Carrier
      .replace(/steady carrier boost module/gi, "carrier_thruster")
      // Scout
      .replace(/stormrider boost module /gi, "scout_thruster")
      .replace(/albatross wing module/gi, "scout_wing")
      .replace(/scan module/gi, "scanner")
      // Assault
      .replace(/steady assault boost module/gi, "assault_thruster")
      .replace(/launcher /gi, "")
      .replace(/mk\d+/i, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

// Debounce utility for inputs
function debounce(fn, wait = 100) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// persist stats visibility across renders
let statsVisible = false;

// ===== NEW: State for compare =====
let currentType = "";
let currentAmount = 1;
let currentPartMap = Object.create(null);
let GLOBAL_PART_INDEX = Object.create(null); // id -> part name (lowercased)

// === NEW: utility to canonicalise stats objects (migrates old saved sets) ===
function canonicaliseStatsObject(statsObj) {
  if (!statsObj || typeof statsObj !== "object") return {};
  const out = Object.create(null);
  for (const [k, v] of Object.entries(statsObj)) {
    const canon = canonicalKey(k);
    if (EXCLUDE_COMPARE_CANON.has(canon)) continue; // drop excluded fields
    // merge (handles armour->armor collisions)
    if (out[canon] === undefined) {
      out[canon] = v;
    } else {
      // If both numeric, sum; else concatenate unique textual parts.
      if (typeof out[canon] === "number" && typeof v === "number") {
        out[canon] += v;
      } else {
        const s = new Set(
          String(out[canon])
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        );
        for (const piece of String(v).split(",")) {
          const t = piece.trim();
          if (t) s.add(t);
        }
        out[canon] = Array.from(s).join(", ");
      }
    }
  }
  return out;
}

// Aggregate stats across all selected parts in a set.
// - numeric values are summed
// - strings are collected (unique) and later joined
// - compare-excluded keys are skipped here too
function aggregateSetStats(partIds, partMap, opts = {}) {
  const allowMiningYield = !!opts.allowMiningYield;
  const buckets = new Map(); // key: canonicalKey -> {label, num: number, texts: Set<string>}
  for (const id of partIds) {
    const p = partMap[id];
    if (!p) continue;
    for (const rawKey of Object.keys(p)) {
      const kl = rawKey.toLowerCase();
      if (EXCLUDE_KEYS.has(kl)) continue;
      const canon = canonicalKey(rawKey);
      if (canon === "miningyield" && !allowMiningYield) continue; // <-- only when buggy + cutteray
      if (EXCLUDE_COMPARE_CANON.has(canon)) continue; // skip compare-excluded keys

      const v = p[rawKey];
      if (!isPresent(v)) continue;

      const label = prettyLabel(rawKey);
      if (!buckets.has(canon)) {
        buckets.set(canon, {
          label,
          num: 0,
          texts: new Set(),
          sawNumber: false,
          sawText: false,
        });
      }
      const bucket = buckets.get(canon);
      if (typeof v === "number") {
        bucket.num += v;
        bucket.sawNumber = true;
      } else if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed) {
          bucket.texts.add(trimmed);
          bucket.sawText = true;
        }
      }
      if (Array.isArray(v)) {
        for (const item of v) {
          const s = String(item).trim();
          if (s) {
            bucket.texts.add(s);
            bucket.sawText = true;
          }
        }
      }
    }
  }
  // build plain object {canonKey: displayValue}
  const out = Object.create(null);
  for (const [canon, bucket] of buckets.entries()) {
    if (bucket.sawNumber && !bucket.sawText) {
      out[canon] = bucket.num;
    } else if (!bucket.sawNumber && bucket.sawText) {
      out[canon] = Array.from(bucket.texts).sort().join(", ");
    } else {
      const textPart = Array.from(bucket.texts).sort().join(", ");
      out[canon] = textPart ? `${bucket.num} (${textPart})` : bucket.num;
    }
  }
  return out;
}

function displayValueFor(canonKey, value) {
  const label = prettyLabel(canonKey);
  return formatValue(label, value);
}

// ===== NEW: Compare rendering =====
function renderComparePanel() {
  const compareEl = document.getElementById("compare");
  const wrap = document.getElementById("compareWrapper");
  const controls = document.getElementById("compareControls");

  // Load sets
  const rawA = JSON.parse(localStorage.getItem("vehSetA") || "null");
  const rawB = JSON.parse(localStorage.getItem("vehSetB") || "null");

  controls.classList.toggle("hidden", !currentType);

  if (!rawA && !rawB) {
    wrap.classList.add("hidden");
    compareEl.innerHTML = "";
    return;
  }

  // === Canonicalise + exclude on read (handles old saves with 'armour' etc.) ===
  const setA = rawA
    ? {
        ...rawA,
        stats: canonicaliseStatsObject(rawA.stats || {}),
      }
    : null;
  const setB = rawB
    ? {
        ...rawB,
        stats: canonicaliseStatsObject(rawB.stats || {}),
      }
    : null;

  // Remove MiningYield unless (type=buggy && contains a cutteray id)
  if (setA) {
    const isBuggyA = /buggy/i.test(setA.type || "");
    const hasCutterayA = (setA.ids || []).some((id) =>
      (GLOBAL_PART_INDEX[id] || "").includes("cutteray")
    );
    if (!(isBuggyA && hasCutterayA)) delete setA.stats?.miningyield;
  }
  if (setB) {
    const isBuggyB = /buggy/i.test(setB.type || "");
    const hasCutterayB = (setB.ids || []).some((id) =>
      (GLOBAL_PART_INDEX[id] || "").includes("cutteray")
    );
    if (!(isBuggyB && hasCutterayB)) delete setB.stats?.miningyield;
  }

  // Build union of keys for side-by-side (already canonicalised)
  const union = new Set();
  if (setA?.stats) Object.keys(setA.stats).forEach((k) => union.add(k));
  if (setB?.stats) Object.keys(setB.stats).forEach((k) => union.add(k));

  // Remove any excluded keys that slipped in
  for (const k of Array.from(union)) {
    if (EXCLUDE_COMPARE_CANON.has(k)) union.delete(k);
  }

  const rows = [];
  // Header with meta
  const metaRow = `
    <div class="compare-row compare-head" style="display:grid;grid-template-columns:minmax(140px,1fr) 1fr 1fr;gap:8px;font-weight:bold;border-bottom:1px solid var(--border, #ccc);padding:8px 0;">
      <div>Stat</div>
      <div>Set A ${
        setA
          ? `(${setA.type} • ${setA.amount}x • ${setA.ids?.length || 0} parts)`
          : ""
      }</div>
      <div>Set B ${
        setB
          ? `(${setB.type} • ${setB.amount}x • ${setB.ids?.length || 0} parts)`
          : ""
      }</div>
    </div>
  `;
  rows.push(metaRow);

  // Show ordered keys first (after canonicalising) then remaining (alphabetical)
  const orderedCanon = ORDERED_KEYS.map((k) => canonicalKey(k));
  const remainingCanon = Array.from(union)
    .filter((k) => !orderedCanon.includes(k))
    .sort();
  const sequence = [
    ...orderedCanon.filter((k) => union.has(k)),
    ...remainingCanon,
  ];

  for (const canon of sequence) {
    const label = prettyLabel(canon);
    const aVal = setA?.stats?.[canon];
    const bVal = setB?.stats?.[canon];
    const aDisp = isPresent(aVal) ? displayValueFor(canon, aVal) : "N/A";
    const bDisp = isPresent(bVal) ? displayValueFor(canon, bVal) : "N/A";

    rows.push(`
      <div class="compare-row" style="display:grid;grid-template-columns:minmax(140px,1fr) 1fr 1fr;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border, #ddd);">
        <div><span class="statFont">${label}</span></div>
        <div>${aDisp}</div>
        <div>${bDisp}</div>
      </div>
    `);
  }

  // If union is empty after exclusions, hide compare (no comparable stats)
  if (sequence.length === 0) {
    wrap.classList.add("hidden");
    compareEl.innerHTML = "";
  } else {
    wrap.classList.remove("hidden");
    compareEl.innerHTML = rows.join("");
  }
}

function getSelectedIdsFromForm() {
  return Array.from(
    document.querySelectorAll("#optForm input:checked"),
    (e) => e.value
  );
}

function saveSet(slot /* 'A' | 'B' */) {
  const ids = getSelectedIdsFromForm();
  const key = slot === "A" ? "vehSetA" : "vehSetB";
  if (!ids.length) {
    localStorage.removeItem(key);
    renderComparePanel();
    return;
  }
  const allowMiningYield =
    currentType.toLowerCase().includes("buggy") &&
    ids.some((id) =>
      (currentPartMap[id]?.name || "").toLowerCase().includes("cutteray")
    );
  const stats = aggregateSetStats(ids, currentPartMap, { allowMiningYield });
  const payload = {
    type: currentType,
    amount: currentAmount,
    ids,
    stats, // will be canonical already from aggregate
    savedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(payload));
  renderComparePanel();
}

function clearSets() {
  localStorage.removeItem("vehSetA");
  localStorage.removeItem("vehSetB");
  renderComparePanel();
}

function applySet(slot /* 'A' | 'B' */) {
  const data = JSON.parse(
    localStorage.getItem(slot === "A" ? "vehSetA" : "vehSetB") || "null"
  );
  if (!data) return;
  const select = document.getElementById("vehicleSelect");
  if (select && data.type && select.value !== data.type) {
    select.value = data.type;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setTimeout(() => {
      const amountInput = document.getElementById("buildAmount");
      const amountInputBottom = document.getElementById("buildAmount2");
      if (amountInput) amountInput.value = data.amount || 1;
      if (amountInputBottom) amountInputBottom.value = data.amount || 1;
      for (const cb of document.querySelectorAll(
        "#optForm input[type=checkbox]"
      )) {
        cb.checked = data.ids.includes(cb.value);
      }
      document
        .getElementById("optForm")
        ?.dispatchEvent(new Event("change", { bubbles: true }));
    }, 30);
  } else {
    for (const cb of document.querySelectorAll(
      "#optForm input[type=checkbox]"
    )) {
      cb.checked = data.ids.includes(cb.value);
    }
    document
      .getElementById("optForm")
      ?.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// ===== main loader =====
function loadVehicles() {
  fetch("Data/vehicles.json")
    .then((res) => res.json())
    .then((data) => {
      // Build a global index of all parts by id -> name (lowercase) for cross-type checks
      GLOBAL_PART_INDEX = Object.create(null);
      for (const row of data) {
        if (row?.id && row?.name)
          GLOBAL_PART_INDEX[row.id] = String(row.name).toLowerCase();
      }
      // ===== Cache DOM lookups once =====
      const select = document.getElementById("vehicleSelect");
      const amountInput = document.getElementById("buildAmount");
      const amountInputBottom = document.getElementById("buildAmount2");
      const partsList = document.getElementById("partsList");
      const costDiv = document.getElementById("totalCost");
      const imageDiv = document.getElementById("vehicleImage");
      const imageHolder = document.getElementById("imageholder");
      const amount2Label = document.querySelector('label[for="buildAmount2"]');
      const conflictWarning = document.getElementById("conflictWarning");
      const compareControls = document.getElementById("compareControls");

      // ===== Build category for each row once =====
      function toCategory(typeStr) {
        const t = typeStr.toLowerCase();
        if (t.includes("sandbike")) return "Sandbike";
        if (t.includes("buggy")) return "Buggy";
        if (t.includes("sandcrawler")) return "Sandcrawler";
        if (t.includes("carrier")) return "Carrier";
        if (t.includes("scout") || t.includes("light")) return "Scout";
        if (t.includes("assault") || t.includes("medium")) return "Assault";
        return null;
      }

      const withCategory = data
        .map((v) => ({ ...v, _cat: toCategory(v.type.split(",")[0].trim()) }))
        .filter((v) => v._cat);

      const categories = Array.from(new Set(withCategory.map((v) => v._cat)));

      if (!select.dataset.bound) {
        const syncTop = debounce(() => {
          amountInputBottom.value = amountInput.value;
          if (select.value) render();
        }, 120);
        const syncBottom = debounce(() => {
          amountInput.value = amountInputBottom.value;
          if (select.value) render();
        }, 120);

        amountInput.addEventListener("input", syncTop);
        amountInputBottom.addEventListener("input", syncBottom);

        select.addEventListener("change", () => {
          if (!select.value) {
            imageHolder.classList.add("hidden");
            amountInputBottom.classList.add("hidden");
            amount2Label.classList.add("hidden");
            costDiv.classList.add("hidden");
            compareControls.classList.add("hidden");
            document.getElementById("compareWrapper").classList.add("hidden");
          }
        });

        // One delegated listener covers top/bottom buttons and future renders
        document.addEventListener("click", (e) => {
          const t = e.target;
          if (!(t instanceof HTMLElement)) return;
          if (t.matches("#saveSetA, #saveSetA_btm")) return saveSet("A");
          if (t.matches("#saveSetB, #saveSetB_btm")) return saveSet("B");
          if (t.matches("#applySetA, #applySetA_btm")) return applySet("A");
          if (t.matches("#applySetB, #applySetB_btm")) return applySet("B");
          if (t.matches("#clearSets, #clearSets_btm")) return clearSets();
        });

        select.dataset.bound = "1";
      }

      select.innerHTML = "";
      select.appendChild(new Option("-- Choose Vehicle --", ""));
      for (const cat of categories) {
        select.appendChild(new Option(cat, cat));
      }

      select.value = localStorage.getItem("vehType") || "";
      amountInput.value = localStorage.getItem("vehAmount") || "1";

      const render = () => {
        const qty = parseInt(amountInput.value, 10) || 1;
        const type = select.value;
        if (!type) return;

        // persist selection
        localStorage.setItem("vehType", type);
        localStorage.setItem("vehAmount", String(qty));
        currentType = type;
        currentAmount = qty;

        // filter rows for this category
        const match = withCategory.filter((v) => v._cat === type);
        if (!match.length) return;

        // build partMap for this render
        currentPartMap = Object.create(null);

        imageHolder.classList.remove("hidden");
        amountInputBottom.classList.remove("hidden");
        amount2Label.classList.remove("hidden");
        costDiv.classList.remove("hidden");
        compareControls.classList.remove("hidden");

        // Vehicle skin images
        const name = type.toLowerCase();
        imageDiv.innerHTML = "<strong>Skins</strong><br>";
        const imageNames = [
          `${name}.png`,
          `${name}_atr.png`,
          `${name}_harko.png`,
        ].sort((a, b) => (!a.includes("_") ? -1 : !b.includes("_") ? 1 : 0));
        for (let i = 0; i < imageNames.length; i++) {
          const img = new Image();
          img.src = `./images/vehicles/${name}/${imageNames[i]}`;
          img.className = "vehicle-img";
          img.width = 128;
          img.style.display = "none";
          if (i === 0) {
            img.style.marginTop = "30px";
            img.style.marginBottom = "30px";
          }
          imageDiv.appendChild(img);
          img.onload = () => (img.style.display = "inline-block");
        }

        // sort parts
        const allParts = match.slice().sort((a, b) => {
          if (!!a.unique !== !!b.unique) return a.unique ? 1 : -1;
          return a.name.localeCompare(b.name);
        });

        // --- Build available Mk tiers for this vehicle ---
        const mkSet = new Set();
        for (const p of allParts) {
          const m = /mk\s*(\d+)/i.exec(p.name);
          if (m) mkSet.add(`Mk${m[1]}`);
        }
        const mkOptions = [
          "All",
          ...Array.from(mkSet).sort(
            (a, b) => Number(a.slice(2)) - Number(b.slice(2))
          ),
        ];
        const savedMk = localStorage.getItem("vehMkFilter") || "All";

        // Build part map
        for (const p of allParts) currentPartMap[p.id] = p;

        // Build part list
        const stored = new Set(
          JSON.parse(localStorage.getItem("vehOpts") || "[]")
        );

        // Only show MiningYield for Buggies with a Cutteray selected
        const showMiningYield =
          type.toLowerCase().includes("buggy") &&
          Array.from(stored).some((id) =>
            (currentPartMap[id]?.name || "").toLowerCase().includes("cutteray")
          );

        document.getElementById("partsList").innerHTML = `
          <form id="optForm">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <strong>Parts List</strong>
              <button type="button" id="toggleStatsBtn">${
                statsVisible ? "Hide" : "Show"
              } Stats</button>
              <label for="mkFilter"><strong>Tier:<strong></label>
              <select id="mkFilter">
                ${mkOptions
                  .map(
                    (opt) =>
                      `<option value="${opt}" ${
                        opt === savedMk ? "selected" : ""
                      }>${opt}</option>`
                  )
                  .join("")}
              </select>
            </div>
            <br />            
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <!-- Set compare controls next to Show Stats -->
               <button type="button" id="saveSetA">Save Set A</button>
               <button type="button" id="saveSetB">Save Set B</button>
               <button type="button" id="applySetA">Apply Set A</button>
               <button type="button" id="applySetB">Apply Set B</button>
               <button type="button" id="clearSets">Clear Sets</button>
            </div>
            <br />
            <ul class="parts-list">
              ${allParts
                .filter((v) => {
                  if (savedMk === "All") return true;
                  const m = /mk\s*(\d+)/i.exec(v.name);
                  return m && `Mk${m[1]}` === savedMk;
                })
                .map((v) => {
                  const checked = stored.has(v.id);
                  const imgName = partNameToImgSlug(v.name);

                  // Build stats lines
                  const lines = [];

                  // ordered keys first
                  for (const key of ORDERED_KEYS) {
                    const raw = v[key] ?? v[key?.toLowerCase?.()];
                    if (isPresent(raw)) {
                      const isBig = key === "Description" || key === "MadeAt";
                      lines.push(
                        `<div><span class="statFont">${prettyLabel(
                          key
                        )}:</span> <span class="value">${formatValue(
                          key,
                          raw
                        )}</span>${isBig ? "<br/><br/>" : ""}</div>`
                      );
                    }
                  }

                  // then any other printable fields
                  for (const k of Object.keys(v)) {
                    const kl = k.toLowerCase();
                    if (EXCLUDE_KEYS.has(kl)) continue;
                    if (ORDERED_KEYS_LC.includes(kl)) continue;
                    if (
                      !showMiningYield &&
                      k.replace(/\s+/g, "").toLowerCase() === "miningyield"
                    )
                      continue;

                    const val = v[k];
                    if (
                      (typeof val === "string" || typeof val === "number") &&
                      isPresent(val)
                    ) {
                      lines.push(
                        `<div><span class="statFont">${prettyLabel(
                          k
                        )}:</span> <span class="value">${formatValue(
                          k,
                          val
                        )}</span></div>`
                      );
                    }
                  }

                  const statsBlock =
                    lines.length > 0
                      ? `<div class="part-stats" style="margin-top:6px;font-size:0.9em;line-height:1.25;${
                          statsVisible ? "" : "display:none;"
                        }">${lines.join("")}</div>`
                      : "";

                  return `
<li class="parts-list-item">
  <label style="display:block;width:100%;">
    <div style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" name="opt" value="${v.id}" ${
                    checked ? "checked" : ""
                  }/>
      <span class="value">${v.amount || 1}x</span>
      ${v.unique ? `<span class="unique">${v.name}</span>` : v.name}
      <img 
        src="./images/vehicles/${name}/${imgName}.png" 
        alt="${v.name}" 
        width="48" 
        height="48" 
        onerror="this.style.display='none'"
      />
    </div>
  </label>
  ${statsBlock}
</li>`;
                })
                .join("")}
            </ul>
          </form>
        `;

        // toggle stats
        document.getElementById("toggleStatsBtn").onclick = () => {
          statsVisible = !statsVisible;
          document.querySelectorAll(".part-stats").forEach((el) => {
            el.style.display = statsVisible ? "block" : "none";
          });
          document.getElementById("toggleStatsBtn").textContent = statsVisible
            ? "Hide Stats"
            : "Show Stats";
        };

        // tier filter change
        document.getElementById("mkFilter").addEventListener("change", (e) => {
          localStorage.setItem("vehMkFilter", e.target.value);
          render(); // re-render with new filter
        });

        // ===== Conflicts + Cost =====
        const partMap = currentPartMap;

        function hasSelectedNameLike(selected, needle) {
          const n = needle.toLowerCase();
          for (const id of selected) {
            const nm = partMap[id]?.name.toLowerCase() || "";
            if (nm.includes(n)) return true;
          }
          return false;
        }

        function updateCost() {
          const selected = Array.from(
            document.querySelectorAll("#optForm input:checked"),
            (e) => e.value
          );
          localStorage.setItem("vehOpts", JSON.stringify(selected));

          // Clear conflict styles
          document
            .querySelectorAll("#optForm li")
            .forEach((li) => li.classList.remove("conflict"));
          conflictWarning.innerHTML = "";

          const typeLC = type.toLowerCase();
          const conflictMessages = [];
          const conflictIndexes = [];

          // Storage + Rocket
          const rocketIdx = selected.filter((id) =>
            (partMap[id]?.name || "").toLowerCase().includes("rocket launcher")
          );
          const storageIdx = selected.filter((id) =>
            (partMap[id]?.name || "").toLowerCase().includes("storage")
          );
          if (rocketIdx.length && storageIdx.length) {
            conflictMessages.push("You can't have both Storage and Rocket.");
            conflictIndexes.push(...rocketIdx, ...storageIdx);
          }

          // Buggy specific constraints
          if (typeLC.includes("buggy")) {
            const cutterIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("cutteray")
            );
            if (cutterIdx.length > 1) {
              conflictMessages.push("You can only have 1 Cutteray on a Buggy.");
              conflictIndexes.push(...cutterIdx);
            }

            const hasUtility = hasSelectedNameLike(selected, "utility");
            if (cutterIdx.length > 0 && !hasUtility) {
              conflictMessages.push(
                "You need a Utility rear to have Cutteray on a Buggy."
              );
              conflictIndexes.push(...cutterIdx);
            }

            const exclusiveIdx = selected.filter((id) => {
              const n = (partMap[id]?.name || "").toLowerCase();
              return (
                n.includes("boot") ||
                n.includes("boost") ||
                n.includes("storage")
              );
            });
            if (exclusiveIdx.length > 1) {
              conflictMessages.push(
                "Buggy can only have 1 of Boot or Storage or Boost."
              );
              conflictIndexes.push(...exclusiveIdx);
            }

            const engineIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("engine")
            );
            if (engineIdx.length > 1) {
              conflictMessages.push("You can only have 1 engine on a Buggy.");
              conflictIndexes.push(...engineIdx);
            }

            const utilityIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("utility")
            );
            if (utilityIdx.length > 1) {
              conflictMessages.push("You can only have 1 utility on a Buggy.");
              conflictIndexes.push(...utilityIdx);
            }
          }

          // Multiple Thrusters/Boosters
          const thrusterIdx = selected.filter((id) => {
            const n = (partMap[id]?.name || "").toLowerCase();
            return n.includes("thruster") || n.includes("boost");
          });
          if (thrusterIdx.length > 1) {
            conflictMessages.push(
              "You can only have 1 Thruster or Booster per vehicle."
            );
            conflictIndexes.push(...thrusterIdx);
          }

          // Multiple Rockets
          const allRocketIdx = selected.filter((id) =>
            (partMap[id]?.name || "").toLowerCase().includes("rocket")
          );
          if (allRocketIdx.length > 1) {
            conflictMessages.push("You can only have 1 Rocket per vehicle.");
            conflictIndexes.push(...allRocketIdx);
          }

          // Sandbike: exclusive slot + engine
          if (typeLC.includes("sandbike")) {
            const exclusiveIdx = selected.filter((id) => {
              const n = (partMap[id]?.name || "").toLowerCase();
              return (
                n.includes("seat") || n.includes("inv") || n.includes("boost")
              );
            });
            if (exclusiveIdx.length > 1) {
              conflictMessages.push(
                "Sandbike can only have 1 of Seat, Inventory, or Booster."
              );
              conflictIndexes.push(...exclusiveIdx);
            }
            const engineIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("engine")
            );
            if (engineIdx.length > 1) {
              conflictMessages.push(
                "You can only have 1 engine on a sandbike."
              );
              conflictIndexes.push(...engineIdx);
            }
          }

          // Scout: only 1 scanner
          if (typeLC.includes("scout")) {
            const scannerIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("scanner")
            );
            if (scannerIdx.length > 1) {
              conflictMessages.push("Scout can only have 1 Scanner.");
              conflictIndexes.push(...scannerIdx);
            }
          }

          // Wing/Tread exclusivity (global)
          const wingTreadIdx = selected.filter((id) => {
            const n = (partMap[id]?.name || "").toLowerCase();
            return n.includes("wing") || n.includes("tread");
          });
          if (wingTreadIdx.length > 1) {
            conflictMessages.push("You can only select type 1 Wing or Tread.");
            conflictIndexes.push(...wingTreadIdx);
          }

          // Sandcrawler: only 1 tread + centrifuge/container requirement
          if (typeLC.includes("sandcrawler")) {
            const treadIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("tread")
            );
            if (treadIdx.length > 1) {
              conflictMessages.push("Sandcrawler can only have 1 Tread.");
              conflictIndexes.push(...treadIdx);
            }
          }

          // Missing required parts set by type
          const missingParts = [];
          const hasPartName = (needle) => hasSelectedNameLike(selected, needle);

          if (typeLC.includes("sandbike")) {
            ["chassis", "engine", "hull", "psu", "tread"].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
          } else if (typeLC.includes("assault") || typeLC.includes("medium")) {
            [
              "cabin",
              "chassis",
              "cockpit",
              "engine",
              "generator",
              "tail",
              "wing",
            ].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
          } else if (typeLC.includes("light") || typeLC.includes("scout")) {
            [
              "chassis",
              "cockpit",
              "engine",
              "generator",
              "tail",
              "wing",
            ].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
          } else if (typeLC.includes("buggy")) {
            const hasRear = hasPartName("rear");
            const hasUtility = hasPartName("utility");
            ["chassis", "engine", "hull", "psu", "tread"].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
            if (!hasRear && !hasUtility) missingParts.push("Rear or Utility");
          } else if (typeLC.includes("sandcrawler")) {
            const hasCentrifuge = hasPartName("centrifuge");
            const hasContainer = hasPartName("container");
            ["cabin", "chassis", "engine", "psu", "vacuum", "tread"].forEach(
              (p) => {
                if (!hasPartName(p)) missingParts.push(formatPartName(p));
              }
            );
            if (!hasCentrifuge && !hasContainer)
              missingParts.push("Centrifuge or Container");
          } else if (typeLC.includes("carrier")) {
            [
              "chassis",
              "cockpit",
              "engine",
              "generator",
              "tail",
              "hull",
              "side hull",
              "wing",
            ].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
          }

          // Render conflict messages
          if (conflictMessages.length || missingParts.length) {
            conflictWarning.classList.remove("hidden");
            const allWarnings = [
              ...conflictMessages.map((m) => `⚠️ ${m}`),
              ...missingParts.map(
                (p) =>
                  `⚠️ <span class="missing-parts">Missing required part: <b>${p}</b></span>`
              ),
            ];
            conflictWarning.innerHTML = allWarnings.join("<br>");
            for (const i of conflictIndexes) {
              const li = document
                .querySelector(`#optForm input[value="${i}"]`)
                ?.closest("li");
              if (li) li.classList.add("conflict");
            }
          } else {
            conflictWarning.classList.add("hidden");
            conflictWarning.innerHTML = "";
          }

          // === Cost Calculation ===
          const matCosts = Object.create(null);

          for (const id of selected) {
            const v = partMap[id];
            if (!v || !Array.isArray(v.components)) continue;

            const amt = Number(v.amount) || 0; // parts per selection
            const baseUnits = amt * qty; // total part units being crafted

            // Additive stacking of discounts
            let discount = 0;
            if (
              typeof landsraadBonusTopVeh !== "undefined" &&
              landsraadBonusTopVeh.checked
            )
              discount += 0.25; // 25%
            discount = Math.min(discount, 1); // cap at 100%

            // Apply discount per material line, then round up
            const factor = 1 - discount;

            for (const c of v.components) {
              const perUnitQty = Number(c.quantity) || 0;
              const raw = perUnitQty * baseUnits * factor;

              // round up *after* discount so you never under-buy
              const add = Math.ceil(raw);

              matCosts[c.item] = (matCosts[c.item] || 0) + add;
            }
          }

          const conflictingNamesLC = new Set(
            conflictIndexes.map((i) => (partMap[i]?.name || "").toLowerCase())
          );

          costDiv.innerHTML =
            `<strong>Total Cost for <span class="value">${qty}x</span>:</strong><ul>` +
            Object.entries(matCosts)
              .map(([item, qty]) => {
                const icon = `./images/icons/${item
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.png`;
                const lowerItem = item.toLowerCase();
                const isSpice = lowerItem.includes("spice-infused");
                const isConflict = Array.from(conflictingNamesLC).some((n) =>
                  lowerItem.includes(n)
                );
                const classes = [
                  isSpice ? "unique" : "",
                  isConflict ? "conflict" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return `<li><img class="icon" src="${icon}" /><span class="value">${qty}x</span> <span class="${classes}">${item}</span></li>`;
              })
              .join("") +
            "</ul>";

          costDiv.classList.toggle("hidden", selected.length === 0);

          // Re-render compare (in case sets exist)
          renderComparePanel();
        }

        document
          .getElementById("optForm")
          .addEventListener("change", updateCost);
        updateCost();

        // Reset buttons
        function doReset() {
          localStorage.removeItem("vehType");
          localStorage.removeItem("vehAmount");
          localStorage.removeItem("vehOpts");
          document.getElementById("vehicleSelect").value = "";
          document.getElementById("buildAmount").value = "1";
          partsList.innerHTML = costDiv.innerHTML = imageDiv.innerHTML = "";
          imageHolder.classList.add("hidden");
          amountInputBottom.classList.add("hidden");
          amount2Label.classList.add("hidden");
          costDiv.classList.add("hidden");
          conflictWarning.classList.add("hidden");
          document.getElementById("compareControls").classList.add("hidden");
          document.getElementById("compareWrapper").classList.add("hidden");
        }
        document.getElementById("resetVehicles").onclick = doReset;
        document.getElementById("resetVehiclestop").onclick = doReset;

        // After successful render, show compare panel if sets exist
        renderComparePanel();
      };

      // initial hooks
      select.addEventListener("change", render);
      amountInput.addEventListener("input", debounce(render, 120));

      // if previously selected, render immediately
      if (select.value) render();

      // On first load (no type selected), still reflect compare panel hidden/clear
      renderComparePanel();
    });
}
