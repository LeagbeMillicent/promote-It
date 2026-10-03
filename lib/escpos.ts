/**
 * ESC/POS Thermal Receipt Engine & Direct Hardware Communication
 * Tailored specifically for Xprinter XP-E200L / XP-E260L (80mm) & compatible POS thermal printers.
 */

export type EscPosOptions = {
  paperWidth?: "80mm" | "58mm"; // Default: "80mm" for XP-E200L / XP-E260L
  autoCut?: boolean;             // Default: true (triggers XP-E200L / XP-E260L auto-cutter)
  openCashDrawer?: boolean;      // Default: true (sends RJ11 pulse to open cash drawer)
  printerModel?: string;         // Default: "XP-E200L / XP-E260L (80mm)"
};

export type ReceiptPrintPayload = {
  saleNumber: string;
  date: string;
  storeName?: string;
  storeTagline?: string;
  storeLocation?: string;
  storeAddress?: string;
  storePhone?: string;
  cashier?: string;
  customer?: string;
  paymentMethod?: string;
  paymentReference?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
};

// Character widths for standard ESC/POS Font A
export const PRINTER_COLUMNS = {
  "80mm": 48, // XP-E200L / XP-E260L (72mm printable area / 576 dots / Font A = 48 chars)
  "58mm": 32, // Mini 58mm (48mm printable area / 384 dots / Font A = 32 chars)
} as const;

/**
 * Command bytes for ESC/POS
 */
const CMD = {
  INIT: [0x1b, 0x40], // ESC @ (Reset/Init)
  CODEPAGE_PC437: [0x1b, 0x74, 0x00], // ESC t 0 (PC437)
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  SIZE_NORMAL: [0x1d, 0x21, 0x00],
  SIZE_DOUBLE_HEIGHT: [0x1d, 0x21, 0x01],
  SIZE_DOUBLE_WIDTH: [0x1d, 0x21, 0x10],
  SIZE_DOUBLE: [0x1d, 0x21, 0x11], // 2x Height & 2x Width (Titles & Grand Total)
  LINE_FEED: [0x0a],
  FEED_3_LINES: [0x1b, 0x64, 0x03],
  FEED_5_LINES: [0x1b, 0x64, 0x05], // Auto-cutter clearance for XP-E200L / XP-E260L
  CUT_FULL: [0x1d, 0x56, 0x42, 0x00], // GS V 'B' 0 (Feed and Cut - full cutter)
  DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (RJ11 Pin 2 pulse)
};

/**
 * String helpers for fixed-width POS formatting
 */
function padEnd(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return str + " ".repeat(length - str.length);
}

function padStart(str: string, length: number): string {
  if (str.length >= length) return str.slice(0, length);
  return " ".repeat(length - str.length) + str;
}

function twoCol(left: string, right: string, width: number): string {
  const availableLeft = Math.max(1, width - right.length - 1);
  const truncatedLeft = left.length > availableLeft ? left.slice(0, availableLeft) : left;
  const spaces = Math.max(1, width - truncatedLeft.length - right.length);
  return truncatedLeft + " ".repeat(spaces) + right;
}

/**
 * Generates raw ESC/POS binary buffer for XP-E200L / XP-E260L 80mm POS printer
 */
