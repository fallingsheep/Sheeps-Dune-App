# 🌌 Dune Cost Calculator

> A lightweight, browser-based calculator for managing **building**, **vehicle**, **item**, and **resource** costs in *Dune*.

---

## 📖 Overview

The app renders a set of calculators in the browser and loads data via `fetch()` from local JSON files.

**Core modules loaded by `index.html`:**
- `items.js`
- `resources.js`
- `building.js`
- `vehicle.js`
- `ui.js`

These modules read JSON (e.g., `Data/buildings.json`) and update the UI accordingly.

---

## ⚙️ Prerequisites

- **Git** — to clone the repository  
- **Modern browser** — Chrome, Firefox, Edge, Safari  
- **Optional** — a local web server (any of the following):
  - **Python 3** (built-in `http.server`)
  - **Node.js** (e.g., `serve`, `http-server`, `vite preview`)

---

## 🚀 Running Locally

### 1) Clone the repository
```bash
git clone <REPO_URL>
cd Sheeps-Dune-App/dune
```

### 2) Start a local web server  
> `fetch()` won’t work from `file://`, so you must serve the files.

#### With Python 3
```bash
python3 -m http.server 8000
```

#### With Node.js (using `serve`)
```bash
npx serve .
```

> Alternative Node servers:
> ```bash
> npx http-server -p 8000
> # or with Vite (if installed)
> npm run build && npx vite preview --port 8000
> ```

### 3) Open the app
Visit:
- http://localhost:8000  
- or http://localhost:8000/index.html

---

## 🗂 Project Structure

```
dune/
├─ index.html                 # Main entry: loads styles + scripts
├─ style.css                  # UI styles
├─ items.js                   # Items calculator logic
├─ resources.js               # Resources calculator logic
├─ building.js                # Buildings calculator logic
├─ vehicle.js                 # Vehicles calculator logic
├─ ui.js                      # UI interactions, state, routing/tabs
├─ Data/
│  ├─ buildings.json          # Building data
│  ├─ vehicles.json           # Vehicle data
│  ├─ items.json              # Item data
│  └─ resources.json          # Resource data
└─ images/                    # Icons and UI images
```

---

## 🧩 How It Works (at a glance)

- `index.html` includes the CSS and JS bundles.
- Each `*.js` module:
  - `fetch()`es its relevant JSON from `/Data/…`
  - Renders controls, tables, and totals
  - Persists user choices in `localStorage` for session continuity
- `ui.js` wires the modules into the page (tabs, toggles, events).

---

## 📝 Notes

- Opening `index.html` directly via `file://` **won’t work** because `fetch()` is blocked by browser security.  
  ✅ Always run a local web server.
- User selections and preferences are saved to **`localStorage`** and will persist across sessions on the same browser/device.

---

## 🛠 Troubleshooting

<details>
<summary><strong>Blank data or errors in the console</strong></summary>

- Ensure you’re visiting `http://localhost:8000/` (or similar), **not** `file://…/index.html`.
- Confirm your server’s working directory is the `dune/` folder (so `/Data/*.json` resolves).
</details>

<details>
<summary><strong>JSON fetch fails (404/403)</strong></summary>

- Check the `Data/` filenames and paths match the code.
- Verify CORS isn’t being restricted by a custom server config.
</details>

<details>
<summary><strong>LocalStorage not saving</strong></summary>

- Some privacy modes block storage—try a normal window or allow storage for the site.
</details>

---

## 📦 Scripts & Tips (optional)

- Use a dedicated docs server during development:
  ```bash
  npx http-server -p 8000 --cors
  ```
- Refresh assets cache by hard-reloading the page (Ctrl/Cmd + Shift + R) if icons or data don’t reflect changes.

---

## ✅ Quick Checklist

- [ ] Cloned the repo  
- [ ] Started a local server in `dune/`  
- [ ] Opened `http://localhost:8000`  
- [ ] Verified JSON loads without errors  
- [ ] Confirmed settings persist in `localStorage`

---
