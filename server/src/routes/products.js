import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { toApi } from '../utils/format.js';

const router = Router();

router.get('/', async (req, res) => {
  const { category, search } = req.query;
  const filter = { stock: { $gt: 0 } };

  if (category && category !== 'all') {
    filter.category = category;
  }
  if (search) {
    const pattern = new RegExp(search, 'i');
    filter.$or = [{ name: pattern }, { description: pattern }];
  }

  const products = (await Product.find(filter).sort({ _id: 1 })).map(toApi);
  res.json({ products });
});

router.get('/categories', async (_req, res) => {
  const categories = await Product.distinct('category');
  res.json({ categories: categories.sort() });
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: toApi(product) });
});

export default router;
