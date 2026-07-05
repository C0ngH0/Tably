import type {
  CreateSplitSessionRequest,
  SplitSessionDto,
  UpdateSplitSessionRequest,
} from "../shared/types/splitSession";
import type {
  Person,
  ReceiptItem,
  SplitSession,
} from "../types/split";
import { TIP_PERCENT_PRESETS } from "../types/split";
import {
  calculateEvenSplit,
  calculateHybridSplit,
  calculateItemizedSplit,
} from "../utils/splitCalculator";

const DEFAULT_TIP_PERCENT = 18;
const TIP_PERCENT_EPSILON = 0.005;

function valueOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapDtoParticipants(dto: SplitSessionDto): Person[] {
  return dto.participants.map((participant) => ({
    id: participant.id,
    name: participant.displayName,
  }));
}

function mapDtoReceiptItems(dto: SplitSessionDto): ReceiptItem[] {
  return dto.receiptItems.map((receiptItem) => ({
    id: receiptItem.id,
    name: receiptItem.name,
    price: valueOrZero(receiptItem.totalPrice),
    assignedTo: receiptItem.itemAssignments.map(
      (assignment) => assignment.participantId,
    ),
  }));
}

function calculateSessionResult(
  dto: SplitSessionDto,
  people: Person[],
  items: ReceiptItem[],
): Pick<SplitSession, "personTotals" | "summary"> {
  if (dto.mode === "even") {
    return calculateEvenSplit(valueOrZero(dto.total), people);
  }

  if (dto.mode === "itemized") {
    return calculateItemizedSplit(
      items,
      people,
      valueOrZero(dto.tax),
      valueOrZero(dto.tip),
    );
  }

  return calculateHybridSplit(
    items,
    people,
    valueOrZero(dto.tax),
    valueOrZero(dto.tip),
  );
}

function inferTipPercent(subtotal: number, tip: number): number | null {
  if (subtotal <= 0 || tip < 0) {
    return null;
  }

  return (
    TIP_PERCENT_PRESETS.find(
      (preset) =>
        Math.abs(tip - (subtotal * preset) / 100) < TIP_PERCENT_EPSILON,
    ) ?? null
  );
}

export function apiDtoToSplitSession(dto: SplitSessionDto): SplitSession {
  const people = mapDtoParticipants(dto);
  const items = mapDtoReceiptItems(dto);
  const result = calculateSessionResult(dto, people, items);
  const tip = valueOrZero(dto.tip);
  const inferredTipPercent = inferTipPercent(valueOrZero(dto.subtotal), tip);

  return {
    id: dto.id,
    title: dto.title,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    restaurantName: dto.restaurantName ?? "",
    mode: dto.mode,
    people,
    items,
    billTotal: valueOrZero(dto.total),
    tax: valueOrZero(dto.tax),
    tip,
    tipMode: inferredTipPercent === null ? "fixed" : "percentage",
    tipPercent: inferredTipPercent ?? DEFAULT_TIP_PERCENT,
    customTip: tip,
    personTotals: result.personTotals,
    summary: result.summary,
  };
}

export function splitSessionToCreateRequest(
  session: SplitSession,
): CreateSplitSessionRequest {
  return {
    title: session.title,
    mode: session.mode,
    restaurantName: session.restaurantName || undefined,
    subtotal: session.summary.subtotal,
    tax: session.tax,
    tip: session.tip,
    total: session.summary.finalTotal,
    participants: session.people.map((person) => ({
      clientId: person.id,
      displayName: person.name,
    })),
    receiptItems: session.items.map((item) => ({
      clientId: item.id,
      name: item.name,
      quantity: 1,
      totalPrice: item.price,
      itemAssignments: item.assignedTo.map((personId) => ({
        participantId: personId,
        amount:
          item.assignedTo.length > 0
            ? item.price / item.assignedTo.length
            : item.price,
      })),
    })),
    payments: [],
  };
}

export function splitSessionToUpdateRequest(
  session: SplitSession,
): UpdateSplitSessionRequest {
  return splitSessionToCreateRequest(session);
}
