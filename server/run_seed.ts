import { seedNormalizedDatabase } from './seed.js';

async function main() {
  await seedNormalizedDatabase();
  console.log('Done seeding.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
