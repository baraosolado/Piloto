import { ReportsSkeleton } from "@/components/reports/reports-skeleton";

export default function RelatoriosLoading() {
  return (
    <div className="min-h-screen bg-[#F6F6F6] p-6">
      <ReportsSkeleton />
    </div>
  );
}
