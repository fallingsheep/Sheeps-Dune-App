// UI Toggles
const body = document.body;
const darkToggle = document.getElementById("darkModeToggle");
const buildingCalc = document.getElementById("buildingCalc");
const vehicleCalc = document.getElementById("vehicleCalc");
const resourcesTab = document.getElementById("resourcesTab");
const btnBuildings = document.getElementById("btnBuildings");
const btnVehicles = document.getElementById("btnVehicles");
const btnResources = document.getElementById("btnResources");

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

function toggleUsedIn(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = el.style.display === "none" ? "block" : "none";
  }
}

// Apply initial state from localStorage
setView(localStorage.getItem("activeCalc") || "building");

// Button listeners
btnBuildings.addEventListener("click", () => setView("building"));
btnVehicles.addEventListener("click", () => setView("vehicle"));
btnResources.addEventListener("click", () => setView("resources"));