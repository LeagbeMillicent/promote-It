import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/**
 * Converts any unknown error (Prisma, Zod, Database, Network, or Error instance)
 * into a clean, human-readable user-facing string.
 */
export function formatErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!error) return fallbackMessage;

  // 1. Zod validation errors
  if (error instanceof ZodError) {
    if (error.issues && error.issues.length > 0) {
      return error.issues.map((issue) => issue.message).join(", ");
    }
    return "Validation failed. Please verify the submitted data.";
  }

  // 2. Prisma Known Request Errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (typeof error === "object" && error !== null && "code" in error)
  ) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    const code = prismaError.code;
    const target = Array.isArray(prismaError.meta?.target)
      ? prismaError.meta.target.join(", ")
      : String(prismaError.meta?.target || "");
    const lowerTarget = target.toLowerCase();
    const rawMessage = error instanceof Error ? error.message : "";

    if (code === "P2002") {
      if (lowerTarget.includes("email") || rawMessage.includes("User_email_key")) {
        return "A user with this email address already exists.";
      }
      if (lowerTarget.includes("sku") || rawMessage.includes("ProductVariant_sku_key")) {
        return "A product with this SKU already exists.";
      }
      if (lowerTarget.includes("barcode") || rawMessage.includes("ProductVariant_barcode_key")) {
        return "A product with this barcode already exists.";
      }
      if (lowerTarget.includes("name") || rawMessage.includes("Brand_name_key")) {
        return "A brand with this name already exists.";
      }
      if (lowerTarget.includes("name") || rawMessage.includes("Category_name_key")) {
        return "A category with this name already exists.";
      }
      if (lowerTarget.includes("name") || rawMessage.includes("Role_name_key")) {
        return "A role with this name already exists.";
      }
      if (lowerTarget.includes("purchasenumber") || rawMessage.includes("Purchase_purchaseNumber_key")) {
        return "A purchase with this purchase number already exists.";
      }
      if (lowerTarget.includes("salenumber") || rawMessage.includes("Sale_saleNumber_key")) {
        return "A sale with this receipt number already exists.";
      }
      if (lowerTarget.includes("returnnumber") || rawMessage.includes("Return_returnNumber_key")) {
        return "A return with this return number already exists.";
      }
      return "A record with these unique details already exists.";
    }

    if (code === "P2003") {
      return "This record cannot be deleted or modified because it is linked to other transactions or records.";
    }

    if (code === "P2025") {
      return "The requested record was not found.";
    }
  }

  // 3. General Error instance handling
  if (error instanceof Error) {
    const msg = error.message;

    // Catch raw Prisma error text if it wasn't caught above
    if (msg.includes("Invalid `prisma.") || msg.includes("Unique constraint failed") || msg.includes("invocation:")) {
      if (msg.includes("Brand_name_key")) return "A brand with this name already exists.";
      if (msg.includes("Category_name_key")) return "A category with this name already exists.";
      if (msg.includes("User_email_key")) return "A user with this email address already exists.";
      if (msg.includes("ProductVariant_sku_key")) return "A product with this SKU already exists.";
      if (msg.includes("ProductVariant_barcode_key")) return "A product with this barcode already exists.";
      if (msg.includes("Purchase_purchaseNumber_key")) return "A purchase with this purchase number already exists.";
      if (msg.includes("Sale_saleNumber_key")) return "A sale with this receipt number already exists.";
      return fallbackMessage;
    }

    if (
      msg.includes("foreign key") ||
      msg.includes("Foreign key") ||
      msg.includes("violates foreign key constraint")
    ) {
      return "This item cannot be deleted because it is linked to existing transactions or records.";
    }

    // Filter out internal stack traces or database query dumps
    const isInternal =
      msg.includes("at ") ||
      msg.includes("PrismaClient") ||
      msg.includes("SELECT ") ||
      msg.includes("INSERT ") ||
      msg.includes("UPDATE ") ||
      msg.includes("DELETE ");

    if (!isInternal && msg.trim().length > 0 && msg.length < 250) {
      return msg;
    }
  }

  return fallbackMessage;
}

/**
 * Returns a standardized NextResponse with a human-readable error message.
 */
export function formatErrorResponse(
  error: unknown,
  fallbackMessage: string,
  defaultStatus: number = 400
): NextResponse {
  const message = formatErrorMessage(error, fallbackMessage);
  let status = defaultStatus;

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    status = 409;
  } else if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    status = 404;
  }

  return NextResponse.json({ error: message }, { status });
}
