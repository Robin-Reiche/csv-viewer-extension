import type { CsvRow } from '../types';

export function parseCsv(text: string, delimiter: string): CsvRow[] {
    const rows: CsvRow[] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === delimiter) {
            row.push(field.trim());
            field = '';
        } else if (ch === '\r') {
            // skip
        } else if (ch === '\n') {
            row.push(field.trim());
            if (row.length > 0) rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }
    row.push(field.trim());
    if (row.some(f => f !== '')) rows.push(row);
    return rows;
}

export function toCsv(rows: CsvRow[], delimiter: string): string {
    return rows.map(row =>
        row.map(cell => {
            const s = String(cell);
            if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        }).join(delimiter)
    ).join('\n');
}

export function colLetter(i: number): string {
    let s = '';
    let n = i;
    while (n >= 0) {
        s = String.fromCharCode(65 + (n % 26)) + s;
        n = Math.floor(n / 26) - 1;
    }
    return s;
}
