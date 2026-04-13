"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function DashboardOnboardingToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (searchParams.get("onboarding") !== "complete") return;
    shown.current = true;
    toast.success("Tudo configurado! Bem-vindo ao Copilote 🚗");
    router.replace("/dashboard", { scroll: false });
  }, [searchParams, router]);

  return null;
}
