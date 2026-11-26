import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authenticateToken } from '../../middleware/auth';
import { emitRealtimeEvent } from '../../sockets';
import { PaymentMode, PaymentStatus, AppointmentStatus, VisitType } from '@prisma/client';
import { generateReceiptNumber } from '../../utils/sequence';

const router = Router();

// Settle balance on Operation / Procedure Bill
router.post('/operation/:id/payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, referenceNumber, notes } = req.body;

    const bill = await prisma.operationBill.findUnique({
      where: { id },
      include: { procedure: { include: { patient: true } } },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Operation bill not found' });
    }

    if (bill.pendingBalance <= 0) {
      return res.status(400).json({ success: false, message: 'This procedure bill is already fully paid' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const latestBill = await tx.operationBill.findUnique({
        where: { id },
        include: { procedure: { include: { patient: true } } },
      });
      if (!latestBill || latestBill.pendingBalance <= 0) {
        throw new Error('This procedure bill is already fully paid');
      }

      const payAmount = Math.min(latestBill.pendingBalance, parseFloat(amount));
      if (payAmount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }
      const newPaidAmount = Math.round((latestBill.paidAmount + payAmount) * 100) / 100;
      const newPending = Math.round((latestBill.totalAmount - newPaidAmount) * 100) / 100;
      const newStatus = newPending <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

      const receiptNumber = await generateReceiptNumber(tx);
      const paymentRecord = await tx.payment.create({
        data: {
          receiptNumber,
          amount: payAmount,
          paymentMode: paymentMode || PaymentMode.CASH,
          referenceNumber: referenceNumber || null,
          notes: notes || `Procedure settlement for ${latestBill.invoiceNumber}`,
          operationBillId: latestBill.id,
        },
      });

      const updatedBill = await tx.operationBill.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          pendingBalance: newPending,
          paymentStatus: newStatus,
        },
        include: {
          procedure: {
            include: {
              patient: true,
              doctor: { include: { user: { select: { fullName: true } } } },
              procedureMaster: true,
            },
          },
          payments: true,
        },
      });

      if (bill.procedure?.patientId) {
        const procDate = bill.procedure.procedureDate ? new Date(bill.procedure.procedureDate) : new Date();
        const startOfDay = new Date(procDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(procDate);
        endOfDay.setHours(23, 59, 59, 999);

        const procName = (bill.procedure as any)?.procedureName || (bill.procedure as any)?.procedureMaster?.name;
        await tx.appointment.updateMany({
          where: {
            patientId: bill.procedure.patientId,
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS] },
            appointmentDate: { gte: startOfDay, lte: endOfDay },
            OR: [
              { visitType: VisitType.PROCEDURE },
              ...(procName ? [{ procedureName: procName }] : []),
            ],
          },
          data: { status: AppointmentStatus.COMPLETED },
        });
      }

      return { updatedBill, paymentRecord };
    });

    emitRealtimeEvent('billing:payment-received', result.updatedBill);
    emitRealtimeEvent('operation:invoice-created', result.updatedBill);
    emitRealtimeEvent('operation:invoice-paid', result.updatedBill);
    emitRealtimeEvent('appointment:updated', { patientId: bill.procedure?.patientId });

    res.json({
      success: true,
      message: 'Procedure bill payment recorded successfully',
      bill: result.updatedBill,
      paymentReceipt: result.paymentRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/billing/consultation/operations - Fetch all operation / procedure bills with patient details
router.get('/operations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query;
    const where: any = {};
    if (patientId) {
      where.procedure = { patientId: patientId as string };
    }

    const bills = await prisma.operationBill.findMany({
      where,
      include: {
        procedure: {
          include: {
            patient: true,
            doctor: { include: { user: { select: { fullName: true } } } },
            procedureMaster: true,
          },
        },
        payments: true,
      },
      orderBy: { billDate: 'desc' },
    });

    res.json({ success: true, bills });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

