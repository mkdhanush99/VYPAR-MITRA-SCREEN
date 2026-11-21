import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  ExternalLink,
  Flag,
  Globe,
  MapPin,
  Megaphone,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  X,
} from 'lucide-react';
import {
  BusinessListing,
  CategoryItem,
  DayOfWeek,
  DirectoryFilters,
  Language,
  ReportReasonCode,
} from '../types';
import {
  AP_DISTRICTS,
  DISTRICT_MAP,
  NEIGHBOURING_DISTRICTS,
  TELANGANA_DISTRICTS,
} from '../data/districts';
import { BADGE_LABELS, REPORT_REASONS, t } from '../data/i18n';
import {
  buildDirectionsLink,
  buildLocalBusinessJsonLd,
  buildWhatsAppLink,
  filterAndSortListings,
  formatTime12h,
  getSponsoredSlots,
  isOpenNow,
} from '../utils/directory';
import { CategoryIcon } from './CategoryIcon';
import { StorefrontVisual } from './StorefrontVisual';

export type PublicSubView = 'home' | 'directory' | 'listing' | 'district' | 'advertise';

interface PublicPortalProps {
  lang: Language;
  listings: BusinessListing[];
  categories: CategoryItem[];
  sponsoredEnabled: boolean;
  subView: PublicSubView;
  selectedSlug: string | null;
  selectedDistrictSlug: string | null;
  filters: DirectoryFilters;
  onChangeSubView: (view: PublicSubView) => void;
  onChangeFilters: (next: DirectoryFilters) => void;
  onOpenListing: (slug: string) => void;
  onOpenDistrict: (districtSlug: string) => void;
  onStartAddBusiness: (prefillDistrict?: string) => void;
  onOpenLogin: () => void;
  onTrackHit: (
    listingId: string,
    event: 'view' | 'call' | 'whatsapp' | 'directions' | 'share'
  ) => void;
  onLogSearch: (term: string, resultCount: number) => void;
  onSubmitReport: (listingId: string, reason: ReportReasonCode, note: string) => void;
  onShareListing: (listing: BusinessListing) => void;
  onOpenPrivacyNotice: () => void;
}

const WEEK_DAYS: { key: DayOfWeek; te: string; en: string }[] = [
  { key: 'Mon', te: 'సోమవారం', en: 'Monday' },
  { key: 'Tue', te: 'మంగళవారం', en: 'Tuesday' },
  { key: 'Wed', te: 'బుధవారం', en: 'Wednesday' },
  { key: 'Thu', te: 'గురువారం', en: 'Thursday' },
  { key: 'Fri', te: 'శుక్రవారం', en: 'Friday' },
  { key: 'Sat', te: 'శనివారం', en: 'Saturday' },
  { key: 'Sun', te: 'ఆదివారం', en: 'Sunday' },
];

