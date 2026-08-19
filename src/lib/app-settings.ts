import { dbEnabled, prisma } from "@/lib/prisma";

export const REST_AD_SETTING_KEY = "rest_ad_url";

export async function getRestAdUrlFromDb(): Promise<string | null> {
  if (!dbEnabled()) return null;
  const row = await prisma.appSetting.findUnique({ where: { key: REST_AD_SETTING_KEY } });
  if (!row?.value || row.value === "none") return null;
  return row.value;
}

export async function setRestAdUrlInDb(url: string, updatedBy: string) {
  await prisma.appSetting.upsert({
    where: { key: REST_AD_SETTING_KEY },
    create: { key: REST_AD_SETTING_KEY, value: url, updatedBy },
    update: { value: url, updatedBy },
  });
}
