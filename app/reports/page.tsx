"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Download,
  Filter,
  Layers,
  Package,
  Receipt,
  Search,
  Tag,
  TrendingUp,
  WalletCards,
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
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    transactionsCount: number;
    averageOrderValue: number;
    lowStockCount: number;
    totalInventoryItems?: number;
    totalInventoryValue?: number;
    totalCategories?: number;
  };
  dailyTrends: { date: string; revenue: number; expenses: number; profit: number }[];
  paymentBreakdown: { name: string; value: number }[];
  topProducts: { name: string; sku: string; unitsSold: number; revenue: number }[];
  categoryBreakdown?: CategoryReport[];
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [timeRange, setTimeRange] = useState("Last 7 Days");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [categorySearch, setCategorySearch] = useState<string>("");

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => undefined);
  }, []);

  const categories = data?.categoryBreakdown || [];

  const totalAllItems = categories.reduce((sum, c) => sum + c.totalItems, 0);
  const totalAllAmount = categories.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalAllCost = categories.reduce((sum, c) => sum + c.totalCostAmount, 0);
  const totalAllRevenue = categories.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalAllProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

  const selectedCategory =
    selectedCategoryId === "ALL"
      ? null
      : categories.find((c) => c.id === selectedCategoryId) || null;

  const filteredCategories = categories.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(categorySearch.toLowerCase());
    return matchesSearch;
  });

  const activeStats = selectedCategory
    ? {
        title: selectedCategory.name,
        isSpecific: true,
        productCount: selectedCategory.productCount,
        variantCount: selectedCategory.variantCount,
        totalItems: selectedCategory.totalItems,
        totalAmount: selectedCategory.totalAmount,
        totalCostAmount: selectedCategory.totalCostAmount,
        totalRevenue: selectedCategory.totalRevenue,
        unitsSold: selectedCategory.unitsSold,
        valueShare: selectedCategory.valueShare,
        margin:
          selectedCategory.totalAmount > 0
            ? (
                ((selectedCategory.totalAmount - selectedCategory.totalCostAmount) /
                  selectedCategory.totalAmount) *
                100
              ).toFixed(1)
            : "0",
      }
    : {
        title: "All Categories Combined",
        isSpecific: false,
        productCount: totalAllProducts,
        variantCount: categories.reduce((sum, c) => sum + c.variantCount, 0),
        totalItems: totalAllItems,
        totalAmount: totalAllAmount,
        totalCostAmount: totalAllCost,
        totalRevenue: totalAllRevenue,
        unitsSold: categories.reduce((sum, c) => sum + c.unitsSold, 0),
        valueShare: 100,
        margin:
          totalAllAmount > 0
            ? (((totalAllAmount - totalAllCost) / totalAllAmount) * 100).toFixed(1)
            : "0",
      };

  function exportReportCSV() {
    if (!data) return;
    const lines: string[] = [];
    lines.push("--- PROMOTEIT FINANCIAL & STORE OPERATIONS REPORT ---");
    lines.push(`Generated: ${new Date().toLocaleString("en-GB")}`);
    lines.push("");
    lines.push("SUMMARY METRICS");
    lines.push(`Total Revenue,GHS ${data.summary.totalRevenue.toFixed(2)}`);
    lines.push(`Gross Profit,GHS ${data.summary.grossProfit.toFixed(2)}`);
    lines.push(`Total Expenses,GHS ${data.summary.totalExpenses.toFixed(2)}`);
    lines.push(`Net Profit,GHS ${data.summary.netProfit.toFixed(2)}`);
    lines.push(`Transactions Count,${data.summary.transactionsCount}`);
    lines.push(`Average Order Value,GHS ${data.summary.averageOrderValue.toFixed(2)}`);
    lines.push(`Total Catalog Items In Stock,${totalAllItems} units`);
    lines.push(`Total Inventory Product Valuation,GHS ${totalAllAmount.toFixed(2)}`);
    lines.push("");
    lines.push("CATEGORY INVENTORY & VALUATION LEDGER");
    lines.push(
      "Category Name,Product Count,Total Items in Stock,Total Product Amount (Retail GHS),Total Cost Basis (GHS),Sales Revenue (GHS),Value Share (%)"
    );
    categories.forEach((c) => {
      lines.push(
        `"${c.name}",${c.productCount},${c.totalItems},${c.totalAmount.toFixed(2)},${c.totalCostAmount.toFixed(2)},${c.totalRevenue.toFixed(2)},${c.valueShare}%`
      );
    });
    lines.push("");
    lines.push("DAILY TRENDS");
    lines.push("Date,Revenue,Expenses,Profit");
    data.dailyTrends.forEach((d) => {
      lines.push(`"${d.date}",${d.revenue},${d.expenses},${d.profit}`);
    });
    lines.push("");
    lines.push("TOP PRODUCTS");
    lines.push("Product Name,SKU,Units Sold,Total Revenue");
    data.topProducts.forEach((p) => {
      lines.push(`"${p.name}","${p.sku}",${p.unitsSold},${p.revenue.toFixed(2)}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const s = data?.summary ?? {
    totalRevenue: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionsCount: 0,
    averageOrderValue: 0,
    lowStockCount: 0,
  };

  return (
    <AppShell active="/reports">
      <div className="page-wrap report-page">
        {/* Header */}
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <BarChart3 size={14} /> Business Intelligence & Analytics
            </div>
            <h1>Financial Reports & Category Intelligence</h1>
            <p>
              Track inventory valuations, total items by category, revenue velocity, and store
              margins in real time.
            </p>
          </div>
          <div className="heading-actions">
            <div className="filter-group">
              {["Last 7 Days", "This Month", "All Time"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-chip ${timeRange === t ? "active" : ""}`}
                  onClick={() => setTimeRange(t)}
                >
                  <CalendarDays size={13} style={{ marginRight: "4px" }} /> {t}
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={exportReportCSV} disabled={!data}>
              <Download size={16} /> Export report
            </button>
          </div>
        </section>

        {/* Global Financial KPI Cards */}
        <section className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-card-top">
              <span className="stat-icon">
                <CircleDollarSign size={20} />
              </span>
              <span className="stat-change positive">Revenue</span>
            </div>
            <span className="stat-title">Gross sales revenue</span>
            <strong className="stat-value">
              GHS {s.totalRevenue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="stat-card green">
            <div className="stat-card-top">
              <span className="stat-icon">
                <TrendingUp size={20} />
              </span>
              <span className="stat-change positive">Earnings</span>
            </div>
            <span className="stat-title">Net store profit</span>
            <strong className="stat-value">
              GHS {s.netProfit.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="stat-card amber">
            <div className="stat-card-top">
              <span className="stat-icon">
                <WalletCards size={20} />
              </span>
              <span className="stat-change negative">Expenses</span>
            </div>
            <span className="stat-title">Operating costs</span>
            <strong className="stat-value">
              GHS {s.totalExpenses.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="stat-card purple">
            <div className="stat-card-top">
              <span className="stat-icon">
                <Receipt size={20} />
              </span>
              <span className="stat-change positive">Sales</span>
            </div>
            <span className="stat-title">Avg. transaction value</span>
            <strong className="stat-value">
              GHS {s.averageOrderValue.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </section>

        {/* SECTION: CATEGORY INVENTORY & VALUATION FOCUS */}
        <section
          className="panel"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "var(--bg-surface)",
            borderRadius: "14px",
            border: "1px solid var(--border-medium)",
          }}
        >
          {/* Section Toolbar with Category Selector */}
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
                <Layers size={14} /> Category Inventory & Valuation Analytics
              </div>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700 }}>
                {activeStats.isSpecific ? activeStats.title : "Catalog Categories Overview"}
              </h2>
              <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: "13px" }}>
                Total items in stock and total monetary valuation of products under each category.
              </p>
            </div>

            {/* Category Select Control */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--ink-muted)",
                }}
              >
                <Filter size={15} /> Select Category:
              </div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-medium)",
                  background: "var(--bg-surface)",
                  color: "var(--ink-base)",
                  fontSize: "13px",
                  fontWeight: 600,
                  minWidth: "210px",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">All Categories Combined ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.totalItems} items · GHS {c.totalAmount.toLocaleString("en-GH")})
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

          {/* Highlight KPI Cards for Selected Category */}
          <div className="stats-grid" style={{ marginTop: 0 }}>
            {/* Total Items Card */}
            <div className="stat-card blue">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <Boxes size={20} />
                </span>
                <span className="stat-change positive">Inventory units</span>
              </div>
              <span className="stat-title">
                {activeStats.isSpecific
                  ? `Total items in ${activeStats.title}`
                  : "Total items in stock"}
              </span>
              <strong className="stat-value">
                {activeStats.totalItems.toLocaleString("en-GH")} units
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
                {activeStats.productCount} product {activeStats.productCount === 1 ? "type" : "types"}{" "}
                ({activeStats.variantCount} variants)
              </span>
            </div>

            {/* Total Amount of Products Card */}
            <div className="stat-card green">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <CircleDollarSign size={20} />
                </span>
                <span className="stat-change positive">Total valuation</span>
              </div>
              <span className="stat-title">
                {activeStats.isSpecific
                  ? `Total amount of products (${activeStats.title})`
                  : "Total amount of all products"}
              </span>
              <strong className="stat-value">
                GHS{" "}
                {activeStats.totalAmount.toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
                {activeStats.isSpecific
                  ? `${activeStats.valueShare}% of total store inventory value`
                  : "Combined retail value across catalog"}
              </span>
            </div>

            {/* Cost Basis Card */}
            <div className="stat-card purple">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <Tag size={20} />
                </span>
                <span className="stat-change positive">{activeStats.margin}% margin</span>
              </div>
              <span className="stat-title">Inventory cost basis</span>
              <strong className="stat-value">
                GHS{" "}
                {activeStats.totalCostAmount.toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
                Potential profit: GHS{" "}
                {(activeStats.totalAmount - activeStats.totalCostAmount).toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Historical Sales Card */}
            <div className="stat-card amber">
              <div className="stat-card-top">
                <span className="stat-icon">
                  <TrendingUp size={20} />
                </span>
                <span className="stat-change positive">{activeStats.unitsSold} units sold</span>
              </div>
              <span className="stat-title">Category sales revenue</span>
              <strong className="stat-value">
                GHS{" "}
                {activeStats.totalRevenue.toLocaleString("en-GH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
                Historical fulfilled transaction sales
              </span>
            </div>
          </div>

          {/* Category Valuation Bar Chart */}
          {categories.length > 0 && (
            <div
              style={{
                marginTop: "10px",
                padding: "16px 20px",
                background: "var(--bg-card, rgba(255,255,255,0.03))",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
                    Product Valuation by Category (GHS)
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    Comparing total retail amounts of all inventory items per category
                  </span>
                </div>
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
                        `GHS ${Number(val).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
                        name === "totalAmount" ? "Total Product Valuation" : "Cost Basis",
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
                      name="Total Valuation (GHS)"
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

          {/* Full Category Table Ledger */}
          <div style={{ marginTop: "6px" }}>
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
                  All Categories Breakdown
                </h3>
                <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                  {filteredCategories.length} categories listed
                </span>
              </div>
              <div className="search-box" style={{ width: "240px" }}>
                <Search size={15} />
                <input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
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
                    <th>Total Items (Stock)</th>
                    <th>Total Product Amount (GHS)</th>
                    <th>Total Cost Basis (GHS)</th>
                    <th>Sales Revenue</th>
                    <th>Inventory Share</th>
                    <th style={{ textAlign: "right" }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c) => {
                      const isSelected = selectedCategoryId === c.id;
                      return (
                        <tr
                          key={c.id}
                          style={{
                            background: isSelected ? "var(--bg-active, rgba(37,99,235,0.08))" : undefined,
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
                                  background: isSelected ? "var(--brand-primary)" : "var(--border-strong)",
                                }}
                              />
                              <strong>{c.name}</strong>
                            </div>
                          </td>
                          <td>
                            {c.productCount} {c.productCount === 1 ? "product" : "products"}
                          </td>
                          <td>
                            <strong style={{ color: "var(--ink-base)" }}>
                              {c.totalItems.toLocaleString("en-GH")} units
                            </strong>
                          </td>
                          <td>
                            <strong style={{ color: "var(--brand-primary)" }}>
                              GHS{" "}
                              {c.totalAmount.toLocaleString("en-GH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </td>
                          <td>
                            GHS{" "}
                            {c.totalCostAmount.toLocaleString("en-GH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td>
                            GHS{" "}
                            {c.totalRevenue.toLocaleString("en-GH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
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
                                {c.valueShare}%
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
          </div>
        </section>

        {/* SECTION: OPERATIONAL CHARTS (Area & Payment Pie) */}
        <section className="dashboard-empty-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* Revenue & Profit Area Chart */}
          <div
            className="panel"
            style={{ padding: "20px", display: "flex", flexDirection: "column" }}
          >
            <div className="records-toolbar" style={{ borderBottom: "none", padding: "0 0 16px" }}>
              <div>
                <h2>Revenue & Profit Timeline</h2>
                <p>Daily performance over the recent operational period</p>
              </div>
            </div>
            <div style={{ height: "300px", width: "100%" }}>
              {data && data.dailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.dailyTrends}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
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
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis stroke="var(--ink-muted)" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "10px",
                        boxShadow: "var(--shadow-md)",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue (GHS)"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#revenueGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Net Profit (GHS)"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#profitGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: "100%" }}>
                  <BarChart3 size={28} />
                  <strong>No chart data available</strong>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Distribution Chart */}
          <div
            className="panel"
            style={{ padding: "20px", display: "flex", flexDirection: "column" }}
          >
            <div className="records-toolbar" style={{ borderBottom: "none", padding: "0 0 16px" }}>
              <div>
                <h2>Payment Channels</h2>
                <p>Distribution by settlement method</p>
              </div>
            </div>
            <div style={{ height: "300px", width: "100%" }}>
              {data && data.paymentBreakdown.some((p) => p.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentBreakdown.filter((p) => p.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
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
                      formatter={(val) => `GHS ${Number(val).toFixed(2)}`}
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
                  <CircleDollarSign size={28} />
                  <strong>No settlement records</strong>
                  <span>Transactions will segment by payment type here.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Top Performing Products Ledger */}
        <section className="panel records-panel">
          <div className="records-toolbar">
            <div>
              <h2>Top Performing Inventory Items</h2>
              <p>Items generating highest volume and revenue</p>
            </div>
          </div>
          <div className="table-wrap records-table">
            <table>
              <thead>
                <tr>
                  <th>Product Item</th>
                  <th>SKU Code</th>
                  <th>Units Sold</th>
                  <th>Total Sales (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {data && data.topProducts.length > 0 ? (
                  data.topProducts.map((p) => (
                    <tr key={p.sku}>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <span className="record-id">{p.sku}</span>
                      </td>
                      <td>{p.unitsSold} units</td>
                      <td>
                        <strong>GHS {p.revenue.toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "36px" }}>
                      <Package size={24} style={{ margin: "0 auto 8px", display: "block" }} />
                      Product sales will rank here once transactions occur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
