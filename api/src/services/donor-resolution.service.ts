import { Prisma } from '@prisma/client';

import { normalizeIndianMobile } from '@utils/mobile';
import { maskAadhaar, maskPan } from '@utils/pii-mask';
import { logger } from '@lib/logger';

import * as donorRepo from '@repositories/donor.repository';

export interface DonorIdentityInput {
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  donorAddress?: string;
  donorCity?: string;
  donorPincode?: string;
  donorState?: string;
}

/**
 * Shared by both the one-time checkout (`donation-checkout.service.ts`) and
 * automatic-monthly subscription creation (`subscription.service.ts`) — donor
 * matching priority is normalized mobile, then email, then a new donor
 * (`donor.repository.ts::findOrCreateByMobileOrEmail`, never a
 * client-supplied donor id).
 *
 * Identity documents (PAN/Aadhaar) are sticky — set once, never overwritten
 * by a later donation under the same donor, so a masked value already on
 * file can't be silently replaced without an explicit verified-donor
 * process. Name/email/address are refreshed on every donation instead, since
 * they're plain contact details the donor may reasonably update.
 */
export async function resolveDonor(input: DonorIdentityInput) {
  const normalizedPhone = normalizeIndianMobile(input.donorPhone);
  const donor = await donorRepo.findOrCreateByMobileOrEmail({
    name: input.donorName,
    normalizedPhone,
    email: input.donorEmail,
  });

  // `findOrCreateByMobileOrEmail` matches by phone first, then falls back to
  // email when the phone is new — so `donor` can come back belonging to
  // someone else's phone number (the donor an unrelated person registered
  // under, who merely shares this submission's email). `donor.phone` only
  // still equals `normalizedPhone` when the match came through the phone
  // itself (or the donor was freshly created with it) — not through that
  // email fallback. Refreshing profile fields is only safe in the former
  // case; otherwise a stranger's typed name/address would silently
  // overwrite the real owner's profile (important_identity_rule). The
  // donation itself still proceeds against the matched donor either way —
  // only the profile refresh is skipped.
  const matchedByPhone = donor.phone === normalizedPhone;

  const donorUpdate: Record<string, string> = {};
  if (!matchedByPhone) return donor;

  if (input.panNumber && !donor.panNumberMasked) {
    donorUpdate.panNumberMasked = maskPan(input.panNumber);
  }
  if (input.aadhaarNumber && !donor.aadhaarNumberMasked) {
    donorUpdate.aadhaarNumberMasked = maskAadhaar(input.aadhaarNumber);
  }
  if (input.donorAddress) donorUpdate.address = input.donorAddress;
  if (input.donorCity) donorUpdate.city = input.donorCity;
  if (input.donorPincode) donorUpdate.pincode = input.donorPincode;
  if (input.donorState) donorUpdate.state = input.donorState;
  if (input.donorName && input.donorName !== donor.name) donorUpdate.name = input.donorName;

  // `email` is unique at the DB level. `donor` here was matched by phone
  // (the primary identity — see comment above), so its stored email can
  // legitimately differ from what's submitted this time (a typo fixed, a
  // shared phone across family members, etc.). Blindly writing the
  // submitted email would collide with `donor_email`'s unique constraint
  // whenever it already belongs to a *different* donor row. Rather than
  // reassigning someone else's email (or failing the whole donation over a
  // contact-detail mismatch), treat email like PAN/Aadhaar above: update it
  // when it's free or already this donor's, otherwise leave this donor's
  // existing email untouched and let the donation proceed.
  if (input.donorEmail && input.donorEmail !== donor.email) {
    const emailOwner = await donorRepo.findByEmail(input.donorEmail);
    if (!emailOwner || emailOwner.id === donor.id) {
      donorUpdate.email = input.donorEmail;
    }
  }

  if (Object.keys(donorUpdate).length === 0) return donor;

  try {
    return await donorRepo.update(donor.id, donorUpdate);
  } catch (error) {
    // Defense-in-depth against the race between the `findByEmail` check
    // above and this write (two concurrent donations claiming the same new
    // email at once) — never let a donor-email collision fail the donation.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      'email' in donorUpdate
    ) {
      logger.warn('Donor email update skipped: already claimed by another donor', {
        donorId: donor.id,
      });
      const { email: _email, ...rest } = donorUpdate;
      if (Object.keys(rest).length === 0) return donor;
      return donorRepo.update(donor.id, rest);
    }
    throw error;
  }
}
