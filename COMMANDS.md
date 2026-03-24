# 🚀 Project Commands Reference (FINAL - Dev / Staging / Production)

This file lists all commands and workflows for the Railway Inspection System.

---

# 🧠 ENVIRONMENTS

```text
development → local machine
staging     → uatdarpan.premade.in
production  → darpan.premade.in
```

---

# 🟢 1. DEVELOPMENT (LOCAL)

## Backend

```bash
cd backend
npm install
npm run dev
```

* Runs backend with auto reload
* API → http://localhost:8080/api

---

## Monitoring Dashboard (Dev)

```bash
cd monitoring-dashboard
npm install
npm run dev
```

* Runs Vite dev server
* URL → http://localhost:3001

---

## Mobile App (Expo)

```bash
cd frontend
npm install
npx expo start --clear
```

* Uses local backend:

```
http://<your-ip>:8080/api
```

---

## ✅ DEV FLOW

```text
Mobile / Dashboard → localhost backend → staging DB
```

---

# 🟡 2. STAGING (UAT)

## Backend (Server)

```bash
cd backend
npm install
npm run staging
```

* API → https://uatdarpan.premade.in/api

---

## Dashboard (Clean + Build + Preview)

```bash
cd monitoring-dashboard
npm run build:staging
npm run preview:staging
```

---

## Deploy Dashboard to Backend

```bash
cd ..
npm run build:dashboard
```

* Copies dist → backend/public/dashboard

---

## Mobile (Staging)

```bash
cd frontend
EXPO_PUBLIC_ENV=staging npx expo start
```

---

## ✅ STAGING FLOW

```text
Dashboard → uatdarpan API → staging DB
Mobile   → uatdarpan API → staging DB
```

---

# 🔴 3. PRODUCTION (LIVE)

## Backend (Server)

```bash
cd backend
npm install
npm run prod
```

* API → https://darpan.premade.in/api

---

## Dashboard (Clean + Build)

```bash
cd monitoring-dashboard
npm run build:prod
```

---

## Deploy Dashboard

```bash
cd ..
npm run build:dashboard
```

---

## Mobile (Production)

```bash
cd frontend
EXPO_PUBLIC_ENV=production npx expo start
```

OR build APK:

```bash
npx expo build
```

---

## ✅ PROD FLOW

```text
Users → darpan API → production DB
```

---

# 🧹 CLEAN + BUILD (AUTOMATED)

No manual delete needed:

```bash
npm run build:dev
npm run build:staging
npm run build:prod
```

---

# 🧪 VERIFY ENVIRONMENT

## Backend Health

```bash
http://localhost:8080/api/health
http://192.168.1.12:8080/api/health
```

---

## Frontend Check (DevTools → Network)

| Env     | API       |
| ------- | --------- |
| Dev     | localhost |
| Staging | uatdarpan |
| Prod    | darpan    |

---

# ⚠️ COMMON ISSUES

## Mobile not connecting

```bash
ipconfig
```

Update IP in config

---

## CORS error

Fix backend:

```js
app.use(cors({
  origin: ["localhost", "uatdarpan", "darpan"]
}))
```

---

## Wrong API used

Check Network tab → Request URL

---

# ⚡ OPTIONAL: FULL STACK COMMAND

```bash
npm run dev:full
npm run staging:full
npm run prod:full
```

---

# 🧠 FINAL ARCHITECTURE

```text
DEV      → localhost
STAGING  → uatdarpan
PROD     → darpan
```
