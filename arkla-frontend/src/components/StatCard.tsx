import React from "react";
import Image from "next/image";

interface StatCardProps {
  icon: string;
  title: string;
  value: string;
  change?: number;
  loading?: boolean;
  highlight?: boolean;
  color?: "primary" | "warning" | "success" | "info";
}

const colorStyles = {
  primary: {
    bg: "bg-[#2C5F6F]/10",
    text: "text-gray-900",
    border: "border-gray-100",
    cardBg: "bg-white",
  },
  warning: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-200",
    cardBg: "bg-white",
  },
  success: {
    bg: "bg-green-100",
    text: "text-green-600",
    border: "border-green-200",
    cardBg: "bg-white",
  },
  info: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    border: "border-blue-200",
    cardBg: "bg-white",
  },
};

export default function StatCard({
  icon,
  title,
  value,
  change,
  loading = false,
  highlight = false,
  color = "primary",
}: StatCardProps) {
  const showChange = change !== undefined && change !== 0;
  const isPositive = change !== undefined && change >= 0;

  // Jika highlight true dan ada pending, override ke warning
  const activeColor = highlight ? "warning" : color;
  const styles = colorStyles[activeColor];

  return (
    <div
      className={`${styles.cardBg} rounded-xl p-3 sm:p-4 lg:p-6 shadow-sm border ${styles.border}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center ${styles.bg} flex-shrink-0`}
          >
            <Image
              src={icon}
              alt={title}
              width={24}
              height={24}
              className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 truncate">{title}</p>
            {loading ? (
              <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p
                className={`text-lg sm:text-xl lg:text-2xl font-bold ${highlight ? styles.text : "text-gray-900"}`}
              >
                {value}
              </p>
            )}
          </div>
        </div>
        {!loading && showChange && (
          <div
            className={`flex items-center gap-1 text-sm ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            <span>{isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(change!)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
