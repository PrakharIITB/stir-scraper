const db = require("../db/db");
const logger = require("../logs/logger");
const matchPostToMovie = require("./post_movie_matching")

async function getPostsWithoutHashtags(params) {
    const posts = await db('insta_posts')
        .leftJoin('insta_post_hashtags', 'insta_posts.post_id', 'insta_post_hashtags.post_id')
        .whereNull('insta_post_hashtags.post_id')
        .select('insta_posts.*');

    return { status: 200, success: true, data: posts, count: posts.length, message: `⚪ Success at getPostsWithoutHashtags()` };
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
                console.log(`🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts`);
                return { status: 500, success: false, error: error.message, message: `🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts` };
            }
        }
    }

    if (!success) {
        console.log(`🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts`);
        return { status: 500, success: false, error: error.message, message: `🔴 Error at getPostData(shortcode=${shortcode}) after ${attempt} attempts` };
    }

    return { status: 200, success: true, data: data, count: 1, message: `⚪ Success at getPostData(shortcode=${shortcode})` };
}

async function updateHashtagData(postId, hashtags) {
    try {
        await db('insta_post_hashtags').insert(
            hashtags.map(hashtag => ({
                post_id: postId,
                hashtag: hashtag
            }))
        );

        const postData = { post_id: postId, hashtags }
        const res = await matchPostToMovie(postData);
        if (!res.success) {
            throw new Error(`Error in matching post to movie with post_id=${postId}`)
        }
        return { status: 200, success: true, message: `⚪ Success at updating hashtag data and matching post to movie for post_id=${postId}` }

    } catch (error) {
        return { status: 500, success: false, error: error.message, message: `🔴 Error updating post hashtag data for post_id=${postId}` }
    }
}

async function main() {
    const response = await getPostsWithoutHashtags();
    console.log(response.data.length);
    for (const post of response.data) {
        try {
            const shortcode = post.shortcode;
            const res = await getPostData(shortcode);
            if (res.status !== 200) {
                console.error(`🔴 Error at getPostData()`, res.error);
            }
            const postData = res.data;
            if ('caption' in postData && postData.caption?.hashtags.length > 0) {
                const response = await updateHashtagData(post.post_id, postData.caption.hashtags)
                if (!response.success) {
                    throw new Error(response.error)
                }
            }
        } catch (error) {
            logger.error(`Error while processing post_id=${post.post_id} with error: ${error.message}`)
        }
    }
}

main()