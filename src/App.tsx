/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, LayoutDashboard, Shield, Store } from 'lucide-react';
import {
  BadgeId,
  BusinessListing,
  CategoryItem,
  DirectoryFilters,
  ExportAuditLog,
  Language,
  ListingReport,
  ListingStatus,
  OwnerAccount,
  PortalView,
  RejectionReasonCode,
  ReportReasonCode,
  SearchLogEntry,
  SponsoredMeta,
} from './types';
import { INITIAL_CATEGORIES } from './data/categories';
import { DISTRICT_MAP } from './data/districts';
import {
  SEED_ACCOUNTS,
  SEED_EXPORTS,
  SEED_LISTINGS,
  SEED_REPORTS,
  SEED_SEARCH_LOGS,
} from './data/seed';
import { mergeTownSpelling } from './utils/directory';
import { PublicPortal, PublicSubView } from './components/PublicPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { AdminPortal } from './components/AdminPortal';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';
import { ShareCardModal } from './components/ShareCardModal';

const STORAGE_KEY = 'vyapara_mitra_state_v1';

interface PersistedState {
  listings: BusinessListing[];
  accounts: OwnerAccount[];
  categories: CategoryItem[];
  reports: ListingReport[];
  searchLogs: SearchLogEntry[];
  exportLogs: ExportAuditLog[];
  sponsoredEnabled: boolean;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.listings) && parsed.listings.length > 0) {
        return {
          listings: parsed.listings,
          accounts: parsed.accounts ?? SEED_ACCOUNTS,
          categories: parsed.categories ?? INITIAL_CATEGORIES,
          reports: parsed.reports ?? SEED_REPORTS,
          searchLogs: parsed.searchLogs ?? SEED_SEARCH_LOGS,
          exportLogs: parsed.exportLogs ?? SEED_EXPORTS,
          sponsoredEnabled: parsed.sponsoredEnabled ?? true,
        };
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    listings: SEED_LISTINGS,
    accounts: SEED_ACCOUNTS,
    categories: INITIAL_CATEGORIES,
    reports: SEED_REPORTS,
    searchLogs: SEED_SEARCH_LOGS,
    exportLogs: SEED_EXPORTS,
    sponsoredEnabled: true,
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [lang, setLang] = useState<Language>('te');
  const [portal, setPortal] = useState<PortalView>('public');
  const [listings, setListings] = useState<BusinessListing[]>(initial.listings);
  const [accounts, setAccounts] = useState<OwnerAccount[]>(initial.accounts);
  const [categories, setCategories] = useState<CategoryItem[]>(initial.categories);
  const [reports, setReports] = useState<ListingReport[]>(initial.reports);
  const [searchLogs, setSearchLogs] = useState<SearchLogEntry[]>(initial.searchLogs);
  const [exportLogs, setExportLogs] = useState<ExportAuditLog[]>(initial.exportLogs);
  const [sponsoredEnabled, setSponsoredEnabled] = useState<boolean>(initial.sponsoredEnabled);

  // Public portal navigation state
  const [publicSubView, setPublicSubView] = useState<PublicSubView>('directory');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState<string | null>('jagtial');
  const [filters, setFilters] = useState<DirectoryFilters>({
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

  // Customer portal session state
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [pendingAddFlow, setPendingAddFlow] = useState(false);
  const [prefillDistrict, setPrefillDistrict] = useState<string | undefined>(undefined);

  // Shared modals & hit dedup
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [shareListing, setShareListing] = useState<BusinessListing | null>(null);
  const [dailyHits, setDailyHits] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Persist changes cleanly to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        listings,
        accounts,
        categories,
        reports,
        searchLogs,
        exportLogs,
        sponsoredEnabled,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [listings, accounts, categories, reports, searchLogs, exportLogs, sponsoredEnabled]);

  const currentOwner = useMemo(
    () => accounts.find((a) => a.id === currentOwnerId && !a.deletedAt) ?? null,
    [accounts, currentOwnerId]
  );

  // Event tracking: counts at most once per visitor per listing per day (/vm/v1/hit rule)
  const handleTrackHit = useCallback(
    (listingId: string, event: 'view' | 'call' | 'whatsapp' | 'directions' | 'share') => {
      const today = new Date().toISOString().slice(0, 10);
      const dedupKey = `${today}:${listingId}:${event}`;
      if (dailyHits.has(dedupKey)) return;

      setDailyHits((prev) => {
        const next = new Set(prev);
        next.add(dedupKey);
        return next;
      });

      setListings((prev) =>
        prev.map((item) => {
          if (item.id !== listingId) return item;
          const nextStats = { ...item.stats };
          if (event === 'view') nextStats.views += 1;
          if (event === 'call') nextStats.calls += 1;
          if (event === 'whatsapp') nextStats.whatsappTaps += 1;
          if (event === 'directions') nextStats.directionsTaps += 1;
          if (event === 'share') nextStats.shares += 1;

          const nextSponsored =
            item.sponsored?.isSponsored && (event === 'call' || event === 'whatsapp')
              ? { ...item.sponsored, taps: item.sponsored.taps + 1 }
              : item.sponsored;

          return { ...item, stats: nextStats, sponsored: nextSponsored };
        })
      );
    },
    [dailyHits]
  );

  const handleOpenListing = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      setPublicSubView('listing');
      setPortal('public');
      const target = listings.find((l) => l.slug === slug);
      if (target) {
        handleTrackHit(target.id, 'view');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [listings, handleTrackHit]
  );

  const handleOpenDistrict = useCallback((districtSlug: string) => {
    setSelectedDistrictSlug(districtSlug);
    setPublicSubView('district');
    setPortal('public');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleStartAddBusiness = useCallback((distSlug?: string) => {
    setPrefillDistrict(distSlug);
    setPendingAddFlow(true);
    setPortal('customer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLogSearch = useCallback((term: string, resultCount: number) => {
    const clean = term.trim().toLowerCase();
    if (!clean) return;
    setSearchLogs((prev) => {
      const idx = prev.findIndex((s) => s.term.toLowerCase() === clean);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          resultCount,
          count: copy[idx].count + 1,
          lastSearchedAt: now,
        };
        return copy;
      }
      return [{ term: term.trim(), resultCount, count: 1, lastSearchedAt: now }, ...prev];
    });
  }, []);

  const handleSubmitReport = useCallback(
    (listingId: string, reason: ReportReasonCode, note: string) => {
      const newReport: ListingReport = {
        id: `rep-${Date.now()}`,
        listingId,
        reason,
        note,
        deviceId: `dev-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        resolved: false,
      };
      setReports((prev) => {
        const nextReports = [newReport, ...prev];
        // Section 9: 3 closed/fake reports from different devices auto-hide unverified listings
        const severeCount = nextReports.filter(
          (r) =>
            r.listingId === listingId &&
            !r.resolved &&
            (r.reason === 'closed_permanently' || r.reason === 'fake_or_spam')
        ).length;
        if (severeCount >= 3) {
          setListings((cur) =>
            cur.map((l) =>
              l.id === listingId && !l.badges.includes('vm_verified')
                ? { ...l, status: 'hidden' }
                : l
            )
          );
        }
        return nextReports;
      });
      showToast('Report sent to Admin Moderation Queue');
    },
    [showToast]
  );

  // Customer Portal handlers
  const handleRegisterOwner = useCallback((acc: OwnerAccount) => {
    setAccounts((prev) => [acc, ...prev]);
    setCurrentOwnerId(acc.id);
  }, []);

  const handleUpdateOwner = useCallback((acc: OwnerAccount) => {
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? acc : a)));
  }, []);

  const handleDeleteOwnerAccount = useCallback(
    (ownerId: string) => {
      // Section 12: Immediately unpublishes all owner's listings & schedules personal data deletion
      setListings((prev) =>
        prev.map((l) => (l.ownerId === ownerId ? { ...l, status: 'hidden' } : l))
      );
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === ownerId ? { ...a, deletedAt: new Date().toISOString() } : a
        )
      );
      setCurrentOwnerId(null);
      showToast('Account marked for deletion. All listings unpublished immediately.');
    },
    [showToast]
  );

  const handleSaveDraft = useCallback((draft: BusinessListing) => {
    setListings((prev) => {
      const exists = prev.some((l) => l.id === draft.id);
      return exists ? prev.map((l) => (l.id === draft.id ? draft : l)) : [draft, ...prev];
    });
  }, []);

  const handleSubmitListing = useCallback(
    (listing: BusinessListing, isEdit: boolean) => {
      setListings((prev) => {
        const exists = prev.some((l) => l.id === listing.id);
        return exists ? prev.map((l) => (l.id === listing.id ? listing : l)) : [listing, ...prev];
      });
      showToast(
        isEdit && listing.status === 'live'
          ? 'Edits published live & logged for daily moderator check'
          : 'Submitted for review — now visible in Admin Pending Queue'
      );
    },
    [showToast]
  );

  const handleToggleHideListing = useCallback((listingId: string) => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === listingId
          ? { ...l, status: l.status === 'hidden' ? 'live' : 'hidden' }
          : l
      )
    );
  }, []);

  const handleDeleteListing = useCallback(
    (listingId: string) => {
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      showToast('Listing deleted');
    },
    [showToast]
  );

  // Admin Portal handlers
  const handleApproveListing = useCallback(
    (id: string) => {
      setListings((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: 'live',
                rejectionReason: undefined,
                rejectionNote: undefined,
                editedToday: false,
                updatedAt: new Date().toISOString(),
              }
            : l
        )
      );
      showToast('Listing approved & published live (cache purged)');
    },
    [showToast]
  );

  const handleRequestChanges = useCallback(
    (id: string, reason: RejectionReasonCode, note: string) => {
      setListings((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status: 'changes_needed',
                rejectionReason: reason,
                rejectionNote: note,
                updatedAt: new Date().toISOString(),
              }
            : l
        )
      );
      showToast('Marked Changes Needed — reason sent to Owner Dashboard');
    },
    [showToast]
  );

  const handleToggleBadge = useCallback((id: string, badge: BadgeId) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const has = l.badges.includes(badge);
        const badges = has ? l.badges.filter((b) => b !== badge) : [...l.badges, badge];
        return { ...l, badges };
      })
    );
  }, []);

  const handleBulkUpdateStatus = useCallback(
    (ids: string[], status: ListingStatus) => {
      const set = new Set(ids);
      setListings((prev) =>
        prev.map((l) => (set.has(l.id) ? { ...l, status } : l))
      );
      showToast(`Updated ${ids.length} listing(s) to ${status}`);
    },
    [showToast]
  );

  const handleBulkChangeCategory = useCallback(
    (ids: string[], categorySlug: string) => {
      const set = new Set(ids);
      setListings((prev) =>
        prev.map((l) => (set.has(l.id) ? { ...l, categorySlug, subCategory: '' } : l))
      );
      showToast(`Moved ${ids.length} listing(s) to new category`);
    },
    [showToast]
  );

  const handleResolveReports = useCallback(
    (listingId: string) => {
      setReports((prev) =>
        prev.map((r) => (r.listingId === listingId ? { ...r, resolved: true } : r))
      );
      showToast('Open reports resolved');
    },
    [showToast]
  );

  const handleUpdateModeratorNotes = useCallback(
    (id: string, notes: string) => {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, moderatorNotes: notes } : l))
      );
      showToast('Moderator note saved');
    },
    [showToast]
  );

  const handleMergeTown = useCallback(
    (districtSlug: string, sourceTowns: string[], canonicalTown: string) => {
      setListings((prev) => mergeTownSpelling(prev, districtSlug, sourceTowns, canonicalTown));
      showToast(`Merged town spellings into "${canonicalTown}"`);
    },
    [showToast]
  );

  const handleUpdateListingSponsored = useCallback(
    (id: string, sponsored: SponsoredMeta | undefined) => {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, sponsored } : l))
      );
      showToast(sponsored ? 'Sponsored slot saved' : 'Sponsored slot removed');
    },
    [showToast]
  );

  const handleLogExport = useCallback(
    (type: 'listings' | 'members', recordCount: number) => {
      const entry: ExportAuditLog = {
        id: `exp-${Date.now()}`,
        type,
        exportedBy: 'Admin (Current Session)',
        recordCount,
        exportedAt: new Date().toISOString(),
      };
      setExportLogs((prev) => [entry, ...prev]);
      showToast(`Exported ${recordCount} ${type} records to CSV (logged)`);
    },
    [showToast]
  );

  const pendingQueueCount = useMemo(
    () =>
      listings.filter((l) => l.status === 'pending').length +
      new Set(reports.filter((r) => !r.resolved).map((r) => r.listingId)).size,
    [listings, reports]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-slate-900">
      {/* Slim Single-Row Screen Switcher Bar: Public Website | Customer Portal | Admin Panel + Telugu/EN Toggle */}
      <div className="bg-[#0A4216] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-11 flex items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Vyapara Mitra screens"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={portal === 'public'}
              onClick={() => setPortal('public')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                portal === 'public'
                  ? 'bg-[#FDB902] text-[#0A4216]'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'పబ్లిక్ వెబ్‌సైట్' : 'Public Website'}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={portal === 'customer'}
              onClick={() => setPortal('customer')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                portal === 'customer'
                  ? 'bg-[#FDB902] text-[#0A4216]'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'కస్టమర్ పోర్టల్' : 'Customer Portal'}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={portal === 'admin'}
              onClick={() => setPortal('admin')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                portal === 'admin'
                  ? 'bg-[#FDB902] text-[#0A4216]'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'అడ్మిన్ ప్యానెల్' : 'Admin Panel'}</span>
              {pendingQueueCount > 0 && (
                <span
                  className={`font-mono-num text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    portal === 'admin'
                      ? 'bg-[#0A4216] text-[#FDB902]'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {pendingQueueCount}
                </span>
              )}
            </button>
          </div>

          {/* Bilingual Telugu / English Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Globe className="w-3.5 h-3.5 text-[#FDB902] hidden sm:block" aria-hidden="true" />
            <div className="inline-flex rounded-md bg-white/10 p-0.5 text-[11px] sm:text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang('te')}
                className={`px-2 sm:px-2.5 py-1 rounded transition-colors ${
                  lang === 'te' ? 'bg-white text-[#0A4216]' : 'text-white/80 hover:text-white'
                }`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 sm:px-2.5 py-1 rounded transition-colors ${
                  lang === 'en' ? 'bg-white text-[#0A4216]' : 'text-white/80 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Portal Screen */}
      {portal === 'public' && (
        <PublicPortal
          lang={lang}
          listings={listings}
          categories={categories}
          sponsoredEnabled={sponsoredEnabled}
          subView={publicSubView}
          selectedSlug={selectedSlug}
          selectedDistrictSlug={selectedDistrictSlug}
          filters={filters}
          onChangeSubView={setPublicSubView}
          onChangeFilters={setFilters}
          onOpenListing={handleOpenListing}
          onOpenDistrict={handleOpenDistrict}
          onStartAddBusiness={handleStartAddBusiness}
          onOpenLogin={() => setPortal('customer')}
          onTrackHit={handleTrackHit}
          onLogSearch={handleLogSearch}
          onSubmitReport={handleSubmitReport}
          onShareListing={(biz) => setShareListing(biz)}
          onOpenPrivacyNotice={() => setPrivacyOpen(true)}
        />
      )}

      {portal === 'customer' && (
        <CustomerPortal
          lang={lang}
          accounts={accounts}
          currentOwner={currentOwner}
          listings={listings}
          categories={categories}
          pendingAddFlow={pendingAddFlow}
          prefillDistrict={prefillDistrict}
          onLoginOwner={(acc) => setCurrentOwnerId(acc.id)}
          onRegisterOwner={handleRegisterOwner}
          onLogoutOwner={() => setCurrentOwnerId(null)}
          onUpdateOwner={handleUpdateOwner}
          onDeleteOwnerAccount={handleDeleteOwnerAccount}
          onSaveDraft={handleSaveDraft}
          onSubmitListing={handleSubmitListing}
          onToggleHideListing={handleToggleHideListing}
          onDeleteListing={handleDeleteListing}
          onViewPublicListing={handleOpenListing}
          onShareListing={(biz) => setShareListing(biz)}
          onOpenPrivacyNotice={() => setPrivacyOpen(true)}
          onClearPendingAddFlow={() => setPendingAddFlow(false)}
        />
      )}

      {portal === 'admin' && (
        <AdminPortal
          lang={lang}
          listings={listings}
          accounts={accounts}
          categories={categories}
          reports={reports}
          searchLogs={searchLogs}
          exportLogs={exportLogs}
          sponsoredEnabled={sponsoredEnabled}
          onApproveListing={handleApproveListing}
          onRequestChanges={handleRequestChanges}
          onToggleBadge={handleToggleBadge}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          onBulkChangeCategory={handleBulkChangeCategory}
          onResolveReports={handleResolveReports}
          onUpdateModeratorNotes={handleUpdateModeratorNotes}
          onUpdateCategories={setCategories}
          onMergeTown={handleMergeTown}
          onToggleSponsoredFeature={(enabled) => {
            setSponsoredEnabled(enabled);
            showToast(
              enabled
                ? 'Sponsored slots enabled on Public Directory'
                : 'Sponsored slots switched off'
            );
          }}
          onUpdateListingSponsored={handleUpdateListingSponsored}
          onLogExport={handleLogExport}
          onViewPublicListing={handleOpenListing}
        />
      )}

      {/* Standalone Bilingual DPDP Privacy Notice Modal */}
      <PrivacyNoticeModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        lang={lang}
      />

      {/* Brand Square WhatsApp Share Card Modal */}
      <ShareCardModal
        listing={shareListing}
        category={
          shareListing
            ? categories.find((c) => c.slug === shareListing.categorySlug)
            : undefined
        }
        district={
          shareListing ? DISTRICT_MAP.get(shareListing.districtSlug) : undefined
        }
        lang={lang}
        onClose={() => setShareListing(null)}
        onTrackShare={(id) => handleTrackHit(id, 'share')}
      />

      {/* Transient Action Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-[#0A4216] text-white text-xs font-semibold shadow-lg border border-[#FDB902]/40"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
