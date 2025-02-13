const express = require("express");
const router = express.Router();
const db = require("../db/db")

function getDateForTimeRange(timeRange) {
  const now = new Date()
  switch (timeRange) {
    case "lastDay":
      return new Date(now.setDate(now.getDate() - 1))
    case "lastWeek":
      return new Date(now.setDate(now.getDate() - 7))
    case "last30Days":
      return new Date(now.setDate(now.getDate() - 30))
    default:
      return null
  }
}

router.get("/instagram-users", async (req, res) => {
  console.log(req.query.limit);
  const page = Number.parseInt(req.query.page) || 1
  const limit = req.query.limit === 'all' ? null : Number.parseInt(req.query.limit) || 20;
  const sortBy = req.query.sortBy || "user_id"
  const sortOrder = req.query.sortOrder || "asc"
  const search = req.query.search || ""
  const offset = (page - 1) * limit

  try {
    let query = db("insta_users")

    if (search) {
      query = query
        .where("username", "ilike", `%${search}%`)
        .orWhereRaw('CAST("user_id" AS TEXT) ILIKE ?', [`%${search}%`])
        .limit(limit);
    }

    const totalCount = await query.clone().count("* as count").first()
    const users = await query.select("*").orderBy(sortBy, sortOrder).limit(limit).offset(offset)

    res.json({
      instagramUsers: users,
      totalCount: Number.parseInt(totalCount.count),
      totalPages: Math.ceil(Number.parseInt(totalCount.count) / limit),
      currentPage: page,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "An error occurred while fetching Instagram users" })
  }
});

router.get("/instagram-users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db("insta_users").where({ user_id: id }).first();

    if (!user) {
      return res.status(404).json({ error: "Instagram user not found" });
    }

    const emails = await db("insta_users_emails").where({ user_id: id });
    const links = await db("insta_users_links").where({ user_id: id });

    user.emails = emails;
    user.links = links;

    res.json(user);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the Instagram user" });
  }
});

