"use client";

import { FormEvent, useState } from "react";
import { WalletCards, X } from "lucide-react";

type ExpenseRow = { id: string; expenseId?: string; values: string[]; status?: string; tone?: string };

export function ExpenseFormModal({
  onClose,
  onSaved,
  editRow,
}: {
  onClose: () => void;
  onSaved: () => void;
  editRow?: ExpenseRow | null;
}) {
  const [form, setForm] = useState(() => ({
    category: editRow?.values[0] || "",
    amount: editRow?.values[4]
      ? editRow.values[4].replace("GHS ", "").replace(/,/g, "")
      : "",
    paymentMethod: (editRow?.values[3] || "CASH").replaceAll(" ", "_").toUpperCase(),
    description: editRow?.values[1] && editRow.values[1] !== "-" ? editRow.values[1] : "",
  }));

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const method = editRow ? "PATCH" : "POST";
    const url = editRow ? `/api/expenses/${editRow.expenseId || editRow.id}` : "/api/expenses";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) || 0 }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Expense could not be saved");
      setSaving(false);
      return;
    }
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
            <WalletCards size={18} />
          </div>
          <div>
            <h2>{editRow ? "Edit expense" : "Record store expense"}</h2>
            <p>Track store operational costs to keep profit margins accurate.</p>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="sale-fields">
            <label>
              Expense category
              <input
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="e.g. Rent, Utilities, Transport"
                required
              />
            </label>
            <label>
              Amount (GHS)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label>
              Payment method
              <select
                value={form.paymentMethod}
                onChange={(event) => update("paymentMethod", event.target.value)}
                required
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              Note / Description
              <input
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Optional description"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
          </div>
          <div className="modal-footer">
            <span className="modal-footer-spacer" />
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save expense"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
