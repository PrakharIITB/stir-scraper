const express = require("express");
const router = express.Router();
const db = require("../db/db")

router.get("/instagram-users", async (req, res) => {
  const page = Number.parseInt(req.query.page) || 1
  const limit = Number.parseInt(req.query.limit) || 20
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

module.exports = router;
