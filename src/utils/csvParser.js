/**
 * CSV parsing with flexible column auto-mapping.
 *
 * Ported from the Python canon() + column-mapping logic at:
 *   https://github.com/aonawunmi/investment-performance-portal/blob/main/app.py
 *
 * Uses PapaParse for robust CSV parsing (multi-encoding, auto-detect separator).
 *
 * @module csvParser
 */

import Papa from 'papaparse';
import { toFloat } from './formatters';

/**
 * Canonicalize a column name: lowercase, strip all non-alphanumeric chars.
 * Example: "Asset Class" → "assetclass", "Beginning MV" → "beginningmv"
 */
function canon(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Column alias maps ─────────────────────────────────────────────────────────

const ASSET_COLUMN_ALIASES = {
  assetClass: ['assetclass', 'asset', 'class', 'sector', 'fund', 'category'],
  beginningValue: ['beginningmv', 'openingmv', 'bv', 'bmv', 'startmv', 'beginningvalue', 'openingvalue', 'startvalue', 'beginmv'],
  endingValue: ['endingmv', 'closingmv', 'ev', 'emv', 'endmv', 'endingvalue', 'closingvalue', 'endvalue'],
};

const CASHFLOW_COLUMN_ALIASES = {
  transactionDate: ['transactiondate', 'date', 'tradedate', 'valuedate', 'txdate', 'txndate'],
  transactionType: ['transactiontype', 'type', 'txtype', 'txntype', 'direction', 'flowtype'],
  details: ['transactiondetails', 'details', 'description', 'narration', 'memo', 'notes', 'reference'],
  amount: ['amount', 'amt', 'value', 'cashflow', 'cf', 'flow'],
  assetClass: ['assetclass', 'asset', 'class', 'sector', 'fund', 'category'],
};

/**
 * Try to auto-map raw CSV column headers to expected field names.
 *
 * @param {string[]} rawHeaders - The actual CSV column headers
 * @param {Object} aliasMap     - Map of { targetField: [alias1, alias2, ...] }
 * @returns {{ mapping: Object<string, string>, missing: string[] }}
 *   mapping: { targetField → rawHeader }
 *   missing: target fields that could not be matched
 */
function autoMapColumns(rawHeaders, aliasMap) {
  const mapping = {};
  const canonHeaders = rawHeaders.map((h) => ({ raw: h, canon: canon(h) }));

  for (const [target, aliases] of Object.entries(aliasMap)) {
    let matched = false;
    for (const alias of aliases) {
      const found = canonHeaders.find((h) => h.canon === alias);
      if (found) {
        mapping[target] = found.raw;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Try substring match as fallback
      for (const alias of aliases) {
        const found = canonHeaders.find((h) => h.canon.includes(alias) || alias.includes(h.canon));
        if (found && !Object.values(mapping).includes(found.raw)) {
          mapping[target] = found.raw;
          matched = true;
          break;
        }
      }
    }
  }

  const missing = Object.keys(aliasMap).filter((k) => !mapping[k]);
  return { mapping, missing };
}

/**
 * Parse a CSV file (from an HTML File input) and return the raw parsed data.
 *
 * @param {File} file
 * @returns {Promise<{data: Object[], headers: string[], errors: string[]}>}
 */
export function parseCSV(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // we handle type conversion ourselves
      complete(results) {
        const headers = results.meta.fields || [];
        const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`);
        resolve({ data: results.data, headers, errors });
      },
      error(err) {
        resolve({ data: [], headers: [], errors: [err.message] });
      },
    });
  });
}

/**
 * Parse an assets CSV file and return structured asset data.
 *
 * Expected columns (flexible naming):
 *   Asset Class | Beginning MV | Ending MV
 *
 * @param {File} file
 * @returns {Promise<{
 *   assets: Array<{name: string, beginningValue: number, endingValue: number}>,
 *   errors: string[]
 * }>}
 */
export async function parseAssetsCSV(file) {
  const { data, headers, errors } = await parseCSV(file);
  if (errors.length > 0) return { assets: [], errors };

  const { mapping, missing } = autoMapColumns(headers, ASSET_COLUMN_ALIASES);

  if (missing.length > 0) {
    return {
      assets: [],
      errors: [`Could not auto-map columns: ${missing.join(', ')}. Found headers: ${headers.join(', ')}`],
    };
  }

  const assets = data
    .map((row) => ({
      name: String(row[mapping.assetClass] || '').trim(),
      beginningValue: toFloat(row[mapping.beginningValue]),
      endingValue: toFloat(row[mapping.endingValue]),
    }))
    .filter((a) => a.name && Number.isFinite(a.beginningValue) && Number.isFinite(a.endingValue));

  return { assets, errors: [] };
}

/**
 * Parse a cashflows CSV file and return structured transaction data.
 *
 * Expected columns (flexible naming):
 *   Transaction Date | Transaction Type | Amount | Asset Class
 *   Optional: Transaction Details
 *
 * Transaction Type must be "INFLOW" or "OUTFLOW" (case-insensitive).
 * Amount is always stored as a signed value: + for INFLOW, - for OUTFLOW.
 *
 * @param {File} file
 * @returns {Promise<{
 *   cashflows: Array<{date: Date, amount: number, assetClass: string, details: string, type: string}>,
 *   errors: string[]
 * }>}
 */
export async function parseCashflowsCSV(file) {
  const { data, headers, errors } = await parseCSV(file);
  if (errors.length > 0) return { cashflows: [], errors };

  const { mapping, missing } = autoMapColumns(headers, CASHFLOW_COLUMN_ALIASES);

  // details is optional
  const requiredMissing = missing.filter((m) => m !== 'details');
  if (requiredMissing.length > 0) {
    return {
      cashflows: [],
      errors: [`Could not auto-map columns: ${requiredMissing.join(', ')}. Found headers: ${headers.join(', ')}`],
    };
  }

  const parseErrors = [];
  const cashflows = [];

  data.forEach((row, idx) => {
    const rawDate = row[mapping.transactionDate];
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      parseErrors.push(`Row ${idx + 1}: Invalid date "${rawDate}"`);
      return;
    }

    const rawType = String(row[mapping.transactionType] || '').trim().toUpperCase();
    if (rawType !== 'INFLOW' && rawType !== 'OUTFLOW') {
      parseErrors.push(`Row ${idx + 1}: Invalid transaction type "${rawType}" (must be INFLOW or OUTFLOW)`);
      return;
    }

    const rawAmount = toFloat(row[mapping.amount]);
    if (!Number.isFinite(rawAmount) || rawAmount < 0) {
      parseErrors.push(`Row ${idx + 1}: Invalid amount "${row[mapping.amount]}"`);
      return;
    }

    const signedAmount = rawType === 'INFLOW' ? rawAmount : -rawAmount;
    const assetClass = String(row[mapping.assetClass] || '').trim();
    const details = mapping.details ? String(row[mapping.details] || '').trim() : '';

    cashflows.push({
      date,
      amount: signedAmount,
      assetClass,
      details,
      type: rawType,
      rawAmount,
    });
  });

  return { cashflows, errors: parseErrors };
}
