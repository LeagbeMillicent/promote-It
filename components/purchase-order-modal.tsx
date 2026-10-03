"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Download, FileText, Printer, X } from "lucide-react";

export type PurchaseItemData = {
  name: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  total: number;
};

export type PurchaseOrderData = {
  id: string;
  purchaseId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  date: string;
  status: string;
  storeName?: string;
  storeLocation?: string;
  storePhone?: string;
  storeEmail?: string;
  items: PurchaseItemData[];
  totalAmount: number;
};

export function exportPurchaseOrderCSV(po: PurchaseOrderData) {
  const lines: string[] = [];
  lines.push(`"PURCHASE ORDER"`);
  lines.push(`"PO Number:","${po.id}"`);
  lines.push(`"Order Date:","${po.date}"`);
  lines.push(`"Status:","${po.status.toUpperCase()}"`);
  lines.push(`"Supplier:","${po.supplierName.replace(/"/g, '""')}"`);
  if (po.supplierPhone) lines.push(`"Supplier Phone:","${po.supplierPhone}"`);
  if (po.supplierEmail) lines.push(`"Supplier Email:","${po.supplierEmail}"`);
  lines.push("");
  lines.push(`"#","Product Description","SKU","Quantity","Unit Cost (GHS)","Line Total (GHS)"`);

  po.items.forEach((item, index) => {
    lines.push(
      `"${index + 1}","${item.name.replace(/"/g, '""')}","${(item.sku || "").replace(/"/g, '""')}","${item.quantity}","${item.unitCost.toFixed(2)}","${item.total.toFixed(2)}"`
    );
  });

  const totalQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
  lines.push("");
  lines.push(`"","Total Items: ${po.items.length}","Total Units: ${totalQty}","","GRAND TOTAL (GHS):","${po.totalAmount.toFixed(2)}"`);

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${po.id}-${po.status.toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPurchaseOrderDocument(po: PurchaseOrderData) {
  const totalQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsHtml = po.items
    .map(
      (item, idx) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${idx + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
        <strong>${item.name}</strong>
        ${item.sku ? `<div style="font-size:11px;color:#64748b;">SKU: ${item.sku}</div>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.sku || "-"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">GHS ${item.unitCost.toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">GHS ${item.total.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Purchase Order ${po.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #f8fafc; }
    .po-container { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .po-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #2563eb; }
    .po-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${po.status.toLowerCase() === "received" ? "#ecfdf5;color:#047857;" : "#fffbeb;color:#b45309;"} }
    .po-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 16px; border-radius: 8px; }
    .info-box h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    .po-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .po-table th { background: #f1f5f9; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-bottom: 1px solid #cbd5e1; }
    .totals-box { margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals-row.grand { font-size: 18px; font-weight: 700; border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 6px; color: #1e3a8a; }
    .po-footer { margin-top: 36px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    @media print { body { background: none; padding: 0; } .po-container { border: none; box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="po-container">
    <div class="po-header">
      <div>
        <h1 style="margin:0;font-size:24px;color:#1e3a8a;letter-spacing:-0.5px;">${po.storeName || "promoteIt Ventures"}</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${po.storeLocation && !po.storeLocation.toLowerCase().includes("accra central") ? po.storeLocation : "Adenta-Accountancy, Accra"} · Tel: ${po.storePhone || "0553898761"}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">Email: ${po.storeEmail || "orders@promoteit.ventures"}</p>
      </div>
      <div style="text-align:right;">
        <h2 style="margin:0;font-size:20px;color:#0f172a;">PURCHASE ORDER</h2>
        <div style="font-size:14px;font-weight:700;color:#2563eb;margin-top:4px;">${po.id}</div>
        <div style="font-size:12px;color:#64748b;margin:4px 0 8px;">Date: ${po.date}</div>
        <span class="po-badge">${po.status}</span>
      </div>
    </div>

    <div class="po-grid">
      <div class="info-box">
        <h3>Vendor / Supplier</h3>
        <strong style="font-size:15px;color:#0f172a;">${po.supplierName}</strong>
        ${po.supplierPhone ? `<div style="font-size:13px;color:#475569;margin-top:4px;">Tel: ${po.supplierPhone}</div>` : ""}
        ${po.supplierEmail ? `<div style="font-size:13px;color:#475569;">Email: ${po.supplierEmail}</div>` : ""}
      </div>
      <div class="info-box">
        <h3>Delivery Destination</h3>
        <strong style="font-size:15px;color:#0f172a;">${po.storeName || "promoteIt Ventures"}</strong>
        <div style="font-size:13px;color:#475569;margin-top:4px;">Branch: ${po.storeLocation && !po.storeLocation.toLowerCase().includes("accra central") ? po.storeLocation : "Adenta-Accountancy, Accra"}</div>
        <div style="font-size:13px;color:#475569;">Tel: ${po.storePhone || "0553898761"}</div>
      </div>
    </div>

    <table class="po-table">
      <thead>
        <tr>
          <th style="width:40px;text-align:center;">#</th>
          <th>Description</th>
          <th style="width:100px;text-align:center;">SKU</th>
          <th style="width:70px;text-align:center;">Qty</th>
          <th style="width:120px;text-align:right;">Unit Cost</th>
          <th style="width:130px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="totals-row">
        <span>Total Unique Products:</span>
        <strong>${po.items.length}</strong>
      </div>
      <div class="totals-row">
        <span>Total Quantity Units:</span>
        <strong>${totalQty}</strong>
      </div>
      <div class="totals-row grand">
        <span>ORDER TOTAL DUE:</span>
        <span>GHS ${po.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <div class="po-footer">
      <div>
        <p style="margin:0 0 4px;"><strong>Authorized Signature:</strong> _______________________</p>
        <p style="margin:0;">Prepared by: Store Operations</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 4px;">Official Procurement Voucher</p>
        <p style="margin:0;">promoteIt Ventures Management</p>
      </div>
    </div>
  </div>
  <script>
    if (window.location.search.includes('print=true')) {
      window.print();
    }
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${po.id}-${po.status.toLowerCase()}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

const emptySubscribe = () => () => {};

export function PurchaseOrderModal({
  po,
  onClose,
  autoPrint = false,
}: {
  po: PurchaseOrderData;
  onClose: () => void;
  autoPrint?: boolean;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");

  const handlePrint = useCallback(() => {
    const formatClass = printFormat === "thermal" ? "printing-po-thermal" : "printing-po-a4";
    document.documentElement.classList.add("printing-po", formatClass);
    document.body.classList.add("printing-po", formatClass);
    window.print();
    setTimeout(() => {
      document.documentElement.classList.remove("printing-po", "printing-po-thermal", "printing-po-a4");
      document.body.classList.remove("printing-po", "printing-po-thermal", "printing-po-a4");
    }, 1500);
  }, [printFormat]);

  useEffect(() => {
    function handleBeforePrint() {
      const formatClass = printFormat === "thermal" ? "printing-po-thermal" : "printing-po-a4";
      document.documentElement.classList.add("printing-po", formatClass);
      document.body.classList.add("printing-po", formatClass);
    }
    function handleAfterPrint() {
      document.documentElement.classList.remove("printing-po", "printing-po-thermal", "printing-po-a4");
      document.body.classList.remove("printing-po", "printing-po-thermal", "printing-po-a4");
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.documentElement.classList.remove("printing-po", "printing-po-thermal", "printing-po-a4");
      document.body.classList.remove("printing-po", "printing-po-thermal", "printing-po-a4");
    };
  }, [printFormat]);

  useEffect(() => {
    if (autoPrint && mounted) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, mounted, handlePrint]);

  const totalQty = po.items.reduce((sum, item) => sum + item.quantity, 0);

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop po-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scoped print styling for dynamic A4 vs Thermal page geometry */}
      <style>{`
        @media print {
          @page {
            size: ${printFormat === "thermal" ? "80mm auto" : "A4 portrait"} !important;
            margin: ${printFormat === "thermal" ? "0mm" : "10mm 12mm"} !important;
          }
        }
      `}</style>

      <div
        className="po-dialog"
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: printFormat === "thermal" ? "420px" : "860px",
          transition: "max-width 0.2s ease",
        }}
      >
        {/* Controls Action Header (Hidden in Print) */}
        <div className="po-controls-bar no-print">
          <div className="po-controls-left">
            <span
              className={`status-badge status-${
                po.status.toLowerCase() === "received"
                  ? "green"
                  : po.status.toLowerCase() === "cancelled"
                  ? "red"
                  : "orange"
              }`}
            >
              {po.status}
            </span>
            <strong>{po.id}</strong>

            {/* Print Format Toggle: A4 vs 80mm POS Slip */}
            <div className="paper-toggle-group" style={{ marginLeft: "6px" }}>
              <button
                type="button"
                className={`paper-toggle-btn ${printFormat === "a4" ? "active" : ""}`}
                onClick={() => setPrintFormat("a4")}
                title="Full A4/Letter Procurement Document"
              >
                A4 Document
              </button>
              <button
                type="button"
                className={`paper-toggle-btn ${printFormat === "thermal" ? "active" : ""}`}
                onClick={() => setPrintFormat("thermal")}
                title="80mm Thermal Receiving Slip"
              >
                80mm Thermal Slip
              </button>
            </div>
          </div>

          <div className="po-controls-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => exportPurchaseOrderCSV(po)}
              title="Export as CSV spreadsheet"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => downloadPurchaseOrderDocument(po)}
              title="Download formatted PO document"
            >
              <FileText size={14} /> Download Document
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handlePrint}
              autoFocus={autoPrint}
              title={printFormat === "a4" ? "Print A4 Purchase Order Document" : "Print 80mm Thermal Purchase Order Slip"}
            >
              <Printer size={14} /> Print {printFormat === "a4" ? "PO (A4)" : "Slip (80mm)"}
            </button>
            <button
              type="button"
              className="icon-button modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Purchase Order Voucher */}
        <div className="po-paper-wrap">
          {printFormat === "a4" ? (
            /* ========================================================
               A4 Executive Procurement Document Layout
               ======================================================== */
            <article className="po-paper" id="printable-po">
              {/* Store & Document Header */}
              <div className="po-doc-header">
                <div className="po-brand-block">
                  <div className="po-logo-frame">
                    <Image
                      src="/img/PromoteItLogo2.png"
                      alt="promoteIt Ventures"
                      width={100}
                      height={36}
                      className="po-logo-img"
                      priority
                    />
                  </div>
                  <div>
                    <h2 className="po-store-title">{po.storeName || "promoteIt Ventures"}</h2>
                    <p className="po-store-meta">
                      {po.storeLocation && !po.storeLocation.toLowerCase().includes("accra central")
                        ? po.storeLocation
                        : "Adenta-Accountancy, Accra"}{" "}
                      · Tel: {po.storePhone || "0553898761"}
                    </p>
                    <p className="po-store-meta">Email: {po.storeEmail || "orders@promoteit.ventures"}</p>
                  </div>
                </div>

                <div className="po-doc-meta-block">
                  <h1 className="po-doc-type">PURCHASE ORDER</h1>
                  <div className="po-number">{po.id}</div>
                  <div className="po-date-line">Date: {po.date}</div>
                  <span className={`po-status-badge po-status-${po.status.toLowerCase()}`}>
                    {po.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="po-divider" />

              {/* 2-Column Vendor & Delivery Information Cards */}
              <div className="po-info-grid">
                <div className="po-info-card">
                  <span className="po-info-heading">Vendor / Supplier</span>
                  <strong className="po-info-name">{po.supplierName}</strong>
                  {po.supplierPhone && (
                    <span className="po-info-detail">Tel: {po.supplierPhone}</span>
                  )}
                  {po.supplierEmail && (
                    <span className="po-info-detail">Email: {po.supplierEmail}</span>
                  )}
                </div>

                <div className="po-info-card">
                  <span className="po-info-heading">Delivery Destination</span>
                  <strong className="po-info-name">{po.storeName || "promoteIt Ventures Store"}</strong>
                  <span className="po-info-detail">
                    Branch:{" "}
                    {po.storeLocation && !po.storeLocation.toLowerCase().includes("accra central")
                      ? po.storeLocation
                      : "Adenta-Accountancy, Accra"}
                  </span>
                  <span className="po-info-detail">
                    Receiving Dept: Store Operations & Inventory (Tel: {po.storePhone || "0553898761"})
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="po-items-section">
                <table className="po-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "36px", textAlign: "center" }}>#</th>
                      <th>Product Description</th>
                      <th style={{ width: "110px", textAlign: "center" }}>SKU</th>
                      <th style={{ width: "70px", textAlign: "center" }}>Qty</th>
                      <th style={{ width: "120px", textAlign: "right" }}>Unit Cost</th>
                      <th style={{ width: "130px", textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, idx) => (
                      <tr key={`${item.name}-${idx}`}>
                        <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>{item.sku || "-"}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>GHS {item.unitCost.toFixed(2)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          GHS {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Box */}
              <div className="po-totals-box">
                <div className="po-totals-row">
                  <span>Unique Line Items:</span>
                  <strong>{po.items.length}</strong>
                </div>
                <div className="po-totals-row">
                  <span>Total Quantity Units:</span>
                  <strong>{totalQty}</strong>
                </div>
                <div className="po-totals-row po-grand-total">
                  <strong>GRAND TOTAL DUE</strong>
                  <strong>GHS {po.totalAmount.toFixed(2)}</strong>
                </div>
              </div>

              <div className="po-divider-dashed" />

              {/* Footer Terms & Signatures */}
              <div className="po-footer-section">
                <div className="po-signature-block">
                  <div className="po-signature-line" />
                  <span>Authorized Procurement Signature & Date</span>
                </div>
                <div className="po-signature-block">
                  <div className="po-signature-line" />
                  <span>Vendor Acceptance / Received Confirmation & Date</span>
                </div>
              </div>

              <div className="po-footer-notes">
                <p>promoteIt Ventures · Official Purchase Authorization Voucher · Adenta-Accountancy, Accra</p>
              </div>
            </article>
          ) : (
            /* ========================================================
               80mm POS Thermal Receiving Slip Layout
               ======================================================== */
            <article
              className="receipt-paper paper-80mm"
              id="printable-po"
              data-paper-width="80mm"
            >
              <div className="receipt-header">
                <div className="receipt-brand-logo">
                  <Image
                    src="/img/PromoteItLogo2.png"
                    alt="promoteIt Ventures"
                    width={140}
                    height={46}
                    className="receipt-logo-img"
                    priority
                  />
                </div>
                <h1 className="receipt-store-title">
                  {po.storeName ? po.storeName.toUpperCase() : "PROMOTEIT VENTURES"}
                </h1>
                <div className="receipt-store-location">
                  {po.storeLocation && !po.storeLocation.toLowerCase().includes("accra central")
                    ? po.storeLocation
                    : "Adenta-Accountancy, Accra"}
                </div>
                <div className="receipt-store-contact">
                  Tel: {po.storePhone || "0553898761"}
                </div>
              </div>

              <hr className="receipt-divider-solid" />

              {/* Document Meta */}
              <div className="receipt-meta-grid">
                <div>
                  <span className="meta-label">DOC TYPE:</span>
                  <strong className="meta-value">PURCHASE ORDER</strong>
                </div>
                <div>
                  <span className="meta-label">PO NUMBER:</span>
                  <strong className="meta-value">{po.id}</strong>
                </div>
                <div>
                  <span className="meta-label">DATE:</span>
                  <strong className="meta-value">{po.date}</strong>
                </div>
                <div>
                  <span className="meta-label">SUPPLIER:</span>
                  <strong className="meta-value">{po.supplierName}</strong>
                </div>
                {po.supplierPhone && (
                  <div>
                    <span className="meta-label">SUPPLIER TEL:</span>
                    <strong className="meta-value">{po.supplierPhone}</strong>
                  </div>
                )}
                <div>
                  <span className="meta-label">STATUS:</span>
                  <strong className="meta-value">{po.status.toUpperCase()}</strong>
                </div>
              </div>

              <hr className="receipt-divider-solid" />

              {/* Items Table for 80mm */}
              <div className="receipt-items-container">
                <table className="receipt-items-table table-80mm">
                  <colgroup>
                    <col style={{ width: "46%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>ITEM</th>
                      <th style={{ textAlign: "center" }}>QTY</th>
                      <th style={{ textAlign: "right", paddingRight: "4px" }}>COST</th>
                      <th style={{ textAlign: "right" }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item, idx) => (
                      <tr className="receipt-item-row" key={`${item.name}-${idx}`}>
                        <td className="receipt-col-desc">
                          <strong className="receipt-item-name" title={item.name}>
                            {item.name}
                          </strong>
                        </td>
                        <td className="receipt-col-qty">
                          <strong>{item.quantity}</strong>
                        </td>
                        <td className="receipt-col-price">
                          <strong>{item.unitCost.toFixed(2)}</strong>
                        </td>
                        <td className="receipt-col-total">
                          <strong>{item.total.toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <hr className="receipt-divider-solid" />

              {/* Totals Section */}
              <div className="receipt-totals-section">
                <div className="receipt-totals-row">
                  <strong className="totals-label">Total Unique Items:</strong>
                  <strong className="totals-value">{po.items.length}</strong>
                </div>
                <div className="receipt-totals-row">
                  <strong className="totals-label">Total Units:</strong>
                  <strong className="totals-value">{totalQty}</strong>
                </div>
                <div className="receipt-totals-row grand-total">
                  <strong className="totals-label">TOTAL DUE:</strong>
                  <strong className="totals-value">GHS {po.totalAmount.toFixed(2)}</strong>
                </div>
              </div>

              <hr className="receipt-divider-solid" />

              {/* Signature Line */}
              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <div style={{ borderBottom: "1.5px solid #000000", margin: "16px 12px 6px" }} />
                <span style={{ fontSize: "9pt", fontWeight: 800 }}>Receiving Attendant Signature</span>
              </div>

              <div className="receipt-footer-notes" style={{ marginTop: "10px" }}>
                <p>Purchase Order Receiving Voucher</p>
                <div className="receipt-system-tag">
                  Powered by Clutel
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
