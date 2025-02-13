const db = require("../db/db");
const { geminiCheckSpam } = require("../workers/instagram/gemini")

function DB_template_post_for_AI_Categorization(postData) {
  const template = {
    insta_post_id: postData?.id || null,
    shortcode: postData?.code || null,
    post_type: postData?.media_name || null,
    taken_at: postData?.taken_at_ts ? new Date(postData?.taken_at_ts * 1000) : null,
    caption: postData?.caption_text || null,
    likes_count: postData?.like_count,
    comments_count: postData?.comment_count,
    views_count: postData?.is_video === true ? postData?.view_count : null,
    plays_count: postData?.is_video === true ? postData?.play_count : null,
    video_duration: postData?.is_video === true ? parseInt(postData?.video_duration, 10) : null,
    username: postData?.user?.username || null,
    full_name: postData?.user?.full_name || null,
  }

  return template
}

async function matchPostToMovie(post) {
  const { post_id, hashtags } = post;
  const postData = await db("insta_posts").where("post_id", post_id).first();

  for (var hashtag of hashtags) {
    try {
      if (hashtag[0] === '#') {
        hashtag = hashtag.slice(1);
      }
      const movieId = await db("movie_hashtags")
        .select("movie_id")
        .whereRaw("LOWER(hashtag) = ?", hashtag.toLowerCase())
        .first();
      if (!movieId) {
        console.log("No movie found for hashtag: ", hashtag);
        return { status: 200, success: true, message: `No movie found for hashtag: ${hashtag}` };
      }
      console.log(post_id);
      const postTemplate = DB_template_post_for_AI_Categorization(postData);
      const Movie_Data_Raw = (await db('movies').where('id', movieId.movie_id).select('original_title', 'imdb_id', 'origin_release_date').first());
      const Movie_Actors = await db('movie_crew')
        .join('crew', 'movie_crew.crew_id', 'crew.id') // Join movie_crew with crew on crew_id
        .where('movie_crew.movie_id', movieId.movie_id)        // Filter by movie_id
        .andWhere(function () {
          this.where('crew.job', 'actor').orWhere('crew.job', 'actress'); // Filter by job as 'actor' or 'actress'
        })
        .select('crew.full_name as name');

      const Movie_Data = { ...Movie_Data_Raw, popular_characters: Movie_Actors };
      const is_spam = (await geminiCheckSpam(postTemplate, Movie_Data))

      if (is_spam.spam) {
        console.log(`Post: ${post_id} is spam`);
        return { status: 200, success: true, message: `Post: ${post_id} is spam` };
      }
      const existingEntry = await db("post_influencer_movie_map")
        .where("post_id", post_id)
        .first();

      if (existingEntry && !existingEntry.movie_id) {

        await db("post_influencer_movie_map")
          .where("post_id", post_id)
          .update({ movie_id: movieId.movie_id });
        return { status: 200, success: true, message: `movie_id: ${movieId.movie_id} added to post: ${post_id}` };
      }
      else {
        const movieExists = await db("post_influencer_movie_map")
          .select("movie_id")
          .where("post_id", post_id)
          .andWhere("movie_id", movieId.movie_id);

        if (movieExists.length > 0) {
          return { status: 200, success: true, message: `Movie already exists for post: ${post_id}` };
        }
        await db("post_influencer_movie_map").insert({
          post_id: post_id,
          movie_id: movieId.movie_id,
          user_id: existingEntry.user_id,
          platform: "instagram",
        });
        return { status: 200, success: true, message: `movie_id: ${movieId.movie_id} added to post: ${post_id}` };
      }
    } catch (error) {
      console.error(error);
      return { status: 500, success: false, error: error.message, message: `🔴 Error at matchPostToMovie() after ${attempt} attempts` };
    }
  }

}


async function main() {
  try {
    const postsWithHashtags = await db("insta_post_hashtags")
      .select("post_id")
      .groupBy("post_id")
      .select(db.raw("ARRAY_AGG(hashtag) as hashtags"));
    console.log(postsWithHashtags[0]);

    for (var i = 100000; i < 100001; i++) {
      const res = matchPostToMovie(postsWithHashtags[i]);
      if(res.status !== 200) {
        console.error(`🔴 Error at matchPostToMovie()`, res.error);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

// async function populate_existing_map() {
//     const posts = await db("insta_posts")
//         .select("post_id", "movie_id", "user_id")
//         .whereNotNull("movie_id")
//         .whereNotNull("user_id");

//     for (const post of posts) {
//         const { post_id, movie_id, user_id } = post;

//         const existingEntry = await db("post_influencer_movie_map")
//             .where("post_id", post_id)
//             .andWhere("movie_id", movie_id)
//             .first();

//         if (!existingEntry) {
//             await db("post_influencer_movie_map").insert({
//                 post_id: post_id,
//                 movie_id: movie_id,
//                 user_id: user_id,
//                 platform: "instagram",
//             });
//             console.log(`movie_id: ${movie_id} added to post: ${post_id}`);
//         } else {
//             console.log(`Entry already exists for post: ${post_id} with movie_id: ${movie_id}`);
//         }
//     }
// }

main();
// module.exports = post_movie_match;
