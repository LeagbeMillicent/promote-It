"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Download,
  Package,
  Receipt,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
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

type ReportData = {
  summary: {
    totalRevenue: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    transactionsCount: number;
    averageOrderValue: number;
    lowStockCount: number;
  };
  dailyTrends: { date: string; revenue: number; expenses: number; profit: number }[];
  paymentBreakdown: { name: string; value: number }[];
  topProducts: { name: string; sku: string; unitsSold: number; revenue: number }[];
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [timeRange, setTimeRange] = useState("Last 7 Days");

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => undefined);
  }, []);

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
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <BarChart3 size={14} /> Business Intelligence & Analytics
            </div>
            <h1>Financial Reports & Trends</h1>
            <p>Understand revenue velocity, operating costs, and profit margins in real-time.</p>
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

        {/* KPI Financial Overview */}
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

        {/* Interactive Charts Section */}
        <section className="dashboard-empty-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
          {/* Revenue & Profit Area Chart */}
          <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
            <div className="records-toolbar" style={{ borderBottom: "none", padding: "0 0 16px" }}>
              <div>
                <h2>Revenue & Profit Timeline</h2>
                <p>Daily performance over the recent operational period</p>
              </div>
            </div>
            <div style={{ height: "300px", width: "100%" }}>
              {data && data.dailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--ink-muted)" fontSize={12} tickLine={false} />
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
          <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
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
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
