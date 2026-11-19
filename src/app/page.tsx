import { Suspense } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { Screen } from "@/components/ui";
import { signInRequired } from "@/lib/auth/token";
import { loadStored } from "@/lib/household/store";

async function Loaded() {
  return <HomeScreen stored={await loadStored()} canSignOut={signInRequired()} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<Screen />}>
      <Loaded />
    </Suspense>
  );
}
