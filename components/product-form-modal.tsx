"use client";

import { FormEvent, useEffect, useState } from "react";
import { Package, X } from "lucide-react";

type Option = { id: string; name: string };
type ProductRow = { id: string; variantId?: string; values: string[]; status?: string; tone?: string };

export function ProductFormModal({
  onClose,
  onSaved,
  editRow,
}: {
  onClose: () => void;
  onSaved: () => void;
  editRow?: ProductRow | null;
}) {
  const [catalog, setCatalog] = useState<{ categories: Option[]; brands: Option[] }>({
    categories: [],
    brands: [],
  });

  const [form, setForm] = useState(() => ({
    name: editRow?.values[0] || "",
    categoryId: "",
    brandId: "",
    sku: editRow?.values[3] || "",
    costPrice: "",
    sellingPrice: editRow?.values[4]
      ? editRow.values[4].replace("GHS ", "").replace(/,/g, "")
      : "",
    stock: editRow?.values[5] ? editRow.values[5].replace(" units", "") : "0",
    reorderLevel: "5",
  }));

  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setCatalog(data);
          if (!editRow) {
            setForm((current) => ({
              ...current,
              categoryId: current.categoryId || data.categories?.[0]?.id || "",
              brandId: current.brandId || data.brands?.[0]?.id || "",
            }));
          }
        }
      })
      .catch(() => undefined);
  }, [editRow]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Category could not be created");
      return;
    }
    setCatalog((current) => ({
      ...current,
      categories: [...current.categories, { id: data.id, name: data.name }],
    }));
    setForm((current) => ({ ...current, categoryId: data.id }));
    setNewCategory("");
  }

  async function addBrand() {
    const trimmed = newBrand.trim();
    if (!trimmed) return;
    const response = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Brand could not be created");
      return;
    }
    setCatalog((current) => ({
      ...current,
      brands: [...current.brands, { id: data.id, name: data.name }],
    }));
    setForm((current) => ({ ...current, brandId: data.id }));
    setNewBrand("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const method = editRow ? "PATCH" : "POST";
    const url = editRow ? `/api/products/${editRow.variantId || editRow.id}` : "/api/products";
    const body: Record<string, unknown> = {
      ...form,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      stock: Number(form.stock) || 0,
      reorderLevel: Number(form.reorderLevel) || 5,
    };
    if (editRow) body.id = editRow.variantId || editRow.id;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Product could not be saved");
      setSaving(false);
      return;
    }
    onSaved();
    onClose();
  }

  async function deleteProduct() {
    if (!editRow) return;
    if (!confirm(`Delete ${editRow.values[0] || "this product"}?`)) return;
    await fetch(`/api/products/${editRow.variantId || editRow.id}`, { method: "DELETE" });
    onSaved();
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-icon">
            <Package size={18} />
          </div>
          <div>
            <h2>{editRow ? "Edit product" : "Add product"}</h2>
            <p>Product SKU and IDs are managed systematically.</p>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-fields">
            <label style={{ gridColumn: "span 2" }}>
              Product name
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="e.g. Premium Wireless Earbuds"
                required
              />
            </label>
            <label>
              SKU
              <input
                value={form.sku}
                onChange={(event) => update("sku", event.target.value)}
                placeholder="Auto-generated if empty"
              />
            </label>
            <label>
              Reorder level
              <input
                type="number"
                min="0"
                step="1"
                value={form.reorderLevel}
                onChange={(event) => update("reorderLevel", event.target.value)}
              />
            </label>
            <label style={{ gridColumn: "span 2" }}>
              Category
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={form.categoryId}
                  onChange={(event) => update("categoryId", event.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select category</option>
                  {catalog.categories.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="New category"
                  style={{ width: "140px" }}
                />
              </div>
              {newCategory.trim() && (
                <button
                  type="button"
                  className="text-button"
                  onClick={addCategory}
                  style={{ marginTop: "4px" }}
                >
                  + Add &quot;{newCategory}&quot; as new category
                </button>
              )}
            </label>
            <label style={{ gridColumn: "span 2" }}>
              Brand
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={form.brandId}
                  onChange={(event) => update("brandId", event.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Unbranded / Generic</option>
                  {catalog.brands.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <input
                  value={newBrand}
                  onChange={(event) => setNewBrand(event.target.value)}
                  placeholder="New brand"
                  style={{ width: "140px" }}
                />
              </div>
              {newBrand.trim() && (
                <button
                  type="button"
                  className="text-button"
                  onClick={addBrand}
                  style={{ marginTop: "4px" }}
                >
                  + Add &quot;{newBrand}&quot; as new brand
                </button>
              )}
            </label>
            <label>
              Cost price (GHS)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(event) => update("costPrice", event.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label>
              Selling price (GHS)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(event) => update("sellingPrice", event.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label style={{ gridColumn: "span 2" }}>
              Current stock count
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => update("stock", event.target.value)}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
          </div>
          <div className="modal-footer">
            {editRow && (
              <button type="button" className="danger-button" onClick={deleteProduct}>
                Delete
              </button>
            )}
            <span className="modal-footer-spacer" />
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}