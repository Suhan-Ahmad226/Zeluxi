# Bangladesh location data attribution

## Administrative hierarchy and upazilas

The 495 upazila records in `bangladesh-locations.json` are adapted from:

- **Dataset:** Bangladesh Administrative Divisions
- **Repository:** https://github.com/open-admin-data/bangladesh-administrative-divisions
- **Source file:** `data/all-upazila.json`
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/
- **Changes made:** Upazila records were mapped to the district IDs used by Zeluxi; the English/Bengali names and source IDs were retained.

## Divisions, districts, and city thanas

The division, district, and city-thana reference records are adapted from [ifahimreza/bangladesh-geojson](https://github.com/ifahimreza/bangladesh-geojson), licensed under the MIT License.

The city-thana list from this source is **not a complete nationwide thana directory**: the existing records cover Dhaka district only. Do not treat this list as a complete list of all city corporation police stations or as Pathao's City/Zone/Area IDs. The checkout uses the upazila hierarchy for district-scoped selection and includes these known Dhaka city-thana entries where available.

## Data quality and runtime

The dataset is bundled locally so checkout does not depend on a third-party API at runtime. Upazila/district counts and parent relationships are covered by unit tests. Government administrative lists can change; review this dataset against the Bangladesh National Portal before future updates:
https://bangladesh.gov.bd/site/view/upazila-list/Upazilla-List

Pathao maintains its own courier-specific City/Zone/Area identifiers. Zeluxi's Pathao booking must not treat local administrative IDs as Pathao IDs. The current Pathao order payload relies on Pathao's address parsing by leaving `recipient_city`, `recipient_zone`, and `recipient_area` unset; keep the full recipient address clear and complete. See Pathao's published guidance:
https://pathao.com/bn/blog/api-merchant-auto-address-feature/

## MIT License notice for the source-derived records

Copyright (c) 2026 Fahim Reza and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
