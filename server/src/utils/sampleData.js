import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedSampleDataIfEmpty() {
  try {
    const userCheck = await db.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userCheck.rows[0]?.count || 0, 10);

    if (userCount > 0) {
      console.log('ℹ️ [Seed] Database already contains records. Skipping seed.');
      return;
    }

    console.log('🌱 [Seed] Database is empty. Seeding initial industrial test data...');

    // 1. Create Default Admin User
    const adminId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin1234', salt);

    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'admin@visioninspect.ai', passwordHash, 'Vikramaditya (Lead Quality Architect)', 'admin']
    );

    // 2. Create Production Lines
    const line1Id = uuidv4();
    const line2Id = uuidv4();
    const line3Id = uuidv4();

    await db.query(
      `INSERT INTO production_lines (id, name, factory_location, description, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [line1Id, 'SMT Electronics Line 4', 'Building A - High Bay 2', 'Automated Surface Mount PCB assembly with dual-lane solder reflow', adminId]
    );

    await db.query(
      `INSERT INTO production_lines (id, name, factory_location, description, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [line2Id, 'Die-Cast Aluminum Line 1', 'Building C - Foundry Wing', 'Precision robotic high-pressure die casting and CNC finishing cell', adminId]
    );

    await db.query(
      `INSERT INTO production_lines (id, name, factory_location, description, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [line3Id, 'Photovoltaic Cell Assembly 2', 'Cleanroom Wing 3', 'Silicon solar wafer inspection and conductive ribbon tabbing cell', adminId]
    );

    // 3. Create Sample Inspection Images
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const samplePcbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#0d2818"/>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1b4d2e" stroke-width="1"/>
      </pattern>
      <rect width="800" height="600" fill="url(#grid)" />
      <path d="M 50 150 L 250 150 L 320 220 L 480 220" stroke="#00b4d8" stroke-width="4" fill="none"/>
      <path d="M 50 200 L 220 200 L 290 270 L 480 270" stroke="#00b4d8" stroke-width="4" fill="none"/>
      <path d="M 50 250 L 200 250 L 270 320 L 480 320" stroke="#00b4d8" stroke-width="4" fill="none"/>
      <rect x="320" y="240" width="160" height="160" rx="6" fill="#1e293b" stroke="#64748b" stroke-width="3"/>
      <text x="400" y="325" fill="#f8fafc" font-size="16" font-family="monospace" text-anchor="middle" font-weight="bold">ARM STM32H7</text>
      <g fill="#94a3b8">
        <rect x="300" y="260" width="20" height="6"/>
        <rect x="300" y="280" width="20" height="6"/>
        <rect x="300" y="300" width="20" height="6"/>
        <rect x="300" y="320" width="20" height="6"/>
        <circle cx="310" cy="310" r="14" fill="#ef4444" opacity="0.85"/>
        <rect x="480" y="260" width="20" height="6"/>
        <rect x="480" y="280" width="20" height="6"/>
        <rect x="480" y="300" width="20" height="6"/>
      </g>
      <g transform="translate(620, 360) rotate(22)">
        <rect x="0" y="0" width="50" height="24" fill="#334155" stroke="#ef4444" stroke-width="2"/>
        <rect x="0" y="0" width="10" height="24" fill="#e2e8f0"/>
        <rect x="40" y="0" width="10" height="24" fill="#e2e8f0"/>
      </g>
      <text x="50" y="560" fill="#4ade80" font-size="16" font-family="monospace">VISIONINSPECT AI - OPTICAL SENSOR CAM_04</text>
    </svg>`;

    const pcbImgFile = 'sample-smt-pcb.svg';
    fs.writeFileSync(path.join(uploadDir, pcbImgFile), samplePcbSvg);

    // 4. Insert Sample Inspections
    const insp1Id = uuidv4();
    const insp2Id = uuidv4();
    const insp3Id = uuidv4();

    // Inspection 1: Critical
    await db.query(
      `INSERT INTO inspections (
        id, line_id, inspector_id, item_sku, image_url, status,
        overall_confidence, defect_summary, ai_raw_response, operator_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        insp1Id,
        line1Id,
        adminId,
        'PCB-STM32-REV4',
        `/uploads/${pcbImgFile}`,
        'CRITICAL',
        97.80,
        'Critical short-circuit hazard detected on primary QFP package. Extraneous solder alloy bridge spanning pin 14-15 and angular misalignment on resistor R42.',
        JSON.stringify({ simulated: true }),
        'Urgent intervention logged by Automated Inline AOI Station'
      ]
    );

    // Defect 1: Solder bridge
    await db.query(
      `INSERT INTO detected_defects (
        id, inspection_id, defect_type, severity, confidence_score,
        bounding_box, description, corrective_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        insp1Id,
        'Solder Bridge Short Circuit',
        'CRITICAL',
        98.9,
        JSON.stringify({ ymin: 480, xmin: 360, ymax: 560, xmax: 420 }),
        'Conductive solder meniscus connecting adjacent QFP package lead frames.',
        'Halt conveyor line 4 immediately. Purge flux nozzles and recalibrate stencil squeegee angle.'
      ]
    );

    // Defect 2: Angular misalignment
    await db.query(
      `INSERT INTO detected_defects (
        id, inspection_id, defect_type, severity, confidence_score,
        bounding_box, description, corrective_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        insp1Id,
        'Surface-Mount Component Misalignment',
        'HIGH',
        94.2,
        JSON.stringify({ ymin: 580, xmin: 750, ymax: 670, xmax: 870 }),
        'SMD Resistor R42 rotated 22 degrees off baseline pad footprint.',
        'Recalibrate visual alignment fiducials on High-Speed Feeder Head #3.'
      ]
    );

    // Inspection 2: Warning
    await db.query(
      `INSERT INTO inspections (
        id, line_id, inspector_id, item_sku, image_url, status,
        overall_confidence, defect_summary, ai_raw_response, operator_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        insp2Id,
        line2Id,
        adminId,
        'ALUM-CAST-HOUSING-B',
        `/uploads/${pcbImgFile}`,
        'WARNING',
        92.40,
        'Cosmetic anodization scratch observed on upper exterior flange. Component passed functional hydrostatic pressure check.',
        JSON.stringify({ simulated: true }),
        'Rework buffer applied. Part routed to touch-up finishing bay.'
      ]
    );

    await db.query(
      `INSERT INTO detected_defects (
        id, inspection_id, defect_type, severity, confidence_score,
        bounding_box, description, corrective_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        uuidv4(),
        insp2Id,
        'Anodized Surface Micro-Scratch',
        'LOW',
        91.3,
        JSON.stringify({ ymin: 220, xmin: 280, ymax: 310, xmax: 580 }),
        'Superficial linear scratch along exterior surface.',
        'Inspect parts handler conveyor belts for sharp metal burr debris.'
      ]
    );

    // Inspection 3: Passed
    await db.query(
      `INSERT INTO inspections (
        id, line_id, inspector_id, item_sku, image_url, status,
        overall_confidence, defect_summary, ai_raw_response, operator_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        insp3Id,
        line3Id,
        adminId,
        'PV-WAFER-M10-MONO',
        `/uploads/${pcbImgFile}`,
        'PASSED',
        99.10,
        'Silicon wafer and busbar ribbon alignment perfectly within nominal tolerance. Zero micro-cracks or electroluminescence degradation.',
        JSON.stringify({ simulated: true }),
        'Automated batch clearance issued.'
      ]
    );

    console.log('✅ [Seed] Industrial sample data successfully seeded with initial admin: admin@visioninspect.ai / admin1234');
  } catch (err) {
    console.error('Error during sample data seeding:', err.message);
  }
}
