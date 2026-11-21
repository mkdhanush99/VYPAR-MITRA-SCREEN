import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Share2,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import {
  BusinessListing,
  CategoryItem,
  Language,
  OwnerAccount,
} from '../types';
import { AP_DISTRICTS, DISTRICT_MAP, TELANGANA_DISTRICTS } from '../data/districts';
import { BADGE_LABELS, REJECTION_REASONS, STATUS_LABELS, t } from '../data/i18n';
import {
  createInitialOtpState,
  isValidIndianMobile,
  normalizeMobile,
  requestOtpSend,
  verifyOtpAttempt,
} from '../utils/validation';
import { StorefrontVisual } from './StorefrontVisual';
import { ListingFormWizard } from './ListingFormWizard';

interface CustomerPortalProps {
  lang: Language;
  accounts: OwnerAccount[];
  currentOwner: OwnerAccount | null;
  listings: BusinessListing[];
  categories: CategoryItem[];
  pendingAddFlow: boolean;
  prefillDistrict?: string;
  onLoginOwner: (account: OwnerAccount) => void;
  onRegisterOwner: (account: OwnerAccount) => void;
  onLogoutOwner: () => void;
  onUpdateOwner: (account: OwnerAccount) => void;
  onDeleteOwnerAccount: (ownerId: string) => void;
  onSaveDraft: (listing: BusinessListing) => void;
  onSubmitListing: (listing: BusinessListing, isEdit: boolean) => void;
  onToggleHideListing: (listingId: string) => void;
  onDeleteListing: (listingId: string) => void;
  onViewPublicListing: (slug: string) => void;
  onShareListing: (listing: BusinessListing) => void;
  onOpenPrivacyNotice: () => void;
  onClearPendingAddFlow: () => void;
}

