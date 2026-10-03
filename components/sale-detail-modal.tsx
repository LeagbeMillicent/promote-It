"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Package,
  Printer,
  ShoppingBag,
  User,
  X,
  XCircle,
} from "lucide-react";

export type SaleItemDetail = {
  id?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type SaleDetailData = {
  id: string; // e.g. PT-40994277
  saleId?: string;
  amount?: number;
  total?: number;
  subtotal?: number;
  discount?: number;
  createdAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  customerName?: string;
  cashierName?: string;
  locationName?: string;
  status?: string;
  tone?: string;
  items?: SaleItemDetail[];
  totalQuantity?: number;
  values?: string[];
};

export function SaleDetailModal({
  sale,
  onClose,
  onPrintReceipt,
  onToggleStatus,
}: {
  sale: SaleDetailData;
  onClose: () => void;
  onPrintReceipt?: (sale: SaleDetailData) => void;
  onToggleStatus?: (sale: SaleDetailData) => void;
}) {
  const needsFetch = !sale.items || sale.items.length === 0;
  const [fetchedDetails, setFetchedDetails] = useState<SaleDetailData | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // If sale doesn't have items array or items is empty, fetch details from /api/sales/[id]
  useEffect(() => {
    if (!needsFetch) return;
    let active = true;
    const identifier = sale.saleId || sale.id;

    fetch(`/api/sales/${identifier}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.sale) {
          const fetchedItems: SaleItemDetail[] = (data.sale.items || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (it: any) => ({
              id: it.id,
              name: it.productVariant?.product?.name || "Product item",
              sku: it.productVariant?.sku || "",
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              total: Number(it.total),
            })
          );
          const totalQty = fetchedItems.reduce((sum, it) => sum + it.quantity, 0);
          setFetchedDetails({
            ...sale,
            items: fetchedItems,
            totalQuantity: totalQty,
            subtotal: Number(data.sale.subtotal ?? sale.subtotal),
            total: Number(data.sale.total ?? sale.amount),
            discount: Number(data.sale.discount ?? sale.discount),
            customerName: data.sale.customer
              ? `${data.sale.customer.name}${data.sale.customer.phone ? ` (${data.sale.customer.phone})` : ""}`
              : sale.customerName,
            cashierName: data.sale.cashier?.name || sale.cashierName,
            locationName: data.sale.location?.name || sale.locationName,
          });
        }
      })
      .catch(() => {
        if (active) setFetchError(true);
      });

    return () => {
      active = false;
    };
  }, [needsFetch, sale]);

  const loading = needsFetch && !fetchedDetails && !fetchError;
  const details = fetchedDetails || sale;

  const items = details.items || [];
  const totalQty = details.totalQuantity ?? items.reduce((acc, it) => acc + it.quantity, 0);
  const isPaid = (details.status ?? "Paid").toLowerCase() === "paid";

  const totalAmount =
    typeof details.amount === "number"
      ? details.amount
      : details.values?.[1]
      ? Number(details.values[1].replace("GHS ", "").replace(/,/g, ""))
      : items.reduce((acc, it) => acc + it.total, 0);

  const formattedDate = details.createdAt
    ? new Date(details.createdAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : details.values?.[2] || "Today";

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sale-detail-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="sale-detail-header">
          <div className="sale-detail-header-info">
            <div className="sale-detail-icon-wrap">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="sale-detail-title-row">
                <h2>Sale {details.id}</h2>
                <span className={`status-badge status-${isPaid ? "green" : "red"}`}>
                  {isPaid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {isPaid ? "Paid" : "Not Paid"}
                </span>
              </div>
              <div className="sale-detail-date-row">
                <Calendar size={13} />
                <span>{formattedDate}</span>
                {details.locationName && (
                  <>
                    <span className="dot-sep">·</span>
                    <span>{details.locationName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="icon-button modal-close"
            onClick={onClose}
            aria-label="Close sale details"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="sale-detail-body">
          {/* Quick Metrics Cards */}
          <div className="sale-detail-cards-grid">
            <div className="sale-detail-card">
              <span className="sale-detail-card-label">
                <CircleDollarSign size={15} /> Total Amount
              </span>
              <strong className="sale-detail-card-value text-success">
                GHS {totalAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </strong>
              <span className="sale-detail-card-sub">
                Via {details.paymentMethod || details.values?.[0] || "Cash"}
                {details.paymentReference ? ` (Ref: ${details.paymentReference})` : ""}
              </span>
            </div>

            <div className="sale-detail-card">
              <span className="sale-detail-card-label">
                <Package size={15} /> Items Bought
              </span>
              <strong className="sale-detail-card-value text-primary">
                {totalQty} {totalQty === 1 ? "unit" : "units"}
              </strong>
              <span className="sale-detail-card-sub">
                {items.length} unique {items.length === 1 ? "product" : "products"}
              </span>
            </div>

            <div className="sale-detail-card">
              <span className="sale-detail-card-label">
                <User size={15} /> Customer & Staff
              </span>
              <strong className="sale-detail-card-value text-default">
                {details.customerName || "Walk-in Customer"}
              </strong>
              <span className="sale-detail-card-sub">
                Served by: {details.cashierName || "Attendant"}
              </span>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="sale-detail-section">
            <div className="sale-detail-section-head">
              <h3>Items Purchased & Quantities</h3>
              <span className="sale-item-counter-badge">
                {items.length} {items.length === 1 ? "Item" : "Items"} · {totalQty} Total Units
              </span>
            </div>

            {loading ? (
              <div className="sale-detail-loading">Loading items purchased...</div>
            ) : items.length > 0 ? (
              <div className="sale-detail-items-table-wrap">
                <table className="sale-detail-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "45%" }}>Product Description</th>
                      <th style={{ width: "18%", textAlign: "center" }}>Quantity</th>
                      <th style={{ width: "18%", textAlign: "right" }}>Unit Price</th>
                      <th style={{ width: "19%", textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`${it.name}-${idx}`}>
                        <td>
                          <div className="sale-item-name-cell">
                            <strong className="sale-item-name">{it.name}</strong>
                            {it.sku && <span className="sale-item-sku">SKU: {it.sku}</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="sale-item-qty-badge">
                            × {it.quantity} {it.quantity === 1 ? "unit" : "units"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }} className="sale-item-money">
                          GHS {it.unitPrice.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right" }} className="sale-item-total-cell">
                          <strong>
                            GHS {it.total.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="sale-detail-no-items">
                <p>Sale transaction recorded with amount GHS {totalAmount.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Payment & Summary Box */}
          <div className="sale-detail-totals-box">
            <div className="sale-detail-totals-row">
              <span>Subtotal:</span>
              <span>
                GHS{" "}
                {Number(details.subtotal ?? totalAmount).toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {Boolean(details.discount && details.discount > 0) && (
              <div className="sale-detail-totals-row text-danger">
                <span>Discount:</span>
                <span>-GHS {Number(details.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="sale-detail-totals-row grand-total-row">
              <strong>Total Paid:</strong>
              <strong className="grand-total-val">
                GHS {totalAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sale-detail-footer">
          <div className="sale-detail-footer-meta">
            <span>Transaction Reference: <strong>{details.id}</strong></span>
          </div>
          <div className="sale-detail-footer-buttons">
            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
            {onToggleStatus && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onToggleStatus(details)}
              >
                {isPaid ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                {isPaid ? "Mark as Not Paid" : "Mark as Paid"}
              </button>
            )}
            {onPrintReceipt && (
              <button
                type="button"
                className="primary-button"
                onClick={() => onPrintReceipt(details)}
              >
                <Printer size={15} /> Print Receipt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
