/**
 * build-arch-doc.mjs
 *
 * Converts LIVE_MICROSERVICES_E2E_ARCHITECTURE.md to a formatted DOCX.
 * Steps:
 *   1. Parse markdown — split into text sections and mermaid blocks
 *   2. Render each mermaid block to PNG via mmdc (Puppeteer-backed)
 *   3. Assemble a Word document using the `docx` package
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = join(__dirname, '..', '..');
const SOURCE_MD  = join(REPO_ROOT, 'docs', 'architecture', 'LIVE_MICROSERVICES_E2E_ARCHITECTURE.md');
const OUTPUT_DIR = join(REPO_ROOT, 'docs', 'architecture');
const OUTPUT_DOCX = join(OUTPUT_DIR, 'CtrlChecks_Live_Microservices_Architecture.docx');
const DIAGRAM_DIR = join(__dirname, 'diagrams');
const MMDC = join(__dirname, 'node_modules', '.bin', 'mmdc');

if (!existsSync(DIAGRAM_DIR)) mkdirSync(DIAGRAM_DIR, { recursive: true });

// ── Parse markdown ────────────────────────────────────────────────────────────
const raw = readFileSync(SOURCE_MD, 'utf8');

/**
 * Split markdown into segments:
 *   { type: 'text', content: string }
 *   { type: 'mermaid', content: string, index: number }
 *   { type: 'table', rows: string[][] }
 */
function parseSegments(markdown) {
  const segments = [];
  const lines = markdown.split('\n');
  let i = 0;
  let mermaidIndex = 0;

  while (i < lines.length) {
    if (lines[i].trim() === '```mermaid') {
      // Collect mermaid block
      const mermaidLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        mermaidLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      segments.push({ type: 'mermaid', content: mermaidLines.join('\n'), index: mermaidIndex++ });
    } else {
      // Collect text until next mermaid block
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== '```mermaid') {
        textLines.push(lines[i]);
        i++;
      }
      const text = textLines.join('\n').trim();
      if (text) segments.push({ type: 'text', content: text });
    }
  }
  return segments;
}

const segments = parseSegments(raw);
console.log(`Parsed ${segments.length} segments (${segments.filter(s => s.type === 'mermaid').length} diagrams)`);

// ── Render Mermaid diagrams to PNG ────────────────────────────────────────────
const diagramPaths = {};

for (const seg of segments.filter(s => s.type === 'mermaid')) {
  const mmdFile  = join(DIAGRAM_DIR, `diagram-${seg.index}.mmd`);
  const pngFile  = join(DIAGRAM_DIR, `diagram-${seg.index}.png`);

  writeFileSync(mmdFile, seg.content, 'utf8');

  console.log(`Rendering diagram ${seg.index}...`);
  try {
    execSync(
      `"${MMDC}" -i "${mmdFile}" -o "${pngFile}" --backgroundColor white --width 1400 --puppeteerConfigFile "${join(__dirname, 'puppeteer.json')}"`,
      { stdio: 'inherit', timeout: 60000 }
    );
    diagramPaths[seg.index] = pngFile;
    console.log(`  ✅ diagram-${seg.index}.png`);
  } catch (err) {
    console.error(`  ❌ Failed to render diagram ${seg.index}:`, err.message);
  }
}

// ── Build DOCX ────────────────────────────────────────────────────────────────
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  AlignmentType, PageBreak, PageOrientation, convertInchesToTwip,
  HorizontalPositionAlign, TableLayoutType, Header, Footer,
} from 'docx';

/** Parse inline markdown: bold (**text**), code (`text`), plain */
function parseInline(text) {
  const runs = [];
  // handle **bold** and `code` inline
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index) }));
    }
    if (m[0].startsWith('**')) {
      runs.push(new TextRun({ text: m[2], bold: true }));
    } else {
      runs.push(new TextRun({ text: m[3], font: 'Courier New', size: 18 }));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last) }));
  return runs.length ? runs : [new TextRun({ text })];
}

/** Parse a markdown table into array of rows (each row is array of cell strings) */
function parseTable(lines) {
  const rows = [];
  for (const line of lines) {
    if (/^[\|\s\-:]+$/.test(line.trim())) continue; // separator row
    const cells = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function makeTable(rows) {
  const isHeader = (rowIdx) => rowIdx === 0;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: rows.map((row, rowIdx) =>
      new TableRow({
        tableHeader: isHeader(rowIdx),
        children: row.map((cell, colIdx) =>
          new TableCell({
            shading: isHeader(rowIdx)
              ? { fill: '1a56db', type: ShadingType.CLEAR }
              : colIdx % 2 === 0
                ? { fill: 'f8f9fa', type: ShadingType.CLEAR }
                : { fill: 'ffffff', type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: parseInline(cell).map(r =>
                isHeader(rowIdx)
                  ? new TextRun({ text: r.text || '', bold: true, color: 'FFFFFF', size: 18 })
                  : r
              ),
              spacing: { before: 60, after: 60 },
            })],
          })
        ),
      })
    ),
  });
}

/**
 * Convert a text segment (markdown) into docx paragraphs / tables.
 */
