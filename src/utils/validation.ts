import { BusinessListing, StateCode } from '../types';
import { DISTRICT_MAP } from '../data/districts';

export interface BilingualError {
  te: string;
  en: string;
}

export function normalizeMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function isValidIndianMobile(raw: string): boolean {
  const digits = normalizeMobile(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

export function isValidBusinessPhone(raw: string): boolean {
  const digits = normalizeMobile(raw);
  // 10-digit Indian mobile OR landline with STD code (10-11 digits starting with 0 or 2-8)
  return /^[6-9]\d{9}$/.test(digits) || /^0?\d{2,4}\d{6,8}$/.test(digits);
}

export function validatePinCode(
  pin: string,
  state?: StateCode
): { valid: boolean; error?: BilingualError; warning?: BilingualError } {
  const clean = pin.trim();
  if (!/^5\d{5}$/.test(clean)) {
    return {
      valid: false,
      error: {
        te: 'పిన్ కోడ్ 5 తో మొదలయ్యే 6 అంకెలు అయి ఉండాలి.',
        en: 'PIN code must be 6 digits starting with 5.',
      },
    };
  }
  if (state === 'TS' && !clean.startsWith('50')) {
    return {
      valid: true,
      warning: {
        te: 'ఈ పిన్ కోడ్ తెలంగాణ (50xxxx) తో సరిపోలడం లేదు. ఒకసారి సరిచూసుకోండి.',
        en: 'This PIN code does not match Telangana (usually 50xxxx). Please double-check.',
      },
    };
  }
  if (state === 'AP' && clean.startsWith('50')) {
    return {
      valid: true,
      warning: {
        te: 'ఈ పిన్ కోడ్ ఆంధ్రప్రదేశ్ (51–53xxxx) తో సరిపోలడం లేదు. ఒకసారి సరిచూసుకోండి.',
        en: 'This PIN code does not match Andhra Pradesh (usually 51–53xxxx). Please double-check.',
      },
    };
  }
  return { valid: true };
}

export function isValidGstin(raw: string): boolean {
  const val = raw.trim().toUpperCase();
  if (!val) return true;
  return /^(36|37)[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(val);
}

export function isValidUdyam(raw: string): boolean {
  const val = raw.trim().toUpperCase();
  if (!val) return true;
  return /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(val);
}

export function isValidFssai(raw: string): boolean {
  const val = raw.trim();
  if (!val) return true;
  return /^\d{14}$/.test(val);
}

export function isValidHttpsUrl(raw: string): boolean {
  const val = raw.trim();
  if (!val) return true;
  return /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(val);
}

export function sanitizeAboutText(text: string): {
  cleaned: string;
  strippedSomething: boolean;
} {
  const withoutUrls = text.replace(/https?:\/\/\S+|www\.\S+/gi, '');
  const withoutPhones = withoutUrls.replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g, '');
  const cleaned = withoutPhones.replace(/\s{2,}/g, ' ').trim();
  return {
    cleaned,
    strippedSomething: cleaned !== text.trim(),
  };
}

export function buildListingSlug(nameEn: string, town: string): string {
  const base = `${nameEn}-${town}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  // Reserve all 61 district slugs so no listing can take a district slug
  if (DISTRICT_MAP.has(base)) {
    return `${base}-business`;
  }
  return base || 'business-listing';
}

export function findDuplicateListing(
  listings: BusinessListing[],
  candidate: { id?: string; phone: string; nameEn: string; town: string }
): BusinessListing | undefined {
  const normPhone = normalizeMobile(candidate.phone);
  const normName = candidate.nameEn.trim().toLowerCase();
  const normTown = candidate.town.trim().toLowerCase();

  return listings.find((item) => {
    if (candidate.id && item.id === candidate.id) return false;
    if (item.status === 'suspended') return false;
    const samePhone = normPhone.length >= 10 && normalizeMobile(item.phone) === normPhone;
    const sameNameAndTown =
      normName.length > 0 &&
      normTown.length > 0 &&
      item.nameEn.trim().toLowerCase() === normName &&
      item.town.trim().toLowerCase() === normTown;
    return samePhone || sameNameAndTown;
  });
}

export interface OtpRateState {
  sendsThisHour: number;
  wrongAttempts: number;
  lockedUntilMs: number | null;
  expectedCode: string;
  expiresAtMs: number;
}

export function createInitialOtpState(): OtpRateState {
  return {
    sendsThisHour: 0,
    wrongAttempts: 0,
    lockedUntilMs: null,
    expectedCode: '123456',
    expiresAtMs: 0,
  };
}

export function requestOtpSend(
  state: OtpRateState,
  nowMs: number,
  code = '123456'
): { ok: boolean; nextState: OtpRateState; error?: BilingualError } {
  if (state.lockedUntilMs && nowMs < state.lockedUntilMs) {
    return {
      ok: false,
      nextState: state,
      error: {
        te: 'ఎక్కువ తప్పు ప్రయత్నాలు జరిగాయి. 15 నిమిషాల తర్వాత మళ్ళీ ప్రయత్నించండి.',
        en: 'Too many wrong attempts. Account locked for 15 minutes.',
      },
    };
  }
  if (state.sendsThisHour >= 3) {
    return {
      ok: false,
      nextState: state,
      error: {
        te: 'గంటకు గరిష్టంగా 3 OTP లు మాత్రమే పంపగలరు. కాసేపటి తర్వాత ప్రయత్నించండి.',
        en: 'Maximum 3 OTP sends per hour reached. Please try again later.',
      },
    };
  }
  return {
    ok: true,
    nextState: {
      ...state,
      sendsThisHour: state.sendsThisHour + 1,
      expectedCode: code,
      expiresAtMs: nowMs + 5 * 60 * 1000,
    },
  };
}

export function verifyOtpAttempt(
  state: OtpRateState,
  inputCode: string,
  nowMs: number
): { ok: boolean; nextState: OtpRateState; error?: BilingualError } {
  if (state.lockedUntilMs && nowMs < state.lockedUntilMs) {
    return {
      ok: false,
      nextState: state,
      error: {
        te: '15 నిమిషాలు లాక్ చేయబడింది. దయచేసి తర్వాత ప్రయత్నించండి.',
        en: 'Locked for 15 minutes due to 5 wrong tries.',
      },
    };
  }
  if (state.expiresAtMs > 0 && nowMs > state.expiresAtMs) {
    return {
      ok: false,
      nextState: state,
      error: {
        te: 'OTP గడువు ముగిసింది (5 నిమిషాలు). కొత్త OTP పంపండి.',
        en: 'OTP expired (valid for 5 minutes). Please resend.',
      },
    };
  }
  if (inputCode.trim() === state.expectedCode) {
    return {
      ok: true,
      nextState: {
        ...state,
        wrongAttempts: 0,
        lockedUntilMs: null,
      },
    };
  }
  const wrongAttempts = state.wrongAttempts + 1;
  const locked = wrongAttempts >= 5;
  return {
    ok: false,
    nextState: {
      ...state,
      wrongAttempts,
      lockedUntilMs: locked ? nowMs + 15 * 60 * 1000 : null,
    },
    error: locked
      ? {
          te: '5 సార్లు తప్పు OTP ఇచ్చారు. 15 నిమిషాల పాటు లాక్ చేయబడింది.',
          en: '5 wrong tries. Locked for 15 minutes.',
        }
      : {
          te: `తప్పు OTP. మరో ${5 - wrongAttempts} ప్రయత్నాలు మిగిలి ఉన్నాయి.`,
          en: `Incorrect OTP. ${5 - wrongAttempts} tries remaining.`,
        },
  };
}
