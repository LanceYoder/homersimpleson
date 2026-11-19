import { Suspense } from "react";
import { GroceriesScreen } from "@/components/GroceriesScreen";
import { Screen } from "@/components/ui";
import { loadStored } from "@/lib/household/store";

async function Loaded() {
  return <GroceriesScreen stored={await loadStored()} />;
}

export default function GroceriesPage() {
  return (
    <Suspense fallback={<Screen />}>
      <Loaded />
    </Suspense>
  );
}