function textToParagraphs(text) {
  const paras = [];
  const lines = text.split('\n');
  let i = 0;
  let tableLines = [];
  let inTable = false;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith('|')) {
      if (!inTable) inTable = true;
      tableLines.push(line);
      i++;
      continue;
    } else if (inTable) {
      // Flush table
      const rows = parseTable(tableLines);
      if (rows.length) paras.push(makeTable(rows));
      paras.push(new Paragraph({ text: '' })); // spacing after table
      tableLines = [];
      inTable = false;
    }

    // Headings
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const h4 = line.match(/^#### (.+)/);
    const bullet = line.match(/^[-*] (.+)/);
    const numbered = line.match(/^(\d+)\. (.+)/);
    const empty = line.trim() === '';
    const codeBlock = line.trim().startsWith('```');

    if (h1) {
      paras.push(new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 }));
    } else if (h2) {
      paras.push(new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 }));
    } else if (h3) {
      paras.push(new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 }));
    } else if (h4) {
      paras.push(new Paragraph({ text: h4[1], heading: HeadingLevel.HEADING_4 }));
    } else if (bullet) {
      paras.push(new Paragraph({
        children: parseInline(bullet[1]),
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      }));
    } else if (numbered) {
      paras.push(new Paragraph({
        children: parseInline(numbered[2]),
        numbering: { reference: 'default-numbering', level: 0 },
        spacing: { before: 60, after: 60 },
      }));
    } else if (empty) {
      paras.push(new Paragraph({ text: '', spacing: { before: 60, after: 60 } }));
    } else if (codeBlock) {
      // Skip raw code fences (non-mermaid)
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) i++;
    } else if (line.trim()) {
      paras.push(new Paragraph({
        children: parseInline(line),
        spacing: { before: 80, after: 80 },
      }));
    }
    i++;
  }

  // Flush any trailing table
  if (inTable && tableLines.length) {
    const rows = parseTable(tableLines);
    if (rows.length) paras.push(makeTable(rows));
  }

  return paras;
}

// Build diagram section labels (derived from preceding H2/H3 heading)
function getDiagramLabel(segments, diagramIdx) {
  const labels = [
    'System Context (C4 Level 1)',
    'Deployment Topology (Single EC2 Host)',
    'Request Routing and API Gateway Pattern',
    'AI Workflow Generation Pipeline',
    'Workflow Save, Load, and CRUD Delegation',
    'Credential and OAuth Flow',
    'Execution Flow - Manual Trigger (Happy Path)',
    'Trigger Flows - Form, Webhook, Schedule, and Chat',
    'Real-Time Observability and Notifications',
    'Data and Control Planes',
  ];
  return labels[diagramIdx] || `Diagram ${diagramIdx + 1}`;
}

// ── Assemble document children ────────────────────────────────────────────────
const children = [];

for (const seg of segments) {
  if (seg.type === 'text') {
    children.push(...textToParagraphs(seg.content));
  } else if (seg.type === 'mermaid') {
    const pngPath = diagramPaths[seg.index];
    const label = getDiagramLabel(segments, seg.index);

    // Caption above
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Figure ${seg.index + 1}: `, bold: true, size: 20, color: '1a56db' }),
        new TextRun({ text: label, italics: true, size: 20, color: '374151' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 80 },
    }));

    if (pngPath && existsSync(pngPath)) {
      const imageData = readFileSync(pngPath);
      children.push(new Paragraph({
        children: [
          new ImageRun({
            data: imageData,
            transformation: { width: 620, height: 380 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 200 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: '[Diagram not available]', italics: true, color: 'cc0000' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 200 },
      }));
    }
  }
}

// ── Create Document ───────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: 'default-numbering',
      levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
    }],
  },
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22 },
        paragraph: { spacing: { line: 276 } },
      },
      heading1: {
        run: { font: 'Calibri', size: 36, bold: true, color: '1a56db' },
        paragraph: {
          spacing: { before: 360, after: 180 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a56db', space: 4 } },
        },
      },
      heading2: {
        run: { font: 'Calibri', size: 28, bold: true, color: '1e429f' },
        paragraph: { spacing: { before: 300, after: 120 } },
      },
      heading3: {
        run: { font: 'Calibri', size: 24, bold: true, color: '374151' },
        paragraph: { spacing: { before: 240, after: 100 } },
      },
      heading4: {
        run: { font: 'Calibri', size: 22, bold: true, color: '4b5563' },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: convertInchesToTwip(11), height: convertInchesToTwip(8.5), orientation: PageOrientation.LANDSCAPE },
        margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.9), right: convertInchesToTwip(0.9) },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: 'CtrlChecks — Live Microservices End-to-End Architecture', bold: true, color: '1a56db', size: 18 }),
            new TextRun({ text: '\t\tPRODUCTION BASELINE: 2026-06-20', size: 16, color: '6b7280' }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb', space: 4 } },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: 'Internal architecture document — CtrlChecks AI Workflow OS', size: 16, color: '9ca3af' }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb', space: 4 } },
        })],
      }),
    },
    children,
  }],
});

// ── Write output ──────────────────────────────────────────────────────────────
const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_DOCX, buffer);
console.log(`\n✅ DOCX written to: ${OUTPUT_DOCX}`);
console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
