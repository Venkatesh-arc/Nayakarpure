import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Counter from '../models/Counter.js';

const GST_RATE = 0.18;
const PDF_DIR = path.join(process.cwd(), 'server', 'data', 'invoices');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

export async function getNextSequence(key, period) {
  const counter = await Counter.findOneAndUpdate(
    { key, period },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export function buildInvoiceNumber(date = new Date()) {
  const year = date.getFullYear();
  return `NPINV-${year}`;
}

export function buildOrderNumber(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `NPORD-${y}${m}${d}`;
}

export function formatSequence(seq, length = 6) {
  return String(seq).padStart(length, '0');
}

export function formatOrderSequence(seq, length = 4) {
  return String(seq).padStart(length, '0');
}

export function calculateGst(amount) {
  return Number((amount * GST_RATE).toFixed(2));
}

export async function generateInvoicePdf(invoice) {
  const filename = `${invoice.invoice_number}.pdf`;
  const filepath = path.join(PDF_DIR, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const writeStream = fs.createWriteStream(filepath);
  doc.pipe(writeStream);

  doc.fontSize(20).text('Nayakar Pure', { align: 'left' });
  doc.fontSize(10).text('GSTIN: 33ABCDE1234F1Z5');
  doc.moveDown(1);

  doc.fontSize(16).text('Tax Invoice', { align: 'right' });
  doc.fontSize(10).text(`Invoice Number: ${invoice.invoice_number}`, { align: 'right' });
  doc.text(`Invoice Date: ${invoice.invoice_date.toISOString().slice(0, 10)}`, { align: 'right' });
  doc.text(`Order Number: ${invoice.order_number}`, { align: 'right' });
  doc.moveDown(1);

  doc.fontSize(12).text('Bill To:');
  doc.text(invoice.buyer_name);
  doc.text(invoice.buyer_email);
  doc.text(invoice.buyer_phone);
  doc.text(invoice.billing_address);
  doc.moveDown(0.5);

  doc.text('Ship To:');
  doc.text(invoice.shipping_address);
  doc.moveDown(1);

  const tableTop = doc.y;
  doc.text('Item', 40, tableTop);
  doc.text('Qty', 280, tableTop);
  doc.text('Price', 340, tableTop);
  doc.text('Total', 430, tableTop);
  doc.moveDown(0.5);

  invoice.items.forEach((item) => {
    doc.text(item.name, 40);
    doc.text(item.quantity.toString(), 280);
    doc.text(`₹${item.price.toFixed(2)}`, 340);
    doc.text(`₹${item.total.toFixed(2)}`, 430);
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
  doc.text(`Subtotal: ₹${invoice.invoice_amount.toFixed(2)}`, { align: 'right' });
  doc.text(`GST (18%): ₹${invoice.gst_amount.toFixed(2)}`, { align: 'right' });
  doc.text(`Total: ₹${(invoice.invoice_amount + invoice.gst_amount).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);

  doc.text('Thank you for shopping with Nayakar Pure!', { align: 'center' });
  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  return filepath;
}
