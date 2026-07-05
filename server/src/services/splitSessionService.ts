import { PaymentStatus, Prisma, SplitType } from "@prisma/client";

import { prisma } from "../db/prisma";
import {
  mapSplitSessionToDto,
  splitSessionDtoInclude,
} from "../dto/splitSessionDto";
import type {
  CreateSplitSessionRequest,
  UpdateSplitSessionRequest,
} from "../../../shared/types/splitSession";

type UnknownRecord = Record<string, unknown>;

type NormalizedParticipant = {
  key: string;
  userId?: string;
  displayName: string;
};

type NormalizedReceiptItem = {
  key: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  itemAssignments: NormalizedItemAssignment[];
};

type NormalizedItemAssignment = {
  receiptItemKey?: string;
  participantKey: string;
  shareQuantity?: number;
  amount: number;
};

type NormalizedPayment = {
  fromParticipantKey: string;
  toParticipantKey: string;
  amount: number;
  status?: PaymentStatus;
  note?: string;
};

type NormalizedSplitSessionInput = {
  ownerUserId?: string;
  title: string;
  splitType: SplitType;
  restaurantName?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  participants: NormalizedParticipant[];
  receiptItems: NormalizedReceiptItem[];
  itemAssignments: NormalizedItemAssignment[];
  payments: NormalizedPayment[];
};

export class SplitSessionValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "SplitSessionValidationError";
  }
}

export class SplitSessionNotFoundError extends Error {
  statusCode = 404;

  constructor(id: string) {
    super(`Split session not found: ${id}`);
    this.name = "SplitSessionNotFoundError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiredNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SplitSessionValidationError(`${fieldName} must be a number.`);
  }

  return value;
}

function optionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requiredNumber(value, fieldName);
}

function keyFromRecord(
  record: UnknownRecord,
  fallback: string,
  acceptedFields: string[],
): string {
  for (const field of acceptedFields) {
    const value = optionalString(record[field]);
    if (value) {
      return value;
    }
  }

  return fallback;
}

function normalizeSplitType(value: unknown): SplitType {
  const mode = optionalString(value);
  if (!mode) {
    throw new SplitSessionValidationError("mode is required.");
  }

  const normalizedMode = mode.toUpperCase().replace(/-/g, "_");
  if (
    normalizedMode === SplitType.EVEN ||
    normalizedMode === SplitType.ITEMIZED ||
    normalizedMode === SplitType.HYBRID
  ) {
    return normalizedMode;
  }

  throw new SplitSessionValidationError(
    "mode must be one of: even, itemized, hybrid.",
  );
}

function normalizePaymentStatus(value: unknown): PaymentStatus | undefined {
  const status = optionalString(value);
  if (!status) {
    return undefined;
  }

  const normalizedStatus = status.toUpperCase();
  if (
    normalizedStatus === PaymentStatus.PENDING ||
    normalizedStatus === PaymentStatus.COMPLETED ||
    normalizedStatus === PaymentStatus.CANCELED
  ) {
    return normalizedStatus;
  }

  throw new SplitSessionValidationError(
    "payment status must be one of: pending, completed, canceled.",
  );
}

function generateDefaultTitle(input: {
  restaurantName?: string;
  receiptItems: unknown[];
}): string {
  if (input.restaurantName) {
    return input.restaurantName;
  }

  const prefix = input.receiptItems.length > 0 ? "Receipt Split" : "Manual Split";
  return `${prefix} - ${new Date().toISOString()}`;
}

function normalizeParticipants(value: unknown): NormalizedParticipant[] {
  if (!Array.isArray(value)) {
    throw new SplitSessionValidationError("participants must be an array.");
  }

  return value.map((participant, index) => {
    if (!isRecord(participant)) {
      throw new SplitSessionValidationError(
        `participants[${index}] must be an object.`,
      );
    }

    const displayName =
      optionalString(participant.displayName) ??
      optionalString(participant.name);

    if (!displayName) {
      throw new SplitSessionValidationError(
        `participants[${index}].displayName is required.`,
      );
    }

    return {
      key: keyFromRecord(participant, `participant:${index}`, [
        "id",
        "clientId",
        "localId",
      ]),
      userId: optionalString(participant.userId),
      displayName,
    };
  });
}

function normalizeItemAssignment(
  value: unknown,
  indexLabel: string,
  receiptItemKey?: string,
): NormalizedItemAssignment {
  if (!isRecord(value)) {
    throw new SplitSessionValidationError(`${indexLabel} must be an object.`);
  }

  const participantKey =
    optionalString(value.participantId) ??
    optionalString(value.participantClientId) ??
    optionalString(value.participantLocalId);

  if (!participantKey) {
    throw new SplitSessionValidationError(
      `${indexLabel}.participantId is required.`,
    );
  }

  return {
    receiptItemKey:
      receiptItemKey ??
      optionalString(value.receiptItemId) ??
      optionalString(value.receiptItemClientId) ??
      optionalString(value.receiptItemLocalId),
    participantKey,
    shareQuantity: optionalNumber(
      value.shareQuantity,
      `${indexLabel}.shareQuantity`,
    ),
    amount: requiredNumber(value.amount, `${indexLabel}.amount`),
  };
}

