
///////////////////
// VEHICLE LOGIC
///////////////////
      const toggleBtn = document.getElementById("toggleOptionalParts");
      const optionalPartsDiv = document.getElementById("optionalParts");

      toggleBtn.addEventListener("click", () => {
        const isHidden = optionalPartsDiv.style.display === "none";
        optionalPartsDiv.style.display = isHidden ? "block" : "none";
        toggleBtn.textContent = isHidden ? "Hide Optional Parts ▲" : "Show Optional Parts ▼";
      });

      fetch("Data/vehicles.json")
        .then((res) => res.json())
        .then((data) => {
          const select = document.getElementById("vehicleSelect");
          const amountInput = document.getElementById("buildAmount");
          const selVeh = document.getElementById("selectedVehicle");
          const reqParts = document.getElementById("requiredParts");
          const optParts = document.getElementById("optionalParts");
          const costDiv = document.getElementById("totalCost");
          const imageDiv = document.getElementById("vehicleImage");

          const types = [
            ...new Set(
              data.flatMap((v) => v.type.split(",").map((t) => t.trim()))
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

          function render() {
            const type = select.value;
            const amt = parseInt(amountInput.value) || 1;
            const match = data.filter((v) =>
              v.type
                .split(",")
                .map((t) => t.trim())
                .includes(type)
            );
            if (!match.length) return;

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
              img.src = `./Images/vehicles/${name}/${imgName}`;
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

            const optional = match.filter((v) => !v.required);
            let showOnlyUnique = false; // global flag

            function renderOptionalParts() {
              const stored = JSON.parse(localStorage.getItem("vehOpts") || "[]");

              optParts.innerHTML = `
                <div style="margin-bottom: 8px;">
                  <button id="toggleUniqueBtn" style="margin-bottom: 5px;">
                    ${showOnlyUnique ? "Show All Optional Parts" : "Show Only Unique Parts"}
                  </button>
                </div>
                <form id="optForm"><ul>
                  ${optional
                    .map((v, i) => {
                      if (showOnlyUnique && !v.unique) return ""; // skip non-unique if filter is on

                      const checked = stored.includes(i);

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
                        <li style="display: flex; justify-content: space-between; align-items: center;">
                          <label style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span>
                              <input type="checkbox" name="opt" value="${i}" ${checked ? "checked" : ""}/>
                              <span class="value">${(v.amount || 1) * amt}x</span>
                              ${v.unique ? `<span class="unique">${v.name}</span>` : v.name}
                            </span>
                            <img 
                              src="./Images/Vehicles/${name}/${imgName}.png" 
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
                </ul></form>`;
                
              // Attach toggle event
              document.getElementById("toggleUniqueBtn").addEventListener("click", () => {
                showOnlyUnique = !showOnlyUnique;
                renderOptionalParts(); // re-render
                document.getElementById("optForm").addEventListener("change", updateCost);
              });
            }

            renderOptionalParts();


            function updateCost() {
              const selectedCheckboxes = Array.from(
                document.querySelectorAll("#optForm input:checked")
              );
              const selected = selectedCheckboxes.map((e) => parseInt(e.value));
              localStorage.setItem("vehOpts", JSON.stringify(selected));

              const selectedOptionalIndexes = JSON.parse(
                localStorage.getItem("vehOpts") || "[]"
              );
              const selectedOptionalNames = selectedOptionalIndexes.map((i) =>
                (match.filter((v) => !v.required)[i]?.name || "").toLowerCase()
              );
              const amt2 = parseInt(amountInput.value) || 1; // <-- Add this line

            reqParts.innerHTML =
              "<strong>Required Parts:</strong><ul>" +
              match
                .filter((v) => v.required)
                .filter((v) => {
                  const lowerName = v.name.toLowerCase();
                  // Hide required engine if optional engine is selected
                  if (lowerName.includes("engine")) {
                    return !selectedOptionalNames.some((opt) =>
                      opt.toLowerCase().includes("engine")
                    );
                  }
                  return true;
                })
                .filter((v) => {
                  const lowerName = v.name.toLowerCase();
                  // Hide required engine if optional engine is selected
                  if (lowerName.includes("rear")) {
                    return !selectedOptionalNames.some((opt) =>
                      opt.toLowerCase().includes("utility")
                    );
                  }
                  return true;
                })
                .map((v) => {
                  const imgName = v.name
                    .toLowerCase()
                    .replace(/ornithopter/g, "")         // Remove "ornithopter"
                    .replace(/mk\d+/i, "")        // Remove Mk6, Mk1, etc.
                    .replace(/[^a-z0-9]+/g, "_")  // Replace spaces/punctuation with _
                    .replace(/^_+|_+$/g, "");     // Trim leading/trailing underscores

                  return `<li style="display: flex; justify-content: space-between; align-items: center;">
                    <span>
                      <span class="value">${(v.amount || 1) * amt2}x</span> ${v.name}
                    </span>
                    <img 
                      src="./Images/Vehicles/${name}/${imgName}.png" 
                      alt="${v.name}" 
                      width="32" 
                      height="32" 
                      style="margin-left: 10px;" 
                      onerror="this.style.display='none'"
                    />
                  </li>`;
                })
                .join("") +
              "</ul>";


              // Clear previous styles
              document
                .querySelectorAll("#optForm li")
                .forEach((li) => li.classList.remove("conflict"));
              const conflictWarning =
                document.getElementById("conflictWarning");
              conflictWarning.innerHTML = "";

              const selectedParts = selected.map((i) =>
                optional[i].name.toLowerCase()
              );
              const type = select.value.toLowerCase();

              const conflictMessages = [];
              const conflictIndexes = [];

              // Storage + Rocket
              const rocketIdx = selected.filter((i) =>
                optional[i].name.toLowerCase().includes("rocket launcher")
              );
              const storageIdx = selected.filter((i) =>
                optional[i].name.toLowerCase().includes("storage")
              );
              if (rocketIdx.length > 0 && storageIdx.length > 0) {
                conflictMessages.push(
                  "You can't have both Storage and Rocket."
                );
                conflictIndexes.push(...rocketIdx, ...storageIdx);
              }

              // Buggy + multiple Cutterrays
              if (type.includes("buggy")) {
                const cutterIdx = selected.filter((i) =>
                  optional[i].name.toLowerCase().includes("cutteray")
                );
                if (cutterIdx.length > 1) {
                  conflictMessages.push(
                    "You can only have 1 Cutteray on a Buggy."
                  );
                  conflictIndexes.push(...cutterIdx);
                }
              }

              if (type.includes("buggy")) {
                const cutterIdx = selected.filter((i) =>
                  optional[i].name.toLowerCase().includes("cutteray")
                );

                const hasUtility = selected.some((i) =>
                  optional[i].name.toLowerCase().includes("utility")
                );

                if (cutterIdx.length > 0 && !hasUtility) {
                  conflictMessages.push(
                    "You need a Utility rear to have Cutteray on a Buggy."
                  );
                  conflictIndexes.push(...cutterIdx);
                }
              }

              // Buggy + boot/util/storage
              if (type.includes("buggy")) {
                const exclusiveIdx = selected.filter((i) => {
                  const name = optional[i].name.toLowerCase();
                  return (
                    name.includes("boot") ||
                    name.includes("boost") ||
                    name.includes("storage") ||
                    name.includes("utility")
                  );
                });
                if (exclusiveIdx.length > 1) {
                  conflictMessages.push(
                    "Buggy can only have 1 of Boot/Storage, Boost, or Utitly."
                  );
                  conflictIndexes.push(...exclusiveIdx);
                }
              }

              // Buggy + engine
              if (type.includes("buggy")) {
                const engineIdx = selected.filter((i) =>
                  optional[i].name.toLowerCase().includes("engine")
                );
                if (engineIdx.length > 1) {
                  conflictMessages.push(
                    "You can only have 1 engine on a Buggy."
                  );
                  conflictIndexes.push(...engineIdx);
                }
              }

              // Multiple Thrusters/Boosters
              const thrusterIdx = selected.filter((i) => {
                const name = optional[i].name.toLowerCase();
                return name.includes("thruster") || name.includes("boost");
              });
              if (thrusterIdx.length > 1) {
                conflictMessages.push(
                  "You can only have 1 Thruster or Booster per vehicle."
                );
                conflictIndexes.push(...thrusterIdx);
              }

              // Multiple Rockets
              const allRocketIdx = selected.filter((i) =>
                optional[i].name.toLowerCase().includes("rocket")
              );
              if (allRocketIdx.length > 1) {
                conflictMessages.push(
                  "You can only have 1 Rocket per vehicle."
                );
                conflictIndexes.push(...allRocketIdx);
              }

              // Sandbike exclusive slot
              if (type.includes("sandbike")) {
                const exclusiveIdx = selected.filter((i) => {
                  const name = optional[i].name.toLowerCase();
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
                const engineIdx = selected.filter((i) =>
                  optional[i].name.toLowerCase().includes("engine")
                );
                if (engineIdx.length > 1) {
                  conflictMessages.push(
                    "You can only have 1 engine on a sandbike."
                  );
                  conflictIndexes.push(...engineIdx);
                }
              }

              // Show all conflict messages
              if (conflictMessages.length > 0) {
                conflictWarning.innerHTML = conflictMessages
                  .map((msg) => `⚠️ ${msg}`)
                  .join("<br>");
                conflictIndexes.forEach((i) => {
                  const li = document
                    .querySelector(`#optForm input[value="${i}"]`)
                    ?.closest("li");
                  if (li) li.classList.add("conflict");
                });
              }

              // === Cost Calculation ===
              const matCosts = {};
              const amt = parseInt(amountInput.value) || 1;

              [
                // Required parts, but skip engine or rear if optional counterparts are selected
                ...match.filter((v) => {
                  if (!v.required) return false;
                  const name = v.name.toLowerCase();

                  if (name.includes("engine")) {
                    return !selectedOptionalNames.some((opt) =>
                      opt.toLowerCase().includes("engine")
                    );
                  }

                  if (name.includes("rear")) {
                    return !selectedOptionalNames.some((opt) =>
                      opt.toLowerCase().includes("utility")
                    );
                  }

                  return true;
                }),

                // Include selected optional parts
                ...optional.filter((_, i) => selected.includes(i)),
              ].forEach((v) => {
                const mult = (v.amount || 1) * amt;
                v.components.forEach((c) => {
                  matCosts[c.item] = (matCosts[c.item] || 0) + c.quantity * mult;
                });
              });


              const conflictingPartNames = conflictIndexes.map((i) =>
                optional[i].name.toLowerCase()
              );

              costDiv.innerHTML =
                "<strong>Total Cost:</strong><ul>" +
                Object.entries(matCosts)
                  .map(([item, qty]) => {
                    const icon = `./Images/Icons/${item
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
              document.getElementById("resetVehicles").onclick = () => {
                localStorage.removeItem("vehType");
                localStorage.removeItem("vehAmount");
                localStorage.removeItem("vehOpts");
                select.value = "";
                amountInput.value = "1";
                selVeh.innerHTML =
                  reqParts.innerHTML =
                  optParts.innerHTML =
                  costDiv.innerHTML =
                  imageDiv.innerHTML =
                    "";
              };
              document.getElementById("resetVehiclestop").onclick = () => {
                localStorage.removeItem("vehType");
                localStorage.removeItem("vehAmount");
                localStorage.removeItem("vehOpts");
                select.value = "";
                amountInput.value = "1";
                selVeh.innerHTML =
                  reqParts.innerHTML =
                  optParts.innerHTML =
                  costDiv.innerHTML =
                  imageDiv.innerHTML =
                    "";
              };
            }

            document
              .getElementById("optForm")
              .addEventListener("change", updateCost);
            updateCost();
          }

          select.addEventListener("change", render);
          amountInput.addEventListener("input", render);
          if (select.value) render();
        });