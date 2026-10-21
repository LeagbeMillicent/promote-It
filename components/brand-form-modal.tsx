"use client";

import { FormEvent, useState } from "react";
import { Award, Loader2, X } from "lucide-react";

export type BrandItem = {
  id: string;
  name: string;
  _count?: { products: number };
  createdAt?: string;
  updatedAt?: string;
};

export function BrandFormModal({
  onClose,
  onSaved,
  editBrand,
}: {
  onClose: () => void;
  onSaved: () => void;
  editBrand?: BrandItem | null;
}) {
  const [name, setName] = useState(editBrand?.name || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Brand name is required");
      return;
    }

    setSaving(true);
    setError("");

    const isEdit = !!editBrand;
    const url = isEdit ? `/api/brands/${editBrand.id}` : "/api/brands";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to save brand");
        setSaving(false);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Network error while saving brand. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: "460px" }}>
        <div className="modal-header">
          <div className="modal-icon">
            <Award size={18} />
          </div>
          <div>
            <h2>{editBrand ? "Edit Brand" : "Add New Brand"}</h2>
            <p>Maintain brand manufacturers and label designations.</p>
          </div>
          <button
            type="button"
            className="icon-button modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-fields">
            <label style={{ gridColumn: "span 2" }}>
              Brand Name *
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nivea, Apple, HP, Samsung..."
                required
                autoFocus
              />
            </label>

            {editBrand && (
              <div
                style={{
                  gridColumn: "span 2",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  display: "flex",
                  gap: "16px",
                  color: "var(--ink-secondary)",
                }}
              >
                <div>
                  <strong style={{ color: "var(--ink-primary)" }}>Assigned Products:</strong>{" "}
                  {editBrand._count?.products ?? 0}
                </div>
              </div>
            )}

            {error && (
              <p
                className="form-error"
                style={{
                  gridColumn: "span 2",
                  background: "var(--status-red-bg)",
                  color: "var(--status-red)",
                  border: "1px solid var(--status-red-border)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  margin: "4px 0 0",
                }}
              >
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : <Award size={16} />}
              {saving ? "Saving..." : editBrand ? "Update Brand" : "Create Brand"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
