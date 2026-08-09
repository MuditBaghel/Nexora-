import { setupTestDb, teardownTestDb } from './helpers';

beforeAll(async () => {
  await setupTestDb();
}, 60000);

afterAll(async () => {
  await teardownTestDb();
});
