import { connectDB } from './database.js';
import Product from './models/Product.js';

async function main() {
  await connectDB();
  const names = [
    'Creamy Peanut Butter',
    'Crunchy Peanut Butter',
    'Chocolate Peanut Butter',
    'Organic Peanut Butter',
    'Honey Peanut Butter',
    'Family Pack Combo'
  ];

  const res = await Product.deleteMany({ name: { $in: names } });
  console.log(`Deleted ${res.deletedCount} seeded products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
