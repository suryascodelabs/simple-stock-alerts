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
    update: vi.fn(),
  },
  notificationLog: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

export default mockDb;
