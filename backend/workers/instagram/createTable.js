const db = require("./../../database/db");

async function clearTablesforFreshTesting() {
  await db("insta_users_links").del();
  await db("insta_users_emails").del();
  await db("insta_posts").del();
  await db("insta_users").del();
  await db("insta_post_mentions").del();
  await db("insta_post_hashtags").del();
  await db("insta_credits_usage").del();
  console.log("Tables Cleared Successfully");
}

async function createTables() {
  // insta_credits_usage table
  const instaCreditsUsageExists = await db.schema.hasTable(
    "insta_credits_usage"
  );
  if (!instaCreditsUsageExists) {
    await db.schema.createTable("insta_credits_usage", (table) => {
      table.increments("id").primary();
      table.string("endpoint", 255).notNullable();
      table.string("query", 255).notNullable();
      table.string("extras", 255).notNullable();
      table.integer("credits").notNullable();
      table.timestamp("timestamp").defaultTo("2024-09-09 21:57:39.371489");
    });
  }

  // insta_post_hashtags table
  const instaPostHashtagsExists = await db.schema.hasTable(
    "insta_post_hashtags"
  );
  if (!instaPostHashtagsExists) {
    await db.schema.createTable("insta_post_hashtags", (table) => {
      table.integer("post_id");
      table.string("hashtag", 300);
      table
        .timestamp("created_at")
        .defaultTo("2024-09-09 20:39:29.471789+05:30");
    });
  }

  // insta_post_mentions table
  const instaPostMentionsExists = await db.schema.hasTable(
    "insta_post_mentions"
  );
  if (!instaPostMentionsExists) {
    await db.schema.createTable("insta_post_mentions", (table) => {
      table.integer("post_id");
      table.string("username", 255);
      table.string("mention_type", 255);
      table.string("insta_user_id", 255);
      table
        .timestamp("created_at")
        .defaultTo("2024-09-09 20:39:18.304691+05:30");
    });
  }

  // insta_posts table
  const instaPostsExists = await db.schema.hasTable("insta_posts");
  if (!instaPostsExists) {
    await db.schema.createTable("insta_posts", (table) => {
      table.increments("post_id").primary();
      table.string("insta_post_id", 255);
      table.string("location_id", 255);
      table.double("location_lat");
      table.double("location_lng");
      table.string("shortcode", 255);
      table.integer("user_id").notNullable();
      table.integer("movie_id").notNullable();
      table.string("post_type", 255);
      table.timestamp("taken_at");
      table.text("caption");
      table.integer("likes_count");
      table.integer("comments_count");
      table.integer("views_count");
      table.integer("plays_count");
      table.integer("video_duration");
      table.text("thumbnail_img");
      table.boolean("has_hashtags");
      table.boolean("has_mentioned");
      table.boolean("comments_disabled");
      table.boolean("like_and_view_counts_disabled");
      table.string("music_id", 255);
      table.string("music_name", 255);
      table.string("music_artist_name", 255);
      table.text("music_cover_img");
      table.timestamp("last_update").defaultTo(db.fn.now());
    });
  }

  // insta_users table
  const instaUsersExists = await db.schema.hasTable("insta_users");
  if (!instaUsersExists) {
    await db.schema.createTable("insta_users", (table) => {
      table.increments("user_id").primary();
      table.string("insta_user_id", 255);
      table.string("username", 255);
      table.boolean("is_private");
      table.boolean("is_verified");
      table.string("name", 255);
      table.text("biography");
      table.text("profile_photo_hd");
      table.text("external_url");
      table.integer("followers_count");
      table.integer("followings_count");
      table.integer("posts_count");
      table.boolean("is_business");
      table.string("business_email", 255);
      table.string("biography_email", 255);
      table.string("business_countrycode", 10);
      table.string("business_number", 20);
      table.string("country", 200);
      table.string("category", 255);
      table.string("ai_category", 255);
      table.boolean("has_anonymous_profile_picture");
      table.timestamp("date_joined");
      table.timestamp("date_verified");
      table.integer("former_username_count");
      table.bigInteger("latest_reel_media");
      table.timestamp("last_update").defaultTo(db.fn.now());
    });
  }

  // insta_users_emails table
  const instaUsersEmailsExists = await db.schema.hasTable("insta_users_emails");
  if (!instaUsersEmailsExists) {
    await db.schema.createTable("insta_users_emails", (table) => {
      table.integer("user_id");
      table.string("email", 400);
      table.string("source", 255);
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  }

  // insta_users_links table
  const instaUsersLinksExists = await db.schema.hasTable("insta_users_links");
  if (!instaUsersLinksExists) {
    await db.schema.createTable("insta_users_links", (table) => {
      table.integer("user_id");
      table.text("url");
      table.string("source", 255);
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.string("platform", 255);
    });
  }
}

module.exports = { createTables, clearTablesforFreshTesting };
