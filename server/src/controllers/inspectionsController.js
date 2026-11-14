import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';
import { analyzeInspectionImage } from '../services/geminiVisionService.js';

export async function createInspection(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Inspection image file is required (JPEG, PNG, or WebP up to 20MB).' });
    }

    const { lineId, itemSku, stationName = 'Station A', operatorNotes = '' } = req.body;

    if (!lineId || !itemSku) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'lineId and itemSku are required fields.' });
    }

    // Verify production line exists
    const lineCheck = await db.query('SELECT id, name FROM production_lines WHERE id = $1', [lineId]);
    if (lineCheck.rows.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Selected production line does not exist.' });
    }

    // Read image buffer for Gemini Vision API
    const imageBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;
    const imageUrl = `/uploads/${req.file.filename}`;

    console.log(`[Inspection Pipeline] Processing inspection for SKU: ${itemSku} on Line: ${lineCheck.rows[0].name}`);

    // Call Gemini AI Vision Analysis
    const aiAnalysis = await analyzeInspectionImage(
      imageBuffer,
      mimeType,
      itemSku,
      stationName,
      operatorNotes
    );

    const inspectionId = uuidv4();
    const inspectorId = req.user ? req.user.id : null;
    const overallConfidence = aiAnalysis.overallConfidence || 95.0;
    const status = aiAnalysis.overallStatus || 'WARNING';
    const defectSummary = aiAnalysis.defectSummary || 'Visual inspection complete.';

    // Insert inspection into database
    const inspectionResult = await db.query(
      `INSERT INTO inspections (
        id, line_id, inspector_id, item_sku, image_url, status,
        overall_confidence, defect_summary, ai_raw_response, operator_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        inspectionId,
        lineId,
        inspectorId,
        itemSku,
        imageUrl,
        status,
        overallConfidence,
        defectSummary,
        JSON.stringify(aiAnalysis),
        operatorNotes
      ]
    );

    const savedInspection = inspectionResult.rows[0];

    // Insert normalized defects
    const savedDefects = [];
    if (Array.isArray(aiAnalysis.defects)) {
      for (const defect of aiAnalysis.defects) {
        const defectId = uuidv4();
        const defResult = await db.query(
          `INSERT INTO detected_defects (
            id, inspection_id, defect_type, severity, confidence_score,
            bounding_box, description, corrective_action
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            defectId,
            inspectionId,
            defect.defectType,
            defect.severity,
            defect.confidenceScore || overallConfidence,
            JSON.stringify(defect.boundingBox || { ymin: 0, xmin: 0, ymax: 0, xmax: 0 }),
            defect.description || '',
            defect.correctiveAction || ''
          ]
        );
        savedDefects.push(defResult.rows[0]);
      }
    }

    return res.status(201).json({
      message: 'Inspection successfully analyzed and logged',
      inspection: {
        ...savedInspection,
        line_name: lineCheck.rows[0].name,
        defects: savedDefects
      }
    });
  } catch (err) {
    console.error('Create inspection error:', err);
    return res.status(500).json({ error: 'Server error processing inspection: ' + err.message });
  }
}

