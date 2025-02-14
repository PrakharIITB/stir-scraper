const express = require("express")
const router = express.Router()
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
        const timeRange = req.query.timeRange || "total";
        const dateColumn = "last_update"; // Ensure this column is indexed
        let query = db("insta_posts");

        if (timeRange !== "total") {
            query = query.where(dateColumn, ">=", getDateForTimeRange(timeRange));
        }

        // Run queries in parallel
        const [totalPosts, postsWithHashtags, postsLinkedToMovies, hashtagCounts] = await Promise.all([
            query.count("* as count").first(),
            db("insta_post_hashtags").countDistinct("post_id as count").first(),
            db("post_influencer_movie_map").whereNotNull("movie_id").count("* as count").first(),
            db("insta_post_hashtags")
                .select("post_id")
                .groupBy("post_id")
                .select(db.raw("COUNT(DISTINCT hashtag) as hashtag_count"))
        ]);

        // Optimizing hashtag count aggregation
        const instagramPostsWithHashtags = {
            "1 hashtag": hashtagCounts.filter(r => parseInt(r.hashtag_count, 10) === 1).length,
            "2 hashtags": hashtagCounts.filter(r => parseInt(r.hashtag_count, 10) === 2).length,
            "3 hashtags": hashtagCounts.filter(r => parseInt(r.hashtag_count, 10) === 3).length,
            ">3 hashtags": hashtagCounts.filter(r => parseInt(r.hashtag_count, 10) > 3).length,
        };

        res.json({
            totalPosts: totalPosts.count,
            instagramPosts: totalPosts.count,
            postsWithHashtags: postsWithHashtags.count,
            postsLinkedToMovies: postsLinkedToMovies.count,
            platformBifurcation: {
                Instagram: totalPosts.count,
                Twitter: 0,
                Youtube: 0,
                Tiktok: 0,
            },
            instagramPostsWithHashtags,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred while fetching posts overview" });
    }
});


// Movies Overview API
router.get("/movies-overview", async (req, res) => {
    try {
        const timeRange = req.query.timeRange || "total"
        let query = db("movies")

        if (timeRange !== "total") {
            const dateColumn = "created_at" // Adjust this to the actual date column in your movies table
            query = query.where(dateColumn, ">=", getDateForTimeRange(timeRange))
        }

        const totalMovies = await query.count("* as count").first()
        const moviesWithExternalLinks = await query
            // .whereNotNull("website")
            .orWhereNotNull("instagram_id")
            .orWhereNotNull("twitter_id")
            .count("* as count")
        // .first()
        const moviesWithHashtags = await db("movie_hashtags").countDistinct("movie_id as count").first()
        const moviesScrapedOnSocialMedia = await db("insta_posts").countDistinct("movie_id as count").first()

        const yearBifurcation = await db("movies")
            .select(db.raw("EXTRACT(YEAR FROM origin_release_date) as year"))
            .count("* as count")
            .groupBy("year")
            .orderBy("year", "desc")
            .limit(5)

        const countryBifurcation = await db("movies")
            .select("origin_country")
            .count("* as count")
            .groupBy("origin_country")
            .orderBy("count", "desc")
            .limit(5)

        const languageBifurcation = await db("movies")
            .select("original_language")
            .count("* as count")
            .groupBy("original_language")
            .orderBy("count", "desc")
            .limit(5)

        res.json({
            totalMovies: totalMovies.count,
            moviesWithExternalLinks: moviesWithExternalLinks.count,
            moviesWithHashtags: moviesWithHashtags.count,
            moviesScrapedOnSocialMedia: moviesScrapedOnSocialMedia.count,
            yearBifurcation: Object.fromEntries(yearBifurcation.map((item) => [item.year, item.count])),
            countryBifurcation: Object.fromEntries(countryBifurcation.map((item) => [item.origin_country, item.count])),
            languageBifurcation: Object.fromEntries(languageBifurcation.map((item) => [item.original_language, item.count])),
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "An error occurred while fetching movies overview" })
    }
})

module.exports = router