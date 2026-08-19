import { dbEnabled, prisma } from "@/lib/prisma";
import { AD_SETTING_KEYS, type AdSettings } from "@/lib/ads";

export async function getAppSetting(key: string): Promise<string | null> {
  if (!dbEnabled()) return null;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row?.value || row.value === "none") return null;
  return row.value;
}

export async function setAppSetting(key: string, value: string, updatedBy: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}

export async function getAdSettingsFromDb(): Promise<Partial<AdSettings>> {
  const entries = await Promise.all(
    (Object.entries(AD_SETTING_KEYS) as [keyof AdSettings, string][]).map(async ([field, key]) => {
      const value = await getAppSetting(key);
      return [field, value] as const;
    }),
  );

  const result: Partial<AdSettings> = {};
  for (const [field, value] of entries) {
    if (value) result[field] = value;
  }
  return result;
}

export async function setAdSettingsInDb(
  settings: Partial<Record<keyof AdSettings, string>>,
  updatedBy: string,
) {
  await Promise.all(
    (Object.entries(AD_SETTING_KEYS) as [keyof AdSettings, string][]).map(([field, key]) => {
      const value = settings[field];
      if (value === undefined) return Promise.resolve();
      return setAppSetting(key, value.trim() || "none", updatedBy);
    }),
  );
}
