import { Router, type Request, type Response } from "express";

import { extractReceiptMock } from "../services/mockReceiptService";
import {
  formatMulterUploadError,
  RECEIPT_IMAGE_FIELD_NAME,
  receiptImageUpload,
  validateReceiptImageFile,
} from "../services/receiptImageService";
import { repairReceiptWithOpenAI } from "../services/openaiReceiptRepairService";
import { parseReceiptFromTextract } from "../services/receiptParserService";
import { extractReceiptWithTextract } from "../services/textractService";

const receiptRoutes = Router();

receiptRoutes.post(
  "/extract",
  (req: Request, res: Response, next) => {
    receiptImageUpload.single(RECEIPT_IMAGE_FIELD_NAME)(req, res, (error) => {
      if (error) {
        res.status(400).json({ error: formatMulterUploadError(error) });
        return;
      }

      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const validation = validateReceiptImageFile(req.file);

      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      console.log(
        `[receiptRoutes] Received image: ${validation.metadata.originalName} (${validation.metadata.mimeType}, ${validation.metadata.sizeBytes} bytes)`,
      );

      const mockReceipt = await extractReceiptMock();

      try {
        if (!req.file?.buffer) {
          throw new Error("Uploaded image buffer is missing.");
        }

        const textractResult = await extractReceiptWithTextract(
          req.file.buffer,
        );

        const parsedReceipt = parseReceiptFromTextract(
          textractResult.rawText,
          textractResult.detectedFields,
        );
        const extracted = {
          ...parsedReceipt,
          detectedFields: textractResult.detectedFields,
          confidenceScores: textractResult.confidenceScores,
          ocrSource: textractResult.source,
          extractionMethod: "textract",
        };

        if (parsedReceipt.validation?.hasMismatch) {
          try {
            const repairedReceipt = await repairReceiptWithOpenAI({
              rawText: textractResult.rawText,
              detectedFields: textractResult.detectedFields,
              parsedReceipt,
            });

            res.json({
              ...repairedReceipt,
              detectedFields: textractResult.detectedFields,
              confidenceScores: textractResult.confidenceScores,
              ocrSource: textractResult.source,
              extractionMethod: "textract-openai-repair",
            });
            return;
          } catch (openAIError) {
            console.error(
              "[receiptRoutes] OpenAI repair failed; returning Textract parsed result:",
              openAIError,
            );
          }
        }

        res.json(extracted);
        return;
      } catch (textractError) {
        console.error(
          "[receiptRoutes] Textract failed; returning mock receipt response:",
          textractError,
        );
      }

      res.json({
        ...mockReceipt,
        detectedFields: [],
        confidenceScores: [],
        ocrSource: "mock-fallback",
        extractionMethod: "mock-fallback",
      });
    } catch (error) {
      console.error("Receipt extraction failed:", error);
      res.status(500).json({
        error: "Failed to extract receipt data.",
      });
    }
  },
);

export default receiptRoutes;
