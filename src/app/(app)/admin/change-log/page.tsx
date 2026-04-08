// v5.0 — Phase 43 / Plan 43-04 (ADM-04): /admin/change-log → /admin redirect.
//
// Phase 41 shipped /admin/change-log as the admin persona's landing route.
// Phase 43 consolidates that into /admin (D-19) where the change log feed
// is the page body. This file is kept as a thin server-side redirect so
// any deep link that was shared during Phase 41/42 keeps working.

import { redirect } from 'next/navigation';

export default function AdminChangeLogRedirect(): never {
  redirect('/admin');
}