export async function getInspections(req, res) {
  try {
    const { status, lineId, search, page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let queryText = `
      SELECT i.*, 
             pl.name as line_name, 
             pl.factory_location,
             COALESCE(u.full_name, 'Automated') as inspector_name,
             COUNT(d.id) as defect_count
      FROM inspections i
      LEFT JOIN production_lines pl ON i.line_id = pl.id
      LEFT JOIN users u ON i.inspector_id = u.id
      LEFT JOIN detected_defects d ON i.id = d.inspection_id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (status && status !== 'ALL') {
      queryText += ` AND i.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    if (lineId && lineId !== 'ALL') {
      queryText += ` AND i.line_id = $${pIdx}`;
      params.push(lineId);
      pIdx++;
    }

    if (search) {
      queryText += ` AND (i.item_sku ILIKE $${pIdx} OR i.defect_summary ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    queryText += `
      GROUP BY i.id, pl.name, pl.factory_location, u.full_name
      ORDER BY i.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    params.push(Number(limit), offset);

    const result = await db.query(queryText, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(id) as total FROM inspections WHERE 1=1';
    const countParams = [];
    let cpIdx = 1;
    if (status && status !== 'ALL') {
      countQuery += ` AND status = $${cpIdx}`;
      countParams.push(status);
      cpIdx++;
    }
    if (lineId && lineId !== 'ALL') {
      countQuery += ` AND line_id = $${cpIdx}`;
      countParams.push(lineId);
      cpIdx++;
    }
    const countRes = await db.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0]?.total || result.rows.length, 10);

    return res.json({
      inspections: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching inspections:', err);
    return res.status(500).json({ error: 'Failed to retrieve inspections' });
  }
}

export async function getInspectionById(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT i.*, 
              pl.name as line_name, 
              pl.factory_location,
              COALESCE(u.full_name, 'System') as inspector_name,
              u.email as inspector_email
       FROM inspections i
       LEFT JOIN production_lines pl ON i.line_id = pl.id
       LEFT JOIN users u ON i.inspector_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection report not found' });
    }

    const inspection = result.rows[0];

    // Fetch normalized defects
    const defectsRes = await db.query(
      `SELECT * FROM detected_defects WHERE inspection_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    inspection.defects = defectsRes.rows.map(d => ({
      ...d,
      boundingBox: typeof d.bounding_box === 'string' ? JSON.parse(d.bounding_box) : d.bounding_box
    }));

    return res.json({ inspection });
  } catch (err) {
    console.error('Error fetching inspection by ID:', err);
    return res.status(500).json({ error: 'Failed to retrieve inspection details' });
  }
}

export async function updateInspectionStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, operatorNotes } = req.body;

    const existing = await db.query('SELECT * FROM inspections WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection record not found' });
    }

    const newStatus = status || existing.rows[0].status;
    const newNotes = operatorNotes !== undefined ? operatorNotes : existing.rows[0].operator_notes;

    const updateRes = await db.query(
      `UPDATE inspections 
       SET status = $1, operator_notes = $2
       WHERE id = $3
       RETURNING *`,
      [newStatus, newNotes, id]
    );

    return res.json({
      message: 'Inspection status updated successfully',
      inspection: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating inspection status:', err);
    return res.status(500).json({ error: 'Failed to update inspection status' });
  }
}

export async function exportInspectionCsv(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT i.*, pl.name as line_name, u.full_name as inspector_name
       FROM inspections i
       LEFT JOIN production_lines pl ON i.line_id = pl.id
       LEFT JOIN users u ON i.inspector_id = u.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const insp = result.rows[0];
    const defectsRes = await db.query('SELECT * FROM detected_defects WHERE inspection_id = $1', [id]);

    let csv = `VisionInspect AI - Quality Assurance Audit Report\n`;
    csv += `Inspection ID,${insp.id}\n`;
    csv += `Item SKU,${insp.item_sku}\n`;
    csv += `Production Line,${insp.line_name || 'N/A'}\n`;
    csv += `Overall Status,${insp.status}\n`;
    csv += `Overall Confidence,${insp.overall_confidence}%\n`;
    csv += `Inspector,${insp.inspector_name || 'Automated'}\n`;
    csv += `Timestamp,${insp.created_at}\n\n`;

    csv += `Defect ID,Defect Name,Category,Severity,Confidence,Description,Corrective Action\n`;

    defectsRes.rows.forEach(d => {
      const desc = `"${(d.description || '').replace(/"/g, '""')}"`;
      const action = `"${(d.corrective_action || '').replace(/"/g, '""')}"`;
      csv += `${d.id},"${d.defect_type}",${d.category || 'N/A'},${d.severity},${d.confidence_score}%,${desc},${action}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inspection-${insp.item_sku}-${insp.id.substring(0, 8)}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error('CSV Export Error:', err);
    return res.status(500).json({ error: 'Failed to export CSV report' });
  }
}
