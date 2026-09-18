import Database from "@tauri-apps/plugin-sql";
import type { BlockType, ResumeBlock, ResumeItem, ItemWithBlocks } from "./types";

const DB_URL = "sqlite:resume.db";

let dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.close();
    dbPromise = null;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export async function listItems(): Promise<ResumeItem[]> {
  const db = await getDb();
  return db.select<ResumeItem[]>(
    "SELECT id, label, sort_order, created_at, updated_at FROM items ORDER BY sort_order ASC, created_at ASC",
  );
}

export async function listBlocks(itemId: string): Promise<ResumeBlock[]> {
  const db = await getDb();
  return db.select<ResumeBlock[]>(
    "SELECT id, item_id, type, content, asset_path, sort_order FROM blocks WHERE item_id = $1 ORDER BY sort_order ASC",
    [itemId],
  );
}

export async function listItemsWithBlocks(): Promise<ItemWithBlocks[]> {
  const items = await listItems();
  const result: ItemWithBlocks[] = [];
  for (const item of items) {
    const blocks = await listBlocks(item.id);
    result.push({ ...item, blocks });
  }
  return result;
}

export async function createItem(label = "新条目"): Promise<ResumeItem> {
  const db = await getDb();
  const items = await listItems();
  const id = newId();
  const ts = nowIso();
  const sort_order = items.length;
  await db.execute(
    "INSERT INTO items (id, label, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
    [id, label, sort_order, ts, ts],
  );
  return { id, label, sort_order, created_at: ts, updated_at: ts };
}

export async function updateItemLabel(id: string, label: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE items SET label = $1, updated_at = $2 WHERE id = $3",
    [label, nowIso(), id],
  );
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM blocks WHERE item_id = $1", [id]);
  await db.execute("DELETE FROM items WHERE id = $1", [id]);
  await normalizeItemOrder();
}

export async function reorderItems(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute(
      "UPDATE items SET sort_order = $1, updated_at = $2 WHERE id = $3",
      [i, ts, orderedIds[i]],
    );
  }
}

async function normalizeItemOrder(): Promise<void> {
  const items = await listItems();
  await reorderItems(items.map((i) => i.id));
}

export async function createBlock(
  itemId: string,
  type: BlockType,
  content = "",
  assetPath: string | null = null,
): Promise<ResumeBlock> {
  const db = await getDb();
  const existing = await listBlocks(itemId);
  const id = newId();
  const sort_order = existing.length;
  await db.execute(
    "INSERT INTO blocks (id, item_id, type, content, asset_path, sort_order) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, itemId, type, content, assetPath, sort_order],
  );
  await touchItem(itemId);
  return {
    id,
    item_id: itemId,
    type,
    content,
    asset_path: assetPath,
    sort_order,
  };
}

export async function updateBlock(
  id: string,
  patch: Partial<Pick<ResumeBlock, "content" | "asset_path" | "type">>,
): Promise<void> {
  const db = await getDb();
  const rows = await db.select<ResumeBlock[]>(
    "SELECT id, item_id, type, content, asset_path, sort_order FROM blocks WHERE id = $1",
    [id],
  );
  const current = rows[0];
  if (!current) return;

  const content = patch.content ?? current.content;
  const asset_path =
    patch.asset_path !== undefined ? patch.asset_path : current.asset_path;
  const type = patch.type ?? current.type;

  await db.execute(
    "UPDATE blocks SET content = $1, asset_path = $2, type = $3 WHERE id = $4",
    [content, asset_path, type, id],
  );
  await touchItem(current.item_id);
}

export async function deleteBlock(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<ResumeBlock[]>(
    "SELECT item_id FROM blocks WHERE id = $1",
    [id],
  );
  const itemId = rows[0]?.item_id;
  await db.execute("DELETE FROM blocks WHERE id = $1", [id]);
  if (itemId) {
    await normalizeBlockOrder(itemId);
    await touchItem(itemId);
  }
}

export async function reorderBlocks(
  itemId: string,
  orderedIds: string[],
): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute("UPDATE blocks SET sort_order = $1 WHERE id = $2", [
      i,
      orderedIds[i],
    ]);
  }
  await touchItem(itemId);
}

async function normalizeBlockOrder(itemId: string): Promise<void> {
  const blocks = await listBlocks(itemId);
  await reorderBlocks(
    itemId,
    blocks.map((b) => b.id),
  );
}

async function touchItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE items SET updated_at = $1 WHERE id = $2", [
    nowIso(),
    id,
  ]);
}
