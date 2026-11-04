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
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadUsers() {
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function deleteUser(row: Row) {
    setDeleteError(null);
    setDeleteTarget(row as UserRow);
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/users/${deleteTarget.userId || deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || "User could not be deleted");
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      setDeleteTarget(null);
      loadUsers();
    } catch {
      setDeleteError("Network error while deleting user");
      setIsDeleting(false);
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
        onDelete={deleteUser}
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
        isOpen={!!deleteTarget}
        title="Delete Staff Member"
        subtitle="Access & Permissions"
        description={
          <span>
            Are you sure you want to permanently delete{" "}
            <strong>{deleteTarget?.values[0] || "this staff member"}</strong>? Any historical sales, purchases, and audit records associated with this user will be detached. This action cannot be undone.
          </span>
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Staff Member", value: deleteTarget.values[0] || "—" },
                { label: "Email Address", value: deleteTarget.values[1] || "—" },
                { label: "Role", value: deleteTarget.values[2] || "—" },
                { label: "Current Status", value: deleteTarget.status || "—" },
              ]
            : []
        }
        confirmLabel="Delete Member"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={confirmDeleteUser}
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