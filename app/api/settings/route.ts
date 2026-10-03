import { NextResponse } from "next/server";
import { getStoreSettings, saveStoreSettings } from "@/lib/settings-server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = getStoreSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = saveStoreSettings(body);

    // If storeLocation is provided, also sync the primary location name in database if accessible
    if (body.storeLocation && typeof body.storeLocation === "string") {
      try {
        await db.location.updateMany({
          where: { id: "20000000-0000-0000-0000-000000000001" },
          data: {
            name: body.storeLocation,
            address: body.storeLocation,
          },
        });
      } catch {
        // non-fatal: database might be busy or offline, file store is authoritative
      }
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings" },
      { status: 500 }
    );
  }
}
