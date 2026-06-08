export type ExtractedReceiptItem = {
  name: string;
  price: number;
};

export type ExtractedReceipt = {
  restaurantName: string;
  rawText: string;
  subtotal: number;
  tax: number;
  total: number;
  items: ExtractedReceiptItem[];
};

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

/** Simulated processing delay (ms). */
const MOCK_EXTRACTION_DELAY_MS = 800;

/**
 * Mock receipt extraction. Returns the same shape as the mobile app's mock OCR.
 * Replace with AWS Textract in a future phase.
 */
export async function extractReceiptMock(
  _imageUri?: string,
): Promise<ExtractedReceipt> {
  await new Promise((resolve) => {
    setTimeout(resolve, MOCK_EXTRACTION_DELAY_MS);
  });

  return {
    ...MOCK_EXTRACTED_RECEIPT,
    items: MOCK_EXTRACTED_RECEIPT.items.map((item) => ({ ...item })),
  };
}
