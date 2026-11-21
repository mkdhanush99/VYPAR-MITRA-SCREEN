import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  FolderTree,
  ListChecks,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import {
  BadgeId,
  BusinessListing,
  CategoryItem,
  ExportAuditLog,
  Language,
  ListingReport,
  ListingStatus,
  OwnerAccount,
  RejectionReasonCode,
  SearchLogEntry,
  SponsoredMeta,
} from '../types';
import { AP_DISTRICTS, DISTRICT_MAP, TELANGANA_DISTRICTS } from '../data/districts';
import {
  BADGE_LABELS,
  HELP_WANTED_LABELS,
  REJECTION_REASONS,
  REPORT_REASONS,
  STATUS_LABELS,
  t,
} from '../data/i18n';
import { buildCsvString, findTownMergeGroups } from '../utils/directory';
import { CategoryIcon } from './CategoryIcon';
import { StorefrontVisual } from './StorefrontVisual';

type AdminTab =
  | 'queue'
  | 'listings'
  | 'numbers'
  | 'categories'
  | 'towns'
  | 'sponsored';

type QueueSubTab = 'pending' | 'changes_needed' | 'reported' | 'edited_today';

interface AdminPortalProps {
  lang: Language;
  listings: BusinessListing[];
  accounts: OwnerAccount[];
  categories: CategoryItem[];
  reports: ListingReport[];
  searchLogs: SearchLogEntry[];
  exportLogs: ExportAuditLog[];
  sponsoredEnabled: boolean;
  onApproveListing: (id: string) => void;
  onRequestChanges: (id: string, reason: RejectionReasonCode, note: string) => void;
  onToggleBadge: (id: string, badge: BadgeId) => void;
  onBulkUpdateStatus: (ids: string[], status: ListingStatus) => void;
  onBulkChangeCategory: (ids: string[], categorySlug: string) => void;
  onResolveReports: (listingId: string) => void;
  onUpdateModeratorNotes: (id: string, notes: string) => void;
  onUpdateCategories: (next: CategoryItem[]) => void;
  onMergeTown: (districtSlug: string, sourceTowns: string[], canonicalTown: string) => void;
  onToggleSponsoredFeature: (enabled: boolean) => void;
  onUpdateListingSponsored: (id: string, sponsored: SponsoredMeta | undefined) => void;
  onLogExport: (type: 'listings' | 'members', recordCount: number) => void;
  onViewPublicListing: (slug: string) => void;
}

