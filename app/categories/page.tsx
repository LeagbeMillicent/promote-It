"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Boxes,
  Download,
  Edit3,
  ExternalLink,
  FolderTree,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmModal } from "@/components/confirm-modal";
import { Pagination } from "@/components/pagination";
import { CategoryFormModal, CategoryItem } from "@/components/category-form-modal";

function exportCategoriesCSV(categories: CategoryItem[]) {
  const headers = ["Category ID", "Category Name", "Assigned Products"];
  const rows = categories.map((cat) => [
    cat.id,
    cat.name,
    cat._count?.products ?? 0,
  ]);

  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) => r.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`${headerLine}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryItem | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  function loadCategories() {
    setLoading(true);
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // Filter & Search logic
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const text = `${cat.name} ${cat.id}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());

      let matchesFilter = true;
      if (filter === "With products") {
        matchesFilter = (cat._count?.products ?? 0) > 0;
      } else if (filter === "Without products") {
        matchesFilter = (cat._count?.products ?? 0) === 0;
      }

      return matchesQuery && matchesFilter;
    });
  }, [categories, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCategories = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredCategories.slice(startIndex, startIndex + pageSize);
  }, [filteredCategories, safePage, pageSize]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCategories = categories.length;
    const totalProducts = categories.reduce((sum, c) => sum + (c._count?.products ?? 0), 0);
    const activeCategories = categories.filter((c) => (c._count?.products ?? 0) > 0).length;
    const topCategory = categories.reduce<CategoryItem | null>((prev, curr) => {
      if (!prev) return curr;
      return (curr._count?.products ?? 0) > (prev._count?.products ?? 0) ? curr : prev;
    }, null);

    return { totalCategories, totalProducts, activeCategories, topCategory };
  }, [categories]);

  function openCreate() {
    setEditCategory(null);
    setModalOpen(true);
  }

  function openEdit(category: CategoryItem) {
    setEditCategory(category);
    setModalOpen(true);
  }

  function handleDeleteClick(category: CategoryItem) {
    setDeleteError(null);
    setDeleteTarget(category);
  }

  async function confirmDeleteCategory() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Category could not be deleted");
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      setDeleteTarget(null);
      loadCategories();
    } catch {
      setDeleteError("Network error while deleting category");
      setIsDeleting(false);
    }
  }

  return (
    <AppShell active="/categories">
      <div className="page-wrap categories-page">
        {/* Navigation Tabs Bar */}
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
              href="/categories"
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
              <FolderTree size={16} /> Categories ({categories.length})
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

          <Link
            href="/products"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12.5px",
              color: "var(--brand-primary)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <Package size={14} /> Back to Products Catalog <ExternalLink size={12} />
          </Link>
        </div>

        {/* Page Heading */}
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <FolderTree size={14} /> Category Management
            </div>
            <h1>Category Configuration</h1>
            <p>Create, update, and manage product catalog categories.</p>
          </div>
          <div className="heading-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => exportCategoriesCSV(filteredCategories)}
              title="Download category directory as CSV"
            >
              <Download size={16} /> Export CSV
            </button>
            <button type="button" className="primary-button" onClick={openCreate}>
              <Plus size={17} /> Add category
            </button>
          </div>
        </section>

        {/* KPI Stats Grid */}
        <section
          className="stats-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            marginBottom: "24px",
          }}
        >
          <div className="stat-card blue">
            <div className="stat-card-top">
              <span className="stat-icon">
                <FolderTree size={20} />
              </span>
              <span className="stat-change positive">Registered</span>
            </div>
            <span className="stat-title">Total Categories</span>
            <strong className="stat-value">{metrics.totalCategories}</strong>
          </div>

          <div className="stat-card green">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Boxes size={20} />
              </span>
              <span className="stat-change positive">Catalog items</span>
            </div>
            <span className="stat-title">Assigned Products</span>
            <strong className="stat-value">{metrics.totalProducts} units</strong>
          </div>

          <div className="stat-card orange">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Sparkles size={20} />
              </span>
              <span className="stat-change">Active lines</span>
            </div>
            <span className="stat-title">Active Categories</span>
            <strong className="stat-value">{metrics.activeCategories} categories</strong>
          </div>

          <div className="stat-card red">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Package size={20} />
              </span>
              <span className="stat-change positive">Top volume</span>
            </div>
            <span className="stat-title">Leading Category</span>
            <strong
              className="stat-value"
              style={{ fontSize: "16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={metrics.topCategory?.name || "None"}
            >
              {metrics.topCategory?.name || "—"}
            </strong>
          </div>
        </section>

        {/* Category Records Panel */}
        <section className="panel records-panel">
          <div className="records-toolbar">
            <div>
              <h2>Category Directory</h2>
              <p>
                {filteredCategories.length} {filteredCategories.length === 1 ? "category" : "categories"} configured
              </p>
            </div>
            <div className="toolbar-actions">
              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search categories by name..."
                />
              </div>
              <div className="filter-group">
                {["All", "With products", "Without products"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-chip ${filter === option ? "active" : ""}`}
                    onClick={() => {
                      setFilter(option);
                      setCurrentPage(1);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap records-table">
            <table>
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Name</th>
                  <th>Assigned Products</th>
                  <th className="row-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((cat) => {
                  const code = `CAT-${cat.id.replace(/-/g, "").slice(-6).toUpperCase()}`;
                  const productCount = cat._count?.products ?? 0;

                  return (
                    <tr key={cat.id}>
                      <td>
                        <strong className="record-id">{code}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              background: "var(--brand-primary-light)",
                              color: "var(--brand-primary)",
                              fontWeight: 700,
                              fontSize: "12px",
                              flexShrink: 0,
                            }}
                          >
                            <FolderTree size={15} />
                          </span>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "var(--ink-primary)" }}>{cat.name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${productCount > 0 ? "status-green" : "status-orange"}`}
                          style={{ fontWeight: 600 }}
                        >
                          {productCount} {productCount === 1 ? "product" : "products"}
                        </span>
                      </td>
                      <td>
                        <div className="row-action-group">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openEdit(cat)}
                            title={`Edit ${cat.name}`}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button action-delete"
                            onClick={() => handleDeleteClick(cat)}
                            title={`Delete ${cat.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && filteredCategories.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <FolderTree size={24} />
                </div>
                <strong>No categories found</strong>
                <span>
                  {query || filter !== "All"
                    ? "Try adjusting your search query or filter selection."
                    : "Create your first product category to get started."}
                </span>
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: "12px" }}
                  onClick={openCreate}
                >
                  <Plus size={16} /> Add category
                </button>
              </div>
            )}
          </div>

          {filteredCategories.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalItems={filteredCategories.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="categories"
            />
          )}
        </section>
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <CategoryFormModal
          key={editCategory ? editCategory.id : "new"}
          editCategory={editCategory}
          onClose={() => {
            setModalOpen(false);
            setEditCategory(null);
          }}
          onSaved={loadCategories}
        />
      )}

      {/* Delete / Dependency Warning Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={
          (deleteTarget?._count?.products ?? 0) > 0
            ? "Cannot Delete Category"
            : "Delete Category"
        }
        subtitle="Catalog Configuration"
        description={
          (deleteTarget?._count?.products ?? 0) > 0 ? (
            <span>
              The category <strong>{deleteTarget?.name}</strong> has{" "}
              <strong>{deleteTarget?._count?.products} assigned product(s)</strong>. To protect catalog integrity,
              please reassign these products to another category before deleting.
            </span>
          ) : (
            <span>
              Are you sure you want to permanently delete category <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </span>
          )
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Category Name", value: deleteTarget.name },
                {
                  label: "Assigned Products",
                  value: `${deleteTarget._count?.products ?? 0} item(s)`,
                },
              ]
            : []
        }
        confirmLabel={
          (deleteTarget?._count?.products ?? 0) > 0
            ? "Close Notice"
            : "Delete Category"
        }
        variant={
          (deleteTarget?._count?.products ?? 0) > 0
            ? "warning"
            : "danger"
        }
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={
          (deleteTarget?._count?.products ?? 0) > 0
            ? () => {
                setDeleteTarget(null);
                setDeleteError(null);
              }
            : confirmDeleteCategory
        }
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        secondaryAction={
          (deleteTarget?._count?.products ?? 0) > 0
            ? {
                label: "View Products in Catalog",
                variant: "secondary",
                onClick: () => {
                  window.location.href = `/products`;
                },
              }
            : undefined
        }
      />
    </AppShell>
  );
}
