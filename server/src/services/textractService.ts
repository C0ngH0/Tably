import {
  AnalyzeExpenseCommand,
  DetectDocumentTextCommand,
  TextractClient,
  type AnalyzeExpenseCommandOutput,
  type Block,
  type ExpenseField,
} from "@aws-sdk/client-textract";

export type DetectedReceiptField = {
  name: string;
  value: string;
  confidence?: number;
  groupIndex?: number;
  rowIndex?: number;
  source?: "summary" | "line-item" | "line";
};

export type TextractExtractionResult = {
  rawText: string;
  detectedFields: DetectedReceiptField[];
  confidenceScores: number[];
  source: "analyze-expense" | "detect-document-text";
};

let textractClient: TextractClient | null = null;

function getTextractClient(): TextractClient {
  if (!textractClient) {
    console.log("[textractService] Instantiating TextractClient");
    console.log("[textractService] process.cwd():", process.cwd());
    console.log("[textractService] AWS_REGION:", process.env.AWS_REGION);
    console.log(
      "[textractService] AWS_ACCESS_KEY_ID exists:",
      Boolean(process.env.AWS_ACCESS_KEY_ID),
    );
    console.log(
      "[textractService] AWS_SECRET_ACCESS_KEY exists:",
      Boolean(process.env.AWS_SECRET_ACCESS_KEY),
    );

    textractClient = new TextractClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  return textractClient;
}

function getFieldName(field: ExpenseField): string {
  return (
    field.Type?.Text ||
    field.LabelDetection?.Text ||
    "Unknown field"
  );
}

function getFieldValue(field: ExpenseField): string {
  return field.ValueDetection?.Text || "";
}

function getFieldConfidence(field: ExpenseField): number | undefined {
  return field.ValueDetection?.Confidence ?? field.LabelDetection?.Confidence;
}

function collectExpenseField(
  field: ExpenseField,
  metadata: Pick<
    DetectedReceiptField,
    "groupIndex" | "rowIndex" | "source"
  >,
): DetectedReceiptField | null {
  const value = getFieldValue(field);

  if (!value) {
    return null;
  }

  return {
    name: getFieldName(field),
    value,
    confidence: getFieldConfidence(field),
    ...metadata,
  };
}

function collectLineText(blocks: Block[] | undefined): string[] {
  return (blocks ?? [])
    .filter((block) => block.BlockType === "LINE" && block.Text)
    .map((block) => block.Text as string);
}

function parseAnalyzeExpenseResult(
  result: AnalyzeExpenseCommandOutput,
): TextractExtractionResult {
  const detectedFields: DetectedReceiptField[] = [];
  const rawTextParts: string[] = [];

  for (const document of result.ExpenseDocuments ?? []) {
    rawTextParts.push(...collectLineText(document.Blocks));

    for (const field of document.SummaryFields ?? []) {
      const detectedField = collectExpenseField(field, { source: "summary" });
      if (detectedField) {
        detectedFields.push(detectedField);
      }
    }

    for (const [groupIndex, group] of (document.LineItemGroups ?? []).entries()) {
      for (const [rowIndex, lineItem] of (group.LineItems ?? []).entries()) {
        for (const field of lineItem.LineItemExpenseFields ?? []) {
          const detectedField = collectExpenseField(field, {
            groupIndex,
            rowIndex,
            source: "line-item",
          });
          if (detectedField) {
            detectedFields.push(detectedField);
          }
        }
      }
    }
  }

  const rawText =
    rawTextParts.length > 0
      ? rawTextParts.join("\n")
      : detectedFields
          .map((field) => `${field.name}: ${field.value}`)
          .join("\n");

  return {
    rawText,
    detectedFields,
    confidenceScores: detectedFields
      .map((field) => field.confidence)
      .filter((confidence): confidence is number => confidence !== undefined),
    source: "analyze-expense",
  };
}

function parseDetectDocumentTextResult(blocks: Block[] | undefined): TextractExtractionResult {
  const lines = collectLineText(blocks);
  const detectedFields: DetectedReceiptField[] = (blocks ?? [])
    .filter((block) => block.BlockType === "LINE" && block.Text)
    .map((block) => ({
      name: "LINE",
      value: block.Text as string,
      confidence: block.Confidence,
      source: "line",
    }));

  return {
    rawText: lines.join("\n"),
    detectedFields,
    confidenceScores: detectedFields
      .map((field) => field.confidence)
      .filter((confidence): confidence is number => confidence !== undefined),
    source: "detect-document-text",
  };
}

/**
 * Run Textract OCR on an uploaded receipt image.
 * AnalyzeExpense is preferred for receipt-aware fields; DetectDocumentText is
 * used as a fallback when AnalyzeExpense cannot process the image.
 */
export async function extractReceiptWithTextract(
  imageBuffer: Buffer,
): Promise<TextractExtractionResult> {
  const client = getTextractClient();

  try {
    const analyzeResult = await client.send(
      new AnalyzeExpenseCommand({
        Document: {
          Bytes: imageBuffer,
        },
      }),
    );

    return parseAnalyzeExpenseResult(analyzeResult);
  } catch (analyzeError) {
    console.error(
      "[textractService] AnalyzeExpense failed; falling back to DetectDocumentText:",
      analyzeError,
    );
  }

  const detectResult = await client.send(
    new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBuffer,
      },
    }),
  );

  return parseDetectDocumentTextResult(detectResult.Blocks);
}