function normalizeReceiptItems(value: unknown): NormalizedReceiptItem[] {
  if (!Array.isArray(value)) {
    throw new SplitSessionValidationError("receiptItems must be an array.");
  }

  return value.map((receiptItem, index) => {
    if (!isRecord(receiptItem)) {
      throw new SplitSessionValidationError(
        `receiptItems[${index}] must be an object.`,
      );
    }

    const name = optionalString(receiptItem.name);
    if (!name) {
      throw new SplitSessionValidationError(
        `receiptItems[${index}].name is required.`,
      );
    }

    const key = keyFromRecord(receiptItem, `receiptItem:${index}`, [
      "id",
      "clientId",
      "localId",
    ]);

    const rawAssignments =
      receiptItem.itemAssignments ?? receiptItem.assignments ?? [];
    if (!Array.isArray(rawAssignments)) {
      throw new SplitSessionValidationError(
        `receiptItems[${index}].itemAssignments must be an array when present.`,
      );
    }

    return {
      key,
      name,
      quantity:
        optionalNumber(receiptItem.quantity, `receiptItems[${index}].quantity`) ??
        1,
      unitPrice: optionalNumber(
        receiptItem.unitPrice,
        `receiptItems[${index}].unitPrice`,
      ),
      totalPrice: requiredNumber(
        receiptItem.totalPrice ?? receiptItem.price,
        `receiptItems[${index}].totalPrice`,
      ),
      itemAssignments: rawAssignments.map((assignment, assignmentIndex) =>
        normalizeItemAssignment(
          assignment,
          `receiptItems[${index}].itemAssignments[${assignmentIndex}]`,
          key,
        ),
      ),
    };
  });
}

function normalizeTopLevelItemAssignments(
  value: unknown,
): NormalizedItemAssignment[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new SplitSessionValidationError("itemAssignments must be an array.");
  }

  return value.map((assignment, index) =>
    normalizeItemAssignment(assignment, `itemAssignments[${index}]`),
  );
}

function normalizePayments(value: unknown): NormalizedPayment[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new SplitSessionValidationError("payments must be an array.");
  }

  return value.map((payment, index) => {
    if (!isRecord(payment)) {
      throw new SplitSessionValidationError(`payments[${index}] must be an object.`);
    }

    const fromParticipantKey =
      optionalString(payment.fromParticipantId) ??
      optionalString(payment.fromParticipantClientId) ??
      optionalString(payment.fromParticipantLocalId);
    const toParticipantKey =
      optionalString(payment.toParticipantId) ??
      optionalString(payment.toParticipantClientId) ??
      optionalString(payment.toParticipantLocalId);

    if (!fromParticipantKey || !toParticipantKey) {
      throw new SplitSessionValidationError(
        `payments[${index}] must include fromParticipantId and toParticipantId.`,
      );
    }

    return {
      fromParticipantKey,
      toParticipantKey,
      amount: requiredNumber(payment.amount, `payments[${index}].amount`),
      status: normalizePaymentStatus(payment.status),
      note: optionalString(payment.note),
    };
  });
}

function normalizeSplitSessionInput(body: unknown): NormalizedSplitSessionInput {
  if (!isRecord(body)) {
    throw new SplitSessionValidationError("Request body must be an object.");
  }

  const restaurantName = optionalString(body.restaurantName);
  const participants = normalizeParticipants(body.participants);
  const receiptItems = normalizeReceiptItems(body.receiptItems);
  const title =
    optionalString(body.title) ??
    generateDefaultTitle({ restaurantName, receiptItems });

  return {
    ownerUserId: optionalString(body.ownerUserId),
    title,
    splitType: normalizeSplitType(body.mode ?? body.splitType),
    restaurantName,
    subtotal: requiredNumber(body.subtotal, "subtotal"),
    tax: requiredNumber(body.tax, "tax"),
    tip: requiredNumber(body.tip, "tip"),
    total: requiredNumber(body.total, "total"),
    participants,
    receiptItems,
    itemAssignments: normalizeTopLevelItemAssignments(body.itemAssignments),
    payments: normalizePayments(body.payments),
  };
}

function requireMappedId(
  map: Map<string, string>,
  key: string | undefined,
  label: string,
): string {
  if (!key) {
    throw new SplitSessionValidationError(`${label} is required.`);
  }

  const mappedId = map.get(key);
  if (!mappedId) {
    throw new SplitSessionValidationError(`${label} does not match a saved record.`);
  }

  return mappedId;
}