export function CustomerPortal({
  lang,
  accounts,
  currentOwner,
  listings,
  categories,
  pendingAddFlow,
  prefillDistrict,
  onLoginOwner,
  onRegisterOwner,
  onLogoutOwner,
  onUpdateOwner,
  onDeleteOwnerAccount,
  onSaveDraft,
  onSubmitListing,
  onToggleHideListing,
  onDeleteListing,
  onViewPublicListing,
  onShareListing,
  onOpenPrivacyNotice,
  onClearPendingAddFlow,
}: CustomerPortalProps) {
  // Auth UI state
  const [authTab, setAuthTab] = useState<'otp' | 'email'>('otp');
  const [authStep, setAuthStep] = useState<'details' | 'otp_verify' | 'welcome'>('details');
  const [authName, setAuthName] = useState('');
  const [authMobile, setAuthMobile] = useState('');
  const [authDistrict, setAuthDistrict] = useState(prefillDistrict || 'jagtial');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPrivacyChecked, setAuthPrivacyChecked] = useState(false);
  const [authWhatsappUpdates, setAuthWhatsappUpdates] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [otpChannel, setOtpChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [otpState, setOtpState] = useState(() => createInitialOtpState());
  const [smsCountdown, setSmsCountdown] = useState(30);
  const [authError, setAuthError] = useState<string>('');
  const [pendingVerifyEmailAccount, setPendingVerifyEmailAccount] =
    useState<OwnerAccount | null>(null);

  // Dashboard / Form state
  const [subView, setSubView] = useState<'dashboard' | 'form' | 'profile'>(
    currentOwner && pendingAddFlow ? 'form' : 'dashboard'
  );
  const [editingListing, setEditingListing] = useState<BusinessListing | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<string | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  // Profile editing state
  const [profName, setProfName] = useState(currentOwner?.name ?? '');
  const [profEmail, setProfEmail] = useState(currentOwner?.email ?? '');
  const [profDistrict, setProfDistrict] = useState(currentOwner?.districtSlug ?? 'jagtial');
  const [profWaUpdates, setProfWaUpdates] = useState(currentOwner?.whatsappUpdates ?? true);
  const [profSavedMsg, setProfSavedMsg] = useState('');

  useEffect(() => {
    if (prefillDistrict) {
      setAuthDistrict(prefillDistrict);
    }
  }, [prefillDistrict]);

  useEffect(() => {
    if (currentOwner) {
      setProfName(currentOwner.name);
      setProfEmail(currentOwner.email ?? '');
      setProfDistrict(currentOwner.districtSlug);
      setProfWaUpdates(currentOwner.whatsappUpdates);
      if (pendingAddFlow) {
        setEditingListing(null);
        setSubView('form');
        onClearPendingAddFlow();
      }
    }
  }, [currentOwner, pendingAddFlow, onClearPendingAddFlow]);

  useEffect(() => {
    if (authStep !== 'otp_verify' || smsCountdown <= 0) return;
    const timer = setInterval(() => setSmsCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [authStep, smsCountdown]);

  const ownerListings = useMemo(() => {
    if (!currentOwner) return [];
    return listings.filter((l) => l.ownerId === currentOwner.id);
  }, [listings, currentOwner]);

  const activeListingCount = ownerListings.filter((l) => l.status !== 'suspended').length;
  const maxListings = currentOwner?.listingLimit ?? 3;
  const canAddMore = activeListingCount < maxListings;

  const catMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const cleanMob = normalizeMobile(authMobile);
    if (!isValidIndianMobile(cleanMob)) {
      setAuthError(
        t(
          lang,
          'దయచేసి 6–9 తో మొదలయ్యే 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి.',
          'Please enter a valid 10-digit Indian mobile number starting with 6–9.'
        )
      );
      return;
    }

    const existingAcc = accounts.find((a) => a.mobile === cleanMob && !a.deletedAt);
    if (!existingAcc) {
      if (authName.trim().length < 2 || authName.trim().length > 60) {
        setAuthError(
          t(lang, 'మీ పేరు 2–60 అక్షరాల మధ్య ఉండాలి.', 'Your name must be 2–60 characters.')
        );
        return;
      }
      if (!authPrivacyChecked) {
        setAuthError(
          t(
            lang,
            'కొనసాగడానికి గోప్యతా విధానానికి అంగీకరించండి.',
            'Please tick the privacy notice consent box to continue.'
          )
        );
        return;
      }
    }

    const res = requestOtpSend(otpState, Date.now(), '123456');
    setOtpState(res.nextState);
    if (!res.ok && res.error) {
      setAuthError(lang === 'te' ? res.error.te : res.error.en);
      return;
    }
    setOtpChannel('whatsapp');
    setSmsCountdown(30);
    setAuthStep('otp_verify');
  };

  const handleResendSms = () => {
    setAuthError('');
    const res = requestOtpSend(otpState, Date.now(), '123456');
    setOtpState(res.nextState);
    if (!res.ok && res.error) {
      setAuthError(lang === 'te' ? res.error.te : res.error.en);
      return;
    }
    setOtpChannel('sms');
    setSmsCountdown(30);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = verifyOtpAttempt(otpState, otpInput, Date.now());
    setOtpState(res.nextState);
    if (!res.ok && res.error) {
      setAuthError(lang === 'te' ? res.error.te : res.error.en);
      return;
    }

    const cleanMob = normalizeMobile(authMobile);
    if (pendingVerifyEmailAccount) {
      const updated = { ...pendingVerifyEmailAccount, mobile: cleanMob, mobileVerified: true };
      onUpdateOwner(updated);
      onLoginOwner(updated);
      setPendingVerifyEmailAccount(null);
      setSubView(pendingAddFlow ? 'form' : 'dashboard');
      return;
    }

    const existingAcc = accounts.find((a) => a.mobile === cleanMob && !a.deletedAt);
    if (existingAcc) {
      onLoginOwner(existingAcc);
      setSubView(pendingAddFlow ? 'form' : 'dashboard');
      return;
    }

    const newAcc: OwnerAccount = {
      id: `owner-${Date.now()}`,
      name: authName.trim(),
      mobile: cleanMob,
      mobileVerified: true,
      email: authEmail.trim() || undefined,
      districtSlug: authDistrict,
      whatsappUpdates: authWhatsappUpdates,
      privacyConsentVersion: 'v1.0 (2026-11)',
      privacyConsentAt: new Date().toISOString(),
      listingLimit: 3,
      utmSource: 'direct',
      createdAt: new Date().toISOString(),
    };
    onRegisterOwner(newAcc);
    if (pendingAddFlow) {
      setSubView('form');
      onClearPendingAddFlow();
    } else {
      setAuthStep('welcome');
    }
  };

  const handleLegacyEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const found = accounts.find(
      (a) => a.email?.toLowerCase() === authEmail.trim().toLowerCase() && !a.deletedAt
    );
    if (!found || authPassword.length < 4) {
      setAuthError(
        t(
          lang,
          'ఇమెయిల్ లేదా పాస్‌వర్డ్ సరైనది కాదు. (డెమో: ramesh.kirana@example.com)',
          'Invalid email or password. (Demo email: ramesh.kirana@example.com)'
        )
      );
      return;
    }
    if (!found.mobileVerified) {
      setPendingVerifyEmailAccount(found);
      setAuthMobile(found.mobile);
      setAuthTab('otp');
      setAuthStep('details');
      return;
    }
    onLoginOwner(found);
    setSubView(pendingAddFlow ? 'form' : 'dashboard');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOwner) return;
    onUpdateOwner({
      ...currentOwner,
      name: profName.trim() || currentOwner.name,
      email: profEmail.trim() || undefined,
      districtSlug: profDistrict,
      whatsappUpdates: profWaUpdates,
    });
    setProfSavedMsg(t(lang, 'ప్రొఫైల్ సేవ్ చేయబడింది.', 'Profile updated.'));
    setTimeout(() => setProfSavedMsg(''), 2500);
  };

  // Between-steps welcome screen immediately after new OTP sign-up (Section 4)
  if (currentOwner && authStep === 'welcome') {
    const dist = DISTRICT_MAP.get(currentOwner.districtSlug);
    return (
      <div className="max-w-lg mx-auto py-10 px-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-[#0E5E1F]/10 text-[#0E5E1F] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {t(lang, `స్వాగతం, ${currentOwner.name}!`, `Welcome, ${currentOwner.name}!`)}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {t(
                lang,
                'మీ మొబైల్ నంబర్ OTP ద్వారా ధృవీకరించబడింది. ఇప్పుడు మీ వ్యాపారాన్ని ఉచితంగా చేర్చండి.',
                'Your mobile number is verified via OTP. Add your business for free or join your district community.'
              )}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthStep('details');
                setEditingListing(null);
                setSubView('form');
              }}
              className="w-full min-h-[48px] px-5 rounded-lg bg-[#0E5E1F] text-white font-semibold text-sm hover:bg-[#1A5B0B]"
            >
              + {t(lang, 'మీ వ్యాపారం చేర్చండి', 'Add Your Business')}
            </button>
            <a
              href={dist?.whatsappUrl || 'https://chat.whatsapp.com/vyaparamitra'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[48px] px-5 rounded-lg border border-[#0E5E1F] text-[#0E5E1F] font-semibold text-sm hover:bg-[#0E5E1F]/5 inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {t(
                lang,
                `${dist?.nameTe || ''} WhatsApp కమ్యూనిటీలో చేరండి`,
                `Join the ${dist?.nameEn || ''} WhatsApp community`
              )}
            </a>
            <button
              type="button"
              onClick={() => {
                setAuthStep('details');
                setSubView('dashboard');
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 py-1"
            >
              {t(lang, 'నా డ్యాష్‌బోర్డ్‌కు వెళ్ళండి', 'Go to My Business Dashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED OUT: Mobile OTP Sign-Up & Login Screen (/business-login/)
  if (!currentOwner) {
    const demoOwner = accounts[0];
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Brand value proposition & poster */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#085200] rounded-xl overflow-hidden border border-[#1A5B0B] text-white">
              <div className="p-3 pb-0">
                <img
                  src="/assets/aistudio/Gmail_Signature_Banner_600x150_1ea5aa1f.png"
                  alt="Vyapara Mitra banner"
                  className="w-full h-auto object-cover rounded-lg"
                />
              </div>
              <div className="p-5 space-y-3">
                <h1 className="text-xl font-bold leading-snug">
                  {t(
                    lang,
                    '1 నిమిషంలో మీ వ్యాపారాన్ని ఉచితంగా లిస్ట్ చేయండి',
                    'List your business free in under 3 minutes'
                  )}
                </h1>
                <ul className="space-y-2 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDB902] shrink-0 mt-0.5" />
                    <span>
                      {t(
                        lang,
                        'ఎటువంటి ఫీజు లేదు — 3 వ్యాపారాల వరకు ఉచితంగా చేర్చవచ్చు.',
                        '100% free — add up to 3 businesses per verified mobile account.'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDB902] shrink-0 mt-0.5" />
                    <span>
                      {t(
                        lang,
                        'కస్టమర్లు లాగిన్ లేకుండానే నేరుగా కాల్ & WhatsApp చేయవచ్చు.',
                        'Customers call or WhatsApp you directly without any login wall.'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FDB902] shrink-0 mt-0.5" />
                    <span>
                      {t(
                        lang,
                        'మీ సమాచారం సురక్షితం. ఎవరితోనూ పంచుకోం.',
                        'Your data stays safe and is never sold or shared.'
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Demo Account Card for reviewers */}
            {demoOwner && (
              <div className="p-4 rounded-xl bg-[#F6F3E1] border border-amber-300/60 space-y-2.5">
                <p className="text-xs font-semibold text-slate-800">
                  {t(lang, 'డెమో వ్యాపార ఖాతాతో వెంటనే చూడండి', 'Quick Preview with Demo Owner Account')}
                </p>
                <p className="text-xs text-slate-600">
                  {demoOwner.name} · +91 {demoOwner.mobile} (Jagtial · 2 listings including 1 Live &amp; 1 Changes Needed)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onLoginOwner(demoOwner);
                    setSubView(pendingAddFlow ? 'form' : 'dashboard');
                  }}
                  className="w-full min-h-[42px] px-4 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] transition-colors"
                >
                  {t(lang, 'డెమో ఓనర్ డ్యాష్‌బోర్డ్ తెరవండి', 'Open Demo Owner Dashboard')}
                </button>
              </div>
            )}
          </div>

          {/* Right: 30-Second Mobile OTP Sign-Up / Login Form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t(lang, 'మొబైల్ OTP లాగిన్ / రిజిస్టర్', 'Mobile OTP Sign-Up & Login')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    lang,
                    'పాస్‌వర్డ్ అవసరం లేదు · 30 సెకన్లలో పూర్తి అవుతుంది',
                    'No password needed · One-screen sign-up in under 30 seconds'
                  )}
                </p>
              </div>
            </div>

            {authError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium" role="alert">
                {authError}
              </div>
            )}

            {authTab === 'otp' && authStep === 'details' && (
              <form onSubmit={handleRequestOtp} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="auth-mobile" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    {t(lang, 'మొబైల్ నంబర్ *', 'Mobile Number *')}
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-sm font-mono-num text-slate-600">
                      +91
                    </span>
                    <input
                      id="auth-mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={authMobile}
                      onChange={(e) => setAuthMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9848012345"
                      className="flex-1 min-h-[48px] px-3.5 rounded-r-lg border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-name" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    {t(lang, 'మీ పేరు * (కొత్త ఖాతా కోసం)', 'Your Name * (For new account)')}
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder={t(lang, 'ఉదా: రమేష్ గౌడ్', 'e.g., Ramesh Goud')}
                    maxLength={60}
                    className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-district" className="block text-sm font-semibold text-slate-900 mb-1.5">
                      {t(lang, 'మీ జిల్లా *', 'Your District *')}
                    </label>
                    <select
                      id="auth-district"
                      value={authDistrict}
                      onChange={(e) => setAuthDistrict(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      <optgroup label="Telangana (33)">
                        {TELANGANA_DISTRICTS.map((d) => (
                          <option key={d.slug} value={d.slug}>
                            {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : `${d.nameEn} (${d.nameTe})`}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Andhra Pradesh (28)">
                        {AP_DISTRICTS.map((d) => (
                          <option key={d.slug} value={d.slug}>
                            {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : `${d.nameEn} (${d.nameTe})`}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-900 mb-1.5">
                      {t(lang, 'ఇమెయిల్ (ఐచ్ఛికం)', 'Email (Optional)')}
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                {/* Required DPDP Privacy Consent & Optional WhatsApp Updates */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authPrivacyChecked}
                      onChange={(e) => setAuthPrivacyChecked(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                    />
                    <span>
                      <strong>*</strong>{' '}
                      {t(lang, 'గోప్యతా విధానానికి అంగీకరిస్తున్నాను', 'I agree to the')}{' '}
                      <button
                        type="button"
                        onClick={onOpenPrivacyNotice}
                        className="text-[#0E5E1F] underline font-medium"
                      >
                        {t(lang, '(గోప్యతా విధానం చదవండి)', 'Privacy Notice')}
                      </button>
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authWhatsappUpdates}
                      onChange={(e) => setAuthWhatsappUpdates(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                    />
                    <span>
                      {t(
                        lang,
                        'WhatsApp లో వ్యాపార చిట్కాలు, పథకాల సమాచారం పంపండి (ఐచ్ఛికం)',
                        'Send business tips and government scheme updates on WhatsApp (Optional)'
                      )}
                    </span>
                  </label>
                </div>

                {/* Cloudflare Turnstile compliance indicator */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0E5E1F]" />
                    <span>Protected by Turnstile anti-spam verification</span>
                  </span>
                  <span className="font-medium text-[#0E5E1F]">Verified</span>
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] px-5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] transition-colors"
                >
                  {t(lang, 'WhatsApp లో OTP పంపండి', 'Send 6-Digit OTP on WhatsApp')}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('email');
                      setAuthError('');
                    }}
                    className="text-xs text-slate-500 hover:text-[#0E5E1F] underline"
                  >
                    {t(
                      lang,
                      'పాత ఖాతా ఉందా? ఇమెయిల్ & పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి',
                      'Existing account? Log in with email and password'
                    )}
                  </button>
                </div>
              </form>
            )}

            {authTab === 'otp' && authStep === 'otp_verify' && (
              <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
                <div className="p-3.5 rounded-lg bg-[#0E5E1F]/5 border border-[#0E5E1F]/20 text-sm text-slate-800">
                  <p className="font-medium">
                    {otpChannel === 'whatsapp'
                      ? t(
                          lang,
                          `+91 ${authMobile} కు WhatsApp లో 6 అంకెల OTP పంపాము.`,
                          `6-digit OTP sent on WhatsApp to +91 ${authMobile}.`
                        )
                      : t(
                          lang,
                          `+91 ${authMobile} కు SMS ద్వారా 6 అంకెల OTP పంపాము.`,
                          `6-digit OTP sent by SMS to +91 ${authMobile}.`
                        )}
                  </p>
                  <p className="mt-1 text-xs text-[#0E5E1F] font-mono-num">
                    Demo OTP: <strong>123456</strong> · @vyaparamitra.in #123456 (Valid 5 min · Sends used:{' '}
                    {otpState.sendsThisHour}/3)
                  </p>
                </div>

                <div>
                  <label htmlFor="auth-otp-code" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    {t(lang, '6 అంకెల OTP నమోదు చేయండి', 'Enter 6-Digit OTP')}
                  </label>
                  <input
                    id="auth-otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full min-h-[52px] px-4 rounded-lg border border-slate-300 text-lg font-mono-num tracking-[0.35em] text-center focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] px-5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B]"
                >
                  {t(lang, 'OTP ధృవీకరించి కొనసాగండి', 'Verify OTP & Continue')}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthStep('details')}
                    className="hover:text-slate-900 underline"
                  >
                    {t(lang, 'నంబర్ మార్చండి', 'Change number')}
                  </button>
                  <button
                    type="button"
                    disabled={smsCountdown > 0 && otpState.sendsThisHour >= 3}
                    onClick={handleResendSms}
                    className="text-[#0E5E1F] font-medium hover:underline disabled:opacity-50"
                  >
                    {smsCountdown > 0
                      ? t(lang, `SMS ద్వారా పంపండి (${smsCountdown}s)`, `Send by SMS instead (${smsCountdown}s)`)
                      : t(lang, 'SMS ద్వారా OTP పంపండి', 'Send by SMS instead')}
                  </button>
                </div>
              </form>
            )}

            {authTab === 'email' && (
              <form onSubmit={handleLegacyEmailLogin} className="mt-5 space-y-4">
                <p className="text-xs text-slate-600">
                  {t(
                    lang,
                    'పాత ఖాతాల కోసం ఇమెయిల్ లాగిన్. లాగిన్ తర్వాత ఒక్కసారి మొబైల్ OTP ధృవీకరించాలి.',
                    'For existing email/password accounts. Mobile OTP verification is requested once.'
                  )}
                </p>
                <div>
                  <label htmlFor="legacy-email" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    {t(lang, 'ఇమెయిల్', 'Email')}
                  </label>
                  <input
                    id="legacy-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="ramesh.kirana@example.com"
                    className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="legacy-pass" className="block text-sm font-semibold text-slate-900 mb-1.5">
                    {t(lang, 'పాస్‌వర్డ్', 'Password')}
                  </label>
                  <input
                    id="legacy-pass"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[48px] px-5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] inline-flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {t(lang, 'లాగిన్ అవ్వండి', 'Log In')}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('otp');
                      setAuthError('');
                    }}
                    className="text-xs text-[#0E5E1F] underline font-medium"
                  >
                    {t(lang, 'మొబైల్ OTP లాగిన్‌కు వెళ్ళండి', 'Switch back to Mobile OTP login')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN: 4-Step Listing Form (/my-business/add/ or /my-business/edit/{id}/)
  if (subView === 'form') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7">
        <ListingFormWizard
          lang={lang}
          owner={currentOwner}
          categories={categories}
          existingListings={listings}
          editingListing={editingListing}
          prefillDistrict={prefillDistrict || currentOwner.districtSlug}
          onSaveDraft={onSaveDraft}
          onSubmitForReview={(listing, isEdit) => {
            onSubmitListing(listing, isEdit);
            setEditingListing(null);
            setSubView('dashboard');
            setSubmittedSuccess(
              listing.status === 'live'
                ? t(
                    lang,
                    'మీ మార్పులు వెంటనే లైవ్ అయ్యాయి మరియు రోజువారీ స్పాట్ చెక్ కోసం నమోదయ్యాయి.',
                    'Your edits are live immediately and logged for daily moderator spot check.'
                  )
                : t(
                    lang,
                    'మీ వ్యాపారం సమీక్షలో ఉంది (Pending). 1 పని దినంలోపు పరిశీలించి ప్రచురిస్తాము.',
                    'Status is now Pending. We check and publish within 1 working day.'
                  )
            );
          }}
          onCancel={() => {
            setEditingListing(null);
            setSubView('dashboard');
          }}
        />
      </div>
    );
  }

  // LOGGED IN: Owner Dashboard (/my-business/) & Profile
  const ownerDistrict = DISTRICT_MAP.get(currentOwner.districtSlug);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Top Owner Greeting Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            /my-business/ · {t(lang, 'వ్యాపార యజమాని పోర్టల్', 'Business Owner Portal')}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {t(lang, `నమస్కారం, ${currentOwner.name}`, `Welcome, ${currentOwner.name}`)}
          </h1>
          <p className="mt-1 text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono-num">+91 {currentOwner.mobile}</span>
            <span aria-hidden="true">·</span>
            <span>
              {ownerDistrict ? (lang === 'te' ? ownerDistrict.nameTe : ownerDistrict.nameEn) : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">
              {activeListingCount}/{maxListings} {t(lang, 'వ్యాపారాలు', 'businesses')}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub-navigation between My Listings & Profile */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSubView('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subView === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(lang, 'నా వ్యాపారాలు', 'My Listings')}
            </button>
            <button
              type="button"
              onClick={() => setSubView('profile')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subView === 'profile'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(lang, 'ప్రొఫైల్ & గోప్యత', 'Profile & Privacy')}
            </button>
          </div>

          {canAddMore ? (
            <button
              type="button"
              onClick={() => {
                setEditingListing(null);
                setSubmittedSuccess(null);
                setSubView('form');
              }}
              className="px-4 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t(lang, 'వ్యాపారం చేర్చండి', 'Add a Business')}
            </button>
          ) : (
            <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              {t(
                lang,
                `గరిష్ట పరిమితి (${maxListings}) పూర్తయింది`,
                `Max limit (${maxListings}) reached`
              )}
            </span>
          )}

          <button
            type="button"
            onClick={onLogoutOwner}
            aria-label="Log out"
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Submission Banner */}
      {submittedSuccess && (
        <div
          className="p-4 rounded-xl bg-[#0E5E1F]/10 border border-[#0E5E1F]/25 flex items-start justify-between gap-3 text-sm text-[#0A4216]"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#0E5E1F] shrink-0 mt-0.5" />
            <p className="font-medium">{submittedSuccess}</p>
          </div>
          <button
            type="button"
            onClick={() => setSubmittedSuccess(null)}
            className="text-xs font-semibold underline shrink-0"
          >
            {t(lang, 'మూసివేయి', 'Dismiss')}
          </button>
        </div>
      )}

      {/* DASHBOARD LISTINGS VIEW */}
      {subView === 'dashboard' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            {ownerListings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {t(lang, 'మీరు ఇంకా ఏ వ్యాపారాన్ని చేర్చలేదు', 'No business listings yet')}
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {t(
                    lang,
                    '3 నిమిషాల్లో ఉచితంగా లిస్టింగ్ సృష్టించండి. కస్టమర్లు మిమ్మల్ని కాల్ & WhatsApp లో నేరుగా సంప్రదిస్తారు.',
                    'Create a free listing in under 3 minutes so local customers in your district can call or WhatsApp you.'
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingListing(null);
                    setSubView('form');
                  }}
                  className="px-5 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B]"
                >
                  + {t(lang, 'మొదటి వ్యాపారం చేర్చండి', 'Add Your First Business')}
                </button>
              </div>
            ) : (
              ownerListings.map((biz) => {
                const cat = catMap.get(biz.categorySlug);
                const dist = DISTRICT_MAP.get(biz.districtSlug);
                const statusInfo = STATUS_LABELS[biz.status];
                const rejReason = biz.rejectionReason
                  ? REJECTION_REASONS[biz.rejectionReason]
                  : null;

                return (
                  <article
                    key={biz.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    {/* Section 7: "Changes needed" card shows moderator's reason at the top */}
                    {biz.status === 'changes_needed' && (
                      <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 text-sm text-amber-950">
                          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">
                              {t(lang, 'మార్పులు అవసరం:', 'Changes needed:')}{' '}
                              {rejReason ? (lang === 'te' ? rejReason.te : rejReason.en) : ''}
                            </p>
                            {biz.rejectionNote && (
                              <p className="text-xs text-amber-900 mt-0.5">{biz.rejectionNote}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingListing(biz);
                            setSubView('form');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 whitespace-nowrap"
                        >
                          {t(lang, 'సవరించి మళ్ళీ పంపండి', 'Edit & Resubmit')}
                        </button>
                      </div>
                    )}

                    <div className="p-5 flex flex-col sm:flex-row gap-4">
                      <StorefrontVisual
                        photo={biz.mainPhoto}
                        name={biz.nameEn}
                        town={biz.town}
                        categoryIcon={cat?.icon}
                        className="w-full sm:w-36 h-36 rounded-lg border border-slate-200 shrink-0"
                      />

                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-slate-500">
                              {cat ? (lang === 'te' ? cat.nameTe : cat.nameEn) : biz.categorySlug} ·{' '}
                              {biz.town}, {dist ? (lang === 'te' ? dist.nameTe : dist.nameEn) : biz.districtSlug}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                                biz.status === 'live'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : biz.status === 'pending'
                                  ? 'bg-sky-50 text-sky-800'
                                  : biz.status === 'changes_needed'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {lang === 'te' ? statusInfo.te : statusInfo.en}
                            </span>
                          </div>

                          <h3 className="mt-1 text-lg font-bold text-slate-900 truncate">
                            {biz.nameEn}
                          </h3>
                          {biz.nameTe && (
                            <p className="text-sm text-slate-600 truncate">{biz.nameTe}</p>
                          )}

                          {biz.badges.length > 0 && (
                            <p className="mt-1.5 text-xs text-[#0E5E1F] font-medium">
                              {biz.badges
                                .map((b) => (lang === 'te' ? BADGE_LABELS[b].te : BADGE_LABELS[b].en))
                                .join(' · ')}
                            </p>
                          )}
                        </div>

                        {/* Last 30 days' stats (tabular numerals) */}
                        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                          <div>
                            <p className="text-[11px] text-slate-500">{t(lang, 'వీక్షణలు', 'Views (30d)')}</p>
                            <p className="text-base font-bold text-slate-900 font-mono-num">
                              {biz.stats.views}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">{t(lang, 'కాల్స్', 'Calls')}</p>
                            <p className="text-base font-bold text-slate-900 font-mono-num">
                              {biz.stats.calls}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">WhatsApp</p>
                            <p className="text-base font-bold text-slate-900 font-mono-num">
                              {biz.stats.whatsappTaps}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500">{t(lang, 'షేర్లు', 'Shares')}</p>
                            <p className="text-base font-bold text-slate-900 font-mono-num">
                              {biz.stats.shares}
                            </p>
                          </div>
                        </div>

                        {/* Actions: View, Edit, Share on WhatsApp, Hide, Delete */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          {biz.status === 'live' && (
                            <button
                              type="button"
                              onClick={() => onViewPublicListing(biz.slug)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {t(lang, 'చూడండి', 'View')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingListing(biz);
                              setSubView('form');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {t(lang, 'సవరించు', 'Edit')}
                          </button>
                          {biz.status === 'live' && (
                            <button
                              type="button"
                              onClick={() => onShareListing(biz)}
                              className="px-3 py-1.5 rounded-lg bg-[#0E5E1F]/10 text-[#0E5E1F] text-xs font-semibold hover:bg-[#0E5E1F]/15 inline-flex items-center gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              {t(lang, 'WhatsApp షేర్', 'Share on WhatsApp')}
                            </button>
                          )}
                          {(biz.status === 'live' || biz.status === 'hidden') && (
                            <button
                              type="button"
                              onClick={() => onToggleHideListing(biz.id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                            >
                              {biz.status === 'hidden' ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  {t(lang, 'మళ్ళీ చూపించు', 'Unhide')}
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  {t(lang, 'దాచు', 'Hide')}
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteListing(biz.id)}
                            aria-label={`Delete ${biz.nameEn}`}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 inline-flex items-center gap-1.5 ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t(lang, 'తొలగించు', 'Delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Right Rail: District WhatsApp Community Card & Guidelines */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-[#0E5E1F] text-white rounded-xl p-5 space-y-3 border border-[#1A5B0B]">
              <p className="text-xs font-semibold text-[#FDB902]">
                {t(lang, 'జిల్లా వ్యాపార కమ్యూనిటీ', 'District WhatsApp Community')}
              </p>
              <h3 className="text-base font-bold">
                {t(
                  lang,
                  `${ownerDistrict?.nameTe || ''} వ్యాపార మిత్ర WhatsApp గ్రూప్‌లో చేరండి`,
                  `Join the ${ownerDistrict?.nameEn || ''} WhatsApp Community`
                )}
              </h3>
              <p className="text-xs text-white/85 leading-relaxed">
                {t(
                  lang,
                  'ప్రభుత్వ పథకాలు, లోన్లు, GST అప్‌డేట్లు మరియు స్థానిక వ్యాపార అవకాశాల కోసం జిల్లా గ్రూప్‌లో చేరండి.',
                  'Connect with fellow district owners, local ambassadors, and get weekly MSME scheme updates.'
                )}
              </p>
              <a
                href={ownerDistrict?.whatsappUrl || 'https://chat.whatsapp.com/vyaparamitra'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] px-4 rounded-lg bg-[#FDB902] text-[#0A4216] text-sm font-bold hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t(lang, 'వాట్సాప్‌లో చేరండి', 'Join WhatsApp Community')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                {t(lang, 'వ్యాపార మిత్ర వెరిఫైడ్ బ్యాడ్జ్ ఎలా పొందాలి?', 'How to earn Vyapara Mitra Verified')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  lang,
                  'మీ లిస్టింగ్ సమర్పించిన తర్వాత మా మోడరేటర్ లేదా జిల్లా అంబాసిడర్ మీ వ్యాపార నంబర్‌కు కాల్ చేసి ధృవీకరిస్తారు. వెరిఫైడ్ వ్యాపారాలు సెర్చ్‌లో ముందు కనిపిస్తాయి.',
                  'After submission, our moderator or district ambassador confirms your business with a quick phone call. Verified listings rank first in directory search.'
                )}
              </p>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#0E5E1F]" />
                <span>
                  {t(lang, 'సమీక్ష సమయం: 1 పని దినం లోపు', 'Review SLA: Within 1 working day')}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* PROFILE & DPDP PRIVACY VIEW */}
      {subView === 'profile' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <User className="w-5 h-5 text-[#0E5E1F]" />
              <h2 className="text-base font-bold text-slate-900">
                {t(lang, 'ఖాతా వివరాలు', 'Account Profile')}
              </h2>
            </div>

            <div>
              <label htmlFor="prof-name" className="block text-sm font-semibold text-slate-900 mb-1">
                {t(lang, 'మీ పేరు', 'Name')}
              </label>
              <input
                id="prof-name"
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-900 mb-1">
                {t(lang, 'మొబైల్ నంబర్ (OTP ధృవీకరించబడింది)', 'Mobile Number (OTP Verified)')}
              </span>
              <div className="flex items-center justify-between px-3.5 min-h-[48px] rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num">
                <span>+91 {currentOwner.mobile}</span>
                <span className="text-xs font-sans font-semibold text-[#0E5E1F]">Verified</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-email" className="block text-sm font-semibold text-slate-900 mb-1">
                  {t(lang, 'ఇమెయిల్', 'Email')}
                </label>
                <input
                  id="prof-email"
                  type="email"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label htmlFor="prof-dist" className="block text-sm font-semibold text-slate-900 mb-1">
                  {t(lang, 'జిల్లా', 'District')}
                </label>
                <select
                  id="prof-dist"
                  value={profDistrict}
                  onChange={(e) => setProfDistrict(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <optgroup label="Telangana">
                    {TELANGANA_DISTRICTS.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {lang === 'te' ? d.nameTe : d.nameEn}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Andhra Pradesh">
                    {AP_DISTRICTS.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {lang === 'te' ? d.nameTe : d.nameEn}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={profWaUpdates}
                onChange={(e) => setProfWaUpdates(e.target.checked)}
                className="w-4 h-4 accent-[#0E5E1F]"
              />
              <span>
                {t(
                  lang,
                  'WhatsApp లో వ్యాపార చిట్కాలు & నెలవారీ గణాంకాలు పొందండి',
                  'Receive WhatsApp business tips and monthly listing stats'
                )}
              </span>
            </label>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="px-5 min-h-[44px] rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B]"
              >
                {t(lang, 'మార్పులు సేవ్ చేయండి', 'Save Profile')}
              </button>
              {profSavedMsg && (
                <span className="text-xs font-medium text-[#0E5E1F]">{profSavedMsg}</span>
              )}
            </div>
          </form>

          {/* DPDP Privacy Consent Record & Delete My Account (Section 12) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5 text-xs text-slate-600">
              <h3 className="text-sm font-bold text-slate-900">
                {t(lang, 'గోప్యతా అంగీకార రికార్డు (DPDP)', 'Privacy Consent Record (DPDP)')}
              </h3>
              <p>
                Accepted Version:{' '}
                <strong className="text-slate-900">{currentOwner.privacyConsentVersion}</strong>
              </p>
              <p className="font-mono-num">
                Accepted On: {new Date(currentOwner.privacyConsentAt).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={onOpenPrivacyNotice}
                className="text-[#0E5E1F] font-semibold underline"
              >
                {t(lang, 'పూర్తి గోప్యతా విధానం చదవండి', 'View full Privacy Notice')}
              </button>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-red-800">
                {t(lang, 'నా ఖాతాను తొలగించు', 'Delete My Account')}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  lang,
                  'మీ ఖాతాను తొలగిస్తే మీ అన్ని వ్యాపార లిస్టింగ్‌లు వెంటనే అన్‌పబ్లిష్ అవుతాయి మరియు చట్టపరమైన అవసరాలు మినహా మీ వ్యక్తిగత సమాచారం 30 రోజుల్లో తొలగించబడుతుంది.',
                  'Deleting your account immediately unpublishes all your listings and deletes your personal data within 30 days, except what the law requires us to retain.'
                )}
              </p>
              {!confirmDeleteAccount ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAccount(true)}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50"
                >
                  {t(lang, 'నా ఖాతాను తొలగించు', 'Delete My Account')}
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-50 space-y-2.5">
                  <p className="text-xs font-semibold text-red-900">
                    {t(
                      lang,
                      'నిజంగా తొలగించాలా? మీ అన్ని లిస్టింగ్‌లు వెంటనే ఆఫ్‌లైన్ అవుతాయి.',
                      'Confirm deletion? All your listings will be unpublished immediately.'
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteOwnerAccount(currentOwner.id)}
                      className="px-3.5 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800"
                    >
                      {t(lang, 'అవును, తొలగించు', 'Yes, Delete Account')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(false)}
                      className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700"
                    >
                      {t(lang, 'రద్దు చేయి', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
