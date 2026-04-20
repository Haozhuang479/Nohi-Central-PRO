// Mock chart data for the analytics page.
// Extracted in Phase E so the host page.tsx stops carrying demo fixtures
// alongside its render logic. When the real attribution pipeline replaces
// these arrays, swap this module out — no page.tsx churn required.

export const viewsData = [
  { month: 'Sep', views: 420 },
  { month: 'Oct', views: 680 },
  { month: 'Nov', views: 910 },
  { month: 'Dec', views: 1240 },
  { month: 'Jan', views: 1580 },
  { month: 'Feb', views: 2130 },
]

export const ordersData = [
  { month: 'Sep', orders: 8 },
  { month: 'Oct', orders: 14 },
  { month: 'Nov', orders: 22 },
  { month: 'Dec', orders: 31 },
  { month: 'Jan', orders: 38 },
  { month: 'Feb', orders: 42 },
]

export const conversionData = [
  { month: 'Sep', rate: 1.9 },
  { month: 'Oct', rate: 2.1 },
  { month: 'Nov', rate: 2.4 },
  { month: 'Dec', rate: 2.5 },
  { month: 'Jan', rate: 2.4 },
  { month: 'Feb', rate: 3.2 },
]

export const projections = [
  { month: 'Mar', projected: 2600, actual: null },
  { month: 'Apr', projected: 3100, actual: null },
  { month: 'May', projected: 3800, actual: null },
]
