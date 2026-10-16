import { inflateSync } from 'node:zlib';

/**
 * Test-only text extraction for receipts rendered by pdfkit with its built-in
 * (WinAnsi) fonts: inflates each content stream and decodes the hex strings
 * inside `[...] TJ` operators. One returned line per text-showing operator,
 * in drawing order. Not a general PDF parser.
 */
export function extractPdfText(pdf: Buffer): string[] {
  const raw = pdf.toString('latin1');
  const lines: string[] = [];
  const streamPattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = streamPattern.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    let content: string;
    try {
      content = inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1');
    } catch {
      continue; // image or other non-deflate stream
    }
    for (const op of content.matchAll(/\[((?:<[0-9a-fA-F]*>|[-\d.\s])*)\]\s*TJ/g)) {
      const text = [...op[1].matchAll(/<([0-9a-fA-F]*)>/g)]
        .map((hex) => Buffer.from(hex[1], 'hex').toString('latin1'))
        .join('');
      if (text) lines.push(text);
    }
    streamPattern.lastIndex = end;
  }
  return lines;
}

/** WinAnsi code points pdfkit emits that differ from Latin-1. */
const WIN_ANSI: Record<number, string> = {
  0x80: '€',
  0x85: '…',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x96: '–',
  0x97: '—',
};

export interface PdfTextRun {
  text: string;
  /** Page index (0-based), in content-stream order. */
  page: number;
  /** Left edge and baseline, in PDF points from the page's bottom-left. */
  x: number;
  y: number;
  size: number;
}

/**
 * Like `extractPdfText`, but with each run's position and font size, read
 * from the `x y Tm` / `/F size Tf` operators pdfkit writes before each `TJ`.
 */
export function extractPdfTextRuns(pdf: Buffer): PdfTextRun[] {
  const raw = pdf.toString('latin1');
  const runs: PdfTextRun[] = [];
  let page = -1;
  let position = 0;
  for (;;) {
    const marker = raw.indexOf('stream\n', position);
    if (marker < 0) break;
    const start = marker + 'stream\n'.length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    position = end + 'endstream'.length;
    let content: string;
    try {
      content = inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1');
    } catch {
      continue;
    }
    if (!content.includes(' TJ')) continue;
    page += 1;
    const ops = content.matchAll(
      /1 0 0 1 ([-\d.]+) ([-\d.]+) Tm\s*\/\w+ ([\d.]+) Tf\s*\[((?:<[0-9a-fA-F]*>|[-\d.\s])*)\]\s*TJ/g,
    );
    for (const op of ops) {
      const text = [...op[4].matchAll(/<([0-9a-fA-F]*)>/g)]
        .map((hex) =>
          [...Buffer.from(hex[1], 'hex')]
            .map((code) => WIN_ANSI[code] ?? String.fromCharCode(code))
            .join(''),
        )
        .join('');
      if (text) runs.push({ text, page, x: Number(op[1]), y: Number(op[2]), size: Number(op[3]) });
    }
  }
  return runs;
}

/** Page objects in the document (`/Type /Page`, not `/Pages`). */
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;
}
