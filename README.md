<div align="center">

# ⚡ KRONOS
### Next-Gen Multi-User Study OS & Analytics Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Turso](https://img.shields.io/badge/Turso_/_SQLite-00E599?style=for-the-badge&logo=sqlite&logoColor=black)](https://turso.tech/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>A cyber-glassmorphic, cloud-persistent study companion engineered for deep focus, consistency tracking, and granular time analytics.</b>
</p>

[✨ Live Demo](#) • [🚀 Quick Start](#-quick-start) • [⚡ Features](#-features) • [🛠️ Tech Stack](#️-tech-stack) • [⚙️ Configuration](#️-environment-variables)

---

</div>

## 🌟 Overview

**KRONOS** is an ultra-modern, aesthetic study platform designed for high-performance learners, engineers, and researchers. Moving beyond simplistic checklists, KRONOS provides deep analytical insights into your focus patterns, study consistency, subject target mastery, and cognitive load.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Framer Motion**, and a resilient **Hybrid SQLite / Turso database architecture**, it delivers seamless instant responses both offline locally and synced to the cloud globally.

---

## ⚡ Features

### ⏱️ Live Study Session Tracker & Stopwatch
- **Real-Time Timer:** Dynamic focus stopwatch with pause/resume and quick duration logging.
- **Granular Session Metrics:** Record topics covered, focus ratings (1–5 ⭐), interruptions count, and comprehensive study notes.
- **Active Progress Tracking:** Live visual comparison against daily subject targets.

### 🟩 GitHub-Style Consistency & Streak Heatmap
- **Interactive Matrix:** Full year-at-a-glance study heatmap mapped to custom intensity levels (0–4).
- **Streak Detection:** Automatic calculation of current active streak, longest unbroken streak, total hours logged, and completion percentages.
- **Hover Inspections:** Micro-tooltips revealing daily hours, topics, and breakdown on hover.

### 📊 Deep Analytics Matrix & Recharts Visualizations
- **Study Volume Trends:** Interactive charts detailing daily and weekly hour distributions.
- **Subject Allocation:** Visual donut & area graphs demonstrating time balance across all registered disciplines.
- **Focus vs. Interruption Correlation:** In-depth scatter and bar analytics highlighting optimal study conditions.
- **Day-of-Week Mastery:** Breakdown of peak performance days to optimize revision scheduling.

### 🧠 Intelligent AI Productivity Insights
- **Pattern Recognition:** Algorithmic detection of neglected subjects, burnout risks, and peak focus windows.
- **Actionable Recommendations:** Automated actionable guidance tailored to your real study habits.

### 📅 Dynamic Calendar & Timeline History
- **Interactive Calendar View:** Browse your entire historical trajectory day by day.
- **Timeline Inspection:** Modal-level details of historical logs with edit and delete capabilities.

### 🎯 Subject Management & Target Engine
- **Custom Categorization:** Create subjects with custom HEX colors, iconography, and target allocations.
- **Target Customization:** Configure independent daily and weekly hourly goals and targeted study days per week.
- **Archiving Support:** Safely archive completed terms or courses without losing historical analytics.

### 🔐 Secure Multi-User Authentication
- **Private Accounts:** Dedicated data isolation for each user via JWT session tokens and Bcrypt password hashing.
- **Seamless Onboarding:** Instant default subjects and sample templates seeded on account registration.

### ☁️ Hybrid Local & Cloud Persistence
- **Local Fallback:** High-speed, zero-config `better-sqlite3` storage for local development.
- **Turso Cloud DB:** Zero-friction cloud deployment powered by `@libsql/client` with automated schema migrations.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/), [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), Glassmorphism, Cyberpunk Dark Aesthetic |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Visualizations** | [Recharts](https://recharts.org/), [Lucide React Icons](https://lucide.dev/) |
| **Database** | [Turso (LibSQL)](https://turso.tech/) / [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) |
| **Auth & Security** | [Jose (JWT)](https://github.com/panva/jose), [Bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Typography** | [Geist Sans & Geist Mono](https://vercel.com/font) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`, `pnpm`, or `yarn`

### 1. Clone the Repository
```bash
git clone https://github.com/Akshat-rvce/KRONOS-TIMETABLE.git
cd KRONOS-TIMETABLE
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional: Turso Cloud Database (Omit to use local SQLite)
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

> 💡 **Note:** If `TURSO_DATABASE_URL` is omitted, KRONOS will automatically create and use a local `timetable.db` SQLite database with WAL mode enabled.

### 4. Launch Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start tracking.

---

## 📂 Project Structure

```
├── public/                # Static assets & icons
├── src/
│   ├── app/               # Next.js App Router Pages & API Routes
│   │   ├── analytics/     # In-depth analytics dashboard & Recharts
│   │   ├── api/           # Backend REST endpoints (auth, entries, subjects, stats)
│   │   ├── calendar/      # Calendar navigation & history views
│   │   ├── login/         # Authentication & registration portal
│   │   ├── subjects/      # Subject management & configuration
│   │   ├── globals.css    # Custom glassmorphic styles & design system
│   │   ├── layout.tsx     # Root layout with theme & AuthProvider
│   │   └── page.tsx       # Main dashboard, live timer & quick logging
│   ├── components/        # Reusable React components
│   │   ├── ui/            # Cyber-styled buttons, badges, and glass cards
│   │   ├── AnalyticsMatrix.tsx  # Analytics charts and trends
│   │   ├── DashboardStats.tsx   # Top-level KPI counter cards
│   │   ├── InsightsPanel.tsx    # Intelligent productivity insights
│   │   ├── LogEntryForm.tsx     # Session creation & timer modal
│   │   ├── Navigation.tsx       # Floating glassmorphic navigation bar
│   │   └── StudyHeatmap.tsx     # GitHub-style contribution heatmap
│   ├── context/           # React Context providers (AuthContext)
│   └── lib/               # Database client, auth utilities & analytics engine
│       ├── analyticsEngine.ts   # Metric computations & streak aggregations
│       ├── auth.ts              # JWT token management & session validation
│       ├── db.ts                # Dual-mode Turso / Better-SQLite3 interface
│       ├── insightsService.ts   # Heuristic rule-based productivity advisor
│       └── types.ts             # Global TypeScript interfaces
├── package.json
└── tsconfig.json
```

---

## ⚙️ Environment Variables

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `JWT_SECRET` | **Yes** | Secret encryption key used to sign JWT session cookies | `kronos_super_secret_key_...` |
| `TURSO_DATABASE_URL` | *Optional* | URL to remote Turso database instance | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | *Optional* | Auth token for remote Turso access | `eyJhbGci...` |

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with hot-reload at `localhost:3000` |
| `npm run build` | Compiles and optimizes the production build |
| `npm run start` | Boots the optimized production server |
| `npm run lint` | Runs ESLint checks across all TypeScript and React files |

---

## 🔒 Security & Data Privacy

- **Data Ownership:** All data belongs to the respective authenticated user with strict database foreign-key isolation and cascade deletion.
- **Password Protection:** User passwords are never stored in plaintext and are hashed using bcrypt with salted rounds.
- **Stateless Sessions:** Auth is powered by secure, `HttpOnly`, `SameSite=Lax` JSON Web Tokens (JWT).

---

## 🤝 Contributing

Contributions, feature suggestions, and pull requests are warmly welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/EpicFeature`)
3. Commit your Changes (`git commit -m 'feat: Add an EpicFeature'`)
4. Push to the Branch (`git push origin feature/EpicFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Engineered with precision for lifelong learners. Built by <a href="https://github.com/Akshat-rvce">Akshat</a>.</sub>
</div>
