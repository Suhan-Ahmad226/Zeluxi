import assert from 'node:assert/strict';
import test from 'node:test';
import { BANGLADESH_DIVISIONS, formatCourierAddress, getDistrictsByDivision, getUpazilasByDistrict } from '../../src/lib/address/bangladesh-locations';

test('Bangladesh address data contains all eight divisions and 64 districts', () => {
  assert.equal(BANGLADESH_DIVISIONS.length, 8);
  const districtCount = BANGLADESH_DIVISIONS.reduce(
    (count, division) => count + getDistrictsByDivision(division).length,
    0,
  );
  assert.equal(districtCount, 64);
});

test('district options are scoped to the selected division', () => {
  assert.ok(getDistrictsByDivision('Dhaka').some((district) => district.value === 'Dhaka'));
  assert.ok(!getDistrictsByDivision('Sylhet').some((district) => district.value === 'Dhaka'));
  assert.deepEqual(getDistrictsByDivision('Unknown'), []);
});

test('upazila options are scoped to the selected district and include city thanas', () => {
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
