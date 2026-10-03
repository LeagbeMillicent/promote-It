"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CircleDollarSign,
  Clock,
  Eye,
  Plus,
  Printer,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SaleCreateModal } from "@/components/sale-create-modal";
import { ProductFormModal } from "@/components/product-form-modal";
import { ExpenseFormModal } from "@/components/expense-form-modal";
import { InventoryAdjustModal } from "@/components/inventory-adjust-modal";
import { ReceiptData, ReceiptModal } from "@/components/receipt-modal";
import { SaleDetailModal, SaleDetailData } from "@/components/sale-detail-modal";
import {
  getCurrentWeekDays,
  getTodayDateString,
  getYesterdayDateString,
  toLocalDateString,
} from "@/lib/date-utils";

type SaleRecord = SaleDetailData & {
  itemsSummary?: string;
};

type ProductRecord = {
  id: string;
  variantId: string;
  values: string[];
  status: string;
  tone: string;
};

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Period filtering on dashboard
  const [period, setPeriod] = useState<"all" | "today" | "yesterday" | "this-week" | "month">("all");
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [saleNotice, setSaleNotice] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptData | null>(null);
  const [viewingSale, setViewingSale] = useState<SaleRecord | null>(null);

  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const yesterdayStr = useMemo(() => getYesterdayDateString(), []);

  // Compute sale counts per day of the week for dots
  const salesCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach((s) => {
      if (s.createdAt) {
        const dStr = toLocalDateString(s.createdAt);
        if (dStr) {
          counts[dStr] = (counts[dStr] || 0) + 1;
        }
      }
    });
    return counts;
  }, [sales]);

  async function openReceipt(sale: SaleDetailData) {
    const saleId = sale.saleId || sale.id;
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
      typeof sale.amount === "number"
        ? sale.amount
        : Number(sale.values?.[1]?.replace("GHS ", "").replace(/,/g, "") || 0);

    const items =
      sale.items && sale.items.length > 0
        ? sale.items.map((i) => ({
            name: i.name,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          }))
        : [
            {
              name: `Sale Transaction ${sale.id}`,
              quantity: 1,
              unitPrice: cleanAmount,
              total: cleanAmount,
            },
          ];

    setViewingReceipt({
      saleNumber: sale.id,
      date: sale.createdAt
        ? new Date(sale.createdAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : sale.values?.[2] || new Date().toLocaleDateString("en-GB"),
      storeName: "promoteIt Ventures",
      storeTagline: "Quality you can trust, service you'll love",
      storeLocation: (!sale.locationName || sale.locationName.toLowerCase().includes("accra central") || sale.locationName.includes("Adenta Down")) ? "Adenta-Accountancy, Accra" : sale.locationName,
      storeAddress: "Adenta-Accountancy, Accra",
      storePhone: "0553898761",
      cashier: sale.cashierName || "Store Attendant",
      customer: sale.customerName || "Walk-in Customer",
      paymentMethod: sale.paymentMethod || sale.values?.[0] || "CASH",
      paymentReference: sale.paymentReference,
      items,
      subtotal: Number(sale.subtotal ?? cleanAmount),
      discount: Number(sale.discount ?? 0),
      total: cleanAmount,
    });
  }

  function loadDashboardData() {
    Promise.all([
      fetch("/api/sales").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/products").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([salesData, productsData]) => {
        setSales(Array.isArray(salesData) ? salesData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    monthsSet.add(currentYearMonth);

    sales.forEach((s) => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [sales]);

  const filteredSales = useMemo(() => {
    const currentWeekDayStrings = new Set(weekDays.map((w) => w.dateString));

    return sales.filter((s) => {
      const rowDateStr = s.createdAt ? toLocalDateString(s.createdAt) : "";

      if (period === "today") {
        return rowDateStr === todayStr;
      } else if (period === "yesterday") {
        return rowDateStr === yesterdayStr;
      } else if (period === "this-week") {
        if (selectedWeekDay !== "all") {
          return rowDateStr === selectedWeekDay;
        }
        return currentWeekDayStrings.has(rowDateStr);
      } else if (period === "month") {
        if (selectedMonth !== "all" && (!s.createdAt || !s.createdAt.startsWith(selectedMonth))) {
          return false;
        }
        return true;
      }
      return true;
    });
  }, [sales, period, selectedWeekDay, selectedMonth, weekDays, todayStr, yesterdayStr]);

  const totalRecordedSales = useMemo(() => {
    return filteredSales
      .filter((s) => (s.status || "Paid").toLowerCase() === "paid")
      .reduce((sum, s) => {
        if (typeof s.amount === "number") return sum + s.amount;
        const amountStr = s.values?.[1] ? s.values[1].replace("GHS ", "").replace(/,/g, "") : "0";
        return sum + (Number(amountStr) || 0);
      }, 0);
  }, [filteredSales]);

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
      const paidWeekSales = filteredSales.filter((r) => r.status === "Paid");
      const activeDays = new Set(paidWeekSales.map((r) => (r.createdAt ? toLocalDateString(r.createdAt) : ""))).size;
      const avg = totalRecordedSales / Math.max(activeDays, 1);
      return {
        dailySalesAmount: avg,
        dailyLabel: "Weekly daily avg",
        dailySubtext: `${activeDays} active sales ${activeDays === 1 ? "day" : "days"} this week`,
      };
    } else if (period === "month") {
      const paidMonthSales = filteredSales.filter((r) => r.status === "Paid");
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
      const todaySales = sales
        .filter((s) => s.status === "Paid")
        .filter((s) => (s.createdAt ? toLocalDateString(s.createdAt) === todayStr : false));
      const todaySum = todaySales.reduce((sum, s) => {
        if (typeof s.amount === "number") return sum + s.amount;
        const str = s.values?.[1] ? s.values[1].replace("GHS ", "").replace(/,/g, "") : "0";
        return sum + (Number(str) || 0);
      }, 0);
      return {
        dailySalesAmount: todaySum,
        dailyLabel: "Daily sales",
        dailySubtext: "Today's sales",
      };
    }
  }, [period, selectedWeekDay, totalRecordedSales, filteredSales, sales, selectedMonth, todayStr, weekDays]);

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

  const periodCounts = useMemo(() => {
    const currentWeekDayStrings = new Set(weekDays.map((w) => w.dateString));
    let todayCount = 0;
    let yesterdayCount = 0;
    let weekCount = 0;

    sales.forEach((s) => {
      const dStr = s.createdAt ? toLocalDateString(s.createdAt) : "";
      if (dStr === todayStr) todayCount++;
      if (dStr === yesterdayStr) yesterdayCount++;
      if (currentWeekDayStrings.has(dStr)) weekCount++;
    });

    return { todayCount, yesterdayCount, weekCount, allCount: sales.length };
  }, [sales, todayStr, yesterdayStr, weekDays]);

  const lowStockProducts = products.filter(
    (p) => p.status === "Low stock" || p.status === "Critical" || p.status === "Out of stock"
  );

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell active="/">
      <div className="page-wrap dashboard-page">
        {saleNotice && (
          <div className="inline-notice">
            <Sparkles size={16} /> {saleNotice}
          </div>
        )}

        <section className="page-heading">
          <div>
            <h1>{greeting()}, Kofi</h1>
            <p>
              {todayFormatted} · Adenta-Accountancy, Accra
            </p>
          </div>
          <div className="heading-actions">
            <button className="secondary-button" onClick={() => setExpenseModalOpen(true)}>
              <WalletCards size={16} /> Record expense
            </button>
            <button className="primary-button" onClick={() => setSaleModalOpen(true)}>
              <ShoppingCart size={17} /> New sale
            </button>
          </div>
        </section>

        {/* Quick Action Navigation Bar */}
        <section className="quick-action-bar">
          <span className="quick-action-title">Quick actions:</span>
          <button className="secondary-button" onClick={() => setSaleModalOpen(true)}>
            <Plus size={15} /> Make sale
          </button>
          <button className="secondary-button" onClick={() => setProductModalOpen(true)}>
            <Plus size={15} /> Add product
          </button>
          <button className="secondary-button" onClick={() => setAdjustModalOpen(true)}>
            <Boxes size={15} /> Adjust inventory
          </button>
          <Link href="/reports" className="secondary-button">
            <TrendingUp size={15} /> View reports
          </Link>
        </section>

        {/* Period Filter Bar for Dashboard */}
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
                  aria-label="Filter sales by month"
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
                  Filter dashboard by days in the week:
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
                      title={`Filter dashboard for ${day.fullDayName}, ${day.formattedDate}`}
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

        {/* Live Metrics Grid */}
        <section className="stats-grid">
          <StatCard
            tone="blue"
            icon={<CircleDollarSign size={20} />}
            title="Total recorded sales"
            value={`GHS ${totalRecordedSales.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`}
            change={activePeriodLabel}
            isPositive={true}
          />
          <StatCard
            tone="purple"
            icon={<TrendingUp size={20} />}
            title={dailyLabel}
            value={`GHS ${dailySalesAmount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`}
            change={dailySubtext}
            isPositive={true}
          />
          <StatCard
            tone="green"
            icon={<Receipt size={20} />}
            title="Sales"
            value={String(filteredSales.filter((s) => s.status === "Paid").length)}
            change={period === "all" ? "Paid transactions" : `${filteredSales.length} in period`}
            isPositive={true}
          />
          <StatCard
            tone="amber"
            icon={<AlertTriangle size={20} />}
            title="Stock alerts"
            value={String(lowStockProducts.length)}
            change={lowStockProducts.length > 0 ? "Requires reordering" : "Optimal inventory"}
            isPositive={lowStockProducts.length === 0}
          />
        </section>

        {/* Overview Panes */}
        <section className="dashboard-empty-grid">
          {/* Recent Sales Panel */}
          <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="records-toolbar">
              <div>
                <h2>Recent transactions ({activePeriodLabel})</h2>
                <p>Latest customer purchases, items bought, and receipts</p>
              </div>
              <Link href="/sales" className="text-button">
                View all sales <ArrowRight size={14} style={{ marginLeft: "4px" }} />
              </Link>
            </div>
            {filteredSales.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sale No.</th>
                      <th>Items bought</th>
                      <th>Payment</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.slice(0, 6).map((sale) => {
                      const itemsQty =
                        sale.totalQuantity ??
                        (sale.items?.reduce((acc, it) => acc + it.quantity, 0) || 1);
                      const itemsSummaryText =
                        sale.itemsSummary ||
                        (sale.items && sale.items[0]
                          ? `${sale.items[0].quantity}× ${sale.items[0].name}${
                              sale.items.length > 1 ? ` +${sale.items.length - 1} more` : ""
                            }`
                          : "1 item");

                      return (
                        <tr
                          key={sale.id}
                          className="clickable-sale-row"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button")) return;
                            setViewingSale(sale);
                          }}
                        >
                          <td>
                            <button
                              type="button"
                              className="sale-id-button"
                              onClick={() => setViewingSale(sale)}
                              title="Click to view sale details & items bought"
                            >
                              <strong className="record-id">{sale.id}</strong>
                            </button>
                          </td>
                          <td>
                            <div
                              className="sale-items-preview-cell"
                              onClick={() => setViewingSale(sale)}
                              title="Click to view items bought"
                            >
                              <span className="sale-items-qty-pill">
                                {itemsQty} {itemsQty === 1 ? "unit" : "units"}
                              </span>
                              <span className="sale-items-names-preview">{itemsSummaryText}</span>
                            </div>
                          </td>
                          <td>{sale.paymentMethod || sale.values?.[0] || "CASH"}</td>
                          <td>
                            <strong>
                              GHS{" "}
                              {(typeof sale.amount === "number"
                                ? sale.amount
                                : Number(
                                    sale.values?.[1]?.replace("GHS ", "").replace(/,/g, "") || 0
                                  )
                              ).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                (sale.status || "Paid").toLowerCase() === "paid"
                                  ? "status-green"
                                  : "status-red"
                              }`}
                            >
                              {(sale.status || "Paid").toLowerCase() === "paid" ? "Paid" : "Not Paid"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="row-action-group" style={{ justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => setViewingSale(sale)}
                                title="View items bought & details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => openReceipt(sale)}
                                title="View & Print receipt"
                              >
                                <Printer size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-dashboard-panel">
                <div className="empty-icon">
                  <ShoppingCart size={22} />
                </div>
                <h2>No sales recorded for this period</h2>
                <p>Start recording checkout transactions or switch period filter to see sales.</p>
                <button
                  className="primary-button"
                  style={{ marginTop: "14px" }}
                  onClick={() => setSaleModalOpen(true)}
                >
                  <Plus size={16} /> Record sale
                </button>
              </div>
            )}
          </div>

          {/* Inventory Health Panel */}
          <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="records-toolbar">
              <div>
                <h2>Inventory health</h2>
                <p>Stock levels and reorder monitoring</p>
              </div>
              <Link href="/inventory" className="text-button">
                Manage stock <ArrowRight size={14} style={{ marginLeft: "4px" }} />
              </Link>
            </div>
            {lowStockProducts.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.values[0]}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                            {p.values[3]}
                          </span>
                        </td>
                        <td>{p.values[5]}</td>
                        <td>
                          <span className={`status-badge status-${p.tone ?? "orange"}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-dashboard-panel">
                <div className="empty-icon">
                  <Boxes size={22} />
                </div>
                <h2>{loading ? "Checking stock..." : "Stock levels are healthy"}</h2>
                <p>
                  {products.length === 0
                    ? "Add your store's products to track inventory and receive automated alerts."
                    : "All catalog items are currently above their reorder thresholds."}
                </p>
                {products.length === 0 && (
                  <button
                    className="primary-button"
                    style={{ marginTop: "14px" }}
                    onClick={() => setProductModalOpen(true)}
                  >
                    <Plus size={16} /> Add initial products
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modals */}
      {saleModalOpen && (
        <SaleCreateModal
          onClose={() => setSaleModalOpen(false)}
          onSaved={(saleNumber) => {
            setSaleNotice(`Sale ${saleNumber} completed successfully!`);
            setSaleModalOpen(false);
            loadDashboardData();
          }}
        />
      )}
      {productModalOpen && (
        <ProductFormModal
          onClose={() => setProductModalOpen(false)}
          onSaved={() => {
            setProductModalOpen(false);
            loadDashboardData();
          }}
        />
      )}
      {expenseModalOpen && (
        <ExpenseFormModal
          onClose={() => setExpenseModalOpen(false)}
          onSaved={() => {
            setExpenseModalOpen(false);
            loadDashboardData();
          }}
        />
      )}
      {adjustModalOpen && (
        <InventoryAdjustModal
          onClose={() => setAdjustModalOpen(false)}
          onSaved={() => {
            setAdjustModalOpen(false);
            loadDashboardData();
          }}
        />
      )}

      {/* Sale Detail Inspection Modal */}
      {viewingSale && (
        <SaleDetailModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
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
    </AppShell>
  );
}

function StatCard({
  tone,
  icon,
  title,
  value,
  change,
  isPositive,
}: {
  tone: "blue" | "green" | "amber" | "purple";
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-card-top">
        <span className="stat-icon">{icon}</span>
        <span className={`stat-change ${isPositive ? "positive" : "negative"}`}>{change}</span>
      </div>
      <span className="stat-title">{title}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}
