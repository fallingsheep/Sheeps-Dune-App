///////////////////
// VEHICLE LOGIC
///////////////////
function loadVehicles() {
  fetch("Data/vehicles.json")
    .then((res) => res.json())
    .then((data) => {
      const select = document.getElementById("vehicleSelect");
      const amountInput = document.getElementById("buildAmount");
      const amountInputBottom = document.getElementById("buildAmount2");
      const selVeh = document.getElementById("selectedVehicle");
      const partsList = document.getElementById("partsList");
      const costDiv = document.getElementById("totalCost");
      const imageDiv = document.getElementById("vehicleImage");

      // When top changes, update bottom
      amountInput.addEventListener("input", () => {
        amountInputBottom.value = amountInput.value;
        render();
      });

      // When bottom changes, update top
      amountInputBottom.addEventListener("input", () => {
        amountInput.value = amountInputBottom.value;
        render();
      });

      select.addEventListener("change", () => {
        if (!select.value) {
          document.getElementById("imageholder").classList.add("hidden");
          document.getElementById("buildAmount2").classList.add("hidden");
          document
            .querySelector('label[for="buildAmount2"]')
            .classList.add("hidden");
          document.getElementById("totalCost").classList.add("hidden");
        }
      });

      const types = [
        ...new Set(
          data
            .map((v) => v.type.split(",")[0].trim().toLowerCase()) // e.g. "sandbike mk1" => "sandbike"
            .map((t) =>
              t.includes("sandbike")
                ? "Sandbike"
                : t.includes("buggy")
                ? "Buggy"
                : t.includes("sandcrawler")
                ? "Sandcrawler"
                : t.includes("carrier")
                ? "Carrier"
                : t.includes("scout") || t.includes("light")
                ? "Scout"
                : t.includes("assault") || t.includes("medium")
                ? "Assault"
                : null
            )
            .filter(Boolean)
        ),
      ];

      types.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
      });

      // Restore
      select.value = localStorage.getItem("vehType") || "";
      amountInput.value = localStorage.getItem("vehAmount") || "1";

      const matCosts = {};
      const amt = parseInt(amountInput.value) || 1;

      function render() {
        const type = select.value;
        const match = data.filter((v) => {
          const t = v.type.toLowerCase();
          return (
            (type === "Sandbike" && t.includes("sandbike")) ||
            (type === "Buggy" && t.includes("buggy")) ||
            (type === "Sandcrawler" && t.includes("sandcrawler")) ||
            (type === "Carrier" && t.includes("carrier")) ||
            (type === "Scout" &&
              (t.includes("scout") || t.includes("light"))) ||
            (type === "Assault" &&
              (t.includes("assault") || t.includes("medium")))
          );
        });
        if (!match.length) return;

        document.getElementById("imageholder").classList.remove("hidden");
        document.getElementById("buildAmount2").classList.remove("hidden");
        document
          .querySelector('label[for="buildAmount2"]')
          .classList.remove("hidden");
        document.getElementById("totalCost").classList.remove("hidden");

        localStorage.setItem("vehType", type);
        localStorage.setItem("vehAmount", amt);

        const name = type.split(" ").pop().toLowerCase();
        imageDiv.innerHTML = "<strong>Skins</strong><br>";

        let imageNames = [
          `${name}.png`,
          `${name}_atr.png`,
          `${name}_harko.png`,
        ];

        // Sort so the base image (no "_") comes first
        imageNames = imageNames.sort((a, b) => {
          const aIsBase = !a.includes("_");
          const bIsBase = !b.includes("_");
          return aIsBase ? -1 : bIsBase ? 1 : 0;
        });

        imageNames.forEach((imgName, index) => {
          const img = new Image();
          img.src = `./dune/images/vehicles/${name}/${imgName}`;
          img.className = "vehicle-img";
          img.width = 128;
          img.style.display = "none"; // hide until loaded
          if (index === 0) {
            img.style.marginTop = "30px";
            img.style.marginBottom = "30px";
          }

          // Add to DOM immediately (in order)
          imageDiv.appendChild(img);

          // Show only when loaded
          img.onload = () => {
            img.style.display = "inline-block";
          };
        });

        const allParts = [...match]
          .sort((a, b) => a.name.localeCompare(b.name))
          .sort((a, b) => (a.unique === b.unique ? 0 : a.unique ? 1 : -1));

        const partMap = {};
        allParts.forEach((part) => {
          partMap[part.id] = part;
        });
        const stored = JSON.parse(localStorage.getItem("vehOpts") || "[]");
        partsList.innerHTML = `
        <form id="optForm"><strong>Parts List</strong>
        <ul class="parts-list">
          ${allParts
            .map((v, i) => {
              const checked = stored.includes(v.id);

              const imgName = v.name
                .toLowerCase()
                .replace(/ornithopter/g, "")
                // Buggy specific replacements
                .replace(/rear/g, "")
                .replace(/Rattler Boost Module /gi, "buggy_booster")
                .replace(/Focused Buggy Cutteray/gi, "buggy_cutteray")
                .replace(/Bluddshot Buggy Engine/gi, "buggy_engine")
                .replace(/Bigger Buggy Boot/gi, "buggy_storage")
                // Sandbike
                .replace(/Mohandis Sandbike Engine/gi, "sandbike_engine")
                .replace(/Night Rider Sandbike Boost/gi, "sandbike_booster")
                // Crawler
                .replace(/Walker Sandcrawler Engine/gi, "sandcrawler_engine")
                .replace(/Dampened Sandcrawler Treads/gi, "sandcrawler_tread")
                .replace(
                  /Upgraded Regis Spice Container/gi,
                  "sandcrawler_centrifuge"
                )
                // Carrier
                .replace(/Steady Carrier Boost Module/gi, "carrier_thruster")
                // Scout
                .replace(/Stormrider Boost Module /gi, "scout_thruster")
                .replace(/Albatross Wing Module/gi, "scout_wing")
                .replace(/Scan Module/gi, "scanner")
                // Assault
                .replace(/Steady Assault Boost Module/gi, "assault_thruster")
                .replace(/Launcher /gi, "")
                .replace(/mk\d+/i, "")
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");

              return `
              <li class="parts-list-item">
                <label style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span>
                    <input type="checkbox" name="opt" value="${v.id}" ${
                checked ? "checked" : ""
              }/>
                    <span class="value">${v.amount || 1}x</span>
                    ${
                      v.unique
                        ? `<span class="unique">${v.name}</span>`
                        : v.name
                    }
                  </span>
                  <img 
                    src="./dune/images/vehicles/${name}/${imgName}.png" 
                    alt="${v.name}" 
                    width="32" 
                    height="32" 
                    style="margin-left: 10px;" 
                    onerror="this.style.display='none'"
                  />
                </label>
              </li>`;
            })
            .join("")}
        </ul></form>
      `;

        function updateCost() {
          const selectedCheckboxes = Array.from(
            document.querySelectorAll("#optForm input:checked")
          );
          const selected = selectedCheckboxes.map((e) => e.value); // now strings (ids)
          localStorage.setItem("vehOpts", JSON.stringify(selected));

          // Clear previous styles
          document
            .querySelectorAll("#optForm li")
            .forEach((li) => li.classList.remove("conflict"));
          const conflictWarning = document.getElementById("conflictWarning");
          conflictWarning.innerHTML = "";

          const type = select.value.toLowerCase();

          const conflictMessages = [];
          const conflictIndexes = [];

          // Storage + Rocket
          const rocketIdx = selected.filter((id) =>
            partMap[id]?.name.toLowerCase().includes("rocket launcher")
          );
          const storageIdx = selected.filter((id) =>
            partMap[id]?.name.toLowerCase().includes("storage")
          );
          if (rocketIdx.length > 0 && storageIdx.length > 0) {
            conflictMessages.push("You can't have both Storage and Rocket.");
            conflictIndexes.push(...rocketIdx, ...storageIdx);
          }

          // Buggy + multiple Cutterrays
          if (type.includes("buggy")) {
            const cutterIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("cutteray")
            );
            if (cutterIdx.length > 1) {
              conflictMessages.push("You can only have 1 Cutteray on a Buggy.");
              conflictIndexes.push(...cutterIdx);
            }
          }

          if (type.includes("buggy")) {
            const cutterIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("cutteray")
            );

            const hasUtility = selected.some((id) =>
              partMap[id]?.name.toLowerCase().includes("utility")
            );

            if (cutterIdx.length > 0 && !hasUtility) {
              conflictMessages.push(
                "You need a Utility rear to have Cutteray on a Buggy."
              );
              conflictIndexes.push(...cutterIdx);
            }
          }

          // Buggy + boot//storage
          if (type.includes("buggy")) {
            const exclusiveIdx = selected.filter((id) => {
              const name = partMap[id]?.name.toLowerCase();
              return (
                name.includes("boot") ||
                name.includes("boost") ||
                name.includes("storage")
              );
            });
            if (exclusiveIdx.length > 1) {
              conflictMessages.push(
                "Buggy can only have 1 of Boot or Storage or Boost."
              );
              conflictIndexes.push(...exclusiveIdx);
            }
          }

          // Buggy + engine
          if (type.includes("buggy")) {
            const engineIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("engine")
            );
            if (engineIdx.length > 1) {
              conflictMessages.push("You can only have 1 engine on a Buggy.");
              conflictIndexes.push(...engineIdx);
            }
          }

          // Buggy + utility
          if (type.includes("buggy")) {
            const engineIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("utility")
            );
            if (engineIdx.length > 1) {
              conflictMessages.push("You can only have 1 utility on a Buggy.");
              conflictIndexes.push(...engineIdx);
            }
          }

          // Multiple Thrusters/Boosters
          const thrusterIdx = selected.filter((id) => {
            const name = partMap[id]?.name.toLowerCase();
            return name.includes("thruster") || name.includes("boost");
          });
          if (thrusterIdx.length > 1) {
            conflictMessages.push(
              "You can only have 1 Thruster or Booster per vehicle."
            );
            conflictIndexes.push(...thrusterIdx);
          }

          // Multiple Rockets
          const allRocketIdx = selected.filter((id) =>
            partMap[id]?.name.toLowerCase().includes("rocket")
          );
          if (allRocketIdx.length > 1) {
            conflictMessages.push("You can only have 1 Rocket per vehicle.");
            conflictIndexes.push(...allRocketIdx);
          }

          // Sandbike exclusive slot
          if (type.includes("sandbike")) {
            const exclusiveIdx = selected.filter((id) => {
              const name = partMap[id]?.name.toLowerCase();
              return (
                name.includes("seat") ||
                name.includes("inv") ||
                name.includes("boost")
              );
            });
            if (exclusiveIdx.length > 1) {
              conflictMessages.push(
                "Sandbike can only have 1 of Seat, Inventory, or Booster."
              );
              conflictIndexes.push(...exclusiveIdx);
            }
          }

          // sandbike + engine
          if (type.includes("sandbike")) {
            const engineIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("engine")
            );
            if (engineIdx.length > 1) {
              conflictMessages.push(
                "You can only have 1 engine on a sandbike."
              );
              conflictIndexes.push(...engineIdx);
            }
          }

          if (type.includes("scout")) {
            const scannerIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("scanner")
            );
            if (scannerIdx.length > 1) {
              conflictMessages.push("Scout can only have 1 Scanner.");
              conflictIndexes.push(...scannerIdx);
            }
          }

          const wingTreadIdx = selected.filter((id) => {
            const name = partMap[id]?.name.toLowerCase();
            return name.includes("wing") || name.includes("tread");
          });
          if (wingTreadIdx.length > 1) {
            conflictMessages.push("You can only select type 1 Wing or Tread.");
            conflictIndexes.push(...wingTreadIdx);
          }

          if (type.includes("sandcrawler")) {
            const treadIdx = selected.filter((id) =>
              partMap[id]?.name.toLowerCase().includes("tread")
            );
            if (treadIdx.length > 1) {
              conflictMessages.push("Sandcrawler can only have 1 Tread.");
              conflictIndexes.push(...treadIdx);
            }
          }

          function hasPart(name) {
            const selectedNames = selected.map((i) =>
              partMap[i]?.name.toLowerCase()
            );
            return selectedNames.some((p) => p.includes(name));
          }

          const missingParts = [];

          if (type.includes("sandbike")) {
            ["chassis", "engine", "hull", "psu", "tread"].forEach((part) => {
              if (!hasPart(part)) missingParts.push(formatPartName(part));
            });
          }
          if (type.includes("medium") || type.includes("assault")) {
            [
              "cabin",
              "chassis",
              "cockpit",
              "engine",
              "generator",
              "tail",
              "wing",
            ].forEach((part) => {
              if (!hasPart(part)) missingParts.push(formatPartName(part));
            });
          }
          if (type.includes("light") || type.includes("scout")) {
            [
              "chassis",
              "cockpit",
              "engine",
              "generator",
              "tail",
              "wing",
            ].forEach((part) => {
              if (!hasPart(part)) missingParts.push(formatPartName(part));
            });
          }
          if (type.includes("buggy")) {
            const hasRear = hasPart("rear");
            const hasUtility = hasPart("utility");
            ["chassis", "engine", "hull", "psu", "tread"].forEach((part) => {
              if (!hasPart(part)) missingParts.push(formatPartName(part));
            });
            if (!hasRear && !hasUtility) missingParts.push("Rear or Utility");
          }
          if (type.includes("sandcrawler")) {
            const hasCentrifuge = hasPart("centrifuge");
            const hasContainer = hasPart("container");
            ["cabin", "chassis", "engine", "psu", "vacuum", "tread"].forEach(
              (part) => {
                if (!hasPart(part)) missingParts.push(formatPartName(part));
              }
            );
            if (!hasCentrifuge && !hasContainer)
              missingParts.push("Centrifuge or Container");
          }
          if (type.includes("carrier")) {
            [
              "chassis",
              "cockpit",
              "engine",
              "generator",
              "tail",
              "hull",
              "side hull",
              "wing",
            ].forEach((part) => {
              if (!hasPart(part)) missingParts.push(formatPartName(part));
            });
          }

          // Show all conflict messages
          if (conflictMessages.length > 0 || missingParts.length > 0) {
            conflictWarning.classList.remove("hidden");

            const allWarnings = [...conflictMessages.map((msg) => `⚠️ ${msg}`)];

            if (missingParts.length > 0) {
              missingParts.forEach((p) => {
                allWarnings.push(
                  `⚠️ <span class="missing-parts">Missing required part: <b>${p}</b></span>`
                );
              });
            }

            conflictWarning.innerHTML = allWarnings.join("<br>");

            conflictIndexes.forEach((i) => {
              const li = document
                .querySelector(`#optForm input[value="${i}"]`)
                ?.closest("li");
              if (li) li.classList.add("conflict");
            });
          } else {
            conflictWarning.classList.add("hidden");
            conflictWarning.innerHTML = "";
          }

          // === Cost Calculation ===

          match
            .filter((v) => selected.includes(v.id))
            .forEach((v) => {
              const mult = (v.amount || 1) * amt;
              v.components?.forEach((c) => {
                matCosts[c.item] = (matCosts[c.item] || 0) + c.quantity * mult;
              });
            });

          const conflictingPartNames = conflictIndexes.map((i) =>
            partMap[i]?.name.toLowerCase()
          );

          costDiv.innerHTML =
            `<strong>Total Cost for <span class="value">${amt}x</span>:</strong><ul>` +
            Object.entries(matCosts)
              .map(([item, qty]) => {
                const icon = `./dune/images/Icons/${item
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.png`;
                const lowerItem = item.toLowerCase();
                const isSpice = lowerItem.includes("spice-infused");

                const isConflict = conflictingPartNames.some((name) =>
                  lowerItem.includes(name)
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

          if (selected.length > 0) {
            costDiv.classList.remove("hidden");
          } else {
            costDiv.classList.add("hidden");
          }

          document.getElementById("resetVehicles").onclick = () => {
            localStorage.removeItem("vehType");
            localStorage.removeItem("vehAmount");
            localStorage.removeItem("vehOpts");
            select.value = "";
            amountInput.value = "1";
            selVeh.innerHTML =
              partsList.innerHTML =
              costDiv.innerHTML =
              imageDiv.innerHTML =
                "";
            document.getElementById("imageholder").classList.add("hidden");
            document.getElementById("buildAmount2").classList.add("hidden");
            document
              .querySelector('label[for="buildAmount2"]')
              .classList.add("hidden");
            document.getElementById("totalCost").classList.add("hidden");
            conflictWarning.classList.add("hidden");
          };
          document.getElementById("resetVehiclestop").onclick = () => {
            localStorage.removeItem("vehType");
            localStorage.removeItem("vehAmount");
            localStorage.removeItem("vehOpts");
            select.value = "";
            amountInput.value = "1";
            selVeh.innerHTML =
              partsList.innerHTML =
              costDiv.innerHTML =
              imageDiv.innerHTML =
                "";
            document.getElementById("imageholder").classList.add("hidden");
            document.getElementById("buildAmount2").classList.add("hidden");
            document
              .querySelector('label[for="buildAmount2"]')
              .classList.add("hidden");
            document.getElementById("totalCost").classList.add("hidden");
            conflictWarning.classList.add("hidden");
          };
        }

        document
          .getElementById("optForm")
          .addEventListener("change", updateCost);
        updateCost();
      }

      function formatPartName(str) {
        return str.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()); // capitalize each word
      }
      select.addEventListener("change", render);
      amountInput.addEventListener("input", render);
      if (select.value) render();
    });
}
