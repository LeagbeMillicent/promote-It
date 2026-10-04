"use client";

import { useEffect, useState } from "react";
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

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
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

  useEffect(() => {
    loadProducts();
  }, []);

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

  return (
    <>
      <ManagementPage
        active="/products"
        title="Products Catalog"
        description="Manage your inventory items, pricing margins, variants, and stock thresholds."
        action="Add product"
        columns={["Product ID", "Product name", "Category", "Brand", "SKU code", "Selling price", "In stock", "Availability"]}
        rows={rows}
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
          onSaved={loadProducts}
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
