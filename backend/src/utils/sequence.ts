import { prisma } from '../config/prisma';

export async function generateReceiptNumber(tx?: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `RCP-${currentYear}-`;
  const db = tx || prisma;
  const lastReceipt = await db.payment.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
  });

  if (!lastReceipt) return `${prefix}00001`;
  const seq = parseInt(lastReceipt.receiptNumber.split('-')[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

export async function generateOperationInvoiceNumber(tx?: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `OBILL-${currentYear}-`;
  const db = tx || prisma;
  const lastBill = await db.operationBill.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  if (!lastBill) return `${prefix}00001`;
  const seq = parseInt(lastBill.invoiceNumber.split('-')[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

export async function generatePharmacyInvoiceNumber(tx?: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PHARM-${currentYear}-`;
  const db = tx || prisma;
  const lastSale = await db.pharmacySale.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  if (!lastSale) return `${prefix}00001`;
  const seq = parseInt(lastSale.invoiceNumber.split('-')[2] || '0', 10) + 1;
  return `${prefix}${seq.toString().padStart(5, '0')}`;
}
