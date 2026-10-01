// Columnar wire format for large row arrays sent from the server to the
// client (API responses and server-rendered props). Repeated object keys are
// written once, and low-cardinality string columns (customer names, statuses,
// periods…) become an index into a small dictionary. Typically 4–8x smaller
// than `JSON.stringify(rows)` and much cheaper to parse.

type DictColumn = { d: (string | null)[]; i: number[] };
type ValueColumn = { v: unknown[] };

export type PackedRows<T> = {
  n: number;
  c: Partial<Record<keyof T & string, DictColumn | ValueColumn>>;
};

export function packRows<T extends object>(rows: T[]): PackedRows<T> {
  const keys = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }

  const columns: Record<string, DictColumn | ValueColumn> = {};

  for (const key of keys) {
    const values = rows.map((row) => (row as Record<string, unknown>)[key] ?? null);
    const isText = values.every((value) => value === null || typeof value === "string");

    if (!isText) {
      columns[key] = { v: values };
      continue;
    }

    const dictionary: (string | null)[] = [];
    const lookup = new Map<string | null, number>();
    const indexes = values.map((value) => {
      const text = value as string | null;
      let index = lookup.get(text);

      if (index === undefined) {
        index = dictionary.length;
        dictionary.push(text);
        lookup.set(text, index);
      }

      return index;
    });

    // Mostly-unique columns (document numbers, dates) gain nothing from a dictionary.
    columns[key] = dictionary.length > rows.length / 2 ? { v: values } : { d: dictionary, i: indexes };
  }

  return { n: rows.length, c: columns as PackedRows<T>["c"] };
}

export function unpackRows<T extends object>(packed: PackedRows<T>): T[] {
  const entries = Object.entries(packed.c) as [string, DictColumn | ValueColumn][];
  const rows = new Array<T>(packed.n);

  for (let index = 0; index < packed.n; index += 1) {
    const row: Record<string, unknown> = {};

    for (const [key, column] of entries) {
      row[key] = "d" in column ? column.d[column.i[index]] : column.v[index];
    }

    rows[index] = row as T;
  }

  return rows;
}

export function isPackedRows<T extends object>(value: unknown): value is PackedRows<T> {
  return Boolean(value) && typeof value === "object" && typeof (value as PackedRows<T>).n === "number" && typeof (value as PackedRows<T>).c === "object";
}
