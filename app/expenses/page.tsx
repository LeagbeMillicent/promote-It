"use client";

import { useEffect, useState } from "react";
import { ManagementPage, Row } from "@/components/management-page";
import { ExpenseFormModal } from "@/components/expense-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

type ExpenseRow = { id: string; expenseId?: string; values: string[]; status?: string; tone?: string };

export default function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadExpenses() {
    fetch("/api/expenses")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  function deleteExpense(row: Row) {
    const eRow = row as ExpenseRow;
    setDeleteError(null);
    setDeleteTarget(eRow);
  }

  async function confirmDeleteExpense() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/expenses/${deleteTarget.expenseId || deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || "Expense could not be deleted");
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      setDeleteTarget(null);
      loadExpenses();
    } catch {
      setDeleteError("Network error while deleting expense");
      setIsDeleting(false);
    }
  }

  function openCreate() {
    setEditRow(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditRow(row as ExpenseRow);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setEditRow(null);
  }

  return (
    <>
      <ManagementPage
        active="/expenses"
        title="Store Expenses"
        description="Track overhead, rent, utilities, and daily petty cash to keep net profit figures accurate."
        action="Record expense"
        columns={["Expense ID", "Category", "Description", "Payment method", "Amount", "Record date", "Status"]}
        rows={rows}
        searchPlaceholder="Search expense by category, note or payment..."
        filters={["All status", "Recorded"]}
        onCreate={openCreate}
        onEdit={openEdit}
        onDelete={deleteExpense}
      />
      {open && (
        <ExpenseFormModal
          key={editRow ? editRow.id : "new"}
          editRow={editRow}
          onClose={onClose}
          onSaved={loadExpenses}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Expense"
        subtitle="Financial Records"
        description={
          <span>
            Are you sure you want to delete expense record <strong>{deleteTarget?.id}</strong>?
          </span>
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Expense ID", value: deleteTarget.id },
                { label: "Category", value: deleteTarget.values[0] || "—" },
                { label: "Description", value: deleteTarget.values[1] || "—" },
                { label: "Payment Method", value: deleteTarget.values[2] || "—" },
                { label: "Amount", value: deleteTarget.values[3] || "—" },
              ]
            : []
        }
        confirmLabel="Delete Expense"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={confirmDeleteExpense}
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
