import db from "../db.server";

export async function ensureStore(shop: string) {
  return db.store.upsert({
    where: { shop },
    update: { shop },
    create: { shop },
  });
}
