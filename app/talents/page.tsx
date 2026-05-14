import { fetchTalents } from "@/lib/supabase-queries";
import TalentsContent from "./TalentsContent";

export const revalidate = 60;

export default async function TalentsPage() {
  const talents = await fetchTalents();

  return <TalentsContent talents={talents} />;
}
