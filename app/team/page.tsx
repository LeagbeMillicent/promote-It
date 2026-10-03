"use client";

import { useEffect, useState } from "react";
import { ManagementPage, Row } from "@/components/management-page";
import { UserFormModal } from "@/components/user-form-modal";
import { ResetPasswordModal } from "@/components/reset-password-modal";

type UserRow = { id: string; userId?: string; values: string[]; status?: string; tone?: string };

export default function TeamPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<UserRow | null>(null);
  const [resetRow, setResetRow] = useState<UserRow | null>(null);

  function loadUsers() {
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function deactivateUser(row: Row) {
    if (!confirm(`Deactivate ${row.values[0] || "this user"}?`)) return;
    await fetch(`/api/users/${row.userId || row.id}`, { method: "DELETE" });
    loadUsers();
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
    </>
  );
}