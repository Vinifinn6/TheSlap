import { NextResponse } from "next/server"
import { getSession } from "@auth0/nextjs-auth0"
import { initDatabase, sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await getSession()

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize database
    await initDatabase()

    // Check if current user exists in database
    const userResult = await sql`SELECT id FROM users WHERE id = ${session.user.sub}`

    // If user doesn't exist, create them
    if (!userResult || userResult.length === 0) {
      // Extract username from email or create one based on name
      let username = session.user.email
        ? session.user.email.split("@")[0]
        : session.user.name?.toLowerCase().replace(/\s+/g, "")

      // Ensure username is unique
      let isUnique = false
      let counter = 1
      const baseUsername = username

      while (!isUnique) {
        const checkResult = await sql`SELECT id FROM users WHERE username = ${username}`

        if (!checkResult || checkResult.length === 0) {
          isUnique = true
        } else {
          username = `${baseUsername}${counter}`
          counter++
        }
      }

      await sql`
        INSERT INTO users (id, username, display_name, profile_image) 
        VALUES (${session.user.sub}, ${username}, ${session.user.name || "User"}, ${session.user.picture || null})
      `
    }

    return NextResponse.json({
      success: true,
      message: "Initial setup completed successfully",
    })
  } catch (error) {
    console.error("Error in initial setup:", error)
    return NextResponse.json(
      {
        error: "Error in database initial setup",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
