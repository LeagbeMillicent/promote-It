"use client";

import { useEffect, useState } from "react";
import { ManagementPage, Row } from "@/components/management-page";
import { ExpenseFormModal } from "@/components/expense-form-modal";

type ExpenseRow = { id: string; expenseId?: string; values: string[]; status?: string; tone?: string };

export default function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);

  function loadExpenses() {
    fetch("/api/expenses")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function deleteExpense(row: Row) {
    const eRow = row as ExpenseRow;
    if (!confirm(`Delete expense ${eRow.id}?`)) return;
    await fetch(`/api/expenses/${eRow.expenseId || eRow.id}`, { method: "DELETE" });
    loadExpenses();
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
    </>
  );
}
