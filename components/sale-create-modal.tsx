"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { ReceiptData, ReceiptModal } from "@/components/receipt-modal";

type ProductOption = { variantId: string; name: string; sellingPrice: number; stock: number };
type CustomerOption = { id: string; name: string; phone?: string };

type CartItemRow = {
  key: string;
  productVariantId: string;
  quantity: number;
};

type ApiProductItem = {
  id: string;
  variantId?: string;
  values?: string[];
  status?: string;
};

export function SaleCreateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (saleNumber: string) => void;
}) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [items, setItems] = useState<CartItemRow[]>([
    { key: "item-init-0", productVariantId: "", quantity: 1 },
  ]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [status, setStatus] = useState<"Paid" | "Not Paid">("Paid");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return;
        const mapped = data
          .map((variant: ApiProductItem) => {
            const values = variant.values || [];
            const priceStr = (values[4] || "").replace("GHS ", "").replace(/,/g, "");
            const stockStr = (values[5] || "").replace(" units", "");
            return {
              variantId: variant.variantId || variant.id,
              name: values[0] || variant.id,
              sellingPrice: Number(priceStr) || 0,
              stock: Number(stockStr) || 0,
            };
          })
          .filter((p: ProductOption) => p.stock > 0);
        setProducts(mapped);
      })
      .catch(() => setProducts([]));

    fetch("/api/customers")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomers(
            data.map((c) => ({
              id: c.customerId || c.id,
              name: c.name,
              phone: c.phone,
            }))
          );
        }
      })
      .catch(() => setCustomers([]));
  }, []);

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { key: `item-${prev.length}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, productVariantId: "", quantity: 1 },
    ]);
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) {
      setItems([{ key: `item-reset-${Date.now()}`, productVariantId: "", quantity: 1 }]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, updates: Partial<CartItemRow>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...updates };
        if (updates.productVariantId !== undefined) {
          const prod = products.find((p) => p.variantId === updates.productVariantId);
          if (prod && updated.quantity > prod.stock) {
            updated.quantity = Math.max(1, prod.stock);
          }
        }
        if (updates.quantity !== undefined) {
          const prod = products.find((p) => p.variantId === updated.productVariantId);
          const maxStock = prod?.stock ?? 999;
          const parsed = Number(updates.quantity) || 1;
          updated.quantity = Math.max(1, Math.min(parsed, maxStock));
        }
        return updated;
      })
    );
  }

  const validItems = items.filter((it) => it.productVariantId && it.quantity > 0);
  const totalUnits = validItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const grandTotal = validItems.reduce((sum, it) => {
    const prod = products.find((p) => p.variantId === it.productVariantId);
    return sum + (prod ? prod.sellingPrice * it.quantity : 0);
  }, 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (validItems.length === 0) {
      setError("Please select at least one product to record a sale");
      return;
    }

    // Check individual and aggregate stock
    const qtyByVariant = new Map<string, number>();
    for (const item of validItems) {
      const prod = products.find((p) => p.variantId === item.productVariantId);
      if (!prod) {
        setError("One or more selected products are invalid");
        return;
      }
      const current = qtyByVariant.get(item.productVariantId) || 0;
      qtyByVariant.set(item.productVariantId, current + item.quantity);
    }

    for (const [varId, totalQty] of qtyByVariant.entries()) {
      const prod = products.find((p) => p.variantId === varId);
      if (prod && totalQty > prod.stock) {
        setError(`Combined quantity for ${prod.name} exceeds available stock (${prod.stock} units)`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((it) => ({
            productVariantId: it.productVariantId,
            quantity: it.quantity,
          })),
          paymentMethod,
          status,
          reference: reference.trim() || undefined,
          customerId: customerId || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Sale could not be completed");
        setSubmitting(false);
        return;
      }

      if (result.receipt) {
        setCreatedReceipt(result.receipt);
        setSubmitting(false);
        return;
      }

      onSaved(result.saleNumber);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error recording sale");
      setSubmitting(false);
    }
  }

  if (createdReceipt) {
    return (
      <ReceiptModal
        receipt={createdReceipt}
        onClose={() => onSaved(createdReceipt.saleNumber)}
        autoPrint={true}
      />
    );
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-card sale-modal"
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: "740px",
          width: "100%",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="modal-header">
          <div className="modal-icon">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h2>Record new sale</h2>
            <p>Add products, adjust quantities, and confirm payment details.</p>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Close sale modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, overflow: "hidden" }}>
          <div className="sale-fields" style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "16px 20px" }}>
            
            {/* Multi-Item Sales Container */}
            <div className="sale-items-container">
              <div className="sale-items-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong>Sale Products ({validItems.length})</strong>
                  {totalUnits > 0 && (
                    <span className="badge" style={{ fontSize: "11px", padding: "2px 8px" }}>
                      {totalUnits} unit{totalUnits > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="add-line-btn"
                  onClick={addItemRow}
                >
                  <Plus size={14} /> Add another item
                </button>
              </div>

              <div className="sale-item-labels">
                <span>Product</span>
                <span style={{ textAlign: "center" }}>Qty</span>
                <span style={{ textAlign: "right", paddingRight: "6px" }}>Price</span>
                <span style={{ textAlign: "right" }}>Total</span>
                <span></span>
              </div>

              <div className="sale-items-list">
                {items.map((item, index) => {
                  const prod = products.find((p) => p.variantId === item.productVariantId);
                  const uPrice = prod?.sellingPrice ?? 0;
                  const rowTotal = uPrice * item.quantity;

                  return (
                    <div className="sale-item-row" key={item.key}>
                      {/* Product Selector */}
                      <select
                        value={item.productVariantId}
                        onChange={(e) => updateItem(index, { productVariantId: e.target.value })}
                        required
                        className="sale-product-select"
                      >
                        <option value="">Choose a product...</option>
                        {products.map((p) => (
                          <option value={p.variantId} key={p.variantId}>
                            {p.name} — GHS {p.sellingPrice.toFixed(2)} ({p.stock} in stock)
                          </option>
                        ))}
                      </select>

                      {/* Quantity Input */}
                      <input
                        type="number"
                        min="1"
                        max={prod?.stock ?? 999}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                        className="sale-qty-input"
                        required
                      />

                      {/* Unit Price */}
                      <div className="sale-unit-price">
                        {prod ? `GHS ${uPrice.toFixed(2)}` : "—"}
                      </div>

                      {/* Row Total */}
                      <div className="sale-row-total">
                        GHS {rowTotal.toFixed(2)}
                      </div>

                      {/* Delete Row Button */}
                      <button
                        type="button"
                        className="icon-button action-delete"
                        onClick={() => removeItemRow(index)}
                        title={items.length > 1 ? "Remove item" : "Clear row"}
                        style={{ padding: "4px" }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Order Summary */}
              <div className="sale-order-summary">
                <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                  <span>{validItems.length} product{validItems.length === 1 ? "" : "s"}</span> ·{" "}
                  <span>{totalUnits} total unit{totalUnits === 1 ? "" : "s"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink-secondary)" }}>TOTAL:</span>
                  <strong style={{ fontSize: "17px", fontWeight: 900, color: "var(--brand-primary)" }}>
                    GHS {grandTotal.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Payment & Customer Details Grid */}
            <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label>
                Payment status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as "Paid" | "Not Paid")}
                >
                  <option value="Paid">Paid (Completed)</option>
                  <option value="Not Paid">Not Paid (Pending)</option>
                </select>
              </label>

              <label>
                Customer (optional)
                <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                  <option value="">Walk-in / Anonymous customer</option>
                  {customers.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Payment reference / Note
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="MoMo transaction ID or receipt note"
                />
              </label>
            </div>

            {error && <p className="form-error" style={{ gridColumn: "span 2" }}>{error}</p>}
          </div>

          <div className="modal-footer">
            <span className="modal-footer-spacer" />
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting || validItems.length === 0}>
              <CreditCard size={16} /> {submitting ? "Processing..." : `Complete sale (GHS ${grandTotal.toFixed(2)})`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
