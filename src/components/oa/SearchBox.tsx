"use client";
import { forwardRef } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";

/** The one search field: header search, model picker, benchmark list, compare. */
export const SearchBox = forwardRef<HTMLInputElement, {
  value: string; onChange: (v: string) => void; placeholder: string; label: string; autoFocus?: boolean; kbd?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; onFocus?: () => void;
}>(function SearchBox({ value, onChange, placeholder, label, autoFocus, kbd, onKeyDown, onFocus }, ref) {
  return (
    <label className="oa-sbox">
      <IconSearch size={15} stroke={1.7} aria-hidden="true" />
      <input ref={ref} type="text" value={value} placeholder={placeholder} aria-label={label} autoFocus={autoFocus} autoComplete="off" spellCheck={false}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} onFocus={onFocus} />
      {value ? <button type="button" onClick={() => onChange("")} aria-label="Clear search" title="Clear search"><IconX size={13} stroke={2} /></button> : kbd ? <span className="oa-kbd">{kbd}</span> : null}
    </label>
  );
});
