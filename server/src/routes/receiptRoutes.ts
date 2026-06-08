import { Router, type Request, type Response } from "express";

import { extractReceiptMock } from "../services/mockReceiptService";

const receiptRoutes = Router();

type ExtractReceiptBody = {
  imageUri?: string;
};

receiptRoutes.post("/extract", async (req: Request, res: Response) => {
  try {
    const { imageUri } = req.body as ExtractReceiptBody;

    if (!imageUri || typeof imageUri !== "string") {
      res.status(400).json({
        error: "imageUri is required and must be a string.",
      });
      return;
    }

    const extracted = await extractReceiptMock(imageUri);

    res.json(extracted);
  } catch (error) {
    console.error("Receipt extraction failed:", error);
    res.status(500).json({
      error: "Failed to extract receipt data.",
    });
  }
});

export default receiptRoutes;
