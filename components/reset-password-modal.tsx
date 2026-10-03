"use client";

import { FormEvent, useState } from "react";
import { KeyRound, X } from "lucide-react";

type UserRow = { id: string; userId?: string; values: string[]; status?: string; tone?: string };

export function ResetPasswordModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setSaving(true);
    const response = await fetch(`/api/users/${user.userId || user.id}/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Password could not be reset"); setSaving(false); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-icon"><KeyRound size={18} /></div>
          <div>
            <h2>Reset password</h2>
            <p>Set a new password for {user.values[0]}.</p>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-fields">
            <label>New password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" required />
            </label>
            <label>Confirm password
              <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type password again" required />
            </label>
            {error && <p className="form-error">{error}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Reset password"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}