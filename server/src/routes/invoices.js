import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  generateInvoice,
  getInvoiceByNumber,
  downloadInvoicePdf,
  getCustomerInvoices,
  searchInvoices,
  cancelInvoice,
  exportInvoices
} from '../controllers/invoiceController.js';

const router = Router();

router.post('/generate/:orderId', authenticate, generateInvoice);
router.get('/number/:invoiceNumber', authenticate, getInvoiceByNumber);
router.get('/download/:invoiceNumber', authenticate, downloadInvoicePdf);
router.get('/customer', authenticate, getCustomerInvoices);
router.get('/admin/search', authenticate, requireAdmin, searchInvoices);
router.patch('/admin/:invoiceNumber/cancel', authenticate, requireAdmin, cancelInvoice);
router.get('/admin/export', authenticate, requireAdmin, exportInvoices);

export default router;
