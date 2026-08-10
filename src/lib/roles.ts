// The privileged role used to gate admin UI, read from the JWT roles in the session.
// Must match the API's RoleNames.Admin. The full assignable-role list is NOT kept here —
// it is fetched from GET /api/admin/roles (see adminService.getRoles).
export const ADMIN_ROLE = 'Admin';
