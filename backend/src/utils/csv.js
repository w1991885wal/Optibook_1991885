// Tiny zero-dependency CSV helpers used by the admin reports endpoints.
// RFC 4180-flavoured: fields are wrapped in quotes when they contain a
// comma, double-quote, CR or LF; internal quotes are doubled; everything
// else passes through unchanged. CRLF line endings keep Excel happy.

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV string from a list of column descriptors and a list of rows.
 * @param {Array<{header: string, get: (row: any) => any}>} columns
 * @param {Array<any>} rows
 */
function toCsv(columns, rows) {
  const head = columns.map((c) => csvEscape(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvEscape(c.get(r))).join(','))
    .join('\r\n');
  return body ? `${head}\r\n${body}\r\n` : `${head}\r\n`;
}

module.exports = { csvEscape, toCsv };
