import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSale } from "@/lib/services/sales";
import { formatErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sales = await db.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        payments: true,
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        customer: true,
        cashier: true,
        location: true,
      },
    });
    return NextResponse.json(
      sales.map((sale) => {
        const items = sale.items.map((it) => ({
          id: it.id,
          name: it.productVariant?.product?.name ?? "Unknown item",
          sku: it.productVariant?.sku ?? "",
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
        }));
        const totalQuantity = items.reduce((acc, it) => acc + it.quantity, 0);
        const itemsSummary =
          items.length === 0
            ? "No items"
            : items.length === 1
            ? `${items[0].quantity}× ${items[0].name}`
            : `${items[0].quantity}× ${items[0].name} +${items.length - 1} more`;

        const paymentMethod = sale.payments[0]?.method.replaceAll("_", " ") ?? "Unpaid";
        const paymentReference = sale.payments[0]?.reference ?? undefined;
        const customerName = sale.customer
          ? `${sale.customer.name}${sale.customer.phone ? ` (${sale.customer.phone})` : ""}`
          : "Walk-in Customer";
        const cashierName = sale.cashier?.name ?? "Staff";
        const rawLocationName = sale.location?.name;
        const locationName = (!rawLocationName || rawLocationName.toLowerCase().includes("accra central") || rawLocationName.includes("Adenta Down"))
          ? "Adenta-Accountancy, Accra"
          : rawLocationName;

        return {
          id: sale.saleNumber,
          saleId: sale.id,
          amount: Number(sale.total),
          subtotal: Number(sale.subtotal),
          discount: Number(sale.discount),
          createdAt: sale.createdAt.toISOString(),
          paymentMethod,
          paymentReference,
          customerName,
          cashierName,
          locationName,
          items,
          totalQuantity,
          itemsSummary,
          values: [
            paymentMethod,
            `GHS ${Number(sale.total).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
            sale.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            sale.status === "COMPLETED" ? "Paid" : "Not Paid",
          ],
          status: sale.status === "COMPLETED" ? "Paid" : "Not Paid",
          tone: sale.status === "COMPLETED" ? "green" : "red",
        };
      })
    );
  } catch {
    return NextResponse.json({ error: "Sales data is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productVariantId?: string;
      quantity?: number;
      items?: Array<{ productVariantId: string; quantity: number }>;
      paymentMethod?: "CASH" | "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER" | "OTHER";
      status?: "Paid" | "Not Paid" | "COMPLETED" | "CANCELLED";
      reference?: string;
      customerId?: string;
    };

    // Normalize incoming items array or single item
    const rawItems: Array<{ productVariantId: string; quantity: number }> =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : body.productVariantId && body.quantity
        ? [{ productVariantId: body.productVariantId, quantity: body.quantity }]
        : [];

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Select at least one product with a valid quantity" }, { status: 400 });
    }

    for (const item of rawItems) {
      if (!item.productVariantId || !item.quantity || item.quantity < 1) {
        return NextResponse.json({ error: "Each selected item must have a valid quantity of 1 or more" }, { status: 400 });
      }
    }

    const variantIds = Array.from(new Set(rawItems.map((it) => it.productVariantId)));
    const [variants, location, cashier, customer] = await Promise.all([
      db.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          sku: true,
          sellingPrice: true,
          locationId: true,
          stock: true,
          product: { select: { name: true } },
        },
      }),
      db.location.findFirst({ orderBy: { createdAt: "asc" } }),
      db.user.findFirst({ orderBy: { createdAt: "asc" } }),
      body.customerId ? db.customer.findUnique({ where: { id: body.customerId } }) : null,
    ]);

    if (!location || !cashier) {
      return NextResponse.json({ error: "Create a location and user before recording a sale" }, { status: 409 });
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Check availability and stock
    const qtyByVariant = new Map<string, number>();
    for (const item of rawItems) {
      const variant = variantMap.get(item.productVariantId);
      if (!variant) {
        return NextResponse.json({ error: "One or more selected products were not found" }, { status: 404 });
      }
      const current = qtyByVariant.get(item.productVariantId) || 0;
      qtyByVariant.set(item.productVariantId, current + item.quantity);
    }

    for (const [vId, totalQty] of qtyByVariant.entries()) {
      const variant = variantMap.get(vId)!;
      if (variant.stock < totalQty) {
        return NextResponse.json(
          { error: `Insufficient stock for ${variant.product.name}. Available: ${variant.stock} units (requested ${totalQty})` },
          { status: 400 }
        );
      }
    }

    // Build items for createSale and receipt
    const saleItems = rawItems.map((item) => {
      const variant = variantMap.get(item.productVariantId)!;
      const unitPrice = Number(variant.sellingPrice);
      return {
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice,
        discount: 0,
      };
    });

    const receiptItems = rawItems.map((item) => {
      const variant = variantMap.get(item.productVariantId)!;
      const unitPrice = Number(variant.sellingPrice);
      const lineTotal = unitPrice * item.quantity;
      return {
        name: variant.product.name,
        sku: variant.sku,
        quantity: item.quantity,
        unitPrice,
        total: lineTotal,
      };
    });

    const total = receiptItems.reduce((acc, item) => acc + item.total, 0);
    const saleNumber = `PT-${Date.now().toString().slice(-8)}`;
    const isNotPaid = body.status === "Not Paid" || body.status === "CANCELLED";

    const sale = await createSale({
      saleNumber,
      locationId: location.id,
      cashierId: cashier.id,
      customerId: body.customerId,
      discount: 0,
      status: isNotPaid ? "CANCELLED" : "COMPLETED",
      items: saleItems,
      payment: { method: body.paymentMethod ?? "CASH", amount: total, reference: body.reference },
    });

    const receipt = {
      saleNumber: sale.saleNumber,
      date: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      storeName: "promoteIt Ventures",
      storeTagline: "Quality you can trust, service you'll love",
      storeLocation: (!location.name || location.name.toLowerCase().includes("accra central") || location.name.includes("Adenta Down")) ? "Adenta-Accountancy, Accra" : location.name,
      storeAddress: "Adenta-Accountancy, Accra",
      storePhone: "0553898761",
      cashier: cashier.name,
      customer: customer ? `${customer.name}${customer.phone ? ` (${customer.phone})` : ""}` : "Walk-in Customer",
      paymentMethod: (body.paymentMethod ?? "CASH").replaceAll("_", " "),
      paymentReference: body.reference || undefined,
      items: receiptItems,
      subtotal: total,
      discount: 0,
      total: total,
    };

    return NextResponse.json({
      saleNumber: sale.saleNumber,
      total: total.toFixed(2),
      receipt,
    }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error, "Sale could not be completed");
  }
}