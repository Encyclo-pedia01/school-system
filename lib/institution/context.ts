import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InstitutionMembership = {
  institutionId: string;
  institutionName: string;
  role: string;
};

export type InstitutionContext = {
  userId: string;
  institutionId: string;
  institutionName: string;
  role: string;
  memberships: InstitutionMembership[];
};

export async function getInstitutionContext(): Promise<InstitutionContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membershipRows, error: membershipError } = await supabase
    .from("memberships")
    .select("institution_id, role, active")
    .eq("user_id", user.id)
    .or("active.eq.true,active.is.null");

  if (membershipError || !membershipRows?.length) return null;

  const institutionIds = [...new Set(membershipRows.map((row) => row.institution_id).filter(Boolean))];
  if (institutionIds.length === 0) return null;

  const { data: institutions, error: institutionError } = await supabase
    .from("institutions")
    .select("id, name")
    .in("id", institutionIds);

  if (institutionError || !institutions?.length) return null;

  const names = new Map(institutions.map((institution) => [institution.id, institution.name]));
  const memberships = membershipRows
    .filter((row) => row.institution_id && names.has(row.institution_id))
    .map((row) => ({
      institutionId: row.institution_id as string,
      institutionName: names.get(row.institution_id as string) ?? "",
      role: row.role.toLowerCase(),
    }));

  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const selectedId = cookieStore.get("active-institution")?.value;
  const selected = memberships.find((membership) => membership.institutionId === selectedId) ?? memberships[0];

  return {
    userId: user.id,
    institutionId: selected.institutionId,
    institutionName: selected.institutionName,
    role: selected.role,
    memberships,
  };
}
