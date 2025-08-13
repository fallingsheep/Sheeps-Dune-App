///////////////////
// BUILDING LOGIC
///////////////////

  function filterBuildings(type) {
    const buttons = document.querySelectorAll("#buildingFilters .filter-btn");
    buttons.forEach((btn) => btn.classList.remove("active"));

    // Highlight selected button
    const activeBtn = Array.from(buttons).find(
      (btn) => btn.textContent.toLowerCase() === type.toLowerCase() || (type === 'all' && btn.textContent.toLowerCase() === "all")
    );
    if (activeBtn) activeBtn.classList.add("active");

    const buildings = document.querySelectorAll("#buildingList .building");
    buildings.forEach((bld) => {
      const bldType = bld.getAttribute("data-type");
      if (type === "all" || bldType === type) {
        bld.style.display = "block";
      } else {
        bld.style.display = "none";
      }
    });
  }

function loadBuildings() {
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
      const landsraadBonusTop = document.getElementById("landsraadBonusTop");
      const landsraadBonusBottom = document.getElementById("landsraadBonusBottom");
      const powerDaysInput = document.getElementById("powerDays");
      const buildingPower = document.getElementById("buildingPower");
      //clear list
      list.innerHTML = "";

      // Restore values
      const savedQty = JSON.parse(
        localStorage.getItem("buildingQuantities") || "{}"
      );
      desertTop.checked = localStorage.getItem("deepDesertTop") === "true";
      desertBottom.checked = localStorage.getItem("deepDesertBottom") === "true";
      landsraadBonusTop.checked = localStorage.getItem("landsraadBonusTop") === "true";
      landsraadBonusBottom.checked = localStorage.getItem("landsraadBonusBottom") === "true";

      // Sync both DD checkboxes and recalc when either changes
      const syncDesertToggles = (source) => {
        const value = source.checked;
        desertTop.checked = value;
        desertBottom.checked = value;
        localStorage.setItem("deepDesert", value);
        calcBuildings();
      };

      desertTop.addEventListener("change", () => syncDesertToggles(desertTop));
      desertBottom.addEventListener("change", () =>
        syncDesertToggles(desertBottom)
      );

      // Sync both landsraad checkboxes and recalc when either changes
      const synclandsraadToggles = (source) => {
        const value = source.checked;
        landsraadBonusTop.checked = value;
        landsraadBonusBottom.checked = value;
        localStorage.setItem("landsraad", value);
        calcBuildings();
      };

      landsraadBonusTop.addEventListener("change", () => synclandsraadToggles(landsraadBonusTop));
      landsraadBonusBottom.addEventListener("change", () =>
        synclandsraadToggles(landsraadBonusBottom)
      );

      buildings.forEach((bld, i) => {
        const div = document.createElement("div");
        div.className = "building";
        div.setAttribute("data-type", bld.buildtype || "misc");

        const fileName = bld.name.toLowerCase().replace(/\s+/g, "-");

        // Construct local image path
        const imageSrc = `./images/buildings/${fileName}.png`;

        const imageTag = `
            <img src="${imageSrc}" alt="${bld.name}" 
                class="building-image"
                onerror="this.style.display='none';"
            />
          `;

        const powerLine =
          bld.power !== 0
            ? `Power: <span class="value ${bld.power > 0 ? "power-display green" : "power-display red"
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
                <div class="buildTitle" style="margin-bottom: 5px;">${bld.name
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
                      <input type="number" id="qty-${i}" value="${savedQty[i] || 0
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
        const selectedDisplay = document.getElementById("selectedBuildings");
        selectedDisplay.innerHTML = ""; // Clear list

        buildings.forEach((bld, i) => {
          let fileName = bld.name.toLowerCase().replace(/\s+/g, "-");
          let imageSrc = `./images/buildings/${fileName}.png`;
          let imageTagSmall = `
            <img src="${imageSrc}" alt="${bld.name}" 
                class="building-image-small"
                onerror="this.style.display='none';"
            />
            `;

          const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
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
          const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
          saveQty[i] = qty;
          const power = bld.power * qty;
          power >= 0 ? (generated += power) : (used += Math.abs(power));
          totalWeight += bld.weight * qty;
          totalWater += bld.water * qty;
          totalStorage += bld.storage * qty;
          totalStorageSlots += bld.storageslots * qty;
          bld.components.forEach((c) => {
            let amt = c.quantity;

            let discount = 0; // percentage in decimal
            if (desertTop.checked) discount += 0.5;   // 50%
            if (landsraadBonusTop.checked)  discount += 0.25;  // 25%

            // Cap the discount at 100%
            discount = Math.min(discount, 1);

            amt = Math.ceil(amt * (1 - discount));

            totals[c.item] = (totals[c.item] || 0) + amt * qty;
          });
        });

        total.innerHTML = Object.entries(totals)
          .sort((a, b) => a[0].localeCompare(b[0])) // ✅ Alphabetical sort by item name
          .map(([item, qty]) => {
            let totalDisplay = "";
            const icon = `./images/icons/${item
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}.png`;
            if (qty > 0) {
              totalDisplay = `<li><img class="icon" src="${icon}" /> <span class='buildFont'><span class='value'>${qty}x</span> ${item}</span></li>`;
            }
            return totalDisplay;
          })
          .join("");

        powerUsed.innerHTML = "<span class='buildFont'>" + used + "</span>";
        powerGen.innerHTML = "<span class='buildFont'>" + generated + "</span>";
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
          "</span> Slots" +
          "</span>";

        localStorage.setItem("buildingQuantities", JSON.stringify(saveQty));
        localStorage.setItem("deepDesertTop", desertTop.checked);
        localStorage.setItem("deepDesertBottom", desertBottom.checked);
        localStorage.setItem("landsraadBonusTop", landsraadBonusTop.checked);
        localStorage.setItem("landsraadBonusBottom", landsraadBonusBottom.checked);

        // Update buildingPower display with buildings that generate power
        buildingPower.innerHTML = ""; // Clear previous list

        buildings.forEach((bld, i) => {
          const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
          if (qty > 0 && bld.power > 0) {
            const fileName = bld.name.toLowerCase().replace(/\s+/g, "-");
            const imageSrc = `./images/buildings/${fileName}.png`;

            const div = document.createElement("div");
            div.className = "power-building-item";
            div.innerHTML = `
                  <img src="${imageSrc}" alt="${bld.name}" 
                      class="building-image-small"
                      onerror="this.style.display='none';"
                  />
                  <span class="buildFont"><span class="value">${qty}x</span> ${bld.name}</span>
                `;
            buildingPower.appendChild(div);
          }
        });

        // Update waterProduction display with buildings that generate water
        const waterProduction = document.getElementById("waterProduction");
        waterProduction.innerHTML = ""; // Clear previous list

        buildings.forEach((bld, i) => {
          const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
          if (qty > 0 && bld.water > 0) {
            const fileName = bld.name.toLowerCase().replace(/\s+/g, "-");
            const imageSrc = `./images/buildings/${fileName}.png`;

            const div = document.createElement("div");
            div.className = "water-building-item";
            div.innerHTML = `
                  <img src="${imageSrc}" alt="${bld.name}" 
                      class="building-image-small"
                      onerror="this.style.display='none';"
                  />
                  <span class="buildFont"><span class="value">${qty}x</span> ${bld.name}</span>
                `;
            waterProduction.appendChild(div);
          }
        });

        // Update storageBuildings display with buildings that provide storage
        const storageBuildings = document.getElementById("storageBuildings");
        storageBuildings.innerHTML = ""; // Clear previous list

        buildings.forEach((bld, i) => {
          const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
          if (qty > 0 && bld.storage > 0) {
            const fileName = bld.name.toLowerCase().replace(/\s+/g, "-");
            const imageSrc = `./images/buildings/${fileName}.png`;

            const div = document.createElement("div");
            div.className = "storage-building-item";
            div.innerHTML = `
                  <img src="${imageSrc}" alt="${bld.name}" 
                      class="building-image-small"
                      onerror="this.style.display='none';"
                  />
                  <span class="buildFont"><span class="value">${qty}x</span> ${bld.name}</span>
                `;
            storageBuildings.appendChild(div);
          }
        });

        // Fuel requirement calc for N days
        const days = parseFloat(powerDaysInput.value) || 1;
        const totalHours = days * 24;
        const fuelTotals = {};

        buildings.forEach((bld, i) => {
          const qty = parseInt(document.getElementById(`qty-${i}`).value) || 0;
          if (!bld.fueltype || !bld.burntime || qty === 0) return;

          const fuelPerBuilding = totalHours / bld.burntime;
          const totalFuel = fuelPerBuilding * qty;

          if (!fuelTotals[bld.fueltype]) {
            fuelTotals[bld.fueltype] = 0;
          }
          fuelTotals[bld.fueltype] += totalFuel;
        });

        const fuelContainer = document.getElementById("fuel");
        fuelContainer.innerHTML = ""; // clear previous

        if (Object.keys(fuelTotals).length === 0) {
          fuelContainer.innerHTML = "0";
        } else {
          let html = "";
          for (const [fuel, amount] of Object.entries(fuelTotals)) {
            let icon = `./images/icons/${fuel
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}.png`;

            if (fuel === "FuelCell") {
              icon = `./images/icons/fuel-cell.png`;
            }
            html += `
      <div class="buildFont">
        <img class="icon" src="${icon}" onerror="this.style.display='none';" />
        <span class="value">${amount.toFixed(0)}x</span> ${fuel}
      </div>
    `;
          }
          fuelContainer.innerHTML = html;
        }
      }

      list.addEventListener("input", calcBuildings);
      desertTop.addEventListener("change", calcBuildings);
      desertBottom.addEventListener("change", calcBuildings);
      landsraadBonusTop.addEventListener("change", calcBuildings);
      landsraadBonusBottom.addEventListener("change", calcBuildings);
      powerDaysInput.addEventListener("input", calcBuildings);

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
          localStorage.removeItem("landsraadBonusTop");
          localStorage.removeItem("landsraadBonusBottom");

          calcBuildings();
          setFilter("all");
        });
      });

      calcBuildings();
      filterBuildings('all');
    });
}