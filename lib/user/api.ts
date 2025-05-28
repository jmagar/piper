// Admin-only user API
const ADMIN_USER = {
  id: "admin",
  display_name: "Admin", 
  profile_image: "",
  system_prompt: null,
  anonymous: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export async function getUserProfile() {
  return ADMIN_USER
} 