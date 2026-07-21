import OpenAI from "openai";

import type {
  ExtractedReceipt,
  ExtractedReceiptItem,
  ReceiptValidation,
} from "../types/receipt";
import type { DetectedReceiptField } from "./textractService";

type RepairInput = {
  rawText: string;
  detectedFields: DetectedReceiptField[];
  parsedReceipt: ExtractedReceipt;
};

type OpenAIRepairResponse = {
  restaurantName: string;
  items: ExtractedReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  repairNotes: string[];
};

const MISMATCH_THRESHOLD = 0.05;
const MAX_REASONABLE_AMOUNT = 100_000;
const OPENAI_MODEL = "gpt-4o-mini";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!openaiClient) {
    if (!apiKey.startsWith("sk-") || apiKey.length < 20) {
      throw new Error(
        "OPENAI_API_KEY is malformed.",
      );
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
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

function isReasonableAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_REASONABLE_AMOUNT
  );
}

function validateRepairResponse(data: unknown): OpenAIRepairResponse {
  if (!data || typeof data !== "object") {
    throw new Error("OpenAI repair response was not an object.");
  }

  const candidate = data as Partial<OpenAIRepairResponse>;

  if (typeof candidate.restaurantName !== "string") {
    throw new Error("OpenAI repair response is missing restaurantName.");
  }

  if (!Array.isArray(candidate.items)) {
    throw new Error("OpenAI repair response items must be an array.");
  }

  const items = candidate.items.map((item, index) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.name !== "string" ||
      !isReasonableAmount(item.price)
    ) {
      throw new Error(`OpenAI repair item at index ${index} is invalid.`);
    }

    return {
      name: item.name.trim(),
      price: roundCurrency(item.price),
    };
  });

  if (items.some((item) => item.name.length === 0)) {
    throw new Error("OpenAI repair response contains an empty item name.");
  }

  if (
    !isReasonableAmount(candidate.subtotal) ||
    !isReasonableAmount(candidate.tax) ||
    !isReasonableAmount(candidate.total)
  ) {
    throw new Error("OpenAI repair response contains invalid totals.");
  }

  const repairNotes =
    typeof candidate.repairNotes === "string"
      ? [candidate.repairNotes]
      : Array.isArray(candidate.repairNotes)
        ? candidate.repairNotes
        : [];

  return {
    restaurantName: candidate.restaurantName.trim(),
    items,
    subtotal: roundCurrency(candidate.subtotal),
    tax: roundCurrency(candidate.tax),
    total: roundCurrency(candidate.total),
    repairNotes: repairNotes
      .filter((note): note is string => typeof note === "string")
      .map((note) => note.trim())
      .filter(Boolean),
  };
}

function buildRepairPrompt(input: RepairInput): string {
  return JSON.stringify(
    {
      instructions: [
        "Repair this receipt extraction using only evidence present in rawText and detectedFields.",
        "Add missing line items when rawText clearly shows an item name and price.",
        "Do not invent items, prices, taxes, or totals.",
        "Return strict JSON only with restaurantName, items, subtotal, tax, total, repairNotes.",
        "repairNotes must be an array of strings. Use [] if there are no repair notes.",
      ],
      rawText: input.rawText,
      detectedFields: input.detectedFields,
      currentParsedReceipt: {
        restaurantName: input.parsedReceipt.restaurantName,
        items: input.parsedReceipt.items,
        subtotal: input.parsedReceipt.subtotal,
        tax: input.parsedReceipt.tax,
        total: input.parsedReceipt.total,
        validation: input.parsedReceipt.validation,
      },
    },
    null,
    2,
  );
}

export async function repairReceiptWithOpenAI(
  input: RepairInput,
): Promise<ExtractedReceipt> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You repair OCR receipt extraction. Return only strict JSON matching the requested schema.",
      },
      {
        role: "user",
        content: buildRepairPrompt(input),
      },
    ],
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI repair returned an empty response.");
  }

  const repaired = validateRepairResponse(JSON.parse(content));
  const receipt: ExtractedReceipt = {
    restaurantName:
      repaired.restaurantName || input.parsedReceipt.restaurantName,
    rawText: input.rawText,
    subtotal: repaired.subtotal,
    tax: repaired.tax,
    total: repaired.total,
    items: repaired.items,
    repairNotes: repaired.repairNotes,
  };

  return {
    ...receipt,
    validation: buildReceiptValidation(receipt),
  };
}
