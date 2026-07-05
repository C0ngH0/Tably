export type SplitMode = "even" | "itemized" | "hybrid";

export type PaymentDtoStatus = "PENDING" | "COMPLETED" | "CANCELED";

export type ParticipantDto = {
  id: string;
  displayName: string;
};

export type ItemAssignmentDto = {
  id: string;
  participantId: string;
  shareQuantity: number | null;
  amount: number | null;
};

export type ReceiptItemDto = {
  id: string;
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  itemAssignments: ItemAssignmentDto[];
};

export type PaymentDto = {
  id: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number | null;
  status: PaymentDtoStatus;
  note: string | null;
};

export type SplitSessionDto = {
  id: string;
  title: string;
  mode: SplitMode;
  restaurantName: string | null;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
  createdAt: string;
  updatedAt: string;
  participants: ParticipantDto[];
  receiptItems: ReceiptItemDto[];
  payments: PaymentDto[];
};

export type ParticipantInput = {
  id?: string;
  clientId?: string;
  localId?: string;
  displayName: string;
};

export type ItemAssignmentInput = {
  id?: string;
  receiptItemId?: string;
  receiptItemClientId?: string;
  receiptItemLocalId?: string;
  participantId: string;
  participantClientId?: string;
  participantLocalId?: string;
  shareQuantity?: number;
  amount: number;
};

export type ReceiptItemInput = {
  id?: string;
  clientId?: string;
  localId?: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  itemAssignments?: ItemAssignmentInput[];
};

export type PaymentInput = {
  id?: string;
  fromParticipantId: string;
  fromParticipantClientId?: string;
  fromParticipantLocalId?: string;
  toParticipantId: string;
  toParticipantClientId?: string;
  toParticipantLocalId?: string;
  amount: number;
  status?: PaymentDtoStatus;
  note?: string;
};

export type CreateSplitSessionRequest = {
  title?: string;
  mode: SplitMode;
  restaurantName?: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  participants: ParticipantInput[];
  receiptItems: ReceiptItemInput[];
  itemAssignments?: ItemAssignmentInput[];
  payments?: PaymentInput[];
};

export type UpdateSplitSessionRequest = CreateSplitSessionRequest;
