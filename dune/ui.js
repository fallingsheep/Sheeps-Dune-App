// UI Toggles
const body = document.body;
const darkToggle = document.getElementById("darkModeToggle");
const buildingCalc = document.getElementById("buildingCalc");
const vehicleCalc = document.getElementById("vehicleCalc");
const resourcesTab = document.getElementById("resourcesTab");
const btnBuildings = document.getElementById("btnBuildings");
const btnVehicles = document.getElementById("btnVehicles");
const btnResources = document.getElementById("btnResources");
const btnFilterAll = document.getElementById("btnFilterAll");
const btnFilterMisc = document.getElementById("btnFilterMisc");
const btnFilterWater = document.getElementById("btnFilterWater");
const btnFilterPower = document.getElementById("btnFilterPower");
const btnFilterFabricator = document.getElementById("btnFilterFabricator");


// Persisted Preferences
if (localStorage.getItem("darkMode") === "true") {
  body.classList.add("dark");
  darkToggle.checked = true;
}
if (localStorage.getItem("activeCalc") === "vehicle") {
  buildingCalc.classList.add("hidden");
  vehicleCalc.classList.remove("hidden");
}

darkToggle.addEventListener("change", () => {
  body.classList.toggle("dark", darkToggle.checked);
  localStorage.setItem("darkMode", darkToggle.checked);
});

function setView(mode) {
  const isVehicle = mode === "vehicle";
  const isBuilding = mode === "building";
  const isResources = mode === "resources";

  buildingCalc.classList.toggle("hidden", !isBuilding);
  vehicleCalc.classList.toggle("hidden", !isVehicle);
  resourcesTab.classList.toggle("hidden", !isResources);

  btnVehicles.classList.toggle("active", isVehicle);
  btnBuildings.classList.toggle("active", isBuilding);
  btnResources.classList.toggle("active", isResources);

  if (isResources) {
    loadResources(); // only load when viewed
  }
  if (isVehicle) {
    loadVehicles(); // only load when viewed
  }
  if (isBuilding) {
    loadBuildings(); // only load when viewed
  }

  localStorage.setItem("activeCalc", mode);
}

function toggleUsedIn(id, btn) {
  const el = document.getElementById(id);
  if (el) {
    const isHidden = el.style.display === "none";
    el.style.display = isHidden ? "block" : "none";
    if (btn) {
      btn.textContent = isHidden ? "Hide Used In" : "Show Used In";
    }
  }
}

function setFilter(filter) {
  const isAll = filter === "all";
  const isMisc = filter === "misc";
  const IsWater = filter === "water";
  const isPower = filter === "power";
  const isFabricator = filter === "fabricator";

  btnFilterAll.classList.toggle("active", isAll);
  btnFilterMisc.classList.toggle("active", isMisc);
  btnFilterWater.classList.toggle("active", IsWater);
  btnFilterPower.classList.toggle("active", isPower);
  btnFilterFabricator.classList.toggle("active", isFabricator);

  localStorage.setItem("activeFilter", filter);
}

// Apply initial state from localStorage
setView(localStorage.getItem("activeCalc") || "building");

// Apply intial filter
setFilter(localStorage.getItem("activeFilter") || "all");

// Button listeners
btnBuildings.addEventListener("click", () => setView("building"));
btnVehicles.addEventListener("click", () => setView("vehicle"));
btnResources.addEventListener("click", () => setView("resources"));
btnFilterAll.addEventListener("click", () => setFilter("all"));
btnFilterMisc.addEventListener("click", () => setFilter("misc"));
btnFilterWater.addEventListener("click", () => setFilter("water"));
btnFilterPower.addEventListener("click", () => setFilter("power"));
btnFilterFabricator.addEventListener("click", () => setFilter("fabricator"));