# Project Commands Reference

This file lists the important commands used in this repo.

**Rule:** anything in a code block is a command to run. Everything else is explanation.

---

## Root (Project Root)

### Build & deploy dashboard (1 command)

```bash
npm run build:dashboard
```

- **Does**: Builds `monitoring-dashboard` and copies `dist/*` to `backend/public/dashboard`.
- **When to use**: Any time you change dashboard UI/code and want those changes reflected when the dashboard is served from the backend.
- **Run from**: repo root (`d:\Premade_Assignment-main`).
- **Where it ends up**: `backend/public/dashboard/` (static files served by the backend).
- **What you should see**:
  - During build: Vite output like `vite building for production...`
  - At the end: the script’s “Build & Deploy Complete!” message
- **Defined in**: root `package.json` → `scripts.build:dashboard` → `scripts/build_dashboard.ps1`.

---

## Backend (`backend/`)

### Install dependencies

```bash
cd backend
npm install
```

- **Does**: Downloads and installs Node dependencies listed in `backend/package.json` into `backend/node_modules/`.
- **When to use**: First setup, after pulling new changes, or when `package.json` / `package-lock.json` changes.
- **Common issues**:
  - If install fails, delete `backend/node_modules/` and retry `npm install` (keep `package-lock.json`).

### Run backend (production-ish)

```bash
cd backend
npm start
```

- **Does**: Runs `node server.js` (Express + Socket.IO).
- **Used for**:
  - Serving the API endpoints under `/api/...`
  - Serving uploaded images (if configured) under `/public/...`
  - Serving the built monitoring dashboard from `backend/public/dashboard` (your app routes it as `/wsp/dashboard/`).
- **What you should see**: Console logs from the backend indicating it is listening on a port (commonly `3000`).
- **Stop**: `Ctrl + C`

### Run backend (dev auto-reload)

```bash
cd backend
npm run dev
```

- **Does**: Runs `node --watch server.js` which restarts the server when files change.
- **When to use**: While actively developing backend controllers/routes/services.
- **Note**: This is not a production process manager; it’s for local dev.

---

## Frontend – Mobile App (`frontend/`)

### Install dependencies

This section covers the **mobile inspection app**.

```bash
cd frontend
npm install
```

- **Does**: Installs Expo / React Native dependencies into `frontend/node_modules/`.
- **When to use**: First setup, after pulling changes, or if the app fails to start due to missing packages.

### Start Expo dev server (Metro)

```bash
cd frontend
npm start
```

- **Does**: Starts Expo’s dev server (Metro bundler) and provides a QR / URL to open the app on a device/emulator.
- **When to use**: Normal day-to-day mobile development (fast refresh, easy testing).
- **What you should see**: Terminal output showing Metro is running, and a QR code (if in interactive mode).

### Run on Android (device/emulator)

```bash
cd frontend
npm run android
```

- **Does**: Runs `expo run:android`, which builds the native Android project and installs/runs it on an emulator or connected device.
- **When to use**: When you need native modules or a full native build (not just Expo Go).
- **Prereqs**: Android Studio + SDK, and an emulator/device available.

### Run on iOS (macOS only)

```bash
cd frontend
npm run ios
```

- **Does**: Runs `expo run:ios`, which builds and runs the native iOS app.
- **When to use**: iOS testing with a native build.
- **Prereqs**: macOS + Xcode (this will not work on Windows).

### Run in web browser

```bash
cd frontend
npm run web
```

- **Does**: Runs the Expo app in a web browser.
- **When to use**: Quick UI checks without a device/emulator (not all native behavior matches mobile).

---

## Monitoring Dashboard (`monitoring-dashboard/`)

### Install dependencies

```bash
cd monitoring-dashboard
npm install
```

- **Does**: Installs the dashboard’s React/Vite dependencies into `monitoring-dashboard/node_modules/`.
- **When to use**: First setup, after pulling changes, or if the build/dev server fails due to missing packages.

### Run dashboard in dev mode (hot reload)

```bash
cd monitoring-dashboard
npm run dev
```

- **Does**: Starts Vite dev server with hot reload.
- **When to use**: While developing the dashboard UI locally (fastest feedback loop).
- **URL**: Usually `http://localhost:5173` (Vite will print the exact URL).
- **Note**: This serves the dashboard directly from Vite, not from `backend/public/dashboard`.

### Build dashboard for production

```bash
cd monitoring-dashboard
npm run build
```

