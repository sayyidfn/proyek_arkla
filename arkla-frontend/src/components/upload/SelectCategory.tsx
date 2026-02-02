import Image from "next/image";
import { KategoriSurat } from "@/lib/types";

interface CategoryOption {
  id: KategoriSurat;
  title: string;
  description: string;
  icon: string;
  badge: string;
  badgeColor: string;
}

const categories: CategoryOption[] = [
  {
    id: "keluar",
    title: "Surat Keluar Dewan",
    description:
      "Official correspondence issued by council members regarding legislative matters.",
    icon: "/iconsuratkeluardewan.svg",
    badge: "Public Access",
    badgeColor: "text-green-600",
  },
  {
    id: "keluar_sekwan",
    title: "Keluar Sekwan",
    description:
      "Administrative letters sent by the secretariat supporting council operations.",
    icon: "/iconsuratkeluar.svg",
    badge: "Internal Only",
    badgeColor: "text-orange-600",
  },
  {
    id: "masuk_biasa",
    title: "Masuk Biasa",
    description:
      "Standard incoming correspondence from external agencies or the public.",
    icon: "/iconsuratmasukbiasa.svg",
    badge: "Public Access",
    badgeColor: "text-green-600",
  },
  {
    id: "masuk_penting",
    title: "Masuk Penting",
    description:
      "High priority incoming documents requiring immediate attention or action.",
    icon: "/iconsuratmasukpenting.svg",
    badge: "Priority Handling",
    badgeColor: "text-red-600",
  },
  {
    id: "undangan",
    title: "Undangan",
    description:
      "Formal invitations for events, ceremonies, or official meetings.",
    icon: "/iconsuratmasukundangan.svg",
    badge: "Calendar Sync",
    badgeColor: "text-blue-600",
  },
  {
    id: "rahasia",
    title: "Rahasia",
    description:
      "Confidential documents requiring special clearance and encryption.",
    icon: "/iconsuratmasukrahasia.svg",
    badge: "Restricted Access",
    badgeColor: "text-red-600",
  },
];

interface SelectCategoryProps {
  selectedCategory: KategoriSurat | null;
  onSelect: (kategori: KategoriSurat) => void;
}

export default function SelectCategory({
  selectedCategory,
  onSelect,
}: SelectCategoryProps) {
  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Select Archive Category
        </h2>
        <p className="text-sm sm:text-base text-gray-500">
          Choose the classification type to begin the smart archiving process.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-[0.98] ${
              selectedCategory === category.id
                ? "border-[#2C5F6F] bg-[#2C5F6F]/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 sm:mb-4 ${
                selectedCategory === category.id
                  ? "bg-[#2C5F6F]/10"
                  : "bg-gray-100"
              }`}
            >
              <Image
                src={category.icon}
                alt={category.title}
                width={24}
                height={24}
              />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {category.title}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{category.description}</p>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  category.badgeColor.includes("green")
                    ? "bg-green-500"
                    : category.badgeColor.includes("orange")
                      ? "bg-orange-500"
                      : category.badgeColor.includes("blue")
                        ? "bg-blue-500"
                        : "bg-red-500"
                }`}
              />
              <span className={`text-xs font-medium ${category.badgeColor}`}>
                {category.badge}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