export function AdminPortal({
  lang,
  listings,
  accounts,
  categories,
  reports,
  searchLogs,
  exportLogs,
  sponsoredEnabled,
  onApproveListing,
  onRequestChanges,
  onToggleBadge,
  onBulkUpdateStatus,
  onBulkChangeCategory,
  onResolveReports,
  onUpdateModeratorNotes,
  onUpdateCategories,
  onMergeTown,
  onToggleSponsoredFeature,
  onUpdateListingSponsored,
  onLogExport,
  onViewPublicListing,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('queue');
  const [queueTab, setQueueTab] = useState<QueueSubTab>('pending');
  const [queueDistrictFilter, setQueueDistrictFilter] = useState('');
  const [queueCategoryFilter, setQueueCategoryFilter] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);

  // Reject / Changes Needed modal
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectionReasonCode>('photo_missing');
  const [rejectNote, setRejectNote] = useState('');

  // Inspect Drawer
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // All Listings filters & bulk selection
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatus, setTableStatus] = useState<string>('');
  const [tableDistrict, setTableDistrict] = useState('');
  const [tableCategory, setTableCategory] = useState('');
  const [tableAddedBy, setTableAddedBy] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCatSlug, setBulkCatSlug] = useState(categories[0]?.slug || 'kirana-supermarket');

  // Category manager add form
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatTe, setNewCatTe] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');

  // Sponsored slot assignment form
  const [spListingId, setSpListingId] = useState('');
  const [spScope, setSpScope] = useState<'district' | 'category' | 'both'>('both');
  const [spStart, setSpStart] = useState('2026-11-20');
  const [spEnd, setSpEnd] = useState('2026-12-31');
  const [spSlotOrder, setSpSlotOrder] = useState<1 | 2>(1);
  const [spPaymentRef, setSpPaymentRef] = useState('');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  const openReportsByListing = useMemo(() => {
    const map = new Map<string, ListingReport[]>();
    reports
      .filter((r) => !r.resolved)
      .forEach((r) => {
        const arr = map.get(r.listingId) ?? [];
        arr.push(r);
        map.set(r.listingId, arr);
      });
    return map;
  }, [reports]);

  // Queue buckets
  const pendingListings = useMemo(
    () => listings.filter((l) => l.status === 'pending'),
    [listings]
  );
  const changesNeededListings = useMemo(
    () => listings.filter((l) => l.status === 'changes_needed'),
    [listings]
  );
  const reportedListings = useMemo(
    () => listings.filter((l) => openReportsByListing.has(l.id)),
    [listings, openReportsByListing]
  );
  const editedTodayListings = useMemo(
    () => listings.filter((l) => l.editedToday && l.status === 'live'),
    [listings]
  );

  const currentQueueItems = useMemo(() => {
    const base =
      queueTab === 'pending'
        ? pendingListings
        : queueTab === 'changes_needed'
        ? changesNeededListings
        : queueTab === 'reported'
        ? reportedListings
        : editedTodayListings;

    return base.filter((item) => {
      if (queueDistrictFilter && item.districtSlug !== queueDistrictFilter) return false;
      if (queueCategoryFilter && item.categorySlug !== queueCategoryFilter) return false;
      return true;
    });
  }, [
    queueTab,
    pendingListings,
    changesNeededListings,
    reportedListings,
    editedTodayListings,
    queueDistrictFilter,
    queueCategoryFilter,
  ]);

  const tableFilteredListings = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return listings.filter((item) => {
      if (tableStatus && item.status !== tableStatus) return false;
      if (tableDistrict && item.districtSlug !== tableDistrict) return false;
      if (tableCategory && item.categorySlug !== tableCategory) return false;
      if (tableAddedBy && item.addedBy !== tableAddedBy) return false;
      if (
        q &&
        !item.nameEn.toLowerCase().includes(q) &&
        !item.nameTe.toLowerCase().includes(q) &&
        !item.town.toLowerCase().includes(q) &&
        !item.phone.includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [listings, tableSearch, tableStatus, tableDistrict, tableCategory, tableAddedBy]);

  const townGroups = useMemo(() => findTownMergeGroups(listings), [listings]);

  const eligibleForSponsored = useMemo(
    () => listings.filter((l) => l.status === 'live' && l.badges.includes('vm_verified')),
    [listings]
  );

  const inspectedListing = useMemo(
    () => listings.find((l) => l.id === inspectId) ?? null,
    [listings, inspectId]
  );

  // Analytics derivations for Numbers Dashboard
  const statsSummary = useMemo(() => {
    const liveCount = listings.filter((l) => l.status === 'live').length;
    const totalCalls = listings.reduce((acc, l) => acc + l.stats.calls, 0);
    const totalWa = listings.reduce((acc, l) => acc + l.stats.whatsappTaps, 0);
    const totalViews = listings.reduce((acc, l) => acc + l.stats.views, 0);

    const byDistrict = new Map<string, { signups: number; live: number; pending: number }>();
    accounts.forEach((a) => {
      const entry = byDistrict.get(a.districtSlug) ?? { signups: 0, live: 0, pending: 0 };
      entry.signups += 1;
      byDistrict.set(a.districtSlug, entry);
    });
    listings.forEach((l) => {
      const entry = byDistrict.get(l.districtSlug) ?? { signups: 0, live: 0, pending: 0 };
      if (l.status === 'live') entry.live += 1;
      if (l.status === 'pending') entry.pending += 1;
      byDistrict.set(l.districtSlug, entry);
    });

    const districtRows = Array.from(byDistrict.entries())
      .map(([slug, data]) => ({
        slug,
        name: DISTRICT_MAP.get(slug)?.nameEn ?? slug,
        ...data,
      }))
      .sort((a, b) => b.live + b.signups - (a.live + a.signups));

    const topByEngagement = [...listings]
      .filter((l) => l.status === 'live')
      .sort(
        (a, b) =>
          b.stats.calls + b.stats.whatsappTaps - (a.stats.calls + a.stats.whatsappTaps)
      )
      .slice(0, 6);

    const zeroResultSearches = [...searchLogs]
      .filter((s) => s.resultCount === 0)
      .sort((a, b) => b.count - a.count);

    const utmMap = new Map<string, number>();
    accounts.forEach((a) => {
      const key = a.utmSource || 'direct';
      utmMap.set(key, (utmMap.get(key) ?? 0) + 1);
    });
    const utmRows = Array.from(utmMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const ambMap = new Map<string, number>();
    listings.forEach((l) => {
      if (l.ambassadorCode) {
        ambMap.set(l.ambassadorCode, (ambMap.get(l.ambassadorCode) ?? 0) + 1);
      }
    });
    const ambassadorRows = Array.from(ambMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    return {
      liveCount,
      totalCalls,
      totalWa,
      totalViews,
      districtRows,
      topByEngagement,
      zeroResultSearches,
      utmRows,
      ambassadorRows,
    };
  }, [listings, accounts, searchLogs]);

  const triggerDownloadCsv = (type: 'listings' | 'members') => {
    let csv = '';
    let count = 0;

    if (type === 'listings') {
      const headers = [
        'ID',
        'Business Name',
        'Telugu Name',
        'Category',
        'District',
        'Town',
        'Phone',
        'Status',
        'Badges',
        'Help Wanted',
        'UTM Source',
        'Ambassador Code',
      ];
      const rows = listings.map((l) => [
        l.id,
        l.nameEn,
        l.nameTe,
        catMap.get(l.categorySlug)?.nameEn ?? l.categorySlug,
        DISTRICT_MAP.get(l.districtSlug)?.nameEn ?? l.districtSlug,
        l.town,
        l.phone,
        l.status,
        l.badges.join('|'),
        l.helpWanted.join('|'),
        l.utmSource ?? '',
        l.ambassadorCode ?? '',
      ]);
      csv = buildCsvString(headers, rows);
      count = rows.length;
    } else {
      const headers = [
        'Account ID',
        'Name',
        'Mobile',
        'District',
        'Email',
        'WhatsApp Updates',
        'UTM Source',
        'Ambassador Code',
        'Consent Version',
      ];
      const rows = accounts.map((a) => [
        a.id,
        a.name,
        a.mobile,
        DISTRICT_MAP.get(a.districtSlug)?.nameEn ?? a.districtSlug,
        a.email ?? '',
        a.whatsappUpdates ? 'Yes' : 'No',
        a.utmSource ?? '',
        a.ambassadorCode ?? '',
        a.privacyConsentVersion,
      ]);
      csv = buildCsvString(headers, rows);
      count = rows.length;
    }

    onLogExport(type, count);
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vyapara-mitra-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Headless fallback
    }
  };

  const moveCategory = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= categories.length) return;
    const copy = [...categories];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    onUpdateCategories(copy.map((c, i) => ({ ...c, order: i + 1 })));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatEn.trim() || !newCatTe.trim()) return;
    const slug = newCatEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const nextItem: CategoryItem = {
      id: `cat-${Date.now()}`,
      slug,
      nameEn: newCatEn.trim(),
      nameTe: newCatTe.trim(),
      subCategories: newCatSubs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      icon: 'Grid2x2',
      status: 'New',
      order: categories.length + 1,
    };
    onUpdateCategories([...categories, nextItem]);
    setNewCatEn('');
    setNewCatTe('');
    setNewCatSubs('');
  };

  const handleSaveSponsored = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spListingId) return;
    const existing = listings.find((l) => l.id === spListingId)?.sponsored;
    onUpdateListingSponsored(spListingId, {
      isSponsored: true,
      scope: spScope,
      startDate: spStart,
      endDate: spEnd,
      slotOrder: spSlotOrder,
      paymentRef: spPaymentRef.trim() || `VM-SP-${Date.now().toString().slice(-4)}`,
      impressions: existing?.impressions ?? 0,
      taps: existing?.taps ?? 0,
    });
    setSpListingId('');
    setSpPaymentRef('');
  };

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'queue',
      label: t(lang, 'మోడరేషన్ క్యూ', 'Moderation Queue'),
      icon: <ClipboardCheck className="w-4 h-4" />,
      badge: pendingListings.length + reportedListings.length,
    },
    {
      id: 'listings',
      label: t(lang, 'అన్ని వ్యాపారాలు & CSV', 'Listings & Data'),
      icon: <ListChecks className="w-4 h-4" />,
    },
    {
      id: 'numbers',
      label: t(lang, 'గణాంకాలు (Numbers)', 'Numbers Dashboard'),
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'categories',
      label: t(lang, 'కేటగిరీ మేనేజర్ (22)', 'Category Manager'),
      icon: <FolderTree className="w-4 h-4" />,
    },
    {
      id: 'towns',
      label: t(lang, 'టౌన్ క్లీన్-అప్', 'Town Clean-up'),
      icon: <Wrench className="w-4 h-4" />,
      badge: townGroups.length || undefined,
    },
    {
      id: 'sponsored',
      label: t(lang, 'స్పాన్సర్డ్ స్లాట్లు', 'Sponsored Slots'),
      icon: <Megaphone className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-44px)] flex flex-col lg:flex-row bg-[#F8FAF8]">
      {/* Left Admin Sidebar (240px on desktop per 3_saas_dashboard.md) */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2.5">
          <img
            src="/assets/aistudio/Instagram_Profile_1080x1080_3ecef66e.png"
            alt="Vyapara Mitra"
            className="w-8 h-8 rounded-full"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0E5E1F] truncate">Vyapara Mitra</p>
            <p className="text-[11px] text-slate-500 truncate">wp-admin · Moderation</p>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-[#0E5E1F] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`font-mono-num text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    activeTab === item.id
                      ? 'bg-[#FDB902] text-[#0A4216]'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="hidden lg:block p-4 mt-4 mx-3 rounded-lg bg-[#F6F3E1] border border-amber-200/70 space-y-1 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Role: Admin / Moderator</p>
          <p className="text-[11px]">
            Owner accounts (<code>vm_business_owner</code>) are redirected away from wp-admin to{' '}
            <code>/my-business/</code>.
          </p>
        </div>
      </aside>

      {/* Main Admin Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Admin Top Bar */}
        <header className="bg-white border-b border-slate-200 px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">
              Vyapara Mitra / {navItems.find((n) => n.id === activeTab)?.label}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => triggerDownloadCsv('listings')}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#0E5E1F]" />
              <span>Export Listings CSV</span>
            </button>
            <button
              type="button"
              onClick={() => triggerDownloadCsv('members')}
              className="px-3.5 py-2 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Members CSV</span>
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-7 space-y-6 flex-1">
          {/* ============================================================
              TAB 1: MODERATION QUEUE (Pending, Changes needed, Reported, Edited today)
              ============================================================ */}
          {activeTab === 'queue' && (
            <div className="space-y-5">
              {/* Sub-tabs & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                  {[
                    { id: 'pending', label: `Pending (${pendingListings.length})` },
                    { id: 'changes_needed', label: `Changes needed (${changesNeededListings.length})` },
                    { id: 'reported', label: `Reported (${reportedListings.length})` },
                    { id: 'edited_today', label: `Edited today (${editedTodayListings.length})` },
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setQueueTab(tb.id as QueueSubTab)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap font-mono-num ${
                        queueTab === tb.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter queue by district"
                    value={queueDistrictFilter}
                    onChange={(e) => setQueueDistrictFilter(e.target.value)}
                    className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  >
                    <option value="">All Districts</option>
                    <optgroup label="Telangana">
                      {TELANGANA_DISTRICTS.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {d.nameEn}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Andhra Pradesh">
                      {AP_DISTRICTS.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {d.nameEn}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <select
                    aria-label="Filter queue by category"
                    value={queueCategoryFilter}
                    onChange={(e) => setQueueCategoryFilter(e.target.value)}
                    className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.nameEn}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowChecklist((s) => !s)}
                    className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {showChecklist ? 'Hide 2-Min Checklist' : '2-Min Moderator Checklist'}
                  </button>
                </div>
              </div>

              {/* Moderator 2-Minute Checklist (Section 9, page 20) */}
              {showChecklist && (
                <div className="bg-[#F6F3E1] border border-amber-300/70 rounded-xl p-5 grid md:grid-cols-2 gap-4 text-xs text-slate-800">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">
                      Moderator 2-Minute Checklist
                    </h3>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Real business: photo shows shop, products or work, and matches name.</li>
                      <li>Right category &amp; district; town spelling matches approved towns.</li>
                      <li>Readable description with no phone numbers, links, or all-caps ads.</li>
                      <li>Not a duplicate (same phone or same name in same town).</li>
                      <li>Allowed business type.</li>
                      <li>For Vyapara Mitra Verified badge only: quick call to listed number.</li>
                    </ol>
                  </div>
                  <div>
                    <h3 className="font-bold text-red-900 mb-2">Not Allowed Business Types</h3>
                    <p className="leading-relaxed text-slate-700">
                      Anything illegal; adult services; betting, lottery or gambling; unregistered
                      chit funds, money-doubling or MLM schemes; weapons; medicines sold without a
                      licence; pages that only advertise another website.
                    </p>
                  </div>
                </div>
              )}

              {/* Queue Rows */}
              {currentQueueItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#0E5E1F] mx-auto" />
                  <p className="text-sm font-bold text-slate-900">Queue clear for this tab</p>
                  <p className="text-xs text-slate-500">
                    All submissions matching your current filters have been handled.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentQueueItems.map((biz) => {
                    const cat = catMap.get(biz.categorySlug);
                    const dist = DISTRICT_MAP.get(biz.districtSlug);
                    const itemReports = openReportsByListing.get(biz.id) ?? [];

                    return (
                      <div
                        key={biz.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                      >
                        <StorefrontVisual
                          photo={biz.mainPhoto}
                          name={biz.nameEn}
                          town={biz.town}
                          categoryIcon={cat?.icon}
                          compact
                          className="w-20 h-20 rounded-lg border border-slate-200 shrink-0"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              {biz.nameEn}
                            </h3>
                            {biz.nameTe && (
                              <span className="text-xs text-slate-600">({biz.nameTe})</span>
                            )}
                            {biz.duplicateFlag && (
                              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                Possible duplicate
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600">
                            {cat?.nameEn} · {biz.town}, {dist?.nameEn ?? biz.districtSlug} ·{' '}
                            <span className="font-mono-num">+91 {biz.phone}</span> · Submitted{' '}
                            <span className="font-mono-num">
                              {new Date(biz.updatedAt).toLocaleDateString()}
                            </span>
                          </p>

                          <p className="text-xs text-slate-500 line-clamp-1">{biz.about}</p>

                          {/* Show moderator rejection reason on Changes Needed tab */}
                          {biz.status === 'changes_needed' && biz.rejectionReason && (
                            <p className="text-xs text-amber-800 font-medium pt-1">
                              Reason: {REJECTION_REASONS[biz.rejectionReason].en}
                              {biz.rejectionNote ? ` — ${biz.rejectionNote}` : ''}
                            </p>
                          )}

                          {/* Show reporter details on Reported tab */}
                          {itemReports.length > 0 && (
                            <div className="mt-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                              <p className="font-semibold flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {itemReports.length} open report(s):{' '}
                                {itemReports
                                  .map((r) => REPORT_REASONS[r.reason].en)
                                  .join(', ')}
                              </p>
                              {itemReports[0]?.note && (
                                <p className="text-red-800">Note: “{itemReports[0].note}”</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* One-Click Moderator Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {biz.status !== 'live' && (
                            <button
                              type="button"
                              onClick={() => onApproveListing(biz.id)}
                              className="px-3.5 py-2 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B] inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setRejectTargetId(biz.id);
                              setRejectReason(biz.rejectionReason ?? 'photo_missing');
                              setRejectNote(biz.rejectionNote ?? '');
                            }}
                            className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100"
                          >
                            Changes needed
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleBadge(biz.id, 'vm_verified')}
                            className={`px-3 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${
                              biz.badges.includes('vm_verified')
                                ? 'border-[#0E5E1F] bg-[#0E5E1F]/10 text-[#0E5E1F]'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            {biz.badges.includes('vm_verified') ? 'Verified' : 'Verify'}
                          </button>

                          {itemReports.length > 0 && (
                            <button
                              type="button"
                              onClick={() => onResolveReports(biz.id)}
                              className="px-3 py-2 rounded-lg border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-50"
                            >
                              Resolve Report
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setInspectId(biz.id);
                              setNoteDraft(biz.moderatorNotes ?? '');
                            }}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB 2: ALL LISTINGS & DATA (Filters, Bulk Actions, Audit Log)
              ============================================================ */}
          {activeTab === 'listings' && (
            <div className="space-y-5">
              {/* Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search name, town, or phone..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <select
                  aria-label="Filter by status"
                  value={tableStatus}
                  onChange={(e) => setTableStatus(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="">All Statuses</option>
                  {(Object.keys(STATUS_LABELS) as ListingStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st].en}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter table by district"
                  value={tableDistrict}
                  onChange={(e) => setTableDistrict(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="">All Districts</option>
                  {[...TELANGANA_DISTRICTS, ...AP_DISTRICTS].map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.nameEn}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter table by category"
                  value={tableCategory}
                  onChange={(e) => setTableCategory(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by added by"
                  value={tableAddedBy}
                  onChange={(e) => setTableAddedBy(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="">Added By: Any</option>
                  <option value="owner">Owner</option>
                  <option value="ambassador">Ambassador</option>
                  <option value="team">Team</option>
                </select>
              </div>

              {/* Bulk Actions Bar */}
              {selectedIds.length > 0 && (
                <div className="bg-[#0E5E1F] text-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold font-mono-num">
                    {selectedIds.length} listing(s) selected
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onBulkUpdateStatus(selectedIds, 'live');
                        setSelectedIds([]);
                      }}
                      className="px-3 py-1.5 rounded-md bg-[#FDB902] text-[#0A4216] font-bold hover:bg-amber-400"
                    >
                      Bulk Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onBulkUpdateStatus(selectedIds, 'hidden');
                        setSelectedIds([]);
                      }}
                      className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 font-semibold"
                    >
                      Bulk Hide
                    </button>
                    <select
                      aria-label="Bulk target category"
                      value={bulkCatSlug}
                      onChange={(e) => setBulkCatSlug(e.target.value)}
                      className="h-8 px-2 rounded-md bg-white text-slate-900 text-xs"
                    >
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nameEn}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onBulkChangeCategory(selectedIds, bulkCatSlug);
                        setSelectedIds([]);
                      }}
                      className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 font-semibold"
                    >
                      Change Category
                    </button>
                  </div>
                </div>
              )}

              {/* High-Density Data Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          aria-label="Select all filtered listings"
                          checked={
                            tableFilteredListings.length > 0 &&
                            selectedIds.length === tableFilteredListings.length
                          }
                          onChange={(e) =>
                            setSelectedIds(
                              e.target.checked ? tableFilteredListings.map((l) => l.id) : []
                            )
                          }
                          className="accent-[#0E5E1F]"
                        />
                      </th>
                      <th className="py-3 px-3 font-semibold">Business</th>
                      <th className="py-3 px-3 font-semibold">Category</th>
                      <th className="py-3 px-3 font-semibold">District / Town</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">Badges</th>
                      <th className="py-3 px-3 font-semibold text-right">Calls + WA</th>
                      <th className="py-3 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableFilteredListings.map((biz) => {
                      const checked = selectedIds.includes(biz.id);
                      return (
                        <tr key={biz.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${biz.nameEn}`}
                              checked={checked}
                              onChange={() =>
                                setSelectedIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== biz.id)
                                    : [...prev, biz.id]
                                )
                              }
                              className="accent-[#0E5E1F]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-900">{biz.nameEn}</p>
                            <p className="text-[11px] text-slate-500 font-mono-num">+91 {biz.phone}</p>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {catMap.get(biz.categorySlug)?.nameEn ?? biz.categorySlug}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {biz.town}, {DISTRICT_MAP.get(biz.districtSlug)?.nameEn}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {STATUS_LABELS[biz.status].en}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            {biz.badges.map((b) => BADGE_LABELS[b].en).join(', ') || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                            {biz.stats.calls + biz.stats.whatsappTaps}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-2">
                            {biz.status === 'live' && (
                              <button
                                type="button"
                                onClick={() => onViewPublicListing(biz.slug)}
                                className="text-[#0E5E1F] font-semibold hover:underline"
                              >
                                View
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setInspectId(biz.id);
                                setNoteDraft(biz.moderatorNotes ?? '');
                              }}
                              className="text-slate-600 font-medium hover:underline"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Logged Admin CSV Exports (Section 12 & 13) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Admin Export Audit Log (DPDP Compliance)
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {exportLogs.map((log) => (
                    <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        Exported <strong>{log.type}</strong> ({log.recordCount} records) by{' '}
                        {log.exportedBy}
                      </span>
                      <span className="font-mono-num text-slate-500">
                        {new Date(log.exportedAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 3: NUMBERS DASHBOARD (Section 13)
              ============================================================ */}
          {activeTab === 'numbers' && (
            <div className="space-y-6">
              {/* Top KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Sign-ups', value: accounts.length },
                  { label: 'Live Approved Listings', value: statsSummary.liveCount },
                  { label: 'Pending Review Queue', value: pendingListings.length },
                  { label: 'Median Approval Time', value: '3.4 hrs' },
                  {
                    label: 'Calls + WhatsApp (30d)',
                    value: statsSummary.totalCalls + statsSummary.totalWa,
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-white border border-slate-200 rounded-xl p-4 space-y-1"
                  >
                    <p className="text-xs text-slate-500">{kpi.label}</p>
                    <p className="text-2xl font-bold text-slate-900 font-mono-num">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Top Listings by Calls & WhatsApp Taps */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    Top Listings by Calls &amp; WhatsApp Taps
                  </h2>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-left">
                        <th className="py-2 font-semibold">Business</th>
                        <th className="py-2 font-semibold text-right">Views</th>
                        <th className="py-2 font-semibold text-right">Calls</th>
                        <th className="py-2 font-semibold text-right">WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statsSummary.topByEngagement.map((biz) => (
                        <tr key={biz.id}>
                          <td className="py-2.5 pr-2">
                            <p className="font-semibold text-slate-900">{biz.nameEn}</p>
                            <p className="text-[11px] text-slate-500">
                              {DISTRICT_MAP.get(biz.districtSlug)?.nameEn}
                            </p>
                          </td>
                          <td className="py-2.5 text-right font-mono-num">{biz.stats.views}</td>
                          <td className="py-2.5 text-right font-mono-num font-semibold text-[#0E5E1F]">
                            {biz.stats.calls}
                          </td>
                          <td className="py-2.5 text-right font-mono-num font-semibold text-[#0E5E1F]">
                            {biz.stats.whatsappTaps}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Zero-Result Search Terms */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Search Terms Returning Zero Results
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Shows missing categories or Telugu/English synonyms needed.
                    </p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-left">
                        <th className="py-2 font-semibold">Search Term</th>
                        <th className="py-2 font-semibold text-right">Searches</th>
                        <th className="py-2 font-semibold text-right">Results</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statsSummary.zeroResultSearches.map((s) => (
                        <tr key={s.term}>
                          <td className="py-2.5 font-medium text-slate-900">{s.term}</td>
                          <td className="py-2.5 text-right font-mono-num font-semibold">
                            {s.count}
                          </td>
                          <td className="py-2.5 text-right font-mono-num text-red-700">0</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-ups & Listings per District */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">
                    Sign-ups &amp; Listings by District
                  </h2>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-left">
                        <th className="py-2 font-semibold">District</th>
                        <th className="py-2 font-semibold text-right">Members</th>
                        <th className="py-2 font-semibold text-right">Live</th>
                        <th className="py-2 font-semibold text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statsSummary.districtRows.map((d) => (
                        <tr key={d.slug}>
                          <td className="py-2 font-medium text-slate-900">{d.name}</td>
                          <td className="py-2 text-right font-mono-num">{d.signups}</td>
                          <td className="py-2 text-right font-mono-num text-[#0E5E1F] font-semibold">
                            {d.live}
                          </td>
                          <td className="py-2 text-right font-mono-num text-amber-700">
                            {d.pending}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* UTM Source & Ambassador Attribution */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Acquisition by UTM Source &amp; Ambassador Code
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500">UTM Source (Sign-ups)</p>
                      {statsSummary.utmRows.map((u) => (
                        <div key={u.source} className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="font-mono-num text-slate-800">{u.source}</span>
                          <span className="font-mono-num font-bold text-slate-900">{u.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-500">Ambassador Codes (?ref=)</p>
                      {statsSummary.ambassadorRows.map((a) => (
                        <div key={a.code} className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="font-mono-num text-[#0E5E1F] font-semibold">{a.code}</span>
                          <span className="font-mono-num font-bold text-slate-900">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB 4: CATEGORY MANAGER (All 22 Categories + Reorder + Add)
              ============================================================ */}
          {activeTab === 'categories' && (
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="py-3 px-3 font-semibold">#</th>
                      <th className="py-3 px-3 font-semibold">Category (Telugu / English)</th>
                      <th className="py-3 px-3 font-semibold">Slug</th>
                      <th className="py-3 px-3 font-semibold text-right">Listings</th>
                      <th className="py-3 px-3 font-semibold text-right">Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat, idx) => {
                      const count = listings.filter((l) => l.categorySlug === cat.slug).length;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono-num text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded bg-[#F6F3E1] text-[#0E5E1F] flex items-center justify-center shrink-0">
                                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <p className="font-semibold text-slate-900">{cat.nameTe}</p>
                                <p className="text-[11px] text-slate-500">{cat.nameEn}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono-num text-[11px] text-slate-500">
                            {cat.slug}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold">
                            {count}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              aria-label={`Move ${cat.nameEn} up`}
                              disabled={idx === 0}
                              onClick={() => moveCategory(idx, -1)}
                              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${cat.nameEn} down`}
                              disabled={idx === categories.length - 1}
                              onClick={() => moveCategory(idx, 1)}
                              className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleAddCategory}
                className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900">Add New Category</h2>
                <p className="text-xs text-slate-500">
                  Spec rule: Review &ldquo;Others&rdquo; monthly. When 10+ listings share a type, add
                  a category here without changing existing live slugs.
                </p>
                <div>
                  <label htmlFor="cat-en" className="block text-xs font-semibold text-slate-700 mb-1">
                    English Name *
                  </label>
                  <input
                    id="cat-en"
                    type="text"
                    value={newCatEn}
                    onChange={(e) => setNewCatEn(e.target.value)}
                    placeholder="e.g., Pet Care & Supplies"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="cat-te" className="block text-xs font-semibold text-slate-700 mb-1">
                    Telugu Name *
                  </label>
                  <input
                    id="cat-te"
                    type="text"
                    value={newCatTe}
                    onChange={(e) => setNewCatTe(e.target.value)}
                    placeholder="ఉదా: పెట్ కేర్"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="cat-subs" className="block text-xs font-semibold text-slate-700 mb-1">
                    Sub-categories (comma separated)
                  </label>
                  <input
                    id="cat-subs"
                    type="text"
                    value={newCatSubs}
                    onChange={(e) => setNewCatSubs(e.target.value)}
                    placeholder="Pet shops, Grooming, Clinics"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B] inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </form>
            </div>
          )}

          {/* ============================================================
              TAB 5: TOWN CLEAN-UP (Merge spellings like Dharmapuri / dharmapuri / Darmapuri)
              ============================================================ */}
          {activeTab === 'towns' && (
            <div className="space-y-5 max-w-4xl">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                <h2 className="text-base font-bold text-slate-900">
                  Town Spelling Clean-up Utility
                </h2>
                <p className="text-xs text-slate-600">
                  Automatically detects case and transliteration duplicates within the same district
                  (such as &ldquo;Dharmapuri&rdquo;, &ldquo;dharmapuri&rdquo;, and
                  &ldquo;Darmapuri&rdquo;) so district filters stay clean.
                </p>
              </div>

              {townGroups.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#0E5E1F] mx-auto" />
                  <p className="text-sm font-bold text-slate-900">All town spellings are clean!</p>
                  <p className="text-xs text-slate-500">
                    No duplicate or misspelled town names detected across 61 districts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {townGroups.map((grp) => {
                    const dist = DISTRICT_MAP.get(grp.districtSlug);
                    const sources = grp.variants
                      .map((v) => v.name)
                      .filter((n) => n !== grp.suggestedCanonical);
                    return (
                      <div
                        key={`${grp.districtSlug}-${grp.suggestedCanonical}`}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-[#0E5E1F] inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {dist?.nameEn ?? grp.districtSlug} District
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            Merge into canonical spelling:{' '}
                            <span className="text-[#0E5E1F]">{grp.suggestedCanonical}</span>
                          </p>
                          <p className="text-xs text-slate-600 font-mono-num">
                            Found variants:{' '}
                            {grp.variants.map((v) => `"${v.name}" (${v.count})`).join(' · ')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onMergeTown(grp.districtSlug, sources, grp.suggestedCanonical)
                          }
                          className="px-4 py-2.5 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B] whitespace-nowrap"
                        >
                          Merge into &ldquo;{grp.suggestedCanonical}&rdquo;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB 6: SPONSORED LISTINGS MANAGER (Section 14)
              ============================================================ */}
          {activeTab === 'sponsored' && (
            <div className="space-y-6">
              {/* Feature Master Switch */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Sponsored Listings Feature Switch (Section 14)
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Max 2 clearly labelled &ldquo;స్పాన్సర్డ్ · Sponsored&rdquo; cards above organic
                    results. Only approved <strong>Vyapara Mitra Verified</strong> listings are
                    eligible. Organic results are never reordered.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sponsoredEnabled}
                  onClick={() => onToggleSponsoredFeature(!sponsoredEnabled)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    sponsoredEnabled
                      ? 'bg-[#0E5E1F] text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {sponsoredEnabled ? 'Sponsored Display: ON' : 'Sponsored Display: OFF'}
                </button>
              </div>

              <div className="grid lg:grid-cols-12 gap-6 items-start">
                {/* Active Sponsored Slots Table */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-3 px-3 font-semibold">Listing</th>
                        <th className="py-3 px-3 font-semibold">Scope &amp; Slot</th>
                        <th className="py-3 px-3 font-semibold">Dates</th>
                        <th className="py-3 px-3 font-semibold text-right">Imp / Taps</th>
                        <th className="py-3 px-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {listings
                        .filter((l) => l.sponsored?.isSponsored)
                        .map((biz) => (
                          <tr key={biz.id}>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-slate-900">{biz.nameEn}</p>
                              <p className="text-[11px] text-slate-500 font-mono-num">
                                Ref: {biz.sponsored?.paymentRef}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <span className="capitalize font-medium text-slate-800">
                                {biz.sponsored?.scope}
                              </span>{' '}
                              · Slot #{biz.sponsored?.slotOrder}
                            </td>
                            <td className="py-3 px-3 font-mono-num text-[11px] text-slate-600">
                              {biz.sponsored?.startDate} → {biz.sponsored?.endDate}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-num font-semibold">
                              {biz.sponsored?.impressions} / {biz.sponsored?.taps}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onUpdateListingSponsored(biz.id, undefined)}
                                className="text-red-700 font-semibold hover:underline"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Assign Sponsored Slot Form */}
                <form
                  onSubmit={handleSaveSponsored}
                  className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0E5E1F]" />
                    Assign Sponsored Slot
                  </h3>
                  <div>
                    <label htmlFor="sp-biz" className="block text-xs font-semibold text-slate-700 mb-1">
                      Verified Live Listing *
                    </label>
                    <select
                      id="sp-biz"
                      value={spListingId}
                      onChange={(e) => setSpListingId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs"
                    >
                      <option value="">Select eligible verified listing...</option>
                      {eligibleForSponsored.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nameEn} ({DISTRICT_MAP.get(b.districtSlug)?.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="sp-scope" className="block text-xs font-semibold text-slate-700 mb-1">
                        Scope
                      </label>
                      <select
                        id="sp-scope"
                        value={spScope}
                        onChange={(e) =>
                          setSpScope(e.target.value as 'district' | 'category' | 'both')
                        }
                        className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                      >
                        <option value="both">District &amp; Category</option>
                        <option value="district">District only</option>
                        <option value="category">Category only</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="sp-order" className="block text-xs font-semibold text-slate-700 mb-1">
                        Slot Order
                      </label>
                      <select
                        id="sp-order"
                        value={spSlotOrder}
                        onChange={(e) => setSpSlotOrder(Number(e.target.value) as 1 | 2)}
                        className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs"
                      >
                        <option value={1}>Slot #1 (Top)</option>
                        <option value={2}>Slot #2</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="sp-start" className="block text-xs font-semibold text-slate-700 mb-1">
                        Start Date
                      </label>
                      <input
                        id="sp-start"
                        type="date"
                        value={spStart}
                        onChange={(e) => setSpStart(e.target.value)}
                        className="w-full h-10 px-2.5 rounded-lg border border-slate-300 text-xs font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="sp-end" className="block text-xs font-semibold text-slate-700 mb-1">
                        End Date
                      </label>
                      <input
                        id="sp-end"
                        type="date"
                        value={spEnd}
                        onChange={(e) => setSpEnd(e.target.value)}
                        className="w-full h-10 px-2.5 rounded-lg border border-slate-300 text-xs font-mono-num"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sp-ref" className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      id="sp-ref"
                      type="text"
                      value={spPaymentRef}
                      onChange={(e) => setSpPaymentRef(e.target.value)}
                      placeholder="VM-SP-2026-003"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono-num"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!spListingId}
                    className="w-full h-10 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B] disabled:opacity-40"
                  >
                    Save Sponsored Slot
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Changes Needed Modal (7 exact bilingual reasons from Section 9) */}
      {rejectTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Request changes from owner"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Mark &ldquo;Changes Needed&rdquo; (Sent to Owner)
              </h3>
              <button
                type="button"
                onClick={() => setRejectTargetId(null)}
                aria-label="Close changes needed modal"
                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onRequestChanges(rejectTargetId, rejectReason, rejectNote.trim());
                setRejectTargetId(null);
                setRejectNote('');
              }}
              className="p-5 space-y-4"
            >
              <div className="space-y-2">
                {(Object.keys(REJECTION_REASONS) as RejectionReasonCode[]).map((code) => (
                  <label
                    key={code}
                    className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      checked={rejectReason === code}
                      onChange={() => setRejectReason(code)}
                      className="w-4 h-4 mt-0.5 accent-[#0E5E1F]"
                    />
                    <span>
                      <strong className="block">{REJECTION_REASONS[code].en}</strong>
                      <span className="text-slate-500">{REJECTION_REASONS[code].te}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label htmlFor="rej-note" className="block text-xs font-semibold text-slate-700 mb-1">
                  Note for owner (shown on Owner Dashboard)
                </label>
                <textarea
                  id="rej-note"
                  rows={2}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Optional guidance to help owner fix quickly..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTargetId(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
                >
                  Send Changes Needed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Listing Slide-Over Drawer (Shows Private Team-Only Fields & Badges) */}
      {inspectedListing && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-label="Inspect listing details"
        >
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono-num text-slate-500">{inspectedListing.id}</p>
                <h3 className="text-base font-bold text-slate-900">{inspectedListing.nameEn}</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectId(null)}
                aria-label="Close inspector"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs">
              <StorefrontVisual
                photo={inspectedListing.mainPhoto}
                name={inspectedListing.nameEn}
                town={inspectedListing.town}
                className="w-full h-40 rounded-lg border border-slate-200"
              />

              <div className="space-y-1.5">
                <p className="font-bold text-slate-900">Description</p>
                <p className="text-slate-700 leading-relaxed">{inspectedListing.about}</p>
              </div>

              {/* Badges Toggle Panel */}
              <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900">Verification Badges</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'vm_verified',
                      'phone_verified',
                      'gst_registered',
                      'udyam_registered',
                    ] as BadgeId[]
                  ).map((b) => {
                    const active = inspectedListing.badges.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => onToggleBadge(inspectedListing.id, b)}
                        className={`px-2.5 py-1.5 rounded-md border font-semibold transition-colors ${
                          active
                            ? 'bg-[#0E5E1F] text-white border-[#0E5E1F]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-[#0E5E1F]'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {BADGE_LABELS[b].en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Private / Team-Only Fields */}
              <div className="p-3.5 rounded-lg bg-[#F6F3E1] border border-amber-200/70 space-y-2">
                <p className="font-bold text-slate-900">Team-Only Private Fields</p>
                <p>
                  <strong>GSTIN:</strong>{' '}
                  <span className="font-mono-num">{inspectedListing.gstin || 'Not provided'}</span>
                </p>
                <p>
                  <strong>Udyam (Team Only):</strong>{' '}
                  <span className="font-mono-num">
                    {inspectedListing.udyamNumber || 'Not provided'}
                  </span>
                </p>
                <p>
                  <strong>Help Wanted:</strong>{' '}
                  {inspectedListing.helpWanted.length > 0
                    ? inspectedListing.helpWanted.map((h) => HELP_WANTED_LABELS[h].en).join(', ')
                    : 'None selected'}
                </p>
                <p>
                  <strong>Attribution:</strong> UTM={inspectedListing.utmSource || 'direct'} ·
                  Ambassador={inspectedListing.ambassadorCode || '—'} · Added by{' '}
                  {inspectedListing.addedBy}
                </p>
              </div>

              {/* Moderator Notes */}
              <div className="space-y-2">
                <label htmlFor="mod-notes" className="block font-bold text-slate-900">
                  Internal Moderator Notes
                </label>
                <textarea
                  id="mod-notes"
                  rows={3}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Call verification notes, GST portal check..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={() => onUpdateModeratorNotes(inspectedListing.id, noteDraft)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Save Note
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              {inspectedListing.status !== 'live' ? (
                <button
                  type="button"
                  onClick={() => {
                    onApproveListing(inspectedListing.id);
                    setInspectId(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0E5E1F] text-white text-xs font-semibold hover:bg-[#1A5B0B]"
                >
                  Approve &amp; Publish Live
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onBulkUpdateStatus([inspectedListing.id], 'hidden');
                    setInspectId(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Hide Listing
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onViewPublicListing(inspectedListing.slug);
                  setInspectId(null);
                }}
                className="px-4 py-2 rounded-lg border border-[#0E5E1F] text-[#0E5E1F] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Open Public Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
