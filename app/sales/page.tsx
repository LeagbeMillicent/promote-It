"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Download,
  Eye,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SaleCreateModal } from "@/components/sale-create-modal";
import { ReceiptData, ReceiptModal } from "@/components/receipt-modal";
import { SaleDetailModal, SaleDetailData } from "@/components/sale-detail-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  getCurrentWeekDays,
  getTodayDateString,
  getYesterdayDateString,
  toLocalDateString,
} from "@/lib/date-utils";

type SaleRow = SaleDetailData & {
  itemsSummary?: string;
};

function exportCSV(rows: SaleRow[]) {
  const columns = [
    "Sale number",
    "Items bought",
    "Total units",
    "Payment method",
    "Amount (GHS)",
    "Date",
    "Customer",
    "Cashier",
    "Status",
  ];
  const header = columns.map((col) => `"${col.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((row) => {
      const itemsText =
        row.items && row.items.length > 0
          ? row.items.map((i) => `${i.quantity}x ${i.name}`).join("; ")
          : row.itemsSummary || "1 item";
      const totalUnits =
        row.totalQuantity ?? (row.items?.reduce((s, i) => s + i.quantity, 0) ?? 1);
      const cleanAmount =
        typeof row.amount === "number"
          ? row.amount.toFixed(2)
          : row.values?.[1]?.replace("GHS ", "").replace(/,/g, "") || "0.00";
      const dateText = row.createdAt
        ? new Date(row.createdAt).toLocaleString("en-GB")
        : row.values?.[2] || "";

      const cellValues = [
        row.id,
        itemsText,
        totalUnits,
        row.paymentMethod || row.values?.[0] || "CASH",
        cleanAmount,
        dateText,
        row.customerName || "Walk-in Customer",
        row.cashierName || "Staff",
        row.status || "Paid",
      ];
      return cellValues.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
    })
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");

  // Filter periods: "all" | "today" | "yesterday" | "this-week" | "month"
  const [period, setPeriod] = useState<"all" | "today" | "yesterday" | "this-week" | "month">("all");
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>("all"); // "all" or "YYYY-MM-DD"
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null);
  const [viewingSale, setViewingSale] = useState<SaleRow | null>(null);

  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const yesterdayStr = useMemo(() => getYesterdayDateString(), []);

  // Compute sale counts per day of the week for dots and indicators
  const salesCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.createdAt) {
        const dStr = toLocalDateString(r.createdAt);
        if (dStr) {
          counts[dStr] = (counts[dStr] || 0) + 1;
        }
      }
    });
    return counts;
  }, [rows]);

  async function openReceipt(row: SaleDetailData) {
    const saleId = row.saleId || row.id;
    try {
      const res = await fetch(`/api/sales/${saleId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.receipt) {
          setViewingReceipt(data.receipt);
          return;
        }
      }
    } catch {
      // ignore
    }

    const cleanAmount =
      typeof row.amount === "number"
        ? row.amount
        : Number(row.values?.[1]?.replace("GHS ", "").replace(/,/g, "") || 0);

    const items =
      row.items && row.items.length > 0
        ? row.items.map((i) => ({
            name: i.name,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          }))
        : [
            {
              name: `Sale Transaction ${row.id}`,
              quantity: 1,
              unitPrice: cleanAmount,
              total: cleanAmount,
            },
          ];

    setViewingReceipt({
      saleNumber: row.id,
      date: row.createdAt
        ? new Date(row.createdAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : row.values?.[2] || new Date().toLocaleDateString("en-GB"),
      storeName: "promoteIt Ventures",
      storeTagline: "Quality you can trust, service you'll love",
      storeLocation: (!row.locationName || row.locationName.toLowerCase().includes("accra central") || row.locationName.includes("Adenta Down")) ? "Adenta-Accountancy, Accra" : row.locationName,
      storeAddress: "Adenta-Accountancy, Accra",
      storePhone: "0553898761",
      cashier: row.cashierName || "Store Attendant",
      customer: row.customerName || "Walk-in Customer",
      paymentMethod: row.paymentMethod || row.values?.[0] || "CASH",
      paymentReference: row.paymentReference,
      items,
      subtotal: Number(row.subtotal ?? cleanAmount),
      discount: Number(row.discount ?? 0),
      total: cleanAmount,
    });
  }

  function loadSales() {
    fetch("/api/sales")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadSales();
  }, []);

  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    monthsSet.add(currentYearMonth);

    rows.forEach((r) => {
      if (r.createdAt) {
        const d = new Date(r.createdAt);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [rows]);

  const [statusTarget, setStatusTarget] = useState<{
    row: SaleRow;
    nextStatus: string;
    isCurrentlyPaid: boolean;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  function toggleSaleStatus(row: SaleRow) {
    const isCurrentlyPaid = (row.status || "Paid").toLowerCase() === "paid";
    const nextStatus = isCurrentlyPaid ? "Not Paid" : "Paid";
    setStatusError(null);
    setStatusTarget({ row, nextStatus, isCurrentlyPaid });
  }

  async function confirmToggleStatus() {
    if (!statusTarget) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/sales/${statusTarget.row.saleId || statusTarget.row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTarget.isCurrentlyPaid ? "CANCELLED" : "COMPLETED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || "Failed to update sale status");
        setIsUpdatingStatus(false);
        return;
      }
      setIsUpdatingStatus(false);
      setStatusTarget(null);
      loadSales();
    } catch {
      setStatusError("Network error while updating sale status");
      setIsUpdatingStatus(false);
    }
  }

  function openCreate() {
    setNotice("");
    setOpen(true);
  }

  function onSaved(saleNumber: string) {
    setNotice(`Sale ${saleNumber} recorded successfully`);
    setOpen(false);
    loadSales();
  }

  // Filter rows based on: Period (Today, Yesterday, This Week + Day chips, Month, All), Query, Status
  const filteredRows = useMemo(() => {
    const currentWeekDayStrings = new Set(weekDays.map((w) => w.dateString));

    return rows.filter((row) => {
      const rowDateStr = row.createdAt ? toLocalDateString(row.createdAt) : "";

      // 1. Period Filtering
      if (period === "today") {
        if (rowDateStr !== todayStr) return false;
      } else if (period === "yesterday") {
        if (rowDateStr !== yesterdayStr) return false;
      } else if (period === "this-week") {
        if (selectedWeekDay !== "all") {
          if (rowDateStr !== selectedWeekDay) return false;
        } else {
          if (!currentWeekDayStrings.has(rowDateStr)) return false;
        }
      } else if (period === "month") {
        if (selectedMonth !== "all" && (!row.createdAt || !row.createdAt.startsWith(selectedMonth))) {
          return false;
        }
      }

      // 2. Text Search Query
      const itemsNames = (row.items || []).map((it) => `${it.name} ${it.sku || ""}`).join(" ");
      const rowText = `${row.id} ${row.paymentMethod || ""} ${row.customerName || ""} ${row.cashierName || ""} ${itemsNames} ${row.values?.join(" ") || ""}`.toLowerCase();
      if (query && !rowText.includes(query.toLowerCase())) return false;

      // 3. Status Filtering
      if (statusFilter !== "All status") {
        const rowStatus = (row.status || "Paid").toLowerCase();
        const targetStatus = statusFilter.toLowerCase();
        if (targetStatus === "not paid") {
          if (rowStatus !== "not paid" && rowStatus !== "cancelled") return false;
        } else if (targetStatus === "paid") {
          if (rowStatus !== "paid") return false;
        } else if (rowStatus !== targetStatus) {
          return false;
        }
      }

      return true;
    });
  }, [rows, period, selectedWeekDay, selectedMonth, query, statusFilter, weekDays, todayStr, yesterdayStr]);

  // Total recorded sales for the filtered view
  const totalRecordedSales = useMemo(() => {
    return filteredRows
      .filter((r) => (r.status || "Paid").toLowerCase() === "paid")
      .reduce((sum, r) => {
        if (typeof r.amount === "number") return sum + r.amount;
        const amountStr = r.values?.[1] ? r.values[1].replace("GHS ", "").replace(/,/g, "") : "0";
        return sum + (Number(amountStr) || 0);
      }, 0);
  }, [filteredRows]);

  // Dynamic KPI for secondary metric card (Daily sales / Period sales)
  const { dailySalesAmount, dailyLabel, dailySubtext } = useMemo(() => {
    if (period === "today") {
      return {
        dailySalesAmount: totalRecordedSales,
        dailyLabel: "Today's sales",
        dailySubtext: "Live revenue today",
      };
    } else if (period === "yesterday") {
      return {
        dailySalesAmount: totalRecordedSales,
        dailyLabel: "Yesterday's sales",
        dailySubtext: "Previous business day",
      };
    } else if (period === "this-week") {
      if (selectedWeekDay !== "all") {
        const matchingDay = weekDays.find((d) => d.dateString === selectedWeekDay);
        return {
          dailySalesAmount: totalRecordedSales,
          dailyLabel: `${matchingDay?.dayName || "Day"} revenue`,
          dailySubtext: matchingDay ? `${matchingDay.formattedDate}` : "Selected day",
        };
      }
      const paidWeekSales = filteredRows.filter((r) => (r.status || "Paid").toLowerCase() === "paid");
      const activeDays = new Set(paidWeekSales.map((r) => (r.createdAt ? toLocalDateString(r.createdAt) : ""))).size;
      const avg = totalRecordedSales / Math.max(activeDays, 1);
      return {
        dailySalesAmount: avg,
        dailyLabel: "Weekly daily avg",
        dailySubtext: `${activeDays} active sales ${activeDays === 1 ? "day" : "days"} this week`,
      };
    } else if (period === "month") {
      const paidMonthSales = filteredRows.filter((r) => (r.status || "Paid").toLowerCase() === "paid");
      const activeDays = new Set(paidMonthSales.map((r) => (r.createdAt ? toLocalDateString(r.createdAt) : ""))).size;
      const avg = totalRecordedSales / Math.max(activeDays, 1);
      const [year, month] = selectedMonth.split("-");
      const monthLabel =
        selectedMonth === "all"
          ? "All"
          : new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "short" });
      return {
        dailySalesAmount: avg,
        dailyLabel: `Daily avg (${monthLabel})`,
        dailySubtext: `${activeDays} active days recorded`,
      };
    } else {
      // All time
      const todaySales = rows
        .filter((r) => (r.status || "Paid").toLowerCase() === "paid")
        .filter((r) => (r.createdAt ? toLocalDateString(r.createdAt) === todayStr : false));
      const todaySum = todaySales.reduce((sum, r) => {
        if (typeof r.amount === "number") return sum + r.amount;
        const str = r.values?.[1] ? r.values[1].replace("GHS ", "").replace(/,/g, "") : "0";
        return sum + (Number(str) || 0);
      }, 0);
      return {
        dailySalesAmount: todaySum,
        dailyLabel: "Daily sales",
        dailySubtext: "Today's sales",
      };
    }
  }, [period, selectedWeekDay, totalRecordedSales, filteredRows, rows, selectedMonth, todayStr, weekDays]);

  const activePeriodLabel = useMemo(() => {
    if (period === "today") return "Today";
    if (period === "yesterday") return "Yesterday";
    if (period === "this-week") {
      if (selectedWeekDay !== "all") {
        const found = weekDays.find((d) => d.dateString === selectedWeekDay);
        return found ? `${found.fullDayName} (${found.formattedDate})` : "Selected Day";
      }
      return "This Week";
    }
    if (period === "month") {
      if (selectedMonth === "all") return "All Months";
      const [year, month] = selectedMonth.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    return "All Time";
  }, [period, selectedWeekDay, selectedMonth, weekDays]);

  // Counts for period tab pills
  const periodCounts = useMemo(() => {
    const currentWeekDayStrings = new Set(weekDays.map((w) => w.dateString));
    let todayCount = 0;
    let yesterdayCount = 0;
    let weekCount = 0;

    rows.forEach((r) => {
      const dStr = r.createdAt ? toLocalDateString(r.createdAt) : "";
      if (dStr === todayStr) todayCount++;
      if (dStr === yesterdayStr) yesterdayCount++;
      if (currentWeekDayStrings.has(dStr)) weekCount++;
    });

    return { todayCount, yesterdayCount, weekCount, allCount: rows.length };
  }, [rows, todayStr, yesterdayStr, weekDays]);

  return (
    <AppShell active="/sales">
      <div className="page-wrap management-page">
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <ShoppingCart size={14} /> Sales & payments
            </div>
            <h1>Sales Transactions</h1>
            <p>Monitor point-of-sale activity, individual purchased items, and filter by day or week.</p>
          </div>
          <div className="heading-actions">
            <button
              className="secondary-button"
              onClick={() => exportCSV(filteredRows)}
              title="Export sales to CSV"
            >
              <Download size={16} /> Export CSV
            </button>
            <button className="primary-button" onClick={openCreate}>
              <Plus size={17} /> New sale
            </button>
          </div>
        </section>

        {notice && <div className="inline-notice">{notice}</div>}

        {/* Days & Weekly Filter Navigation Bar */}
        <section className="period-filter-section">
          <div className="period-filter-bar">
            <div className="period-tabs">
              <button
                type="button"
                className={`period-tab ${period === "all" ? "active" : ""}`}
                onClick={() => {
                  setPeriod("all");
                  setSelectedWeekDay("all");
                }}
              >
                All Time
                <span className="period-tab-badge">{periodCounts.allCount}</span>
              </button>

              <button
                type="button"
                className={`period-tab ${period === "today" ? "active" : ""}`}
                onClick={() => {
                  setPeriod("today");
                  setSelectedWeekDay("all");
                }}
              >
                <Clock size={13} />
                Today
                <span className="period-tab-badge">{periodCounts.todayCount}</span>
              </button>

              <button
                type="button"
                className={`period-tab ${period === "yesterday" ? "active" : ""}`}
                onClick={() => {
                  setPeriod("yesterday");
                  setSelectedWeekDay("all");
                }}
              >
                Yesterday
                <span className="period-tab-badge">{periodCounts.yesterdayCount}</span>
              </button>

              <button
                type="button"
                className={`period-tab ${period === "this-week" ? "active" : ""}`}
                onClick={() => {
                  setPeriod("this-week");
                  setSelectedWeekDay("all");
                }}
              >
                <Calendar size={13} />
                This Week
                <span className="period-tab-badge">{periodCounts.weekCount}</span>
              </button>

              <button
                type="button"
                className={`period-tab ${period === "month" ? "active" : ""}`}
                onClick={() => {
                  setPeriod("month");
                  setSelectedWeekDay("all");
                }}
              >
                Monthly
              </button>
            </div>

            {period === "month" && (
              <div className="period-month-select-wrap">
                <span className="period-month-label">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="month-select"
                  aria-label="Select month"
                >
                  <option value="all">All months</option>
                  {monthOptions.map((ym) => {
                    const [year, month] = ym.split("-");
                    const date = new Date(Number(year), Number(month) - 1, 1);
                    const label = date.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    });
                    return (
                      <option key={ym} value={ym}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Days of the Week Selector Bar */}
          {period === "this-week" && (
            <div className="week-days-container">
              <div className="week-days-header">
                <span className="week-days-title">
                  Filter by days in the week (Monday – Sunday):
                </span>
                <button
                  type="button"
                  className={`week-day-chip ${selectedWeekDay === "all" ? "active" : ""}`}
                  onClick={() => setSelectedWeekDay("all")}
                >
                  All Days ({periodCounts.weekCount} sales)
                </button>
              </div>

              <div className="week-days-grid">
                {weekDays.map((day) => {
                  const daySalesCount = salesCountByDate[day.dateString] || 0;
                  const isSelected = selectedWeekDay === day.dateString;
                  return (
                    <button
                      key={day.dateString}
                      type="button"
                      className={`week-day-card ${isSelected ? "active" : ""} ${
                        day.isToday ? "is-today" : ""
                      }`}
                      onClick={() => setSelectedWeekDay(day.dateString)}
                      title={`Filter sales for ${day.fullDayName}, ${day.formattedDate}`}
                    >
                      <div className="week-day-card-top">
                        <span className="week-day-name">{day.dayName}</span>
                        {day.isToday && <span className="today-micro-badge">Today</span>}
                      </div>
                      <strong className="week-day-num">{day.dayNumber}</strong>
                      <div className="week-day-sales-indicator">
                        {daySalesCount > 0 ? (
                          <span className="day-sale-pill">
                            <span className="day-sale-dot" /> {daySalesCount}{" "}
                            {daySalesCount === 1 ? "sale" : "sales"}
                          </span>
                        ) : (
                          <span className="day-no-sale">No sales</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Dynamic KPI Metrics */}
        <section className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-card-top">
              <span className="stat-icon">
                <CircleDollarSign size={20} />
              </span>
              <span className="stat-change positive">{activePeriodLabel}</span>
            </div>
            <span className="stat-title">Total recorded sales</span>
            <strong className="stat-value">
              GHS {totalRecordedSales.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="stat-card purple">
            <div className="stat-card-top">
              <span className="stat-icon">
                <TrendingUp size={20} />
              </span>
              <span className="stat-change positive">{dailySubtext}</span>
            </div>
            <span className="stat-title">{dailyLabel}</span>
            <strong className="stat-value">
              GHS {dailySalesAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="stat-card green">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Receipt size={20} />
              </span>
              <span className="stat-change positive">
                {period === "all" ? "Paid" : activePeriodLabel}
              </span>
            </div>
            <span className="stat-title">Paid sales completed</span>
            <strong className="stat-value">
              {filteredRows.filter((r) => (r.status || "Paid").toLowerCase() === "paid").length}
            </strong>
          </div>
        </section>

        {/* Sales Table Panel */}
        <section className="panel records-panel">
          <div className="records-toolbar">
            <div>
              <h2>Sales history ({activePeriodLabel})</h2>
              <p>
                {filteredRows.length} {filteredRows.length === 1 ? "sale" : "sales"} found
              </p>
            </div>
            <div className="toolbar-actions">
              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sale, product, customer..."
                />
              </div>
              <div className="filter-group">
                {["All status", "Paid", "Not Paid"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-chip ${statusFilter === option ? "active" : ""}`}
                    onClick={() => setStatusFilter(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="table-wrap records-table">
            <table>
              <thead>
                <tr>
                  <th>Sale number</th>
                  <th>Items bought (Qty)</th>
                  <th>Payment method</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="row-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const itemsQty =
                    row.totalQuantity ??
                    (row.items?.reduce((acc, it) => acc + it.quantity, 0) || 1);
                  const itemsSummaryText =
                    row.itemsSummary ||
                    (row.items && row.items[0]
                      ? `${row.items[0].quantity}× ${row.items[0].name}${
                          row.items.length > 1 ? ` +${row.items.length - 1} more` : ""
                        }`
                      : "1 item");

                  return (
                    <tr
                      key={row.id}
                      className="clickable-sale-row"
                      onClick={(e) => {
                        // Prevent triggering if clicked on action button
                        if ((e.target as HTMLElement).closest("button")) return;
                        setViewingSale(row);
                      }}
                    >
                      <td>
                        <button
                          type="button"
                          className="sale-id-button"
                          onClick={() => setViewingSale(row)}
                          title="Click to view sale details & items bought"
                        >
                          <strong className="record-id">{row.id}</strong>
                        </button>
                      </td>

                      <td>
                        <div
                          className="sale-items-preview-cell"
                          onClick={() => setViewingSale(row)}
                          title="Click to view full sale items and quantities"
                        >
                          <span className="sale-items-qty-pill">
                            {itemsQty} {itemsQty === 1 ? "unit" : "units"}
                          </span>
                          <span className="sale-items-names-preview">{itemsSummaryText}</span>
                        </div>
                      </td>

                      <td>
                        <span className="payment-method-text">
                          {row.paymentMethod || row.values?.[0] || "CASH"}
                        </span>
                      </td>

                      <td>
                        <strong className="sale-amount-text">
                          GHS{" "}
                          {(typeof row.amount === "number"
                            ? row.amount
                            : Number(
                                row.values?.[1]?.replace("GHS ", "").replace(/,/g, "") || 0
                              )
                          ).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                        </strong>
                      </td>

                      <td>
                        <span className="sale-date-text">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : row.values?.[2] || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            (row.status || "Paid").toLowerCase() === "paid"
                              ? "status-green"
                              : "status-red"
                          }`}
                        >
                          {(row.status || "Paid").toLowerCase() === "paid" ? "Paid" : "Not Paid"}
                        </span>
                      </td>

                      <td>
                        <div className="row-action-group">
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setViewingSale(row)}
                            title="View items bought & details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openReceipt(row)}
                            title="Print thermal receipt"
                          >
                            <Printer size={15} />
                          </button>
                          {(row.status || "Paid").toLowerCase() === "paid" ? (
                            <button
                              type="button"
                              className="icon-button action-delete"
                              onClick={() => toggleSaleStatus(row)}
                              title="Mark sale as Not Paid"
                            >
                              <XCircle size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="icon-button"
                              style={{ color: "var(--status-green)" }}
                              onClick={() => toggleSaleStatus(row)}
                              title="Mark sale as Paid"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <ShoppingCart size={22} />
                </div>
                <strong>No sales found for this period</strong>
                <span>
                  {period !== "all"
                    ? `Try changing the period filter from "${activePeriodLabel}" or click "New sale".`
                    : 'Click "New sale" to begin recording transactions.'}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {open && <SaleCreateModal onClose={() => setOpen(false)} onSaved={onSaved} />}

      {/* Sale Detail Inspection Modal */}
      {viewingSale && (
        <SaleDetailModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
          onToggleStatus={(sale) => {
            toggleSaleStatus(sale as SaleRow);
            setViewingSale(null);
          }}
          onPrintReceipt={(sale) => {
            setViewingSale(null);
            openReceipt(sale);
          }}
        />
      )}

      {/* 80mm XP-E200L / XP-E260L POS Thermal Receipt Modal */}
      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Sale Status Confirmation Modal */}
      <ConfirmModal
        isOpen={!!statusTarget}
        title="Update Sale Status"
        subtitle="Billing & Ledger Reconciliation"
        variant={statusTarget?.isCurrentlyPaid ? "warning" : "success"}
        confirmLabel={statusTarget?.isCurrentlyPaid ? "Mark as Not Paid" : "Mark as Paid"}
        description={
          <span>
            Change payment status for transaction <strong>{statusTarget?.row.id}</strong> to{" "}
            <strong>{statusTarget?.nextStatus}</strong>?
          </span>
        }
        itemDetails={
          statusTarget
            ? [
                { label: "Sale Number", value: statusTarget.row.id },
                { label: "Customer", value: statusTarget.row.customerName || (Array.isArray(statusTarget.row.values) ? statusTarget.row.values[0] : "Walk-in") },
                { label: "Total Amount", value: Array.isArray(statusTarget.row.values) ? statusTarget.row.values[3] : `GHS ${Number(statusTarget.row.total).toFixed(2)}` },
                { label: "Current Status", value: statusTarget.row.status || "Paid" },
                { label: "New Status", value: statusTarget.nextStatus },
              ]
            : []
        }
        isLoading={isUpdatingStatus}
        error={statusError}
        onConfirm={confirmToggleStatus}
        onClose={() => {
          if (!isUpdatingStatus) {
            setStatusTarget(null);
            setStatusError(null);
          }
        }}
      />
    </AppShell>
  );
}
