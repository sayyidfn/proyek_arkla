"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/lib/sidebar-context";

// Menu items untuk sidebar
const mainMenuItems = [
  { name: "Dashboard", href: "/", icon: "/icondashboard.svg" },
  { name: "Input Surat", href: "/upload", icon: "/iconinputsurat.svg" },
  { name: "Daftar Surat", href: "/archive", icon: "/icondaftarsurat.svg" },
];

// Sidebar Component
const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  // Check if path is active (including child routes)
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between gap-3 px-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Image src="/iconarkla.svg" alt="ARKLA Logo" width={32} height={32} />
          <span className="text-xl font-bold text-gray-900">ARKLA</span>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={close}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Tutup menu"
        >
          <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {/* Main Menu */}
        <ul className="space-y-1">
          {mainMenuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={close}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-[#2C5F6F] text-white shadow-md"
                      : "text-[#4A5565] hover:bg-gray-100 active:bg-gray-200"
                  }`}
                >
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={20}
                    height={20}
                    className={`transition-all ${active ? "brightness-0 invert" : ""}`}
                  />
                  <span>{item.name}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-[#2C5F6F] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
            <p className="text-xs text-gray-500 truncate">DPRD Sleman</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
