const knex = require("../../../database/db");
const { upload_link_to_scraper_queue } = require("../../twitter/utils/linktree");
const logger = require("../logger/logger");
const { uploadToCdn } = require("./cdn_utility");
const { default: axios } = require("axios");
async function insertUser(obj) {
  if(!obj.user_created_at){
    const options = {
      method: 'GET',
      url: 'https://tiktok-api23.p.rapidapi.com/api/user/info',
      params: {
        uniqueId: obj.username
      },
      headers: {
        'x-rapidapi-key': process.env.TIKTOK_API_KEY,
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
      }
    };
    const user = await axios.request(options)
    await knex("tiktok_credit_usage").insert({
      endpoint: "https://tiktok-api23.p.rapidapi.com/api/user/info",
      credit: 1
    })
    obj.user_created_at = user?.data?.userInfo?.user?.createTime
    obj.user_region = user?.data?.userInfo?.user?.region
  }

  const [insertedUser] = await knex('tiktok_users')
    .insert({
      tiktok_id: obj.user_id,
      username: obj.username,
      category: obj.user_category,
      name: obj.user_name,
      description: obj.user_description,
      verified: obj.user_verified,
      region:obj?.user_region,
      tiktok_user_created_at:obj?.user_created_at,
      secUid: obj.user_secUid,
    })
    .onConflict('tiktok_id')
    .merge()
    .returning('*');

  let userId;

  if (insertedUser && insertedUser.length > 0) {
    userId = insertedUser[0].id;
  } else {
    const existingUser = await knex('tiktok_users')
      .select('*')
      .where('tiktok_id', obj.user_id)
      .first();
    userId = existingUser ? existingUser.id : null;
  }

  if (userId) {
    const photo = await uploadToCdn(obj.user_profile, userId, "tiktok", "user");
    await knex('tiktok_users')
      .update({ photo: `https://${photo}` })
      .where('id', userId);
  }

  return userId;
}


  async function insertUserAnalytics(userIdToUse, obj) {
    await knex('tiktok_user_analytics').insert({
      user_id: userIdToUse,
      following: obj.user_following,
      followers: obj.user_followers,
      likes: obj.user_likes,
      video_count: obj.user_video_count,
      updated_at: new Date()
    });
  }
  
  async function insertPost(userIdToUse, obj, movieId) {
    const [postId] = await knex('tiktok_posts').insert({
      tiktok_video_id: obj.video_id,
      user_id: userIdToUse,
      duration: obj.video_duration,
      likes_to_followers_ratio: obj.video_likes_to_followers_ratio,
      address: obj.video_address,
      is_ad: obj.video_is_ad,
      music_id: obj.video_music_id,
      music_title: obj.video_music_title,
      music_cover: obj.video_music_coverLarge,
      like_count: obj.video_like_count,
      comment_count: obj.video_comment_count,
      share_count: obj.video_share_count,
      play_count: obj.video_play_count,
      saved_count: obj.video_saved_count,
      description: obj.video_description,
      created_at: new Date(obj.video_created_at),
      movie_id: movieId
    })
    .onConflict('tiktok_video_id')
    .merge()
    .returning('id');
    console.log((obj.video_cover, userIdToUse, "tiktok", "post", postId))
    const photo = await uploadToCdn(obj.video_cover, userIdToUse, "tiktok", "post", postId.id);
    await knex('tiktok_posts').update({ cover: `https://${photo}` }).where('id', postId.id);
    
    return postId;  
  }
  
  
  async function insertPostHashtags(postId, hashtags) {
    logger.info(`${postId} postId`);
    
    for (const hashtag of hashtags) {
      const exists = await knex('tiktok_post_hashtags')
        .where({ hashtag_id: hashtag.id, post_id: postId })
        .first();
  
      if (exists) {
        logger.info(`Skipping insertion for hashtag_id: ${hashtag.id} and post_id: ${postId} as it already exists.`);
        continue;
      }
  
      await knex('tiktok_post_hashtags').insert({
        hashtag_id: hashtag.id,
        hashtag: hashtag.title,
        post_id: postId
      });
    }
  }
  
  async function insertUserEmails(userIdToUse, emails) {
    for (const email of emails) {
      const exists = await knex('tiktok_user_emails')
        .where({ user_id: userIdToUse, email })
        .first();
  
      if (exists) {
        console.info(`Skipping insertion for user_id: ${userIdToUse} and email: ${email} as it already exists.`);
        continue;
      }
  
      await knex('tiktok_user_emails').insert({
        user_id: userIdToUse,
        email
      });
    }
  }
  
  async function insertUserLinks(userIdToUse, links) {
    try {
      for (const link of links) {
        if (!link) {
          throw new Error("Missing 'link' field in links array item");
        }
  
        const exists = await knex('tiktok_user_urls')
          .where({ user_id: userIdToUse, link })
          .first();
  
        if (exists) {
          console.info(`Skipping insertion for user_id: ${userIdToUse} and link: ${link} as it already exists.`);
          continue;
        }
  
        const platform = get_platform(link);
  
        await knex('tiktok_user_urls').insert({
          user_id: userIdToUse,
          source: "tiktok",
          platform: platform,
          link: link
        });
  
        if (link.includes("linktr.ee") || link.includes("fanlink.tv") || link.includes("linkin.bio") || link.includes("linkree") || link.includes("linkinbio")) {
          upload_link_to_scraper_queue("tiktok", link, userIdToUse);
        }
      }
    } catch (error) {
      console.error(`Error inserting user links: ${error.message}`);
      throw error;
    }
  }
  function get_platform(link) {
    const platformRegex = /(tiktok|instagram|youtube|facebook|twitter|linkedin)/i;
    const platformMatch = link.match(platformRegex);
  
    if (platformMatch) {
      console.log(platformMatch)
        return platformMatch[0].toLowerCase();

    } else {
      const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i;
      const domainMatch = link.match(domainRegex)
      console.log(domainMatch)
      return domainMatch ? `${domainMatch[1]}`.toLowerCase() : 'unknown';
    }
  }
  
  async function insert_data(obj, movieId) {
    try {
      logger.info("Inserting the information")
      const userIdToUse = await insertUser(obj);
      logger.info(`${userIdToUse} user id`)
      await insertUserAnalytics(userIdToUse, obj);
      logger.info("Inserting the post information")
      const postId = await insertPost(userIdToUse, obj, movieId);
      await insertPostHashtags(postId.id, obj.video_hashtags);
      await insertUserEmails(userIdToUse, obj.user_emails);
      await insertUserLinks(userIdToUse, obj.user_links);
      
      logger.info("Data inserted successfully.");
    } catch (error) {
      console.error("Error inserting data:", error);
      throw new Error(error);
    }
  }

  async function insert_user_dedup_data(obj) {
    try {
      const userIdToUse = await insertUser(obj);
      logger.info(`${userIdToUse} user id`)
      await insertUserAnalytics(userIdToUse, obj);
      await insertUserEmails(userIdToUse, obj.user_emails);
      await insertUserLinks(userIdToUse, obj.user_links);
      logger.info("Data inserted successfully.");
      return userIdToUse
    } catch (error) {
      console.error("Error inserting data:", error);
      throw new Error(error);
    }
  }


module.exports = {insert_data,insert_user_dedup_data}