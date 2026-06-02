/**
 * Report export helpers. A Report has optional summary "sections" (label/value
 * blocks) and an optional detailed "table" (columns + rows). We render either
 * to CSV or to a multi-page, dependency-free PDF.
 */

export type ReportRow = { label: string; value: string };
export type ReportSection = { title: string; rows: ReportRow[] };
export type ReportTable = { title: string; columns: string[]; rows: string[][] };
export type Report = {
  workspace: string;
  title: string;
  generatedAt: string; // human-readable date
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
    lines.push(report.table.columns.map(csvCell).join(","));
    for (const row of report.table.rows) {
      lines.push(row.map(csvCell).join(","));
    }
    lines.push("");
  }

  return lines.join("\r\n");
}

// --- PDF -------------------------------------------------------------------

type PdfLine = { text: string; bold?: boolean; size?: number };

// Keep text inside the Latin-1 range so byte offsets (used in the xref table)
// stay accurate and glyphs render in the standard fonts.
function sanitize(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return sanitize(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function reportToLines(report: Report): PdfLine[] {
  const lines: PdfLine[] = [];
  lines.push({ text: report.title, bold: true, size: 18 });
  lines.push({ text: `${report.workspace}  ·  generated ${report.generatedAt}`, size: 10 });
  lines.push({ text: "" });

  for (const section of report.sections) {
    lines.push({ text: section.title, bold: true, size: 12 });
    for (const row of section.rows) {
      lines.push({ text: clip(`   ${row.label}: ${row.value}`, 95) });
    }
    lines.push({ text: "" });
  }

  if (report.table) {
    lines.push({ text: report.table.title, bold: true, size: 12 });
    if (report.table.rows.length === 0) {
      lines.push({ text: "   No matching tickets." });
    }
    for (const row of report.table.rows) {
      // First two columns headline the entry (e.g. ID + title); the rest become
      // a "Label: value" meta line so a wide table stays readable in a PDF.
      const headline = clip(`${row[0] ?? ""}  ${row[1] ?? ""}`.trim(), 92);
      const meta = report.table.columns
        .slice(2)
        .map((column, index) => `${column}: ${row[index + 2] ?? ""}`)
        .join("  ·  ");
      lines.push({ text: headline, bold: true, size: 10 });
      lines.push({ text: clip(`   ${meta}`, 110), size: 9 });
    }
  }

  return lines;
}

/**
 * Builds a valid multi-page US-Letter PDF, computing byte-accurate xref offsets
 * by hand (no dependency). Fonts are objects 3 (Helvetica) and 4 (Bold);
 * page/content object pairs follow from object 5.
 */
export function reportToPdf(report: Report): Buffer {
  const lines = reportToLines(report);

  const top = 760;
  const bottom = 54;
  const leading = 15;
  const perPage = Math.max(1, Math.floor((top - bottom) / leading));

  const pages: PdfLine[][] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  if (pages.length === 0) pages.push([]);

  const contents = pages.map((pageLines) => {
    let stream = `BT\n${leading} TL\n50 ${top} Td\n`;
    pageLines.forEach((line, index) => {
      const size = line.size ?? (line.bold ? 12 : 10);
      const font = line.bold ? "/F2" : "/F1";
      const move = index === 0 ? "" : "T* ";
      stream += `${move}${font} ${size} Tf (${escapePdfText(line.text)}) Tj\n`;
    });
    stream += "ET";
    return stream;
  });

  const objects: string[] = [];
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageObjNums = pages.map((_, i) => 5 + i * 2);
  objects[1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((_, i) => {
    const pageNum = 5 + i * 2;
    const contentNum = pageNum + 1;
    objects[pageNum - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum - 1] = `<< /Length ${Buffer.byteLength(contents[i], "latin1")} >>\nstream\n${contents[i]}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  const count = objects.length + 1;
  pdf += `xref\n0 ${count}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
