#!/usr/bin/env node
/**
 * Apply published_date migration via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN (from https://supabase.com/dashboard/account/tokens)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRef = 'kzzyuexcyytqlbqqmhcj';
const migrationPath = path.join(
  __dirname,
  '../supabase/migrations/20260617183000_add_books_published_date.sql'
);

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  console.error('Create one at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);

const body = await res.text();
if (!res.ok) {
  console.error('Migration failed:', res.status, body);
  process.exit(1);
}

console.log('Migration applied successfully.');
console.log(body);

// Backfill ABOUT FACE published_date
const { createClient } = await import('@supabase/supabase-js');
const envPath = path.join(__dirname, '../.env.local');
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await supabase
  .from('books')
  .update({ published_date: '2024-06-10', updated_at: new Date().toISOString() })
  .eq('isbn', '9784839981884');

if (error) {
  console.error('Backfill failed:', error.message);
  process.exit(1);
}

console.log('Backfilled published_date for 9784839981884');
