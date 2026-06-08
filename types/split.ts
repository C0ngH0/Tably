export type Person = {
  id: string;
  name: string;
};

export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  /** Person IDs this item is assigned to */
  assignedTo: string[];
};

export type SplitMode = "even" | "itemized" | "hybrid";

export type TipMode = "percentage" | "fixed";

export const TIP_PERCENT_PRESETS = [15, 18, 20, 22, 25] as const;

export type TipPercentPreset = (typeof TIP_PERCENT_PRESETS)[number];

export type PersonTotal = {
  personId: string;
  name: string;
  foodSubtotal: number;
  taxShare: number;
  tipShare: number;
  finalAmount: number;
};

export type ReceiptSummary = {
  subtotal: number;
  tax: number;
  tip: number;
  finalTotal: number;
  sumOfPeopleTotals: number;
  difference: number;
};

export type SplitSession = {
  mode: SplitMode;
  people: Person[];
  items: ReceiptItem[];
  billTotal: number;
  tax: number;
  tip: number;
  personTotals: PersonTotal[];
  summary: ReceiptSummary;
};
