/**
 * Who a donation's receipt goes to. The single rule used by delivery
 * (email/WhatsApp/SMS), the PDF, both emails and the website receipt.
 *
 * Contact details submitted with the donation win over the matched donor
 * record: a donor may be matched by mobile while entering a new email that
 * could not be saved to their record (it belongs to another donor), or be
 * matched by email while entering a new mobile. Donations without submitted
 * details (older rows, manual entry, bank transfers, subscription charges)
 * fall back to the donor record.
 */
export interface RecipientSource {
  receiptEmail?: string | null;
  receiptPhone?: string | null;
  whatsappReceiptConsent?: boolean | null;
  donor: {
    email: string | null;
    phone: string;
    whatsappReceiptConsent: boolean;
  };
}

export interface ReceiptRecipients {
  email: string | null;
  phone: string | null;
  /** Opt-in given with this donation (or the donor's, for older rows). */
  whatsappConsent: boolean;
  /** Why WhatsApp/SMS must not go to `phone`, if anything. */
  phoneBlockedReason: string | null;
}

export const MISMATCHED_MOBILE_REASON =
  'The mobile number entered does not belong to the donor record this donation was matched to, so the receipt (which shows that record’s details) is not sent to it';

export function receiptRecipients(donation: RecipientSource): ReceiptRecipients {
  const donor = donation.donor;
  const submittedPhone = donation.receiptPhone?.trim() || null;
  const phone = submittedPhone ?? (donor.phone?.trim() || null);
  // Matched by email to someone else's record: the receipt carries that
  // record's name and details, so it must not go to an unverified mobile.
  const phoneBlockedReason =
    submittedPhone && donor.phone && submittedPhone !== donor.phone
      ? MISMATCHED_MOBILE_REASON
      : null;
  return {
    email: donation.receiptEmail?.trim() || donor.email || null,
    phone,
    whatsappConsent: donation.whatsappReceiptConsent ?? donor.whatsappReceiptConsent,
    phoneBlockedReason,
  };
}
