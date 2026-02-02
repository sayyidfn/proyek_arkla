"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/lib/sidebar-context";

interface NavbarProps {
  title: string;
  subtitle?: string;
}

const Navbar: React.FC<NavbarProps> = ({ title, subtitle }) => {
  const { toggle } = useSidebar();
  const [today, setToday] = useState<string>("");

  // Format tanggal hari ini - only on client side to avoid hydration mismatch
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Left: Hamburger + Title & Date */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Hamburger Menu - Mobile only */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Buka menu"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Logo - Mobile only */}
        <div className="flex items-center gap-2 lg:hidden">
          <Image src="/iconarkla.svg" alt="ARKLA" width={28} height={28} />
          <span className="font-bold text-gray-900">ARKLA</span>
        </div>

        {/* Title - Desktop only */}
        <h1 className="hidden lg:block text-xl font-semibold text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <span className="hidden lg:block text-sm text-gray-500">
            {subtitle}
          </span>
        )}

        {/* Date - Desktop only */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <Image src="/icondate.svg" alt="Calendar" width={16} height={16} />
          <span>{today}</span>
        </div>
      </div>

      {/* Right: Button */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Add New Button */}
        <Link
          href="/upload"
          className="flex items-center gap-2 rounded-lg bg-[#2C5F6F] px-3 md:px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#244f5c] active:bg-[#1d4049]"
        >
          <Image
            src="/iconplus.svg"
            alt="Add"
            width={16}
            height={16}
            className="brightness-0 invert"
          />
          <span className="hidden sm:inline">Input Surat Baru</span>
          <span className="sm:hidden">Input</span>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
