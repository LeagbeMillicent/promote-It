"use client";

import { useEffect, useState } from "react";
import { ManagementPage } from "@/components/management-page";

type AuditRow = { id: string; values: string[]; status?: string; tone?: string };

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);

  function loadLogs() {
    fetch("/api/audit-logs")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <ManagementPage
      active="/audit-logs"
      title="Security & Audit Logs"
      description="An immutable security ledger of staff actions, logins, updates, and configuration changes."
      columns={["Log ID", "Action", "Entity", "User", "Timestamp", "Result"]}
      rows={rows}
      searchPlaceholder="Search action, entity or user..."
      filters={["All status", "Success"]}
      showCreate={false}
      showRowActions={false}
    />
  );
}
