import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    const now = new Date();
    let startDate = new Date();
    if (range === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      startDate.setDate(now.getDate() - 30);
    } else if (range === "90d") {
      startDate.setDate(now.getDate() - 90);
    } else if (range === "1y") {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const [sales, expenses, categories, variants] = await Promise.all([
      db.sale.findMany({
        where: {
          createdAt: { gte: startDate },
          status: "COMPLETED",
        },
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
      }),
      db.expense.findMany({
        where: {
          createdAt: { gte: startDate },
        },
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
          product: true,
        },
      }),
    ]);

    let totalRevenue = 0;
    let totalCost = 0;
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    // Grouping by date for line/bar charts
    const dailyMap: Record<string, { date: string; revenue: number; expenses: number; profit: number }> = {};
    const curr = new Date(startDate);
    while (curr <= now) {
      const key = curr.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      dailyMap[key] = { date: key, revenue: 0, expenses: 0, profit: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    // Process expenses
    for (const exp of expenses) {
      const key = exp.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (dailyMap[key]) {
        dailyMap[key].expenses += Number(exp.amount || 0);
      }
    }

    // Initialize Category breakdown
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

    for (const cat of categories) {
      let variantCount = 0;
      let totalItems = 0;
      let totalAmount = 0;
      let totalCostAmount = 0;

      for (const prod of cat.products) {
        variantCount += prod.variants.length;
        for (const variant of prod.variants) {
          const stock = variant.stock;
          const sellPrice = Number(variant.sellingPrice || 0);
          const costPrice = Number(variant.costPrice || 0);
          totalItems += stock;
          totalAmount += stock * sellPrice;
          totalCostAmount += stock * costPrice;
        }
      }

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
    }

    const productSalesMap: Record<string, { name: string; sku: string; unitsSold: number; revenue: number }> = {};
    const paymentMethodsMap: Record<string, number> = {
      Cash: 0,
      "Mobile Money": 0,
      Card: 0,
      "Bank Transfer": 0,
      Other: 0,
    };

    // Process sales
    for (const sale of sales) {
      const amount = Number(sale.total || 0);
      totalRevenue += amount;

      const dateKey = sale.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].revenue += amount;
      }

      for (const item of sale.items) {
        const itemCost = Number(item.unitCost || 0) * item.quantity;
        totalCost += itemCost;

        const prodId = item.productVariantId || "detached";
        const prodName = item.productVariant?.name || "Product";
        const prodSku = item.productVariant?.sku || "SKU-N/A";
        if (!productSalesMap[prodId]) {
          productSalesMap[prodId] = { name: prodName, sku: prodSku, unitsSold: 0, revenue: 0 };
        }
        productSalesMap[prodId].unitsSold += item.quantity;
        productSalesMap[prodId].revenue += Number(item.total || 0);

        // Attribute sales to category
        const catId = item.productVariant?.product?.categoryId;
        if (catId && categoryStatsMap[catId]) {
          categoryStatsMap[catId].unitsSold += item.quantity;
          categoryStatsMap[catId].totalRevenue += Number(item.total || 0);
        }
      }

      for (const pay of sale.payments) {
        const methodKey =
          pay.method === "CASH"
            ? "Cash"
            : pay.method === "MOBILE_MONEY"
            ? "Mobile Money"
            : pay.method === "CARD"
            ? "Card"
            : pay.method === "BANK_TRANSFER"
            ? "Bank Transfer"
            : "Other";
        paymentMethodsMap[methodKey] = (paymentMethodsMap[methodKey] || 0) + Number(pay.amount || 0);
      }
    }

    const dailyTrends = Object.values(dailyMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    Object.values(dailyMap).forEach((day) => {
      day.profit = Math.max(0, day.revenue - day.expenses);
    });

    const grossProfit = Math.max(0, totalRevenue - totalCost);
    const netProfit = totalRevenue - totalCost - totalExpenses;
    const transactionsCount = sales.length;
    const averageOrderValue = transactionsCount > 0 ? totalRevenue / transactionsCount : 0;

    const paymentBreakdown = Object.entries(paymentMethodsMap).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStockCount = variants.filter((p) => p.stock <= p.reorderLevel).length;

    const totalInventoryValue = Object.values(categoryStatsMap).reduce((acc, c) => acc + c.totalAmount, 0);
    const totalInventoryItems = Object.values(categoryStatsMap).reduce((acc, c) => acc + c.totalItems, 0);

    const categoryBreakdown = Object.values(categoryStatsMap)
      .map((cat) => ({
        ...cat,
        totalAmount: Math.round(cat.totalAmount * 100) / 100,
        totalCostAmount: Math.round(cat.totalCostAmount * 100) / 100,
        totalRevenue: Math.round(cat.totalRevenue * 100) / 100,
        valueShare: totalInventoryValue > 0 ? Math.round((cat.totalAmount / totalInventoryValue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      summary: {
        totalRevenue,
        grossProfit,
        totalExpenses,
        netProfit,
        transactionsCount,
        averageOrderValue,
        totalInventoryValue,
        totalInventoryItems,
        lowStockCount,
      },
      dailyTrends,
      paymentBreakdown,
      categoryBreakdown,
      topProducts,
    });
  } catch (error) {
    console.error("GET /api/reports failed", error);
    return NextResponse.json({ error: "Failed to generate business intelligence metrics" }, { status: 500 });
  }
}
