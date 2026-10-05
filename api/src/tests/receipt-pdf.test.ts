import './setup-env';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Decimal } from '@prisma/client/runtime/library';

import { generateReceiptPdf } from '@services/receipt-pdf.service';

describe('Receipt PDF generation', () => {
  it('renders a PDF buffer with the required receipt fields', async () => {
    const pdf = await generateReceiptPdf({
      receiptNumber: 'RCPT-2026-000001',
      issuedAt: new Date('2026-09-05T10:00:00Z'),
      donorName: 'Test Donor',
      donorPhone: '9490118877',
      donorEmail: 'donor@example.com',
      donorAddress: null,
      donorCity: null,
      donorPincode: null,
      donorState: null,
      panNumberMasked: null,
      aadhaarNumberMasked: null,
      categoryName: 'Annadanam',
      amount: new Decimal(501),
      currency: 'INR',
      paymentMethod: 'upi',
      paymentReference: 'pay_test123',
      razorpayOrderId: 'order_test123',
      donationDate: new Date('2026-09-05T10:00:00Z'),
      orgAddress: null,
      orgPhone: null,
      orgEmail: null,
      upiId: null,
      monthlyContribution: null,
    });

    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(pdf.length > 1000);
  });
});
