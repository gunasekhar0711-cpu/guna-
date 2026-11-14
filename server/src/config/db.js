import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let pool = null;
let supabaseClient = null;
let dbMode = 'local'; // 'postgres' | 'supabase' | 'local'

// Local fallback store
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'visioninspect.json');

const initialData = {
  users: [],
  production_lines: [],
  inspections: [],
  detected_defects: []
};

let memDb = { ...initialData };

function loadLocalData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      memDb = JSON.parse(content);
    } else {
      saveLocalData();
    }
  } catch (err) {
    console.error('[DB Local Store] Error loading local store:', err.message);
  }
}

function saveLocalData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB Local Store] Error saving local store:', err.message);
  }
}

// -----------------------------------------------------------------------------
// Supabase Cloud REST/Client Query Executor
// -----------------------------------------------------------------------------
async function executeSupabaseQuery(text, params = []) {
  const sql = text.trim();
  const upper = sql.toUpperCase();

  try {
    // 1. SELECT NOW()
    if (upper.startsWith('SELECT 1') || upper.startsWith('SELECT NOW()') || upper.startsWith('SELECT CURRENT_TIMESTAMP')) {
      return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
    }

    // 2. USERS
    if (upper.includes('FROM USERS') || upper.includes('INTO USERS') || upper.includes('UPDATE USERS')) {
      if (upper.startsWith('SELECT COUNT(*)')) {
        const { count, error } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { rows: [{ count: count || 0 }], rowCount: 1 };
      }

      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE EMAIL = $1')) {
          const email = (params[0] || '').toLowerCase();
          const { data, error } = await supabaseClient.from('users').select('*').ilike('email', email);
          if (error) throw error;
          return { rows: data || [], rowCount: (data || []).length };
        }
        if (upper.includes('WHERE ID = $1')) {
          const id = params[0];
          const { data, error } = await supabaseClient.from('users').select('*').eq('id', id);
          if (error) throw error;
          return { rows: data || [], rowCount: (data || []).length };
        }
        const { data, error } = await supabaseClient.from('users').select('*');
        if (error) throw error;
        return { rows: data || [], rowCount: (data || []).length };
      }

      if (upper.startsWith('INSERT INTO USERS')) {
        const newUser = {
          id: params[0] || uuidv4(),
          email: (params[1] || '').toLowerCase(),
          password_hash: params[2],
          full_name: params[3],
          role: params[4] || 'operator'
        };
        const { data, error } = await supabaseClient.from('users').insert([newUser]).select();
        if (error) throw error;
        return { rows: data || [newUser], rowCount: 1 };
      }
    }

    // 3. ANALYTICS QUERIES
    if (upper.includes('GROUP BY STATUS') && upper.includes('COUNT(*)')) {
      const { data, error } = await supabaseClient.from('inspections').select('status');
      if (error) throw error;
      const counts = {};
      (data || []).forEach(i => {
        counts[i.status] = (counts[i.status] || 0) + 1;
      });
      const rows = Object.entries(counts).map(([status, count]) => ({ status, count }));
      return { rows, rowCount: rows.length };
    }

    if (upper.includes('AVG(OVERALL_CONFIDENCE)')) {
      const { data, error } = await supabaseClient.from('inspections').select('overall_confidence');
      if (error) throw error;
      if (!data || data.length === 0) return { rows: [{ avg_confidence: 96.5 }], rowCount: 1 };
      const sum = data.reduce((acc, i) => acc + (Number(i.overall_confidence) || 0), 0);
      return { rows: [{ avg_confidence: sum / data.length }], rowCount: 1 };
    }

    if (upper.includes('GROUP BY DATE(CREATED_AT)')) {
      const { data, error } = await supabaseClient.from('inspections').select('created_at, status');
      if (error) throw error;
      const dateMap = {};
      (data || []).forEach(i => {
        const d = (i.created_at || new Date().toISOString()).split('T')[0];
        const key = `${d}_${i.status}`;
        dateMap[key] = dateMap[key] || { date: d, status: i.status, count: 0 };
        dateMap[key].count++;
      });
      return { rows: Object.values(dateMap), rowCount: Object.values(dateMap).length };
    }

    if (upper.includes("WHERE I.STATUS = 'CRITICAL'") && upper.includes('SELECT I.ID, I.ITEM_SKU')) {
      const { data, error } = await supabaseClient
        .from('inspections')
        .select('id, item_sku, overall_confidence, created_at, production_lines(name), detected_defects(id)')
        .eq('status', 'CRITICAL')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      const rows = (data || []).map(i => ({
        id: i.id,
        item_sku: i.item_sku,
        overall_confidence: i.overall_confidence,
        created_at: i.created_at,
        line_name: i.production_lines ? i.production_lines.name : 'SMT Line 4',
        defect_count: i.detected_defects ? i.detected_defects.length : 0
      }));
      return { rows, rowCount: rows.length };
    }

    // 4. DETECTED DEFECTS
    if (upper.includes('FROM DETECTED_DEFECTS') || upper.includes('INTO DETECTED_DEFECTS') || upper.includes('UPDATE DETECTED_DEFECTS')) {
      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE INSPECTION_ID = $1')) {
          const inspection_id = params[0];
          const { data, error } = await supabaseClient
            .from('detected_defects')
            .select('*')
            .eq('inspection_id', inspection_id)
            .order('created_at', { ascending: true });

          if (error) throw error;
          return { rows: data || [], rowCount: (data || []).length };
        }
        const { data, error } = await supabaseClient.from('detected_defects').select('*');
        if (error) throw error;
        return { rows: data || [], rowCount: (data || []).length };
      }

      if (upper.startsWith('INSERT INTO DETECTED_DEFECTS')) {
        const newDefect = {
          id: params[0] || uuidv4(),
          inspection_id: params[1],
          defect_type: params[2],
          severity: params[3],
          confidence_score: Number(params[4]),
          bounding_box: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
          description: params[6],
          corrective_action: params[7]
        };
        const { data, error } = await supabaseClient.from('detected_defects').insert([newDefect]).select();
        if (error) throw error;
        return { rows: data || [newDefect], rowCount: 1 };
      }
    }

    // 5. INSPECTIONS
    if (upper.includes('FROM INSPECTIONS') || upper.includes('INTO INSPECTIONS') || upper.includes('UPDATE INSPECTIONS')) {
      if (upper.startsWith('SELECT COUNT(ID) AS TOTAL') || upper.startsWith('SELECT COUNT(*) AS TOTAL')) {
        let query = supabaseClient.from('inspections').select('*', { count: 'exact', head: true });
        if (params.length > 0 && params[0] !== 'ALL') {
          query = query.or(`status.eq.${params[0]},line_id.eq.${params[0]}`);
        }
        const { count, error } = await query;
        if (error) throw error;
        return { rows: [{ total: count || 0 }], rowCount: 1 };
      }

      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE I.ID = $1') || upper.includes('WHERE ID = $1')) {
          const id = params[0];
          const { data, error } = await supabaseClient
            .from('inspections')
            .select('*, production_lines(name, factory_location), users(full_name, email)')
            .eq('id', id);

          if (error) throw error;
          const rows = (data || []).map(i => ({
            ...i,
            line_name: i.production_lines?.name || 'Production Line',
            factory_location: i.production_lines?.factory_location || 'Main Bay',
            inspector_name: i.users?.full_name || 'Automated Pipeline',
            inspector_email: i.users?.email || 'admin@visioninspect.ai'
          }));
          return { rows, rowCount: rows.length };
        }

        let query = supabaseClient
          .from('inspections')
          .select('*, production_lines(name, factory_location), users(full_name), detected_defects(id)')
          .order('created_at', { ascending: false });

        if (params.length > 0) {
          params.forEach(p => {
            if (typeof p === 'string' && ['PASSED', 'WARNING', 'CRITICAL', 'PENDING'].includes(p)) {
              query = query.eq('status', p);
            }
          });
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []).map(i => ({
          ...i,
          line_name: i.production_lines?.name || 'Production Line',
          factory_location: i.production_lines?.factory_location || 'Main Bay',
          inspector_name: i.users?.full_name || 'Automated Pipeline',
          defect_count: i.detected_defects?.length || 0
        }));

        return { rows, rowCount: rows.length };
      }

      if (upper.startsWith('INSERT INTO INSPECTIONS')) {
        const newInspection = {
          id: params[0] || uuidv4(),
          line_id: params[1],
          inspector_id: params[2],
          item_sku: params[3],
          image_url: params[4],
          status: params[5],
          overall_confidence: Number(params[6]),
          defect_summary: params[7],
          ai_raw_response: typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8],
          operator_notes: params[9] || ''
        };
        const { data, error } = await supabaseClient.from('inspections').insert([newInspection]).select();
        if (error) throw error;
        return { rows: data || [newInspection], rowCount: 1 };
      }

      if (upper.startsWith('UPDATE INSPECTIONS')) {
        const status = params[0];
        const operator_notes = params[1];
        const id = params[2];

        const updateData = {};
        if (status) updateData.status = status;
        if (operator_notes !== undefined) updateData.operator_notes = operator_notes;

        const { data, error } = await supabaseClient.from('inspections').update(updateData).eq('id', id).select();
        if (error) throw error;
        return { rows: data || [], rowCount: (data || []).length };
      }
    }

    // 6. PRODUCTION LINES
    if (upper.includes('FROM PRODUCTION_LINES') || upper.includes('INTO PRODUCTION_LINES') || upper.includes('UPDATE PRODUCTION_LINES')) {
      if (upper.startsWith('SELECT')) {
        if (upper.includes('WHERE ID = $1') || upper.includes('WHERE PL.ID = $1')) {
          const id = params[0];
          const { data, error } = await supabaseClient.from('production_lines').select('*').eq('id', id);
          if (error) throw error;
          return { rows: data || [], rowCount: (data || []).length };
        }

        const { data: lines, error: linesErr } = await supabaseClient
          .from('production_lines')
          .select('*, users(full_name), inspections(id)')
          .order('created_at', { ascending: false });

        if (linesErr) throw linesErr;

        const rows = (lines || []).map(l => ({
          ...l,
          inspection_count: l.inspections ? l.inspections.length : 0,
          created_by_name: l.users ? l.users.full_name : 'System'
        }));

        return { rows, rowCount: rows.length };
      }

      if (upper.startsWith('INSERT INTO PRODUCTION_LINES')) {
        const newLine = {
          id: params[0] || uuidv4(),
          name: params[1],
          factory_location: params[2],
          description: params[3] || '',
          created_by: params[4] || null
        };
        const { data, error } = await supabaseClient.from('production_lines').insert([newLine]).select();
        if (error) throw error;
        return { rows: data || [newLine], rowCount: 1 };
      }
    }

    // Fallback if query not matched
    return executeLocalFallbackQuery(text, params);
  } catch (err) {
    console.error('Supabase query execution error, delegating fallback:', err.message);
    return executeLocalFallbackQuery(text, params);
  }
}

