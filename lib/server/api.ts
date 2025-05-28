/**
 * Validates the user's identity in admin-only mode
 * @param userId - The ID of the user (should be "admin").
 * @returns True if valid admin user, null otherwise.
 */
export async function validateUserIdentity(
  userId: string,
  // _isAuthenticated: boolean // Not used in admin-only mode
): Promise<boolean | null> {
  // In admin-only mode, only "admin" user is valid
  return userId === "admin" ? true : null
}
