import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../api/supabase";

const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL;

export default function AdminGuard({
  children,
}) {
  const [loading, setLoading] =
    useState(true);

  const [allowed, setAllowed] =
    useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (
      user &&
      user.email === ADMIN_EMAIL
    ) {
      setAllowed(true);
    }

    setLoading(false);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!allowed) {
    return <Navigate to="/" />;
  }

  return children;
}