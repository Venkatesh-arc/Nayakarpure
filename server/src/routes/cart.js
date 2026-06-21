import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import CartItem from '../models/CartItem.js';
import Product from '../models/Product.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const cartItems = await CartItem.find({ user_id: req.user.id }).populate('product_id');

  const items = cartItems
    .filter((ci) => ci.product_id)
    .map((ci) => ({
    id: ci._id.toString(),
    quantity: ci.quantity,
    product_id: ci.product_id._id.toString(),
    name: ci.product_id.name,
    price: ci.product_id.price,
    image: ci.product_id.image,
    weight: ci.product_id.weight,
    stock: ci.product_id.stock
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0) });
});

router.post('/', [
  body('productId').isMongoId(),
  body('quantity').optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

  const existing = await CartItem.findOne({ user_id: req.user.id, product_id: productId });

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (newQty > product.stock) return res.status(400).json({ error: 'Insufficient stock' });
    existing.quantity = newQty;
    await existing.save();
  } else {
    await CartItem.create({ user_id: req.user.id, product_id: productId, quantity });
  }

  res.json({ message: 'Added to cart' });
});

router.put('/:id', [
  param('id').isMongoId(),
  body('quantity').isInt({ min: 1, max: 20 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const item = await CartItem.findOne({ _id: req.params.id, user_id: req.user.id }).populate('product_id');
  if (!item) return res.status(404).json({ error: 'Cart item not found' });
  if (req.body.quantity > item.product_id.stock) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  item.quantity = req.body.quantity;
  await item.save();
  res.json({ message: 'Cart updated' });
});

router.delete('/:id', async (req, res) => {
  const result = await CartItem.deleteOne({ _id: req.params.id, user_id: req.user.id });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Cart item not found' });
  res.json({ message: 'Item removed' });
});

router.delete('/', async (req, res) => {
  await CartItem.deleteMany({ user_id: req.user.id });
  res.json({ message: 'Cart cleared' });
});

export default router;
