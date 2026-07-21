type UnknownRecord = Record<string, unknown>;

export type SafeErrorDetails = {
  name: string;
  message: string;
  requestId?: string;
  statusCode?: number;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

export function getSafeErrorDetails(error: unknown): SafeErrorDetails {
  const record = asRecord(error);
  const metadata = asRecord(record?.$metadata);
  const requestId =
    metadata?.requestId ?? record?.requestId ?? record?.request_id;
  const statusCode =
    metadata?.httpStatusCode ?? record?.statusCode ?? record?.status;

  return {
    name:
      error instanceof Error
        ? error.name
        : typeof record?.name === "string"
          ? record.name
          : "UnknownError",
    message:
      error instanceof Error
        ? error.message
        : typeof record?.message === "string"
          ? record.message
          : "An unknown error occurred.",
    ...(typeof requestId === "string" ? { requestId } : {}),
    ...(typeof statusCode === "number" ? { statusCode } : {}),
  };
}