- **Does**: Produces a production build in `monitoring-dashboard/dist/` (optimized JS/CSS/assets).
- **When to use**: Before deploying/serving the dashboard from the backend.
- **Prefer**: Use `npm run build:dashboard` from repo root to build **and** copy into the backend in one step.

### Preview production build locally

```bash
cd monitoring-dashboard
npm run preview
```

- **Does**: Serves the already-built `dist/` folder locally, so you can sanity-check the production bundle.
- **When to use**: When `npm run dev` looks fine but production behaves differently.

### Lint dashboard code

```bash
cd monitoring-dashboard
npm run lint
```

- **Does**: Runs ESLint on the dashboard codebase.
- **When to use**: Before committing changes or when you suspect a subtle JS/React issue.

---

## Build Script (PowerShell) (`scripts/`)

### Build + copy (directly run the script)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\build_dashboard.ps1
```

- **Does**:
  - Builds `monitoring-dashboard` (`npm run build`)
  - Cleans `backend/public/dashboard`
  - Copies `monitoring-dashboard/dist/*` → `backend/public/dashboard`
- **When to use**: If you want to run the PowerShell script directly (instead of through npm).
- **Used by**: `npm run build:dashboard` (root).
- **Common failure causes**:
  - `npm` not available in PATH
  - dashboard dependencies not installed (`cd monitoring-dashboard && npm install`)

---

## Android / Gradle (`frontend/android/`)

### Build debug APK

**Option A (Git Bash / WSL / macOS / Linux):**

```bash
cd frontend/android
./gradlew assembleDebug
```

**Option B (Windows PowerShell / CMD):**

```powershell
cd frontend\\android
.\\gradlew.bat assembleDebug
```

- **Output**: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- **When to use**: You want a debuggable APK for testing on a device without doing a release/signing flow.
- **Note**: This builds the native Android project directly via Gradle (lower level than Expo commands).

### Build release APK

**Option A (Git Bash / WSL / macOS / Linux):**

```bash
cd frontend/android
./gradlew assembleRelease
```

**Option B (Windows PowerShell / CMD):**

```powershell
cd frontend\\android
.\\gradlew.bat assembleRelease
```

- **Note**: Requires signing config for release builds.
- **When to use**: You need a release APK for distribution/testing (closer to what users install).
- **Important**: Release builds typically require keystore/signing configs.

### Clean Android build

**Option A (Git Bash / WSL / macOS / Linux):**

```bash
cd frontend/android
./gradlew clean
```

**Option B (Windows PowerShell / CMD):**

```powershell
cd frontend\\android
.\\gradlew.bat clean
```

- **Does**: Clears Gradle build outputs and caches for the Android project.
- **When to use**: When you get weird build errors after dependency changes, or you switched branches and builds started failing.

### Install debug on connected device/emulator

**Option A (Git Bash / WSL / macOS / Linux):**

```bash
cd frontend/android
./gradlew installDebug
```

**Option B (Windows PowerShell / CMD):**

```powershell
cd frontend\\android
.\\gradlew.bat installDebug
```

- **Does**: Builds (if needed) and installs the debug APK onto a connected device/emulator.
- **When to use**: Quick “build + install” loop when you already have Android tooling set up.

---

## Database / Seeding scripts (Backend) (`backend/scripts/`)

### Run any script

```bash
cd backend
node scripts/<script_name>.js
```

- **Does**: Runs a Node script in the backend context (usually for DB setup, seeding, migration, verification).
- **Prereqs**: Backend dependencies installed and DB configured (see `backend/config/db.js`).

### Common scripts

```bash
cd backend
node scripts/create_reporting_tables.js
node scripts/recompute_projection.js
node scripts/create_admin.js
node scripts/create_test_user.js
node scripts/seedReasonsNow.js
node scripts/seedUndergear.js
node scripts/seedUndergearFull.js
node scripts/seed_cai_reasons.js
node scripts/seed_cai_reasons2.js
```

- **Does**: Creates tables / recomputes reporting projection / seeds master data / creates users.
- **When to use**:
  - After a fresh DB setup (create tables + seed)
  - After changing reporting/projection logic (recompute projection)
  - When you need baseline users (create admin/test user)

---

## Ports & URLs

- **Backend API**: `http://localhost:3000`
- **Monitoring Dashboard (served by backend)**: `http://localhost:3000/wsp/dashboard/`
- **Monitoring Dashboard (Vite dev)**: `http://localhost:5173`
- **Expo Metro**: `http://localhost:8081` (or QR code)

- **Tip**: If the dashboard UI isn’t updating on `:3000`, make sure you rebuilt+copied it (`npm run build:dashboard`) and refresh the browser (hard refresh helps).
