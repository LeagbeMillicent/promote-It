"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, FolderTree, Package, X } from "lucide-react";
import { ManagementPage, Row } from "@/components/management-page";
import { ProductFormModal } from "@/components/product-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

type ProductRow = {
  id: string;
  variantId?: string;
  productId?: string;
  categoryId?: string;
  brandId?: string;
  costPrice?: number | string;
  sellingPrice?: number | string;
  reorderLevel?: number | string;
  values: string[];
  status?: string;
  tone?: string;
};

type Category = {
  id: string;
  name: string;
  _count?: { products: number };
};

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadProducts() {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  function loadCategories() {
    fetch("/api/categories")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Compute live count of products per category from loaded rows
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.categoryId) {
        counts[row.categoryId] = (counts[row.categoryId] || 0) + 1;
      }
      if (row.values[1]) {
        counts[row.values[1].toLowerCase()] = (counts[row.values[1].toLowerCase()] || 0) + 1;
      }
    }
    return counts;
  }, [rows]);

  // Filter rows based on selected category
  const filteredByCategoryRows = useMemo(() => {
    if (!selectedCategory || selectedCategory === "ALL") return rows;
    return rows.filter((r) => {
      if (r.categoryId === selectedCategory) return true;
      if (r.values[1] && r.values[1].toLowerCase() === selectedCategory.toLowerCase()) return true;
      const matchedCat = categories.find((c) => c.id === selectedCategory);
      if (matchedCat && r.values[1]?.toLowerCase() === matchedCat.name.toLowerCase()) return true;
      return false;
    });
  }, [rows, selectedCategory, categories]);

  // Active category display name
  const activeCategoryObj = categories.find(
    (c) => c.id === selectedCategory || c.name.toLowerCase() === selectedCategory.toLowerCase()
  );
  const activeCategoryName =
    activeCategoryObj?.name || (selectedCategory !== "ALL" ? selectedCategory : "");

  function deleteProduct(row: Row) {
    setDeleteError(null);
    setDeleteTarget(row as ProductRow);
  }

  async function confirmDeleteProduct() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const variantId = deleteTarget.variantId || deleteTarget.id;
    try {
      const response = await fetch(`/api/products/${variantId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || "Product could not be deleted");
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      setDeleteTarget(null);
      loadProducts();
      loadCategories();
    } catch {
      setDeleteError("Network error while deleting product");
      setIsDeleting(false);
    }
  }

  async function handleDeactivateInstead() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const variantId = deleteTarget.variantId || deleteTarget.id;
    try {
      const response = await fetch(`/api/products/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      if (!response.ok) {
        const data = await response.json();
        setDeleteError(data.error || "Failed to deactivate product");
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      setDeleteTarget(null);
      loadProducts();
      loadCategories();
    } catch {
      setDeleteError("Network error while deactivating product");
      setIsDeleting(false);
    }
  }

  function editProduct(row: Row) {
    setEditRow(row as ProductRow);
    setOpen(true);
  }

  function openCreate() {
    setEditRow(null);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setEditRow(null);
  }

  function onSaved() {
    loadProducts();
    loadCategories();
  }

  return (
    <>
      <ManagementPage
        active="/products"
        title="Products Catalog"
        description="Manage your inventory items, pricing margins, variants, and stock thresholds."
        action="Add product"
        headerContent={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "20px",
              paddingBottom: "12px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Link
                href="/products"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--brand-primary)",
                  color: "#ffffff",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
                }}
              >
                <Package size={16} /> All Products
              </Link>
              <Link
                href="/categories"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--bg-surface)",
                  color: "var(--ink-secondary)",
                  textDecoration: "none",
                  border: "1px solid var(--border-subtle)",
                  transition: "all 0.15s ease",
                }}
              >
                <FolderTree size={16} /> Categories
              </Link>
              <Link
                href="/brands"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--bg-surface)",
                  color: "var(--ink-secondary)",
                  textDecoration: "none",
                  border: "1px solid var(--border-subtle)",
                  transition: "all 0.15s ease",
                }}
              >
                <Award size={16} /> Brands
              </Link>
            </div>
          </div>
        }
        extraFilterControls={
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div className="category-filter-select-wrap">
              <FolderTree size={15} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter products by category"
              >
                <option value="ALL">All Categories ({rows.length})</option>
                {categories.map((cat) => {
                  const count =
                    categoryCounts[cat.id] ??
                    categoryCounts[cat.name.toLowerCase()] ??
                    cat._count?.products ??
                    0;
                  return (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedCategory !== "ALL" && (
              <div className="active-filter-badge">
                <span>Category: {activeCategoryName}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  title="Clear category filter"
                  aria-label="Clear category filter"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        }
        toolbarBelow={
          categories.length > 0 ? (
            <div className="category-filter-bar">
              <span className="category-filter-bar-label">
                <FolderTree size={13} /> Categories
              </span>
              <button
                type="button"
                className={`category-pill ${selectedCategory === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedCategory("ALL")}
              >
                <span>All Categories</span>
                <span className="category-pill-count">{rows.length}</span>
              </button>
              {categories.map((cat) => {
                const count =
                  categoryCounts[cat.id] ??
                  categoryCounts[cat.name.toLowerCase()] ??
                  cat._count?.products ??
                  0;
                const isActive =
                  selectedCategory === cat.id ||
                  selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-pill ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span>{cat.name}</span>
                    <span className="category-pill-count">{count}</span>
                  </button>
                );
              })}
            </div>
          ) : undefined
        }
        columns={[
          "Product ID",
          "Product name",
          "Category",
          "Brand",
          "SKU code",
          "Selling price",
          "In stock",
          "Availability",
        ]}
        rows={filteredByCategoryRows}
        searchPlaceholder="Search product by name, SKU or category..."
        filters={["All status", "In stock", "Low stock", "Out of stock"]}
        onCreate={openCreate}
        onEdit={editProduct}
        onDelete={deleteProduct}
      />
      {open && (
        <ProductFormModal
          key={editRow ? editRow.id : "new"}
          editRow={editRow}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Product"
        subtitle="Catalog Management"
        description={
          <span>
            Are you sure you want to permanently delete{" "}
            <strong>{deleteTarget?.values[0] || deleteTarget?.id}</strong>?
          </span>
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Product Name", value: deleteTarget.values[0] || "—" },
                { label: "Category", value: deleteTarget.values[1] || "—" },
                { label: "SKU Code", value: deleteTarget.values[3] || "—" },
                { label: "Selling Price", value: deleteTarget.values[4] || "—" },
                { label: "Current Stock", value: deleteTarget.values[5] || "—" },
              ]
            : []
        }
        confirmLabel="Delete Product"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={confirmDeleteProduct}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        secondaryAction={
          deleteError
            ? {
                label: "Deactivate Instead",
                variant: "warning",
                onClick: handleDeactivateInstead,
              }
            : undefined
        }
      />
    </>
  );
}
