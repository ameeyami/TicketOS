/**
 * Report export helpers. A Report is a simple structured object; we render it
 * to CSV or to a minimal, dependency-free PDF.
 */

export type ReportRow = { label: string; value: string };
export type ReportSection = { title: string; rows: ReportRow[] };
export type Report = {
  workspace: string;
  generatedAt: string; // human-readable date
  sections: ReportSection[];
};

// --- CSV -------------------------------------------------------------------

function csvCell(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function reportToCsv(report: Report): string {
  const lines: string[] = [];
  lines.push(csvCell("TicketOS Operations Report"));
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

  return lines.join("\r\n");
}

// --- PDF -------------------------------------------------------------------

// Keep text inside the Latin-1 range so byte offsets (used in the xref table)
// stay accurate and glyphs render in the standard fonts.
function sanitize(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string): string {
  return sanitize(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Builds a valid single-page US-Letter PDF with a bold title and a list of
 * lines, computing byte-accurate xref offsets by hand (no dependency).
 */
export function reportToPdf(report: Report): Buffer {
  const lines: Array<{ text: string; bold?: boolean }> = [];
  lines.push({ text: report.workspace, bold: true });
  lines.push({ text: `Generated ${report.generatedAt}` });
  lines.push({ text: "" });
  for (const section of report.sections) {
    lines.push({ text: section.title, bold: true });
    for (const row of section.rows) {
      lines.push({ text: `   ${row.label}: ${row.value}` });
    }
    lines.push({ text: "" });
  }

  // Content stream: start near the top, 16pt leading, move down per line.
  let content = "BT\n16 TL\n50 760 Td\n";
  lines.forEach((line, index) => {
    const font = line.bold ? "/F2 13 Tf" : "/F1 11 Tf";
    if (index === 0) {
      content += `/F2 18 Tf (${escapePdfText(line.text)}) Tj\n`;
    } else {
      content += `T* ${font} (${escapePdfText(line.text)}) Tj\n`;
    }
  });
  content += "ET";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

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
