import fs from 'fs';
import path from 'path';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import { getNextSequence, buildInvoiceNumber, buildOrderNumber, formatSequence, formatOrderSequence, calculateGst, generateInvoicePdf } from '../utils/invoices.js';

const PDF_DIR = path.join(process.cwd(), 'server', 'data', 'invoices');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

export async function createInvoiceForOrder(order) {
  const existing = await Invoice.findOne({ order_id: order._id });
  if (existing) {
    const existingPath = path.join(PDF_DIR, `${existing.invoice_number}.pdf`);
    if (!fs.existsSync(existingPath)) {
      await generateInvoicePdf(existing);
    }
    return { invoice: existing, invoicePath: existingPath, created: false };
  }

  const invoiceDate = new Date();
  const invoiceSeq = await getNextSequence('invoice', String(invoiceDate.getFullYear()));
  const invoiceNumber = `${buildInvoiceNumber(invoiceDate)}-${formatSequence(invoiceSeq, 2)}`;

  if (!order.order_number) {
    const orderSeq = await getNextSequence('order', `${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}${String(invoiceDate.getDate()).padStart(2, '0')}`);
    order.order_number = `${buildOrderNumber(invoiceDate)}-${formatOrderSequence(orderSeq, 4)}`;
    await order.save();
  }

  const invoiceAmount = order.subtotal + order.delivery_fee;
  const gstAmount = calculateGst(invoiceAmount);

  const invoice = await Invoice.create({
    invoice_number: invoiceNumber,
    order_id: order._id,
    order_number: order.order_number,
    payment_id: order.payment_id || order.razorpay_order_id,
    invoice_date: invoiceDate,
    invoice_amount: invoiceAmount,
    gst_amount: gstAmount,
    buyer_name: order.shipping_name,
    buyer_email: order.shipping_email,
    buyer_phone: order.shipping_phone,
    billing_address: order.shipping_address,
    shipping_address: order.shipping_address,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }))
  });

  const invoicePath = await generateInvoicePdf(invoice);
  invoice.invoice_url = `/api/invoices/download/${invoice.invoice_number}`;
  await invoice.save();

  return { invoice, invoicePath, created: true };
}

export async function generateInvoice(req, res) {
  const { orderId } = req.params;

  if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (order.payment_status !== 'paid') {
    return res.status(400).json({ error: 'Invoice can only be generated for paid orders' });
  }

  const { invoice, invoicePath, created } = await createInvoiceForOrder(order);

  res.status(created ? 201 : 200).json({ invoice, invoicePath });
}

export async function getInvoiceByNumber(req, res) {
  const { invoiceNumber } = req.params;
  const invoice = await Invoice.findOne({ invoice_number: invoiceNumber }).populate('order_id');
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (req.user.role !== 'admin' && invoice.order_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  res.json({ invoice });
}

export async function downloadInvoicePdf(req, res) {
  const { invoiceNumber } = req.params;
  const invoice = await Invoice.findOne({ invoice_number: invoiceNumber }).populate('order_id');
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (req.user.role !== 'admin' && invoice.order_id.user_id.toString() !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const filepath = path.join(PDF_DIR, `${invoice.invoice_number}.pdf`);
  if (!fs.existsSync(filepath)) {
    await generateInvoicePdf(invoice);
  }

  res.download(filepath, `${invoice.invoice_number}.pdf`);
}

export async function getCustomerInvoices(req, res) {
  const invoices = await Invoice.find({ buyer_email: req.user.email }).sort({ invoice_date: -1 });
  res.json({ invoices });
}

export async function searchInvoices(req, res) {
  const { query } = req.query;
  const filter = {};
  if (query) {
    filter.$or = [
      { invoice_number: { $regex: query, $options: 'i' } },
      { order_number: { $regex: query, $options: 'i' } }
    ];
  }
  const invoices = await Invoice.find(filter).sort({ invoice_date: -1 }).limit(100);
  res.json({ invoices });
}

export async function cancelInvoice(req, res) {
  const { invoiceNumber } = req.params;
  const invoice = await Invoice.findOne({ invoice_number: invoiceNumber });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  invoice.status = 'cancelled';
  await invoice.save();
  res.json({ invoice });
}

export async function exportInvoices(req, res) {
  const invoices = await Invoice.find().sort({ invoice_date: -1 });
  res.json({ invoices });
}
