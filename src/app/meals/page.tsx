import { Suspense } from "react";
import { MealsScreen } from "@/components/MealsScreen";
import { Screen } from "@/components/ui";
import { loadStored } from "@/lib/household/store";

async function Loaded() {
  return <MealsScreen stored={await loadStored()} />;
}

export default function MealsPage() {
  return (
    <Suspense fallback={<Screen />}>
      <Loaded />
    </Suspense>
  );
}
