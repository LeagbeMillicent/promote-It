"use client";

import { useEffect, useState } from "react";
import { ManagementPage, Row } from "@/components/management-page";
import { Contact2, Trash2, X } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";

type CustomerItem = {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  values: string[];
  status: string;
  tone: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function loadCustomers() {
    fetch("/api/customers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function openCreate() {
    setEditingCustomer(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(row: Row) {
    const cust = customers.find((c) => c.id === row.id || c.customerId === row.id);
    if (!cust) return;
    setEditingCustomer(cust);
    setForm({
      name: cust.name,
      phone: cust.phone !== "—" ? cust.phone : "",
      email: cust.email !== "—" ? cust.email : "",
      address: cust.address !== "—" ? cust.address : "",
      notes: cust.notes || "",
    });
    setError("");
    setModalOpen(true);
  }

  function deleteCustomer(row: Row) {
    const cust = customers.find((c) => c.id === row.id || c.customerId === row.id);
    if (!cust) return;
    setDeleteError(null);
    setDeleteTarget(cust);
  }

  async function confirmDeleteCustomer() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(deleteTarget.customerId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Customer could not be deleted");
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      setDeleteTarget(null);
      loadCustomers();
    } catch {
      setDeleteError("Network error while deleting customer");
      setIsDeleting(false);
    }
  }

  async function submitCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Customer name is required");
      return;
    }
    setSaving(true);
    setError("");
    const isEdit = !!editingCustomer;
    const url = "/api/customers";
    const method = isEdit ? "PATCH" : "POST";
    const payload = {
      ...form,
      ...(isEdit ? { id: editingCustomer.customerId } : {}),
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save customer");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    loadCustomers();
  }

  return (
    <>
      <ManagementPage
        active="/customers"
        title="Customers"
        description="Maintain customer contacts, order histories, and store loyalty."
        action="Add customer"
        columns={["Customer ID", "Name", "Phone", "Email", "Address", "Orders", "Total spent", "Status"]}
        rows={customers}
        searchPlaceholder="Search customer by name, phone, email..."
        filters={["All status", "Active", "New"]}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deleteCustomer}
      />

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <section className="modal-card" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-icon">
                <Contact2 size={18} />
              </div>
              <div>
                <h2>{editingCustomer ? "Edit customer" : "Add customer"}</h2>
                <p>Track store shopper relationships and purchase totals.</p>
              </div>
              <button
                className="icon-button modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitCustomer}>
              <div className="modal-fields">
                <label style={{ gridColumn: "span 2" }}>
                  Customer full name
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Abena Serwaa"
                    required
                  />
                </label>
                <label>
                  Phone number
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +233 20 987 6543"
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="abena@gmail.com"
                  />
                </label>
                <label style={{ gridColumn: "span 2" }}>
                  Residential / Delivery address
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Airport Residential Area, House 42"
                  />
                </label>
                <label style={{ gridColumn: "span 2" }}>
                  Notes / Customer preferences
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes regarding purchase history or discounts"
                    rows={3}
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
              </div>
              <div className="modal-footer">
                {editingCustomer && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => {
                      if (editingCustomer) deleteCustomer(editingCustomer);
                      setModalOpen(false);
                    }}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                )}
                <span className="modal-footer-spacer" />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : "Save customer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Customer"
        subtitle="Customer Directory"
        description={
          <span>
            Are you sure you want to delete customer <strong>{deleteTarget?.name}</strong>?
          </span>
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Customer Name", value: deleteTarget.name },
                { label: "Phone Number", value: deleteTarget.phone || "—" },
                { label: "Email Address", value: deleteTarget.email || "—" },
                { label: "Location / Address", value: deleteTarget.address || "—" },
              ]
            : []
        }
        confirmLabel="Delete Customer"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={confirmDeleteCustomer}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </>
  );
}