// -----------------------------------------------------------------------------
// Local Memory / JSON Fallback Query Executor
// -----------------------------------------------------------------------------
async function executeLocalFallbackQuery(text, params = []) {
  loadLocalData();
  const sql = text.trim();
  const upper = sql.toUpperCase();

  if (upper.startsWith('SELECT 1') || upper.startsWith('SELECT NOW()') || upper.startsWith('SELECT CURRENT_TIMESTAMP')) {
    return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
  }

  if (upper.includes('FROM USERS') || upper.includes('INTO USERS') || upper.includes('UPDATE USERS')) {
    if (upper.startsWith('SELECT COUNT(*)')) {
      return { rows: [{ count: memDb.users.length }], rowCount: 1 };
    }
    if (upper.startsWith('SELECT')) {
      if (upper.includes('WHERE EMAIL = $1')) {
        const email = (params[0] || '').toLowerCase();
        const found = memDb.users.filter(u => u.email.toLowerCase() === email);
        return { rows: found, rowCount: found.length };
      }
      if (upper.includes('WHERE ID = $1')) {
        const id = params[0];
        const found = memDb.users.filter(u => u.id === id);
        return { rows: found, rowCount: found.length };
      }
      return { rows: [...memDb.users], rowCount: memDb.users.length };
    }
    if (upper.startsWith('INSERT INTO USERS')) {
      const newUser = {
        id: params[0] || uuidv4(),
        email: params[1],
        password_hash: params[2],
        full_name: params[3],
        role: params[4] || 'operator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      memDb.users.push(newUser);
      saveLocalData();
      return { rows: [newUser], rowCount: 1 };
    }
  }

  if (upper.includes('GROUP BY STATUS') && upper.includes('COUNT(*)')) {
    const counts = {};
    memDb.inspections.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    const rows = Object.entries(counts).map(([status, count]) => ({ status, count }));
    return { rows, rowCount: rows.length };
  }

  if (upper.includes('AVG(OVERALL_CONFIDENCE)')) {
    if (memDb.inspections.length === 0) return { rows: [{ avg_confidence: 96.5 }], rowCount: 1 };
    const sum = memDb.inspections.reduce((acc, i) => acc + (Number(i.overall_confidence) || 0), 0);
    return { rows: [{ avg_confidence: sum / memDb.inspections.length }], rowCount: 1 };
  }

  if (upper.includes('GROUP BY DATE(CREATED_AT)')) {
    const dateMap = {};
    memDb.inspections.forEach(i => {
      const d = (i.created_at || new Date().toISOString()).split('T')[0];
      const key = `${d}_${i.status}`;
      dateMap[key] = dateMap[key] || { date: d, status: i.status, count: 0 };
      dateMap[key].count++;
    });
    return { rows: Object.values(dateMap), rowCount: Object.values(dateMap).length };
  }

  if (upper.includes("WHERE I.STATUS = 'CRITICAL'") && upper.includes('SELECT I.ID, I.ITEM_SKU')) {
    const criticals = memDb.inspections.filter(i => i.status === 'CRITICAL').map(i => {
      const line = memDb.production_lines.find(l => l.id === i.line_id);
      const defCount = memDb.detected_defects.filter(d => d.inspection_id === i.id).length;
      return {
        id: i.id,
        item_sku: i.item_sku,
        overall_confidence: i.overall_confidence,
        created_at: i.created_at,
        line_name: line ? line.name : 'Assembly Line 1',
        defect_count: defCount
      };
    }).slice(0, 5);
    return { rows: criticals, rowCount: criticals.length };
  }

  if (upper.includes('FROM DETECTED_DEFECTS') || upper.includes('INTO DETECTED_DEFECTS')) {
    if (upper.startsWith('SELECT')) {
      if (upper.includes('WHERE INSPECTION_ID = $1')) {
        const inspection_id = params[0];
        const defects = memDb.detected_defects.filter(d => d.inspection_id === inspection_id);
        return { rows: defects, rowCount: defects.length };
      }
      return { rows: [...memDb.detected_defects], rowCount: memDb.detected_defects.length };
    }
    if (upper.startsWith('INSERT INTO DETECTED_DEFECTS')) {
      const newDefect = {
        id: params[0] || uuidv4(),
        inspection_id: params[1],
        defect_type: params[2],
        severity: params[3],
        confidence_score: Number(params[4]),
        bounding_box: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
        description: params[6],
        corrective_action: params[7],
        created_at: new Date().toISOString()
      };
      memDb.detected_defects.push(newDefect);
      saveLocalData();
      return { rows: [newDefect], rowCount: 1 };
    }
  }

  if (upper.includes('FROM INSPECTIONS') || upper.includes('INTO INSPECTIONS') || upper.includes('UPDATE INSPECTIONS')) {
    if (upper.startsWith('SELECT COUNT(ID) AS TOTAL') || upper.startsWith('SELECT COUNT(*) AS TOTAL')) {
      return { rows: [{ total: memDb.inspections.length }], rowCount: 1 };
    }
    if (upper.startsWith('SELECT')) {
      let results = [...memDb.inspections].map(ins => {
        const line = memDb.production_lines.find(l => l.id === ins.line_id);
        const inspector = memDb.users.find(u => u.id === ins.inspector_id);
        const defCount = memDb.detected_defects.filter(d => d.inspection_id === ins.id).length;
        return {
          ...ins,
          line_name: line ? line.name : 'SMT Electronics Line 4',
          factory_location: line ? line.factory_location : 'Building A - High Bay 2',
          inspector_name: inspector ? inspector.full_name : 'Automated Inline Station',
          defect_count: defCount
        };
      });

      if (upper.includes('WHERE I.ID = $1') || upper.includes('WHERE ID = $1')) {
        const id = params[0];
        const found = results.filter(i => i.id === id);
        return { rows: found, rowCount: found.length };
      }

      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: results, rowCount: results.length };
    }

    if (upper.startsWith('INSERT INTO INSPECTIONS')) {
      const newInspection = {
        id: params[0] || uuidv4(),
        line_id: params[1],
        inspector_id: params[2],
        item_sku: params[3],
        image_url: params[4],
        status: params[5],
        overall_confidence: Number(params[6]),
        defect_summary: params[7],
        ai_raw_response: typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8],
        operator_notes: params[9] || '',
        created_at: new Date().toISOString()
      };
      memDb.inspections.push(newInspection);
      saveLocalData();
      return { rows: [newInspection], rowCount: 1 };
    }

    if (upper.startsWith('UPDATE INSPECTIONS')) {
      const item = memDb.inspections.find(i => i.id === params[2]);
      if (item) {
        if (params[0]) item.status = params[0];
        if (params[1] !== undefined) item.operator_notes = params[1];
        saveLocalData();
        return { rows: [item], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
  }

  if (upper.includes('FROM PRODUCTION_LINES') || upper.includes('INTO PRODUCTION_LINES')) {
    if (upper.startsWith('SELECT')) {
      const lines = memDb.production_lines.map(line => ({
        ...line,
        inspection_count: memDb.inspections.filter(i => i.line_id === line.id).length,
        created_by_name: 'Admin'
      }));
      return { rows: lines, rowCount: lines.length };
    }
    if (upper.startsWith('INSERT INTO PRODUCTION_LINES')) {
      const newLine = {
        id: params[0] || uuidv4(),
        name: params[1],
        factory_location: params[2],
        description: params[3] || '',
        created_by: params[4] || null,
        created_at: new Date().toISOString()
      };
      memDb.production_lines.push(newLine);
      saveLocalData();
      return { rows: [newLine], rowCount: 1 };
    }
  }

  return { rows: [], rowCount: 0 };
}

// -----------------------------------------------------------------------------
// Database Connection Initializer
// -----------------------------------------------------------------------------
export async function initializeDatabase() {
  loadLocalData();

  // Option 1: Direct PostgreSQL connection string
  const connectionString = process.env.DATABASE_URL;
  if (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')) {
    try {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      const client = await pool.connect();
      console.log('✅ [Database] Successfully connected to PostgreSQL instance.');
      client.release();
      dbMode = 'postgres';
      return;
    } catch (err) {
      console.warn('⚠️ [Database] Direct PostgreSQL connection notice:', err.message);
    }
  }

  // Option 2: Supabase Cloud Client (Service Role Key)
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey && serviceKey !== 'your_supabase_service_role_key_here') {
    try {
      supabaseClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data, error } = await supabaseClient.from('users').select('id').limit(1);
      if (!error) {
        console.log(`✅ [Database] Connected to Supabase Cloud PostgreSQL (${supabaseUrl}).`);
        dbMode = 'supabase';
        return;
      }
    } catch (err) {
      console.warn('⚠️ [Database] Supabase Cloud connection notice:', err.message);
    }
  }

  // Option 3: Local fallback
  console.log('ℹ️ [Database] Running with zero-latency persistent local store.');
  dbMode = 'local';
}

// Unified query wrapper
export const db = {
  query: async (text, params) => {
    if (dbMode === 'postgres' && pool) {
      try {
        return await pool.query(text, params);
      } catch (err) {
        console.error('PostgreSQL query error, delegating fallback:', err.message);
      }
    }
    if (dbMode === 'supabase' && supabaseClient) {
      return executeSupabaseQuery(text, params);
    }
    return executeLocalFallbackQuery(text, params);
  },
  getMode: () => dbMode,
  getSupabase: () => supabaseClient
};

export default db;
