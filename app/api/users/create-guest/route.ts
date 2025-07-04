export async function POST() {
  try {
    // In admin-only mode, return the hardcoded admin user
    return new Response(
      JSON.stringify({ 
        user: { 
          id: "admin", 
          anonymous: false,
          display_name: "Admin",
          email: "admin@local",
          created_at: new Date().toISOString(),
        } 
      }),
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error("Error in create-guest endpoint:", err)
    
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500 }
    )
  }
}
