"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, Check, ChevronDown } from "lucide-react";

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className = "" }: LanguageSelectorProps) {
  const { language, setLanguage, supportedLanguages, currentLanguageMeta } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left z-40 ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold backdrop-blur-md transition-all duration-200 shadow-sm hover:border-emerald-500/40"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe size={14} className="text-emerald-400" />
        <span className="text-emerald-300 font-bold">{currentLanguageMeta.flag}</span>
        {!compact && (
          <span className="text-gray-200 tracking-wide font-medium">
            {currentLanguageMeta.nativeName}
          </span>
        )}
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#181C24]/95 border border-white/10 shadow-2xl backdrop-blur-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Select Language / भाषा
            </p>
          </div>
          {supportedLanguages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors ${
                  isSelected
                    ? "bg-emerald-500/15 text-emerald-400 font-bold"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <div>
                    <p className="font-semibold leading-tight">{lang.nativeName}</p>
                    <p className="text-[10px] text-gray-500">{lang.name}</p>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
