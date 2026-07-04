// services/global.js — Config backend + client Supabase (anon)
import { createClient } from '@supabase/supabase-js';

// ── Supabase (public — safe in frontend) ─────────────────────
export const SUPABASE_URL  = 'https://rlmjpmauqsfjqgoynjyw.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_mOEGkmPO6GJvvPVdiO4_jw_GWF3tMs8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Backend API (set after deploying) ────────────────────────
// Remplace par l'URL de ton backend Vercel/Railway après déploiement
export const BACKEND_URL       = import.meta.env.VITE_BACKEND_URL || '';
export const API_SECRET        = import.meta.env.VITE_API_SECRET  || '';
export const BACKEND_CONFIGURED = Boolean(BACKEND_URL && BACKEND_URL.length > 0);

export async function backendFetch(path, options = {}) {
  if (!BACKEND_CONFIGURED) return null;
  try {
    const res = await fetch(BACKEND_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': API_SECRET,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Backend error:', res.status, err);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('Backend fetch:', e.message);
    return null;
  }
}
