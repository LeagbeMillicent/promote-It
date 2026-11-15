"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  Download,
  Layers,
  Package,
  Receipt,
  Search,
  Tag,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";

type MonthBreakdownItem = {
  key: string;
  label: string;
  shortLabel: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  margin: number;
  transactionsCount: number;
  unitsSold: number;
  topExpenseCategory: string;
};

type CurrentStockSummary = {
  totalUnits: number;
  totalRetailValue: number;
  totalCostValue: number;
  projectedProfit: number;
  projectedMargin: number;
  totalProducts: number;
  totalVariants: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
};

type InventoryStockItem = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  stock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  totalRetail: number;
  totalCost: number;
  potentialProfit: number;
  status: string;
};

type ExpenseCategoryItem = {
  category: string;
  amount: number;
  share: number;
};

type CategoryReport = {
  id: string;
  name: string;
  productCount: number;
  variantCount: number;
  totalItems: number;
  totalAmount: number;
  totalCostAmount: number;
  unitsSold: number;
  totalRevenue: number;
  valueShare: number;
};

type ReportData = {
  summary: {
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    margin: number;
    transactionsCount: number;
    averageOrderValue: number;
    unitsSold: number;
    totalInventoryValue: number;
    totalInventoryItems: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  selectedMonth: string;
  selectedMonthLabel: string;
  availableMonths: { key: string; label: string; isCurrent: boolean }[];
  monthlyBreakdown: MonthBreakdownItem[];
  currentStock: CurrentStockSummary;
  inventoryItems: InventoryStockItem[];
  expensesByCategory: ExpenseCategoryItem[];
  dailyTrends: { date: string; revenue: number; expenses: number; profit: number }[];
  paymentBreakdown: { name: string; value: number }[];
  categoryBreakdown: CategoryReport[];
  topProducts: { name: string; sku: string; unitsSold: number; revenue: number }[];
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

function formatMoney(amount: number): string {
  return `GHS ${Number(amount || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"monthly" | "stock" | "categories">("monthly");

  // Stock table search and filter
  const [inventorySearch, setInventorySearch] = useState<string>("");
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("ALL");
  const [inventoryPage, setInventoryPage] = useState<number>(1);
  const inventoryPageSize = 10;

  // Category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [categoryPage, setCategoryPage] = useState<number>(1);
  const categoryPageSize = 10;

  // Top products pagination
  const [productPage, setProductPage] = useState<number>(1);
  const productPageSize = 8;

  useEffect(() => {
    let ignore = false;
    const q = selectedMonth ? `?month=${encodeURIComponent(selectedMonth)}` : "";
    fetch(`/api/reports${q}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d: ReportData | null) => {
        if (!ignore && d) {
          setData(d);
          if (!selectedMonth && d.selectedMonth) {
            setSelectedMonth(d.selectedMonth);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Reports fetch error:", err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedMonth]);

  const handleMonthChange = (monthKey: string) => {
    setIsLoading(true);
    setSelectedMonth(monthKey);
  };

  // CSV Export logic
  const exportReportCSV = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push("--- PROMOTEIT STORE OPERATIONS & FINANCIAL REPORT ---");
    lines.push(`Generated: ${new Date().toLocaleString("en-GB")}`);
    lines.push(`Active Month Filter: ${data.selectedMonthLabel}`);
    lines.push("");

    // Section 1: Current Stock On Hand & Valuation
    lines.push("1. CURRENT STOCK ON HAND & VALUATION (LIVE)");
    lines.push(`Total Stock Units On Hand,${data.currentStock.totalUnits} units`);
    lines.push(`Total Retail Selling Value,GHS ${data.currentStock.totalRetailValue.toFixed(2)}`);
    lines.push(`Total Stock Cost Basis,GHS ${data.currentStock.totalCostValue.toFixed(2)}`);
    lines.push(`Projected Stock Profit,GHS ${data.currentStock.projectedProfit.toFixed(2)}`);
    lines.push(`Projected Margin,${data.currentStock.projectedMargin.toFixed(1)}%`);
    lines.push(`In Stock Items,${data.currentStock.inStockCount}`);
    lines.push(`Low Stock Items,${data.currentStock.lowStockCount}`);
    lines.push(`Out of Stock Items,${data.currentStock.outOfStockCount}`);
    lines.push("");

    // Section 2: Month-by-Month Financial Ledger
    lines.push("2. MONTH-BY-MONTH FINANCIAL PERFORMANCE");
    lines.push(
      "Month,Sales Revenue (GHS),Cost of Goods / COGS (GHS),Gross Profit (GHS),Store Expenses (GHS),Net Profit (GHS),Margin (%),Transactions,Units Sold,Top Expense Category"
    );
    data.monthlyBreakdown.forEach((m) => {
      lines.push(
        `"${m.label}",${m.revenue.toFixed(2)},${m.cogs.toFixed(2)},${m.grossProfit.toFixed(2)},${m.expenses.toFixed(2)},${m.netProfit.toFixed(2)},${m.margin.toFixed(1)}%,${m.transactionsCount},${m.unitsSold},"${m.topExpenseCategory}"`
      );
    });
    lines.push("");

    // Section 3: Selected Month Financial Summary
    lines.push(`3. FINANCIAL SNAPSHOT FOR ${data.selectedMonthLabel.toUpperCase()}`);
    lines.push(`Sales Revenue,GHS ${data.summary.totalRevenue.toFixed(2)}`);
    lines.push(`Cost of Goods Sold (COGS),GHS ${data.summary.cogs.toFixed(2)}`);
    lines.push(`Gross Profit,GHS ${data.summary.grossProfit.toFixed(2)}`);
    lines.push(`Store Operating Expenses,GHS ${data.summary.totalExpenses.toFixed(2)}`);
    lines.push(`Net Store Profit,GHS ${data.summary.netProfit.toFixed(2)}`);
    lines.push(`Profit Margin,${data.summary.margin.toFixed(1)}%`);
    lines.push(`Transactions,${data.summary.transactionsCount}`);
    lines.push(`Average Order Value,GHS ${data.summary.averageOrderValue.toFixed(2)}`);
    lines.push(`Units Sold,${data.summary.unitsSold}`);
    lines.push("");

    // Section 4: Expense Breakdown
    lines.push(`4. EXPENSES BREAKDOWN (${data.selectedMonthLabel})`);
    lines.push("Expense Category,Amount (GHS),Share (%)");
    data.expensesByCategory.forEach((e) => {
      lines.push(`"${e.category}",${e.amount.toFixed(2)},${e.share.toFixed(1)}%`);
    });
    lines.push("");

    // Section 5: Top Products
    lines.push(`5. TOP SELLING PRODUCTS (${data.selectedMonthLabel})`);
    lines.push("Product Name,SKU,Units Sold,Total Revenue (GHS)");
    data.topProducts.forEach((p) => {
      lines.push(`"${p.name}","${p.sku}",${p.unitsSold},${p.revenue.toFixed(2)}`);
    });
    lines.push("");

    // Section 6: Category Breakdown
    lines.push("6. CATEGORY INVENTORY VALUATION");
    lines.push(
      "Category Name,Product Types,Total Items in Stock,Total Product Amount (Retail GHS),Total Cost Basis (GHS),Sales Revenue (GHS),Value Share (%)"
    );
    data.categoryBreakdown.forEach((c) => {
      lines.push(
        `"${c.name}",${c.productCount},${c.totalItems},${c.totalAmount.toFixed(2)},${c.totalCostAmount.toFixed(2)},${c.totalRevenue.toFixed(2)},${c.valueShare.toFixed(1)}%`
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PromoteIt-Financial-Report-${data.selectedMonth || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Monthly table calculations
  const monthlyList = data?.monthlyBreakdown || [];
  const totalRevAllMonths = monthlyList.reduce((s, m) => s + m.revenue, 0);
  const totalCogsAllMonths = monthlyList.reduce((s, m) => s + m.cogs, 0);
  const totalGrossAllMonths = monthlyList.reduce((s, m) => s + m.grossProfit, 0);
  const totalExpAllMonths = monthlyList.reduce((s, m) => s + m.expenses, 0);
  const totalNetAllMonths = monthlyList.reduce((s, m) => s + m.netProfit, 0);
  const totalUnitsAllMonths = monthlyList.reduce((s, m) => s + m.unitsSold, 0);
  const overallMarginAll = totalRevAllMonths > 0 ? (totalNetAllMonths / totalRevAllMonths) * 100 : 0;

  // Chart data for monthly trend (oldest to newest chronologically)
  const monthlyChartData = [...monthlyList].reverse();

  // Stock inventory filtering
  const allInventoryItems = data?.inventoryItems || [];
  const filteredInventoryItems = allInventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(inventorySearch.toLowerCase());

    const matchesStatus =
      stockStatusFilter === "ALL"
        ? true
        : stockStatusFilter === "IN_STOCK"
          ? item.stock > item.reorderLevel
          : stockStatusFilter === "LOW_STOCK"
            ? item.stock > 0 && item.stock <= item.reorderLevel
            : stockStatusFilter === "OUT_OF_STOCK"
              ? item.stock === 0
              : true;

    return matchesSearch && matchesStatus;
  });

  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventoryItems.length / inventoryPageSize));
  const safeInventoryPage = Math.min(Math.max(1, inventoryPage), totalInventoryPages);
  const paginatedInventoryItems = filteredInventoryItems.slice(
    (safeInventoryPage - 1) * inventoryPageSize,
    safeInventoryPage * inventoryPageSize
  );

  // Category filtering
  const categories = data?.categoryBreakdown || [];
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / categoryPageSize));
  const safeCategoryPage = Math.min(Math.max(1, categoryPage), totalCategoryPages);
  const paginatedCategories = filteredCategories.slice(
    (safeCategoryPage - 1) * categoryPageSize,
    safeCategoryPage * categoryPageSize
  );

  const selectedCategory =
    selectedCategoryId === "ALL"
      ? null
      : categories.find((c) => c.id === selectedCategoryId) || null;

  // Top products pagination
  const topProductsList = data?.topProducts || [];
  const totalProductPages = Math.max(1, Math.ceil(topProductsList.length / productPageSize));
  const safeProductPage = Math.min(Math.max(1, productPage), totalProductPages);
  const paginatedTopProducts = topProductsList.slice(
    (safeProductPage - 1) * productPageSize,
    safeProductPage * productPageSize
  );

  const s = data?.summary || {
    totalRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    margin: 0,
    transactionsCount: 0,
    averageOrderValue: 0,
    unitsSold: 0,
    totalInventoryValue: 0,
    totalInventoryItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  const currentStock = data?.currentStock || {
    totalUnits: 0,
    totalRetailValue: 0,
    totalCostValue: 0,
    projectedProfit: 0,
    projectedMargin: 0,
    totalProducts: 0,
    totalVariants: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  };

  return (
    <AppShell active="/reports">
      <div className="page-wrap report-page">
        {/* Page Header */}
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <BarChart3 size={14} /> Store Intelligence & Performance
            </div>
            <h1>Financial Reports & Stock Valuation</h1>
            <p>
              A simple, clear summary of what you have in stock, what it&apos;s worth, your profit,
              and your expenses for every month.
            </p>
          </div>
          <div className="heading-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Active Month Dropdown Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                htmlFor="report-month-select"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CalendarDays size={14} /> Month:
              </label>
              <select
                id="report-month-select"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-medium)",
                  background: "var(--bg-surface)",
                  color: "var(--ink-primary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  minWidth: "180px",
                }}
              >
                {data?.availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} {m.isCurrent ? " (Current)" : ""}
                  </option>
                ))}
                <option value="all">All Time Combined</option>
              </select>
            </div>

            <button
              className="primary-button"
              onClick={exportReportCSV}
              disabled={!data || isLoading}
              title="Download entire report as CSV spreadsheet"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        </section>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "8px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`filter-chip ${activeTab === "monthly" ? "active" : ""}`}
            style={{ fontSize: "13.5px", padding: "8px 16px" }}
          >
            <TrendingUp size={15} style={{ marginRight: "6px" }} /> Monthly Financials & Profit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`filter-chip ${activeTab === "stock" ? "active" : ""}`}
            style={{ fontSize: "13.5px", padding: "8px 16px" }}
          >
            <Boxes size={15} style={{ marginRight: "6px" }} /> Stock & Inventory Value
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`filter-chip ${activeTab === "categories" ? "active" : ""}`}
            style={{ fontSize: "13.5px", padding: "8px 16px" }}
          >
            <Layers size={15} style={{ marginRight: "6px" }} /> Categories Breakdown
          </button>
        </div>

        {/* SECTION 1: WHAT I HAVE IN STOCK & HOW MUCH IT'S WORTH (Executive Inventory Valuation) */}
        <section
          className="panel"
          style={{
            padding: "20px 24px",
            background: "var(--bg-surface)",
            borderRadius: "14px",
            border: "1px solid var(--border-medium)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--brand-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                <Package size={14} /> What You Have In Stock Right Now
              </div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                Inventory On-Hand &amp; Valuation
              </h2>
              <p style={{ margin: "3px 0 0", color: "var(--ink-secondary)", fontSize: "13px" }}>
                Physical stock sitting on your shelves, how much it sells for, and your expected profit.
              </p>
            </div>

            {/* Quick Stock Health Indicators */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "var(--status-green-bg)",
                  color: "var(--status-green)",
                  border: "1px solid var(--status-green-border)",
                }}
              >
                <CheckCircle2 size={13} /> {currentStock.inStockCount} In Stock
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "var(--status-orange-bg)",
                  color: "var(--status-orange)",
                  border: "1px solid var(--status-orange-border)",
                }}
              >
                <AlertTriangle size={13} /> {currentStock.lowStockCount} Low Stock
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "var(--status-red-bg)",
                  color: "var(--status-red)",
                  border: "1px solid var(--status-red-border)",
                }}
              >
                <XCircle size={13} /> {currentStock.outOfStockCount} Out of Stock
              </span>
            </div>
          </div>

          {/* 4 Plain-Language Stock KPI Cards */}
          <div className="stats-grid" style={{ marginTop: 0 }}>
            {/* Card 1: Total Units */}
            <div className="stat-card blue">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <Boxes size={20} />
                </span>
                <span className="stat-change positive">Physical count</span>
              </div>
              <span className="stat-title">Total stock in shop</span>
              <strong className="stat-value">
                {currentStock.totalUnits.toLocaleString("en-GH")} units
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                Across {currentStock.totalProducts} products ({currentStock.totalVariants} variants)
              </span>
            </div>

            {/* Card 2: Selling Value */}
            <div className="stat-card green">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <CircleDollarSign size={20} />
                </span>
                <span className="stat-change positive">Selling price</span>
              </div>
              <span className="stat-title">How much it sells for</span>
              <strong className="stat-value">
                {formatMoney(currentStock.totalRetailValue)}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                Total expected revenue if all stock is sold
              </span>
            </div>

            {/* Card 3: Cost Invested */}
            <div className="stat-card purple">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <WalletCards size={20} />
                </span>
                <span className="stat-change positive">Cost basis</span>
              </div>
              <span className="stat-title">What you paid for it</span>
              <strong className="stat-value">
                {formatMoney(currentStock.totalCostValue)}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                Total money invested in current shelf stock
              </span>
            </div>

            {/* Card 4: Expected Profit */}
            <div className="stat-card amber">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <TrendingUp size={20} />
                </span>
                <span className="stat-change positive">
                  {currentStock.projectedMargin.toFixed(1)}% margin
                </span>
              </div>
              <span className="stat-title">Expected profit on stock</span>
              <strong className="stat-value">
                {formatMoney(currentStock.projectedProfit)}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                Potential earnings locked in current inventory
              </span>
            </div>
          </div>
        </section>

        {/* TAB CONTENT: MONTHLY FINANCIALS & PROFIT */}
        {activeTab === "monthly" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* SECTION 2: MONTH-BY-MONTH FINANCIAL LEDGER */}
            <section
              className="panel"
              style={{
                padding: "24px",
                background: "var(--bg-surface)",
                borderRadius: "14px",
                border: "1px solid var(--border-medium)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "16px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--brand-primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    <Calendar size={14} /> Month-by-Month Financial Ledger
                  </div>
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>
                    Your Revenue, Profit &amp; Expenses Every Month
                  </h2>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: "13px" }}>
                    Clear breakdown of what customers bought, what products cost you, store bills, and
                    your net take-home profit for each month.
                  </p>
                </div>
              </div>

              {/* Monthly Multi-Bar Chart (Revenue vs Expenses vs Net Profit) */}
              {monthlyChartData.length > 0 && (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "var(--bg-card, rgba(255,255,255,0.02))",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                      Monthly Performance Trend: Revenue vs Expenses vs Net Profit
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      Visualizing sales volume against operating bills and take-home profit
                    </span>
                  </div>
                  <div style={{ height: "280px", width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyChartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border-subtle)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="shortLabel"
                          stroke="var(--ink-muted)"
                          fontSize={12}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="var(--ink-muted)"
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) =>
                            val >= 1000 ? `GHS ${(val / 1000).toFixed(0)}k` : `GHS ${val}`
                          }
                        />
                        <Tooltip
                          formatter={(val, name) => [
                            formatMoney(Number(val)),
                            name === "revenue"
                              ? "Sales Revenue"
                              : name === "expenses"
                                ? "Operating Expenses"
                                : "Net Profit",
                          ]}
                          contentStyle={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-medium)",
                            borderRadius: "10px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="revenue"
                          name="Sales Revenue"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expenses"
                          name="Store Expenses"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="netProfit"
                          name="Net Profit"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Month-by-Month Detailed Table */}
              <div className="table-wrap records-table">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Sales Revenue</th>
                      <th>Product Cost (COGS)</th>
                      <th>Gross Profit</th>
                      <th>Store Expenses</th>
                      <th>Net Take-Home Profit</th>
                      <th>Margin %</th>
                      <th>Units Sold</th>
                      <th>Top Expense</th>
                      <th style={{ textAlign: "right" }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyList.length > 0 ? (
                      monthlyList.map((m) => {
                        const isSelected = selectedMonth === m.key;
                        const isPositive = m.netProfit >= 0;
                        return (
                          <tr
                            key={m.key}
                            style={{
                              background: isSelected
                                ? "var(--bg-active, rgba(37,99,235,0.08))"
                                : undefined,
                              transition: "background 0.2s",
                            }}
                          >
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: isSelected
                                      ? "var(--brand-primary)"
                                      : "var(--border-medium)",
                                  }}
                                />
                                <div>
                                  <strong>{m.label}</strong>
                                  {m.key === data?.availableMonths[0]?.key && (
                                    <span
                                      style={{
                                        marginLeft: "6px",
                                        fontSize: "11px",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        background: "var(--brand-primary-light)",
                                        color: "var(--brand-primary)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Current
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: "var(--brand-primary)" }}>
                                {formatMoney(m.revenue)}
                              </strong>
                              <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                                {m.transactionsCount} {m.transactionsCount === 1 ? "sale" : "sales"}
                              </div>
                            </td>
                            <td>{formatMoney(m.cogs)}</td>
                            <td>
                              <strong>{formatMoney(m.grossProfit)}</strong>
                            </td>
                            <td>
                              <span style={{ color: "var(--status-red)", fontWeight: 600 }}>
                                {formatMoney(m.expenses)}
                              </span>
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontWeight: 700,
                                  color: isPositive ? "var(--status-green)" : "var(--status-red)",
                                }}
                              >
                                {isPositive ? (
                                  <ArrowUpRight size={14} />
                                ) : (
                                  <ArrowDownRight size={14} />
                                )}
                                {formatMoney(m.netProfit)}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: m.margin >= 20 ? "var(--status-green)" : m.margin > 0 ? "var(--status-orange)" : "var(--status-red)",
                                }}
                              >
                                {m.margin.toFixed(1)}%
                              </span>
                            </td>
                            <td>{m.unitsSold.toLocaleString("en-GH")} pcs</td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                                {m.topExpenseCategory}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  background: isSelected ? "var(--brand-primary)" : undefined,
                                  color: isSelected ? "#ffffff" : undefined,
                                }}
                                onClick={() => handleMonthChange(m.key)}
                                title={`Focus on ${m.label}`}
                              >
                                {isSelected ? "Viewing" : "View"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "36px" }}>
                          <BarChart3 size={24} style={{ margin: "0 auto 8px", display: "block" }} />
                          No monthly financial data recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Totals Summary Footer */}
                  {monthlyList.length > 0 && (
                    <tfoot>
                      <tr
                        style={{
                          fontWeight: 700,
                          background: "var(--bg-subtle)",
                          borderTop: "2px solid var(--border-medium)",
                        }}
                      >
                        <td>
                          <strong>ALL MONTHS COMBINED</strong>
                        </td>
                        <td style={{ color: "var(--brand-primary)" }}>
                          {formatMoney(totalRevAllMonths)}
                        </td>
                        <td>{formatMoney(totalCogsAllMonths)}</td>
                        <td>{formatMoney(totalGrossAllMonths)}</td>
                        <td style={{ color: "var(--status-red)" }}>
                          {formatMoney(totalExpAllMonths)}
                        </td>
                        <td
                          style={{
                            color: totalNetAllMonths >= 0 ? "var(--status-green)" : "var(--status-red)",
                          }}
                        >
                          {formatMoney(totalNetAllMonths)}
                        </td>
                        <td>{overallMarginAll.toFixed(1)}%</td>
                        <td>{totalUnitsAllMonths.toLocaleString("en-GH")} pcs</td>
                        <td colSpan={2} style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                          Grand financial total
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* SECTION 3: SELECTED MONTH FINANCIAL SNAPSHOT */}
            <section
              className="panel"
              style={{
                padding: "24px",
                background: "var(--bg-surface)",
                borderRadius: "14px",
                border: "1px solid var(--border-medium)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "20px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--brand-primary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    <Receipt size={14} /> Active Period Deep-Dive
                  </div>
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>
                    Financial Snapshot for {data?.selectedMonthLabel || "Selected Month"}
                  </h2>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: "13px" }}>
                    Exact breakdown of money in, product costs, expenses, and net profit for this period.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                    {s.transactionsCount} transactions completed · {s.unitsSold} units sold
                  </span>
                </div>
              </div>

              {/* 5 Financial Step Cards for Selected Month */}
              <div
                className="stats-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  marginBottom: "24px",
                }}
              >
                {/* 1. Revenue */}
                <div className="stat-card blue">
                  <div className="stat-card-top">
                    <span className="stat-icon">
                      <CircleDollarSign size={18} />
                    </span>
                    <span className="stat-change positive">Money In</span>
                  </div>
                  <span className="stat-title">1. Sales Revenue</span>
                  <strong className="stat-value">{formatMoney(s.totalRevenue)}</strong>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>
                    Avg. {formatMoney(s.averageOrderValue)} / order
                  </span>
                </div>

                {/* 2. COGS */}
                <div className="stat-card purple">
                  <div className="stat-card-top">
                    <span className="stat-icon">
                      <Tag size={18} />
                    </span>
                    <span className="stat-change negative">Product Cost</span>
                  </div>
                  <span className="stat-title">2. Cost of Goods Sold</span>
                  <strong className="stat-value">{formatMoney(s.cogs)}</strong>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>
                    What those sold items cost you
                  </span>
                </div>

                {/* 3. Gross Profit */}
                <div className="stat-card blue">
                  <div className="stat-card-top">
                    <span className="stat-icon">
                      <TrendingUp size={18} />
                    </span>
                    <span className="stat-change positive">Revenue - COGS</span>
                  </div>
                  <span className="stat-title">3. Gross Profit</span>
                  <strong className="stat-value">{formatMoney(s.grossProfit)}</strong>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>
                    Profit before store expenses
                  </span>
                </div>

                {/* 4. Operating Expenses */}
                <div className="stat-card amber">
                  <div className="stat-card-top">
                    <span className="stat-icon">
                      <WalletCards size={18} />
                    </span>
                    <span className="stat-change negative">Store Bills</span>
                  </div>
                  <span className="stat-title">4. Store Expenses</span>
                  <strong className="stat-value">{formatMoney(s.totalExpenses)}</strong>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>
                    Rent, utilities, transport, restock
                  </span>
                </div>

                {/* 5. Net Profit */}
                <div className={`stat-card ${s.netProfit >= 0 ? "green" : "amber"}`}>
                  <div className="stat-card-top">
                    <span className="stat-icon">
                      <Coins size={18} />
                    </span>
                    <span
                      className={`stat-change ${s.netProfit >= 0 ? "positive" : "negative"}`}
                    >
                      {s.margin.toFixed(1)}% margin
                    </span>
                  </div>
                  <span className="stat-title">5. Take-Home Profit</span>
                  <strong
                    className="stat-value"
                    style={{
                      color: s.netProfit >= 0 ? "var(--status-green)" : "var(--status-red)",
                    }}
                  >
                    {formatMoney(s.netProfit)}
                  </strong>
                  <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>
                    Actual money kept after all costs
                  </span>
                </div>
              </div>

              {/* Grid: Charts & Details for the Selected Month */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Daily Timeline Area Chart */}
                <div
                  style={{
                    padding: "18px",
                    background: "var(--bg-card, rgba(255,255,255,0.02))",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                      Daily Sales &amp; Profit Flow
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      Day-by-day revenue vs net profit during this period
                    </span>
                  </div>
                  <div style={{ height: "240px", width: "100%" }}>
                    {data && data.dailyTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.dailyTrends}
                          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border-subtle)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            stroke="var(--ink-muted)"
                            fontSize={11}
                            tickLine={false}
                          />
                          <YAxis stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                          <Tooltip
                            formatter={(val, name) => [
                              formatMoney(Number(val)),
                              name === "revenue" ? "Daily Revenue" : "Daily Profit",
                            ]}
                            contentStyle={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-medium)",
                              borderRadius: "10px",
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#2563eb"
                            strokeWidth={2}
                            fill="url(#revGrad)"
                          />
                          <Area
                            type="monotone"
                            dataKey="profit"
                            name="Net Profit"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#profitGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ height: "100%" }}>
                        <BarChart3 size={24} />
                        <span>No daily trend data available</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Where Did Expenses Go? (Category Breakdown) */}
                <div
                  style={{
                    padding: "18px",
                    background: "var(--bg-card, rgba(255,255,255,0.02))",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ marginBottom: "14px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                      Where Did Expenses Go? ({data?.selectedMonthLabel})
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      Total bills spent: {formatMoney(s.totalExpenses)}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                    {data && data.expensesByCategory.length > 0 ? (
                      data.expensesByCategory.map((exp) => (
                        <div key={exp.category} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "13px",
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{exp.category}</span>
                            <span style={{ fontWeight: 700, color: "var(--status-red)" }}>
                              {formatMoney(exp.amount)}{" "}
                              <span style={{ fontSize: "11px", color: "var(--ink-secondary)", fontWeight: 500 }}>
                                ({exp.share.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                          <div
                            style={{
                              height: "6px",
                              width: "100%",
                              background: "var(--border-subtle)",
                              borderRadius: "3px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, exp.share)}%`,
                                background: "var(--status-red)",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state" style={{ height: "100%" }}>
                        <WalletCards size={24} />
                        <span>No expenses recorded for this month</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Top Selling Products & Payment Distribution */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                {/* Top Selling Products */}
                <div
                  style={{
                    padding: "18px",
                    background: "var(--bg-card, rgba(255,255,255,0.02))",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                      Top Selling Items That Month
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      Products generating the highest revenue
                    </span>
                  </div>
                  <div className="table-wrap records-table" style={{ border: "none" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Units Sold</th>
                          <th style={{ textAlign: "right" }}>Total Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProductsList.length > 0 ? (
                          paginatedTopProducts.map((p) => (
                            <tr key={p.sku}>
                              <td>
                                <strong>{p.name}</strong>
                              </td>
                              <td>
                                <span className="record-id">{p.sku}</span>
                              </td>
                              <td>{p.unitsSold} units</td>
                              <td style={{ textAlign: "right" }}>
                                <strong style={{ color: "var(--brand-primary)" }}>
                                  {formatMoney(p.revenue)}
                                </strong>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: "24px" }}>
                              No items sold during this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {topProductsList.length > productPageSize && (
                    <div style={{ marginTop: "10px" }}>
                      <Pagination
                        currentPage={safeProductPage}
                        totalItems={topProductsList.length}
                        pageSize={productPageSize}
                        onPageChange={setProductPage}
                        itemName="products"
                      />
                    </div>
                  )}
                </div>

                {/* Settlement / Payment Methods */}
                <div
                  style={{
                    padding: "18px",
                    background: "var(--bg-card, rgba(255,255,255,0.02))",
                    borderRadius: "12px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                      Payment Methods
                    </h3>
                    <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      How customers paid for their orders
                    </span>
                  </div>
                  <div style={{ height: "220px", width: "100%" }}>
                    {data && data.paymentBreakdown.some((p) => p.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.paymentBreakdown.filter((p) => p.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                          >
                            {data.paymentBreakdown.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => formatMoney(Number(val))}
                            contentStyle={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border-medium)",
                              borderRadius: "10px",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ height: "100%" }}>
                        <CircleDollarSign size={24} />
                        <span>No payments in this period</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB CONTENT: STOCK & INVENTORY VALUE */}
        {activeTab === "stock" && (
          <section
            className="panel"
            style={{
              padding: "24px",
              background: "var(--bg-surface)",
              borderRadius: "14px",
              border: "1px solid var(--border-medium)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "16px",
                paddingBottom: "14px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>
                  Itemized Stock &amp; Inventory Valuation
                </h2>
                <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: "13px" }}>
                  Detailed look at what items are in your store, cost basis, selling value, and expected profit per item.
                </p>
              </div>

              {/* Status and Search Controls */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <div className="search-box" style={{ width: "220px" }}>
                  <Search size={14} />
                  <input
                    value={inventorySearch}
                    onChange={(e) => {
                      setInventorySearch(e.target.value);
                      setInventoryPage(1);
                    }}
                    placeholder="Search product or SKU..."
                    style={{ fontSize: "13px" }}
                  />
                </div>

                <select
                  value={stockStatusFilter}
                  onChange={(e) => {
                    setStockStatusFilter(e.target.value);
                    setInventoryPage(1);
                  }}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-medium)",
                    background: "var(--bg-surface)",
                    color: "var(--ink-primary)",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <option value="ALL">All Stock Statuses ({allInventoryItems.length})</option>
                  <option value="IN_STOCK">In Stock ({currentStock.inStockCount})</option>
                  <option value="LOW_STOCK">Low Stock ({currentStock.lowStockCount})</option>
                  <option value="OUT_OF_STOCK">Out of Stock ({currentStock.outOfStockCount})</option>
                </select>
              </div>
            </div>

            {/* Inventory Items Table */}
            <div className="table-wrap records-table">
              <table>
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Stock on Hand</th>
                    <th>Unit Cost</th>
                    <th>Selling Price</th>
                    <th>Total Selling Value</th>
                    <th>Potential Profit</th>
                    <th style={{ textAlign: "right" }}>Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventoryItems.length > 0 ? (
                    paginatedInventoryItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>
                          <span className="record-id">{item.sku}</span>
                        </td>
                        <td>{item.categoryName}</td>
                        <td>
                          <strong style={{ color: "var(--ink-primary)" }}>
                            {item.stock} units
                          </strong>
                          {item.reorderLevel > 0 && (
                            <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                              Reorder at {item.reorderLevel}
                            </div>
                          )}
                        </td>
                        <td>{formatMoney(item.unitCost)}</td>
                        <td>{formatMoney(item.unitPrice)}</td>
                        <td>
                          <strong style={{ color: "var(--brand-primary)" }}>
                            {formatMoney(item.totalRetail)}
                          </strong>
                        </td>
                        <td>
                          <strong
                            style={{
                              color: item.potentialProfit > 0 ? "var(--status-green)" : "var(--ink-secondary)",
                            }}
                          >
                            {formatMoney(item.potentialProfit)}
                          </strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {item.status === "In stock" ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "var(--status-green-bg)",
                                color: "var(--status-green)",
                                border: "1px solid var(--status-green-border)",
                              }}
                            >
                              In stock
                            </span>
                          ) : item.status === "Low stock" ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "var(--status-orange-bg)",
                                color: "var(--status-orange)",
                                border: "1px solid var(--status-orange-border)",
                              }}
                            >
                              Low stock
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "var(--status-red-bg)",
                                color: "var(--status-red)",
                                border: "1px solid var(--status-red-border)",
                              }}
                            >
                              Out of stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "36px" }}>
                        <Package size={24} style={{ margin: "0 auto 8px", display: "block" }} />
                        No inventory items matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredInventoryItems.length > inventoryPageSize && (
              <div style={{ marginTop: "14px" }}>
                <Pagination
                  currentPage={safeInventoryPage}
                  totalItems={filteredInventoryItems.length}
                  pageSize={inventoryPageSize}
                  onPageChange={setInventoryPage}
                  itemName="items"
                />
              </div>
            )}
          </section>
        )}

        {/* TAB CONTENT: CATEGORIES BREAKDOWN */}
        {activeTab === "categories" && (
          <section
            className="panel"
            style={{
              padding: "24px",
              background: "var(--bg-surface)",
              borderRadius: "14px",
              border: "1px solid var(--border-medium)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--brand-primary)",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <Layers size={14} /> Category Valuation &amp; Sales Breakdown
                </div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>
                  {selectedCategory ? selectedCategory.name : "All Categories Combined"}
                </h2>
                <p style={{ margin: "4px 0 0", color: "var(--ink-secondary)", fontSize: "13px" }}>
                  Total stock count and retail valuation of goods classified under each category.
                </p>
              </div>

              {/* Category selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-medium)",
                    background: "var(--bg-surface)",
                    color: "var(--ink-primary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    minWidth: "200px",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">All Categories Combined ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.totalItems} items · {formatMoney(c.totalAmount)})
                    </option>
                  ))}
                </select>

                {selectedCategoryId !== "ALL" && (
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    onClick={() => setSelectedCategoryId("ALL")}
                  >
                    Reset to All
                  </button>
                )}
              </div>
            </div>

            {/* Category Valuation Bar Chart */}
            {categories.length > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  marginBottom: "20px",
                  padding: "16px 20px",
                  background: "var(--bg-card, rgba(255,255,255,0.02))",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                    Retail Valuation by Category
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                    Comparing total selling value vs cost basis per department
                  </span>
                </div>
                <div style={{ height: "240px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categories.slice(0, 8)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border-subtle)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="var(--ink-muted)"
                        fontSize={11}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="var(--ink-muted)"
                        fontSize={11}
                        tickFormatter={(val) =>
                          val >= 1000 ? `GHS ${(val / 1000).toFixed(0)}k` : `GHS ${val}`
                        }
                      />
                      <Tooltip
                        formatter={(val, name) => [
                          formatMoney(Number(val)),
                          name === "totalAmount" ? "Retail Valuation" : "Cost Basis",
                        ]}
                        contentStyle={{
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-medium)",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="totalAmount"
                        name="Retail Value (GHS)"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="totalCostAmount"
                        name="Cost Basis (GHS)"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Category Table */}
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                    All Categories Overview
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                    {filteredCategories.length} categories listed
                  </span>
                </div>
                <div className="search-box" style={{ width: "240px" }}>
                  <Search size={15} />
                  <input
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setCategoryPage(1);
                    }}
                    placeholder="Search category name..."
                    style={{ fontSize: "13px" }}
                  />
                </div>
              </div>

              <div className="table-wrap records-table">
                <table>
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Product Types</th>
                      <th>Items in Stock</th>
                      <th>Total Retail Value</th>
                      <th>Total Cost Basis</th>
                      <th>Sales Revenue</th>
                      <th>Inventory Share</th>
                      <th style={{ textAlign: "right" }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.length > 0 ? (
                      paginatedCategories.map((c) => {
                        const isSelected = selectedCategoryId === c.id;
                        return (
                          <tr
                            key={c.id}
                            style={{
                              background: isSelected
                                ? "var(--bg-active, rgba(37,99,235,0.08))"
                                : undefined,
                              transition: "background 0.2s",
                            }}
                          >
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: isSelected
                                      ? "var(--brand-primary)"
                                      : "var(--border-medium)",
                                  }}
                                />
                                <strong>{c.name}</strong>
                              </div>
                            </td>
                            <td>
                              {c.productCount} {c.productCount === 1 ? "product" : "products"}
                            </td>
                            <td>
                              <strong>{c.totalItems.toLocaleString("en-GH")} units</strong>
                            </td>
                            <td>
                              <strong style={{ color: "var(--brand-primary)" }}>
                                {formatMoney(c.totalAmount)}
                              </strong>
                            </td>
                            <td>{formatMoney(c.totalCostAmount)}</td>
                            <td>
                              {formatMoney(c.totalRevenue)}{" "}
                              <span style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                                ({c.unitsSold} sold)
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div
                                  style={{
                                    flex: 1,
                                    height: "6px",
                                    background: "var(--border-subtle)",
                                    borderRadius: "3px",
                                    overflow: "hidden",
                                    minWidth: "60px",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${Math.min(100, c.valueShare)}%`,
                                      background: "var(--brand-primary)",
                                      borderRadius: "3px",
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: "12px", minWidth: "36px" }}>
                                  {c.valueShare.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => setSelectedCategoryId(isSelected ? "ALL" : c.id)}
                                title={isSelected ? "Deselect category" : "Focus on this category"}
                                style={{
                                  color: isSelected ? "var(--brand-primary)" : undefined,
                                }}
                              >
                                <ArrowUpRight size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "36px" }}>
                          <Package size={24} style={{ margin: "0 auto 8px", display: "block" }} />
                          No categories found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredCategories.length > categoryPageSize && (
                <div style={{ marginTop: "12px" }}>
                  <Pagination
                    currentPage={safeCategoryPage}
                    totalItems={filteredCategories.length}
                    pageSize={categoryPageSize}
                    onPageChange={setCategoryPage}
                    itemName="categories"
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
