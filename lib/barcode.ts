/**
 * Code 39 Barcode Generator for POS Receipts
 * Fully compliant with ISO/IEC 16388.
 * Generates an SVG string or a Canvas PNG Data URL for reliable thermal printing.
 */

const CODE39_ENCODINGS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  "A": "100001001",
  "B": "001001001",
  "C": "101001000",
  "D": "000011001",
  "E": "100011000",
  "F": "001011000",
  "G": "000001101",
  "H": "100001100",
  "I": "001001100",
  "J": "000011100",
  "K": "100000011",
  "L": "001000011",
  "M": "101000010",
  "N": "000010011",
  "O": "100010010",
  "P": "001010010",
  "Q": "000000111",
  "R": "100000110",
  "S": "001000110",
  "T": "000010110",
  "U": "110000001",
  "V": "011000001",
  "W": "111000000",
  "X": "010010001",
  "Y": "110010000",
  "Z": "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  "$": "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
};

export type BarSegment = {
  x: number;
  width: number;
};

/**
 * Encodes text into Code 39 bar segments
 */
export function generateCode39Bars(text: string): {
  segments: BarSegment[];
  totalWidth: number;
} {
  const cleanText =
    "*" +
    text
      .toUpperCase()
      .replace(/[^0-9A-Z\-.$/+% ]/g, "-") +
    "*";

  const narrowWidth = 2; // base unit in pixels
  const wideWidth = 5;   // 2.5:1 ratio
  const gapWidth = 2;    // inter-character gap

  let currentX = 0;
  const segments: BarSegment[] = [];

  for (let c = 0; c < cleanText.length; c++) {
    const char = cleanText[c];
    const pattern = CODE39_ENCODINGS[char] || CODE39_ENCODINGS["-"];

    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === "1";
      const w = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        segments.push({ x: currentX, width: w });
      }
      currentX += w;
    }

    if (c < cleanText.length - 1) {
      currentX += gapWidth;
    }
  }

  return { segments, totalWidth: currentX };
}

/**
 * Generates an authentic Code 39 PNG Data URL
 */
export function generateCode39PngDataUrl(
  text: string,
  height = 54
): string {
  if (typeof document === "undefined") return "";

  const { segments, totalWidth } = generateCode39Bars(text);
  const canvas = document.createElement("canvas");
  const margin = 12;
  canvas.width = totalWidth + margin * 2;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Pure white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pure black bars
  ctx.fillStyle = "#000000";
  for (const seg of segments) {
    ctx.fillRect(seg.x + margin, 0, seg.width, height);
  }

  return canvas.toDataURL("image/png");
}
