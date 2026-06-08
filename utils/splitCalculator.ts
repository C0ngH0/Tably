import type {
  Person,
  PersonTotal,
  ReceiptItem,
  ReceiptSummary,
  SplitSession,
} from "../types/split";

const CENTS = 100;

/** Convert dollars to whole cents, safely handling floating-point noise. */
function toCents(amount: number): number {
  return Math.round(amount * CENTS);
}

/** Convert whole cents back to dollars. */
function fromCents(cents: number): number {
  return cents / CENTS;
}

/** Round to two decimal places. */
function round2(amount: number): number {
  return Math.round(amount * CENTS) / CENTS;
}

/**
 * Split a whole-cent amount across people using the largest-remainder method.
 * This keeps the distributed cents adding up to exactly `totalCents`.
 */
function distributeCents(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) {
    return [];
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  if (totalCents === 0) {
    return weights.map(() => 0);
  }

  if (weightSum === 0) {
    const base = Math.floor(totalCents / weights.length);
    let remainder = totalCents - base * weights.length;
    return weights.map(() => {
      if (remainder > 0) {
        remainder -= 1;
        return base + 1;
      }
      return base;
    });
  }

  const rawShares = weights.map(
    (weight) => (totalCents * weight) / weightSum,
  );
  const floored = rawShares.map((share) => Math.floor(share));
  let remainder = totalCents - floored.reduce((sum, value) => sum + value, 0);

  const ranked = rawShares
    .map((share, index) => ({ index, fraction: share - floored[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  const shares = [...floored];
  for (let i = 0; i < remainder; i += 1) {
    shares[ranked[i % ranked.length].index] += 1;
  }

  return shares;
}

function buildSummary(
  subtotal: number,
  tax: number,
  tip: number,
  personTotals: PersonTotal[],
): ReceiptSummary {
  const finalTotal = round2(subtotal + tax + tip);
  const sumOfPeopleTotals = round2(
    personTotals.reduce((sum, person) => sum + person.finalAmount, 0),
  );

  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    tip: round2(tip),
    finalTotal,
    sumOfPeopleTotals,
    difference: round2(finalTotal - sumOfPeopleTotals),
  };
}

function buildPersonTotals(
  people: Person[],
  foodCentsByPerson: number[],
  taxCentsByPerson: number[],
  tipCentsByPerson: number[],
): PersonTotal[] {
  return people.map((person, index) => {
    const foodSubtotal = fromCents(foodCentsByPerson[index]);
    const taxShare = fromCents(taxCentsByPerson[index]);
    const tipShare = fromCents(tipCentsByPerson[index]);

    return {
      personId: person.id,
      name: person.name,
      foodSubtotal,
      taxShare,
      tipShare,
      finalAmount: round2(foodSubtotal + taxShare + tipShare),
    };
  });
}

/**
 * Fix off-by-one-cent rounding errors so person totals match the expected bill.
 * Adjustments are applied to tip shares to keep food and tax stable.
 */
export function applyRoundingCorrection(
  results: PersonTotal[],
  expectedTotal: number,
): PersonTotal[] {
  if (results.length === 0) {
    return results;
  }

  const corrected = results.map((person) => ({
    ...person,
    foodSubtotal: round2(person.foodSubtotal),
    taxShare: round2(person.taxShare),
    tipShare: round2(person.tipShare),
    finalAmount: round2(
      person.foodSubtotal + person.taxShare + person.tipShare,
    ),
  }));

  let differenceCents =
    toCents(expectedTotal) -
    toCents(
      corrected.reduce((sum, person) => sum + person.finalAmount, 0),
    );

  let index = 0;
  while (differenceCents !== 0) {
    const personIndex = index % corrected.length;
    const adjustmentCents = differenceCents > 0 ? 1 : -1;

    corrected[personIndex].tipShare = round2(
      corrected[personIndex].tipShare + fromCents(adjustmentCents),
    );
    corrected[personIndex].finalAmount = round2(
      corrected[personIndex].foodSubtotal +
        corrected[personIndex].taxShare +
        corrected[personIndex].tipShare,
    );

    differenceCents -= adjustmentCents;
    index += 1;
  }

  return corrected;
}

/** Split one final bill total evenly across all participants. */
export function calculateEvenSplit(
  total: number,
  people: Person[],
): Pick<SplitSession, "personTotals" | "summary"> {
  const totalCents = toCents(total);
  const equalWeights = people.map(() => 1);
  const shareCents = distributeCents(totalCents, equalWeights);

  const personTotals = people.map((person, index) => ({
    personId: person.id,
    name: person.name,
    foodSubtotal: fromCents(shareCents[index]),
    taxShare: 0,
    tipShare: 0,
    finalAmount: fromCents(shareCents[index]),
  }));

  const corrected = applyRoundingCorrection(personTotals, total);

  return {
    personTotals: corrected,
    summary: buildSummary(total, 0, 0, corrected),
  };
}

function calculateFoodSubtotals(
  items: ReceiptItem[],
  people: Person[],
  allowMultipleAssignees: boolean,
): number[] {
  const foodCentsByPerson = people.map(() => 0);

  for (const item of items) {
    const itemCents = toCents(item.price);
    const assigneeIndexes = item.assignedTo
      .map((personId) => people.findIndex((person) => person.id === personId))
      .filter((index) => index >= 0);

    if (assigneeIndexes.length === 0) {
      continue;
    }

    if (allowMultipleAssignees) {
      const shares = distributeCents(
        itemCents,
        assigneeIndexes.map(() => 1),
      );
      assigneeIndexes.forEach((personIndex, shareIndex) => {
        foodCentsByPerson[personIndex] += shares[shareIndex];
      });
    } else {
      foodCentsByPerson[assigneeIndexes[0]] += itemCents;
    }
  }

  return foodCentsByPerson;
}

function calculateProportionalSplit(
  items: ReceiptItem[],
  people: Person[],
  tax: number,
  tip: number,
  allowMultipleAssignees: boolean,
): Pick<SplitSession, "personTotals" | "summary"> {
  const subtotal = round2(items.reduce((sum, item) => sum + item.price, 0));
  const foodCentsByPerson = calculateFoodSubtotals(
    items,
    people,
    allowMultipleAssignees,
  );

  const taxCentsByPerson = distributeCents(toCents(tax), foodCentsByPerson);
  const tipCentsByPerson = distributeCents(
    toCents(tip),
    people.map(() => 1),
  );
  const personTotals = buildPersonTotals(
    people,
    foodCentsByPerson,
    taxCentsByPerson,
    tipCentsByPerson,
  );

  const expectedTotal = round2(subtotal + tax + tip);
  const corrected = applyRoundingCorrection(personTotals, expectedTotal);

  return {
    personTotals: corrected,
    summary: buildSummary(subtotal, tax, tip, corrected),
  };
}

/** Itemized split: each item belongs to exactly one person. */
export function calculateItemizedSplit(
  items: ReceiptItem[],
  people: Person[],
  tax: number,
  tip: number,
): Pick<SplitSession, "personTotals" | "summary"> {
  return calculateProportionalSplit(items, people, tax, tip, false);
}

/** Hybrid split: items can be shared across multiple people evenly. */
export function calculateHybridSplit(
  items: ReceiptItem[],
  people: Person[],
  tax: number,
  tip: number,
): Pick<SplitSession, "personTotals" | "summary"> {
  return calculateProportionalSplit(items, people, tax, tip, true);
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const MODE_LABELS: Record<SplitSession["mode"], string> = {
  even: "Even Split",
  itemized: "Itemized Split",
  hybrid: "Hybrid Split",
};

export function validateParticipantName(name: string): string | null {
  if (name.trim().length === 0) {
    return "Participant name cannot be empty.";
  }

  return null;
}

export function validateItemFields(name: string, price: number): string | null {
  if (name.trim().length === 0) {
    return "Item name cannot be empty.";
  }

  if (price <= 0) {
    return "Item price must be greater than $0.00.";
  }

  return null;
}

export function validateSplitInput(
  mode: SplitSession["mode"],
  people: Person[],
  items: ReceiptItem[],
  billTotal: number,
  tax: number,
  tip: number,
): string | null {
  if (people.length < 2) {
    return "Add at least 2 participants before calculating.";
  }

  if (people.some((person) => person.name.trim().length === 0)) {
    return "Every participant must have a name. Edit or remove blank entries.";
  }

  if (tax < 0) {
    return "Tax must be zero or greater.";
  }

  if (tip < 0) {
    return "Tip must be zero or greater.";
  }

  if (mode === "even") {
    if (billTotal <= 0) {
      return "Enter the final bill total. It must be greater than $0.00.";
    }

    return null;
  }

  if (items.length === 0) {
    return "Add at least one receipt item before calculating.";
  }

  const invalidPriceItem = items.find((item) => item.price <= 0);
  if (invalidPriceItem) {
    return `"${invalidPriceItem.name}" needs a price greater than $0.00.`;
  }

  const unnamedItem = items.find((item) => item.name.trim().length === 0);
  if (unnamedItem) {
    return "Every receipt item must have a name. Edit or remove blank items.";
  }

  for (const item of items) {
    if (item.assignedTo.length === 0) {
      return `"${item.name}" is not assigned yet. Tap a participant to assign it.`;
    }

    if (mode === "itemized" && item.assignedTo.length !== 1) {
      return `"${item.name}" must be assigned to exactly one person in itemized mode.`;
    }
  }

  return null;
}

/** Build plain-text summary for the native share sheet. */
export function formatSessionShareText(session: SplitSession): string {
  const lines = [
    "SplitSnap Results",
    `Mode: ${MODE_LABELS[session.mode]}`,
    "",
    "Receipt Summary",
    `Subtotal: ${formatMoney(session.summary.subtotal)}`,
    `Tax: ${formatMoney(session.summary.tax)}`,
    `Tip: ${formatMoney(session.summary.tip)}`,
    `Final total: ${formatMoney(session.summary.finalTotal)}`,
    "",
    "What Each Person Owes",
  ];

  for (const person of session.personTotals) {
    lines.push(
      "",
      person.name,
      `  Food: ${formatMoney(person.foodSubtotal)}`,
      `  Tax: ${formatMoney(person.taxShare)}`,
      `  Tip: ${formatMoney(person.tipShare)}`,
      `  Total: ${formatMoney(person.finalAmount)}`,
    );
  }

  lines.push(
    "",
    `Sum of totals: ${formatMoney(session.summary.sumOfPeopleTotals)}`,
    `Difference: ${formatMoney(session.summary.difference)}`,
  );

  return lines.join("\n");
}
