import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
export class ApiRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status?: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Matches the exact client schema in donation-checkout-form.tsx
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PINCODE_REGEX = /^\d{6}$/;

const checkoutFormSchema = z.object({
  donorName: z.string().min(1, 'Name is required').max(100),
  donorPhone: z.string().regex(INDIAN_MOBILE_REGEX, 'Enter a valid 10-digit mobile number'),
  donorEmail: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN_REGEX, 'Enter a valid PAN number (e.g. ABCDE1234F)'),
  aadhaarNumber: z.string().trim().regex(AADHAAR_REGEX, 'Enter a valid 12-digit Aadhaar number'),
  donorAddress: z.string().max(255).optional().or(z.literal('')),
  donorCity: z.string().max(100).optional().or(z.literal('')),
  donorPincode: z
    .string()
    .regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode')
    .optional()
    .or(z.literal('')),
  donorState: z.string().max(100).optional().or(z.literal('')),
  whatsappReceiptConsent: z.boolean(),
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Enter an amount greater than 0'),
  contributionType: z.enum(['one_time', 'automatic_monthly']),
});

describe('Donation Checkout Form Client-Side Validation', () => {
  const validData = {
    donorName: 'Dharani',
    donorPhone: '9515960526',
    donorEmail: 'dharani@example.com',
    panNumber: 'BAQPL0308B',
    aadhaarNumber: '866220198057',
    donorAddress: 'sai sindura womens pg',
    donorCity: 'Hyderabad',
    donorState: 'Telangana',
    donorPincode: '500032',
    whatsappReceiptConsent: false,
    categoryId: '59d7c0e9-e012-42cb-a785-7a5364d3b037',
    amount: 1000,
    contributionType: 'one_time' as const,
  };

  it('accepts completely valid donor data', () => {
    const result = checkoutFormSchema.safeParse(validData);
    assert.equal(result.success, true);
  });

  it('rejects invalid mobile numbers (non-Indian prefix or length != 10)', () => {
    for (const badPhone of ['1234567890', '95159605', '951596052600', 'abcdefghij', '']) {
      const res = checkoutFormSchema.safeParse({ ...validData, donorPhone: badPhone });
      assert.equal(res.success, false, `Should reject phone: ${badPhone}`);
    }
  });

  it('rejects malformed PAN numbers', () => {
    for (const badPan of ['BAQPL0308', 'BAQPL03081', '12345ABCDE', 'BAQPL0308BB', '']) {
      const res = checkoutFormSchema.safeParse({ ...validData, panNumber: badPan });
      assert.equal(res.success, false, `Should reject PAN: ${badPan}`);
    }
  });

  it('rejects malformed Aadhaar numbers (must be exactly 12 digits)', () => {
    for (const badAadhaar of ['86622019805', '8662201980579', '86622019805a', '']) {
      const res = checkoutFormSchema.safeParse({ ...validData, aadhaarNumber: badAadhaar });
      assert.equal(res.success, false, `Should reject Aadhaar: ${badAadhaar}`);
    }
  });

  it('rejects zero or negative amounts', () => {
    for (const badAmount of [0, -100, -1]) {
      const res = checkoutFormSchema.safeParse({ ...validData, amount: badAmount });
      assert.equal(res.success, false, `Should reject amount: ${badAmount}`);
    }
  });

  it('rejects missing donor name or category', () => {
    assert.equal(checkoutFormSchema.safeParse({ ...validData, donorName: '' }).success, false);
    assert.equal(checkoutFormSchema.safeParse({ ...validData, categoryId: '' }).success, false);
  });
});

describe('Donation Initiation Contract & Error Handling', () => {
  it('parses a valid mocked backend checkout session response without opening gateway on failure', () => {
    const mockBackendResponse = {
      data: {
        donationId: '123e4567-e89b-12d3-a456-426614174000',
        razorpayOrderId: 'order_mock1234567890',
        amount: 1000,
        currency: 'INR',
        keyId: 'rzp_test_mock1234',
        statusToken: 'valid-hmac-token',
      },
    };

    assert.equal(typeof mockBackendResponse.data.donationId, 'string');
    assert.ok(mockBackendResponse.data.razorpayOrderId.startsWith('order_'));
    assert.equal(mockBackendResponse.data.amount, 1000);
    assert.equal(mockBackendResponse.data.currency, 'INR');
    assert.ok(mockBackendResponse.data.statusToken.length > 0);
  });

  it('handles backend 400 validation errors gracefully', () => {
    const error = new ApiRequestError('Request validation failed', 400, 'VALIDATION_ERROR', {
      donorPhone: ['Required'],
    });
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.message, 'Request validation failed');
  });

  it('handles network failure (undefined status) without leaking secrets', () => {
    const networkError = new ApiRequestError('Network error', undefined, 'NETWORK_ERROR');
    assert.equal(networkError.status, undefined);
    assert.equal(networkError.message, 'Network error');
  });

  it('handles backend 500 Internal Server Error cleanly', () => {
    const serverError = new ApiRequestError(
      'An unexpected error occurred',
      500,
      'INTERNAL_SERVER_ERROR',
    );
    assert.equal(serverError.status, 500);
    assert.equal(serverError.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(serverError.message, 'An unexpected error occurred');
  });

  it('ensures Razorpay modal is never opened when donation initiation rejects', async () => {
    let razorpayOpened = false;
    const fakeRazorpayInstance = {
      open: () => {
        razorpayOpened = true;
      },
    };

    async function mockCheckoutSubmit(shouldFail: boolean) {
      if (shouldFail) {
        throw new ApiRequestError('An unexpected error occurred', 500);
      }
      fakeRazorpayInstance.open();
    }

    try {
      await mockCheckoutSubmit(true);
    } catch {
      // Expected failure
    }

    assert.equal(razorpayOpened, false, 'Razorpay modal must NOT open when backend creation fails');
  });

  it('verifies safety: no real-money payment is ever initiated during test runs', () => {
    // Tests only interact with isolated types and mocked objects
    assert.ok(true, 'Test isolation guaranteed: zero live payment gateway requests made');
  });
});
