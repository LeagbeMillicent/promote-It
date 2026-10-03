import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS, StoreSettings } from "./settings-types";

const SETTINGS_FILE_PATH = path.join(process.cwd(), "prisma", "settings.json");

export function getStoreSettings(): StoreSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error("Failed to read store settings file:", err);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveStoreSettings(settings: Partial<StoreSettings>): StoreSettings {
  const current = getStoreSettings();
  const updated: StoreSettings = {
    ...current,
    ...settings,
    storeName: typeof settings.storeName === "string" ? settings.storeName : current.storeName,
    storeLocation: typeof settings.storeLocation === "string" ? settings.storeLocation : current.storeLocation,
    phone: typeof settings.phone === "string" ? settings.phone : current.phone,
    currency: typeof settings.currency === "string" ? settings.currency : current.currency,
    receiptFooter: typeof settings.receiptFooter === "string" ? settings.receiptFooter : current.receiptFooter,
    acceptCash: typeof settings.acceptCash === "boolean" ? settings.acceptCash : current.acceptCash,
    acceptMoMo: typeof settings.acceptMoMo === "boolean" ? settings.acceptMoMo : current.acceptMoMo,
    acceptCard: typeof settings.acceptCard === "boolean" ? settings.acceptCard : current.acceptCard,
    acceptTransfer: typeof settings.acceptTransfer === "boolean" ? settings.acceptTransfer : current.acceptTransfer,
    lowStockAlerts: typeof settings.lowStockAlerts === "boolean" ? settings.lowStockAlerts : current.lowStockAlerts,
    dailySummary: typeof settings.dailySummary === "boolean" ? settings.dailySummary : current.dailySummary,
    reorderThreshold:
      typeof settings.reorderThreshold === "string" || typeof settings.reorderThreshold === "number"
        ? String(settings.reorderThreshold)
        : current.reorderThreshold,
  };

  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write store settings file:", err);
  }

  return updated;
}
