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

  const [cancelTarget, setCancelTarget] = useState<PurchaseRow | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  function cancelPurchase(row: PurchaseRow) {
    setCancelError(null);
    setCancelTarget(row);
  }

  async function confirmCancelPurchase() {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/purchases/${cancelTarget.purchaseId || cancelTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || "Failed to cancel purchase order");
        setIsCancelling(false);
        return;
      }
      setIsCancelling(false);
      setCancelTarget(null);
      loadPurchases();
    } catch {
      setCancelError("Network error while cancelling purchase order");
      setIsCancelling(false);
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
                onClick={() => cancelPurchase(row)}
                title="Cancel purchase order"
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

      {/* Cancel Purchase Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Purchase Order"
        subtitle="Procurement"
        variant="danger"
        description={
          <span>
            Are you sure you want to cancel purchase order <strong>{cancelTarget?.id}</strong>?
          </span>
        }
        itemDetails={
          cancelTarget
            ? [
                { label: "Purchase Number", value: cancelTarget.id },
                { label: "Supplier", value: cancelTarget.supplierName || (Array.isArray(cancelTarget.values) ? cancelTarget.values[0] : "—") },
                { label: "Order Total", value: Array.isArray(cancelTarget.values) ? cancelTarget.values[2] : "—" },
                { label: "Current Status", value: cancelTarget.status || "—" },
              ]
            : []
        }
        confirmLabel="Cancel Purchase Order"
        isLoading={isCancelling}
        error={cancelError}
        onConfirm={confirmCancelPurchase}
        onClose={() => {
          if (!isCancelling) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
      />
    </>
  );
}
