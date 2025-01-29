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

async function fetchPosts(username, post_limit = 1000, type) {
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
  /**
   * Stores the post in the database.
   * If the post already exists in the database, it is updated.
   * If the post doesn't exist in the database, it is inserted.
   **/
  try {
    // Getting UserID from Insta User ID
    const insta_user_id = postData["user"]["id"];

    const template = DB_template_post(postData, null, null, followers_count);
    // checking if the post exists
    let post_id = null;

    // If post doesn't exist, insert a new record with null values and get the new post_id
    const existingPost = await trx("insta_posts")
      .select("post_id")
      .where("insta_post_id", postData["id"])
      .first();

    if (!existingPost) {
      post_id = (
        await trx("insta_posts").insert(template).returning("post_id")
      )[0].post_id;
      await trx("insta_posts")
        .update({ taskids: `"${task_id}"` })
        .where("post_id", post_id);
    } else {
      const taskids = (
        await trx("insta_posts")
          .select("taskids")
          .where("post_id", existingPost.post_id)
          .first()
      ).taskids;
      let taskidsArray = taskids
        ? taskids.split(",").map((id) => id.trim().replace(/['"]+/g, ""))
        : [];
      taskidsArray.push(task_id.toString());
      const newTaskids = taskidsArray.map((id) => `"${id}"`).join(", ");
      await trx("insta_posts")
        .update({ taskids: newTaskids })
        .where("post_id", existingPost.post_id);
      post_id = (
        await trx("insta_posts")
          .update(template)
          .where("post_id", existingPost.post_id)
          .returning("post_id")
      )[0].post_id;
    }

    if (postData["media_name"] == "album") {
      await saveCarouselMedia(postData["carousel_media"], post_id, trx);
    } else {
      const bunnyCDNURL = (
        await upload_to_bunny_cdn(
          template["thumbnail_img"],
          "prakhar/instagram",
          post_id,
          "post"
        )
      ).image_url;
      await trx("insta_posts")
        .update({ thumbnail_img: bunnyCDNURL })
        .where("post_id", post_id);
      if (template["video_url"]) {
        const videoBunnyCDNURL = (
          await upload_to_bunny_cdn(
            template["video_url"],
            "prakhar/instagram",
            post_id,
            "video"
          )
        ).image_url;
        await trx("insta_posts")
          .update({ video_url: videoBunnyCDNURL })
          .where("post_id", post_id);
      }
    }
    if (template["music_cover_img"] != null) {
      const bunnyCDNURLforMusic = (
        await upload_to_bunny_cdn(
          template["music_cover_img"],
          "prakhar/instagram",
          post_id,
          "music"
        )
      ).image_url;
      console.log(bunnyCDNURLforMusic);
      if (bunnyCDNURLforMusic == null) {
        logger.warn(
          `🟡 Error in uploading music cover image for post ${post_id}`
        );
      }
      if (bunnyCDNURLforMusic != null) {
        await trx("insta_posts")
          .update({ music_cover_img: bunnyCDNURLforMusic })
          .where("post_id", post_id);
      }
    }

    //store influencer and post mapping
    await DB_store_mapping(post_id, user_id, null, "instagram", trx);
    // Using POST_ID , storing the mentions and hashtags
    const hashtags = postData.caption_hashtag
      ? postData.caption_hashtag
      : postData.caption?.hashtags || [];

    const mentions = postData.caption_mention
      ? postData.caption_mention
      : postData.caption?.mentions || [];
      
    const tagged_users = postData.tagged_users?.map((user) => ({
      username: user.user.username,
      id: user.user.id,
    }));

    // Storing hashtags
    if (hashtags.length > 0) {
      await DB_store_hashtags(trx, hashtags, post_id);
    }

    // Storing Mentions
    if (mentions || tagged_users) {
      const all_mentions = DB_template_mentions(
        mentions,
        tagged_users,
        post_id
      );
      await DB_store_mentions(trx, all_mentions, post_id);
    }
    return { status: 200, success: true, message: "Post Stored Successfully" };
  } catch (error) {
    return { status: 500, success: false, message: error.message };
  }
}

async function savePosts(postsData, user_id, task_id, followers_count) {
  const trx = await db.transaction();
  try {
    let i = 1;
    for (const post of postsData) {
      const DB_response = await DB_store_post(
        trx,
        post,
        task_id,
        user_id,
        followers_count
      );
      if (!DB_response.success) {
        await trx.rollback();
        logger.error(
          `🔴 Error storing Post at savePosts(task_id = ${task_id}, postid=${post.id}) | ${DB_response.message}`
        );
        return { status: 500, success: false, message: DB_response.message };
      }
      if (i % 20 == 0) {
        logger.info(
          `⚪ Successfully Stored ${i}/${postsData.length} posts(task_id = ${task_id})`
        );
      }
      i++;
    }
    await trx.commit();
    logger.info(
      `⚪ Success at savePosts(task_id = ${task_id}) | Data Stored Successfully`
    );
    return { status: 200, success: true };
  } catch (error) {
    await trx.rollback();
    logger.error(
      `🔴 Error at savePosts(task_id = ${task_id}) | ${error.message}`
    );
    return { status: 500, success: false, message: error.message };
  }
}

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
