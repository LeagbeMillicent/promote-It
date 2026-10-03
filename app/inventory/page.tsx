"use client";

import { useEffect, useState } from "react";
import { ManagementPage } from "@/components/management-page";
import { InventoryAdjustModal } from "@/components/inventory-adjust-modal";

type InventoryRow = { id: string; values: string[]; status?: string; tone?: string };

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [open, setOpen] = useState(false);

  function loadInventory() {
    fetch("/api/inventory")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <>
      <ManagementPage
        active="/inventory"
        title="Inventory Movements"
        description="Audit every incoming shipment, customer sale, and manual stock adjustment."
        action="Adjust stock"
        columns={["Movement ID", "Product", "Movement details", "Initiated by", "Status"]}
        rows={rows}
        searchPlaceholder="Search product, movement or reference code..."
        filters={["All status", "Completed", "Needs review"]}
        onCreate={() => setOpen(true)}
        showRowActions={false}
      />
      {open && (
        <InventoryAdjustModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            loadInventory();
          }}
        />
      )}
    </>
  );
}
