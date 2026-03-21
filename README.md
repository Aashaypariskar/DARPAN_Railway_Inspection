# 🚆 Railway Inspection Suite

The **Railway Inspection Suite** is an enterprise-grade, full-stack ecosystem designed for high-stakes railway coach audits. This suite facilitates real-time mobile inspections, synchronized defect tracking, and a centralized web-based management dashboard. Built for reliability in the field and data clarity in the office, it ensures every audit is backed by verifiable evidence.

---

## 🌟 Project Overview

This suite digitizes the complex manual inspection workflows of modern railways. It empowers inspectors with a mobile-first checklist experience while providing management with a live, data-driven window into fleet health across multiple modules.

### Key Capabilities
- **Multi-Module Support**: Native workflows for **WSP**, **SICKLINE**, **COMMISSIONARY**, **PITLINE**, and **CAI**.
- **Data Integrity (Polymorphic Model)**: A specialized database design that handles diverse fleet data (trains/coaches) from different master tables within a single unified answer system.
- **Smart Evidence Pipeline**: Mandatory reason-tagging and automatic background photo synchronization to the server.
- **Resilient Sync**: Real-time progress persistence ("Autosave") ensures zero data loss during connectivity drops.
- **Unified Monitoring**: A centralized React dashboard serving as a "Single Source of Truth" for all inspection modules.

---

## 🏗️ System Architecture

### 1. Polymorphic Data Model
The hub of the system is the `inspection_answers` table. To support multiple modules without database bloat, we use a **Polymorphic Reference** pattern:
- **Discriminator**: Every record has a `module_type` (e.g., `PITLINE`, `WSP`).
- **Dynamic Mapping**: The `train_id` and `coach_id` refer to different master tables depending on the module. Physical Foreign Keys are disabled (`{ constraints: false }`) in the ORM to allow this flexibility.

### 2. Forensic Metadata Snapshots
To prevent historical audits from changing when master data (like question text) is edited, the system captures **Snapshots** at the point of entry. Fields like `question_text_snapshot` and `category_name` are stored directly in the answer record.

### 3. Proof-of-Defect (Media Pipeline)
The mobile app features an automated "Upload-before-Save" interceptor.
1. Inspector takes a photo.
2. In the background, the app calls `/upload-photo` and receives a server URL.
3. The server URL is then saved in the database, ensuring the web dashboard can render the evidence immediately (unlike local `file://` URIs).

---

## 📁 Project Structure

```text
Railway_Inspection/
├── backend/                    # Node.js + Express API
│   ├── config/                 # DB (Sequelize) & Environment configs
│   ├── controllers/            # Inspection, Admin, & Auth logic (The Brain)
│   ├── routes/                 # Express API endpoint definitions
│   ├── models/                 # Sequelize schemas (InspectionAnswer.js, Train.js)
│   ├── services/               # Complex logic (Unified Monitoring & Reporting)
│   ├── utils/                  # Path & Image normalization helpers (pathHelper.js)
│   ├── public/                 
│   │   ├── dashboard/          # Production-built React Dashboard files
│   │   └── uploads/            # Central storage for inspection photos
│   ├── scripts/                # Database migrations & master data seeding
│   ├── server.js               # Main application entry & socket initialization
│   └── package.json            # Backend dependencies
├── frontend/                   # React Native (Expo) Mobile App
│   ├── src/
│   │   ├── api/                # api.js (Axios wrapper with photo interceptors)
│   │   ├── components/         # QuestionCards, ImagePickers, & Common UI
│   │   ├── navigation/         # Dynamic AppNavigator & Routing
│   │   ├── screens/            # Inspection Flows (Questions, Defects, Dashboard)
│   │   ├── store/              # StoreContext.js (Global state & offline logic)
│   │   ├── config/             # Theme tokens and environment URLs
│   │   └── utils/              # Data normalization & date helpers
│   ├── App.js                  # App root and Provider setup
│   └── package.json            # Mobile app dependencies
└── monitoring-dashboard/       # React (Vite) Web Portal
    ├── src/
    │   ├── api/                # monitoringApi.js & reportsApi.js
    │   ├── components/         # Admin UI, Charts, & Defect Feed
    │   ├── pages/              # Main Views (Dashboard, Users, Defect Log)
    │   ├── context/            # AuthContext & Theme management
    │   └── utils/              # URL & formatting helpers
    ├── vite.config.js          # Deployment & base path configuration
    └── package.json            # Dashboard dependencies
```

---

## 🚀 Installation & Deployment

### 1. Database Setup
- Install MySQL and create a database named `inspection_db`.
- Update `backend/config/db.js` with your local credentials.

### 2. Initialize Backend
```bash
cd backend
npm install
node seedEndToEnd.js  # This is vital; it builds the master fleet data
node server.js        # Server goes live on port 3000
```

### 3. Build & Deploy Dashboard
To serve the dashboard via the backend:
```bash
cd monitoring-dashboard
npm install
npm run build         # Generates the 'dist' folder
# The build is automatically served at: https://your-server.in/dashboard
```

### 4. Launch Mobile App
```bash
cd frontend
npm install
# Change BASE_URL in frontend/src/config/environment.js to your IP
npx expo start
```

---

## 🔗 Key API Reference

| Human-Friendly Endpoint | Method | Context |
| :--- | :--- | :--- |
| `/api/inspection/autosave` | `POST` | The system heartbeat; handles polymorphic ID resolution. |
| `/api/monitoring/defects` | `GET` | Aggregated feed for the Dashboard (Deep Salvage enabled). |
| `/api/upload-photo` | `POST` | Centralized multipart handler for inspection evidence. |
| `/api/auth/login` | `POST` | Secure role-based access for Inspectors and Admins. |

---

Built for Performance. Optimized for Clarity. 🏁
