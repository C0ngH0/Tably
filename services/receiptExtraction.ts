import type { ExtractedReceipt, ExtractedReceiptItem } from "../types/receipt";
import type { ReceiptItem } from "../types/split";

/** Change this if your Mac's local IP changes (same Wi‑Fi as your phone). */
export const API_BASE_URL = "http://192.168.1.9:3001";

const RECEIPT_EXTRACT_ENDPOINT = `${API_BASE_URL}/api/receipt/extract`;

export type ImportedReceiptData = {
  items: ReceiptItem[];
  tax: string;
  billTotal: string;
  subtotal: number;
};

function mapExtractedItemToReceiptItem(
  item: ExtractedReceiptItem,
  createId: () => string,
): ReceiptItem {
  return {
    id: createId(),
    name: item.name.trim(),
    price: item.price,
    assignedTo: [],
  };
}

/** Map extracted OCR data into the app's receipt item shape. */
export function buildImportedReceiptData(
  extracted: ExtractedReceipt,
  createId: () => string,
): ImportedReceiptData {
  return {
    items: extracted.items.map((item) =>
      mapExtractedItemToReceiptItem(item, createId),
    ),
    tax: extracted.tax.toFixed(2),
    billTotal: extracted.total.toFixed(2),
    subtotal: extracted.subtotal,
  };
}

function isExtractedReceipt(data: unknown): data is ExtractedReceipt {
  if (!data || typeof data !== "object") {
    return false;
  }

  const receipt = data as Record<string, unknown>;

  return (
    typeof receipt.restaurantName === "string" &&
    typeof receipt.rawText === "string" &&
    typeof receipt.subtotal === "number" &&
    typeof receipt.tax === "number" &&
    typeof receipt.total === "number" &&
    Array.isArray(receipt.items)
  );
}

/**
 * Extract receipt data by calling the SplitSnap backend.
 * AWS Textract will be added on the server in a future phase.
 */
export async function extractReceipt(imageUri: string): Promise<ExtractedReceipt> {
  if (!imageUri) {
    throw new Error("A receipt image is required for extraction.");
  }

  console.log("[receiptExtraction] Calling endpoint:", RECEIPT_EXTRACT_ENDPOINT);

  let response: Response;

  try {
    response = await fetch(RECEIPT_EXTRACT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUri }),
    });
  } catch (error) {
    console.error(
      "[receiptExtraction] Network request failed:",
      RECEIPT_EXTRACT_ENDPOINT,
      error,
    );

    throw new Error(
      `Could not reach the SplitSnap server at ${API_BASE_URL}. Make sure the backend is running, the URL includes port 3001, and your phone is on the same Wi‑Fi network.`,
    );
  }

  if (!response.ok) {
    let message = `Receipt extraction failed (${response.status}).`;

    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) {
        message = errorBody.error;
      }
    } catch (parseError) {
      console.error(
        "[receiptExtraction] Failed to parse error response:",
        parseError,
      );
    }

    console.error(
      "[receiptExtraction] HTTP error:",
      response.status,
      message,
    );

    throw new Error(message);
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch (error) {
    console.error("[receiptExtraction] Failed to parse success response:", error);
    throw new Error("Server returned an unreadable response.");
  }

  if (!isExtractedReceipt(data)) {
    console.error("[receiptExtraction] Invalid response shape:", data);
    throw new Error("Server returned an invalid receipt format.");
  }

  return {
    ...data,
    items: data.items.map((item) => ({ ...item })),
  };
}
