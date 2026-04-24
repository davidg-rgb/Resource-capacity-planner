// v6.0 Phase 53 REVIEW-VERIFY-FIX MN-04 — shared constant for the alerts
// window. Previously the StrategicAlertsBanner and AlertsPage consumed a
// 3-month window while NotificationBell used 4 months, which produced two
// different query caches for "the same alerts" and could surface a bell
// count that disagreed with the banner/page body count. Standardised on
// 3 months per the banner/page UX contract.

export const ALERTS_WINDOW_MONTHS = 3;
