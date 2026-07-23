import { API_BASE_URL } from "./apiConfig";
import type { ExtractedReceipt, ExtractedReceiptItem } from "../types/receipt";
import type { ReceiptItem } from "../types/split";

const RECEIPT_EXTRACT_ENDPOINT = `${API_BASE_URL}/api/receipt/extract`;
const RECEIPT_IMAGE_FIELD_NAME = "image";

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

function createReceiptImageFormData(imageUri: string): FormData {
  const formData = new FormData();

  formData.append(RECEIPT_IMAGE_FIELD_NAME, {
    uri: imageUri,
    name: "receipt.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  return formData;
}

/**
 * Extract receipt data by calling the Tably backend.
 */
export async function extractReceipt(imageUri: string): Promise<ExtractedReceipt> {
  if (!imageUri) {
    throw new Error("A receipt image is required for extraction.");
  }

  let response: Response;

  try {
    const formData = createReceiptImageFormData(imageUri);

    response = await fetch(RECEIPT_EXTRACT_ENDPOINT, {
      method: "POST",
      // Do not set Content-Type manually; React Native adds the multipart boundary.
      body: formData,
    });
  } catch (error) {
    console.error(
      "[receiptExtraction] Network request failed:",
      RECEIPT_EXTRACT_ENDPOINT,
      error,
    );

    throw new Error(
      `Could not reach the Tably API at ${API_BASE_URL}. Please check your connection and try again.`,
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
    console.error("[receiptExtraction] Server returned an invalid response shape.");
    throw new Error("Server returned an invalid receipt format.");
  }

  return {
    ...data,
    items: data.items.map((item) => ({ ...item })),
  };
}