async function replaceNestedRecords(
  tx: Prisma.TransactionClient,
  splitSessionId: string,
  input: NormalizedSplitSessionInput,
) {
  const participantIdsByKey = new Map<string, string>();
  const receiptItemIdsByKey = new Map<string, string>();

  for (const participant of input.participants) {
    const createdParticipant = await tx.participant.create({
      data: {
        splitSessionId,
        userId: participant.userId,
        displayName: participant.displayName,
      },
    });

    participantIdsByKey.set(participant.key, createdParticipant.id);
  }

  for (const receiptItem of input.receiptItems) {
    const createdReceiptItem = await tx.receiptItem.create({
      data: {
        splitSessionId,
        name: receiptItem.name,
        quantity: receiptItem.quantity,
        unitPrice: receiptItem.unitPrice,
        totalPrice: receiptItem.totalPrice,
      },
    });

    receiptItemIdsByKey.set(receiptItem.key, createdReceiptItem.id);
  }

  const itemAssignments = [
    ...input.receiptItems.flatMap((receiptItem) => receiptItem.itemAssignments),
    ...input.itemAssignments,
  ];

  for (const assignment of itemAssignments) {
    await tx.itemAssignment.create({
      data: {
        receiptItemId: requireMappedId(
          receiptItemIdsByKey,
          assignment.receiptItemKey,
          "item assignment receiptItemId",
        ),
        participantId: requireMappedId(
          participantIdsByKey,
          assignment.participantKey,
          "item assignment participantId",
        ),
        shareQuantity: assignment.shareQuantity,
        amount: assignment.amount,
      },
    });
  }

  for (const payment of input.payments) {
    await tx.payment.create({
      data: {
        splitSessionId,
        fromParticipantId: requireMappedId(
          participantIdsByKey,
          payment.fromParticipantKey,
          "payment fromParticipantId",
        ),
        toParticipantId: requireMappedId(
          participantIdsByKey,
          payment.toParticipantKey,
          "payment toParticipantId",
        ),
        amount: payment.amount,
        status: payment.status,
        note: payment.note,
      },
    });
  }
}

export async function listSplitSessions() {
  const splitSessions = await prisma.splitSession.findMany({
    include: splitSessionDtoInclude,
    orderBy: { createdAt: "desc" },
  });

  return splitSessions.map(mapSplitSessionToDto);
}

export async function getSplitSessionById(id: string) {
  const splitSession = await prisma.splitSession.findUnique({
    where: { id },
    include: splitSessionDtoInclude,
  });

  if (!splitSession) {
    throw new SplitSessionNotFoundError(id);
  }

  return mapSplitSessionToDto(splitSession);
}

export async function createSplitSession(body: CreateSplitSessionRequest) {
  const input = normalizeSplitSessionInput(body);

  const splitSession = await prisma.$transaction(async (tx) => {
    const createdSplitSession = await tx.splitSession.create({
      data: {
        ownerUserId: input.ownerUserId,
        title: input.title,
        splitType: input.splitType,
        restaurantName: input.restaurantName,
        subtotal: input.subtotal,
        tax: input.tax,
        tip: input.tip,
        total: input.total,
      },
    });

    await replaceNestedRecords(tx, createdSplitSession.id, input);

    return tx.splitSession.findUniqueOrThrow({
      where: { id: createdSplitSession.id },
      include: splitSessionDtoInclude,
    });
  });

  return mapSplitSessionToDto(splitSession);
}

export async function updateSplitSession(
  id: string,
  body: UpdateSplitSessionRequest,
) {
  const input = normalizeSplitSessionInput(body);

  const splitSession = await prisma.$transaction(async (tx) => {
    const existingSplitSession = await tx.splitSession.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingSplitSession) {
      throw new SplitSessionNotFoundError(id);
    }

    await tx.payment.deleteMany({ where: { splitSessionId: id } });
    await tx.itemAssignment.deleteMany({
      where: { receiptItem: { splitSessionId: id } },
    });
    await tx.receiptItem.deleteMany({ where: { splitSessionId: id } });
    await tx.participant.deleteMany({ where: { splitSessionId: id } });

    await tx.splitSession.update({
      where: { id },
      data: {
        ownerUserId: input.ownerUserId,
        title: input.title,
        splitType: input.splitType,
        restaurantName: input.restaurantName,
        subtotal: input.subtotal,
        tax: input.tax,
        tip: input.tip,
        total: input.total,
      },
    });

    await replaceNestedRecords(tx, id, input);

    return tx.splitSession.findUniqueOrThrow({
      where: { id },
      include: splitSessionDtoInclude,
    });
  });

  return mapSplitSessionToDto(splitSession);
}

export async function deleteSplitSession(id: string) {
  try {
    await prisma.splitSession.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new SplitSessionNotFoundError(id);
    }

    throw error;
  }
}
