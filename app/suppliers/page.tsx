"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Download,
  Edit3,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";

type SupplierRow = {
  id: string;
  name: string;
  initials: string;
  category: string;
  contact: string;
  phone: string;
  email: string;
  location: string;
  purchases: string;
  purchaseAmount?: number;
  orders: string;
  orderCount?: number;
  status: string;
  tone: string;
};

type SupplierModalMode = "create" | "edit" | null;

function exportSuppliersCSV(suppliers: SupplierRow[]) {
  const headers = [
    "Supplier ID",
    "Company Name",
    "Contact Person",
    "Phone",
    "Email",
    "Location",
    "Orders",
    "Total Purchases",
    "Status",
  ];
  const rows = suppliers.map((s) => [
    s.id,
    s.name,
    s.contact,
    s.phone,
    s.email,
    s.location,
    s.orders,
    s.purchases,
    s.status,
  ]);
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) => r.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`${headerLine}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All suppliers");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modalMode, setModalMode] = useState<SupplierModalMode>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function loadSuppliers() {
    fetch("/api/suppliers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setSuppliers(data);
      })
      .catch(() => setSuppliers([]));
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  const visibleSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const text = `${supplier.name} ${supplier.contact} ${supplier.phone} ${supplier.email} ${supplier.location}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());
      const matchesFilter =
        filter === "All suppliers" || supplier.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, suppliers]);

  function openCreate() {
    setSelectedSupplier(null);
    setForm({ name: "", contactPerson: "", phone: "", email: "", address: "" });
    setError("");
    setModalMode("create");
  }

  function openEdit(supplier: SupplierRow) {
    setSelectedSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contact !== "Primary contact not set" ? supplier.contact : "",
      phone: supplier.phone !== "No phone number" ? supplier.phone : "",
      email: supplier.email !== "No email address" ? supplier.email : "",
      address: supplier.location !== "Address not set" ? supplier.location : "",
    });
    setError("");
    setModalMode("edit");
  }

  async function submitSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    setSaving(true);
    setError("");
    const isEdit = modalMode === "edit" && selectedSupplier;
    const url = "/api/suppliers";
    const method = isEdit ? "PATCH" : "POST";
    const payload = {
      ...form,
      ...(isEdit ? { id: selectedSupplier.id } : {}),
    };

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to save supplier");
      setSaving(false);
      return;
    }
    setSaving(false);
    setModalMode(null);
    loadSuppliers();
  }

  async function deleteSupplier() {
    if (!selectedSupplier) return;
    if (!confirm(`Deactivate supplier ${selectedSupplier.name}?`)) return;
    await fetch(`/api/suppliers?id=${encodeURIComponent(selectedSupplier.id)}`, {
      method: "DELETE",
    });
    setModalMode(null);
    loadSuppliers();
  }

  // Summary rollups
  const activeCount = suppliers.filter((s) => s.status === "Active").length;

  return (
    <AppShell active="/suppliers">
      <div className="page-wrap suppliers-page">
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <Truck size={14} /> Procurement network
            </div>
            <h1>Suppliers & Vendors</h1>
            <p>Manage wholesale partners, purchase agreements, and stock procurement.</p>
          </div>
          <div className="heading-actions">
            <button
              className="secondary-button"
              onClick={() => exportSuppliersCSV(visibleSuppliers)}
              title="Download supplier directory as CSV"
            >
              <Download size={16} /> Export list
            </button>
            <button className="primary-button" onClick={openCreate}>
              <Plus size={17} /> Add supplier
            </button>
          </div>
        </section>

        {/* Procurement KPI Grid */}
        <section className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 320px))" }}>
          <div className="stat-card blue">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Building2 size={20} />
              </span>
              <span className="stat-change positive">Trade partners</span>
            </div>
            <span className="stat-title">Active suppliers</span>
            <strong className="stat-value">{activeCount}</strong>
          </div>
        </section>

        {/* Suppliers Directory Panel */}
        <section className="panel records-panel">
          <div className="records-toolbar">
            <div>
              <h2>Supplier directory</h2>
              <p>
                {visibleSuppliers.length} {visibleSuppliers.length === 1 ? "vendor" : "vendors"} registered
              </p>
            </div>
            <div className="toolbar-actions">
              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendor, contact, phone..."
                />
              </div>
              <div className="filter-group">
                {["All suppliers", "Active", "Inactive"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-chip ${filter === option ? "active" : ""}`}
                    onClick={() => setFilter(option)}
                  >
                    {option === "All suppliers" ? "All" : option}
                  </button>
                ))}
              </div>
              <div className="view-toggle" style={{ marginLeft: "4px" }}>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  title="Card Grid View"
                >
                  <LayoutGrid size={15} /> Grid
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List size={15} /> Table
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="supplier-grid">
              {visibleSuppliers.map((supplier) => (
                <article className="supplier-card-modern" key={supplier.id}>
                  <div className="supplier-card-header">
                    <div className="supplier-brand-wrap">
                      <div className="supplier-avatar-badge">{supplier.initials}</div>
                      <div className="supplier-title-group">
                        <h3>{supplier.name}</h3>
                        <div className="supplier-subtitle">
                          {supplier.contact !== "Primary contact not set"
                            ? supplier.contact
                            : "Wholesale vendor"}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`status-badge ${
                        supplier.status === "Active" ? "status-green" : "status-orange"
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </div>

                  <div className="supplier-contact-chips">
                    <div className="supplier-contact-item">
                      <Phone size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                      {supplier.phone !== "No phone number" ? (
                        <a href={`tel:${supplier.phone}`}>{supplier.phone}</a>
                      ) : (
                        <span style={{ color: "var(--ink-muted)" }}>No phone recorded</span>
                      )}
                    </div>
                    <div className="supplier-contact-item">
                      <Mail size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                      {supplier.email !== "No email address" ? (
                        <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                      ) : (
                        <span style={{ color: "var(--ink-muted)" }}>No email recorded</span>
                      )}
                    </div>
                    <div className="supplier-contact-item">
                      <MapPin size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                      <span>{supplier.location}</span>
                    </div>
                  </div>

                  <div className="supplier-card-actions" style={{ justifyContent: "flex-end", marginTop: "8px" }}>
                    <button
                      className="secondary-button"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      onClick={() => openEdit(supplier)}
                    >
                      <Edit3 size={14} /> Edit details
                    </button>
                  </div>
                </article>
              ))}

              {visibleSuppliers.length === 0 && (
                <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                  <div className="empty-icon">
                    <Truck size={24} />
                  </div>
                  <strong>No suppliers match your search</strong>
                  <span>Try adjusting your search criteria or add a new supplier partner.</span>
                  <button
                    className="primary-button"
                    style={{ marginTop: "12px" }}
                    onClick={openCreate}
                  >
                    <Plus size={16} /> Add first supplier
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="table-wrap records-table">
              <table>
                <thead>
                  <tr>
                    <th>Supplier ID</th>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Location</th>
                    <th>Orders</th>
                    <th>Total Spend</th>
                    <th>Status</th>
                    <th className="row-actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <strong className="record-id">{supplier.id.slice(0, 8)}</strong>
                      </td>
                      <td>
                        <strong>{supplier.name}</strong>
                      </td>
                      <td>{supplier.contact}</td>
                      <td>
                        {supplier.phone !== "No phone number" ? (
                          <a href={`tel:${supplier.phone}`} style={{ color: "var(--ink-primary)" }}>
                            {supplier.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {supplier.email !== "No email address" ? (
                          <a href={`mailto:${supplier.email}`} style={{ color: "var(--brand-primary)" }}>
                            {supplier.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{supplier.location}</td>
                      <td>{supplier.orders}</td>
                      <td>
                        <strong>{supplier.purchases}</strong>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            supplier.status === "Active" ? "status-green" : "status-orange"
                          }`}
                        >
                          {supplier.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-action-group">
                          <button
                            className="icon-button"
                            onClick={() => openEdit(supplier)}
                            title={`Edit ${supplier.name}`}
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleSuppliers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Truck size={22} />
                  </div>
                  <strong>No suppliers found</strong>
                  <span>Click &quot;Add supplier&quot; to begin building your vendor network.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit Supplier Modal */}
      {modalMode && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
        >
          <section className="modal-card" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-icon">
                <Truck size={18} />
              </div>
              <div>
                <h2>{modalMode === "edit" ? "Edit supplier profile" : "Register new supplier"}</h2>
                <p>Maintain vendor terms, contact information, and delivery locations.</p>
              </div>
              <button
                className="icon-button modal-close"
                onClick={() => setModalMode(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitSupplier}>
              <div className="modal-fields">
                <label style={{ gridColumn: "span 2" }}>
                  Company / Supplier name *
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Accra Central Wholesale Ltd."
                    required
                  />
                </label>
                <label>
                  Contact person
                  <input
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="e.g. Samuel Darko"
                  />
                </label>
                <label>
                  Phone number
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +233 24 123 4567"
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="orders@supplier.com"
                  />
                </label>
                <label>
                  Physical address / Warehouse
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Makola Market Block B"
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
              </div>
              <div className="modal-footer">
                {modalMode === "edit" && (
                  <button type="button" className="danger-button" onClick={deleteSupplier}>
                    <Trash2 size={15} /> Deactivate
                  </button>
                )}
                <span className="modal-footer-spacer" />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalMode(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : "Save supplier"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}
