import assert from 'node:assert/strict';
import test from 'node:test';
import locationData from '../../src/data/bangladesh-locations.json';
import { BANGLADESH_DIVISIONS, formatCourierAddress, getDistrictsByDivision, getUpazilasByDistrict } from '../../src/lib/address/bangladesh-locations';

test('Bangladesh address data contains all eight divisions and 64 districts', () => {
  assert.equal(BANGLADESH_DIVISIONS.length, 8);
  const districtCount = BANGLADESH_DIVISIONS.reduce(
    (count, division) => count + getDistrictsByDivision(division).length,
    0,
  );
  assert.equal(districtCount, 64);
});

test('upazila reference data contains 495 records with valid district parents', () => {
  assert.equal(locationData.upazilas.length, 495);
  const districtIds = new Set(locationData.districts.map((district) => district.id));
  assert.ok(locationData.upazilas.every((upazila) => districtIds.has(upazila.district_id)));
});

test('all 64 districts have at least one selectable upazila or known city-thana option', () => {
  for (const district of locationData.districts) {
    assert.ok(
      getUpazilasByDistrict(district.name).length > 0,
      `Expected selectable areas for district: ${district.name}`,
    );
  }
});

test('district options are scoped to the selected division', () => {
  assert.ok(getDistrictsByDivision('Dhaka').some((district) => district.value === 'Dhaka'));
  assert.ok(!getDistrictsByDivision('Sylhet').some((district) => district.value === 'Dhaka'));
  assert.deepEqual(getDistrictsByDivision('Unknown'), []);
});

test('upazila options are scoped to the selected district and include known Dhaka city thanas', () => {
  const dhakaAreas = getUpazilasByDistrict('Dhaka');
  assert.ok(dhakaAreas.some((area) => area.value === 'Gulshan' && area.kind === 'THANA'));
  assert.ok(dhakaAreas.some((area) => area.kind === 'UPAZILA'));
  assert.deepEqual(getUpazilasByDistrict('Unknown'), []);
});

test('courier address formatter uses upazila and preserves the dispatch order', () => {
  assert.equal(
    formatCourierAddress({ addressDetails: 'House 14, Road 2', upazila: 'Gulshan', district: 'Dhaka', division: 'Dhaka' }),
    'House 14, Road 2, Gulshan, Dhaka, Dhaka, Bangladesh',
  );
});
