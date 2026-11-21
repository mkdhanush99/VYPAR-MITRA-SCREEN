import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildListingSlug,
  createInitialOtpState,
  findDuplicateListing,
  isValidFssai,
  isValidGstin,
  isValidIndianMobile,
  isValidUdyam,
  requestOtpSend,
  sanitizeAboutText,
  validatePinCode,
  verifyOtpAttempt,
} from './validation';
import { SEED_LISTINGS } from '../data/seed';

test('validates Indian mobile numbers starting with 6-9', () => {
  assert.equal(isValidIndianMobile('9848012345'), true);
  assert.equal(isValidIndianMobile('+91 9848012345'), true);
  assert.equal(isValidIndianMobile('5848012345'), false);
  assert.equal(isValidIndianMobile('984801234'), false);
});

test('validates PIN code and warns on AP/TS state mismatch without blocking', () => {
  assert.equal(validatePinCode('505425', 'TS').valid, true);
  assert.equal(validatePinCode('505425', 'TS').warning, undefined);

  const mismatch = validatePinCode('520002', 'TS');
  assert.equal(mismatch.valid, true);
  assert.ok(mismatch.warning?.en.includes('Telangana'));

  const bad = validatePinCode('400001', 'TS');
  assert.equal(bad.valid, false);
});

test('validates GSTIN (36/37), Udyam, and FSSAI formats', () => {
  assert.equal(isValidGstin('36AABCS1429B1Z5'), true);
  assert.equal(isValidGstin('37AABCT8712F1Z9'), true);
  assert.equal(isValidGstin('29AABCT8712F1Z9'), false); // Karnataka rejected

  assert.equal(isValidUdyam('UDYAM-TS-12-0045123'), true);
  assert.equal(isValidUdyam('UDYAM-12345'), false);

  assert.equal(isValidFssai('13621011000482'), true);
  assert.equal(isValidFssai('12345'), false);
});

test('strips phone numbers and URLs from about description', () => {
  const res = sanitizeAboutText(
    'Best kirana shop in town. Call 9848012345 or visit https://spam.example.com for offers.'
  );
  assert.equal(res.strippedSomething, true);
  assert.equal(res.cleaned.includes('9848012345'), false);
  assert.equal(res.cleaned.includes('https://'), false);
});

test('reserves 61 district slugs when building listing URLs', () => {
  assert.equal(buildListingSlug('jagtial', ''), 'jagtial-business');
  assert.equal(buildListingSlug('Sri Lakshmi Kirana', 'Suryapet'), 'sri-lakshmi-kirana-suryapet');
});

test('detects duplicate listings by phone or name+town', () => {
  const phoneMatch = findDuplicateListing(SEED_LISTINGS, {
    phone: '9989123456',
    nameEn: 'Other Name',
    town: 'Other Town',
  });
  assert.equal(phoneMatch?.id, 'biz-1');

  const nameTownMatch = findDuplicateListing(SEED_LISTINGS, {
    phone: '9111111111',
    nameEn: 'Sri Lakshmi Kirana & Super Mart',
    town: 'suryapet',
  });
  assert.equal(nameTownMatch?.id, 'biz-1');
});

test('enforces OTP 3 sends/hour and 5 wrong tries 15-minute lockout', () => {
  const now = 1_700_000_000_000;
  let state = createInitialOtpState();

  assert.equal(requestOtpSend(state, now).ok, true);
  state = requestOtpSend(state, now).nextState;
  state = requestOtpSend(state, now + 1000).nextState;
  state = requestOtpSend(state, now + 2000).nextState;
  // 4th send in same hour rejected
  assert.equal(requestOtpSend(state, now + 3000).ok, false);

  // 5 wrong attempts lock out for 15 mins
  for (let i = 0; i < 4; i++) {
    const attempt = verifyOtpAttempt(state, '000000', now + 5000);
    assert.equal(attempt.ok, false);
    assert.equal(attempt.nextState.lockedUntilMs, null);
    state = attempt.nextState;
  }
  const fifth = verifyOtpAttempt(state, '000000', now + 6000);
  assert.equal(fifth.ok, false);
  assert.ok(fifth.nextState.lockedUntilMs !== null);
  state = fifth.nextState;

  // Even correct OTP rejected while locked
  const lockedTry = verifyOtpAttempt(state, '123456', now + 7000);
  assert.equal(lockedTry.ok, false);
});
