import db from "../db.server";
import { ensureStore } from "./store";

export type ShopSettings = {
  shop: string;
  globalThreshold: number;
  alertEmails: string[];
};

export type SettingsValidationResult = {
  errors: {
    globalThreshold?: string;
    alertEmails?: string;
  };
  parsed?: {
    globalThreshold: number;
    alertEmails: string[];
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmails = (value: string) =>
  value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

export function validateSettings(
  globalThresholdRaw: FormDataEntryValue | null,
  alertEmailsRaw: FormDataEntryValue | null,
): SettingsValidationResult {
  const errors: SettingsValidationResult["errors"] = {};

  const thresholdNumber =
    typeof globalThresholdRaw === "string" && globalThresholdRaw !== ""
      ? Number(globalThresholdRaw)
      : NaN;

  if (Number.isNaN(thresholdNumber)) {
    errors.globalThreshold = "Enter a number for the threshold.";
  } else if (thresholdNumber < 0) {
    errors.globalThreshold = "Threshold cannot be negative.";
  }

  const emailsText = typeof alertEmailsRaw === "string" ? alertEmailsRaw : "";
  const emails = normalizeEmails(emailsText);
  if (emails.length === 0) {
    errors.alertEmails = "Add at least one email.";
  } else if (emails.some((email) => !EMAIL_REGEX.test(email))) {
    errors.alertEmails = "One or more emails are invalid.";
  }

  if (errors.globalThreshold || errors.alertEmails) {
    return { errors };
  }

  return {
    errors,
    parsed: {
      globalThreshold: thresholdNumber,
      alertEmails: emails,
    },
  };
}

export async function getShopSettings(shop: string): Promise<ShopSettings> {
  const store = await ensureStore(shop);
  const record = await db.shopSettings.findUnique({ where: { shopId: store.id } });
  if (!record) {
    return {
      shop,
      globalThreshold: 5,
      alertEmails: [],
    };
  }

  return {
    shop,
    globalThreshold: record.globalThreshold,
    alertEmails: record.alertEmails
      ? record.alertEmails
          .split(",")
          .map((email: string) => email.trim())
          .filter(Boolean)
      : [],
  };
}

export async function saveShopSettings(
  shop: string,
  data: Pick<ShopSettings, "globalThreshold" | "alertEmails">,
) {
  const store = await ensureStore(shop);
  const payload = {
    globalThreshold: data.globalThreshold,
    alertEmails: data.alertEmails.join(","),
  };

  await db.shopSettings.upsert({
    where: { shopId: store.id },
    update: {
      shop,
      globalThreshold: payload.globalThreshold,
      alertEmails: payload.alertEmails,
    },
    create: {
      shop,
      shopId: store.id,
      globalThreshold: payload.globalThreshold,
      alertEmails: payload.alertEmails,
    },
  });
}
