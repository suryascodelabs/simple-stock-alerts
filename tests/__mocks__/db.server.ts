import { vi } from "vitest";

const mockDb = {
  store: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  lowStockAlert: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

export default mockDb;
