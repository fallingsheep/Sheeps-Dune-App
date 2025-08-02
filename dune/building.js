      
///////////////////
// BUILDING LOGIC
///////////////////
      fetch("Data/buildings.json")
        .then((res) => res.json())
        .then((buildings) => {
          const list = document.getElementById("buildingList");
          const total = document.getElementById("totalResources");
          const powerUsed = document.getElementById("powerUsage");
          const weightUsed = document.getElementById("weightUsage");
          const waterStorage = document.getElementById("waterStorage");
          const storage = document.getElementById("storage");
          const storageSlots = document.getElementById("storageSlots");
          const powerGen = document.getElementById("powerGenerated");
          const desertTop = document.getElementById("deepDesertTop");
          const desertBottom = document.getElementById("deepDesertBottom");

          // Restore values
          const savedQty = JSON.parse(
            localStorage.getItem("buildingQuantities") || "{}"
          );
          desertTop.checked = localStorage.getItem("deepDesertTop") === "true";
          desertBottom.checked =
            localStorage.getItem("deepDesertBottom") === "true";

          // Sync both checkboxes and recalc when either changes
          const syncDesertToggles = (source) => {
            const value = source.checked;
            desertTop.checked = value;
            desertBottom.checked = value;
            localStorage.setItem("deepDesert", value);
            calcBuildings();
          };

          desertTop.addEventListener("change", () =>
            syncDesertToggles(desertTop)
          );
          desertBottom.addEventListener("change", () =>
            syncDesertToggles(desertBottom)
          );

          buildings.forEach((bld, i) => {
            const div = document.createElement("div");
            div.className = "building";

            const fileName = bld.name.toLowerCase().replace(/\s+/g, "-");

            // Construct local image path
            const imageSrc = `./Images/Buildings/${fileName}.png`;

            const imageTag = `
            <img src="${imageSrc}" alt="${bld.name}" 
                class="building-image"
                onerror="this.style.display='none';"
            />
          `;

            const powerLine =
              bld.power !== 0
                ? `Power: <span class="value ${
                    bld.power > 0 ? "power-display green" : "power-display red"
                  }">
                ${bld.power > 0 ? "+" : ""}${bld.power}
              </span><br>`
                : "";

            const waterLine =
              bld.water !== 0
                ? `Water: <span class="water-display">${bld.water}ml</span><br>`
                : "";

            const storageLine =
              bld.storage !== 0
                ? `Storage: <span class="value">${bld.storage}v</span><br>`
                : "";
            const storageslotsLine =
              bld.storageslots !== 0
                ? `Storage Slots: <span class="value">${bld.storageslots}</span><br>`
                : "";

            div.innerHTML = `
              <div>
                <div class="buildTitle" style="margin-bottom: 5px;">${
                  bld.name
                }</div>
                <div style="display: flex; align-items: center;">
                  <div>
                    <span class="buildFont">
                      ${powerLine}
                      ${waterLine}
                      ${storageLine}
                      ${storageslotsLine}
                      Weight: <span class="value">${bld.weight.toFixed(
                        1
                      )}v</span><br>
                      <span class="quantityBuild">Quantity:</span> 
                      <input type="number" id="qty-${i}" value="${
              savedQty[i] || 0
            }" min="0" style="width: 40px;"/>
                    </span>
                  </div>
                  ${imageTag}
                </div>
              </div>
            `;

            list.appendChild(div);
          });

          function calcBuildings() {
            const selectedDisplay =
              document.getElementById("selectedBuildings");
            selectedDisplay.innerHTML = ""; // Clear list

            buildings.forEach((bld, i) => {
              let fileName = bld.name.toLowerCase().replace(/\s+/g, "-");
              let imageSrc = `./Images/Buildings/${fileName}.png`;
              let imageTagSmall = `
            <img src="${imageSrc}" alt="${bld.name}" 
                class="building-image-small"
                onerror="this.style.display='none';"
            />
          `;

              const qty =
                parseInt(document.getElementById(`qty-${i}`).value) || 0;
              if (qty > 0) {
                const li = document.createElement("li");
                li.innerHTML = `<span class="buildFont"><span class="value">${imageTagSmall} ${qty}x</span> ${bld.name}</span>`;
                selectedDisplay.appendChild(li);
              }
            });

            if (!selectedDisplay.children.length) {
              selectedDisplay.innerHTML = "<em>No buildings selected</em>";
            }

            const totals = {};
            let used = 0,
              generated = 0,
              totalWeight = 0,
              totalWater = 0,
              totalStorage = 0,
              totalStorageSlots = 0;
            const saveQty = {};
            buildings.forEach((bld, i) => {
              const qty =
                parseInt(document.getElementById(`qty-${i}`).value) || 0;
              saveQty[i] = qty;
              const power = bld.power * qty;
              power >= 0 ? (generated += power) : (used += Math.abs(power));
              totalWeight += bld.weight * qty;
              totalWater += bld.water * qty;
              totalStorage += bld.storage * qty;
              totalStorageSlots += bld.storageslots * qty;
              bld.components.forEach((c) => {
                const amt = desertTop.checked
                  ? Math.ceil(c.quantity / 2)
                  : c.quantity;
                totals[c.item] = (totals[c.item] || 0) + amt * qty;
              });
            });

            total.innerHTML = Object.entries(totals)
              .map(([item, qty]) => {
                let totalDisplay = "";
                const icon = `./Images/Icons/${item
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.png`;
                if (qty <= 0) {
                  totalDisplay = "";
                } else {
                  totalDisplay = `<li><img class="icon" src="${icon}" /> <span class='buildFont'><span class='value'>${qty}x</span> ${item}</span></li>`;
                }
                return totalDisplay;
              })
              .join("");
            powerUsed.innerHTML = "<span class='buildFont'>" + used + "</span>";
            powerGen.innerHTML =
              "<span class='buildFont'>" + generated + "</span>";
            powerUsed.className =
              "power-display " + (used > generated ? "red" : "green");
            powerGen.className =
              "power-display " + (used > generated ? "red" : "green");
            waterStorage.innerHTML =
              "<span class='buildFont'><span class='water-display'>" +
              totalWater.toFixed(0) +
              "ml </span></span>";
            weightUsed.innerHTML =
              "<span class='buildFont'><span class='value'>" +
              totalWeight.toFixed(1) +
              "v </span></span>";
            storage.innerHTML =
              "<span class='buildFont'><span class='value'>" +
              totalStorage.toFixed(0) +
              "v</span></span>";
            storageSlots.innerHTML =
              "<span class='buildFont'><span class='value'>" +
              totalStorageSlots.toFixed(0) +
              "</span></span>";

            localStorage.setItem("buildingQuantities", JSON.stringify(saveQty));
            localStorage.setItem("deepDesertTop", desertTop.checked);
            localStorage.setItem("deepDesertBottom", desertBottom.checked);
          }

          list.addEventListener("input", calcBuildings);
          desertTop.addEventListener("change", calcBuildings);
          desertBottom.addEventListener("change", calcBuildings);

          document.querySelectorAll(".resetBuildings").forEach((btn) => {
            btn.addEventListener("click", () => {
              Array.from(
                document.querySelectorAll("#buildingList input[type=number]")
              ).forEach((input) => (input.value = 0));
              desertTop.checked = false;
              desertBottom.checked = false;
              localStorage.removeItem("buildingQuantities");
              localStorage.removeItem("deepDesertTop");
              localStorage.removeItem("deepDesertBottom");
              calcBuildings();
            });
          });

          calcBuildings();
        });
