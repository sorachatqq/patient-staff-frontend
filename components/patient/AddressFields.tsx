"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ThaiAddress, getThaiAddresses, searchByPostalCode } from "@/lib/thai-address";
import { inputClass, selectClass, text } from "@/lib/design-system";
import { ChevronDown } from "lucide-react";

export interface AddressValue {
  addressLine: string;
  postalCode: string;
  subDistrict: string;
  district: string;
  province: string;
}

interface Props {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  errors: Record<string, string>;
}

export default function AddressFields({ value, onChange, errors }: Props) {
  const [data] = useState<ThaiAddress[]>(() => getThaiAddresses());

  const subDistrictOptions = useMemo(
    () => (value.postalCode.length === 5 ? searchByPostalCode(data, value.postalCode) : []),
    [data, value.postalCode]
  );

  const handlePostalChange = (zip: string) => {
    const clean = zip.replace(/\D/g, "").slice(0, 5);
    onChange({ ...value, postalCode: clean, subDistrict: "", district: "", province: "" });
  };

  const handleSubDistrictChange = (subDistrict: string) => {
    const selected = subDistrictOptions.find((a) => a.subDistrict === subDistrict);
    if (selected) {
      onChange({ ...value, subDistrict: selected.subDistrict, district: selected.district, province: selected.province });
    } else {
      onChange({ ...value, subDistrict: "" });
    }
  };

  // Auto-fill when only 1 option
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => {
    if (subDistrictOptions.length === 1 && !value.subDistrict) {
      const a = subDistrictOptions[0];
      onChangeRef.current({ ...value, subDistrict: a.subDistrict, district: a.district, province: a.province });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subDistrictOptions]);

  const autoFilled = !!(value.district && value.province);

  return (
    <div className="space-y-4">
      {/* Street / House No. */}
      <div>
        <label className={text.label}>
          Street / House No.<span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={value.addressLine}
          onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
          placeholder="123/4 Sukhumvit Rd."
          className={inputClass(errors.addressLine)}
        />
        {errors.addressLine && <p className={text.error}>{errors.addressLine}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Postal Code */}
        <div>
          <label className={text.label}>
            Postal Code<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={value.postalCode}
            onChange={(e) => handlePostalChange(e.target.value)}
            placeholder="10110"
            className={inputClass(errors.postalCode)}
            autoComplete="off"
          />
          {errors.postalCode && <p className={text.error}>{errors.postalCode}</p>}
        </div>

        {/* Sub-district */}
        <div>
          <label className={text.label}>
            Sub-district<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative">
            <select
              value={value.subDistrict}
              onChange={(e) => handleSubDistrictChange(e.target.value)}
              disabled={subDistrictOptions.length === 0}
              className={`${selectClass(errors.subDistrict)} ${subDistrictOptions.length === 0 ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}
            >
              <option value="">
                {subDistrictOptions.length === 0 ? "Enter Postal Code" : "Select sub-district"}
              </option>
              {subDistrictOptions.map((a) => (
                <option key={a.subDistrict} value={a.subDistrict}>{a.subDistrict}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          {errors.subDistrict && <p className={text.error}>{errors.subDistrict}</p>}
        </div>
      </div>

      {/* District + Province (auto-filled) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={text.label}>District</label>
          <div className={`${inputClass()} flex items-center ${autoFilled ? "bg-slate-50" : ""}`}>
            {value.district
              ? <span className="text-slate-500 text-sm">{value.district}</span>
              : <span className="text-slate-300 text-sm italic">Auto-filled</span>}
          </div>
        </div>
        <div>
          <label className={text.label}>Province</label>
          <div className={`${inputClass()} flex items-center ${autoFilled ? "bg-slate-50" : ""}`}>
            {value.province
              ? <span className="text-slate-500 text-sm">{value.province}</span>
              : <span className="text-slate-300 text-sm italic">Auto-filled</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
