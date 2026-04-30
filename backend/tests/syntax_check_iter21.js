#!/usr/bin/env node
// Iter21 — Syntax check for new/changed mobile files (ESM + JSX via @babel/parser)
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const FILES = [
  '/app/expo-app/src/screens/v2/ContentDetailScreen.js',
  '/app/expo-app/src/screens/v2/LanguageSettingsScreen.js',
  '/app/expo-app/src/screens/v2/ProfileScreen.js',
  '/app/expo-app/App.js',
  '/app/expo-app/src/contexts/AuthContext.js',
  '/app/expo-app/src/api/client.js',
];

let failed = 0;
for (const f of FILES) {
  try {
    const src = fs.readFileSync(f, 'utf8');
    parser.parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'objectRestSpread', 'asyncGenerators', 'dynamicImport'],
    });
    console.log(`OK     ${f}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL   ${f}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
