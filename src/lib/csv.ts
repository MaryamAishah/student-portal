export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export type ParsedInviteRow = { fullName: string; email: string };

const NAME_HEADERS = ["name", "full_name", "fullname", "full name"];
const EMAIL_HEADERS = ["email", "e-mail", "email address"];

export function extractInviteRows(csvText: string): {
  rows: ParsedInviteRow[];
  error: string | null;
} {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { rows: [], error: "The file is empty." };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.findIndex((h) => NAME_HEADERS.includes(h));
  const emailIdx = header.findIndex((h) => EMAIL_HEADERS.includes(h));

  if (nameIdx === -1 || emailIdx === -1) {
    return {
      rows: [],
      error: 'The CSV needs a header row with "name" and "email" columns.',
    };
  }

  const rows: ParsedInviteRow[] = [];
  for (const line of table.slice(1)) {
    const fullName = (line[nameIdx] ?? "").trim();
    const email = (line[emailIdx] ?? "").trim();
    if (!fullName && !email) continue;
    rows.push({ fullName, email });
  }

  return { rows, error: null };
}

export type ParsedLessonRow = { title: string; description: string };

const TITLE_HEADERS = ["title", "lesson", "lesson title", "name"];
const DESCRIPTION_HEADERS = ["description", "desc", "notes"];

export function extractLessonRows(csvText: string): {
  rows: ParsedLessonRow[];
  error: string | null;
} {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { rows: [], error: "The file is empty." };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const titleIdx = header.findIndex((h) => TITLE_HEADERS.includes(h));
  const descriptionIdx = header.findIndex((h) => DESCRIPTION_HEADERS.includes(h));

  if (titleIdx === -1) {
    return {
      rows: [],
      error: 'The CSV needs a header row with a "title" column.',
    };
  }

  const rows: ParsedLessonRow[] = [];
  for (const line of table.slice(1)) {
    const title = (line[titleIdx] ?? "").trim();
    const description = descriptionIdx === -1 ? "" : (line[descriptionIdx] ?? "").trim();
    if (!title) continue;
    rows.push({ title, description });
  }

  return { rows, error: null };
}
