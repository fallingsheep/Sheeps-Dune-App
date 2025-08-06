function loadResources() {
  fetch("Data/resources.json")
    .then((res) => res.json())
    .then((resources) => {
      const craftableList = document.getElementById("craftableResources");
      const uncraftableList = document.getElementById("uncraftableResources");
      craftableList.innerHTML = "";
      uncraftableList.innerHTML = "";

      resources.forEach((res, i) => {
        const div = document.createElement("div");
        div.className = "building";

        const iconName = res.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const image = `./Images/Icons/${iconName}.png`;

        // Check if it has craftedAt info
        const isCraftable =
          Array.isArray(res.craftedAt) && res.craftedAt.length > 0;

        // Format crafting stations
        const craftingBlocks = isCraftable
          ? res.craftedAt
              .map((craft) => {
                const station = `<strong>${craft.station}</strong>`;
                const ingredients = craft.ingredients
                  .map((i) => {
                    const iconName = i.item
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-");
                    const iconPath = `./Images/Icons/${iconName}.png`;
                    return `
              <li>
                <img class="icon" src="${iconPath}" onerror="this.style.display='none'" />
                <span class="buildFont"><span class="value">${i.quantity}x</span> ${i.item}</span>
              </li>
            `;
                  })
                  .join("");
                return `<div><div>${station}</div><ul>${ingredients}</ul></div>`;
              })
              .join(
                "<hr style='border: none; border-top: 1px dashed #666; margin: 6px 0;'>"
              )
          : "N/A";

        const usedInSectionId = `usedIn-${i}`;
        const hasUsedIn = res.usedIn && res.usedIn.length > 0;
        const usedInToggle = hasUsedIn
          ? `<button onclick="toggleUsedIn('${usedInSectionId}')">Toggle Used In</button>`
          : "";
        const usedInList = hasUsedIn
          ? `<div id="${usedInSectionId}" style="display:none; margin-top:10px;">
                <span class="buildFont">Used In:</span>
                <ul>
                  ${res.usedIn.map(item => `<li>${item}</li>`).join("")}
                </ul>
             </div>`
          : "";

        div.innerHTML = `
          <div style="display:flex; align-items:flex-start;">
            <img src="${image}" alt="${res.name}" class="building-image-resources" onerror="this.style.display='none'" />
            <div style="margin-left:10px">
              <strong class="buildName">${res.name}</strong><br>
              <span class="buildFont">Volume:</span><span class="value"> ${res.Volume.toFixed(1)}v</span><br>
              <span class="buildFont">Stack Size:</span><span class="value"> ${res.StackSize}</span><br><br>
              ${isCraftable ? `<span class="buildFont">Crafted At:</span>${craftingBlocks}` : ""}
              ${usedInToggle}
              ${usedInList}
            </div>
          </div>
        `;


        if (isCraftable) {
          craftableList.appendChild(div);
        } else {
          uncraftableList.appendChild(div);
        }
      });
    });
}
