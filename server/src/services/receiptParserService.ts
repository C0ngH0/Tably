import type {
  ExtractedReceipt,
  ExtractedReceiptItem,
  ReceiptValidation,
} from "../types/receipt";
import type { DetectedReceiptField } from "./textractService";

const MISMATCH_THRESHOLD = 0.05;

const EMPTY_RECEIPT: ExtractedReceipt = {
  restaurantName: "",
  rawText: "",
  subtotal: 0,
  tax: 0,
  total: 0,
  items: [],
};

const IGNORE_LINE_KEYWORDS = [
  "subtotal",
  "sub total",
  "tax",
  "total",
  "tip",
  "thank you",
  "address",
];

const ITEM_LINE_REGEX = /^(.+?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2}))$/;
const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const ADDRESS_REGEX =
  /^\d+\s+.+\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way)\b/i;

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function getLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
}

function containsIgnoredKeyword(line: string): boolean {
  const lowerLine = line.toLowerCase();
  return IGNORE_LINE_KEYWORDS.some((keyword) => lowerLine.includes(keyword));
}

function isPhoneNumber(line: string): boolean {
  return PHONE_REGEX.test(line);
}

function isAddressLine(line: string): boolean {
  return ADDRESS_REGEX.test(line);
}

function parsePrice(value: string): number | null {
  const normalized = value.replace(/[$,]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeFieldName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, "_");
}

function hasStructuredData(receipt: ExtractedReceipt): boolean {
  return (
    Boolean(receipt.restaurantName) ||
    receipt.items.length > 0 ||
    receipt.subtotal > 0 ||
    receipt.tax > 0 ||
    receipt.total > 0
  );
}

function buildReceiptValidation(receipt: ExtractedReceipt): ReceiptValidation {
  const warnings: string[] = [];
  const itemSubtotal = roundCurrency(
    receipt.items.reduce((sum, item) => sum + item.price, 0),
  );
  const expectedTotal = roundCurrency(itemSubtotal + receipt.tax);
  const difference =
    receipt.total > 0
      ? roundCurrency(receipt.total - expectedTotal)
      : receipt.subtotal > 0
        ? roundCurrency(receipt.subtotal - itemSubtotal)
        : 0;
  const subtotalDifference =
    receipt.subtotal > 0 ? roundCurrency(receipt.subtotal - itemSubtotal) : 0;
  const hasTotalMismatch = Math.abs(difference) > MISMATCH_THRESHOLD;

  if (hasTotalMismatch) {
    warnings.push("Parsed items do not add up to the receipt total.");
  }

  if (receipt.subtotal > 0 && Math.abs(subtotalDifference) > MISMATCH_THRESHOLD) {
    warnings.push("Parsed items do not add up to the receipt subtotal.");
  }

  return {
    itemSubtotal,
    expectedTotal,
    difference,
    hasMismatch: hasTotalMismatch,
    warnings,
  };
}

function withValidation(receipt: ExtractedReceipt): ExtractedReceipt {
  return {
    ...receipt,
    validation: buildReceiptValidation(receipt),
  };
}

function parseTrailingPrice(line: string): number | null {
  const match = line.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2}))\s*$/);
  if (!match) {
    return null;
  }

  return parsePrice(match[1]);
}

function parseAmountByKeyword(lines: string[], keywords: string[]): number {
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const hasKeyword = keywords.some((keyword) => lowerLine.includes(keyword));

    if (!hasKeyword) {
      continue;
    }

    const price = parseTrailingPrice(line);
    if (price !== null) {
      return price;
    }
  }

  return 0;
}

function parseTotal(lines: string[]): number {
  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes("subtotal") || lowerLine.includes("sub total")) {
      continue;
    }

    const hasTotalKeyword =
      lowerLine.includes("grand total") ||
      lowerLine.includes("amount due") ||
      lowerLine.includes("balance due") ||
      lowerLine.includes("total");

    if (!hasTotalKeyword) {
      continue;
    }

    const price = parseTrailingPrice(line);
    if (price !== null) {
      return price;
    }
  }

  return 0;
}

function looksLikeItemName(name: string): boolean {
  const normalized = name.trim();

  if (normalized.length < 2) {
    return false;
  }

  return /[a-z]/i.test(normalized);
}

function parseItemLine(line: string): ExtractedReceiptItem | null {
  if (
    containsIgnoredKeyword(line) ||
    isPhoneNumber(line) ||
    isAddressLine(line)
  ) {
    return null;
  }

  const match = line.match(ITEM_LINE_REGEX);
  if (!match) {
    return null;
  }

  const name = normalizeLine(match[1]);
  const price = parsePrice(match[2]);

  if (!looksLikeItemName(name) || price === null || price <= 0) {
    return null;
  }

  return { name, price };
}

function parseRestaurantName(lines: string[]): string {
  for (const line of lines) {
    if (
      containsIgnoredKeyword(line) ||
      isPhoneNumber(line) ||
      isAddressLine(line) ||
      parseItemLine(line)
    ) {
      continue;
    }

    return line;
  }

  return "";
}

function parseItems(lines: string[]): ExtractedReceiptItem[] {
  const items = lines
    .map(parseItemLine)
    .filter((item): item is ExtractedReceiptItem => item !== null);

  return items;
}

function findFieldValue(
  fields: DetectedReceiptField[],
  names: string[],
): string {
  const normalizedNames = new Set(names.map(normalizeFieldName));
  const field = fields.find((candidate) =>
    normalizedNames.has(normalizeFieldName(candidate.name)),
  );

  return field?.value.trim() ?? "";
}

