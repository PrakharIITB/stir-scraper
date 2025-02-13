const db = require("../db/db");
const logger = require("../logs/logger");
require("dotenv").config();
const INSTA_RAPID_API_URL = process.env.INSTA_RAPID_API_URL;
const INSTA_RAPID_API_KEY = process.env.INSTA_RAPID_API_KEY;

function DB_template_post ( postData, follower_count ) {
    const likes_count = 'metrics' in postData ? postData?.metrics?.like_count : null;
    const caption = 'caption' in postData ? postData?.caption : null;
    const template = {
        insta_post_id: postData?.id || null,
        location_id: postData?.location?.external_id || null,
        location_lat: postData?.location?.lat || null,
        location_lng: postData?.location?.lng || null,
        post_type: postData?.media_name || null,
        taken_at: postData?.taken_at ? new Date(postData?.taken_at * 1000) : null,
        caption: caption?.text || null,
        likes_count: likes_count,
        comments_count: 'metrics' in postData ? postData?.metrics?.comment_count : 0,
        likes_to_followers_ratio : likes_count / follower_count,
        views_count: 'metrics' in postData ? postData?.metrics?.view_count : null,
        plays_count: 'metrics' in postData ? postData?.metrics?.play_count : null,
        video_duration: postData?.is_video === true ? parseInt(postData?.video_duration, 10) : 0,
        is_paid_partnership: postData?.is_paid_partnership,
        last_update: new Date()
      }

      return template
}


async function getPostsWithMovies() {
    try {
        const posts = await db("insta_posts")
            .join("post_influencer_movie_map", "insta_posts.post_id", "post_influencer_movie_map.post_id")
            .join("insta_users", "post_influencer_movie_map.user_id", "insta_users.user_id")
            .select("insta_posts.shortcode", "insta_users.followers_count")
            .whereNotNull("post_influencer_movie_map.movie_id")
            .distinct()
        return { status: 200, success: true, data: posts, count: posts.length, message: `⚪ Success at getPostsWithMovies()` };
    } catch (error) {
        console.error(`🔴 Error at getPostsWithMovies()`, error);
        return { status: 500, success: false, error: error.message, message: `🔴 Error at getPostsWithMovies()` };
    }
}

async function getPostData(shortcode) {
    const INSA_RAPID_API_GET_OPTIONS = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': INSTA_RAPID_API_KEY,
            'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
    };
      const url = `${INSTA_RAPID_API_URL}/v1/post_info?code_or_id_or_url=${shortcode}&include_insights=true`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(url, INSA_RAPID_API_GET_OPTIONS);
          if (response.status !== 200) {
            throw new Error(`Request failed with status ${response.status}`);
          }
    
          data = await response.json();
          success = true;
          break;
        } catch (error) {
          console.log(`🟡 Attempt ${attempt} failed for getPostData(shortcode=${shortcode}) with error: ${error.message}`);
    
          if (attempt === 3) {
            console.log(`🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts` );
            return { status: 500, success: false, error: error.message, message: `🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts`};
          }
        }
      }
    
      if (!success) {
        console.log(`🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts`);
        return { status: 500, success: false, error: error.message, message: `🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts`};
      }
    
      return { status: 200, success: true, data: data, count: 1, message: `⚪ Success at getPostData(shortcode=${shortcode})`};
}

async function updatePostMetrics(shortcode, follower_count) {
    try {
        const response = await getPostData(shortcode);

        const data = response.data.data;

        const template = DB_template_post(data, follower_count);
        const post = await db("insta_posts").where("shortcode", shortcode).update(template);
        
        return { status: 200, success: true, message: `✅ Updated post shortcode=${shortcode}` };
    } catch (error) {
        console.error(`🔴 Error at updatePostMetrics(shortcode=${shortcode})`, error);
        return { status: 500, success: false, error: error.message, message: `🔴 Error at updatePostMetrics(shortcode=${shortcode})` };
    }
}

async function main() {
    const response = await getPostsWithMovies();
    const posts = response.data;
    console.log(posts);
    try {
        for (const post of posts) {
            const { shortcode, followers_count } = post;
            const response = await updatePostMetrics(shortcode, followers_count);
            if (response.status !== 200) {
                console.error(`🔴 Error updating post with shortcode=${shortcode}`);
                continue;
            }
            console.log(`✅ Updated post with shortcode=${shortcode}`);
        }
        console.log(`✅ Updated all posts`);
    } catch (error) {
        console.error(`🔴 Error updating posts`, error);
    }
}

main();