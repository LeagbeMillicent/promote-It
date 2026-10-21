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
import { BrandFormModal, BrandItem } from "@/components/brand-form-modal";

function exportBrandsCSV(brands: BrandItem[]) {
  const headers = ["Brand ID", "Brand Name", "Assigned Products"];
  const rows = brands.map((b) => [b.id, b.name, b._count?.products ?? 0]);

  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) => r.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`${headerLine}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brands-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<BrandItem | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<BrandItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  function loadBrands() {
    setLoading(true);
    fetch("/api/brands")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setBrands(data);
        setLoading(false);
      })
      .catch(() => {
        setBrands([]);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadBrands();
  }, []);

  // Filter & Search logic
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const text = `${brand.name} ${brand.id}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());

      let matchesFilter = true;
      if (filter === "With products") {
        matchesFilter = (brand._count?.products ?? 0) > 0;
      } else if (filter === "Without products") {
        matchesFilter = (brand._count?.products ?? 0) === 0;
      }

      return matchesQuery && matchesFilter;
    });
  }, [brands, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedBrands = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredBrands.slice(startIndex, startIndex + pageSize);
  }, [filteredBrands, safePage, pageSize]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalBrands = brands.length;
    const brandedProducts = brands.reduce((sum, b) => sum + (b._count?.products ?? 0), 0);
    const brandsWithProducts = brands.filter((b) => (b._count?.products ?? 0) > 0).length;
    const topBrand = brands.reduce<BrandItem | null>((prev, curr) => {
      if (!prev) return curr;
      return (curr._count?.products ?? 0) > (prev._count?.products ?? 0) ? curr : prev;
    }, null);

    return { totalBrands, brandedProducts, brandsWithProducts, topBrand };
  }, [brands]);

  function openCreate() {
    setEditBrand(null);
    setModalOpen(true);
  }

  function openEdit(brand: BrandItem) {
    setEditBrand(brand);
    setModalOpen(true);
  }

  function handleDeleteClick(brand: BrandItem) {
    setDeleteError(null);
    setDeleteTarget(brand);
  }

  async function confirmDeleteBrand(unassign = false) {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    const url = unassign
      ? `/api/brands/${deleteTarget.id}?unassign=true`
      : `/api/brands/${deleteTarget.id}`;

    try {
      const res = await fetch(url, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || "Brand could not be deleted");
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      setDeleteTarget(null);
      loadBrands();
    } catch {
      setDeleteError("Network error while deleting brand");
      setIsDeleting(false);
    }
  }

  return (
    <AppShell active="/brands">
      <div className="page-wrap brands-page">
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
                background: "var(--brand-primary)",
                color: "#ffffff",
                textDecoration: "none",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              }}
            >
              <Award size={16} /> Brands ({brands.length})
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
              <Award size={14} /> Manufacturer & Brand Registry
            </div>
            <h1>Brand Configuration</h1>
            <p>Maintain authorized brand labels, manufacturer records, and product associations.</p>
          </div>
          <div className="heading-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => exportBrandsCSV(filteredBrands)}
              title="Download brand directory as CSV"
            >
              <Download size={16} /> Export CSV
            </button>
            <button type="button" className="primary-button" onClick={openCreate}>
              <Plus size={17} /> Add brand
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
                <Award size={20} />
              </span>
              <span className="stat-change positive">Registered</span>
            </div>
            <span className="stat-title">Total Brands</span>
            <strong className="stat-value">{metrics.totalBrands}</strong>
          </div>

          <div className="stat-card green">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Boxes size={20} />
              </span>
              <span className="stat-change positive">Catalog linked</span>
            </div>
            <span className="stat-title">Branded Items</span>
            <strong className="stat-value">{metrics.brandedProducts} units</strong>
          </div>

          <div className="stat-card orange">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Sparkles size={20} />
              </span>
              <span className="stat-change">Active lines</span>
            </div>
            <span className="stat-title">Brands In Use</span>
            <strong className="stat-value">{metrics.brandsWithProducts} brands</strong>
          </div>

          <div className="stat-card red">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Package size={20} />
              </span>
              <span className="stat-change positive">Top volume</span>
            </div>
            <span className="stat-title">Leading Brand</span>
            <strong
              className="stat-value"
              style={{ fontSize: "16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={metrics.topBrand?.name || "None"}
            >
              {metrics.topBrand?.name || "—"}
            </strong>
          </div>
        </section>

        {/* Brand Records Panel */}
        <section className="panel records-panel">
          <div className="records-toolbar">
            <div>
              <h2>Brand Directory</h2>
              <p>
                {filteredBrands.length} {filteredBrands.length === 1 ? "brand" : "brands"} registered
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
                  placeholder="Search brands by name..."
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
                  <th>Brand ID</th>
                  <th>Brand Name</th>
                  <th>Assigned Products</th>
                  <th className="row-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBrands.map((brand) => {
                  const code = `BRD-${brand.id.replace(/-/g, "").slice(-6).toUpperCase()}`;
                  const productCount = brand._count?.products ?? 0;

                  return (
                    <tr key={brand.id}>
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
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "var(--ink-primary)" }}>{brand.name}</strong>
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
                            onClick={() => openEdit(brand)}
                            title={`Edit ${brand.name}`}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button action-delete"
                            onClick={() => handleDeleteClick(brand)}
                            title={`Delete ${brand.name}`}
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

            {!loading && filteredBrands.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Award size={24} />
                </div>
                <strong>No brands found</strong>
                <span>
                  {query || filter !== "All"
                    ? "Try adjusting your search query or filter selection."
                    : "Create your first brand designation to get started."}
                </span>
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: "12px" }}
                  onClick={openCreate}
                >
                  <Plus size={16} /> Add brand
                </button>
              </div>
            )}
          </div>

          {filteredBrands.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalItems={filteredBrands.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="brands"
            />
          )}
        </section>
      </div>

      {/* Add / Edit Brand Modal */}
      {modalOpen && (
        <BrandFormModal
          key={editBrand ? editBrand.id : "new"}
          editBrand={editBrand}
          onClose={() => {
            setModalOpen(false);
            setEditBrand(null);
          }}
          onSaved={loadBrands}
        />
      )}

      {/* Delete / Dependency Warning Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={
          (deleteTarget?._count?.products ?? 0) > 0
            ? "Delete Brand with Assigned Products?"
            : "Delete Brand"
        }
        subtitle="Catalog Configuration"
        description={
          (deleteTarget?._count?.products ?? 0) > 0 ? (
            <span>
              The brand <strong>{deleteTarget?.name}</strong> is currently assigned to{" "}
              <strong>{deleteTarget?._count?.products} product(s)</strong>. You can choose to unassign this brand
              from those products and delete it, or cancel and reassign manually.
            </span>
          ) : (
            <span>
              Are you sure you want to permanently delete brand <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </span>
          )
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Brand Name", value: deleteTarget.name },
                {
                  label: "Assigned Products",
                  value: `${deleteTarget._count?.products ?? 0} item(s)`,
                },
              ]
            : []
        }
        confirmLabel={
          (deleteTarget?._count?.products ?? 0) > 0
            ? "Unassign & Delete Brand"
            : "Delete Brand"
        }
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={() => confirmDeleteBrand((deleteTarget?._count?.products ?? 0) > 0)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </AppShell>
  );
}
