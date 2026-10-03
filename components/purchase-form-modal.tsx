"use client";

import { FormEvent, useEffect, useState } from "react";
import { Download, Edit3, Plus, Printer, ShoppingBag, Trash2, X } from "lucide-react";
import { ProductFormModal } from "@/components/product-form-modal";
import {
  PurchaseOrderData,
  PurchaseOrderModal,
  downloadPurchaseOrderDocument,
  exportPurchaseOrderCSV,
} from "@/components/purchase-order-modal";

type Option = {
  id: string;
  name: string;
  sku?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  phone?: string;
  email?: string;
};

type ItemDetail = {
  id?: string;
  productVariantId: string;
  name?: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  total?: number;
};

export type PurchaseRow = {
  id: string;
  purchaseId?: string;
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  totalAmount?: number;
  createdAt?: string;
  items?: ItemDetail[];
  values: string[];
  status?: string;
  tone?: string;
};

type FormLineItem = {
  key: string;
  productVariantId: string;
  quantity: string;
  unitCost: string;
};

export function PurchaseFormModal({
  onClose,
  onSaved,
  editRow,
}: {
  onClose: () => void;
  onSaved: () => void;
  editRow?: PurchaseRow | null;
}) {
  const [catalog, setCatalog] = useState<{ categories: Option[]; locations: Option[] }>({
    categories: [],
    locations: [],
  });
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [supplierId, setSupplierId] = useState(editRow?.supplierId || "");
  const [status, setStatus] = useState(() =>
    editRow?.status === "Received"
      ? "RECEIVED"
      : editRow?.status === "Cancelled"
      ? "CANCELLED"
      : "DRAFT"
  );
  const [lineItems, setLineItems] = useState<FormLineItem[]>(() => {
    if (editRow?.items && editRow.items.length > 0) {
      return editRow.items.map((item, idx) => ({
        key: `item-init-${idx}`,
        productVariantId: item.productVariantId,
        quantity: String(item.quantity || 1),
        unitCost: String(item.unitCost || 0),
      }));
    }
    return [{ key: `item-${Date.now()}-0`, productVariantId: "", quantity: "1", unitCost: "" }];
  });

  const [newProductName, setNewProductName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [productEditRow, setProductEditRow] = useState<{
    id: string;
    variantId?: string;
    values: string[];
    status?: string;
    tone?: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((response) => (response.ok ? response.json() : [])),
      fetch("/api/catalog").then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([supplierData, catalogData]) => {
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
        if (catalogData) {
          setCatalog({
            categories: catalogData.categories ?? [],
            locations: catalogData.locations ?? [],
          });
          const prods = catalogData.products ?? [];
          setProducts(prods);

          // If editing and no items in editRow, try fetching detail
          if (editRow && (!editRow.items || editRow.items.length === 0)) {
            fetch(`/api/purchases/${editRow.purchaseId || editRow.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data) {
                  if (data.supplierId) setSupplierId(data.supplierId);
                  if (data.items && data.items.length > 0) {
                    setLineItems(
                      data.items.map((it: { productVariantId: string; quantity: number; unitCost: number }, idx: number) => ({
                        key: `item-loaded-${idx}`,
                        productVariantId: it.productVariantId,
                        quantity: String(it.quantity || 1),
                        unitCost: String(it.unitCost || 0),
                      }))
                    );
                  }
                }
              })
              .catch(() => undefined);
          }
        }
      })
      .catch(() => undefined);
  }, [editRow]);

  function updateItem(index: number, patch: Partial<FormLineItem>) {
    setLineItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const updated = { ...current, ...patch };

      // If productVariantId changed, auto-fill unitCost if blank
      if (patch.productVariantId && patch.productVariantId !== current.productVariantId) {
        const product = products.find((p) => p.id === patch.productVariantId);
        if (product && (!updated.unitCost || Number(updated.unitCost) === 0)) {
          updated.unitCost = product.costPrice ? String(product.costPrice) : "";
        }
      }

      next[index] = updated;
      return next;
    });
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        key: `item-${Date.now()}-${prev.length}`,
        productVariantId: "",
        quantity: "1",
        unitCost: "",
      },
    ]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) {
      setLineItems([{ key: `item-${Date.now()}-reset`, productVariantId: "", quantity: "1", unitCost: "" }]);
      return;
    }
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function addNewProduct() {
    const trimmed = newProductName.trim();
    if (!trimmed) return;
    setAddingProduct(true);
    const body: Record<string, unknown> = {
      name: trimmed,
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      reorderLevel: 5,
      categoryId: catalog.categories[0]?.id,
      locationId: catalog.locations[0]?.id,
    };
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Product could not be created");
      setAddingProduct(false);
      return;
    }
    const variantId = data.variants?.[0]?.id || data.id;
    const newProd = {
      id: variantId,
      name: trimmed,
      sku: data.variants?.[0]?.sku,
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
    };
    setProducts((current) => [...current, newProd]);

    // Insert into first empty line item or append
    const emptyIndex = lineItems.findIndex((it) => !it.productVariantId);
    if (emptyIndex !== -1) {
      updateItem(emptyIndex, { productVariantId: variantId, unitCost: "0" });
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          key: `item-${Date.now()}-new`,
          productVariantId: variantId,
          quantity: "1",
          unitCost: "0",
        },
      ]);
    }
    setNewProductName("");
    setAddingProduct(false);
  }

  function openProductEditor(product: Option) {
    setProductEditRow({
      id: product.id,
      variantId: product.id,
      values: [product.name, "", "", product.sku || "", "", ""],
      status: "In stock",
      tone: "green",
    });
    setProductModalOpen(true);
  }

  function refreshProducts() {
    fetch("/api/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setProducts(data.products ?? []);
      })
      .catch(() => undefined);
  }

  // Calculate order totals
  const validItems = lineItems.filter((item) => item.productVariantId);
  const totalUnits = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const grandTotal = lineItems.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const c = Number(item.unitCost) || 0;
    return sum + q * c;
  }, 0);

  function getPOData(): PurchaseOrderData {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return {
      id: editRow?.id || `PUR-${Date.now().toString().slice(-8)}`,
      purchaseId: editRow?.purchaseId,
      supplierName: supplier?.name || "Unassigned Supplier",
      supplierPhone: supplier?.phone,
      supplierEmail: supplier?.email,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      status: status === "RECEIVED" ? "Received" : status === "CANCELLED" ? "Cancelled" : "Draft",
      items: lineItems
        .filter((it) => it.productVariantId)
        .map((it) => {
          const product = products.find((p) => p.id === it.productVariantId);
          const q = Number(it.quantity) || 1;
          const c = Number(it.unitCost) || 0;
          return {
            name: product?.name || "Item",
            sku: product?.sku,
            quantity: q,
            unitCost: c,
            total: q * c,
          };
        }),
      totalAmount: grandTotal,
    };
  }

  function handleDownload() {
    if (!supplierId) {
      setError("Please select a supplier before downloading the purchase order.");
      return;
    }
    if (validItems.length === 0) {
      setError("Please add at least one product before downloading.");
      return;
    }
    setError("");
    downloadPurchaseOrderDocument(getPOData());
  }

  function handlePrint() {
    if (!supplierId) {
      setError("Please select a supplier before printing.");
      return;
    }
    if (validItems.length === 0) {
      setError("Please add at least one product before printing.");
      return;
    }
    setError("");
    setPrintModalOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }

    const itemsToSave = lineItems
      .filter((it) => it.productVariantId)
      .map((it) => ({
        productVariantId: it.productVariantId,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitCost: Math.max(0, Number(it.unitCost) || 0),
      }));

    if (itemsToSave.length === 0) {
      setError("Please add at least one product to the purchase order.");
      return;
    }

    setSaving(true);
    const method = editRow ? "PATCH" : "POST";
    const url = editRow ? `/api/purchases/${editRow.purchaseId || editRow.id}` : "/api/purchases";
    const body: Record<string, unknown> = {
      supplierId,
      status,
      items: itemsToSave,
    };

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Purchase could not be saved");
      setSaving(false);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <>
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          className="modal-card"
          role="dialog"
          aria-modal="true"
          style={{ maxWidth: "780px", width: "100%", maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}
        >
          <div className="modal-header">
            <div className="modal-icon">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2>{editRow ? `Edit purchase order (${editRow.id})` : "New purchase order"}</h2>
              <p>Add multiple products, track supplier cost basis, print and export vouchers.</p>
            </div>
            <button className="icon-button modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, overflow: "hidden" }}>
            <div className="modal-fields" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              {/* Supplier Selection */}
              <label style={{ gridColumn: "span 2" }}>
                Supplier
                <select
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option value={supplier.id} key={supplier.id}>
                      {supplier.name} {supplier.phone ? `(${supplier.phone})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {/* Quick Create Product Row */}
              <label style={{ gridColumn: "span 2" }}>
                Quick create product
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(event) => setNewProductName(event.target.value)}
                    placeholder="Type product name to quickly create and add to order"
                  />
                  <button
                    type="button"
                    className="primary-button"
                    style={{ flex: "none", padding: "0 14px" }}
                    onClick={addNewProduct}
                    disabled={addingProduct || !newProductName.trim()}
                  >
                    <Plus size={14} /> {addingProduct ? "Adding..." : "Add"}
                  </button>
                </div>
              </label>

              {/* Multi-Product Line Items Container */}
              <div className="purchase-items-container">
                <div className="purchase-items-bar">
                  <strong>Order Products ({validItems.length})</strong>
                  <button
                    type="button"
                    className="add-line-btn"
                    onClick={addLineItem}
                  >
                    <Plus size={14} /> Add another product
                  </button>
                </div>

                <div className="purchase-item-labels">
                  <span>Product</span>
                  <span style={{ textAlign: "center" }}>Qty</span>
                  <span>Unit Cost</span>
                  <span style={{ textAlign: "right" }}>Total</span>
                  <span></span>
                </div>

                <div className="purchase-items-list" style={{ maxHeight: "280px", overflowY: "auto" }}>
                  {lineItems.map((item, index) => {
                    const rowQty = Number(item.quantity) || 0;
                    const rowCost = Number(item.unitCost) || 0;
                    const rowTotal = rowQty * rowCost;

                    return (
                      <div className="purchase-item-row" key={item.key}>
                        {/* Product Selector */}
                        <div style={{ display: "flex", gap: "4px", minWidth: 0 }}>
                          <select
                            value={item.productVariantId}
                            onChange={(e) => updateItem(index, { productVariantId: e.target.value })}
                            required
                            style={{ flex: 1, minWidth: 0, padding: "6px 8px", fontSize: "12.5px" }}
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.name} {p.sku ? `· ${p.sku}` : ""} ({p.stock ?? 0} in stock)
                              </option>
                            ))}
                          </select>
                          {item.productVariantId && (
                            <button
                              type="button"
                              className="icon-button"
                              style={{ padding: "4px", flexShrink: 0 }}
                              onClick={() => {
                                const prod = products.find((p) => p.id === item.productVariantId);
                                if (prod) openProductEditor(prod);
                              }}
                              title="Edit product catalog details"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Quantity */}
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: e.target.value })}
                          placeholder="1"
                          required
                          style={{ padding: "6px 8px", textAlign: "center", fontSize: "12.5px" }}
                        />

                        {/* Unit Cost */}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => updateItem(index, { unitCost: e.target.value })}
                          placeholder="0.00"
                          required
                          style={{ padding: "6px 8px", fontSize: "12.5px" }}
                        />

                        {/* Line Total */}
                        <div className="item-total">
                          GHS {rowTotal.toFixed(2)}
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          className="icon-button action-delete"
                          style={{ padding: "4px" }}
                          onClick={() => removeLineItem(index)}
                          title="Remove product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Selector */}
              <label style={{ gridColumn: "span 2" }}>
                Order Status
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="DRAFT">Draft (Order to buy / Pending delivery)</option>
                  <option value="RECEIVED">Received (Immediately stock into inventory)</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>

              {/* Order Totals Summary */}
              <div className="purchase-order-summary">
                <div>
                  <span>Total Products: <strong>{validItems.length}</strong></span> ·{" "}
                  <span>Total Units: <strong>{totalUnits}</strong></span>
                </div>
                <div>
                  <span>GRAND TOTAL: </span>
                  <strong>GHS {grandTotal.toFixed(2)}</strong>
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}
            </div>

            {/* Modal Footer with Print, Download & Submit */}
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleDownload}
                  title="Download PO Document"
                >
                  <Download size={15} /> Download PO
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handlePrint}
                  title="Print Purchase Order"
                >
                  <Printer size={15} /> Print PO
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="secondary-button" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : status === "RECEIVED"
                    ? "Receive into stock"
                    : "Save draft order"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>

      {/* Product Edit Modal */}
      {productModalOpen && (
        <ProductFormModal
          editRow={productEditRow}
          onClose={() => setProductModalOpen(false)}
          onSaved={() => {
            refreshProducts();
            setProductModalOpen(false);
          }}
        />
      )}

      {/* Print View Modal */}
      {printModalOpen && (
        <PurchaseOrderModal
          po={getPOData()}
          onClose={() => setPrintModalOpen(false)}
          autoPrint={true}
        />
      )}
    </>
  );
}
