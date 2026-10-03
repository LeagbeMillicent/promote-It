export interface StoreSettings {
  storeName: string;
  storeLocation: string;
  phone: string;
  currency: string;
  receiptFooter: string;
  acceptCash: boolean;
  acceptMoMo: boolean;
  acceptCard: boolean;
  acceptTransfer: boolean;
  lowStockAlerts: boolean;
  dailySummary: boolean;
  reorderThreshold: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "promoteIt Ventures",
  storeLocation: "Adenta-Accountancy, Accra",
  phone: "0553898761",
  currency: "GHS",
  receiptFooter: "Thank you for shopping with promoteIt Ventures!",
  acceptCash: true,
  acceptMoMo: true,
  acceptCard: true,
  acceptTransfer: false,
  lowStockAlerts: true,
  dailySummary: true,
  reorderThreshold: "5",
};
