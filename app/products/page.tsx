"use client";

import { useEffect, useState } from "react";
import { ManagementPage, Row } from "@/components/management-page";
import { ProductFormModal } from "@/components/product-form-modal";

type ProductRow = { id: string; variantId?: string; values: string[]; status?: string; tone?: string };

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProductRow | null>(null);

  function loadProducts() {
    fetch("/api/products")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function deleteProduct(row: Row) {
    const pRow = row as ProductRow;
    const variantId = pRow.variantId || pRow.id;
    if (!confirm(`Delete product ${pRow.values[0] || pRow.id}?`)) return;
    await fetch(`/api/products/${variantId}`, { method: "DELETE" });
    loadProducts();
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
    </>
  );
}
