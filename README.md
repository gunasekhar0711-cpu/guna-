# VisionInspect AI – Enterprise Automated Visual Quality Control & Defect Detection Platform

VisionInspect AI is a 100% production-grade, end-to-end industrial visual inspection and defect detection platform. Powered by Google Gemini Vision AI (`@google/genai`), Node.js/Express, PostgreSQL, and a high-performance React (Vite) + Tailwind CSS console, it automates visual quality assurance for electronics assembly, metal casting, solar photovoltaics, and advanced manufacturing.

---

## 🌟 Key Features

1. **Multimodal Gemini Vision Pipeline:**
   - Server-side integration with `@google/genai` utilizing structured JSON schemas.
   - Microscopic and macroscopic anomaly detection across 4 industrial categories:
     - `ELECTRICAL_OR_THERMAL`: Solder bridging, tombstoning, dewetting, thermal hotspots.
     - `SURFACE`: Micro-scratches, porosity, corrosion, discoloration.
     - `ASSEMBLY`: Component misalignment, missing fasteners, polarity inversion.
     - `STRUCTURAL`: Substrate fractures, cracks, warping.
   - Strict 0-1000 normalized bounding box extraction `[ymin, xmin, ymax, xmax]`.

2. **Interactive Defect Overlay Viewer:**
   - Real-time scaling of normalized coordinates over high-resolution inspection images.
   - Interactive hover tooltips, category color coding, reticle crosshairs, and defect deep dives.
   - Zoom (75% to 300%), pan, reset, and overlay visibility toggles.
   - One-click root cause analysis and operational corrective action recommendations.

3. **Enterprise Production Hierarchy & Multi-Tenancy:**
   - Plant, production line, and optical station management.
   - Role-Based Access Control (`admin`, `inspector`, `operator`, `viewer`).
   - Secure JWT authentication with bcrypt password hashing (salt 10).

4. **Telemetry & Defect Analytics Dashboard:**
   - Real-time KPI StatCards: Total Inspected, First-Pass Yield (%), Critical Failure Alerts, Mean AI Latency.
   - Recharts visual analytics: Defect Frequency by Engineering Category, 7-Day Inspection Throughput and Quality Yield trends.
   - Instant critical failure alert banners with 1-click review shortcuts.

5. **Industrial Audit Trail & Exports:**
   - Searchable, filterable history by SKU, status (`PASSED`, `WARNING`, `CRITICAL`), and production line.
   - 1-Click CSV Quality Audit Report downloads.
   - Printable PDF inspection certificates.

---

## 🏗️ Technology Stack

| Component | Technology | Version / Details |
| :--- | :--- | :--- |
| **Frontend** | React, Vite | React 18, Vite 6, Tailwind CSS, Lucide React, Recharts, Axios |
| **Backend** | Node.js, Express.js | ES Modules, Express 4, Zod validation, JWT, bcryptjs, Multer |
| **Vision AI** | Google Gemini API | `@google/genai` SDK (`gemini-2.5-flash` / `gemini-1.5-pro`) |
| **Database** | Supabase / PostgreSQL | Supabase Cloud PostgreSQL with Row Level Security (RLS) & Indexes |
| **Fallback DB** | Persistent JSON Store | Zero-latency local file database (`server/data/visioninspect.json`) for instant out-of-the-box evaluation |

---

## ⚡ Supabase Cloud PostgreSQL Migration

