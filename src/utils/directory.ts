import {
  BusinessListing,
  CategoryItem,
  DayOfWeek,
  DirectoryFilters,
  DistrictItem,
} from '../types';

const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isOpenNow(listing: BusinessListing, now: Date = new Date()): boolean {
  const today = DAY_NAMES[now.getDay()];
  if (listing.weeklyHoliday !== 'none' && listing.weeklyHoliday === today) {
    return false;
  }
  if (listing.open24Hours) {
    return true;
  }
  if (!listing.openTime || !listing.closeTime) {
    return false;
  }
  const [oh, om] = listing.openTime.split(':').map(Number);
  const [ch, cm] = listing.closeTime.split(':').map(Number);
  if ([oh, om, ch, cm].some((n) => Number.isNaN(n))) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;

  if (closeMins >= openMins) {
    return currentMins >= openMins && currentMins <= closeMins;
  }
  // Overnight hours (e.g. 18:00 to 02:00)
  return currentMins >= openMins || currentMins <= closeMins;
}

export function formatTime12h(hhmm?: string): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function computeCompletenessScore(listing: BusinessListing): number {
  let score = 0;
  if (listing.mainPhoto) score += 2;
  if (listing.nameTe) score += 1;
  if (listing.about.length >= 100) score += 2;
  if (listing.tags.length >= 2) score += 1;
  if (listing.whatsapp) score += 1;
  if (listing.mandal) score += 1;
  if (listing.landmark) score += 1;
  if (listing.lat && listing.lng) score += 1;
  if (listing.open24Hours || (listing.openTime && listing.closeTime)) score += 1;
  if (listing.payments.length > 0) score += 1;
  if (listing.gstin || listing.udyamNumber || listing.fssaiNumber) score += 1;
  return score;
}

function getKeywordMatchRank(
  listing: BusinessListing,
  query: string,
  categoryMap: Map<string, CategoryItem>
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  // Section 8 ranking order:
  // 1. Business name in both scripts
  if (
    listing.nameEn.toLowerCase().includes(q) ||
    listing.nameTe.toLowerCase().includes(q)
  ) {
    return 4;
  }
  // 2. Product and service tags
  if (listing.tags.some((tag) => tag.toLowerCase().includes(q))) {
    return 3;
  }
  // 3. Category and sub-category names in both languages
  const cat = categoryMap.get(listing.categorySlug);
  if (
    cat &&
    (cat.nameEn.toLowerCase().includes(q) ||
      cat.nameTe.toLowerCase().includes(q) ||
      listing.subCategory.toLowerCase().includes(q))
  ) {
    return 2;
  }
  // 4. Town / mandal / about fallback
  if (
    listing.town.toLowerCase().includes(q) ||
    listing.mandal.toLowerCase().includes(q) ||
    listing.about.toLowerCase().includes(q)
  ) {
    return 1;
  }
  return 0;
}

