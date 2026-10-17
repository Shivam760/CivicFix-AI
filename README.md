# CivicFix AI — Premium Authentication & Citizen Portal

A production-quality, accessible, and responsive authentication experience built with React, Vite, Tailwind CSS v4, Framer Motion, and Lucide Icons, faithfully implementing the reference designs from `CivicFix_AI_Login_Design_v4.pdf`.

---

## 🏛️ Project Overview

**CivicFix AI** is an AI-assisted civic issue reporting and municipal grievance platform. Citizens can report infrastructure issues (damaged roads, potholes, garbage accumulation, streetlights, drainage problems) while AI assists in categorizing complaints and matching verified municipal authorities.

This authentication module delivers a high-trust, polished civic technology experience designed for college project demonstrations and production deployment.

---

## 🎨 Design System & Reference Fidelity

| Element | Reference PDF Specification | Deep Municipal Authority Implementation |
|---|---|---|
| **Branding** | Top branding with green civic dot + `CivicFix AI` | Institutional Shield Crest, emerald status indicator, and official `AUTHORITY` badge |
| **Color Palette** | Reference layout & structure | Midnight Navy (`#0A1329`), Civic Emerald (`#10B981`), Slate surfaces (`#F8FAFC`) |
| **Input Fields** | Pill-shaped capsule border (`rounded-full`) with notched floating top label | Notched floating field with leading civic icons (`Mail`, `Lock`, `Phone`), glass depth, and focus rings |
| **Password Field** | Eye toggle icon inside field | Accessible toggle with Microsoft Edge `-ms-reveal` reset preventing duplicate icons |
| **Civic Illustration** | 3D pedestal, city buildings, municipal green bin, pothole, map pin, "Report received" card | High-resolution dusk cityscape with breathing streetlights, LiDAR surface scan, GPS radar, and municipal dispatch ticket (`#CF-4821`) |
| **Social Auth** | Circular buttons `G`, `f`, `A` with `- or -` separator | Official Google (4-color), Facebook (Meta blue), and Apple (monochrome) vector logos in frosted glass buttons |
| **Layout Symmetry** | **Login Desktop**: Form Left, Artwork Right<br>**Sign-Up Desktop**: Artwork Left, Form Right<br>**Mobile**: Single-column vertical flow | Asymmetric dual-authority split desktop with 3D tilt perspective and single-column mobile flow |

---

## 🚀 Routes & Role-Based Access Control

CivicFix AI features three distinct role-based dashboards protected by a centralized `<ProtectedRoute />` guard with nested routing (`<Outlet />`):

- `/citizen/dashboard` — Citizen Grievance Console (reporting, real-time ticket progress tracking)
- `/citizen/report` — Dedicated civic issue intake form
- `/committee/dashboard` — Committee Member Triage & Verification Queue (inspections, officer notes, authority dispatch)
  - `/committee/authorities` — Municipal authority directory sub-view
- `/admin/dashboard` — Platform Administrator Governance Console (city-wide aggregations, SLA metrics)
  - `/admin/analytics` — SLA adherence and zonal grievance distributions
  - `/admin/users` — Role-based user governance and account management
  - `/admin/authorities` — Municipal department directory registry
  - `/admin/activity` — Immutable audit trail
- `/` or `/landing` — CivicFix AI interactive landing page featuring 3D visuals, zonal telemetry map, AI intake showcase, and role entrypoints
- `/login` — Citizen Login page with in-memory session handling and expired session detection
- `/signup` — Citizen Registration page with real-time password strength meter
- `/forgot-password` — Secure password recovery workflow
- `/dashboard` — Role switcher preview (**DEV only**, tree-shaken in production)

### 🔒 Route Guards & Security Invariants
- **`ProtectedRoute`**: Inspects the active user session and role. Unauthenticated requests are redirected to `/login`.
- **Session Survival**: The access token resides in memory (`authStorage`) to mitigate XSS attacks. If the token is lost on page reload while the session marker exists, the user is redirected to `/login?expired=true` with a clear "Session expired, please sign in again" alert.
- **Role Isolation**: Mismatched roles (e.g. citizen accessing `/admin/*`) are safely redirected to their own role's dashboard.
- **Production Gating**: All dev simulation switches, role preview selectors, and mock diagnostic banners are gated with `import.meta.env.DEV` and strictly tree-shaken from production builds.

---

## 🔌 API Layer & Backend Integration Contracts

Centralized in `src/services/apiClient.js` (and re-exported through `src/api/authApi.js`):
- **Unified Client**: Consolidated HTTP engine with in-memory token injection (`Authorization: Bearer <token>`).
- **Configurable Timeouts**: Default 5000ms per request, with health probes at 3000ms.
- **10-Second Offline Circuit Breaker**: Prevents browser freezes and unnecessary requests when the FastAPI backend is offline.
- **Automatic 401 Handling**: Clears credentials and redirects to login on token expiration or invalidation.

---

## 🛡️ Developer Simulation Mode

To enable demonstration and evaluation even before the backend team finishes the database schema or while the FastAPI server is offline:
- In development mode (`npm run dev`), the floating status pill (`Backend Offline` / `FastAPI Connected`) allows toggling **Developer Simulation Mode**.
- Test form validation, role-based dashboards, and protected routes with zero live server dependencies.
- In production builds (`npm run build`), all simulation controls are completely excluded.

---

## 🧪 Automated Testing & Verification

Run the comprehensive end-to-end browser test suite:

```bash
npm test
```

### Cross-Platform Browser Support:
The test suite supports custom browser binaries via the `PUPPETEER_EXECUTABLE_PATH` environment variable, falling back gracefully to local browser installations (Edge/Brave) or Puppeteer's bundled Chromium:

```bash
# On Linux / macOS:
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome npm test

# On Windows (PowerShell):
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"; npm test
```

### Verified Assertions:
1. **Invalid Login**: Submitting invalid credentials or empty fields verifies inline `#email-error` / `#password-error` visibility.
2. **Valid Dev Login**: Submitting valid dev credentials navigates to `/citizen/dashboard`.
3. **Route Guards**: Unauthenticated navigation to `/admin/dashboard` automatically redirects to `/login`.
4. **Password Visibility**: Toggling the password eye button cycles input type between `password` and `text`.
5. **Zero Leaks**: Production bundle verification confirms dev simulation and diagnostics are 100% tree-shaken.

Captured screenshots are saved in `screenshots/`:
- `01_login_desktop.png` (1440x900)
- `02_login_validation_errors.png` (Form error states)
- `03_login_mobile.png` (390x844 mobile viewport)
- `04_signup_weak_password.png` (Real-time strength meter)
- `05_signup_strong_password.png` (Satisfied strength criteria)
- `06_signup_mobile.png` (Sign-Up mobile viewport)
- `07_forgot_password_desktop.png` (Password recovery desktop)
- `08_forgot_password_mobile.png` (Password recovery mobile)
- `09_dashboard_authenticated.png` (Authenticated citizen view)
- `10_unauth_admin_redirect.png` (Route guard redirect to login)

---

## 🛠️ Quickstart

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run code linter
npm run lint

# Run production build
npm run build

# Run automated browser tests
npm test
```
