#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const localesDir = path.join(rootDir, 'public', 'locales');
const baseLocale = 'fr';

const localeDirs = readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

if (!localeDirs.includes(baseLocale)) {
    console.error(`Base locale "${baseLocale}" not found under ${localesDir}`);
    process.exit(1);
}

const baseTranslations = loadTranslations(baseLocale);
const baseKeys = collectKeys(baseTranslations);
let hasErrors = false;

for (const locale of localeDirs) {
    if (locale === baseLocale) {
        continue;
    }

    const targetTranslations = loadTranslations(locale);
    const targetKeys = collectKeys(targetTranslations);

    const missing = diffKeys(baseKeys, targetKeys);
    const extra = diffKeys(targetKeys, baseKeys);

    if (missing.length) {
        hasErrors = true;
        console.error(`Locale "${locale}" missing ${missing.length} keys compared to "${baseLocale}".`);
        debugList('Missing keys', missing);
    } else {
        console.log(`Locale "${locale}" matches "${baseLocale}" for required keys.`);
    }

    if (extra.length) {
        console.warn(`Locale "${locale}" has ${extra.length} extra keys compared to "${baseLocale}".`);
        debugList('Extra keys', extra);
    }
}

if (hasErrors) {
    process.exit(1);
}

function loadTranslations(locale) {
    const filePath = path.join(localesDir, locale, 'translation.json');
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function collectKeys(obj, prefix = '') {
    const keys = new Set();
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
            const nextPrefix = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                for (const nested of collectKeys(value, nextPrefix)) {
                    keys.add(nested);
                }
            } else {
                keys.add(nextPrefix);
            }
        }
    } else if (prefix) {
        keys.add(prefix);
    }
    return keys;
}

function diffKeys(sourceKeys, targetKeys) {
    return Array.from(sourceKeys).filter((key) => !targetKeys.has(key));
}

function debugList(label, keys) {
    const preview = keys.slice(0, 10).join(', ');
    console.error(`  ${label}: ${preview}${keys.length > 10 ? '…' : ''}`);
}