export function filterAndSortListings(
  listings: BusinessListing[],
  filters: DirectoryFilters,
  categories: CategoryItem[],
  now: Date = new Date()
): BusinessListing[] {
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const query = filters.q.trim();

  const filtered = listings.filter((item) => {
    if (item.status !== 'live') return false;
    if (filters.state && item.state !== filters.state) return false;
    if (filters.district && item.districtSlug !== filters.district) return false;
    if (filters.town && item.town.toLowerCase() !== filters.town.toLowerCase()) return false;
    if (filters.category && item.categorySlug !== filters.category) return false;
    if (
      filters.subCategory &&
      item.subCategory.toLowerCase() !== filters.subCategory.toLowerCase()
    ) {
      return false;
    }
    if (filters.openNow && !isOpenNow(item, now)) return false;
    if (filters.homeDelivery && !item.homeDelivery) return false;
    if (filters.acceptsUpi && !item.payments.includes('upi')) return false;
    if (filters.verified && !item.badges.includes('vm_verified')) return false;
    if (filters.womenLed && !item.womenLed) return false;
    if (query && getKeywordMatchRank(item, query, catMap) === 0) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    // With keyword: best match first
    if (query) {
      const rankDiff =
        getKeywordMatchRank(b, query, catMap) - getKeywordMatchRank(a, query, catMap);
      if (rankDiff !== 0) return rankDiff;
    }

    if (filters.sort === 'newest') {
      return b.createdAt.localeCompare(a.createdAt);
    }
    if (filters.sort === 'complete') {
      return computeCompletenessScore(b) - computeCompletenessScore(a);
    }

    // Default recommended order (Section 8):
    // Vyapara Mitra verified first, then listings with more fields filled in, then newest
    const aVerified = a.badges.includes('vm_verified') ? 1 : 0;
    const bVerified = b.badges.includes('vm_verified') ? 1 : 0;
    if (bVerified !== aVerified) return bVerified - aVerified;

    const compDiff = computeCompletenessScore(b) - computeCompletenessScore(a);
    if (compDiff !== 0) return compDiff;

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getSponsoredSlots(
  listings: BusinessListing[],
  filters: DirectoryFilters,
  sponsoredFeatureEnabled: boolean,
  todayIso: string = new Date().toISOString().slice(0, 10)
): BusinessListing[] {
  if (!sponsoredFeatureEnabled) return [];

  return listings
    .filter((item) => {
      // Section 14: Only approved listings with the Vyapara Mitra verified badge can be sponsored
      if (item.status !== 'live') return false;
      if (!item.badges.includes('vm_verified')) return false;
      const sp = item.sponsored;
      if (!sp || !sp.isSponsored) return false;
      if (todayIso < sp.startDate || todayIso > sp.endDate) return false;

      if (filters.district && sp.scope !== 'category' && item.districtSlug !== filters.district) {
        return false;
      }
      if (filters.category && sp.scope !== 'district' && item.categorySlug !== filters.category) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.sponsored?.slotOrder ?? 2) - (b.sponsored?.slotOrder ?? 2))
    .slice(0, 2); // Section 14: At most 2 sponsored cards
}

export interface TownMergeGroup {
  districtSlug: string;
  suggestedCanonical: string;
  variants: { name: string; count: number }[];
}

function townSimilarityKey(town: string): string {
  // Collapse case, whitespace, and drop duplicate letters/h after consonant for rough Telugu-English transliteration variants
  return town
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1');
}

export function findTownMergeGroups(listings: BusinessListing[]): TownMergeGroup[] {
  const byDistrictAndKey = new Map<string, Map<string, number>>();

  for (const item of listings) {
    const t = item.town.trim();
    if (!t) continue;
    const groupKey = `${item.districtSlug}::${townSimilarityKey(t)}`;
    let variantCounts = byDistrictAndKey.get(groupKey);
    if (!variantCounts) {
      variantCounts = new Map();
      byDistrictAndKey.set(groupKey, variantCounts);
    }
    variantCounts.set(t, (variantCounts.get(t) ?? 0) + 1);
  }

  const groups: TownMergeGroup[] = [];
  for (const [groupKey, variantMap] of byDistrictAndKey.entries()) {
    if (variantMap.size < 2) continue;
    const [districtSlug] = groupKey.split('::');
    const variants = Array.from(variantMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        // Prefer properly capitalized spelling with highest count
        const aCap = /^[A-Z]/.test(a.name) ? 1 : 0;
        const bCap = /^[A-Z]/.test(b.name) ? 1 : 0;
        if (bCap !== aCap) return bCap - aCap;
        return b.count - a.count;
      });
    groups.push({
      districtSlug,
      suggestedCanonical: variants[0].name,
      variants,
    });
  }
  return groups;
}

export function mergeTownSpelling(
  listings: BusinessListing[],
  districtSlug: string,
  sourceTowns: string[],
  canonicalTown: string
): BusinessListing[] {
  const targets = new Set(sourceTowns);
  return listings.map((item) => {
    if (item.districtSlug === districtSlug && targets.has(item.town.trim())) {
      return { ...item, town: canonicalTown.trim() };
    }
    return item;
  });
}

export function buildWhatsAppLink(listing: BusinessListing): string {
  const number = (listing.whatsapp || listing.phone).replace(/\D/g, '');
  const fullNumber = number.startsWith('91') ? number : `91${number}`;
  const listingUrl = `https://vyaparamitra.in/businesses/${listing.slug}/`;
  const text = `Hi, I saw your business on Vyapara Mitra. ${listingUrl}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
}

export function buildDirectionsLink(listing: BusinessListing, districtName?: string): string {
  if (listing.lat && listing.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`;
  }
  const query = [listing.nameEn, listing.address, listing.town, districtName, listing.pinCode]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const SCHEMA_TYPE_MAP: Record<string, string> = {
  'kirana-supermarket': 'GroceryStore',
  'hotels-restaurants': 'Restaurant',
  'automobile-repair': 'AutoRepair',
  'beauty-salon': 'BeautySalon',
  'gold-silver-jewellery': 'JewelryStore',
  'real-estate': 'RealEstateAgent',
  'health-medical': 'MedicalBusiness',
};

export function buildLocalBusinessJsonLd(
  listing: BusinessListing,
  category?: CategoryItem,
  district?: DistrictItem
): Record<string, unknown> {
  const schemaType = SCHEMA_TYPE_MAP[listing.categorySlug] || 'LocalBusiness';
  const sameAs = [listing.website, listing.facebook, listing.instagram, listing.youtube].filter(
    Boolean
  );

  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: listing.nameEn,
    ...(listing.nameTe ? { alternateName: listing.nameTe } : {}),
    description: listing.about.slice(0, 140) + ' Call or WhatsApp.',
    telephone: `+91${listing.phone}`,
    url: `https://vyaparamitra.in/businesses/${listing.slug}/`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.showOnlyTown ? listing.town : listing.address,
      addressLocality: listing.town,
      addressRegion: listing.state === 'TS' ? 'Telangana' : 'Andhra Pradesh',
      postalCode: listing.pinCode,
      addressCountry: 'IN',
    },
    ...(listing.lat && listing.lng
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: listing.lat,
            longitude: listing.lng,
          },
        }
      : {}),
    ...(category ? { category: category.nameEn } : {}),
    ...(district ? { areaServed: district.nameEn } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function buildCsvString(headers: string[], rows: (string | number | boolean | undefined)[][]): string {
  const escapeCell = (val: string | number | boolean | undefined): string => {
    const s = String(val ?? '');
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');
}
