import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Whether someone is signed in, for pages that show different buttons to visitors and members. */
export function useSignedIn() {
  const [state, setState] = useState({ loading: true, signedIn: false });

  useEffect(() => {
    let off = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!off) setState({ loading: false, signedIn: !!data.session });
      })
      .catch(() => {
        if (!off) setState({ loading: false, signedIn: false });
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, signedIn: !!session });
    });
    return () => {
      off = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
