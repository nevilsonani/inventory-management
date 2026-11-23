type Cell = string | number | undefined;

function escape(cell: Cell) {
  const text = cell === undefined ? "" : String(cell);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Builds a CSV file in the browser and downloads it. */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  // BOM so Excel opens UTF-8 (₹, ×) correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
