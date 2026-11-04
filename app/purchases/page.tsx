"use client";

import { useEffect, useState } from "react";
import { Download, Edit3, Eye, Printer, Trash2, Truck } from "lucide-react";
import { ManagementPage, Row } from "@/components/management-page";
import { PurchaseFormModal, PurchaseRow } from "@/components/purchase-form-modal";
import {
  PurchaseOrderData,
  PurchaseOrderModal,
  downloadPurchaseOrderDocument,
} from "@/components/purchase-order-modal";
import { ConfirmModal } from "@/components/confirm-modal";

export default function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<PurchaseRow | null>(null);
  const [activePO, setActivePO] = useState<{ po: PurchaseOrderData; autoPrint: boolean } | null>(null);

  const [receiveTarget, setReceiveTarget] = useState<PurchaseRow | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PurchaseRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadPurchases() {
    fetch("/api/purchases")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadPurchases();
  }, []);

  function receive(row: PurchaseRow) {
    setReceiveError(null);
    setReceiveTarget(row);
  }

  async function confirmReceive() {
    if (!receiveTarget) return;
    setIsReceiving(true);
    setReceiveError(null);
    try {
      const res = await fetch(`/api/purchases/${receiveTarget.purchaseId || receiveTarget.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        setReceiveError(data.error || "Failed to receive purchase order");
        setIsReceiving(false);
        return;
      }
      setIsReceiving(false);
      setReceiveTarget(null);
      loadPurchases();
    } catch {
      setReceiveError("Network error while receiving purchase order");
      setIsReceiving(false);
    }
  }

  function deletePurchase(row: PurchaseRow) {
    setDeleteError(null);
    setDeleteTarget(row);
  }

  async function confirmDeletePurchase() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/purchases/${deleteTarget.purchaseId || deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete purchase order");
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
      setDeleteTarget(null);
      loadPurchases();
    } catch {
      setDeleteError("Network error while deleting purchase order");
      setIsDeleting(false);
    }
  }

  function getPOData(row: PurchaseRow): PurchaseOrderData {
    return {
      id: row.id,
      purchaseId: row.purchaseId,
      supplierName: row.supplierName || (Array.isArray(row.values) ? row.values[0] : "Vendor"),
      supplierPhone: row.supplierPhone,
      supplierEmail: row.supplierEmail,
      date: row.createdAt
        ? new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : Array.isArray(row.values) && row.values[3]
        ? row.values[3]
        : new Date().toLocaleDateString("en-GB"),
      status: row.status || "Draft",
      storeName: "promoteIt Ventures",
      storeLocation: "Adenta-Accountancy, Accra",
      storePhone: "0553898761",
      storeEmail: "orders@promoteit.ventures",
      items:
        row.items && row.items.length > 0
          ? row.items.map((it) => ({
              name: it.name || "Product",
              sku: it.sku,
              quantity: it.quantity,
              unitCost: it.unitCost,
              total: it.total || it.quantity * it.unitCost,
            }))
          : [
              {
                name: "Purchase items batch",
                quantity: 1,
                unitCost: row.totalAmount || 0,
                total: row.totalAmount || 0,
              },
            ],
      totalAmount:
        row.totalAmount ||
        (Array.isArray(row.values) && row.values[2]
          ? parseFloat(row.values[2].replace(/[^0-9.]/g, "")) || 0
          : 0),
    };
  }

  function handleDownloadPO(row: PurchaseRow) {
    downloadPurchaseOrderDocument(getPOData(row));
  }


  function handlePrintPO(row: PurchaseRow) {
    setActivePO({ po: getPOData(row), autoPrint: true });
  }

  function handleViewPO(row: PurchaseRow) {
    setActivePO({ po: getPOData(row), autoPrint: false });
  }

  function openCreate() {
    setEditRow(null);
    setOpen(true);
  }

  function openEdit(row: PurchaseRow) {
    setEditRow(row);
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setEditRow(null);
  }

  return (
    <>
      <ManagementPage
        active="/purchases"
        title="Purchase Orders"
        description="Issue wholesale purchase orders, track vendor deliveries, print PO vouchers, and replenish inventory."
        action="New purchase"
        columns={["Purchase number", "Supplier", "Items purchased", "Order total", "Order date", "Status"]}
        rows={rows as Row[]}
        searchPlaceholder="Search purchase order by number or vendor..."
        filters={["All status", "Draft", "Received", "Cancelled"]}
        onCreate={openCreate}
        renderRowActions={(rawRow) => {
          const row = rawRow as PurchaseRow;
          const isDraft = row.status?.toLowerCase() === "draft";
          return (
            <>
              <button
                className="icon-button"
                onClick={() => handleViewPO(row)}
                title="View & preview Purchase Order"
              >
                <Eye size={15} />
              </button>
              <button
                className="icon-button"
                onClick={() => handleDownloadPO(row)}
                title="Download Purchase Order Document"
              >
                <Download size={15} />
              </button>
              <button
                className="icon-button"
                onClick={() => handlePrintPO(row)}
                title="Print Purchase Order voucher"
              >
                <Printer size={15} />
              </button>
              {isDraft && (
                <button
                  className="icon-button"
                  style={{ color: "var(--status-green)" }}
                  onClick={() => receive(row)}
                  title="Receive stock into inventory"
                >
                  <Truck size={15} />
                </button>
              )}
              {isDraft && (
                <button
                  className="icon-button"
                  onClick={() => openEdit(row)}
                  title="Edit draft purchase order"
                >
                  <Edit3 size={15} />
                </button>
              )}
              <button
                className="icon-button action-delete"
                onClick={() => deletePurchase(row)}
                title="Delete purchase order"
              >
                <Trash2 size={15} />
              </button>
            </>
          );
        }}
      />

      {/* New / Edit Purchase Modal */}
      {open && (
        <PurchaseFormModal
          key={editRow ? editRow.id : "new"}
          editRow={editRow}
          onClose={onClose}
          onSaved={loadPurchases}
        />
      )}

      {/* PO View & Print Modal */}
      {activePO && (
        <PurchaseOrderModal
          po={activePO.po}
          autoPrint={activePO.autoPrint}
          onClose={() => setActivePO(null)}
        />
      )}

      {/* Receive Purchase Confirmation Modal */}
      <ConfirmModal
        isOpen={!!receiveTarget}
        title="Receive Purchase Order"
        subtitle="Inventory Restocking"
        icon={<Truck size={20} />}
        variant="success"
        description={
          <span>
            Receive purchase order <strong>{receiveTarget?.id}</strong>? All purchased items will be immediately added into active store inventory.
          </span>
        }
        itemDetails={
          receiveTarget
            ? [
                { label: "Purchase Number", value: receiveTarget.id },
                { label: "Supplier", value: receiveTarget.supplierName || (Array.isArray(receiveTarget.values) ? receiveTarget.values[0] : "—") },
                { label: "Line Items", value: `${receiveTarget.items?.length || 0} product items` },
                { label: "Total Amount", value: Array.isArray(receiveTarget.values) ? receiveTarget.values[2] : "—" },
              ]
            : []
        }
        confirmLabel="Receive into Inventory"
        isLoading={isReceiving}
        error={receiveError}
        onConfirm={confirmReceive}
        onClose={() => {
          if (!isReceiving) {
            setReceiveTarget(null);
            setReceiveError(null);
          }
        }}
      />

      {/* Delete Purchase Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Purchase Order"
        subtitle="Procurement"
        variant="danger"
        description={
          <span>
            Are you sure you want to permanently delete purchase order <strong>{deleteTarget?.id}</strong>? Any associated purchase items and inventory logs will be deleted. This action cannot be undone.
          </span>
        }
        itemDetails={
          deleteTarget
            ? [
                { label: "Purchase Number", value: deleteTarget.id },
                { label: "Supplier", value: deleteTarget.supplierName || (Array.isArray(deleteTarget.values) ? deleteTarget.values[0] : "—") },
                { label: "Order Total", value: Array.isArray(deleteTarget.values) ? deleteTarget.values[2] : "—" },
                { label: "Current Status", value: deleteTarget.status || "—" },
              ]
            : []
        }
        confirmLabel="Delete Purchase Order"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={confirmDeletePurchase}
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
