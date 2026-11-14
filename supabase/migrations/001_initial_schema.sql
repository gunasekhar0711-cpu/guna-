-- ==============================================================================
-- VisionInspect AI – Supabase Cloud PostgreSQL Migration: 001_initial_schema.sql
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Create Core Tables
-- ==============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('admin', 'inspector', 'operator', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Production Lines Table
CREATE TABLE IF NOT EXISTS public.production_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    factory_location VARCHAR(150) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inspections Table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id UUID REFERENCES public.production_lines(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    item_sku VARCHAR(100) NOT NULL,
    image_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PASSED', 'WARNING', 'CRITICAL', 'PENDING')),
    overall_confidence NUMERIC(5,2) NOT NULL,
    defect_summary TEXT,
    ai_raw_response JSONB,
    operator_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detected Defects Table (Normalization of AI findings)
CREATE TABLE IF NOT EXISTS public.detected_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
    defect_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    confidence_score NUMERIC(5,2) NOT NULL,
    bounding_box JSONB NOT NULL, -- Stores {ymin, xmin, ymax, xmax} normalized coordinates
    description TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. Create Performance & Foreign Key Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_production_lines_created_at ON public.production_lines(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_line_id ON public.inspections(line_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_sku ON public.inspections(item_sku);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detected_defects_inspection_id ON public.detected_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_detected_defects_severity ON public.detected_defects(severity);

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) on All Tables
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_defects ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. Define Row Level Security (RLS) Policies
-- ==============================================================================

-- Drop existing policies if reapplying
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "service_role_all_users" ON public.users;
    DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;
    DROP POLICY IF EXISTS "authenticated_update_users" ON public.users;

    DROP POLICY IF EXISTS "service_role_all_lines" ON public.production_lines;
    DROP POLICY IF EXISTS "authenticated_select_lines" ON public.production_lines;
    DROP POLICY IF EXISTS "authenticated_insert_lines" ON public.production_lines;
    DROP POLICY IF EXISTS "authenticated_update_lines" ON public.production_lines;

    DROP POLICY IF EXISTS "service_role_all_inspections" ON public.inspections;
    DROP POLICY IF EXISTS "authenticated_select_inspections" ON public.inspections;
    DROP POLICY IF EXISTS "authenticated_insert_inspections" ON public.inspections;
    DROP POLICY IF EXISTS "authenticated_update_inspections" ON public.inspections;

    DROP POLICY IF EXISTS "service_role_all_defects" ON public.detected_defects;
    DROP POLICY IF EXISTS "authenticated_select_defects" ON public.detected_defects;
    DROP POLICY IF EXISTS "authenticated_insert_defects" ON public.detected_defects;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- --- USERS POLICIES ---
-- Service role has unrestricted access (used by backend with service_role key)
CREATE POLICY "service_role_all_users" 
ON public.users 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can view user profiles
CREATE POLICY "authenticated_select_users" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (true);

-- Users can only modify their own user profile
CREATE POLICY "authenticated_update_users" 
ON public.users 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);


-- --- PRODUCTION LINES POLICIES ---
-- Service role full access
CREATE POLICY "service_role_all_lines" 
ON public.production_lines 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can view all production lines
CREATE POLICY "authenticated_select_lines" 
ON public.production_lines 
FOR SELECT 
TO authenticated 
USING (true);

-- Authenticated users can create new lines
CREATE POLICY "authenticated_insert_lines" 
ON public.production_lines 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Authenticated users can update lines
CREATE POLICY "authenticated_update_lines" 
ON public.production_lines 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --- INSPECTIONS POLICIES ---
-- Service role full access
CREATE POLICY "service_role_all_inspections" 
ON public.inspections 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can view inspections
CREATE POLICY "authenticated_select_inspections" 
ON public.inspections 
FOR SELECT 
TO authenticated 
USING (true);

-- Authenticated users can insert inspections
CREATE POLICY "authenticated_insert_inspections" 
ON public.inspections 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Authenticated users can update status and operator notes
CREATE POLICY "authenticated_update_inspections" 
ON public.inspections 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --- DETECTED DEFECTS POLICIES ---
-- Service role full access
CREATE POLICY "service_role_all_defects" 
ON public.detected_defects 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Authenticated users can view defects
CREATE POLICY "authenticated_select_defects" 
ON public.detected_defects 
FOR SELECT 
TO authenticated 
USING (true);

-- Authenticated users can insert defects
CREATE POLICY "authenticated_insert_defects" 
ON public.detected_defects 
FOR INSERT 
TO authenticated 
WITH CHECK (true);


-- ==============================================================================
-- 6. Seed Data (Initial Admin, Lines, Sample Inspections & Defects)
-- ==============================================================================

-- Seed Admin User (Email: admin@visioninspect.ai / Password: admin1234)
INSERT INTO public.users (id, email, password_hash, full_name, role)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@visioninspect.ai',
    '$2a$10$WcYKmZVOr46ytdQlrMVQpOhrGxFhKzaEsw5k1dB56FagjdLbZQjri', -- bcrypt hash of admin1234
    'Vikramaditya (Lead Quality Architect)',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Seed Production Lines
INSERT INTO public.production_lines (id, name, factory_location, description, created_by)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'SMT Electronics Line 4',
    'Building A - High Bay 2',
    'Automated Surface Mount PCB assembly with dual-lane solder reflow and 3D AOI optical verification',
    'a0000000-0000-0000-0000-000000000001'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'Die-Cast Aluminum Line 1',
    'Building C - Foundry Wing',
    'Precision robotic high-pressure die casting and automated CNC finishing cell',
    'a0000000-0000-0000-0000-000000000001'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'Photovoltaic Cell Assembly 2',
    'Cleanroom Wing 3',
    'Silicon solar wafer inspection, busbar ribbon tabbing, and electroluminescence crack detection',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Seed Sample Inspection 1 (CRITICAL: SMT PCB Defect)
INSERT INTO public.inspections (
    id, line_id, inspector_id, item_sku, image_url, status,
    overall_confidence, defect_summary, ai_raw_response, operator_notes, created_at
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'PCB-STM32-REV4',
    '/uploads/sample-smt-pcb.svg',
    'CRITICAL',
    97.80,
    'Critical short-circuit hazard detected on primary QFP package. Extraneous solder alloy bridge spanning pin 14-15 and angular misalignment on resistor R42.',
    '{"simulated": true, "engine": "gemini-2.5-flash"}'::jsonb,
    'Urgent intervention logged by Automated Inline AOI Station',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- Seed Defects for Inspection 1
INSERT INTO public.detected_defects (
    id, inspection_id, defect_type, severity, confidence_score, bounding_box, description, corrective_action
) VALUES 
(
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Solder Bridge Short Circuit',
    'CRITICAL',
    98.90,
    '{"ymin": 480, "xmin": 360, "ymax": 560, "xmax": 420}'::jsonb,
    'Conductive solder meniscus connecting adjacent QFP package lead frames.',
    'Halt conveyor line 4 immediately. Purge flux nozzles and recalibrate stencil squeegee angle.'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'Surface-Mount Component Misalignment',
    'HIGH',
    94.20,
    '{"ymin": 580, "xmin": 750, "ymax": 670, "xmax": 870}'::jsonb,
    'SMD Resistor R42 rotated 22 degrees off baseline pad footprint.',
    'Recalibrate visual alignment fiducials on High-Speed Feeder Head #3.'
) ON CONFLICT (id) DO NOTHING;

-- Seed Sample Inspection 2 (WARNING: Surface Scratch on Metal Casting)
INSERT INTO public.inspections (
    id, line_id, inspector_id, item_sku, image_url, status,
    overall_confidence, defect_summary, ai_raw_response, operator_notes, created_at
) VALUES (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'ALUM-CAST-HOUSING-B',
    '/uploads/sample-smt-pcb.svg',
    'WARNING',
    92.40,
    'Cosmetic anodization scratch observed on upper exterior flange. Component passed functional hydrostatic pressure check.',
    '{"simulated": true, "engine": "gemini-2.5-flash"}'::jsonb,
    'Rework buffer applied. Part routed to touch-up finishing bay.',
    CURRENT_TIMESTAMP - INTERVAL '5 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.detected_defects (
    id, inspection_id, defect_type, severity, confidence_score, bounding_box, description, corrective_action
) VALUES (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000002',
    'Anodized Surface Micro-Scratch',
    'LOW',
    91.30,
    '{"ymin": 220, "xmin": 280, "ymax": 310, "xmax": 580}'::jsonb,
    'Superficial linear scratch along exterior surface.',
    'Inspect parts handler conveyor belts for sharp metal burr debris.'
) ON CONFLICT (id) DO NOTHING;

-- Seed Sample Inspection 3 (PASSED: Nominal Solar Cell)
INSERT INTO public.inspections (
    id, line_id, inspector_id, item_sku, image_url, status,
    overall_confidence, defect_summary, ai_raw_response, operator_notes, created_at
) VALUES (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'PV-WAFER-M10-MONO',
    '/uploads/sample-smt-pcb.svg',
    'PASSED',
    99.10,
    'Silicon wafer and busbar ribbon alignment perfectly within nominal tolerance. Zero micro-cracks or electroluminescence degradation.',
    '{"simulated": true, "engine": "gemini-2.5-flash"}'::jsonb,
    'Automated batch clearance issued.',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;
