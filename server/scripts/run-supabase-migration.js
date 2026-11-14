import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { Client } = pg;

// Path to the initial migration file
const MIGRATION_PATH = path.join(__dirname, '..', '..', 'supabase', 'migrations', '001_initial_schema.sql');

async function runMigration() {
  console.log('==============================================================================');
  console.log('🚀 VisionInspect AI – Supabase Cloud PostgreSQL Migration Runner');
  console.log('==============================================================================');

  if (!fs.existsSync(MIGRATION_PATH)) {
    console.error(`❌ Migration file not found at: ${MIGRATION_PATH}`);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  console.log(`📄 Loaded migration script: ${path.basename(MIGRATION_PATH)} (${(migrationSql.length / 1024).toFixed(1)} KB)`);

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Strategy 1: Direct PostgreSQL connection to Supabase via connection string
  // (Supabase URI: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres)
  if (databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1')) {
    console.log(`\n🔗 Connecting directly to Cloud PostgreSQL instance at:`);
    const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`   ${maskedUrl}`);

    const client = new Client({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    try {
      await client.connect();
      console.log('✅ Connected to Supabase Cloud PostgreSQL.');

      console.log('⚡ Executing migration DDL, RLS policies, and seed data...');
      await client.query('BEGIN');
      await client.query(migrationSql);
      await client.query('COMMIT');
      console.log('✅ Migration applied successfully within transaction block.');

      // Verify Tables & Row Level Security
      console.log('\n🔍 Verifying schema & Row Level Security on Supabase:');
      const verificationQuery = `
        SELECT 
          t.tablename,
          t.rowsecurity AS rls_enabled,
          (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.tablename AND c.table_schema = 'public') AS column_count
        FROM pg_tables t
        WHERE t.schemaname = 'public' 
          AND t.tablename IN ('users', 'production_lines', 'inspections', 'detected_defects')
        ORDER BY t.tablename;
      `;
      const tableCheck = await client.query(verificationQuery);
      console.table(tableCheck.rows);

      // Verify Seed Data Counts
      const countsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM public.users) AS users_count,
          (SELECT COUNT(*) FROM public.production_lines) AS lines_count,
          (SELECT COUNT(*) FROM public.inspections) AS inspections_count,
          (SELECT COUNT(*) FROM public.detected_defects) AS defects_count;
      `;
      const countCheck = await client.query(countsQuery);
      console.log('📊 Seeded records summary:');
      console.table(countCheck.rows);

      await client.end();
      console.log('✨ All migrations and RLS verification completed successfully!');
      process.exit(0);
    } catch (err) {
      console.error('❌ Migration failed via direct PostgreSQL connection:', err.message);
      if (client) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        await client.end();
      }
    }
  }

  // Strategy 2: If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
  if (supabaseUrl && serviceRoleKey && serviceRoleKey !== 'your_supabase_service_role_key_here') {
    console.log(`\n🌐 Connecting via Supabase Management / REST API using Service Role Key:`);
    console.log(`   Supabase URL: ${supabaseUrl}`);

    // Extract project reference
    const projectRefMatch = supabaseUrl.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
    const projectRef = projectRefMatch ? projectRefMatch[1] : null;

    // Try executing through Supabase SQL API endpoint
    let executed = false;

    // 1. Try Supabase SQL query API endpoint with service role key
    const endpointsToTry = [
      `${supabaseUrl}/rest/v1/rpc/exec_sql`,
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      `${supabaseUrl}/pg/query`
    ];

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`📡 Attempting SQL dispatch to: ${endpoint}`);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ query: migrationSql, sql: migrationSql })
        });

        if (res.ok) {
          console.log(`✅ Successfully executed migration via ${endpoint}`);
          executed = true;
          break;
        } else {
          const errText = await res.text();
          console.log(`ℹ️ Endpoint response (${res.status}): ${errText.substring(0, 120)}...`);
        }
      } catch (e) {
        console.log(`ℹ️ Endpoint skipped: ${e.message}`);
      }
    }

    // 2. Validate connection and test table access via @supabase/supabase-js
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n🔍 Verifying access to Supabase tables using service role client...');
    try {
      const { data: usersData, error: usersErr } = await supabase.from('users').select('id, email, full_name, role').limit(5);
      if (!usersErr && usersData) {
        console.log(`✅ Supabase 'users' table active. Found ${usersData.length} records.`);
      }

      const { data: linesData, error: linesErr } = await supabase.from('production_lines').select('id, name, factory_location').limit(5);
      if (!linesErr && linesData) {
        console.log(`✅ Supabase 'production_lines' table active. Found ${linesData.length} records.`);
      }

      const { data: inspData, error: inspErr } = await supabase.from('inspections').select('id, item_sku, status').limit(5);
      if (!inspErr && inspData) {
        console.log(`✅ Supabase 'inspections' table active. Found ${inspData.length} records.`);
      }

      if (executed) {
        console.log('✨ Supabase migration applied and validated successfully!');
        process.exit(0);
      }
    } catch (e) {
      console.warn('Notice querying Supabase tables:', e.message);
    }
  }

  // If neither live Supabase connection was successful, print actionable connection instructions:
  console.log('\n==============================================================================');
  console.log('ℹ️  HOW TO APPLY THIS MIGRATION TO YOUR SUPABASE CLOUD PROJECT:');
  console.log('==============================================================================');
  console.log('Option A (Automated CLI Runner with Connection String):');
  console.log('1. Go to your Supabase Project Settings -> Database.');
  console.log('2. Under "Connection string", select "URI" (Direct or Pooler).');
  console.log('3. Set DATABASE_URL in server/.env with your password:');
  console.log('   DATABASE_URL="postgresql://postgres.[REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"');
  console.log('4. Run: npm run db:migrate (or node server/scripts/run-supabase-migration.js)\n');
  console.log('Option B (1-Click SQL Editor in Supabase Dashboard):');
  console.log('1. Open your Supabase Dashboard -> SQL Editor.');
  console.log('2. Copy the contents of: supabase/migrations/001_initial_schema.sql');
  console.log('3. Click "Run" to create all tables, RLS policies, indexes, and seed data.');
  console.log('==============================================================================\n');
}

runMigration().catch((err) => {
  console.error('Fatal error running migration:', err);
  process.exit(1);
});
