import { createWorker } from "tesseract.js";

// Same swappable-engine pattern as server/extraction.ts. tesseract.js reads
// printed text well with no API key, but handwriting/cursive is
// unreliable — replacing this with a vision-LLM-backed engine later only
// means writing one new implementation and reassigning `ocrEngine` below.
export interface OcrEngine {
  recognize(imageBuffer: Buffer): Promise<string>;
}

async function tesseractRecognize(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

export const tesseractOcrEngine: OcrEngine = {
  recognize: tesseractRecognize,
};

export const ocrEngine: OcrEngine = tesseractOcrEngine;
