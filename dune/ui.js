      // UI Toggles
      const body = document.body;
      const darkToggle = document.getElementById("darkModeToggle");
      const buildingCalc = document.getElementById("buildingCalc");
      const vehicleCalc = document.getElementById("vehicleCalc");

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

      const btnBuildings = document.getElementById("btnBuildings");
      const btnVehicles = document.getElementById("btnVehicles");

      function setView(mode) {
        const isVehicle = mode === "vehicle";

        buildingCalc.classList.toggle("hidden", isVehicle);
        vehicleCalc.classList.toggle("hidden", !isVehicle);

        btnVehicles.classList.toggle("active", isVehicle);
        btnBuildings.classList.toggle("active", !isVehicle);

        localStorage.setItem("activeCalc", mode);
      }

      // Apply initial state from localStorage
      setView(localStorage.getItem("activeCalc") || "building");

      // Button listeners
      btnBuildings.addEventListener("click", () => setView("building"));
      btnVehicles.addEventListener("click", () => setView("vehicle"));
