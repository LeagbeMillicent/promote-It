"use client";

import { FormEvent, useEffect, useState } from "react";
import { Users, X } from "lucide-react";

type Option = { id: string; name: string };
type UserRow = { id: string; userId?: string; values: string[]; status?: string; tone?: string };

export function UserFormModal({
  onClose,
  onSaved,
  editRow,
}: {
  onClose: () => void;
  onSaved: () => void;
  editRow?: UserRow | null;
}) {
  const [roles, setRoles] = useState<Option[]>([]);
  const [form, setForm] = useState(() => ({
    name: editRow?.values[0] || "",
    email: editRow?.values[1] || "",
    roleId: "",
    status: editRow?.status === "Inactive" ? "INACTIVE" : "ACTIVE",
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/roles")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const roleList = Array.isArray(data) ? data : [];
        setRoles(roleList);
        if (roleList.length > 0) {
          setForm((current) => ({
            ...current,
            roleId: current.roleId || roleList[0].id,
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const method = editRow ? "PATCH" : "POST";
    const url = editRow ? `/api/users/${editRow.userId || editRow.id}` : "/api/users";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "User could not be saved");
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
            <Users size={18} />
          </div>
          <div>
            <h2>{editRow ? "Edit staff member" : "Invite team member"}</h2>
            <p>Assign store access roles and login credentials.</p>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="sale-fields">
            <label>
              Full name
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="e.g. Kwame Mensah"
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="kwame@promoteit.ventures"
                required
              />
            </label>
            <label>
              Role
              <select
                value={form.roleId}
                onChange={(event) => update("roleId", event.target.value)}
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option value={role.id} key={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Account status
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            {error && <p className="form-error">{error}</p>}
          </div>
          <div className="modal-footer">
            <span className="modal-footer-spacer" />
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save member"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
