# Package Analytics and Dashboard Updates

This plan details updating the Admin Dashboard "Today's Check-ins" metric and creating a comprehensive "Package History" reporting view.

## User Review Required

> [!IMPORTANT]
> A new navigation tab "Package History" will be placed right after "Finances" in the sidebar. Please review if this feels like the correct placement and if the metric modifications are exactly what you need.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [dashboard.php](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/api/dashboard.php)
- Replace the query calculating `todayCheckins` with a query calculating `thisMonthRegistrations`.
- Query logic: `SELECT COUNT(*) FROM profiles WHERE role = 'member' AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')`.
- Modify API JSON payload to return `thisMonthRegistrations` alongside other stats.

#### [NEW] [package_stats.php](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/api/package_stats.php)
- Create a new endpoint dedicated to computing analytical metrics per package.
- It will execute a query joining `packages` and `user_subscriptions` to retrieve:
  - `package_name`
  - `total_members_assigned_ever` (Count of all subscriptions tied to this package)
  - `currently_active_members` (Count of subscriptions tied to this package where `status = 'active'`)
- Ensures even discontinued packages that are stored against existing member history will be pulled.

---

### Frontend Components

#### [MODIFY] [AppLayout.jsx](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/src/components/layout/AppLayout.jsx)
- In the Owner/Manager `navLinks` array, add a new link for `/admin/packages/history` positioned immediately after "Finances".
- Label it "Package History" with a brief description and an appropriate icon (e.g., `Box` or `Package`).

#### [MODIFY] [App.jsx](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/src/App.jsx)
- Register the new Route: `<Route path="/admin/packages/history" element={<PackageHistory />} />`.

#### [MODIFY] [api.js](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/src/lib/api.js)
- Wire up an API client entry: `packages.stats = () => request("/package_stats.php")`.

#### [MODIFY] [Dashboard.jsx](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/src/pages/admin/Dashboard.jsx)
- Update the state and API integration to look for `thisMonthRegistrations` instead of `todayCheckins`.
- Change the StatCard component title from "Today's Check-ins" to "This Month's Registrations", swapping out its internal icon.

#### [NEW] [PackageHistory.jsx](file:///c:/Users/Admin/Downloads/Vortex-gym-management-main/Vortex-gym-management-main/src/pages/admin/PackageHistory.jsx)
- Create the React Component mimicking the clean card-based UI seen in your POS and Finances page.
- Build a structured data table to iterate through the fetched package stats.
- Add quick metric summary cards at the top detailing total packages ever created and highest performing packages.

## Open Questions

1. Since your `mysql_schema.sql` forbids deleting packages that are tied to active/past subscriptions (`ON DELETE RESTRICT`), if a package like 'Eid Special Offer' needs to be hidden from new members but kept on history without causing errors, would you typically prefer setting an `is_active` or `is_hidden` column in the packages table later?
2. Are there any extra metrics you'd love for the Package History table right out of the gate?

## Verification Plan

### Automated Tests
- Refresh the Dashboard and read correct month registrations from the MySQL `profiles` table counting up members manually.

### Manual Verification
- Head to `/admin/packages/history`, ensure the page routes correctly.
- Assign a test member to a package, look to see the "active members" column dynamically update to reflect the newly assigned package.
- Delete or simulate editing a package and ensure historical count isn't destroyed.
