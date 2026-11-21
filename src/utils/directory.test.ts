import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalBusinessJsonLd,
  buildWhatsAppLink,
  filterAndSortListings,
  findTownMergeGroups,
  getSponsoredSlots,
  isOpenNow,
  mergeTownSpelling,
} from './directory';
import { SEED_LISTINGS } from '../data/seed';
import { INITIAL_CATEGORIES } from '../data/categories';
import { DirectoryFilters } from '../types';

const DEFAULT_FILTERS: DirectoryFilters = {
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
};

test('ranks Telugu and English keyword matches and excludes non-live listings', () => {
  const results = filterAndSortListings(
    SEED_LISTINGS,
    { ...DEFAULT_FILTERS, q: 'కిరాణా' },
    INITIAL_CATEGORIES
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].slug, 'sri-lakshmi-kirana-suryapet');
  // Pending listings should never appear in public results
  assert.equal(
    results.some((r) => r.status !== 'live'),
    false
  );
});

test('computes open-now status accurately with 24h and weekly holidays', () => {
  // Sunday 10:00 AM
  const sundayMorning = new Date('2026-11-22T10:00:00');
  // biz-2 has weeklyHoliday: 'Sun'
  const agro = SEED_LISTINGS.find((b) => b.id === 'biz-2')!;
  assert.equal(isOpenNow(agro, sundayMorning), false);

  // biz-6 is 24 hours, no holiday
  const medical = SEED_LISTINGS.find((b) => b.id === 'biz-6')!;
  assert.equal(isOpenNow(medical, sundayMorning), true);
});

test('sponsored slots enforce max 2, live + vm_verified, and toggle switch', () => {
  const off = getSponsoredSlots(SEED_LISTINGS, DEFAULT_FILTERS, false, '2026-11-20');
  assert.equal(off.length, 0);

  const on = getSponsoredSlots(SEED_LISTINGS, DEFAULT_FILTERS, true, '2026-11-20');
  assert.equal(on.length, 2);
  assert.equal(on.every((b) => b.badges.includes('vm_verified')), true);
});

test('town clean-up detects Dharmapuri spelling variants and merges cleanly', () => {
  const groups = findTownMergeGroups(SEED_LISTINGS);
  const jagtialGroup = groups.find((g) => g.districtSlug === 'jagtial');
  assert.ok(jagtialGroup);
  assert.equal(jagtialGroup.suggestedCanonical, 'Dharmapuri');
  assert.equal(jagtialGroup.variants.length, 3); // Dharmapuri, dharmapuri, Darmapuri

  const merged = mergeTownSpelling(
    SEED_LISTINGS,
    'jagtial',
    ['dharmapuri', 'Darmapuri'],
    'Dharmapuri'
  );
  const afterGroups = findTownMergeGroups(merged);
  assert.equal(
    afterGroups.find((g) => g.districtSlug === 'jagtial'),
    undefined
  );
});

test('WhatsApp link preserves prefilled message with listing link and JSON-LD maps GroceryStore without reviews', () => {
  const kirana = SEED_LISTINGS[0];
  const waUrl = buildWhatsAppLink(kirana);
  assert.ok(waUrl.includes('wa.me/919989123456'));
  assert.ok(decodeURIComponent(waUrl).includes('Hi, I saw your business on Vyapara Mitra.'));
  assert.ok(decodeURIComponent(waUrl).includes('vyaparamitra.in/businesses/sri-lakshmi-kirana-suryapet/'));

  const ld = buildLocalBusinessJsonLd(kirana);
  assert.equal(ld['@type'], 'GroceryStore');
  assert.equal('aggregateRating' in ld, false);
});
