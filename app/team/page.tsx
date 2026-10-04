"use client";

import { useEffect, useState } from "react";
import { ManagementPage, Row } from "@/components/management-page";
import { UserFormModal } from "@/components/user-form-modal";
import { ResetPasswordModal } from "@/components/reset-password-modal";
import { ConfirmModal } from "@/components/confirm-modal";

type UserRow = { id: string; userId?: string; values: string[]; status?: string; tone?: string };

export default function TeamPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<UserRow | null>(null);
  const [resetRow, setResetRow] = useState<UserRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  function loadUsers() {
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function deactivateUser(row: Row) {
    setDeactivateError(null);
    setDeactivateTarget(row as UserRow);
  }

  async function confirmDeactivateUser() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    setDeactivateError(null);
    try {
      const response = await fetch(`/api/users/${deactivateTarget.userId || deactivateTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setDeactivateError(data.error || "User could not be deactivated");
        setIsDeactivating(false);
        return;
      }
      setIsDeactivating(false);
      setDeactivateTarget(null);
      loadUsers();
    } catch {
      setDeactivateError("Network error while deactivating user");
      setIsDeactivating(false);
    }
  }

  function openCreate() {
    setEditRow(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditRow(row as UserRow);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setEditRow(null);
  }

  return (
    <>
      <ManagementPage
        active="/team"
        title="Team & Permissions"
        description="Manage staff access levels, security roles, and credential resets."
        action="Invite member"
        columns={["User ID", "Staff member", "Email address", "Assigned role", "Joined", "Status"]}
        rows={rows}
        searchPlaceholder="Search team member by name or email..."
        filters={["All status", "Active", "Inactive"]}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deactivateUser}
        onRowAction={(row) => setResetRow(row as UserRow)}
        rowActionLabel="Reset password"
      />
      {open && (
        <UserFormModal
          key={editRow ? editRow.id : "new"}
          editRow={editRow}
          onClose={onClose}
          onSaved={loadUsers}
        />
      )}
      {resetRow && (
        <ResetPasswordModal
          key={resetRow.id}
          user={resetRow}
          onClose={() => setResetRow(null)}
          onSaved={loadUsers}
        />
      )}

      <ConfirmModal
        isOpen={!!deactivateTarget}
        title="Deactivate Staff Member"
        subtitle="Access & Permissions"
        description={
          <span>
            Are you sure you want to deactivate account access for{" "}
            <strong>{deactivateTarget?.values[0] || "this staff member"}</strong>? They will no longer be able to log in.
          </span>
        }
        itemDetails={
          deactivateTarget
            ? [
                { label: "Staff Member", value: deactivateTarget.values[0] || "—" },
                { label: "Email Address", value: deactivateTarget.values[1] || "—" },
                { label: "Role", value: deactivateTarget.values[2] || "—" },
                { label: "Current Status", value: deactivateTarget.status || "—" },
              ]
            : []
        }
        confirmLabel="Deactivate Account"
        variant="warning"
        isLoading={isDeactivating}
        error={deactivateError}
        onConfirm={confirmDeactivateUser}
        onClose={() => {
          if (!isDeactivating) {
            setDeactivateTarget(null);
            setDeactivateError(null);
          }
        }}
      />
    </>
  );
}