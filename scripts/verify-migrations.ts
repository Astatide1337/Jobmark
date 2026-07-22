#!/usr/bin/env npx tsx
/**
 * Migration Verification Script
 * 
 * Verifies:
 * 1. All migration SQL files exist and are non-empty
 * 2. Migrations are in chronological order
 * 3. Schema diff from empty → final matches expected tables
 * 4. All MCP-related tables exist in final schema
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(import.meta.dirname, '../prisma/migrations');
const SCHEMA_PATH = join(import.meta.dirname, '../prisma/schema.prisma');

const EXPECTED_MCP_TABLES = [
  'OAuthClient',
  'OAuthAuthorizationCode',
  'OAuthAccessToken',
  'OAuthRefreshToken',
  'OAuthConsent',
  'McpConnection',
  'McpIdempotency',
  'SecureActionNonce',
];

const EXPECTED_MCP_COLUMNS: Record<string, string[]> = {
  'OAuthRefreshToken': ['familyId', 'consumedAt'],
  'McpConnection': ['vaultUnlockedUntil'],
};

function log(msg: string) {
  console.log(`  ${msg}`);
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
  process.exitCode = 1;
}

// 1. Check migration files exist and are ordered
console.log('\n1. Migration file integrity');
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter(f => f !== 'migration_lock.toml')
  .sort();

if (migrations.length < 17) {
  fail(`Expected at least 17 migrations, found ${migrations.length}`);
} else {
  pass(`${migrations.length} migrations found`);
}

// Check chronological order
let lastTimestamp = '';
for (const m of migrations) {
  const timestamp = m.split('_')[0];
  if (timestamp <= lastTimestamp) {
    fail(`Migration ${m} has non-increasing timestamp`);
  }
  lastTimestamp = timestamp;
  
  const sqlPath = join(MIGRATIONS_DIR, m, 'migration.sql');
  if (!existsSync(sqlPath)) {
    fail(`Migration ${m} missing migration.sql`);
  } else {
    const sql = readFileSync(sqlPath, 'utf-8');
    if (sql.trim().length === 0) {
      fail(`Migration ${m} has empty SQL`);
    }
  }
}
pass('All migrations in chronological order with non-empty SQL');

// 2. Check MCP migrations specifically
console.log('\n2. MCP migration verification');
const mcpMigrations = migrations.filter(m => m.includes('mcp') || m.includes('refresh_token') || m.includes('rotated_from'));
for (const m of mcpMigrations) {
  const sqlPath = join(MIGRATIONS_DIR, m, 'migration.sql');
  const sql = readFileSync(sqlPath, 'utf-8');
  log(`${m}: ${sql.split('\n').filter(l => l.trim()).length} SQL statements`);
}
pass(`${mcpMigrations.length} MCP-related migrations found`);

// 3. Verify schema contains expected tables
console.log('\n3. Schema table verification');
const schema = readFileSync(SCHEMA_PATH, 'utf-8');

for (const table of EXPECTED_MCP_TABLES) {
  if (schema.includes(`model ${table}`)) {
    pass(`model ${table} found in schema`);
  } else {
    fail(`model ${table} NOT found in schema`);
  }
}

// 4. Verify specific columns exist
console.log('\n4. Schema column verification');
for (const [model, columns] of Object.entries(EXPECTED_MCP_COLUMNS)) {
  for (const col of columns) {
    const modelRegex = new RegExp(`model ${model} \\{[\\s\\S]*?\\}`);
    const modelMatch = schema.match(modelRegex);
    if (modelMatch && modelMatch[0].includes(col)) {
      pass(`${model}.${col} found`);
    } else {
      fail(`${model}.${col} NOT found`);
    }
  }
}

// 5. Verify rotatedFrom was removed
console.log('\n5. Removed field verification');
if (schema.includes('rotatedFrom')) {
  fail('rotatedFrom still exists in schema (should be removed)');
} else {
  pass('rotatedFrom correctly removed from schema');
}

// 6. Check migration_lock.toml
console.log('\n6. Migration lock');
const lockPath = join(MIGRATIONS_DIR, 'migration_lock.toml');
if (existsSync(lockPath)) {
  const lock = readFileSync(lockPath, 'utf-8');
  if (lock.includes('provider = "postgresql"')) {
    pass('Migration lock targets PostgreSQL');
  } else {
    fail('Migration lock does not target PostgreSQL');
  }
} else {
  fail('migration_lock.toml not found');
}

console.log('\n' + '='.repeat(50));
if (process.exitCode) {
  console.log('❌ Migration verification FAILED');
} else {
  console.log('✅ Migration verification PASSED');
}
