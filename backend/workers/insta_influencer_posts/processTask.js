const logger = require("./logger");
const {
  DB_template_post,
  DB_template_mentions,
} = require("../instagram/templates");
const {
  upload_to_bunny_cdn,
  saveCarouselMedia,
  DB_store_hashtags,
  DB_store_mentions,
} = require("../instagram/processTask");
const db = require("../../db/db");
const INSTA_RAPID_API_URL = process.env.INSTA_RAPID_API_URL;
const INSTA_RAPID_API_KEY = process.env.INSTA_RAPID_API_KEY;

async function setTask(task_id, status, total_posts) {
  try {
    await db("influencer_posts_tasks")
      .where("task_id", task_id)
      .update({ status, total_posts });
  } catch (error) {
    logger.error("Error:", error);
    throw error;
  }
}

async function fetchPosts(username, post_limit=500, type) {
  let url = `${INSTA_RAPID_API_URL}/v1/${type}?username_or_id_or_url=${username}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": INSTA_RAPID_API_KEY,
      "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com",
    },
  };
  let postList = [];
  const maxRetries = 3;
  while (postList.length < post_limit) {
    //retries
    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let response = await fetch(url, options);
        if (response.status != 200) {
          throw new Error(
            `Request failed to retrieve ${type} with status`,
            response.status
          );
        }
        let data = await response.json();
        postList = postList.concat(data.data.items);
        logger.info(
          `${postList.length}/${post_limit} ${type} fetched for ${username}`
        );
        if (data.data.items.at(-1).taken_at < 1640975400) {
          success = true;
          break;
        }
        if (data.pagination_token) {
          url = `${INSTA_RAPID_API_URL}/v1/posts?username_or_id_or_url=${username}&pagination_token=${data.pagination_token}`;
        } else {
          success = true;
          break;
        }
      } catch (error) {
        console.log(error);

        logger.warn(
          `🟡 Attempt ${attempt} failed for ${username} with error: ${error.message}`
        );
        if (attempt == maxRetries) {
          logger.error(
            `🔴 Error at getting ${type} for ${username} after ${maxRetries} attempts`
          );
          if (postList.length === 0) {
            return {
              status: 500,
              success: false,
              error: error.message,
              message: `🔴 Error at getting posts for ${username} after ${maxRetries} attempts`,
            };
          } else {
            return {
              status: 500,
              success: true,
              data: postList,
              message: `⚪ Partial ${type} retrieved at fetchPosts(user=${username}) | Received ${postList.length} ${type}`,
            };
          }
        }
      }
    }
    if (success) break;
  }
  const removeUndefined = postList.filter((item) => item !== undefined);
  const newPostDataList = removeUndefined.filter((item, index) => {
    return index === postList.findIndex((obj) => obj.code === item.code);
  });
  logger.info(
    `⚪ Success at fetchPosts(user=${username}) | Received ${newPostDataList.length} ${type}`
  );
  return {
    status: 200,
    success: true,
    data: newPostDataList,
    message: `⚪ Success at fetchPosts(user=${username}) | Received ${newPostDataList.length} ${type}`,
  };
}

async function DB_store_mapping(post_id, user_id, movie_id, platform, trx) {
  try {
    await trx("post_influencer_movie_map").insert({
      post_id,
      user_id,
      movie_id,
      platform,
    });
  } catch (error) {
    logger.error("Error is storing mapping: ", error);
  }
}

async function DB_store_post(trx, postData, task_id, user_id, followers_count) {
  try {
    const insta_user_id = postData["user"]["id"];
    const template = DB_template_post(postData, null, null, followers_count);

    // Step 1: Upsert post (insert if not exists, update if exists)
    const existingPost = await trx("insta_posts")
      .select(["post_id", "taskids"])
      .where("insta_post_id", postData["id"])
      .first();

    let post_id;
    if (!existingPost) {
      // Insert new post
      const insertedPost = await trx("insta_posts")
        .insert(template)
        .returning("post_id");
      post_id = insertedPost[0].post_id;
      
      // Directly insert task_id field
      await trx("insta_posts").update({ taskids: `"${task_id}"` }).where("post_id", post_id);
    } else {
      // Update existing post
      post_id = existingPost.post_id;
      let taskidsArray = existingPost.taskids
        ? existingPost.taskids.split(",").map((id) => id.trim().replace(/['"]+/g, ""))
        : [];
      taskidsArray.push(task_id.toString());
      const newTaskids = taskidsArray.map((id) => `"${id}"`).join(", ");
      
      await trx("insta_posts").update({ taskids: newTaskids }).where("post_id", post_id);
      await trx("insta_posts").update(template).where("post_id", post_id);
    }

    // Step 2: Process media asynchronously
    const mediaUploadPromises = [];
    
    if (postData["media_name"] === "album") {
      mediaUploadPromises.push(saveCarouselMedia(postData["carousel_media"], post_id, trx));
    } else {
      mediaUploadPromises.push(
        upload_to_bunny_cdn(template["thumbnail_img"], "prakhar/instagram", post_id, "post")
          .then((res) => trx("insta_posts").update({ thumbnail_img: res.image_url }).where("post_id", post_id))
      );
      if (template["video_url"]) {
        mediaUploadPromises.push(
          upload_to_bunny_cdn(template["video_url"], "prakhar/instagram", post_id, "video")
            .then((res) => trx("insta_posts").update({ video_url: res.image_url }).where("post_id", post_id))
        );
      }
    }

    if (template["music_cover_img"]) {
      mediaUploadPromises.push(
        upload_to_bunny_cdn(template["music_cover_img"], "prakhar/instagram", post_id, "music")
          .then((res) => {
            if (res.image_url) {
              return trx("insta_posts").update({ music_cover_img: res.image_url }).where("post_id", post_id);
            } else {
              logger.warn(`🟡 Error uploading music cover image for post ${post_id}`);
            }
          })
      );
    }

    // Step 3: Store influencer-post mapping (Runs in parallel)
    const storeMappingPromise = DB_store_mapping(post_id, user_id, null, "instagram", trx);

    // Step 4: Process hashtags and mentions concurrently
    const hashtags = postData.caption_hashtag || postData.caption?.hashtags || [];
    const mentions = postData.caption_mention || postData.caption?.mentions || [];
    const tagged_users = postData.tagged_users?.map((user) => ({
      username: user.user.username,
      id: user.user.id,
    }));

    const hashtagsPromise = hashtags.length > 0 ? DB_store_hashtags(trx, hashtags, post_id) : Promise.resolve();
    
    const mentionsPromise = (mentions || tagged_users)
      ? DB_store_mentions(trx, DB_template_mentions(mentions, tagged_users, post_id), post_id)
      : Promise.resolve();

    // Step 5: Wait for all async operations to complete
    await Promise.all([
      ...mediaUploadPromises,
      storeMappingPromise,
      hashtagsPromise,
      mentionsPromise,
    ]);

    return { status: 200, success: true, message: "Post Stored Successfully" };

  } catch (error) {
    return { status: 500, success: false, message: error.message };
  }
}


async function savePosts(postsData, user_id, task_id, followers_count) {
  const trx = await db.transaction();
  try {
    const chunkSize = 10; // Number of posts to process in parallel

    for (let i = 0; i < postsData.length; i += chunkSize) {
      const postBatch = postsData.slice(i, i + chunkSize);

      // Process multiple posts in parallel
      await Promise.all(postBatch.map((post) => 
        DB_store_post(trx, post, task_id, user_id, followers_count)
      ));

      logger.info(`⚪ Stored ${i + postBatch.length}/${postsData.length} posts`);
    }

    await trx.commit();
    logger.info(`⚪ Success: All posts stored successfully for task_id = ${task_id}`);
    return { status: 200, success: true };
  } catch (error) {
    await trx.rollback();
    logger.error(`🔴 Error at savePosts(task_id = ${task_id}) | ${error.message}`);
    return { status: 500, success: false, message: error.message };
  }
}}

async function processTask(
  task_id,
  user_id,
  username,
  followers_count,
  post_limit
) {
  try {
    // Fetch the user's posts
    const postFetchResponse = await fetchPosts(username, post_limit, "posts");
    if (postFetchResponse.status != 200) {
      logger.info(
        `🔴 Error in fetching posts for ${username}, only ${postFetchResponse.data.length} posts fetched`
      );
      return { status: 500, success: false };
    }
    const postData = postFetchResponse.data;

    //Fetch the user's reels
    // const reelFetchResponse = await fetchPosts(username, post_limit, "reels");
    // if(postFetchResponse.status != 200){
    //     logger.info(`🔴 Error in fetching reels for ${username}, only ${reelFetchResponse.data.length} posts fetched`);
    //     return { status: 500, success: false};
    // }
    // const reelData = reelFetchResponse.data;

    // Save the posts to the database
    const saveResponse = await savePosts(
      postData,
      user_id,
      task_id,
      followers_count
    );
    if (saveResponse.status != 200) {
      return { status: 500, success: false, message: "Error in saving posts" };
    }
    return { success: true, total_posts: 1 };
  } catch (error) {
    logger.error("Error processing task:", error);
    return { success: false };
  }
}

module.exports = { setTask, processTask };
