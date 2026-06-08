import type { ExtractedReceipt } from "../types/receipt";

/** Simulated OCR delay so the loading state feels realistic. */
const MOCK_EXTRACTION_DELAY_MS = 1500;

const MOCK_EXTRACTED_RECEIPT: ExtractedReceipt = {
  restaurantName: "The Corner Bistro",
  rawText: [
    "THE CORNER BISTRO",
    "123 Main Street",
    "",
    "Classic Burger        14.50",
    "Caesar Salad          11.00",
    "Iced Tea               3.50",
    "Garlic Fries           6.50",
    "Chocolate Cake         7.00",
    "",
    "Subtotal              42.50",
    "Tax                    3.61",
    "Total                 46.11",
    "",
    "Thank you!",
  ].join("\n"),
  subtotal: 42.5,
  tax: 3.61,
  total: 46.11,
  items: [
    { name: "Classic Burger", price: 14.5 },
    { name: "Caesar Salad", price: 11.0 },
    { name: "Iced Tea", price: 3.5 },
    { name: "Garlic Fries", price: 6.5 },
    { name: "Chocolate Cake", price: 7.0 },
  ],
};

/**
 * Extract receipt data from an image.
 *
 * Phase 3 uses mock data. In a future phase this will send the image to a
 * secure backend that calls AWS Textract — credentials stay off the device.
 */
export async function extractReceipt(imageUri: string): Promise<ExtractedReceipt> {
  if (!imageUri) {
    throw new Error("A receipt image is required for extraction.");
  }

  await new Promise((resolve) => {
    setTimeout(resolve, MOCK_EXTRACTION_DELAY_MS);
  });

  return {
    ...MOCK_EXTRACTED_RECEIPT,
    items: MOCK_EXTRACTED_RECEIPT.items.map((item) => ({ ...item })),
  };
}
