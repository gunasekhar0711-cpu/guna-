import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';

export async function getLines(req, res) {
  try {
    const result = await db.query(
      `SELECT pl.id, pl.name, pl.factory_location, pl.description, pl.created_at,
              COALESCE(u.full_name, 'System') as created_by_name,
              COUNT(i.id) as inspection_count
       FROM production_lines pl
       LEFT JOIN users u ON pl.created_by = u.id
       LEFT JOIN inspections i ON pl.id = i.line_id
       GROUP BY pl.id, pl.name, pl.factory_location, pl.description, pl.created_at, u.full_name
       ORDER BY pl.created_at DESC`
    );

    return res.json({ lines: result.rows });
  } catch (err) {
    console.error('Error fetching production lines:', err);
    return res.status(500).json({ error: 'Failed to retrieve production lines' });
  }
}

export async function createLine(req, res) {
  try {
    const { name, factoryLocation, description = '' } = req.body;
    const userId = req.user ? req.user.id : null;
    const newId = uuidv4();

    const result = await db.query(
      `INSERT INTO production_lines (id, name, factory_location, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, factory_location, description, created_at`,
      [newId, name, factoryLocation, description, userId]
    );

    return res.status(201).json({
      message: 'Production line created successfully',
      line: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating production line:', err);
    return res.status(500).json({ error: 'Failed to create production line' });
  }
}

export async function getLineById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT pl.*, u.full_name as created_by_name
       FROM production_lines pl
       LEFT JOIN users u ON pl.created_by = u.id
       WHERE pl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Production line not found' });
    }

    return res.json({ line: result.rows[0] });
  } catch (err) {
    console.error('Error fetching line by id:', err);
    return res.status(500).json({ error: 'Failed to fetch production line details' });
  }
}