export function PublicPortal({
  lang,
  listings,
  categories,
  sponsoredEnabled,
  subView,
  selectedSlug,
  selectedDistrictSlug,
  filters,
  onChangeSubView,
  onChangeFilters,
  onOpenListing,
  onOpenDistrict,
  onStartAddBusiness,
  onOpenLogin,
  onTrackHit,
  onLogSearch,
  onSubmitReport,
  onShareListing,
  onOpenPrivacyNotice,
}: PublicPortalProps) {
  const [searchInput, setSearchInput] = useState(filters.q);
  const [visibleCount, setVisibleCount] = useState(12);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [showJsonLd, setShowJsonLd] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Report modal state
  const [reportModalListingId, setReportModalListingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReasonCode>('wrong_phone');
  const [reportNote, setReportNote] = useState('');
  const [reportSubmittedMsg, setReportSubmittedMsg] = useState('');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const liveListings = useMemo(
    () => listings.filter((l) => l.status === 'live'),
    [listings]
  );

  // Homepage latest 6 approved listings preferring photos + verified badge (Section 7)
  const homepageSix = useMemo(() => {
    return [...liveListings]
      .sort((a, b) => {
        const av = a.badges.includes('vm_verified') ? 1 : 0;
        const bv = b.badges.includes('vm_verified') ? 1 : 0;
        if (bv !== av) return bv - av;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 6);
  }, [liveListings]);

  const filteredListings = useMemo(
    () => filterAndSortListings(listings, filters, categories),
    [listings, filters, categories]
  );

  const sponsoredSlots = useMemo(
    () => getSponsoredSlots(listings, filters, sponsoredEnabled),
    [listings, filters, sponsoredEnabled]
  );

  const townsInSelectedDistrict = useMemo(() => {
    if (!filters.district) return [];
    const set = new Set<string>();
    liveListings
      .filter((l) => l.districtSlug === filters.district)
      .forEach((l) => set.add(l.town));
    return Array.from(set).sort();
  }, [liveListings, filters.district]);

  const selectedCategoryObj = filters.category ? catMap.get(filters.category) : undefined;

  const activeListing = useMemo(
    () => listings.find((l) => l.slug === selectedSlug) ?? null,
    [listings, selectedSlug]
  );

  const activeDistrict = useMemo(
    () => (selectedDistrictSlug ? DISTRICT_MAP.get(selectedDistrictSlug) ?? null : null),
    [selectedDistrictSlug]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...filters, q: searchInput.trim() };
    onChangeFilters(next);
    if (subView !== 'directory') {
      onChangeSubView('directory');
    }
    if (searchInput.trim()) {
      const count = filterAndSortListings(listings, next, categories).length;
      onLogSearch(searchInput.trim(), count);
    }
  };

  const resetAllFilters = () => {
    setSearchInput('');
    onChangeFilters({
      q: '',
      state: '',
      district: '',
      town: '',
      category: '',
      subCategory: '',
      openNow: false,
      homeDelivery: false,
      acceptsUpi: false,
      verified: false,
      womenLed: false,
      sort: 'recommended',
    });
  };

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.state ||
      filters.district ||
      filters.town ||
      filters.category ||
      filters.subCategory ||
      filters.openNow ||
      filters.homeDelivery ||
      filters.acceptsUpi ||
      filters.verified ||
      filters.womenLed
  );

  // Shared Reusable Listing Card (Section 7 exact spec: 88px left thumb on mobile, top photo card on desktop, 2 badges max, Call & WhatsApp buttons)
  const renderListingCard = (biz: BusinessListing, isSponsoredCard = false) => {
    const cat = catMap.get(biz.categorySlug);
    const dist = DISTRICT_MAP.get(biz.districtSlug);
    const open = isOpenNow(biz);
    // Up to 2 badges, Vyapara Mitra verified first
    const orderedBadges = [...biz.badges]
      .sort((a, b) => (a === 'vm_verified' ? -1 : b === 'vm_verified' ? 1 : 0))
      .slice(0, 2);

    return (
      <article
        key={`${isSponsoredCard ? 'sp-' : ''}${biz.id}`}
        className={`bg-white rounded-xl border transition-colors hover:border-[#0E5E1F]/50 overflow-hidden flex flex-col ${
          isSponsoredCard ? 'border-amber-300 bg-[#F6F3E1]/35' : 'border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setActivePhotoIdx(0);
            onOpenListing(biz.slug);
          }}
          className="text-left flex flex-row sm:flex-col flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E5E1F]"
        >
          {/* Mobile: 88px square thumb on left; Desktop: top cover */}
          <div className="w-[100px] sm:w-full h-[100px] sm:h-40 shrink-0 p-2 sm:p-0">
            <StorefrontVisual
              photo={biz.mainPhoto}
              name={biz.nameEn}
              town={biz.town}
              categoryIcon={cat?.icon}
              compact={false}
              className="w-full h-full rounded-lg sm:rounded-none"
            />
          </div>

          <div className="p-3 sm:p-4 flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {isSponsoredCard && (
                <p className="text-[11px] font-semibold text-amber-800 mb-1">
                  స్పాన్సర్డ్ · Sponsored
                </p>
              )}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-1">
                {biz.nameEn}
              </h3>
              {biz.nameTe && (
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 mt-0.5">
                  {biz.nameTe}
                </p>
              )}

              <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">
                {cat ? (lang === 'te' ? cat.nameTe : cat.nameEn) : biz.categorySlug}
                <span aria-hidden="true"> · </span>
                {biz.town}, {dist ? (lang === 'te' ? dist.nameTe : dist.nameEn) : biz.districtSlug}
              </p>

              {/* Up to 2 Badges + Open Now / Closed (unboxed clean inline metadata) */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {orderedBadges.map((badgeId) => (
                  <span
                    key={badgeId}
                    className={`inline-flex items-center gap-1 font-medium ${
                      badgeId === 'vm_verified' ? 'text-[#0E5E1F]' : 'text-slate-600'
                    }`}
                  >
                    {badgeId === 'vm_verified' && <BadgeCheck className="w-3.5 h-3.5 shrink-0" />}
                    {lang === 'te' ? BADGE_LABELS[badgeId].te : BADGE_LABELS[badgeId].en}
                  </span>
                ))}
                {(biz.open24Hours || biz.openTime) && (
                  <span
                    className={`font-semibold ${
                      open ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    · {open ? t(lang, 'ఇప్పుడు తెరిచి ఉంది', 'Open now') : t(lang, 'మూసి ఉంది', 'Closed')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Two direct buttons on both mobile and desktop: Call and WhatsApp */}
        <div className="grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100">
          <a
            href={`tel:+91${biz.phone}`}
            onClick={() => onTrackHit(biz.id, 'call')}
            className="min-h-[42px] py-2.5 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-[#0E5E1F] inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-[#0E5E1F]" />
            <span>{t(lang, 'కాల్', 'Call')}</span>
          </a>
          <a
            href={buildWhatsAppLink(biz)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTrackHit(biz.id, 'whatsapp')}
            className="min-h-[42px] py-2.5 px-3 text-xs font-semibold text-[#0E5E1F] hover:bg-[#0E5E1F]/5 inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </article>
    );
  };

  // Neighbouring districts fallback for zero-results state (Section 8)
  const neighbouringMatches = useMemo(() => {
    if (filteredListings.length > 0 || !filters.district) return [];
    const neighbours = NEIGHBOURING_DISTRICTS[filters.district] ?? [];
    if (neighbours.length === 0) return [];
    return liveListings
      .filter(
        (l) =>
          neighbours.includes(l.districtSlug) &&
          (!filters.category || l.categorySlug === filters.category)
      )
      .slice(0, 3);
  }, [filteredListings.length, filters.district, filters.category, liveListings]);

  return (
    <div className="min-h-[calc(100vh-44px)] flex flex-col">
      {/* Public Site Header (3-Zone Top Bar Contract + working WhatsApp CTA per Section 2) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onChangeSubView('home')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left"
          >
            <img
              src="/assets/aistudio/Instagram_Profile_1080x1080_3ecef66e.png"
              alt="Vyapara Mitra"
              className="w-9 h-9 rounded-full object-cover border border-[#0E5E1F]/20"
            />
            <span className="text-lg font-bold tracking-tight text-[#0E5E1F]">
              {t(lang, 'వ్యాపార మిత్ర', 'Vyapara Mitra')}
            </span>
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav
            aria-label="Public website navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700"
          >
            <button
              type="button"
              onClick={() => onChangeSubView('home')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                subView === 'home'
                  ? 'border-[#0E5E1F] text-[#0E5E1F] font-semibold'
                  : 'border-transparent hover:text-[#0E5E1F]'
              }`}
            >
              {t(lang, 'హోమ్', 'Home')}
            </button>
            <button
              type="button"
              onClick={() => onChangeSubView('directory')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                subView === 'directory' || subView === 'listing'
                  ? 'border-[#0E5E1F] text-[#0E5E1F] font-semibold'
                  : 'border-transparent hover:text-[#0E5E1F]'
              }`}
            >
              {t(lang, 'స్థానిక వ్యాపారాలు', 'Directory')}
            </button>
            <button
              type="button"
              onClick={() => onOpenDistrict('jagtial')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                subView === 'district'
                  ? 'border-[#0E5E1F] text-[#0E5E1F] font-semibold'
                  : 'border-transparent hover:text-[#0E5E1F]'
              }`}
            >
              {t(lang, '61 జిల్లాలు', '61 Districts')}
            </button>
            <button
              type="button"
              onClick={() => onChangeSubView('advertise')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                subView === 'advertise'
                  ? 'border-[#0E5E1F] text-[#0E5E1F] font-semibold'
                  : 'border-transparent hover:text-[#0E5E1F]'
              }`}
            >
              {t(lang, 'ప్రకటనలు', 'Advertise')}
            </button>
            <a
              href="https://chat.whatsapp.com/vyaparamitra-community"
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap shrink-0 py-1 text-[#0E5E1F] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {t(lang, 'వాట్సాప్‌లో చేరండి', 'Join WhatsApp')}
            </a>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="hidden sm:inline-block text-sm font-medium text-slate-700 hover:text-[#0E5E1F] whitespace-nowrap"
            >
              {t(lang, 'రిజిస్టర్ / లాగిన్', 'Sign Up / Login')}
            </button>
            <button
              type="button"
              onClick={() => onStartAddBusiness(filters.district || undefined)}
              className="px-4 py-2 rounded-lg bg-[#0E5E1F] text-white text-xs sm:text-sm font-semibold hover:bg-[#1A5B0B] transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t(lang, 'వ్యాపారం చేర్చండి', 'Add Business')}</span>
            </button>
          </div>
        </div>

        {/* Mobile compact nav row */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onChangeSubView('home')}
            className={`whitespace-nowrap ${subView === 'home' ? 'text-[#0E5E1F] font-semibold' : ''}`}
          >
            {t(lang, 'హోమ్', 'Home')}
          </button>
          <button
            type="button"
            onClick={() => onChangeSubView('directory')}
            className={`whitespace-nowrap ${subView === 'directory' ? 'text-[#0E5E1F] font-semibold' : ''}`}
          >
            {t(lang, 'వ్యాపారాలు', 'Directory')}
          </button>
          <button
            type="button"
            onClick={() => onOpenDistrict('jagtial')}
            className={`whitespace-nowrap ${subView === 'district' ? 'text-[#0E5E1F] font-semibold' : ''}`}
          >
            {t(lang, 'జిల్లాలు', 'Districts')}
          </button>
          <button
            type="button"
            onClick={() => onChangeSubView('advertise')}
            className={`whitespace-nowrap ${subView === 'advertise' ? 'text-[#0E5E1F] font-semibold' : ''}`}
          >
            {t(lang, 'ప్రకటనలు', 'Advertise')}
          </button>
          <a
            href="https://chat.whatsapp.com/vyaparamitra-community"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-[#0E5E1F] font-semibold"
          >
            {t(lang, 'వాట్సాప్‌లో చేరండి', 'Join WhatsApp')}
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* ============================================================
            VIEW 1: HOMEPAGE (/) — "మన సభ్యుల వ్యాపారాలు" + Sponsored Block
            ============================================================ */}
        {subView === 'home' && (
          <div className="space-y-12 pb-16">
            {/* Hero Banner */}
            <section className="bg-[#0E5E1F] text-white border-b border-[#1A5B0B]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-5">
                  <p className="text-xs font-semibold text-[#FDB902]">
                    {t(
                      lang,
                      'ఆంధ్రప్రదేశ్ (28) & తెలంగాణ (33) · 61 జిల్లాల వ్యాపార నెట్‌వర్క్',
                      'Andhra Pradesh (28) & Telangana (33) · 61-District Business Network'
                    )}
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight tracking-tight">
                    {t(
                      lang,
                      'మీ ప్రాంతంలోని నమ్మకమైన స్థానిక వ్యాపారాలను కనుగొనండి',
                      'Find trusted local businesses across AP & Telangana'
                    )}
                  </h1>
                  <p className="text-sm sm:text-base text-white/85 max-w-2xl leading-relaxed">
                    {t(
                      lang,
                      'లాగిన్ లేకుండానే ఫోన్ నంబర్లు చూడండి, నేరుగా కాల్ లేదా WhatsApp చేయండి. వ్యాపార యజమానులు 3 నిమిషాల్లో ఉచితంగా లిస్ట్ చేయవచ్చు.',
                      'Open to view with zero login walls. Call or WhatsApp listed shops directly, or list your own business completely free after a 30-second mobile OTP sign-up.'
                    )}
                  </p>

                  {/* Hero Quick Search Bar */}
                  <form
                    onSubmit={handleSearchSubmit}
                    className="bg-white p-2 rounded-xl flex flex-col sm:flex-row gap-2 max-w-2xl shadow-sm"
                  >
                    <div className="flex-1 flex items-center gap-2 px-3">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        aria-label={t(lang, 'వ్యాపారం వెతకండి', 'Search businesses')}
                        placeholder={t(
                          lang,
                          'ఏమి కావాలి? ఉదా: కిరాణా, టైలర్, మెకానిక్',
                          'What do you need? e.g., Kirana, Tailor, Mechanic'
                        )}
                        className="w-full h-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                    <select
                      aria-label={t(lang, 'జిల్లా ఎంచుకోండి', 'Select district')}
                      value={filters.district}
                      onChange={(e) =>
                        onChangeFilters({ ...filters, district: e.target.value, town: '' })
                      }
                      className="h-11 px-3 rounded-lg border border-slate-200 text-sm text-slate-800 bg-slate-50 sm:w-44"
                    >
                      <option value="">{t(lang, 'అన్ని 61 జిల్లాలు', 'All 61 Districts')}</option>
                      <optgroup label="Telangana (33)">
                        {TELANGANA_DISTRICTS.map((d) => (
                          <option key={d.slug} value={d.slug}>
                            {lang === 'te' ? d.nameTe : d.nameEn}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Andhra Pradesh (28)">
                        {AP_DISTRICTS.map((d) => (
                          <option key={d.slug} value={d.slug}>
                            {lang === 'te' ? d.nameTe : d.nameEn}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <button
                      type="submit"
                      className="h-11 px-5 rounded-lg bg-[#FDB902] text-[#0A4216] font-bold text-sm hover:bg-amber-400 transition-colors whitespace-nowrap"
                    >
                      {t(lang, 'వెతకండి', 'Search')}
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-5">
                  <div className="rounded-xl overflow-hidden border border-white/15 bg-[#0A4216]">
                    <img
                      src="/assets/aistudio/WhatsApp_Cover_1920x1080_f97a5e01.png"
                      alt="Vyapara Mitra — మీ వ్యాపారానికి తోడుగా"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* "మన సభ్యుల వ్యాపారాలు" Block — Latest 6 Approved Listings (Section 2 & 7) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {t(lang, 'మన సభ్యుల వ్యాపారాలు', "Our Members' Businesses")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t(
                      lang,
                      'వ్యాపార మిత్ర వెరిఫైడ్ & తాజాగా ఆమోదించబడిన 6 వ్యాపారాలు',
                      'Latest 6 approved listings — verified businesses shown first'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onChangeSubView('directory')}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <span>{t(lang, 'అన్నీ చూడండి', 'View All')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartAddBusiness()}
                    className="px-4 py-2 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B]"
                  >
                    + {t(lang, 'మీ వ్యాపారం చేర్చండి', 'Add Your Business')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {homepageSix.map((biz) => renderListingCard(biz))}
              </div>
            </section>

            {/* Homepage Sponsored Image Block (Section 2 & 14) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="rounded-xl border border-amber-300/70 bg-[#F6F3E1] p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-80 rounded-lg overflow-hidden border border-black/10 shrink-0">
                  <img
                    src="/assets/aistudio/YouTube_Banner_2560x1440_1f56aba4.png"
                    alt="Vyapara Mitra Sponsored Partner"
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <p className="text-xs font-semibold text-amber-900">స్పాన్సర్డ్ · Sponsored</p>
                  <h3 className="text-lg font-bold text-slate-900">
                    {t(
                      lang,
                      'మీ వ్యాపార ప్రకటనను 61 జిల్లాల వ్యాపారవేత్తలకు చేరవేయండి',
                      'Feature your verified business at the top of district & category searches'
                    )}
                  </h3>
                  <p className="text-sm text-slate-700">
                    {t(
                      lang,
                      'అన్ని వ్యాపార లిస్టింగ్‌లు ఎప్పుడూ ఉచితం. అదనపు ప్రచారం కోసం ఫౌండింగ్ స్పాన్సర్ మరియు జిల్లా స్లాట్ ఎంపికలను చూడండి.',
                      'Standard listings always remain 100% free. Optional clearly labelled sponsored slots are available for verified businesses.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeSubView('advertise')}
                  className="px-5 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] whitespace-nowrap shrink-0"
                >
                  {t(lang, 'ప్రకటన ఎంపికలు చూడండి', 'View Ad Options')}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            VIEW 2: DIRECTORY HOME (/businesses/) — Exact 6-Block Spec Layout
            ============================================================ */}
        {subView === 'directory' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-8">
            {/* 1. Breadcrumb & H1 */}
            <div className="space-y-2">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => onChangeSubView('home')}
                  className="hover:text-[#0E5E1F]"
                >
                  {t(lang, 'హోమ్', 'Home')}
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-800 font-medium">
                  {t(lang, 'స్థానిక వ్యాపారాలు', 'Local Businesses')}
                </span>
              </nav>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {t(lang, 'స్థానిక వ్యాపారాలు', 'Local Businesses Directory')}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {t(
                      lang,
                      'ఆంధ్రప్రదేశ్ & తెలంగాణలోని 61 జిల్లాల వ్యాపారాలు · లాగిన్ లేకుండానే నేరుగా కాల్ & WhatsApp చేయండి.',
                      'Verified local shops, services, and suppliers across 61 districts in AP & Telangana. Free to list, open to view.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Search Bar + Structured Filters */}
            <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label={t(lang, 'కీవర్డ్ సెర్చ్', 'Keyword search')}
                    placeholder={t(
                      lang,
                      'ఏమి కావాలి? ఉదా: కిరాణా, టైలర్, మెకానిక్',
                      'What do you need? e.g., Kirana, Tailor, Mechanic'
                    )}
                    className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E5E1F]/25 focus:border-[#0E5E1F]"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    aria-label={t(lang, 'జిల్లా ఫిల్టర్', 'Filter by district')}
                    value={filters.district}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, district: e.target.value, town: '' })
                    }
                    className="w-full h-12 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="">{t(lang, 'అన్ని జిల్లాలు (61)', 'All 61 Districts')}</option>
                    <optgroup label="Telangana (33)">
                      {TELANGANA_DISTRICTS.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : d.nameEn}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Andhra Pradesh (28)">
                      {AP_DISTRICTS.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : d.nameEn}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    aria-label={t(lang, 'కేటగిరీ ఫిల్టర్', 'Filter by category')}
                    value={filters.category}
                    onChange={(e) =>
                      onChangeFilters({ ...filters, category: e.target.value, subCategory: '' })
                    }
                    className="w-full h-12 px-3 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="">{t(lang, 'అన్ని కేటగిరీలు', 'All Categories')}</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {lang === 'te' ? c.nameTe : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 h-12 px-4 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] transition-colors"
                  >
                    {t(lang, 'వెతకండి', 'Search')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFiltersMobile((v) => !v)}
                    aria-label="Toggle more filters"
                    className="md:hidden h-12 px-3 rounded-lg border border-slate-300 text-slate-700"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Structured Filters Row (Section 8: State, Town, Sub-category, Open Now, Home Delivery, UPI, Verified, Women-led) */}
              <div
                className={`${
                  showFiltersMobile ? 'flex' : 'hidden md:flex'
                } flex-wrap items-center gap-2 pt-3 border-t border-slate-100`}
              >
                {/* State toggle */}
                <select
                  aria-label="Filter by state"
                  value={filters.state}
                  onChange={(e) =>
                    onChangeFilters({
                      ...filters,
                      state: e.target.value as '' | 'TS' | 'AP',
                      district: '',
                      town: '',
                    })
                  }
                  className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700"
                >
                  <option value="">{t(lang, 'రెండు రాష్ట్రాలు', 'AP & Telangana')}</option>
                  <option value="TS">{t(lang, 'తెలంగాణ', 'Telangana')}</option>
                  <option value="AP">{t(lang, 'ఆంధ్రప్రదేశ్', 'Andhra Pradesh')}</option>
                </select>

                {/* Town dropdown (appears once a district is picked) */}
                {filters.district && townsInSelectedDistrict.length > 0 && (
                  <select
                    aria-label="Filter by town"
                    value={filters.town}
                    onChange={(e) => onChangeFilters({ ...filters, town: e.target.value })}
                    className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700"
                  >
                    <option value="">{t(lang, 'అన్ని పట్టణాలు', 'All towns')}</option>
                    {townsInSelectedDistrict.map((tn) => (
                      <option key={tn} value={tn}>
                        {tn}
                      </option>
                    ))}
                  </select>
                )}

                {/* Sub-category dropdown (appears when category picked) */}
                {selectedCategoryObj && (
                  <select
                    aria-label="Filter by sub-category"
                    value={filters.subCategory}
                    onChange={(e) => onChangeFilters({ ...filters, subCategory: e.target.value })}
                    className="h-9 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700"
                  >
                    <option value="">{t(lang, 'అన్ని ఉప కేటగిరీలు', 'All sub-categories')}</option>
                    {selectedCategoryObj.subCategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}

                {/* Functional interactive filter toggle buttons */}
                {[
                  { key: 'openNow', te: 'ఇప్పుడు తెరిచి ఉంది', en: 'Open now' },
                  { key: 'verified', te: 'వ్యాపార మిత్ర వెరిఫైడ్', en: 'VM Verified' },
                  { key: 'acceptsUpi', te: 'UPI అంగీకరిస్తుంది', en: 'Accepts UPI' },
                  { key: 'homeDelivery', te: 'హోమ్ డెలివరీ', en: 'Home delivery' },
                  { key: 'womenLed', te: 'మహిళా వ్యాపారం', en: 'Women-led' },
                ].map((flt) => {
                  const active = Boolean(filters[flt.key as keyof DirectoryFilters]);
                  return (
                    <button
                      key={flt.key}
                      type="button"
                      onClick={() =>
                        onChangeFilters({
                          ...filters,
                          [flt.key]: !active,
                        })
                      }
                      className={`h-9 px-3 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#0E5E1F] text-white border-[#0E5E1F]'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-[#0E5E1F]'
                      }`}
                    >
                      {lang === 'te' ? flt.te : flt.en}
                    </button>
                  );
                })}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="h-9 px-2.5 text-xs font-semibold text-red-700 hover:underline ml-auto"
                  >
                    {t(lang, 'ఫిల్టర్లు క్లియర్ చేయండి', 'Clear all')}
                  </button>
                )}
              </div>
            </section>

            {/* 3. Category Grid: All 22 Icons with Telugu Names (4 per row on phones) */}
            {!hasActiveFilters && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">
                  {t(lang, '22 వ్యాపార కేటగిరీలు', 'Browse 22 Business Categories')}
                </h2>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() =>
                        onChangeFilters({ ...filters, category: cat.slug, subCategory: '' })
                      }
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#0E5E1F] hover:bg-[#0E5E1F]/5 transition-colors flex flex-col items-center text-center gap-2"
                    >
                      <span className="w-9 h-9 rounded-lg bg-[#F6F3E1] text-[#0E5E1F] flex items-center justify-center shrink-0">
                        <CategoryIcon name={cat.icon} className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] sm:text-xs font-medium text-slate-800 leading-tight line-clamp-2">
                        {lang === 'te' ? cat.nameTe : cat.nameEn}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Free Listing Banner (Section 7) */}
            {!hasActiveFilters && (
              <section className="rounded-xl bg-[#F6F3E1] border border-amber-300/60 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {t(lang, 'మీది కూడా వ్యాపారమా? ఉచితంగా లిస్ట్ చేయండి!', 'Own a local business in AP or Telangana?')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                    {t(
                      lang,
                      'ఎటువంటి ఛార్జీ లేదు. 3 నిమిషాల్లో ఫారమ్ పూర్తి చేసి మీ జిల్లా కస్టమర్లకు చేరువవ్వండి.',
                      'Zero fees forever. Verify your mobile in 30 seconds and get discovered on Google & WhatsApp.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onStartAddBusiness(filters.district || undefined)}
                  className="px-5 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] whitespace-nowrap"
                >
                  {t(lang, 'మీ వ్యాపారాన్ని ఉచితంగా చేర్చండి', 'List Your Business for Free')}
                </button>
              </section>
            )}

            {/* 5. Results Header + Sort + Removable Filter Chips + Sponsored Slots + Cards */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-mono-num">
                    {filters.district
                      ? t(
                          lang,
                          `${DISTRICT_MAP.get(filters.district)?.nameTe || filters.district}లో ${filteredListings.length} వ్యాపారాలు`,
                          `${filteredListings.length} businesses in ${DISTRICT_MAP.get(filters.district)?.nameEn || filters.district}`
                        )
                      : t(
                          lang,
                          `${filteredListings.length} వ్యాపారాలు కనిపించాయి`,
                          `${filteredListings.length} live businesses`
                        )}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="dir-sort" className="text-xs font-medium text-slate-600">
                    {t(lang, 'క్రమం:', 'Sort:')}
                  </label>
                  <select
                    id="dir-sort"
                    value={filters.sort}
                    onChange={(e) =>
                      onChangeFilters({
                        ...filters,
                        sort: e.target.value as DirectoryFilters['sort'],
                      })
                    }
                    className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800"
                  >
                    <option value="recommended">
                      {t(lang, 'వెరిఫైడ్ ముందు (సిఫార్సు)', 'Verified first (Recommended)')}
                    </option>
                    <option value="complete">
                      {t(lang, 'పూర్తి వివరాలు గలవి', 'Most complete')}
                    </option>
                    <option value="newest">{t(lang, 'కొత్తవి ముందు', 'Newest first')}</option>
                  </select>
                </div>
              </div>

              {/* Active removable filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  {filters.q && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        onChangeFilters({ ...filters, q: '' });
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-800 hover:bg-slate-200"
                    >
                      <span>“{filters.q}”</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {filters.district && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, district: '', town: '' })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-800 hover:bg-slate-200"
                    >
                      <span>{DISTRICT_MAP.get(filters.district)?.nameEn}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {filters.category && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeFilters({ ...filters, category: '', subCategory: '' })
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-800 hover:bg-slate-200"
                    >
                      <span>
                        {lang === 'te'
                          ? catMap.get(filters.category)?.nameTe
                          : catMap.get(filters.category)?.nameEn}
                      </span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Optional Sponsored Slots (Section 14: max 2 clearly labelled above normal results) */}
              {sponsoredSlots.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sponsoredSlots.map((biz) => renderListingCard(biz, true))}
                </div>
              )}

              {/* Listing Cards or Zero-Results State */}
              {filteredListings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    {t(
                      lang,
                      'మీ సెర్చ్‌కు సరిపోయే వ్యాపారాలు ప్రస్తుతం లేవు',
                      'No matching businesses found'
                    )}
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    {t(
                      lang,
                      'కొన్ని ఫిల్టర్లను తొలగించి మళ్ళీ ప్రయత్నించండి లేదా స్థానిక వ్యాపారాన్ని ఉచితంగా చేరమని WhatsApp లో ఆహ్వానించండి.',
                      'Try removing a filter, explore neighbouring districts below, or invite a local shopkeeper to list for free.'
                    )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      {t(lang, 'ఫిల్టర్లు తొలగించు', 'Remove Filters')}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        'List your business for free on Vyapara Mitra! https://vyaparamitra.in/businesses/'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t(lang, 'స్థానిక వ్యాపారాన్ని ఆహ్వానించండి', 'Invite a Local Business on WhatsApp')}
                    </a>
                  </div>

                  {neighbouringMatches.length > 0 && (
                    <div className="pt-6 border-t border-slate-200 text-left space-y-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {t(lang, 'పక్క జిల్లాల్లోని వ్యాపారాలు:', 'Same category in neighbouring districts:')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {neighbouringMatches.map((b) => renderListingCard(b))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.slice(0, visibleCount).map((biz) => renderListingCard(biz))}
                  </div>

                  {filteredListings.length > visibleCount && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + 12)}
                        className="px-6 py-2.5 rounded-lg border border-[#0E5E1F] text-[#0E5E1F] text-sm font-semibold hover:bg-[#0E5E1F]/5"
                      >
                        {t(lang, 'మరిన్ని చూపించు', 'Show More')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* 6. Districts Grouped by State (all 61 districts clickable!) */}
            <section className="pt-6 border-t border-slate-200 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">
                {t(lang, 'జిల్లా వారీగా వ్యాపారాలు (61 జిల్లాలు)', 'Browse by District (All 61 Districts)')}
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#0E5E1F]">
                    {t(lang, 'తెలంగాణ (33 జిల్లాలు)', 'Telangana (33 Districts)')}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
                    {TELANGANA_DISTRICTS.map((d) => {
                      const cnt = liveListings.filter((l) => l.districtSlug === d.slug).length;
                      return (
                        <button
                          key={d.slug}
                          type="button"
                          onClick={() => onOpenDistrict(d.slug)}
                          className="text-slate-700 hover:text-[#0E5E1F] hover:underline"
                        >
                          {lang === 'te' ? d.nameTe : d.nameEn}
                          {cnt > 0 && (
                            <span className="text-slate-400 font-mono-num ml-1">({cnt})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#0E5E1F]">
                    {t(lang, 'ఆంధ్రప్రదేశ్ (28 జిల్లాలు)', 'Andhra Pradesh (28 Districts)')}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
                    {AP_DISTRICTS.map((d) => {
                      const cnt = liveListings.filter((l) => l.districtSlug === d.slug).length;
                      return (
                        <button
                          key={d.slug}
                          type="button"
                          onClick={() => onOpenDistrict(d.slug)}
                          className="text-slate-700 hover:text-[#0E5E1F] hover:underline"
                        >
                          {lang === 'te' ? d.nameTe : d.nameEn}
                          {cnt > 0 && (
                            <span className="text-slate-400 font-mono-num ml-1">({cnt})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            VIEW 3: LISTING DETAIL PAGE (/businesses/{slug}/) — Section 7
            ============================================================ */}
        {subView === 'listing' && activeListing && (() => {
          const cat = catMap.get(activeListing.categorySlug);
          const dist = DISTRICT_MAP.get(activeListing.districtSlug);
          const open = isOpenNow(activeListing);
          const photos =
            activeListing.galleryPhotos.length > 0
              ? activeListing.galleryPhotos
              : [activeListing.mainPhoto];
          const relatedListings = liveListings
            .filter(
              (l) =>
                l.id !== activeListing.id &&
                (l.districtSlug === activeListing.districtSlug ||
                  l.categorySlug === activeListing.categorySlug)
            )
            .slice(0, 6);
          const jsonLd = buildLocalBusinessJsonLd(activeListing, cat, dist);

          return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-12 space-y-6">
              {/* 1. Breadcrumb: హోమ్ › వ్యాపారాలు › {district} › {category} › {name} */}
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => onChangeSubView('home')}
                  className="hover:text-[#0E5E1F]"
                >
                  {t(lang, 'హోమ్', 'Home')}
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <button
                  type="button"
                  onClick={() => onChangeSubView('directory')}
                  className="hover:text-[#0E5E1F]"
                >
                  {t(lang, 'వ్యాపారాలు', 'Businesses')}
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                {dist && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenDistrict(dist.slug)}
                      className="hover:text-[#0E5E1F]"
                    >
                      {lang === 'te' ? dist.nameTe : dist.nameEn}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
                {cat && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeFilters({ ...filters, category: cat.slug });
                        onChangeSubView('directory');
                      }}
                      className="hover:text-[#0E5E1F]"
                    >
                      {lang === 'te' ? cat.nameTe : cat.nameEn}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
                <span className="text-slate-900 font-medium truncate max-w-[200px]">
                  {activeListing.nameEn}
                </span>
              </nav>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                {/* Main Left Column */}
                <div className="lg:col-span-8 space-y-6">
                  {/* 2. Photo Gallery */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <StorefrontVisual
                      photo={photos[activePhotoIdx] || activeListing.mainPhoto}
                      name={activeListing.nameEn}
                      town={activeListing.town}
                      categoryIcon={cat?.icon}
                      className="w-full h-64 sm:h-80"
                    />
                    {photos.length > 1 && (
                      <div className="p-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                        {photos.map((ph, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhotoIdx(idx)}
                            aria-label={`View photo ${idx + 1}`}
                            className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                              idx === activePhotoIdx ? 'border-[#0E5E1F]' : 'border-transparent'
                            }`}
                          >
                            <StorefrontVisual
                              photo={ph}
                              name={activeListing.nameEn}
                              compact
                              className="w-full h-full"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3 & 4. Title, Category, Badges, Location & Open Status */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-[#0E5E1F]">
                        {cat ? (lang === 'te' ? cat.nameTe : cat.nameEn) : activeListing.categorySlug}
                        {activeListing.subCategory ? ` · ${activeListing.subCategory}` : ''}
                      </p>
                      <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
                        {activeListing.nameEn}
                      </h1>
                      {activeListing.nameTe && (
                        <p className="mt-1 text-base font-medium text-slate-700">
                          {activeListing.nameTe}
                        </p>
                      )}
                    </div>

                    {/* Badges row */}
                    {activeListing.badges.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
                        {activeListing.badges.map((b) => (
                          <span
                            key={b}
                            className={`inline-flex items-center gap-1 ${
                              b === 'vm_verified' ? 'text-[#0E5E1F]' : 'text-slate-700'
                            }`}
                          >
                            <BadgeCheck className="w-4 h-4 text-[#0E5E1F]" />
                            {lang === 'te' ? BADGE_LABELS[b].te : BADGE_LABELS[b].en}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Location + Open Now */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-700 pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#0E5E1F]" />
                        <span>
                          {activeListing.town}
                          {activeListing.mandal ? `, ${activeListing.mandal}` : ''},{' '}
                          {dist ? (lang === 'te' ? dist.nameTe : dist.nameEn) : activeListing.districtSlug}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          open ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {activeListing.open24Hours
                          ? t(lang, '24 గంటలు తెరిచి ఉంటుంది', 'Open 24 hours')
                          : open
                          ? t(
                              lang,
                              `ఇప్పుడు తెరిచి ఉంది · ${formatTime12h(activeListing.closeTime)} కు మూస్తారు`,
                              `Open now · closes ${formatTime12h(activeListing.closeTime)}`
                            )
                          : t(lang, 'ప్రస్తుతం మూసి ఉంది', 'Closed now')}
                      </span>
                    </div>

                    {/* 5. Desktop Action Bar (Call, WhatsApp, Directions, Share) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      <a
                        href={`tel:+91${activeListing.phone}`}
                        onClick={() => onTrackHit(activeListing.id, 'call')}
                        className="min-h-[46px] px-4 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B] inline-flex items-center justify-center gap-2 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{t(lang, 'కాల్ చేయండి', 'Call')}</span>
                      </a>
                      <a
                        href={buildWhatsAppLink(activeListing)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onTrackHit(activeListing.id, 'whatsapp')}
                        className="min-h-[46px] px-4 rounded-lg bg-[#FDB902] text-[#0A4216] text-sm font-bold hover:bg-amber-400 inline-flex items-center justify-center gap-2 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={buildDirectionsLink(activeListing, dist?.nameEn)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onTrackHit(activeListing.id, 'directions')}
                        className="min-h-[46px] px-4 rounded-lg border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors"
                      >
                        <Compass className="w-4 h-4 text-[#0E5E1F]" />
                        <span>{t(lang, 'డైరెక్షన్స్', 'Directions')}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => onShareListing(activeListing)}
                        className="min-h-[46px] px-4 rounded-lg border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors"
                      >
                        <Share2 className="w-4 h-4 text-[#0E5E1F]" />
                        <span>{t(lang, 'షేర్', 'Share')}</span>
                      </button>
                    </div>
                  </div>

                  {/* 6. About & Products/Services */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h2 className="text-base font-bold text-slate-900">
                      {t(lang, 'వ్యాపారం గురించి', 'About the Business')}
                    </h2>
                    <p className="text-sm text-slate-700 leading-relaxed">{activeListing.about}</p>

                    {activeListing.tags.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <h3 className="text-xs font-semibold text-slate-500 mb-2">
                          {t(lang, 'ఉత్పత్తులు & సేవలు', 'Products & Services')}
                        </h3>
                        <p className="text-sm text-slate-800 font-medium">
                          {activeListing.tags.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 7. Weekly Timings Schedule */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900">
                        {t(lang, 'వ్యాపార సమయాలు', 'Weekly Timings')}
                      </h2>
                      {activeListing.timingNote && (
                        <span className="text-xs text-slate-600">{activeListing.timingNote}</span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 text-sm">
                      {WEEK_DAYS.map((d) => {
                        const isHoliday = activeListing.weeklyHoliday === d.key;
                        return (
                          <div key={d.key} className="py-2 flex items-center justify-between">
                            <span className="text-slate-700 font-medium">
                              {lang === 'te' ? d.te : d.en}
                            </span>
                            <span
                              className={`font-mono-num text-xs ${
                                isHoliday ? 'text-red-700 font-semibold' : 'text-slate-800'
                              }`}
                            >
                              {isHoliday
                                ? t(lang, 'వారపు సెలవు (Closed)', 'Weekly Holiday (Closed)')
                                : activeListing.open24Hours
                                ? 'Open 24 Hours'
                                : `${formatTime12h(activeListing.openTime)} – ${formatTime12h(activeListing.closeTime)}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 8 & 9. Address, Details, Registrations & Links */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-slate-900">
                        {t(lang, 'చిరునామా & వివరాలు', 'Address & Business Details')}
                      </h2>
                      <p className="text-sm text-slate-700">
                        {activeListing.showOnlyTown ? activeListing.town : activeListing.address}
                        {activeListing.landmark ? ` (${activeListing.landmark})` : ''}
                        <br />
                        {activeListing.town}
                        {activeListing.mandal ? `, ${activeListing.mandal}` : ''},{' '}
                        {dist?.nameEn} – <span className="font-mono-num">{activeListing.pinCode}</span>
                      </p>
                      <p className="text-sm font-mono-num text-slate-800">
                        {t(lang, 'ఫోన్:', 'Phone:')} +91 {activeListing.phone}
                      </p>
                    </div>

                    <dl className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">{t(lang, 'చెల్లింపు విధానాలు', 'Payment Methods')}</dt>
                        <dd className="font-medium text-slate-900 mt-0.5 uppercase">
                          {activeListing.payments.join(', ') || 'Cash'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">{t(lang, 'హోమ్ డెలివరీ', 'Home Delivery')}</dt>
                        <dd className="font-medium text-slate-900 mt-0.5 inline-flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-[#0E5E1F]" />
                          {activeListing.homeDelivery ? t(lang, 'అందుబాటులో ఉంది', 'Available') : t(lang, 'లేదు', 'Not available')}
                        </dd>
                      </div>
                      {activeListing.yearStarted && (
                        <div>
                          <dt className="text-xs text-slate-500">{t(lang, 'ప్రారంభం', 'Established')}</dt>
                          <dd className="font-medium text-slate-900 mt-0.5 font-mono-num">
                            Since {activeListing.yearStarted}
                          </dd>
                        </div>
                      )}
                      {activeListing.showContactPerson && (
                        <div>
                          <dt className="text-xs text-slate-500">{t(lang, 'సంప్రదించాల్సిన వ్యక్తి', 'Contact Person')}</dt>
                          <dd className="font-medium text-slate-900 mt-0.5">
                            {activeListing.contactPerson}
                          </dd>
                        </div>
                      )}
                      {activeListing.gstin && (
                        <div>
                          <dt className="text-xs text-slate-500">GSTIN</dt>
                          <dd className="font-mono-num text-xs font-medium text-slate-900 mt-0.5">
                            {activeListing.gstin}
                          </dd>
                        </div>
                      )}
                      {activeListing.fssaiNumber && (
                        <div>
                          <dt className="text-xs text-slate-500">FSSAI Licence</dt>
                          <dd className="font-mono-num text-xs font-medium text-slate-900 mt-0.5">
                            {activeListing.fssaiNumber}
                          </dd>
                        </div>
                      )}
                      {activeListing.website && (
                        <div>
                          <dt className="text-xs text-slate-500">Website</dt>
                          <dd className="mt-0.5">
                            <a
                              href={activeListing.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0E5E1F] font-medium hover:underline inline-flex items-center gap-1"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              {activeListing.website.replace(/^https?:\/\//, '')}
                            </a>
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-xs text-slate-500">{t(lang, 'చివరిగా నిర్ధారించిన తేదీ', 'Last Confirmed')}</dt>
                        <dd className="font-mono-num text-xs text-slate-700 mt-0.5 inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Updated {activeListing.lastConfirmed}
                        </dd>
                      </div>
                    </dl>

                    {/* 12. Update / Report Problem links */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <button
                        type="button"
                        onClick={onOpenLogin}
                        className="text-[#0E5E1F] font-semibold hover:underline"
                      >
                        {t(lang, 'ఇది మీ వ్యాపారమా? వివరాలు అప్‌డేట్ చేయండి', 'Is this your business? Update it')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReportModalListingId(activeListing.id);
                          setReportSubmittedMsg('');
                        }}
                        className="text-slate-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        {t(lang, 'సమస్యను నివేదించండి', 'Report a problem')}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible SEO LocalBusiness JSON-LD Inspector (Section 11) */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowJsonLd((s) => !s)}
                      className="w-full px-5 py-3 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-[#0E5E1F]" />
                        Schema.org JSON-LD ({String(jsonLd['@type'])}) · SEO Rich Results Ready
                      </span>
                      <span>{showJsonLd ? 'Hide' : 'Inspect'}</span>
                    </button>
                    {showJsonLd && (
                      <pre className="p-4 bg-slate-900 text-emerald-300 text-xs font-mono-num overflow-x-auto">
                        {JSON.stringify(jsonLd, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Right Sidebar Rail */}
                <aside className="lg:col-span-4 space-y-5">
                  {/* 11. "మీ ప్రకటన ఇక్కడ" Ad Slot -> links to /advertise/ */}
                  <div className="rounded-xl border border-amber-300/70 bg-[#F6F3E1] p-5 space-y-3">
                    <p className="text-xs font-semibold text-amber-900">
                      {t(lang, 'మీ ప్రకటన ఇక్కడ', 'Your Ad Here')}
                    </p>
                    <h3 className="text-base font-bold text-slate-900">
                      {t(
                        lang,
                        `${dist?.nameTe || ''} జిల్లాలో మీ వ్యాపారాన్ని ప్రమోట్ చేయండి`,
                        `Promote your business in ${dist?.nameEn || 'this district'}`
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onChangeSubView('advertise')}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B]"
                    >
                      {t(lang, 'ప్రకటన వివరాలు చూడండి (/advertise/)', 'See Advertising Options')}
                    </button>
                  </div>

                  {/* 14. District WhatsApp Community Box */}
                  {dist && (
                    <div className="bg-[#0E5E1F] text-white rounded-xl p-5 space-y-3">
                      <h3 className="text-base font-bold">
                        {t(
                          lang,
                          `${dist.nameTe} వ్యాపార మిత్ర WhatsApp కమ్యూనిటీలో చేరండి`,
                          `Join the ${dist.nameEn} Vyapara Mitra WhatsApp community`
                        )}
                      </h3>
                      <p className="text-xs text-white/85">
                        {t(
                          lang,
                          `జిల్లా పార్టనర్: ${dist.partnerName} · ${dist.ambassadorsCount} అంబాసిడర్లు`,
                          `District Partner: ${dist.partnerName} · ${dist.ambassadorsCount} Founding Ambassadors`
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenDistrict(dist.slug)}
                        className="w-full py-2.5 px-4 rounded-lg bg-[#FDB902] text-[#0A4216] text-xs font-bold hover:bg-amber-400"
                      >
                        {t(lang, `${dist.nameTe} జిల్లా పేజీ చూడండి`, `Open ${dist.nameEn} District Page`)}
                      </button>
                    </div>
                  )}

                  {/* 15. "మీది కూడా వ్యాపారమా?" CTA */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <h3 className="text-base font-bold text-slate-900">
                      {t(lang, 'మీది కూడా వ్యాపారమా?', 'Do you also run a business?')}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {t(
                        lang,
                        'ఉచితంగా లిస్ట్ చేసి మీ జిల్లా కస్టమర్లను నేరుగా చేరుకోండి.',
                        'Add your business for free in 3 minutes. Zero listing fees.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => onStartAddBusiness(activeListing.districtSlug)}
                      className="w-full py-2.5 px-4 rounded-lg border border-[#0E5E1F] text-[#0E5E1F] text-xs font-semibold hover:bg-[#0E5E1F]/5"
                    >
                      + {t(lang, 'వ్యాపారం చేర్చండి', 'Add Your Business Free')}
                    </button>
                  </div>
                </aside>
              </div>

              {/* 13. Six More Listings from Same Category / District */}
              {relatedListings.length > 0 && (
                <section className="pt-6 border-t border-slate-200 space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {t(lang, 'దగ్గరి & సంబంధిత వ్యాపారాలు', 'More Listings Nearby & in This Category')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedListings.map((b) => renderListingCard(b))}
                  </div>
                </section>
              )}

              {/* Mobile Fixed Bottom Action Bar (<= 15% mobile viewport height) */}
              <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-3 py-2 grid grid-cols-4 gap-2 shadow-lg">
                <a
                  href={`tel:+91${activeListing.phone}`}
                  onClick={() => onTrackHit(activeListing.id, 'call')}
                  className="py-2 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold flex flex-col items-center justify-center gap-0.5"
                >
                  <Phone className="w-4 h-4" />
                  <span>{t(lang, 'కాల్', 'Call')}</span>
                </a>
                <a
                  href={buildWhatsAppLink(activeListing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onTrackHit(activeListing.id, 'whatsapp')}
                  className="py-2 rounded-lg bg-[#FDB902] text-[#0A4216] text-xs font-bold flex flex-col items-center justify-center gap-0.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={buildDirectionsLink(activeListing, dist?.nameEn)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onTrackHit(activeListing.id, 'directions')}
                  className="py-2 rounded-lg border border-slate-200 text-slate-800 text-xs font-medium flex flex-col items-center justify-center gap-0.5"
                >
                  <Compass className="w-4 h-4 text-[#0E5E1F]" />
                  <span>{t(lang, 'మ్యాప్', 'Map')}</span>
                </a>
                <button
                  type="button"
                  onClick={() => onShareListing(activeListing)}
                  className="py-2 rounded-lg border border-slate-200 text-slate-800 text-xs font-medium flex flex-col items-center justify-center gap-0.5"
                >
                  <Share2 className="w-4 h-4 text-[#0E5E1F]" />
                  <span>{t(lang, 'షేర్', 'Share')}</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* ============================================================
            VIEW 4: DISTRICT PAGE (/businesses/{district}/) — All 61 Districts
            ============================================================ */}
        {subView === 'district' && activeDistrict && (() => {
          const districtListings = liveListings.filter(
            (l) => l.districtSlug === activeDistrict.slug
          );
          const categoryCounts = categories
            .map((c) => ({
              cat: c,
              count: districtListings.filter((l) => l.categorySlug === c.slug).length,
            }))
            .filter((x) => x.count > 0);

          return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeSubView('directory')}
                      className="hover:text-[#0E5E1F]"
                    >
                      {t(lang, 'వ్యాపారాలు', 'Directory')}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-slate-900 font-medium">
                      {lang === 'te' ? activeDistrict.nameTe : activeDistrict.nameEn}
                    </span>
                  </nav>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {t(
                      lang,
                      `${activeDistrict.nameTe} వ్యాపార కమ్యూనిటీ & డైరెక్టరీ`,
                      `${activeDistrict.nameEn} Business Community & Directory`
                    )}
                  </h1>
                </div>

                {/* Switch between all 61 districts */}
                <select
                  aria-label="Switch district page"
                  value={activeDistrict.slug}
                  onChange={(e) => onOpenDistrict(e.target.value)}
                  className="h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-sm font-medium"
                >
                  <optgroup label="Telangana (33)">
                    {TELANGANA_DISTRICTS.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : d.nameEn}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Andhra Pradesh (28)">
                    {AP_DISTRICTS.map((d) => (
                      <option key={d.slug} value={d.slug}>
                        {lang === 'te' ? `${d.nameTe} (${d.nameEn})` : d.nameEn}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Community Info Banner */}
              <div className="grid md:grid-cols-12 gap-5">
                <div className="md:col-span-7 bg-[#0E5E1F] text-white rounded-xl p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#FDB902]">
                      {activeDistrict.state === 'TS' ? 'Telangana' : 'Andhra Pradesh'} · /businesses/
                      {activeDistrict.slug}/
                    </p>
                    <h2 className="text-xl font-bold">
                      {t(
                        lang,
                        `${activeDistrict.nameTe} వ్యాపార మిత్ర WhatsApp కమ్యూనిటీ`,
                        `${activeDistrict.nameEn} Vyapara Mitra WhatsApp Community`
                      )}
                    </h2>
                    <p className="text-sm text-white/85">
                      {t(
                        lang,
                        `జిల్లా పార్టనర్: ${activeDistrict.partnerName} · ${activeDistrict.ambassadorsCount} ఫౌండింగ్ అంబాసిడర్లు`,
                        `District Partner: ${activeDistrict.partnerName} · ${activeDistrict.ambassadorsCount} Founding Ambassadors`
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={activeDistrict.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-lg bg-[#FDB902] text-[#0A4216] text-sm font-bold hover:bg-amber-400 inline-flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t(lang, 'వాట్సాప్ గ్రూప్‌లో చేరండి', 'Join WhatsApp Community')}
                    </a>
                    <button
                      type="button"
                      onClick={() => onStartAddBusiness(activeDistrict.slug)}
                      className="px-4 py-2.5 rounded-lg bg-white/15 text-white text-sm font-semibold hover:bg-white/25"
                    >
                      + {t(lang, 'మీ వ్యాపారం చేర్చండి', 'Add Business in This District')}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {t(lang, 'మండలాలు (ఫారమ్‌లో కూడా అందుబాటులో)', 'Mandals Covered')}
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {activeDistrict.mandals.join(' · ')}
                  </p>
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    SEO Indexing Status:{' '}
                    <strong className="text-slate-800">
                      {districtListings.length >= 3
                        ? 'Indexed (3+ listings)'
                        : `Noindex until 3 listings (currently ${districtListings.length})`}
                    </strong>
                  </p>
                </div>
              </div>

              {/* "{district} వ్యాపారాలు" Block (Section 7) */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    {t(
                      lang,
                      `${activeDistrict.nameTe} వ్యాపారాలు`,
                      `Businesses in ${activeDistrict.nameEn}`
                    )}
                  </h2>
                  {districtListings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeFilters({ ...filters, district: activeDistrict.slug, town: '' });
                        onChangeSubView('directory');
                      }}
                      className="text-sm font-semibold text-[#0E5E1F] hover:underline"
                    >
                      {t(lang, 'అన్నీ చూడండి →', 'View all →')}
                    </button>
                  )}
                </div>

                {categoryCounts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categoryCounts.map(({ cat, count }) => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          onChangeFilters({
                            ...filters,
                            district: activeDistrict.slug,
                            category: cat.slug,
                          });
                          onChangeSubView('directory');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:border-[#0E5E1F] hover:text-[#0E5E1F]"
                      >
                        {lang === 'te' ? cat.nameTe : cat.nameEn} ({count})
                      </button>
                    ))}
                  </div>
                )}

                {districtListings.length === 0 ? (
                  /* Exact spec empty district prompt (Section 7 page 18) */
                  <div className="bg-[#F6F3E1] border border-amber-300/70 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-base font-bold text-slate-900">
                      {t(
                        lang,
                        `${activeDistrict.nameTe} నుండి మొదటి లిస్టింగ్ మీదే కావచ్చు!`,
                        `The first listing from ${activeDistrict.nameEn} could be yours!`
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => onStartAddBusiness(activeDistrict.slug)}
                      className="px-5 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B]"
                    >
                      + {t(lang, 'మీ వ్యాపారం చేర్చండి', 'Add Your Business')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {districtListings.slice(0, 6).map((b) => renderListingCard(b))}
                  </div>
                )}
              </section>
            </div>
          );
        })()}

        {/* ============================================================
            VIEW 5: ADVERTISE PAGE (/advertise/) — Fixed per Section 14
            ============================================================ */}
        {subView === 'advertise' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <button
              type="button"
              onClick={() => onChangeSubView('directory')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0E5E1F]"
            >
              <ArrowLeft className="w-4 h-4" />
              {t(lang, 'డైరెక్టరీకి తిరిగి', 'Back to Directory')}
            </button>

            <div className="bg-[#0E5E1F] text-white rounded-xl p-7 space-y-3">
              <p className="text-xs font-semibold text-[#FDB902]">/advertise/</p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {t(
                  lang,
                  'వ్యాపార మిత్రలో ప్రకటన ఎంపికలు',
                  'Advertise on Vyapara Mitra'
                )}
              </h1>
              <p className="text-sm text-white/85 max-w-2xl">
                {t(
                  lang,
                  'సాధారణ వ్యాపార లిస్టింగ్ ఎప్పుడూ ఉచితం. మీ జిల్లా లేదా కేటగిరీలో టాప్ స్లాట్ కోసం స్పాన్సర్డ్ ప్రకటనలు ఎంచుకోవచ్చు.',
                  'Business listings are always free and organic rankings are never altered. Verified businesses can book clearly labelled Sponsored Slots or Brand Sponsorships.'
                )}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#0E5E1F]">
                  <Megaphone className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {t(lang, 'జిల్లా / కేటగిరీ స్పాన్సర్డ్ స్లాట్', 'District / Category Sponsored Slot')}
                  </h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t(
                    lang,
                    'వ్యాపార మిత్ర వెరిఫైడ్ బ్యాడ్జ్ ఉన్న వ్యాపారాలకు మాత్రమే. ప్రతి పేజీలో గరిష్టంగా 2 స్పాన్సర్డ్ కార్డులు, ప్రత్యేక ఇంప్రెషన్ & ట్యాప్ రిపోర్టుతో.',
                    'Exclusively for approved Vyapara Mitra Verified businesses. Max 2 clearly labelled sponsored cards per view, with separate impressions and tap reports.'
                  )}
                </p>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li>• Top 2 placement above organic results</li>
                  <li>• Automatic end-date expiry + 7-day renewal reminder</li>
                  <li>• Separate impression &amp; Call/WhatsApp tap report</li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#0E5E1F]">
                  <Store className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {t(lang, 'ఫౌండింగ్ స్పాన్సర్ ప్రోగ్రామ్', 'Founding Brand Sponsors')}
                  </h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t(
                    lang,
                    'హోమ్‌పేజీ బ్యానర్, లిస్టింగ్ పేజీ ప్రకటన స్లాట్ మరియు 61 జిల్లాల వ్యాపార కమ్యూనిటీల్లో బ్రాండ్ ప్రచారం.',
                    'Dedicated brand banner placement on the homepage, listing sidebars, and district community pages across Andhra Pradesh & Telangana.'
                  )}
                </p>
                <a
                  href="https://wa.me/919848012345?text=Hi%2C%20I%20want%20to%20know%20about%20advertising%20on%20Vyapara%20Mitra"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold hover:bg-[#1A5B0B]"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t(lang, 'WhatsApp లో సంప్రదించండి', 'Contact Advertising Desk')}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Public Site Footer with Spec Privacy Promise (Section 12) */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src="/assets/aistudio/Instagram_Profile_1080x1080_3ecef66e.png"
                alt="Vyapara Mitra"
                className="w-6 h-6 rounded-full"
              />
              <span className="font-bold text-sm text-[#0E5E1F]">
                {t(lang, 'వ్యాపార మిత్ర', 'Vyapara Mitra')}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0E5E1F]" />
              {t(
                lang,
                'మీ సమాచారం సురక్షితం. ఎవరితోనూ పంచుకోం.',
                'Your information is safe. We never share or sell member data.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={onOpenPrivacyNotice}
              className="hover:text-[#0E5E1F] underline"
            >
              {t(lang, 'గోప్యతా విధానం (DPDP)', 'Privacy Notice (DPDP)')}
            </button>
            <button
              type="button"
              onClick={() => onChangeSubView('advertise')}
              className="hover:text-[#0E5E1F]"
            >
              {t(lang, 'ప్రకటనలు', 'Advertise')}
            </button>
            <a
              href="https://chat.whatsapp.com/vyaparamitra-community"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0E5E1F]"
            >
              {t(lang, 'WhatsApp కమ్యూనిటీ', 'WhatsApp Community')}
            </a>
            <span className="text-slate-400">© 2026 Vyapara Mitra</span>
          </div>
        </div>
      </footer>

      {/* Report a Problem Modal (Section 9) */}
      {reportModalListingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report a problem"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {t(lang, 'సమస్యను నివేదించండి', 'Report a Problem')}
              </h3>
              <button
                type="button"
                onClick={() => setReportModalListingId(null)}
                aria-label="Close report modal"
                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmittedMsg ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-10 h-10 text-[#0E5E1F] mx-auto" />
                <p className="text-sm font-medium text-slate-800">{reportSubmittedMsg}</p>
                <button
                  type="button"
                  onClick={() => setReportModalListingId(null)}
                  className="px-5 py-2 rounded-lg bg-[#0E5E1F] text-white text-sm font-semibold"
                >
                  {t(lang, 'సరే', 'Done')}
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitReport(reportModalListingId, reportReason, reportNote.trim());
                  setReportNote('');
                  setReportSubmittedMsg(
                    t(
                      lang,
                      'మీ నివేదిక మోడరేషన్ క్యూకు పంపబడింది. ధన్యవాదాలు.',
                      'Report submitted to the Admin Moderation Queue. Thank you.'
                    )
                  );
                }}
                className="p-5 space-y-4"
              >
                <div className="space-y-2">
                  {(Object.keys(REPORT_REASONS) as ReportReasonCode[]).map((code) => (
                    <label
                      key={code}
                      className="flex items-center gap-2.5 text-sm text-slate-800 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        checked={reportReason === code}
                        onChange={() => setReportReason(code)}
                        className="w-4 h-4 accent-[#0E5E1F]"
                      />
                      <span>{lang === 'te' ? REPORT_REASONS[code].te : REPORT_REASONS[code].en}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label htmlFor="report-note" className="block text-xs font-semibold text-slate-700 mb-1">
                    {t(lang, 'అదనపు వివరాలు (ఐచ్ఛికం)', 'Additional note (Optional)')}
                  </label>
                  <textarea
                    id="report-note"
                    rows={3}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder={t(lang, 'సమస్య గురించి క్లుప్తంగా రాయండి...', 'Briefly describe the issue...')}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModalListingId(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
                  >
                    {t(lang, 'రద్దు చేయి', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B]"
                  >
                    {t(lang, 'నివేదిక పంపండి', 'Submit Report')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
