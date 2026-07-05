import type { SplitMode as ApiSplitMode } from "../shared/types/splitSession";

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

export type SplitMode = ApiSplitMode;

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

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type SplitSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  restaurantName: string;
  paymentStatus?: PaymentStatus;
  mode: SplitMode;
  people: Person[];
  items: ReceiptItem[];
  billTotal: number;
  tax: number;
  tip: number;
  tipMode: TipMode;
  tipPercent: number;
  customTip: number;
  personTotals: PersonTotal[];
  summary: ReceiptSummary;
};
