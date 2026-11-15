import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthQuery = searchParams.get("month"); // e.g. "2026-11" or "all"
    const rangeQuery = searchParams.get("range"); // legacy support: "7d", "30d", "this-month", "all"

    // Fetch all needed records in parallel
    const [sales, expenses, categories, variants] = await Promise.all([
      db.sale.findMany({
        where: { status: "COMPLETED" },
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.expense.findMany({
        orderBy: { createdAt: "desc" },
      }),
      db.category.findMany({
        include: {
          products: {
            include: {
              variants: true,
            },
          },
        },
      }),
      db.productVariant.findMany({
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: { stock: "desc" },
      }),
    ]);

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Helper for formatting year-month keys
    const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const getMonthLabel = (key: string) => {
      const [y, m] = key.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    };
    const getShortMonthLabel = (key: string) => {
      const [y, m] = key.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    };

    // Collect all unique month keys from sales, expenses, and at least the last 6 months
    const monthKeysSet = new Set<string>();
    monthKeysSet.add(currentYearMonth);
    for (let i = 1; i <= 6; i++) {
      const past = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeysSet.add(getMonthKey(past));
    }
    sales.forEach((s) => monthKeysSet.add(getMonthKey(s.createdAt)));
    expenses.forEach((e) => monthKeysSet.add(getMonthKey(e.createdAt)));

    const sortedMonthKeys = Array.from(monthKeysSet).sort((a, b) => b.localeCompare(a));
    const availableMonths = sortedMonthKeys.map((key) => ({
      key,
      label: getMonthLabel(key),
      isCurrent: key === currentYearMonth,
    }));

    // Determine the active month filter
    let selectedMonth = monthQuery || "";
    if (!selectedMonth) {
      if (rangeQuery === "this-month" || rangeQuery === "30d") {
        selectedMonth = currentYearMonth;
      } else if (rangeQuery === "all") {
        selectedMonth = "all";
      } else {
        selectedMonth = currentYearMonth;
      }
    }

    // 1. COMPUTE STOCK / INVENTORY VALUATION (What I have in stock right now and how much)
    let totalStockUnits = 0;
    let totalStockRetailValue = 0;
    let totalStockCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    const inventoryItems = variants.map((v) => {
      const stock = v.stock;
      const unitCost = Number(v.costPrice || 0);
      const unitPrice = Number(v.sellingPrice || 0);
      const totalRetail = stock * unitPrice;
      const totalCost = stock * unitCost;
      const profit = totalRetail - totalCost;

      totalStockUnits += stock;
      totalStockRetailValue += totalRetail;
      totalStockCostValue += totalCost;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= v.reorderLevel) {
        lowStockCount++;
      } else {
        inStockCount++;
      }

      return {
        id: v.id,
        sku: v.sku,
        name: v.name,
        categoryName: v.product?.category?.name || "Uncategorized",
        stock,
        reorderLevel: v.reorderLevel,
        unitCost,
        unitPrice,
        totalRetail,
        totalCost,
        potentialProfit: profit,
        status: stock === 0 ? "Out of stock" : stock <= v.reorderLevel ? "Low stock" : "In stock",
      };
    });

    const projectedStockProfit = Math.max(0, totalStockRetailValue - totalStockCostValue);
    const projectedMargin =
      totalStockRetailValue > 0 ? (projectedStockProfit / totalStockRetailValue) * 100 : 0;

    const currentStockSummary = {
      totalUnits: totalStockUnits,
      totalRetailValue: Math.round(totalStockRetailValue * 100) / 100,
      totalCostValue: Math.round(totalStockCostValue * 100) / 100,
      projectedProfit: Math.round(projectedStockProfit * 100) / 100,
      projectedMargin: Math.round(projectedMargin * 10) / 10,
      totalProducts: new Set(variants.map((v) => v.productId)).size,
      totalVariants: variants.length,
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };

    // 2. COMPUTE MONTH-BY-MONTH BREAKDOWN (Every Month's Revenue, COGS, Profit, Expenses)
    type MonthBucket = {
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
      expensesMap: Record<string, number>;
    };

    const monthlyBuckets: Record<string, MonthBucket> = {};
    sortedMonthKeys.forEach((k) => {
      monthlyBuckets[k] = {
        key: k,
        label: getMonthLabel(k),
        shortLabel: getShortMonthLabel(k),
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        margin: 0,
        transactionsCount: 0,
        unitsSold: 0,
        expensesMap: {},
      };
    });

    // Populate Sales into monthly buckets
    sales.forEach((s) => {
      const k = getMonthKey(s.createdAt);
      if (!monthlyBuckets[k]) {
        monthlyBuckets[k] = {
          key: k,
          label: getMonthLabel(k),
          shortLabel: getShortMonthLabel(k),
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          expenses: 0,
          netProfit: 0,
          margin: 0,
          transactionsCount: 0,
          unitsSold: 0,
          expensesMap: {},
        };
      }
      const b = monthlyBuckets[k];
      const saleTotal = Number(s.total || 0);
      b.revenue += saleTotal;
      b.transactionsCount += 1;

      s.items.forEach((it) => {
        const itemCost = Number(it.unitCost || 0) * it.quantity;
        b.cogs += itemCost;
        b.unitsSold += it.quantity;
      });
    });

    // Populate Expenses into monthly buckets
    expenses.forEach((e) => {
      const k = getMonthKey(e.createdAt);
      if (!monthlyBuckets[k]) {
        monthlyBuckets[k] = {
          key: k,
          label: getMonthLabel(k),
          shortLabel: getShortMonthLabel(k),
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          expenses: 0,
          netProfit: 0,
          margin: 0,
          transactionsCount: 0,
          unitsSold: 0,
          expensesMap: {},
        };
      }
      const b = monthlyBuckets[k];
      const amt = Number(e.amount || 0);
      b.expenses += amt;
      b.expensesMap[e.category] = (b.expensesMap[e.category] || 0) + amt;
    });

    // Finalize buckets
    const monthlyBreakdown = sortedMonthKeys.map((k) => {
      const b = monthlyBuckets[k];
      b.grossProfit = b.revenue - b.cogs;
      b.netProfit = b.grossProfit - b.expenses;
      b.margin = b.revenue > 0 ? (b.netProfit / b.revenue) * 100 : 0;

      // Top expense category
      const topCat = Object.entries(b.expensesMap).sort((x, y) => y[1] - x[1])[0];

      return {
        key: b.key,
        label: b.label,
        shortLabel: b.shortLabel,
        revenue: Math.round(b.revenue * 100) / 100,
        cogs: Math.round(b.cogs * 100) / 100,
        grossProfit: Math.round(b.grossProfit * 100) / 100,
        expenses: Math.round(b.expenses * 100) / 100,
        netProfit: Math.round(b.netProfit * 100) / 100,
        margin: Math.round(b.margin * 10) / 10,
        transactionsCount: b.transactionsCount,
        unitsSold: b.unitsSold,
        topExpenseCategory: topCat ? `${topCat[0]} (GHS ${topCat[1].toFixed(2)})` : "None",
      };
    });

    // 3. COMPUTE ACTIVE FILTERED PERIOD (Specific Month or All-Time)
    let filteredSales = sales;
    let filteredExpenses = expenses;

    if (selectedMonth !== "all") {
      filteredSales = sales.filter((s) => getMonthKey(s.createdAt) === selectedMonth);
      filteredExpenses = expenses.filter((e) => getMonthKey(e.createdAt) === selectedMonth);
    }

    let activeRevenue = 0;
    let activeCogs = 0;
    let activeUnitsSold = 0;
    const activeProductSalesMap: Record<string, { name: string; sku: string; unitsSold: number; revenue: number }> = {};
    const activePaymentMethodsMap: Record<string, number> = {
      Cash: 0,
      "Mobile Money": 0,
      Card: 0,
      "Bank Transfer": 0,
      Other: 0,
    };

    filteredSales.forEach((s) => {
      activeRevenue += Number(s.total || 0);
      s.items.forEach((it) => {
        const itemCost = Number(it.unitCost || 0) * it.quantity;
        activeCogs += itemCost;
        activeUnitsSold += it.quantity;

        const prodId = it.productVariantId || "detached";
        const prodName = it.productVariant?.product?.name || it.productVariant?.name || "Product item";
        const prodSku = it.productVariant?.sku || "SKU-N/A";
        if (!activeProductSalesMap[prodId]) {
          activeProductSalesMap[prodId] = { name: prodName, sku: prodSku, unitsSold: 0, revenue: 0 };
        }
        activeProductSalesMap[prodId].unitsSold += it.quantity;
        activeProductSalesMap[prodId].revenue += Number(it.total || 0);
      });

      s.payments.forEach((p) => {
        const methodKey =
          p.method === "CASH"
            ? "Cash"
            : p.method === "MOBILE_MONEY"
            ? "Mobile Money"
            : p.method === "CARD"
            ? "Card"
            : p.method === "BANK_TRANSFER"
            ? "Bank Transfer"
            : "Other";
        activePaymentMethodsMap[methodKey] = (activePaymentMethodsMap[methodKey] || 0) + Number(p.amount || 0);
      });
    });

    let activeExpensesTotal = 0;
    const activeExpensesByCategoryMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      activeExpensesTotal += amt;
      activeExpensesByCategoryMap[e.category] = (activeExpensesByCategoryMap[e.category] || 0) + amt;
    });

    const activeGrossProfit = activeRevenue - activeCogs;
    const activeNetProfit = activeGrossProfit - activeExpensesTotal;
    const activeMargin = activeRevenue > 0 ? (activeNetProfit / activeRevenue) * 100 : 0;
    const activeAvgOrder = filteredSales.length > 0 ? activeRevenue / filteredSales.length : 0;

    // Daily trends for the active period
    const dailyMap: Record<string, { date: string; revenue: number; expenses: number; profit: number }> = {};
    if (selectedMonth !== "all") {
      // Generate days for that month (1 to days in month)
      const [yr, mo] = selectedMonth.split("-").map(Number);
      const daysInMonth = new Date(yr, mo, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dObj = new Date(yr, mo - 1, day);
        const dateKey = dObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        dailyMap[dateKey] = { date: dateKey, revenue: 0, expenses: 0, profit: 0 };
      }
    } else {
      // For all time, group by month in chronological order
      sortedMonthKeys.slice(0, 12).reverse().forEach((k) => {
        const b = monthlyBuckets[k];
        dailyMap[b.shortLabel] = {
          date: b.shortLabel,
          revenue: Math.round(b.revenue * 100) / 100,
          expenses: Math.round(b.expenses * 100) / 100,
          profit: Math.round(b.netProfit * 100) / 100,
        };
      });
    }

    if (selectedMonth !== "all") {
      filteredSales.forEach((s) => {
        const dateKey = s.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].revenue += Number(s.total || 0);
        }
      });
      filteredExpenses.forEach((e) => {
        const dateKey = e.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].expenses += Number(e.amount || 0);
        }
      });
      Object.values(dailyMap).forEach((d) => {
        d.profit = d.revenue - d.expenses;
      });
    }

    const dailyTrends = Object.values(dailyMap);

    const expensesByCategory = Object.entries(activeExpensesByCategoryMap)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        share: activeExpensesTotal > 0 ? Math.round((amount / activeExpensesTotal) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const paymentBreakdown = Object.entries(activePaymentMethodsMap).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

    const topProducts = Object.values(activeProductSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 4. CATEGORY BREAKDOWN LEDGER
    const categoryStatsMap: Record<
      string,
      {
        id: string;
        name: string;
        productCount: number;
        variantCount: number;
        totalItems: number;
        totalAmount: number;
        totalCostAmount: number;
        unitsSold: number;
        totalRevenue: number;
      }
    > = {};

    categories.forEach((cat) => {
      let variantCount = 0;
      let totalItems = 0;
      let totalAmount = 0;
      let totalCostAmount = 0;

      cat.products.forEach((prod) => {
        variantCount += prod.variants.length;
        prod.variants.forEach((v) => {
          const st = v.stock;
          totalItems += st;
          totalAmount += st * Number(v.sellingPrice || 0);
          totalCostAmount += st * Number(v.costPrice || 0);
        });
      });

      categoryStatsMap[cat.id] = {
        id: cat.id,
        name: cat.name,
        productCount: cat.products.length,
        variantCount,
        totalItems,
        totalAmount,
        totalCostAmount,
        unitsSold: 0,
        totalRevenue: 0,
      };
    });

    // Attribute sales to categories in selected period
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        const catId = it.productVariant?.product?.categoryId;
        if (catId && categoryStatsMap[catId]) {
          categoryStatsMap[catId].unitsSold += it.quantity;
          categoryStatsMap[catId].totalRevenue += Number(it.total || 0);
        }
      });
    });

    const categoryBreakdown = Object.values(categoryStatsMap)
      .map((cat) => ({
        ...cat,
        totalAmount: Math.round(cat.totalAmount * 100) / 100,
        totalCostAmount: Math.round(cat.totalCostAmount * 100) / 100,
        totalRevenue: Math.round(cat.totalRevenue * 100) / 100,
        valueShare:
          totalStockRetailValue > 0
            ? Math.round((cat.totalAmount / totalStockRetailValue) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(activeRevenue * 100) / 100,
        cogs: Math.round(activeCogs * 100) / 100,
        grossProfit: Math.round(activeGrossProfit * 100) / 100,
        totalExpenses: Math.round(activeExpensesTotal * 100) / 100,
        netProfit: Math.round(activeNetProfit * 100) / 100,
        margin: Math.round(activeMargin * 10) / 10,
        transactionsCount: filteredSales.length,
        averageOrderValue: Math.round(activeAvgOrder * 100) / 100,
        unitsSold: activeUnitsSold,
        totalInventoryValue: currentStockSummary.totalRetailValue,
        totalInventoryItems: currentStockSummary.totalUnits,
        lowStockCount: currentStockSummary.lowStockCount,
        outOfStockCount: currentStockSummary.outOfStockCount,
      },
      selectedMonth,
      selectedMonthLabel: selectedMonth === "all" ? "All Time" : getMonthLabel(selectedMonth),
      availableMonths,
      monthlyBreakdown,
      currentStock: currentStockSummary,
      inventoryItems: inventoryItems.slice(0, 50),
      expensesByCategory,
      dailyTrends,
      paymentBreakdown,
      categoryBreakdown,
      topProducts,
    });
  } catch (error) {
    console.error("GET /api/reports failed", error);
    return NextResponse.json(
      { error: "Failed to generate business intelligence metrics" },
      { status: 500 }
    );
  }
}
