import { createWorker } from "tesseract.js";

// Same swappable-engine pattern as server/extraction.ts. tesseract.js reads
// printed text well with no API key, but handwriting/cursive is
// unreliable — replacing this with a vision-LLM-backed engine later only
// means writing one new implementation and reassigning `ocrEngine` below.
export interface OcrEngine {
  recognize(imageBuffer: Buffer): Promise<string>;
}

// Each OCR run spins up a tesseract worker that loads the language model into
// memory (tens of MB). Without a cap, a burst of uploads can run many workers
// at once and exhaust the instance's memory. Gate concurrency to a small
// number; extra requests queue for a slot.
const MAX_CONCURRENT_OCR = 2;
let activeOcr = 0;
const ocrWaiters: Array<() => void> = [];

function acquireOcrSlot(): Promise<void> {
  // A queued waiter does NOT increment activeOcr itself — the releasing run
  // hands its slot directly to the next waiter (see releaseOcrSlot), so the
  // count can never exceed MAX_CONCURRENT_OCR even under a race.
  if (activeOcr < MAX_CONCURRENT_OCR) {
    activeOcr++;
    return Promise.resolve();
  }
  return new Promise((resolve) => ocrWaiters.push(resolve));
}

function releaseOcrSlot(): void {
  const next = ocrWaiters.shift();
  if (next) {
    // Transfer the slot to the next waiter without touching activeOcr.
    next();
  } else {
    activeOcr--;
  }
}

async function tesseractRecognize(imageBuffer: Buffer): Promise<string> {
  await acquireOcrSlot();
  try {
    const worker = await createWorker("eng");
    try {
      const {
        data: { text },
      } = await worker.recognize(imageBuffer);
      return text.trim();
    } finally {
      await worker.terminate();
    }
  } finally {
    releaseOcrSlot();
  }
}

export const tesseractOcrEngine: OcrEngine = {
  recognize: tesseractRecognize,
};

export const ocrEngine: OcrEngine = tesseractOcrEngine;
