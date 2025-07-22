import * as XLSX from "xlsx";
import type { ParsedSIM } from "../types/index.ts";

export async function parseFile(file: File): Promise<ParsedSIM[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  // Read file as text or buffer depending on type
  const isText = ext === "txt" || ext === "csv" || ext === "json";
  const content = isText ? await file.text() : await file.arrayBuffer();

  let worksheet: XLSX.WorkSheet;

  if (ext === "json") {
    const json = JSON.parse(content as string);
    worksheet = XLSX.utils.json_to_sheet(json);
  } else if (ext === "txt" || ext === "csv") {
    worksheet = XLSX.read(content, { type: "string" }).Sheets.Sheet1;
  } else {
    const workbook = XLSX.read(content, { type: "array" });
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  }
  // Convert sheet to 2D array of rows
  const raw: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`Raw data from file: ${JSON.stringify(raw)}`);
  if (raw.length === 0) {
    throw new Error("The file is empty or unreadable.");
  }

  const result: ParsedSIM[] = [];

  for (const row of raw) {
    if (!Array.isArray(row)) continue;

    const iccidRaw = String(row[0] ?? "").trim();

    if (!validateIccid(iccidRaw)) continue;

    const sim: ParsedSIM = { iccid: iccidRaw };

    const nameRaw = row[1] ? String(row[1]).trim() : "";
    if (nameRaw) sim.epName = nameRaw;

    result.push(sim);
    console.log(`Parsed SIM: ${result}`);
  }

  //   if (result.length === 0) {
  //     throw new Error("No valid ICCID entries found in the file.");
  //   }
  console.log(`Parsed ${result.length} valid ICCID entries.`);
  return result;
}

function validateIccid(iccid: string): boolean {
  return /^89\d{17,18}$/.test(iccid);
}
