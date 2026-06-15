import multer from "multer";

import type { ReceiptImageMetadata, ReceiptImageValidationResult } from "../types/receipt";

/** Multipart form field name for the receipt image upload. */
export const RECEIPT_IMAGE_FIELD_NAME = "image";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const receiptImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new Error("Invalid file type. Upload a JPEG, PNG, or WebP image."),
    );
  },
});

export function validateReceiptImageFile(
  file: Express.Multer.File | undefined,
): ReceiptImageValidationResult {
  if (!file) {
    return {
      valid: false,
      error: `Missing image file. Send a multipart form field named "${RECEIPT_IMAGE_FIELD_NAME}".`,
    };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      error: "Uploaded image file is empty.",
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return {
      valid: false,
      error: "Invalid file type. Upload a JPEG, PNG, or WebP image.",
    };
  }

  const metadata: ReceiptImageMetadata = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };

  return { valid: true, metadata };
}

export function formatMulterUploadError(error: unknown): string {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Image file is too large. Maximum size is 10 MB.";
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return `Unexpected form field. Use "${RECEIPT_IMAGE_FIELD_NAME}" for the image upload.`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Invalid image upload.";
}
