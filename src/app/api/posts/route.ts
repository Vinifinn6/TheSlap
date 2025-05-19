import { NextResponse } from "next/server"
import { getSession } from "@auth0/nextjs-auth0"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    let query = `
      SELECT 
        p.id, p.content, p.created_at, p.mood_text, p.mood_emoji,
        u.id as user_id, u.username, u.display_name, u.profile_image,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
    `

    const params = []

    if (userId) {
      query += " WHERE p.user_id = $1"
      params.push(userId)
    }

    query += `
      GROUP BY p.id, u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `

    const result = await sql.query(query, params)

    // For each post, fetch comments
    const posts = await Promise.all(
      result.rows.map(async (post) => {
        const commentsQuery = `
          SELECT 
            c.id, c.content, c.created_at,
            u.id as user_id, u.username, u.display_name, u.profile_image,
            COALESCE(json_agg(ci.image_url) FILTER (WHERE ci.image_url IS NOT NULL), '[]') as images
          FROM comments c
          JOIN users u ON c.user_id = u.id
          LEFT JOIN comment_images ci ON c.id = ci.comment_id
          WHERE c.post_id = $1
          GROUP BY c.id, u.id
          ORDER BY c.created_at ASC
        `

        const commentsResult = await sql.query(commentsQuery, [post.id])

        return {
          ...post,
          comments: commentsResult.rows,
        }
      }),
    )

    return NextResponse.json(posts)
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json({ error: "Error fetching posts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, moodText, moodEmoji, images, mentions } = await request.json()

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Insert post
    const postResult = await sql`
      INSERT INTO posts (user_id, content, mood_text, mood_emoji) 
      VALUES (${session.user.sub}, ${content}, ${moodText || null}, ${moodEmoji || null}) 
      RETURNING id, created_at
    `

    const postId = postResult[0].id

    // Process images
    if (images && images.length > 0) {
      for (const image of images) {
        await sql`
          INSERT INTO post_images (post_id, image_url) 
          VALUES (${postId}, ${image})
        `
      }
    }

    // Process mentions
    if (mentions && mentions.length > 0) {
      for (const username of mentions) {
        // Check if user exists
        const userResult = await sql`SELECT id FROM users WHERE username = ${username}`

        if (userResult && userResult.length > 0) {
          const mentionedUserId = userResult[0].id

          await sql`
            INSERT INTO mentions (post_id, user_id) 
            VALUES (${postId}, ${mentionedUserId})
          `
        }
      }
    }

    // Fetch the complete post to return
    const query = `
      SELECT 
        p.id, p.content, p.created_at, p.mood_text, p.mood_emoji,
        u.id as user_id, u.username, u.display_name, u.profile_image,
        COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        0 as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      WHERE p.id = $1
      GROUP BY p.id, u.id
    `

    const result = await sql.query(query, [postId])

    return NextResponse.json(
      {
        ...result.rows[0],
        comments: [],
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json({ error: "Error creating post" }, { status: 500 })
  }
}
