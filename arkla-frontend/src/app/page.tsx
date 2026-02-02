"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import RecentArchives from "@/components/RecentArchives";
import { apiClient } from "@/lib/api-client";
import { DashboardStats } from "@/lib/types";

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    total_arsip: 0,
    pending_review: 0,
    today_count: 0,
    accuracy_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const dashboardStats = await apiClient.getDashboardStats();
        setStats(dashboardStats);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <StatCard
          icon="/icondaftarsurat.svg"
          title="Total Arsip"
          value={loading ? "-" : stats.total_arsip.toString()}
          loading={loading}
          color="primary"
        />
        <StatCard
          icon="/iconwarning.svg"
          title="Perlu Review"
          value={loading ? "-" : stats.pending_review.toString()}
          loading={loading}
          highlight={stats.pending_review > 0}
          color="warning"
        />
        <StatCard
          icon="/icontoday.svg"
          title="Hari Ini"
          value={loading ? "-" : stats.today_count.toString()}
          loading={loading}
          color="info"
        />
        <StatCard
          icon="/iconcheckcircle.svg"
          title="Tingkat Akurasi"
          value={loading ? "-" : `${stats.accuracy_rate}%`}
          loading={loading}
          color="success"
        />
      </div>

      {/* Recent Archives Table */}
      <RecentArchives />
    </DashboardLayout>
  );
}