function findFieldAmount(fields: DetectedReceiptField[], names: string[]): number {
  const value = findFieldValue(fields, names);
  if (!value) {
    return 0;
  }

  return parsePrice(value) ?? 0;
}

function isLineItemField(field: DetectedReceiptField): boolean {
  return field.source === "line-item" || field.rowIndex !== undefined;
}

function isPriceField(field: DetectedReceiptField): boolean {
  return normalizeFieldName(field.name) === "PRICE";
}

function isItemField(field: DetectedReceiptField): boolean {
  return normalizeFieldName(field.name) === "ITEM";
}

function isIgnoredPriceField(field: DetectedReceiptField): boolean {
  const normalizedName = normalizeFieldName(field.name);
  const normalizedValue = field.value.toLowerCase();

  return (
    normalizedName.includes("SUBTOTAL") ||
    normalizedName.includes("TAX") ||
    normalizedName.includes("TOTAL") ||
    normalizedName.includes("TIP") ||
    normalizedName.includes("GRATUITY") ||
    normalizedValue.includes("subtotal") ||
    normalizedValue.includes("tax") ||
    normalizedValue.includes("total") ||
    normalizedValue.includes("tip") ||
    normalizedValue.includes("gratuity")
  );
}

function parseStructuredItemsByRow(
  fields: DetectedReceiptField[],
): ExtractedReceiptItem[] {
  const rows = new Map<string, DetectedReceiptField[]>();

  for (const field of fields.filter(isLineItemField)) {
    if (field.rowIndex === undefined) {
      continue;
    }

    const key = `${field.groupIndex ?? 0}:${field.rowIndex}`;
    rows.set(key, [...(rows.get(key) ?? []), field]);
  }

  const items: ExtractedReceiptItem[] = [];

  for (const rowFields of rows.values()) {
    const itemField = rowFields.find(isItemField);
    const priceField = rowFields.find(
      (field) => isPriceField(field) && !isIgnoredPriceField(field),
    );

    if (!itemField || !priceField) {
      continue;
    }

    const name = normalizeLine(itemField.value);
    const price = parsePrice(priceField.value);

    if (looksLikeItemName(name) && price !== null && price > 0) {
      items.push({ name, price });
    }
  }

  return items;
}

function parseStructuredItemsSequentially(
  fields: DetectedReceiptField[],
): ExtractedReceiptItem[] {
  const items: ExtractedReceiptItem[] = [];
  let pendingItemName = "";

  for (const field of fields.filter(isLineItemField)) {
    if (isItemField(field)) {
      pendingItemName = normalizeLine(field.value);
      continue;
    }

    if (!pendingItemName || !isPriceField(field) || isIgnoredPriceField(field)) {
      continue;
    }

    const price = parsePrice(field.value);
    if (looksLikeItemName(pendingItemName) && price !== null && price > 0) {
      items.push({ name: pendingItemName, price });
      pendingItemName = "";
    }
  }

  return items;
}

function parseStructuredItems(
  fields: DetectedReceiptField[],
): ExtractedReceiptItem[] {
  const rowItems = parseStructuredItemsByRow(fields);
  if (rowItems.length > 0) {
    return rowItems;
  }

  return parseStructuredItemsSequentially(fields);
}

function parseReceiptFromDetectedFields(
  rawText: string,
  fields: DetectedReceiptField[],
): ExtractedReceipt {
  const summaryFields = fields.filter(
    (field) => field.source === "summary" || !isLineItemField(field),
  );

  return {
    restaurantName: findFieldValue(summaryFields, ["VENDOR_NAME", "NAME"]),
    rawText,
    subtotal: findFieldAmount(summaryFields, ["SUBTOTAL"]),
    tax: findFieldAmount(summaryFields, ["TAX"]),
    total: findFieldAmount(summaryFields, ["TOTAL"]),
    items: parseStructuredItems(fields),
  };
}

/**
 * Deterministically parse Textract OCR text into SplitSnap's receipt contract.
 * This intentionally favors predictable parsing over guessing.
 */
export function parseReceiptFromRawText(rawText: string): ExtractedReceipt {
  const lines = getLines(rawText);

  if (lines.length === 0) {
    return withValidation({ ...EMPTY_RECEIPT, rawText });
  }

  const subtotal = parseAmountByKeyword(lines, ["subtotal", "sub total"]);
  const tax = parseAmountByKeyword(lines, ["tax"]);
  const total = parseTotal(lines);

  return withValidation({
    restaurantName: parseRestaurantName(lines),
    rawText,
    subtotal,
    tax,
    total,
    items: parseItems(lines),
  });
}

export function parseReceiptFromTextract(
  rawText: string,
  detectedFields: DetectedReceiptField[],
): ExtractedReceipt {
  const structuredReceipt = parseReceiptFromDetectedFields(
    rawText,
    detectedFields,
  );
  const rawReceipt = parseReceiptFromRawText(rawText);

  if (hasStructuredData(structuredReceipt)) {
    return withValidation({
      restaurantName:
        structuredReceipt.restaurantName || rawReceipt.restaurantName,
      rawText,
      subtotal: structuredReceipt.subtotal || rawReceipt.subtotal,
      tax: structuredReceipt.tax || rawReceipt.tax,
      total: structuredReceipt.total || rawReceipt.total,
      items:
        structuredReceipt.items.length > 0
          ? structuredReceipt.items
          : rawReceipt.items,
    });
  }

  return rawReceipt.validation ? rawReceipt : withValidation(rawReceipt);
}
