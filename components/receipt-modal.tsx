"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Printer, X } from "lucide-react";
import { generateCode39PngDataUrl } from "@/lib/barcode";

export type ReceiptData = {
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
  storeFooter?: string;
};

const emptySubscribe = () => () => {};

export function ReceiptModal({
  receipt,
  onClose,
  autoPrint = false,
}: {
  receipt: ReceiptData;
  onClose: () => void;
  autoPrint?: boolean;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Generate authentic Code 39 barcode image synchronously
  const barcodeDataUrl = useMemo(() => {
    if (receipt.saleNumber) {
      return generateCode39PngDataUrl(receipt.saleNumber, 54);
    }
    return "";
  }, [receipt.saleNumber]);

  // Standard browser driver print
  function handleBrowserPrint() {
    document.documentElement.classList.add("printing-receipt");
    document.body.classList.add("printing-receipt");
    window.print();
    setTimeout(() => {
      document.documentElement.classList.remove("printing-receipt");
      document.body.classList.remove("printing-receipt");
    }, 1500);
  }

  // Auto-print on open if requested (waits for barcode generation and DOM mount)
  useEffect(() => {
    if (autoPrint && mounted && barcodeDataUrl) {
      const timer = setTimeout(() => {
        handleBrowserPrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, mounted, barcodeDataUrl]);

  // Track print event lifecycle to apply print styling classes on body/html
  useEffect(() => {
    function handleBeforePrint() {
      document.documentElement.classList.add("printing-receipt");
      document.body.classList.add("printing-receipt");
    }
    function handleAfterPrint() {
      document.documentElement.classList.remove("printing-receipt");
      document.body.classList.remove("printing-receipt");
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.documentElement.classList.remove("printing-receipt");
      document.body.classList.remove("printing-receipt");
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop receipt-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scoped print styling for 80mm POS thermal roll */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto !important;
            margin: 0mm !important;
          }
        }
      `}</style>
      <div className="receipt-dialog" role="dialog" aria-modal="true">
        {/* Clean Controls Header Bar */}
        <div className="receipt-controls-bar no-print">
          <div className="receipt-controls-left">
            <div className="printer-preset-pill">
              <Printer size={14} />
              <span style={{ fontWeight: 600 }}>Receipt Preview</span>
            </div>
          </div>

          <div className="receipt-controls-actions">
            <button
              type="button"
              className="primary-button print-action-btn"
              onClick={handleBrowserPrint}
              autoFocus={autoPrint}
              title="Print Receipt"
            >
              <Printer size={15} /> Print Receipt
            </button>

            <button
              type="button"
              className="icon-button modal-close"
              onClick={onClose}
              aria-label="Close receipt"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Paper (Standard 80mm POS) */}
        <div className="receipt-paper-wrap">
          <article
            className="receipt-paper paper-80mm"
            id="printable-receipt"
            data-paper-width="80mm"
          >
            {/* Store Header & Big Prominent Branding */}
            <div className="receipt-header">
              <div className="receipt-brand-logo">
                <Image
                  src="/img/PromoteItLogo2.png"
                  alt="promoteIt Ventures"
                  width={160}
                  height={54}
                  className="receipt-logo-img"
                  priority
                />
              </div>
              <h1 className="receipt-store-title">
                {(receipt.storeName || (typeof window !== "undefined" && localStorage.getItem("pos_store_name")) || "PROMOTEIT VENTURES").toUpperCase()}
              </h1>
              <div className="receipt-store-location">
                {(!receipt.storeLocation || receipt.storeLocation.toLowerCase().includes("accra central") || receipt.storeLocation.includes("Adenta Down"))
                  ? ((typeof window !== "undefined" && localStorage.getItem("pos_store_location")) || "Adenta-Accountancy, Accra")
                  : receipt.storeLocation}
              </div>
              <div className="receipt-store-contact">
                Tel: {receipt.storePhone || (typeof window !== "undefined" && localStorage.getItem("pos_store_phone")) || "0553898761"}
              </div>
            </div>

            <hr className="receipt-divider-solid" />

            {/* Receipt Meta */}
            <div className="receipt-meta-grid">
              <div>
                <span className="meta-label">Receipt No:</span>
                <strong className="meta-value">{receipt.saleNumber}</strong>
              </div>
              <div>
                <span className="meta-label">Date & Time:</span>
                <strong className="meta-value">{receipt.date}</strong>
              </div>
              <div>
                <span className="meta-label">Cashier:</span>
                <strong className="meta-value">{receipt.cashier || "Store Attendant"}</strong>
              </div>
            </div>

            <hr className="receipt-divider-solid" />

            {/* Line Items Table with Solid Dividing Lines */}
            <div className="receipt-items-container">
              <table className="receipt-items-table table-80mm">
                <colgroup>
                  <col style={{ width: "48%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "22%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>ITEM</th>
                    <th style={{ textAlign: "center" }}>QTY</th>
                    <th style={{ textAlign: "right", paddingRight: "6px" }}>PRICE</th>
                    <th style={{ textAlign: "right" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, idx) => (
                    <tr className="receipt-item-row" key={`${item.name}-${idx}`}>
                      <td className="receipt-col-desc">
                        <strong className="receipt-item-name" title={item.name}>
                          {item.name}
                        </strong>
                      </td>
                      <td className="receipt-col-qty"><strong>{item.quantity}</strong></td>
                      <td className="receipt-col-price">
                        <strong>{item.unitPrice.toFixed(2)}</strong>
                      </td>
                      <td className="receipt-col-total">
                        <strong>{item.total.toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation - Only Total is shown */}
            <div className="receipt-totals-section">
              {Boolean(receipt.discount && receipt.discount > 0) && (
                <div className="receipt-totals-row discount-row">
                  <strong className="totals-label">Discount:</strong>
                  <strong className="totals-value">-GHS {receipt.discount?.toFixed(2)}</strong>
                </div>
              )}
              <div className="receipt-totals-row grand-total">
                <strong className="totals-label">TOTAL:</strong>
                <strong className="totals-value">GHS {receipt.total.toFixed(2)}</strong>
              </div>
              <div className="receipt-totals-row payment-row">
                <strong className="totals-label">Paid via {receipt.paymentMethod || "CASH"}:</strong>
                <strong className="totals-value">GHS {receipt.total.toFixed(2)}</strong>
              </div>
              {receipt.paymentReference && (
                <div className="receipt-totals-row payment-ref">
                  <strong className="totals-label">Ref:</strong>
                  <strong className="totals-value">{receipt.paymentReference}</strong>
                </div>
              )}
            </div>

            <hr className="receipt-divider-solid" />

            {/* Barcode Section */}
            <div className="receipt-barcode-section">
              {barcodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={barcodeDataUrl}
                  alt={`Barcode ${receipt.saleNumber}`}
                  className="receipt-barcode-img"
                  width="180"
                  height="45"
                />
              ) : (
                <div style={{ height: "11mm" }} />
              )}
              <span className="receipt-barcode-number">*{receipt.saleNumber}*</span>
            </div>

            <div className="receipt-footer-notes">
              <p>{receipt.storeFooter || (typeof window !== "undefined" && localStorage.getItem("pos_receipt_footer")) || "Thank you for shopping with promoteIt Ventures!"}</p>
              <div className="receipt-system-tag">
                Powered by Clutel
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>,
    document.body
  );
}
