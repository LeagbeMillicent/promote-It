import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const sale = await db.sale.findFirst({
      where: isUuid ? { OR: [{ id }, { saleNumber: { equals: id, mode: "insensitive" } }] } : { saleNumber: { equals: id, mode: "insensitive" } },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        payments: true,
        customer: true,
        cashier: true,
        location: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale was not found" }, { status: 404 });
    }

    const receipt = {
      saleNumber: sale.saleNumber,
      date: sale.createdAt.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      storeName: "promoteIt Ventures",
      storeTagline: "Quality you can trust, service you'll love",
      storeLocation: (!sale.location.name || sale.location.name.toLowerCase().includes("accra central") || sale.location.name.includes("Adenta Down")) ? "Adenta-Accountancy, Accra" : sale.location.name,
      storeAddress: "Adenta-Accountancy, Accra",
      cashier: sale.cashier?.name ?? "Staff",
      customer: sale.customer
        ? `${sale.customer.name}${sale.customer.phone ? ` (${sale.customer.phone})` : ""}`
        : "Walk-in Customer",
      paymentMethod: (sale.payments[0]?.method ?? "CASH").replaceAll("_", " "),
      paymentReference: sale.payments[0]?.reference || undefined,
      items: sale.items.map((item) => ({
        name: item.productVariant?.product?.name || item.productVariant?.name || "Deleted Product",
        sku: item.productVariant?.sku || "—",
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      total: Number(sale.total),
    };

    return NextResponse.json({
      sale: {
        ...sale,
        status: sale.status === "COMPLETED" ? "Paid" : "Not Paid",
        tone: sale.status === "COMPLETED" ? "green" : "red",
      },
      receipt,
    });
  } catch {
    return NextResponse.json({ error: "Sale could not be retrieved" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: "COMPLETED" | "CANCELLED" | "Paid" | "Not Paid" };
    if (!body.status) return NextResponse.json({ error: "Status is required" }, { status: 400 });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const existing = await db.sale.findFirst({
      where: isUuid ? { OR: [{ id }, { saleNumber: { equals: id, mode: "insensitive" } }] } : { saleNumber: { equals: id, mode: "insensitive" } },
    });
    if (!existing) return NextResponse.json({ error: "Sale was not found" }, { status: 404 });

    const dbStatus = body.status === "Paid" || body.status === "COMPLETED" ? "COMPLETED" : "CANCELLED";
    const paymentStatus = dbStatus === "COMPLETED" ? "PAID" : "PENDING";

    const [sale] = await Promise.all([
      db.sale.update({
        where: { id: existing.id },
        data: { status: dbStatus },
        include: { items: true, payments: true, customer: true },
      }),
      db.payment.updateMany({
        where: { saleId: existing.id },
        data: { status: paymentStatus },
      }),
    ]);

    return NextResponse.json({
      ...sale,
      status: sale.status === "COMPLETED" ? "Paid" : "Not Paid",
      tone: sale.status === "COMPLETED" ? "green" : "red",
    });
  } catch (error) {
    return formatErrorResponse(error, "Sale could not be updated");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const existing = await db.sale.findFirst({
      where: isUuid ? { OR: [{ id }, { saleNumber: { equals: id, mode: "insensitive" } }] } : { saleNumber: { equals: id, mode: "insensitive" } },
    });
    if (!existing) return NextResponse.json({ error: "Sale was not found" }, { status: 404 });

    await db.$transaction(async (tx) => {
      // Delete any returns and return items linked to this sale
      const returns = await tx.return.findMany({
        where: { saleId: existing.id },
        select: { id: true },
      });
      if (returns.length > 0) {
        const returnIds = returns.map((r) => r.id);
        await tx.returnItem.deleteMany({
          where: { returnId: { in: returnIds } },
        });
        await tx.return.deleteMany({
          where: { id: { in: returnIds } },
        });
      }

      // Delete associated inventory movements
      await tx.inventoryMovement.deleteMany({
        where: {
          OR: [
            { reference: existing.saleNumber },
            { reference: existing.id },
          ],
        },
      });

      // Delete payments
      await tx.payment.deleteMany({
        where: { saleId: existing.id },
      });

      // Delete sale items
      await tx.saleItem.deleteMany({
        where: { saleId: existing.id },
      });

      // Hard delete the sale
      await tx.sale.delete({
        where: { id: existing.id },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return formatErrorResponse(error, "Sale could not be deleted");
  }
}