The complete production database schema, Row Level Security (RLS) policies, and seed data are located in [001_initial_schema.sql](file:///c:/Users/vikra/OneDrive/Desktop/Coding/Build%20to%20Ship/supabase/migrations/001_initial_schema.sql).

### Applying Migrations to Supabase

#### Option 1: Automated Node.js Migration Runner (Recommended)
Set your Supabase Connection String or Service Role Key in `server/.env`:
```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
# Or using Supabase API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Then run the migration script:
```bash
npm run db:migrate
# or
node server/scripts/run-supabase-migration.js
```

#### Option 2: Supabase Dashboard SQL Editor
1. Open your Supabase Project -> **SQL Editor**.
2. Paste the contents of [supabase/migrations/001_initial_schema.sql](file:///c:/Users/vikra/OneDrive/Desktop/Coding/Build%20to%20Ship/supabase/migrations/001_initial_schema.sql).
3. Click **Run**. All tables, indexes, RLS policies, and seed data will be initialized.

---

## 🗄️ PostgreSQL Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('admin', 'inspector', 'operator', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Production Lines Table
CREATE TABLE production_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    factory_location VARCHAR(150) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inspections Table
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_id UUID REFERENCES production_lines(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    item_sku VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PASSED', 'WARNING', 'CRITICAL', 'PENDING')),
    overall_confidence NUMERIC(5,2) NOT NULL,
    defect_summary TEXT,
    ai_raw_response JSONB,
    operator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detected Defects Table (Normalized Findings)
CREATE TABLE detected_defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
    defect_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    confidence_score NUMERIC(5,2) NOT NULL,
    bounding_box JSONB, -- {ymin, xmin, ymax, xmax} normalized 0-1000
    description TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B-Tree Performance Indexes
CREATE INDEX idx_inspections_line_id ON inspections(line_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_created_at ON inspections(created_at DESC);
CREATE INDEX idx_detected_defects_inspection_id ON detected_defects(inspection_id);
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- (Optional) PostgreSQL database (if omitted, the system seamlessly uses its embedded zero-config persistent store)

### 2. Environment Variables

**Backend (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/visioninspect_db
JWT_SECRET=super_secret_jwt_key_change_in_production
GEMINI_API_KEY=your_google_gemini_api_key_here
```

**Frontend (`client/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Installation & Startup

**Terminal 1: Start Backend API**
```bash
cd server
npm install
npm start
```
*Backend runs on `http://localhost:5000`*

**Terminal 2: Start Frontend Application**
```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 🔑 Preloaded Demo Credentials

For immediate 1-click evaluation without registering a new user:
* **Email:** `admin@visioninspect.ai`
* **Password:** `admin1234`
*(The login page includes a convenient "Use Preloaded Admin Credentials" 1-click button)*

---

## 📡 API Reference

### Authentication
* `POST /api/auth/register` – Register operator/admin with email, password, full name, role.
* `POST /api/auth/login` – Authenticate credentials and receive 24h JWT.
* `GET /api/auth/me` – Retrieve authenticated session identity.

### Production Lines
* `GET /api/lines` – List all production lines with location and inspection counts.
* `POST /api/lines` – Create a new manufacturing line.
* `GET /api/lines/:id` – Fetch single production line details.

### Inspections
* `GET /api/inspections` – Paginated and filtered inspection history (by status, lineId, search).
* `POST /api/inspections` – Upload inspection frame (multipart `image`), invoke Gemini Vision AI, persist defects, return complete structured audit.
* `GET /api/inspections/:id` – Fetch full inspection record with localized defects.
* `PATCH /api/inspections/:id/status` – Operator review sign-off and status update.
* `GET /api/inspections/:id/export/csv` – Download CSV audit report.

### Analytics
* `GET /api/analytics/summary` – Aggregate KPI metrics, 7-day trend, category & severity distribution, active critical alerts.

---

## 🛡️ Security Architecture

1. **API Key Isolation:** `GEMINI_API_KEY` is restricted strictly to server-side memory.
2. **Encrypted Passwords:** Salted hashing with `bcryptjs` (salt rounds: 10).
3. **Brute Force Protection:** Express rate limiting on `/api/auth/login` and `/api/auth/register`.
4. **MIME & Size Validation:** Strict 20MB payload limit enforcing `image/jpeg`, `image/png`, and `image/webp`.
5. **Strict Schema Validation:** Backend request bodies parsed and validated with Zod.

---

## 📄 License
MIT License. Industrial AI & Computer Vision by VisionInspect AI Engineering.
