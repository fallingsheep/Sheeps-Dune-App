///////////////////
// VEHICLE LOGIC (Optimised)
// - faster rendering
// - no duplicate listeners/options
// - stats layout under image/name
///////////////////

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

// fields never shown as “stats”
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
]);

// stats ordering priority
const ORDERED_KEYS = [
  "Description",
  "MadeAt",
  "Volume",
  "Durability",
  "Armor",
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

  if (lk === "volume" || lk === "maxvolume") {
    const n = Number(output);
    return Number.isFinite(n) ? `${n}v` : output;
  }
  return output;
}

function formatPartName(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Normalise a part name to an image slug
function partNameToImgSlug(name) {
  return name
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
    .replace(/^_+|_+$/g, "");
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
let statsVisible = true;

function loadVehicles() {
  fetch("Data/vehicles.json")
    .then((res) => res.json())
    .then((data) => {
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

      // ===== Build category for each row once =====
      // Normalize a record to a category name (Sandbike, Buggy, etc.)
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

      // Precompute category for each entry
      const withCategory = data
        .map((v) => ({ ...v, _cat: toCategory(v.type.split(",")[0].trim()) }))
        .filter((v) => v._cat);

      // Build unique list of categories
      const categories = Array.from(new Set(withCategory.map((v) => v._cat)));

      // 🔹 Prevent duplicate event listeners
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
          }
        });

        select.dataset.bound = "1";
      }

      // 🔹 Always clear existing options before adding new ones (prevents doubles)
      select.innerHTML = "";
      select.appendChild(new Option("-- Choose Vehicle --", ""));
      for (const cat of categories) {
        select.appendChild(new Option(cat, cat));
      }

      // Restore persisted UI
      select.value = localStorage.getItem("vehType") || "";
      amountInput.value = localStorage.getItem("vehAmount") || "1";

      // ===== Render =====
      const render = () => {
        const amt = parseInt(amountInput.value, 10) || 1;
        const type = select.value;
        if (!type) return;

        // persist selection
        localStorage.setItem("vehType", type);
        localStorage.setItem("vehAmount", String(amt));

        // filter rows for this category
        const match = withCategory.filter((v) => v._cat === type);
        if (!match.length) return;

        imageHolder.classList.remove("hidden");
        amountInputBottom.classList.remove("hidden");
        amount2Label.classList.remove("hidden");
        costDiv.classList.remove("hidden");

        // Vehicle skin images
        const name = type.toLowerCase();
        imageDiv.innerHTML = "<strong>Skins</strong><br>";
        const imageNames = [`${name}.png`, `${name}_atr.png`, `${name}_harko.png`].sort(
          (a, b) => (!a.includes("_") ? -1 : !b.includes("_") ? 1 : 0)
        );
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

        // sort parts: non-unique first, then by name
        const allParts = match.slice().sort((a, b) => {
          if (!!a.unique !== !!b.unique) return a.unique ? 1 : -1;
          return a.name.localeCompare(b.name);
        });

        // Build part list
        const stored = new Set(JSON.parse(localStorage.getItem("vehOpts") || "[]"));

        partsList.innerHTML = `
          <form id="optForm">
            <strong>Parts List</strong>
            <button type="button" id="toggleStatsBtn" style="margin-left:10px;">${statsVisible ? "Hide" : "Show"} Stats</button>
            <br /><br />
            <ul class="parts-list">
              ${allParts
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
                        `<div><span class="statFont">${prettyLabel(key)}:</span> <span class="value">${formatValue(
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
                    const val = v[k];
                    if ((typeof val === "string" || typeof val === "number") && isPresent(val)) {
                      lines.push(
                        `<div><span class="statFont">${prettyLabel(k)}:</span> <span class="value">${formatValue(
                          k,
                          val
                        )}</span></div>`
                      );
                    }
                  }

                  const statsBlock =
                    lines.length > 0
                      ? `<div class="part-stats" style="margin-top:6px;font-size:0.9em;line-height:1.25;${statsVisible ? "" : "display:none;"}">${lines.join(
                          ""
                        )}</div>`
                      : "";

                  return `
<li class="parts-list-item">
  <label style="display:block;width:100%;">
    <div style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" name="opt" value="${v.id}" ${checked ? "checked" : ""}/>
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

        // Toggle stats (persist state)
        const toggleBtn = document.getElementById("toggleStatsBtn");
        toggleBtn.onclick = () => {
          statsVisible = !statsVisible;
          document.querySelectorAll(".part-stats").forEach((el) => {
            el.style.display = statsVisible ? "block" : "none";
          });
          toggleBtn.textContent = statsVisible ? "Hide Stats" : "Show Stats";
        };

        // ===== Conflicts + Cost =====
        const partMap = Object.create(null);
        for (const p of allParts) partMap[p.id] = p;

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
          document.querySelectorAll("#optForm li").forEach((li) => li.classList.remove("conflict"));
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
              conflictMessages.push("You need a Utility rear to have Cutteray on a Buggy.");
              conflictIndexes.push(...cutterIdx);
            }

            const exclusiveIdx = selected.filter((id) => {
              const n = (partMap[id]?.name || "").toLowerCase();
              return n.includes("boot") || n.includes("boost") || n.includes("storage");
            });
            if (exclusiveIdx.length > 1) {
              conflictMessages.push("Buggy can only have 1 of Boot or Storage or Boost.");
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
            conflictMessages.push("You can only have 1 Thruster or Booster per vehicle.");
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
              return n.includes("seat") || n.includes("inv") || n.includes("boost");
            });
            if (exclusiveIdx.length > 1) {
              conflictMessages.push("Sandbike can only have 1 of Seat, Inventory, or Booster.");
              conflictIndexes.push(...exclusiveIdx);
            }
            const engineIdx = selected.filter((id) =>
              (partMap[id]?.name || "").toLowerCase().includes("engine")
            );
            if (engineIdx.length > 1) {
              conflictMessages.push("You can only have 1 engine on a sandbike.");
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
            ["cabin", "chassis", "cockpit", "engine", "generator", "tail", "wing"].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
          } else if (typeLC.includes("light") || typeLC.includes("scout")) {
            ["chassis", "cockpit", "engine", "generator", "tail", "wing"].forEach((p) => {
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
            ["cabin", "chassis", "engine", "psu", "vacuum", "tread"].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
            if (!hasCentrifuge && !hasContainer) missingParts.push("Centrifuge or Container");
          } else if (typeLC.includes("carrier")) {
            ["chassis", "cockpit", "engine", "generator", "tail", "hull", "side hull", "wing"].forEach((p) => {
              if (!hasPartName(p)) missingParts.push(formatPartName(p));
            });
          }

          // Render conflict messages
          if (conflictMessages.length || missingParts.length) {
            conflictWarning.classList.remove("hidden");
            const allWarnings = [
              ...conflictMessages.map((m) => `⚠️ ${m}`),
              ...missingParts.map(
                (p) => `⚠️ <span class="missing-parts">Missing required part: <b>${p}</b></span>`
              ),
            ];
            conflictWarning.innerHTML = allWarnings.join("<br>");
            // mark conflicting parts in list
            for (const i of conflictIndexes) {
              const li = document.querySelector(`#optForm input[value="${i}"]`)?.closest("li");
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
            if (!v) continue;
            const mult = (v.amount || 1) * amt;
            if (Array.isArray(v.components)) {
              for (const c of v.components) {
                matCosts[c.item] = (matCosts[c.item] || 0) + c.quantity * mult;
              }
            }
          }

          const conflictingNamesLC = new Set(
            conflictIndexes.map((i) => (partMap[i]?.name || "").toLowerCase())
          );

          costDiv.innerHTML =
            `<strong>Total Cost for <span class="value">${amt}x</span>:</strong><ul>` +
            Object.entries(matCosts)
              .map(([item, qty]) => {
                const icon = `./images/icons/${item
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.png`;
                const lowerItem = item.toLowerCase();
                const isSpice = lowerItem.includes("spice-infused");
                const isConflict = Array.from(conflictingNamesLC).some((n) => lowerItem.includes(n));
                const classes = [isSpice ? "unique" : "", isConflict ? "conflict" : ""]
                  .filter(Boolean)
                  .join(" ");
                return `<li><img class="icon" src="${icon}" /><span class="value">${qty}x</span> <span class="${classes}">${item}</span></li>`;
              })
              .join("") +
            "</ul>";

          costDiv.classList.toggle("hidden", selected.length === 0);
        }

        // bind cost updater (new optForm after each render)
        document.getElementById("optForm").addEventListener("change", updateCost);
        updateCost();

        // Reset buttons
        function doReset() {
          localStorage.removeItem("vehType");
          localStorage.removeItem("vehAmount");
          localStorage.removeItem("vehOpts");
          select.value = "";
          amountInput.value = "1";
          partsList.innerHTML = costDiv.innerHTML = imageDiv.innerHTML = "";
          imageHolder.classList.add("hidden");
          amountInputBottom.classList.add("hidden");
          amount2Label.classList.add("hidden");
          costDiv.classList.add("hidden");
          conflictWarning.classList.add("hidden");
        }
        document.getElementById("resetVehicles").onclick = doReset;
        document.getElementById("resetVehiclestop").onclick = doReset;
      };

      // initial hooks
      select.addEventListener("change", render);
      amountInput.addEventListener("input", debounce(render, 120));

      // if previously selected, render immediately
      if (select.value) render();
    });
}
