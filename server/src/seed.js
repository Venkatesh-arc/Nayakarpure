import Product from './models/Product.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import { connectDB } from './database.js';

const products = [
  {
    name: 'Creamy Peanut Butter',
    description: 'Smooth, creamy peanut butter made from 100% natural roasted peanuts. Rich in protein and healthy fats with no preservatives.',
    price: 349,
    image: '/images/products/creamy-peanut-butter.jpg',
    category: 'Peanut Butter',
    stock: 150,
    weight: '500g',
    features: ['High Protein', 'No Added Sugar', '100% Natural', 'No Preservatives']
  },
  {
    name: 'Crunchy Peanut Butter',
    description: 'Delicious crunchy peanut butter with real peanut pieces. Perfect for those who love texture in every bite.',
    price: 349,
    image: '/images/products/crunchy-peanut-butter.jpg',
    category: 'Peanut Butter',
    stock: 120,
    weight: '500g',
    features: ['High Protein', 'Crunchy Texture', '100% Natural', 'No Preservatives']
  },
  {
    name: 'Chocolate Peanut Butter',
    description: 'Indulgent chocolate peanut butter blend. The perfect balance of rich cocoa and premium roasted peanuts.',
    price: 399,
    image: '/images/products/chocolate-peanut-butter.jpg',
    category: 'Chocolate Spread',
    stock: 100,
    weight: '500g',
    features: ['Rich Cocoa', 'High Protein', 'No Artificial Additives', 'Kids Favorite']
  },
  {
    name: 'Organic Peanut Butter',
    description: 'Certified organic peanut butter made from handpicked organic peanuts. Pure goodness in every spoon.',
    price: 449,
    image: '/images/products/organic-peanut-butter.jpg',
    category: 'Organic',
    stock: 80,
    weight: '500g',
    features: ['Certified Organic', 'Premium Quality', 'No Preservatives', 'Farm Fresh']
  },
  {
    name: 'Honey Peanut Butter',
    description: 'Naturally sweetened with pure honey. A wholesome treat for the whole family.',
    price: 379,
    image: '/images/products/honey-peanut-butter.jpg',
    category: 'Peanut Butter',
    stock: 90,
    weight: '500g',
    features: ['Pure Honey', 'Natural Sweetness', 'High Protein', 'No Refined Sugar']
  },
  {
    name: 'Family Pack Combo',
    description: 'Best value combo — Creamy + Crunchy + Chocolate peanut butter jars. Save more when you buy together!',
    price: 999,
    image: '/images/products/family-combo.jpg',
    category: 'Combo',
    stock: 50,
    weight: '3 x 500g',
    features: ['Best Value', '3 Jars', 'Free Delivery', 'Gift Ready']
  }
];

export async function seedProducts() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products.`);
  } else {
    console.log('Products already seeded.');
  }
}

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'nayakarpure@nayakarpure.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  
  // Delete old admin accounts
  await User.deleteMany({ role: 'admin' });
  
  const hashed = await bcrypt.hash(password, 12);
  const admin = await User.create({ 
    name: 'Admin', 
    email, 
    password: hashed, 
    role: 'admin', 
    emailVerified: true 
  });
  console.log(`Admin user created: ${email}`);
}

async function main() {
  await connectDB();
  await seedProducts();
  await seedAdmin();
  console.log('Seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
