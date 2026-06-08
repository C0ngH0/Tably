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
