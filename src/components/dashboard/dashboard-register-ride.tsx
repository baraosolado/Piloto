"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RideFormDrawer } from "@/components/rides/ride-form-drawer";
import type { Vehicle } from "@/lib/calculations";

export function DashboardRegisterRide({
  vehicle,
}: {
  vehicle: Vehicle | null;
}) {
  return (
    <RideFormDrawer vehicle={vehicle}>
      <Button
        type="button"
        className="gap-2 bg-black px-5 py-3 font-bold text-white hover:bg-black/90"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        <span className="text-sm">Registrar dia</span>
      </Button>
    </RideFormDrawer>
  );
}
