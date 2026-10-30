import * as React from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { BusinessRow } from "@/lib/format";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type BusinessMemberRow = Database["public"]["Tables"]["business_members"]["Row"];

interface BusinessContextValue {
  loading: boolean;
  businesses: BusinessRow[];
  business: BusinessRow | null;
  memberships: (BusinessMemberRow & { businesses: BusinessRow })[];
  profile: ProfileRow | null;
  selectedBusinessId: string | null;
  setSelectedBusinessId: (id: string) => void;
  refresh: () => Promise<void>;
  createBusiness: (values: {
    name: string;
    email: string;
    currency: string;
    payment_terms: number;
    tax_rate: number;
    load_demo: boolean;
  }) => Promise<BusinessRow | null>;
}

const BusinessContext = React.createContext<BusinessContextValue | null>(null);

export function useBusiness(): BusinessContextValue {
  const ctx = React.useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}

const STORAGE_KEY = "sifu:selected-business";

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [memberships, setMemberships] = React.useState<
    (BusinessMemberRow & { businesses: BusinessRow })[]
  >([]);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [selectedBusinessId, setSelected] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setMemberships([]);
        setProfile(null);
        return;
      }
      const [membersRes, profileRes] = await Promise.all([
        supabase
          .from("business_members")
          .select("*, businesses(*)")
          .eq("user_id", session.session.user.id)
          .order("created_at"),
        supabase.from("profiles").select("*").eq("id", session.session.user.id).maybeSingle(),
      ]);
      setMemberships((membersRes.data as (BusinessMemberRow & { businesses: BusinessRow })[]) ?? []);
      setProfile(profileRes.data ?? null);
      if (membersRes.error) throw membersRes.error;
    } catch (e) {
      console.error(e);
      toast.error("Could not load your business data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    setSelected(window.localStorage.getItem(STORAGE_KEY));
  }, [load]);

  const businesses = React.useMemo(() => memberships.map((m) => m.businesses), [memberships]);

  const business = React.useMemo(() => {
    if (selectedBusinessId) {
      const found = businesses.find((b) => b.id === selectedBusinessId);
      if (found) return found;
    }
    return businesses[0] ?? null;
  }, [businesses, selectedBusinessId]);

  const setSelectedBusinessId = React.useCallback((id: string) => {
    setSelected(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const createBusiness = React.useCallback<BusinessContextValue["createBusiness"]>(
    async (values) => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) throw new Error("Not signed in");
        const { data, error } = await supabase
          .from("businesses")
          .insert({
            owner_id: session.session.user.id,
            name: values.name.trim(),
            email: values.email.trim() || null,
            currency: values.currency,
            default_payment_terms: values.payment_terms,
            default_tax_rate: values.tax_rate,
          })
          .select("*")
          .single();
        if (error) throw error;
        const { error: memberError } = await supabase
          .from("business_members")
          .insert({ business_id: data.id, user_id: session.session.user.id, role: "owner" });
        if (memberError) throw memberError;
        if (values.load_demo) {
          const { error: demoError } = await supabase.rpc("seed_demo_data", {
            _business_id: data.id,
          });
          if (demoError) {
            toast.warning("Sample data could not be loaded: " + demoError.message);
          }
        }
        await load();
        setSelectedBusinessId(data.id);
        toast.success("Business created");
        return data;
      } catch (e) {
        console.error(e);
        toast.error("Could not create business: " + (e as Error).message);
        return null;
      }
    },
    [load, setSelectedBusinessId],
  );

  const value: BusinessContextValue = {
    loading,
    businesses,
    business,
    memberships,
    profile,
    selectedBusinessId,
    setSelectedBusinessId,
    refresh: load,
    createBusiness,
  };

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}
