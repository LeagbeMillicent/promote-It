import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [sales, expenses, products] = await Promise.all([
      db.sale.findMany({
        where: { status: "COMPLETED" },
        include: {
          items: {
            include: {
              productVariant: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      db.expense.findMany({
        orderBy: { createdAt: "asc" },
      }),
      db.productVariant.findMany({
        include: { product: true },
      }),
    ]);

    let totalRevenue = 0;
    let totalCost = 0;
    const paymentMethodsMap: Record<string, number> = {
      Cash: 0,
      "Mobile Money": 0,
      Card: 0,
      "Bank Transfer": 0,
      Other: 0,
    };

    const dailyMap: Record<string, { date: string; revenue: number; expenses: number; profit: number }> = {};
    const productSalesMap: Record<string, { name: string; sku: string; unitsSold: number; revenue: number }> = {};

    // Initialize last 7 days in dailyMap
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      dailyMap[key] = { date: key, revenue: 0, expenses: 0, profit: 0 };
    }

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

        const prodId = item.productVariantId;
        const prodName = item.productVariant.name;
        const prodSku = item.productVariant.sku;
        if (!productSalesMap[prodId]) {
          productSalesMap[prodId] = { name: prodName, sku: prodSku, unitsSold: 0, revenue: 0 };
        }
        productSalesMap[prodId].unitsSold += item.quantity;
        productSalesMap[prodId].revenue += Number(item.total || 0);
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

    // Process expenses
    let totalExpenses = 0;
    for (const expense of expenses) {
      const amount = Number(expense.amount || 0);
      totalExpenses += amount;

      const dateKey = expense.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].expenses += amount;
      }
    }

    // Calculate daily profits
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

    const lowStockCount = products.filter((p) => p.stock <= p.reorderLevel).length;

    return NextResponse.json({
      summary: {
        totalRevenue,
        grossProfit,
        totalExpenses,
        netProfit,
        transactionsCount,
        averageOrderValue,
        lowStockCount,
      },
      dailyTrends: Object.values(dailyMap),
      paymentBreakdown,
      topProducts,
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Report data is unavailable" }, { status: 503 });
  }
}
