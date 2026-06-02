/**
 * Report export helpers. A Report has optional summary "sections" (label/value
 * blocks) and an optional detailed "table" (columns + rows). Summary-only
 * reports render as a simple portrait page; reports with a table render as a
 * bordered, paginated table in landscape. CSV carries everything.
 */

export type ReportRow = { label: string; value: string };
export type ReportSection = { title: string; rows: ReportRow[] };
export type ReportColumn = { header: string; width: number }; // width in PDF points
export type ReportTable = { title: string; columns: ReportColumn[]; rows: string[][] };
export type Report = {
  workspace: string;
  title: string;
  generatedAt: string;
  sections: ReportSection[];
  table?: ReportTable;
};

// --- CSV -------------------------------------------------------------------

function csvCell(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function reportToCsv(report: Report): string {
  const lines: string[] = [];
  lines.push(csvCell(report.title));
  lines.push([csvCell("Workspace"), csvCell(report.workspace)].join(","));
  lines.push([csvCell("Generated"), csvCell(report.generatedAt)].join(","));
  lines.push("");

  for (const section of report.sections) {
    lines.push([csvCell(section.title), csvCell("Value")].join(","));
    for (const row of section.rows) {
      lines.push([csvCell(row.label), csvCell(row.value)].join(","));
    }
    lines.push("");
  }

  if (report.table) {
    lines.push(csvCell(report.table.title));
    lines.push(report.table.columns.map((c) => csvCell(c.header)).join(","));
    for (const row of report.table.rows) {
      lines.push(row.map(csvCell).join(","));
    }
    lines.push("");
  }

  return lines.join("\r\n");
}

// --- PDF -------------------------------------------------------------------

function sanitize(value: string): string {
  // Map common typographic characters to ASCII so they render in the standard
  // fonts (anything still outside Latin-1 falls back to "?").
  return value
    .replace(/[·•]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/…/g, "...")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return sanitize(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function clipToWidth(value: string, width: number, fontSize: number): string {
  const max = Math.max(1, Math.floor((width - 6) / (fontSize * 0.5)));
  const clean = sanitize(value);
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function textAt(x: number, y: number, value: string, size: number, bold: boolean): string {
  const font = bold ? "/F2" : "/F1";
  return `${font} ${size} Tf 0 0 0 rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(value)}) Tj\n`;
}

function assemblePdf(pages: Array<{ width: number; height: number; content: string }>): Buffer {
  const objects: string[] = [];
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageObjNums = pages.map((_, i) => 5 + i * 2);
  objects[1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((page, i) => {
    const pageNum = 5 + i * 2;
    const contentNum = pageNum + 1;
    objects[pageNum - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum - 1] = `<< /Length ${Buffer.byteLength(page.content, "latin1")} >>\nstream\n${page.content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  const count = objects.length + 1;
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

/** Summary-only report: simple portrait page(s) of label/value lines. */
function summaryPdf(report: Report): Buffer {
  const W = 612;
  const H = 792;
  const top = 760;
  const bottom = 54;
  const leading = 16;
  const perPage = Math.max(1, Math.floor((top - bottom) / leading));

  const lines: Array<{ text: string; bold?: boolean; size?: number }> = [];
  lines.push({ text: report.title, bold: true, size: 18 });
  lines.push({ text: `${report.workspace}  ·  generated ${report.generatedAt}`, size: 10 });
  lines.push({ text: "" });
  for (const section of report.sections) {
    lines.push({ text: section.title, bold: true, size: 12 });
    for (const row of section.rows) {
      lines.push({ text: `   ${row.label}: ${row.value}` });
    }
    lines.push({ text: "" });
  }

  const chunks: (typeof lines)[] = [];
  for (let i = 0; i < lines.length; i += perPage) chunks.push(lines.slice(i, i + perPage));
  if (chunks.length === 0) chunks.push([]);

  const pages = chunks.map((chunk) => {
    let text = "BT\n";
    chunk.forEach((line, index) => {
      const size = line.size ?? (line.bold ? 12 : 10);
      const y = top - index * leading;
      text += textAt(50, y, line.text, size, Boolean(line.bold));
    });
    text += "ET";
    return { width: W, height: H, content: text };
  });

  return assemblePdf(pages);
}

/** Detailed report: bordered, paginated table in landscape. */
function tablePdf(report: Report): Buffer {
  const table = report.table!;
  const W = 792;
  const H = 612;
  const marginX = 36;
  const marginBottom = 40;
  const tableWidth = table.columns.reduce((sum, c) => sum + c.width, 0);
  const rowH = 16;
  const headerH = 18;
  const dataSize = 8;

  const summary = report.sections.find((s) => s.title === "Summary");
  const filters = report.sections.find((s) => s.title === "Filters");

  const pages: Array<{ width: number; height: number; content: string }> = [];
  let rowIdx = 0;
  let pageNum = 0;

  do {
    pageNum += 1;
    let g = ""; // graphics (fills + lines)
    let t = ""; // text ops (wrapped in BT/ET)
    let y = H - 40;

    if (pageNum === 1) {
      t += textAt(marginX, y, report.title, 16, true);
      y -= 20;
      t += textAt(marginX, y, `${report.workspace}  ·  generated ${report.generatedAt}`, 9, false);
      y -= 15;
      const blurbs: string[] = [];
      if (summary) blurbs.push(...summary.rows.map((r) => `${r.label}: ${r.value}`));
      if (filters) blurbs.push(...filters.rows.map((r) => `${r.label}: ${r.value}`));
      for (let i = 0; i < blurbs.length; i += 4) {
        t += textAt(marginX, y, blurbs.slice(i, i + 4).join("    "), 8, false);
        y -= 12;
      }
      y -= 8;
    }

    // header row background + text
    const headerTop = y;
    g += `0.91 0.94 0.98 rg\n${marginX} ${headerTop - headerH} ${tableWidth} ${headerH} re f\n`;
    g += `0.80 0.85 0.90 RG\n0.5 w\n`;
    g += `${marginX} ${headerTop} m ${marginX + tableWidth} ${headerTop} l S\n`;
    let cx = marginX;
    table.columns.forEach((c) => {
      t += textAt(cx + 3, headerTop - 13, clipToWidth(c.header, c.width, dataSize), dataSize, true);
      cx += c.width;
    });
    let yCursor = headerTop - headerH;
    g += `${marginX} ${yCursor} m ${marginX + tableWidth} ${yCursor} l S\n`;

    // data rows
    while (rowIdx < table.rows.length && yCursor - rowH >= marginBottom) {
      const row = table.rows[rowIdx];
      let rx = marginX;
      table.columns.forEach((c, ci) => {
        t += textAt(rx + 3, yCursor - 12, clipToWidth(String(row[ci] ?? ""), c.width, dataSize), dataSize, false);
        rx += c.width;
      });
      yCursor -= rowH;
      g += `${marginX} ${yCursor} m ${marginX + tableWidth} ${yCursor} l S\n`;
      rowIdx += 1;
    }

    if (table.rows.length === 0) {
      t += textAt(marginX + 3, yCursor - 12, "No matching tickets.", dataSize, false);
      yCursor -= rowH;
    }

    // vertical column separators
    let vx = marginX;
    g += `${vx} ${headerTop} m ${vx} ${yCursor} l S\n`;
    table.columns.forEach((c) => {
      vx += c.width;
      g += `${vx} ${headerTop} m ${vx} ${yCursor} l S\n`;
    });

    pages.push({ width: W, height: H, content: `${g}BT\n${t}ET` });
  } while (rowIdx < table.rows.length);

  return assemblePdf(pages);
}

export function reportToPdf(report: Report): Buffer {
  return report.table ? tablePdf(report) : summaryPdf(report);
}
