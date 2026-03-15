import { getAllData } from "thai-data";

export interface ThaiAddress {
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

let _cache: ThaiAddress[] | null = null;

export function getThaiAddresses(): ThaiAddress[] {
  if (_cache) return _cache;

  const allData = getAllData() as any[];
  const result: ThaiAddress[] = [];

  for (const item of allData) {
    if (!item.districtList || !item.provinceList) continue;
    const dm = new Map<string, string>(
      item.districtList.map((x: any) => [x.districtId, x.districtName])
    );
    const pm = new Map<string, string>(
      item.provinceList.map((x: any) => [x.provinceId, x.provinceName])
    );
    for (const s of item.subDistrictList ?? []) {
      result.push({
        subDistrict: String(s.subDistrictName),
        district: dm.get(s.districtId) ?? "",
        province: pm.get(s.provinceId) ?? "",
        postalCode: String(item.zipCode),
      });
    }
  }

  _cache = result;
  return result;
}

export function searchByPostalCode(data: ThaiAddress[], zip: string): ThaiAddress[] {
  return data.filter((a) => a.postalCode === zip);
}