router.get("/instagram-posts", async (req, res) => {
  const page = Number.parseInt(req.query.page) || 1;
  const limit = Number.parseInt(req.query.limit) || 20;
  const sortBy = req.query.sortBy || "post_id";
  const sortOrder = req.query.sortOrder || "asc";
  const search = req.query.search || "";
  const offset = (page - 1) * limit;

  try {
    // Count query (without groupBy)
    const totalCountQuery = db("insta_posts");

    if (search) {
      totalCountQuery
        .leftJoin("insta_users", "insta_posts.user_id", "insta_users.user_id")
        .leftJoin("movies", "insta_posts.movie_id", "movies.id")
        .where("insta_posts.caption", "ilike", `%${search}%`)
        .orWhere("insta_users.username", "ilike", `%${search}%`)
        .orWhere("movies.tmdb_title", "ilike", `%${search}%`);
    }

    const totalCount = await totalCountQuery.count("* as count").first();

    // Main query with pagination
    let query = db("insta_posts")
      .leftJoin("insta_users", "insta_posts.user_id", "insta_users.user_id")
      .leftJoin("movies", "insta_posts.movie_id", "movies.id")
      .select(
        "insta_posts.post_id", // Primary Key
        "insta_posts.caption",
        "insta_users.username",
        "insta_users.name as user_name",
        "movies.tmdb_title as movie_title"
      )
      .groupBy(
        "insta_posts.post_id",
        "insta_users.username",
        "insta_users.name",
        "movies.tmdb_title"
      )
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    if (search) {
      query = query
        .where("insta_posts.caption", "ilike", `%${search}%`)
        .orWhere("insta_users.username", "ilike", `%${search}%`)
        .orWhere("movies.tmdb_title", "ilike", `%${search}%`);
    }

    const posts = await query;

    // Fetch related data for each post (hashtags, mentions, media)
    await Promise.all(
      posts.map(async (post) => {
        const hashtags = await db("insta_post_hashtags")
          .where("post_id", post.post_id)
          .select("hashtag");
        post.hashtags = hashtags.map((h) => h.hashtag);

        const mentions = await db("insta_post_mentions")
          .where("post_id", post.post_id)
          .select("username", "mention_type");
        post.mentions = mentions;

        const media = await db("insta_posts_media")
          .where("post_id", post.post_id)
          .select("video_url", "thumbnail_url", "media_type");
        post.media = media;
      })
    );

    res.json({
      instagramPosts: posts,
      totalCount: Number.parseInt(totalCount.count),
      totalPages: Math.ceil(Number.parseInt(totalCount.count) / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching Instagram posts" });
  }
});

// Influencers Overview API
router.get("/influencers-overview", async (req, res) => {
  try {
    const timeRange = req.query.timeRange || "total"
    let query = db("insta_users")

    if (timeRange !== "total") {
      const dateColumn = "last_update" // Adjust this to the actual date column in your insta_users table
      query = query.where(dateColumn, ">=", getDateForTimeRange(timeRange))
    }

    const totalInfluencers = await query.count("* as count").first()
    const influencersWithEmails = await query
      .whereNotNull("business_email")
      .orWhereNotNull("biography_email")
      .count("* as count")
    
      // .first()
    const normalInfluencers = await query.where("ai_category", "Normal Influencer").count("* as count")
    const influencersWithCompleteScraping = await db("insta_posts").countDistinct("user_id as count")
    const instagramPosts = await query.count("* as count")
    const platformBifurcation = {
      Instagram: instagramPosts.count,
      Twitter: 0, // Add logic for Twitter users when available
      Youtube: 0, // Add logic for Youtube users when available
      Tiktok: 0, // Add logic for Tiktok users when available
    }

    const followersBifurcation = await db
  .select(db.raw(`
    JSONB_OBJECT_AGG(range, count) AS followers_bifurcation
  `))
  .from(
    db
      .select(
        db.raw(`
          CASE
            WHEN followers_count < 50000 THEN '<50k'
            WHEN followers_count BETWEEN 50000 AND 99999 THEN '50-100k'
            WHEN followers_count BETWEEN 100000 AND 499999 THEN '100-500k'
            WHEN followers_count BETWEEN 500000 AND 999999 THEN '500k-1m'
            ELSE '>1m'
          END as range
        `),
        db.raw(`COUNT(*) as count`)
      )
      .from("insta_users")
      .whereNotNull("business_email")
      .orWhereNotNull("biography_email")
      .where("ai_category", "=", "Normal Influencer") // Replace with actual category
      .groupBy("range")
      .as("counts") // Alias for subquery
  );
    
    res.json({
      totalInfluencers: totalInfluencers.count,
      influencersWithEmails: influencersWithEmails.count,
      normalInfluencers: normalInfluencers.count,
      influencersWithCompleteScraping: influencersWithCompleteScraping.count,
      platformBifurcation,
      followersBifurcation: followersBifurcation[0].followers_bifurcation,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "An error occurred while fetching influencers overview" })
  }
})

router.get("/posts-overview", async (req, res) => {
  try {
    const timeRange = req.query.timeRange || "total"
    let query = db("insta_posts")

    if (timeRange !== "total") {
      const dateColumn = "last_update" // Adjust this to the actual date column in your insta_posts table
      query = query.where(dateColumn, ">=", getDateForTimeRange(timeRange))
    }

    const totalPosts = await query.count("* as count")
    const instagramPosts = totalPosts[0].count // Since we're only dealing with Instagram posts for now
    const postsWithHashtags = await db("insta_post_hashtags").countDistinct("post_id as count").first()
    const postsLinkedToMovies = await query.whereNotNull("movie_id").count("* as count")

    const platformBifurcation = {
      Instagram: instagramPosts,
      Twitter: 0, // Add logic for Twitter posts when available
      Youtube: 0, // Add logic for Youtube posts when available
      Tiktok: 0, // Add logic for Tiktok posts when available
    }

    const instagramPostsWithHashtags = await db("insta_post_hashtags")
      .select(db.raw("COUNT(DISTINCT hashtag) as hashtag_count"))
      .count("* as post_count")
      .groupBy("post_id")
      .then((results) => {
        return {
          "1 hashtag": results.filter((r) => r.hashtag_count === 1).length,
          "2 hashtags": results.filter((r) => r.hashtag_count === 2).length,
          "3 hashtags": results.filter((r) => r.hashtag_count === 3).length,
          ">3 hashtags": results.filter((r) => r.hashtag_count > 3).length,
        }
      })

    res.json({
      totalPosts: totalPosts[0].count,
      instagramPosts,
      postsWithHashtags: postsWithHashtags.count,
      postsLinkedToMovies: postsLinkedToMovies[0].count,
      platformBifurcation,
      instagramPostsWithHashtags,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "An error occurred while fetching posts overview" })
  }
})

module.exports = router;
