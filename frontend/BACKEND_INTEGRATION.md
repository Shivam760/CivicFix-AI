# CivicFix AI — Frontend-to-Backend Integration Guide
## Complete Technical Specification for FastAPI & PostgreSQL Integration

> **Document Version:** 1.0.0  
> **Target Stack:** FastAPI (Python 3.10+), SQLAlchemy 2.0 / asyncpg, PostgreSQL 14+, Pydantic v2  
> **Frontend Stack:** React 19, Vite, Tailwind CSS v4, Lucide React  
> **Repository Context:** `CivicFix AI` — Municipal Grievance & Civic Infrastructure Platform  

---

## Table of Contents
1. [Architecture Overview & Integration Philosophy](#1-architecture-overview--integration-philosophy)
2. [Role-Based Access Control (RBAC) Hierarchy](#2-role-based-access-control-rbac-hierarchy)
3. [Frontend Route & Security Matrix](#3-frontend-route--security-matrix)
4. [Centralized API Client & Authentication Layer](#4-centralized-api-client--authentication-layer)
5. [Complete FastAPI Endpoint Catalog](#5-complete-fastapi-endpoint-catalog)
   - [Authentication & Identity](#authentication--identity-endpoints)
   - [Citizen Portal Endpoints](#citizen-portal-endpoints)
   - [Committee Operations Endpoints](#committee-operations-endpoints)
   - [Administrator Governance Endpoints](#administrator-governance-endpoints)
6. [Critical Security Invariants & Data Isolation](#6-critical-security-invariants--data-isolation)
7. [PostgreSQL Database Schema (DDL & SQLAlchemy Models)](#7-postgresql-database-schema-ddl--sqlalchemy-models)
8. [FastAPI Security & Dependency Injection Recipes](#8-fastapi-security--dependency-injection-recipes)
9. [Analytical SQL Aggregation Queries for Admin Console](#9-analytical-sql-aggregation-queries-for-admin-console)
10. [Frontend Code Reference Map (`// BACKEND INTEGRATION:`)](#10-frontend-code-reference-map)
11. [Step-by-Step Backend Developer Checklist](#11-step-by-step-backend-developer-checklist)

---

## 1. Architecture Overview & Integration Philosophy

CivicFix AI implements an **Offline-First Agile Service Architecture** on the frontend:
- **Centralized API Client (`src/services/apiClient.js`):** All HTTP requests pass through a consolidated client module (which also re-exports to `src/api/authApi.js`). The JWT access token is stored safely **in memory** (`authStorage`), preventing XSS token exfiltration. Requests automatically inject `Authorization: Bearer <token>`.
- **Configurable Timeouts:** Timeouts are configurable per request (defaulting to 5000ms, with health probe checks at 3000ms).
- **Fast Offline Circuit Breaker:** When the FastAPI backend on `http://localhost:8000` is offline during frontend development, a 10-second circuit breaker prevents freezing the browser or repeating dead network requests, falling back seamlessly to dev mock fixtures.
- **Session Handling & Safe Refresh:** `sessionStorage` tracks session authentication (`civicfix_authenticated = 'true'`). When a page refresh occurs and the in-memory access token is lost, route guards and `apiClient` cleanly clear session artifacts and redirect to `/login?expired=true` displaying a user-friendly expiration alert. HTTP 401 responses also automatically clear the session and redirect.
- **Environment Driven:** The backend base URL is controlled by `VITE_API_BASE_URL` in `.env` (defaults to `http://localhost:8000` if not set).

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                     │
│   (Citizen Dashboard, Committee Desk, Admin Console)        │
└───────────────┬───────────────────────────────▲─────────────┘
                │ HTTP / JSON                   │ JWT Bearer
                ▼                               │ Responses
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI REST Backend (Port 8000)             │
│   - CORS Middleware (allow credentials, origins: localhost) │
│   - OAuth2 Bearer Token Extraction                          │
│   - RBAC Role Permission Dependency (Citizen, Committee,    │
│     Admin)                                                  │
└───────────────┬───────────────────────────────▲─────────────┘
                │ Async SQL / ORM Queries       │
                ▼                               │
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL Relational DB                    │
│   - Table: users (citizens, officers, admins)               │
│   - Table: complaints (grievances with geo-coordinates)     │
│   - Table: authorities (verified municipal departments)    │
│   - Table: complaint_timeline & complaint_notes             │
│   - Table: audit_logs (immutable ledger)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Role-Based Access Control (RBAC) Hierarchy

The frontend strictly partitions functionalities across three roles defined in `src/constants/roles.js`:

| Role Identifier | Enum Value | Intended User Persona | Key Capabilities & Boundaries |
| :--- | :--- | :--- | :--- |
| **Normal Citizen** | `citizen` | Resident / Civic Complainant | Reports local issues with photos & coordinates; tracks own submitted grievances; views public timeline updates; **CANNOT** view other citizens' grievances; **CANNOT** see internal officer notes. |
| **Committee Member** | `committee` | Municipal Zonal Officer / Engineer | Assigned case queue; status transition workflows (`in_progress`, `resolved`, `rejected`); posts restricted internal officer notes; posts citizen-facing updates; forwards cases to verified municipal authorities. |
| **Platform Administrator** | `admin` | Chief Municipal Administrator | System-wide oversight; live analytical aggregations; RBAC user management (role promotion & account suspension); municipal authority directory management; immutable system audit logging. |

---

## 3. Frontend Route & Security Matrix

| Role | Frontend Path | Component | Required Backend Endpoints |
| :--- | :--- | :--- | :--- |
| **Citizen** | `/citizen/dashboard` | `CitizenDashboardPage.jsx` | `GET /api/v1/citizen/overview`<br>`GET /api/v1/citizen/complaints` |
| **Citizen** | `/citizen/report` | `CitizenReportPage.jsx` | `POST /api/v1/complaints` |
| **Citizen** | `/citizen/complaints` | `CitizenDashboardPage.jsx` | `GET /api/v1/citizen/complaints` |
| **Citizen** | `/citizen/complaints/:id` | `CitizenDashboardPage.jsx` | `GET /api/v1/complaints/{id}` |
| **Committee** | `/committee/dashboard` | `CommitteeDashboardPage.jsx` | `GET /api/v1/committee/overview`<br>`GET /api/v1/committee/queue` |
| **Committee** | `/committee/complaints` | `CommitteeDashboardPage.jsx` | `GET /api/v1/committee/queue` |
| **Committee** | `/committee/authorities`| `CommitteeDashboardPage.jsx` | `GET /api/v1/admin/authorities` |
| **Admin** | `/admin/dashboard` | `AdminDashboardPage.jsx` | `GET /api/v1/admin/analytics`<br>`GET /api/v1/committee/queue` |
| **Admin** | `/admin/analytics` | `AdminDashboardPage.jsx` | `GET /api/v1/admin/analytics` |
| **Admin** | `/admin/users` | `AdminDashboardPage.jsx` | `GET /api/v1/admin/users`<br>`PATCH /api/v1/admin/users/{id}/role` |
| **Admin** | `/admin/authorities` | `AdminDashboardPage.jsx` | `GET /api/v1/admin/authorities`<br>`POST /api/v1/admin/authorities` |
| **Admin** | `/admin/activity` | `AdminDashboardPage.jsx` | `GET /api/v1/admin/activity` |
| **All Roles**| `/dashboard` | `DashboardPreview.jsx` | Session role dispatcher (redirects to appropriate portal) |
| **Public** | `/` or `/landing` | `LandingPage.jsx` | Static / Showcase (No authentication required) |
| **Public** | `/login` | `LoginPage.jsx` | `POST /api/v1/auth/login` |
| **Public** | `/signup` | `SignUpPage.jsx` | `POST /api/v1/auth/register` |
| **Public** | `/forgot-password` | `ForgotPasswordPage.jsx` | `POST /api/v1/auth/forgot-password` |

---

## 4. Centralized API Client & Authentication Layer

### Token Storage and Injection
The frontend stores authentication tokens securely **in memory** to safeguard against cross-site scripting (XSS):
- **In-Memory Access Token:** Kept exclusively in JavaScript closure state (`authStorage` in `src/services/apiClient.js`). It is never written to `localStorage` or `sessionStorage`.
- **Session Authentication Marker:** `sessionStorage.getItem('civicfix_authenticated') === 'true'` designates an active browser tab session.
- **Active User Profile:** `sessionStorage.getItem('civicfix_active_user')` stores display metadata (`{ id, name, email, role }`).
- **Remembered Email (Optional):** `localStorage.getItem('civicfix_remembered_email')` stores only the user's email address if they explicitly check "Remember Me". Passwords and authentication tokens are never placed in persistent browser storage.
- **Session Expiry & 401 Interception:** On page refresh (when in-memory token is cleared) or upon receiving an HTTP 401 Unauthorized response, `apiClient` and `ProtectedRoute` invalidate the session and redirect to `/login?expired=true`.

### Standard Request Headers
Every request made via `src/services/apiClient.js` automatically includes:
```http
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
Accept: application/json
```

*(For file uploads to `POST /api/v1/complaints`, `Content-Type` is omitted so the browser automatically calculates `multipart/form-data; boundary=...`)*.

---

## 5. Complete FastAPI Endpoint Catalog

### Authentication & Identity Endpoints

#### 1. `POST /api/v1/auth/login`
- **Purpose:** Authenticates user credentials and issues a JWT token.
- **Request Body (JSON):**
  ```json
  {
    "email": "aarav.sharma@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK` (JSON):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": "usr-101",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@example.com",
      "role": "citizen"
    }
  }
  ```
- **Error Responses:** `401 Unauthorized` (`{"detail": "Invalid email or password"}`), `422 Unprocessable Entity`.

#### 2. `POST /api/v1/auth/register`
- **Purpose:** Creates a new citizen account.
- **Request Body (JSON):**
  ```json
  {
    "name": "Kavita Chawla",
    "email": "kavita.c@example.com",
    "phone": "+91 98450 12345",
    "password": "StrongPassword123!"
  }
  ```
- **Response `201 Created`:** Same envelope as login response.

#### 3. `GET /api/v1/auth/me`
- **Purpose:** Validates the existing token and returns fresh user info.
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:** User object with `id`, `name`, `email`, `role`, `department`.

---

### Citizen Portal Endpoints

#### 1. `GET /api/v1/citizen/overview`
- **Purpose:** Returns summary metric counters for the citizen's personal dashboard.
- **Role Required:** `citizen` (or higher)
- **Response `200 OK` (JSON):**
  ```json
  {
    "totalReports": 4,
    "pendingReports": 1,
    "inProgressReports": 2,
    "resolvedReports": 1,
    "lastReportDate": "2026-10-15T10:30:00Z"
  }
  ```

#### 2. `GET /api/v1/citizen/complaints`
- **Purpose:** Retrieves complaints submitted **strictly by the authenticated citizen**.
- **Role Required:** `citizen`
- **Query Parameters:**
  - `status` (optional): `all` | `submitted` | `under_review` | `assigned` | `in_progress` | `resolved` | `rejected`
  - `category` (optional): `pothole` | `garbage` | `street_lighting` | `water_leakage` | `drainage_sewage` | `road_hazard` | `other_civic`
  - `search` (optional): string query
  - `page` (optional, default 1): integer
  - `limit` (optional, default 10): integer
- **Response `200 OK` (JSON):**
  ```json
  {
    "items": [
      {
        "id": "BLR-2026-0891",
        "title": "Severe Pothole on 100 Feet Road",
        "description": "Deep asphalt crater near 12th Main junction damaging two-wheelers.",
        "category": "pothole",
        "categoryLabel": "Road Damage & Potholes",
        "location": {
          "address": "100 Feet Road, Indiranagar, Bengaluru",
          "latitude": 12.9784,
          "longitude": 77.6408
        },
        "status": "in_progress",
        "priority": "high",
        "department": "BBMP Road Infrastructure",
        "createdAt": "2026-10-12T09:30:00Z",
        "updatedAt": "2026-10-14T11:20:00Z",
        "imageUrl": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
        "timeline": [
          {
            "stage": "submitted",
            "title": "Grievance Lodged",
            "description": "Recorded via CivicFix mobile web intake with GPS coordinates.",
            "timestamp": "2026-10-12T09:30:00Z",
            "updatedBy": "Aarav Sharma (Citizen)"
          },
          {
            "stage": "in_progress",
            "title": "Field Repair Dispatched",
            "description": "Cold-mix asphalt dispatched with road maintenance crew.",
            "timestamp": "2026-10-14T11:20:00Z",
            "updatedBy": "Er. Priya Sundaram (BBMP)"
          }
        ],
        "publicUpdates": [
          {
            "id": "upd-1",
            "authorName": "Er. Priya Sundaram",
            "authorRole": "Executive Engineer",
            "content": "Asphalt patching materials scheduled for delivery on Thursday morning.",
            "createdAt": "2026-10-14T11:20:00Z"
          }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
  ```

#### 3. `POST /api/v1/complaints`
- **Purpose:** Submits a new grievance with optional photo evidence.
- **Role Required:** `citizen`
- **Request Format:** `multipart/form-data` or `application/json`
  - `title` (string, required, 5-120 chars)
  - `category` (string, required): `pothole` | `garbage` | `street_lighting` | `water_leakage` | `drainage_sewage` | `road_hazard` | `other_civic`
  - `description` (string, required, 10-1000 chars)
  - `locationAddress` (string, required)
  - `latitude` (float, optional)
  - `longitude` (float, optional)
  - `image` (binary file, optional: JPEG/PNG/WebP, max 5MB)
- **Response `201 Created`:** Full created complaint object including server-generated `id` (e.g. `BLR-2026-0945`).

#### 4. `GET /api/v1/complaints/{id}`
- **Purpose:** Retrieves full details of a specific grievance.
- **Authorization Check:**
  - If requester has role `citizen`, the complaint's `citizen_id` **MUST** equal `current_user.id` (otherwise return `403 Forbidden` or `404 Not Found`).
  - Restricted internal notes (`is_internal: true`) **MUST BE OMITTED** when serving a citizen.

---

### Committee Operations Endpoints

#### 1. `GET /api/v1/committee/overview`
- **Purpose:** Summary metrics for the assigned department's operational queue.
- **Role Required:** `committee` (or `admin`)
- **Response `200 OK` (JSON):**
  ```json
  {
    "assignedCases": 6,
    "awaitingReview": 1,
    "inProgress": 3,
    "resolvedThisMonth": 14,
    "highPriority": 2,
    "overdueCount": 0
  }
  ```

#### 2. `GET /api/v1/committee/queue`
- **Purpose:** Retrieves the case queue assigned to the officer or their municipal division.
- **Role Required:** `committee` (or `admin`)
- **Query Parameters:** `status`, `priority`, `category`, `search`, `page`, `limit`
- **Response Payload:** Contains complaints array with both `publicUpdates` and `internalNotes`.

#### 3. `PATCH /api/v1/complaints/{id}/status`
- **Purpose:** Transitions the workflow status of a grievance.
- **Role Required:** `committee` (or `admin`)
- **Request Body (JSON):**
  ```json
  {
    "status": "in_progress",
    "note": "Work order WO-881 issued to patch crew."
  }
  ```
- **Allowed Transitions:**
  - `submitted` -> `under_review`, `rejected`
  - `under_review` -> `assigned`, `in_progress`, `rejected`
  - `assigned` -> `in_progress`, `rejected`
  - `in_progress` -> `resolved`, `under_review`
  - `resolved` -> `under_review` (re-opened)
- **Side Effects:** Appends a stage to `complaint_timeline` and creates an audit trail entry.

#### 4. `POST /api/v1/complaints/{id}/notes`
- **Purpose:** Appends a **restricted internal officer note** visible ONLY to committee members and admins.
- **Role Required:** `committee` (or `admin`)
- **Request Body (JSON):**
  ```json
  {
    "content": "Awaiting asphalt bitumen delivery from East Zone batching plant.",
    "isInternal": true
  }
  ```

#### 5. `POST /api/v1/complaints/{id}/updates`
- **Purpose:** Appends a **public status update** visible to the citizen on their tracking timeline.
- **Role Required:** `committee` (or `admin`)
- **Request Body (JSON):**
  ```json
  {
    "content": "Inspection completed. Asphalt patch team scheduled for Friday morning.",
    "isInternal": false
  }
  ```

#### 6. `POST /api/v1/complaints/{id}/forward`
- **Purpose:** Forwards a grievance to a different verified municipal department.
- **Role Required:** `committee` (or `admin`)
- **Request Body (JSON):**
  ```json
  {
    "department": "BWSSB Water Supply & Sewerage",
    "reason": "Water pipe leak is the underlying cause undermining the road surface."
  }
  ```

---

### Administrator Governance Endpoints

#### 1. `GET /api/v1/admin/analytics`
- **Purpose:** Feeds the administrator console with time-series charts, SLA gauge, and category distributions.
- **Role Required:** `admin`
- **Response `200 OK` (JSON):**
  ```json
  {
    "metrics": {
      "totalComplaints": 1482,
      "pendingComplaints": 184,
      "inProgressComplaints": 412,
      "resolvedComplaints": 886,
      "registeredCitizens": 12450,
      "activeOfficers": 64,
      "resolutionRatePct": 74
    },
    "trends": [
      { "month": "May", "submitted": 142, "resolved": 118 },
      { "month": "Jun", "submitted": 185, "resolved": 154 },
      { "month": "Jul", "submitted": 240, "resolved": 198 },
      { "month": "Aug", "submitted": 290, "resolved": 245 },
      { "month": "Sep", "submitted": 330, "resolved": 288 },
      { "month": "Oct", "submitted": 295, "resolved": 242 }
    ],
    "categoryDistribution": [
      { "category": "Roads & Potholes", "count": 542, "percentage": 37, "color": "#10B981" },
      { "category": "Sanitation & Garbage", "count": 380, "percentage": 26, "color": "#0D9488" },
      { "category": "Street Lighting", "count": 245, "percentage": 17, "color": "#F59E0B" },
      { "category": "Water Leakage", "count": 180, "percentage": 12, "color": "#3B82F6" },
      { "category": "Drainage & Sewage", "count": 135, "percentage": 8, "color": "#6366F1" }
    ],
    "zoneDistribution": [
      { "zone": "East Zone (Indiranagar/Whitefield)", "count": 482, "activeRate": "82%" },
      { "zone": "South Zone (Jayanagar/Koramangala)", "count": 394, "activeRate": "78%" },
      { "zone": "West Zone (Malleshwaram/Rajajinagar)", "count": 341, "activeRate": "71%" },
      { "zone": "North Zone (Hebbal/Yelahanka)", "count": 265, "activeRate": "68%" }
    ]
  }
  ```

#### 2. `GET /api/v1/admin/users`
- **Purpose:** Full directory of system users with filter by role and status.
- **Role Required:** `admin`
- **Query Parameters:** `role` (`all` | `citizen` | `committee` | `admin`), `status` (`all` | `active` | `suspended`), `search`, `page`, `limit`
- **Response `200 OK` (JSON):**
  ```json
  {
    "items": [
      {
        "id": "usr-101",
        "name": "Aarav Sharma",
        "email": "aarav.sharma@example.com",
        "phone": "+91 98450 11223",
        "role": "citizen",
        "status": "active",
        "department": null,
        "createdAt": "2026-08-10T10:00:00Z",
        "lastActive": "2026-10-16T14:45:00Z"
      }
    ],
    "total": 12450
  }
  ```

#### 3. `PATCH /api/v1/admin/users/{id}/role`
- **Purpose:** Promotes or alters a user's platform role.
- **Role Required:** `admin`
- **Request Body (JSON):** `{"role": "committee"}`
- **Security Invariant:** Cannot demote the last remaining administrator account.

#### 4. `PATCH /api/v1/admin/users/{id}/status`
- **Purpose:** Suspends or activates a user account.
- **Role Required:** `admin`
- **Request Body (JSON):** `{"status": "suspended"}`

#### 5. `GET /api/v1/admin/authorities` & `POST /api/v1/admin/authorities`
- **Purpose:** Manages the directory of verified municipal bodies (BBMP, BESCOM, BWSSB, Traffic Police, etc.).
- **Role Required:** `admin` (or `committee` for read-only)
- **Fields:** `name`, `department`, `jurisdictionZone`, `category`, `headOfficer`, `email`, `phone`, `portalUrl`, `active`.

#### 6. `GET /api/v1/admin/activity`
- **Purpose:** Retrieves immutable platform audit logs.
- **Role Required:** `admin`
- **Response Envelope:** List of `{ id, action, targetType, targetId, actorName, actorRole, timestamp, details }`.

---

## 6. Critical Security Invariants & Data Isolation

### Invariant 1: Citizen Private Grievance Isolation
> **Rule:** A citizen must NEVER be able to query, view, or alter grievances submitted by other citizens.
```python
# FastAPI Route Example:
@router.get("/api/v1/citizen/complaints")
async def get_citizen_complaints(
    current_user: User = Depends(require_role(["citizen"])),
    db: AsyncSession = Depends(get_db_session)
):
    # CRITICAL: Always filter by citizen_id = current_user.id
    query = select(Complaint).where(Complaint.citizen_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()
```

### Invariant 2: Restricted Internal Notes Isolation
> **Rule:** Grievances contain two types of notes:
> 1. `publicUpdates`: Visible to citizens and officers.
> 2. `internalNotes`: Restricted officer communications (`is_internal = true`).
```python
# Serialization logic in FastAPI:
if current_user.role == "citizen":
    # STRIP internal notes from response payload
    complaint_dict["internalNotes"] = []
```

### Invariant 3: Immutable System Audit Logging
> **Rule:** Every state modification (status transition, department forwarding, role change, account suspension) MUST append a non-updatable record into the `audit_logs` table.

---

## 7. PostgreSQL Database Schema (DDL & SQLAlchemy Models)

### PostgreSQL DDL Script
```sql
-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('citizen', 'committee', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'pending_verification');
CREATE TYPE complaint_status AS ENUM (
    'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected'
);
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE civic_category AS ENUM (
    'pothole', 'garbage', 'street_lighting', 'water_leakage',
    'drainage_sewage', 'road_hazard', 'other_civic'
);

-- 2. Users Table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    status account_status NOT NULL DEFAULT 'active',
    department VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 3. Verified Authorities Directory
CREATE TABLE authorities (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    jurisdiction_zone VARCHAR(150) NOT NULL,
    category civic_category NOT NULL,
    head_officer VARCHAR(120),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    portal_url VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Complaints Master Table
CREATE TABLE complaints (
    id VARCHAR(50) PRIMARY KEY, -- e.g. BLR-2026-0891
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category civic_category NOT NULL,
    location_address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    citizen_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_department VARCHAR(150) DEFAULT 'BBMP Central Triage',
    status complaint_status NOT NULL DEFAULT 'submitted',
    priority complaint_priority NOT NULL DEFAULT 'medium',
    image_url TEXT,
    ai_classification JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);

-- 5. Complaint Workflow Timeline
CREATE TABLE complaint_timeline (
    id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(50) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    stage complaint_status NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    updated_by_name VARCHAR(120) NOT NULL,
    updated_by_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_timeline_complaint ON complaint_timeline(complaint_id);

-- 6. Officer Notes & Public Updates
CREATE TABLE complaint_notes (
    id VARCHAR(36) PRIMARY KEY,
    complaint_id VARCHAR(50) NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    author_id VARCHAR(36) NOT NULL REFERENCES users(id),
    author_name VARCHAR(120) NOT NULL,
    author_role VARCHAR(60) NOT NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notes_complaint ON complaint_notes(complaint_id);

-- 7. Platform Audit Trail (Immutable)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(60) NOT NULL,
    target_id VARCHAR(60) NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

---

## 8. FastAPI Security & Dependency Injection Recipes

Here is the exact FastAPI dependency pattern required to authenticate requests and protect endpoints:

```python
# app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

SECRET_KEY = "YOUR_SECURE_JWT_SECRET_KEY"
ALGORITHM = "HS256"
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return {"id": user_id, "role": role, "email": payload.get("email")}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user['role']}'"
            )
        return current_user
    return role_checker
```

---

## 9. Analytical SQL Aggregation Queries for Admin Console

The `GET /api/v1/admin/analytics` endpoint needs to compute high-performance aggregations. Use these SQL queries:

```sql
-- 1. Summary Metrics Card
SELECT 
    COUNT(*) AS total_complaints,
    COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review')) AS pending_complaints,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_complaints,
    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_complaints,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'resolved')::numeric / NULLIF(COUNT(*), 0)) * 100, 
        0
    ) AS resolution_rate_pct
FROM complaints;

-- 2. Monthly Trend Velocity (Past 6 Months)
SELECT 
    TO_CHAR(created_at, 'Mon') AS month,
    EXTRACT(MONTH FROM created_at) AS month_num,
    COUNT(*) AS submitted,
    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
FROM complaints
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
ORDER BY month_num ASC;

-- 3. Category Distribution Donut
SELECT 
    category,
    COUNT(*) AS count,
    ROUND((COUNT(*)::numeric / SUM(COUNT(*)) OVER ()) * 100, 1) AS percentage
FROM complaints
GROUP BY category
ORDER BY count DESC;
```

---

## 10. Frontend Code Reference Map

All backend connection points have been labeled with explicit comments in the frontend codebase. Refer to these files when integrating:

| Frontend File | Integration Comment Location | What It Connects To |
| :--- | :--- | :--- |
| `src/services/apiClient.js` | Top header + `apiRequest()` | Base URL configuration, Bearer injection, timeout handling |
| `src/services/authService.js` | Top header + `signInUser()` | `POST /api/v1/auth/login`, session storage |
| `src/services/complaintService.js` | Functions: `getCitizenComplaints()`, `createComplaint()`, `updateComplaintStatus()` | CRUD and status transitions |
| `src/services/userService.js` | Functions: `getAdminUsers()`, `updateUserRole()`, `updateUserStatus()` | RBAC management endpoints |
| `src/services/authorityService.js` | Functions: `getAuthorities()`, `createAuthority()` | Verified municipal directory |
| `src/services/analyticsService.js` | Functions: `getAdminAnalytics()`, `getAuditLogs()` | SQL aggregations and audit logging |
| `src/pages/citizen/CitizenReportPage.jsx` | `handleSubmit()` | Grievance intake form submission |
| `src/components/complaints/ComplaintDetailModal.jsx` | Action handlers | Status transitions, adding officer notes & updates |
| `src/components/admin/UserManagementSection.jsx` | Top header | Role elevation & account suspension dialogs |
| `src/components/admin/AuthorityDirectorySection.jsx` | Top header | Department registration modal |

---

## 11. Step-by-Step Backend Developer Checklist

- [ ] **Step 1: Configure CORS in FastAPI**
  Ensure the frontend dev server (`http://localhost:5173` and `http://localhost:4173`) is permitted:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:5173", "http://localhost:4173"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- [ ] **Step 2: Initialize Database Schema**
  Execute the DDL script in [Section 7](#7-postgresql-database-schema-ddl--sqlalchemy-models) on PostgreSQL.
- [ ] **Step 3: Implement Auth Endpoints**
  Build `POST /api/v1/auth/login` and `POST /api/v1/auth/register` returning JWT tokens signed with `HS256`.
- [ ] **Step 4: Connect Citizen Portal**
  Implement `GET /api/v1/citizen/overview`, `GET /api/v1/citizen/complaints`, and `POST /api/v1/complaints`. Test issue submission from `http://localhost:5173/citizen/report`.
- [ ] **Step 5: Connect Committee Operations**
  Implement `GET /api/v1/committee/queue` and `PATCH /api/v1/complaints/{id}/status`. Test reviewing cases and posting internal notes.
- [ ] **Step 6: Connect Admin Analytics & Governance**
  Implement `GET /api/v1/admin/analytics` using the SQL queries in [Section 9](#9-analytical-sql-aggregation-queries-for-admin-console).
- [ ] **Step 7: Verify Zero Mock Mode**
  Start FastAPI on `http://localhost:8000`. The frontend will detect the live backend, automatically dismiss mock badges, and stream live database records.
