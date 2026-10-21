import locationData from '../../data/bangladesh-locations.json';

export interface AddressOption {
  value: string;
  label: string;
  kind?: 'UPAZILA' | 'THANA';
}

const DIVISION_NAMES = new Set(locationData.divisions.map((division) => division.name));

export const BANGLADESH_DIVISIONS = locationData.divisions
  .map((division) => division.name)
  .sort((a, b) => a.localeCompare(b));

export function getDistrictsByDivision(divisionName: string): AddressOption[] {
  const division = locationData.divisions.find((item) => item.name === divisionName);
  if (!division || !DIVISION_NAMES.has(divisionName)) return [];

  return locationData.districts
    .filter((district) => district.division_id === division.id)
    .map((district) => ({ value: district.name, label: district.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getUpazilasByDistrict(districtName: string): AddressOption[] {
  const district = locationData.districts.find((item) => item.name === districtName);
  if (!district) return [];

  const ruralUpazilas = locationData.upazilas
    .filter((upazila) => upazila.district_id === district.id)
    .map((upazila) => ({ value: upazila.name, label: upazila.name, kind: 'UPAZILA' as const }));
  const cityThanas = locationData.cityThanas
    .filter((thana) => thana.district_id === district.id)
    .map((thana) => ({
      value: thana.name,
      label: thana.name + ' (Thana)',
      kind: 'THANA' as const,
    }));

  const seen = new Set<string>();
  return [...cityThanas, ...ruralUpazilas]
    .filter((option) => {
      const key = option.value.trim().toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function isValidAddressSelection(divisionName: string, districtName: string, upazilaName: string): boolean {
  return getDistrictsByDivision(divisionName).some((district) => district.value === districtName)
    && getUpazilasByDistrict(districtName).some((upazila) => upazila.value === upazilaName);
}