export function buildEscPosBytes(receipt: ReceiptPrintPayload, options?: EscPosOptions): Uint8Array {
  const paperWidth = options?.paperWidth ?? "80mm";
  const cols = PRINTER_COLUMNS[paperWidth];
  const autoCut = options?.autoCut !== false; // default true for XP-E200L
  const openDrawer = options?.openCashDrawer ?? false;

  const chunks: number[][] = [];

  function addBytes(...bytes: (number | number[])[]) {
    for (const b of bytes) {
      if (Array.isArray(b)) chunks.push(b);
      else chunks.push([b]);
    }
  }

  function addText(text: string) {
    const encoder = new TextEncoder();
    chunks.push(Array.from(encoder.encode(text)));
  }

  function addLine(text = "") {
    addText(text);
    addBytes(CMD.LINE_FEED);
  }

  function addDivider() {
    addBytes([0x1b, 0x2d, 0x02]);
    addText(" ".repeat(cols));
    addBytes([0x1b, 0x2d, 0x00]);
    addBytes(CMD.LINE_FEED);
  }

  // 1. Kick cash drawer if configured
  if (openDrawer) {
    addBytes(CMD.DRAWER_KICK);
  }

  // 2. Initialize printer & character set
  addBytes(CMD.INIT);
  addBytes(CMD.CODEPAGE_PC437);

  // 3. Store Header (Centered, Big Prominent Title)
  addBytes(CMD.ALIGN_CENTER);
  addBytes(CMD.BOLD_ON);
  addBytes(CMD.SIZE_DOUBLE);
  addLine("PROMOTEIT");
  addBytes(CMD.SIZE_NORMAL);
  addLine(receipt.storeName || "promoteIt Ventures");
  const storeLoc = (!receipt.storeLocation || receipt.storeLocation.toLowerCase().includes("accra central") || receipt.storeLocation.includes("Adenta Down"))
    ? "Adenta-Accountancy, Accra"
    : receipt.storeLocation;
  addLine(storeLoc);
  addLine(`Tel: ${receipt.storePhone || "0553898761"}`);

  addDivider();

  // 4. Receipt Metadata (Left aligned, BOLD for thermal clarity)
  addBytes(CMD.ALIGN_LEFT);
  addBytes(CMD.BOLD_ON);
  addLine(twoCol(`RECEIPT NO: ${receipt.saleNumber}`, receipt.date, cols));
  addLine(`CASHIER: ${receipt.cashier || "Store Attendant"}`);

  addDivider();

  // 5. Items Table - Every item and price on straight line (BOLD for thermal clarity)
  addBytes(CMD.BOLD_ON);
  if (cols >= 48) {
    const colHeader =
      padEnd("ITEM", 22) +
      padStart("QTY", 6) +
      padStart("PRICE", 10) +
      padStart("TOTAL", 10);
    addLine(colHeader);
    addDivider();

    for (let i = 0; i < receipt.items.length; i++) {
      const item = receipt.items[i];
      const itemName = item.name.length > 21 ? item.name.slice(0, 21) : item.name;
      const itemCol = padEnd(itemName, 22);
      const qtyCol = padStart(`${item.quantity}`, 6);
      const priceCol = padStart(item.unitPrice.toFixed(2), 10);
      const totalCol = padStart(item.total.toFixed(2), 10);
      // Every item and price on straight line:
      addLine(itemCol + qtyCol + priceCol + totalCol);

      // Solid line separating distinct items
      if (i < receipt.items.length - 1) {
        addDivider();
      }
    }
  } else {
    // 58mm compact layout (32 cols):
    addLine(twoCol("ITEM", "TOTAL", cols));
    addDivider();

    for (let i = 0; i < receipt.items.length; i++) {
      const item = receipt.items[i];
      const itemName = item.name.length > 18 ? item.name.slice(0, 18) : item.name;
      const itemCol = padEnd(itemName, 19);
      const totalCol = padStart(item.total.toFixed(2), 13);
      addLine(itemCol + totalCol);

      if (i < receipt.items.length - 1) {
        addDivider();
      }
    }
  }

  addDivider();

  // 6. Totals Section - Subtotal removed, keeping only Total
  addBytes(CMD.ALIGN_LEFT);
  addBytes(CMD.BOLD_ON);

  if (receipt.discount && receipt.discount > 0) {
    addLine(twoCol("Discount:", `-GHS ${receipt.discount.toFixed(2)}`, cols));
  }

  addBytes(CMD.SIZE_DOUBLE_HEIGHT);
  addLine(twoCol("TOTAL:", `GHS ${receipt.total.toFixed(2)}`, cols));
  addBytes(CMD.SIZE_NORMAL);

  addLine(twoCol(`Paid via ${receipt.paymentMethod || "CASH"}:`, `GHS ${receipt.total.toFixed(2)}`, cols));
  if (receipt.paymentReference) {
    addLine(twoCol("Payment Ref:", receipt.paymentReference, cols));
  }

  addDivider();

  // 7. Barcode (Code 39: GS k 69)
  addBytes(CMD.ALIGN_CENTER);
  try {
    const cleanNum = receipt.saleNumber
      .toUpperCase()
      .replace(/[^0-9A-Z\-.$/+% ]/g, "-");
    if (cleanNum.length > 0) {
      // Set barcode height to 55 dots
      addBytes([0x1d, 0x68, 55]);
      // Set barcode width (2 dots)
      addBytes([0x1d, 0x77, 2]);
      // Print HRI text below barcode (Font A)
      addBytes([0x1d, 0x48, 2]);
      // CODE39 command: GS k 69 length data
      const enc = new TextEncoder();
      const codeBytes = Array.from(enc.encode(cleanNum));
      addBytes([0x1d, 0x6b, 69, codeBytes.length, ...codeBytes]);
      addBytes(CMD.LINE_FEED);
    }
  } catch {
    addLine(`* ${receipt.saleNumber} *`);
  }

  // 8. Footer Notes - Thank you message then powered by M Sphere (BOLD for thermal clarity)
  addBytes(CMD.ALIGN_CENTER);
  addBytes(CMD.BOLD_ON);
  addLine("Thank you for shopping with PromoteIt!");
  addLine("Powered by M Sphere");
  addBytes(CMD.BOLD_OFF);

  // 9. Extra feed so auto-cutter cuts cleanly without clipping footer
  addBytes(CMD.FEED_5_LINES);

  // 10. Hardware Auto-cut for XP-E200L / XP-E260L (multi-firmware universal cut)
  if (autoCut) {
    addBytes([0x1d, 0x56, 0x42, 0x00]); // GS V 'B' 0 (Feed and full cut)
    addBytes([0x1d, 0x56, 0x00]);       // GS V 0 (Standard full cut)
    addBytes([0x1d, 0x56, 0x01]);       // GS V 1 (Standard partial cut)
    addBytes([0x1b, 0x69]);             // ESC i (Full cut)
    addBytes([0x1b, 0x6d]);             // ESC m (Partial cut)
  }

  // Flatten array into Uint8Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Sends a standalone cut command directly to XP-E200L / XP-E260L over Web Serial / WebUSB
 */
export async function sendDirectCutCommand(): Promise<{ success: boolean; message: string }> {
  const cutBytes = new Uint8Array([
    0x1b, 0x40,             // ESC @ (Init)
    0x1b, 0x64, 0x05,       // Feed 5 lines
    0x1d, 0x56, 0x42, 0x00, // GS V 'B' 0
    0x1d, 0x56, 0x00,       // GS V 0
    0x1d, 0x56, 0x01,       // GS V 1
    0x1b, 0x69,             // ESC i
    0x1b, 0x6d,             // ESC m
  ]);

  if (isWebSerialSupported()) {
    const serialRes = await printDirectWebSerial(cutBytes, 9600);
    if (serialRes.success) return { success: true, message: "Cutter blade triggered successfully via Serial/COM!" };
  }
  if (isWebUsbSupported()) {
    const usbRes = await printDirectWebUsb(cutBytes);
    if (usbRes.success) return { success: true, message: "Cutter blade triggered successfully via USB!" };
  }
  return {
    success: false,
    message: "Direct USB/Serial port not paired. To cut with browser driver, enable 'Feed and Cut' in Windows Printing Preferences.",
  };
}

/**
 * Checks if browser supports Web Serial API
 */
export function isWebSerialSupported(): boolean {
  return typeof window !== "undefined" && "serial" in navigator;
}

/**
 * Checks if browser supports WebUSB API
 */
export function isWebUsbSupported(): boolean {
  return typeof window !== "undefined" && "usb" in navigator;
}

/**
 * Direct print to XP-E200L / XP-E260L via Web Serial (COM port)
 */
export async function printDirectWebSerial(
  data: Uint8Array,
  baudRate = 9600
): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported()) {
    return {
      success: false,
      message: "Web Serial is not supported in this browser. Please use Chrome, Edge, or Browser Print.",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    const port = await nav.serial.requestPort();
    await port.open({ baudRate });

    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    await port.close();

    return {
      success: true,
      message: "Receipt successfully sent directly to XP-E200L / XP-E260L thermal printer!",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Connection failed";
    return {
      success: false,
      message: errorMsg.includes("cancelled") || errorMsg.includes("No port selected")
        ? "Printer port selection was cancelled."
        : `Could not connect to printer: ${errorMsg}`,
    };
  }
}

/**
 * Direct print to XP-E200L / XP-E260L via WebUSB
 */
export async function printDirectWebUsb(
  data: Uint8Array
): Promise<{ success: boolean; message: string }> {
  if (!isWebUsbSupported()) {
    return {
      success: false,
      message: "WebUSB is not supported in this browser. Please use Chrome, Edge, or Browser Print.",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    // Request device with printer class (0x07) or general USB
    const device = await nav.usb.requestDevice({
      filters: [
        { classCode: 7 }, // USB Printer Class
        { vendorId: 0x0fe6 }, // Common Xprinter vendor
        { vendorId: 0x1fc9 },
        { vendorId: 0x0416 },
        { vendorId: 0x0483 },
      ],
    });

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Find OUT endpoint
    const iface = device.configuration.interfaces[0];
    const alternate = iface.alternates[0];
    const outEndpoint = alternate.endpoints.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ep: any) => ep.direction === "out"
    );

    const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

    await device.transferOut(endpointNumber, data);
    await device.close();

    return {
      success: true,
      message: "Receipt successfully sent via USB to XP-E200L / XP-E260L thermal printer!",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "USB Error";
    return {
      success: false,
      message: errorMsg.includes("cancelled") || errorMsg.includes("No device selected")
        ? "USB printer selection was cancelled."
        : `USB Print failed: ${errorMsg}`,
    };
  }
}

/**
 * Sample test receipt for XP-E200L / XP-E260L 80mm POS printer
 */
export function getSample80mmReceipt(): ReceiptPrintPayload {
  return {
    saleNumber: `PT-TEST-${Date.now().toString().slice(-4)}`,
    date: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    storeName: "promoteIt Ventures",
    storeTagline: "Retail & Branding Merchandise",
    storeLocation: "Adenta-Accountancy, Accra",
    storeAddress: "Adenta-Accountancy, Accra",
    storePhone: "0553898761",
    cashier: "Kwame Mensah",
    customer: "Walk-in Customer",
    paymentMethod: "CASH",
    paymentReference: "XP-E200L-VERIFY",
    items: [
      {
        name: "XP-E200L Alignment Test",
        sku: "ALIGN-80MM",
        quantity: 2,
        unitPrice: 35.0,
        total: 70.0,
      },
      {
        name: "RJ11 Cash Drawer Test",
        sku: "HARDWARE-PASS",
        quantity: 1,
        unitPrice: 50.0,
        total: 50.0,
      },
    ],
    subtotal: 120.0,
    discount: 0.0,
    total: 120.0,
  };
}
