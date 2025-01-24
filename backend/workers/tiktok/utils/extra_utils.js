const { spam_check } = require('./spam_checker');
const { insert_data } = require('./insert_data');
const { categorizeUser } = require('./category_checker');
const knex= require('../../../database/db');
const logger = require('../logger/logger');

async function returnVideo(lookup, movie) {
  try {
    let user_count = 0
    let unique_users = []
    let arr = [];
    logger.info(`Lookup Length : Total number of found elements ${lookup.length}`)
    for (let i = 0; i < lookup.length; i++) {
      const obj = await createVideoObject(lookup[i]);
      const existingVideo = await knex('tiktok_posts')
        .where('tiktok_video_id', obj.video_id)
        .select('tiktok_video_id')
        .first();

      if (!existingVideo) {
        if (meetsCriteria(obj)) {
          logger.info("Post meets the criteria of statistics")
            const response = await spam_check(
              {
                username: obj.username,
                video_description: obj.video_description,
                video_is_ad: obj.video_is_ad,
                video_hashtags: obj.video_hashtags,
              },
              movie
            );

            if (response) {
              logger.info("Failed the spam")
            } else {
              console.log("Passed the spam");
              await insert_data(await update_category(obj), movie.movieid);
              if(!unique_users.includes(obj.user_id)){
                unique_users.push(obj.user_id)
                user_count++
              }
              arr.push(obj);
            }
        } else {
          console.log("Failed due to not meeting the criteria");
        }
      }
    }
    logger.info(unique_users)
    return {arr,user_count};
  } catch (err) {
    throw new Error(err);
  }
}

async function update_category(obj) {
  logger.info("updating user category")
  if(!obj.user_category){
    obj.user_category = await categorizeUser({
      username: obj.username,
      user_name: obj.user_name,
      user_description: obj.user_description,
    })
  }
  return obj
}

async function createVideoObject(data) {
  
  const user = data.author;
  const video = data.video;
  const video_stats = data.stats;
  const user_stats = data.authorStats;
  const challenges = data.textExtra || [];
  const music = data.music;
  const existingUser = await knex('tiktok_users')
  .where('username', user.uniqueId)
  .select('category')
  .first(); 
  
  return {
    user_id: user.id,
    username: user.uniqueId,
    user_name: user.nickname,
    user_description: user.signature,
    user_profile: user.avatarLarger,
    user_verified: user.verified,
    user_secUid: user.secUid,
    user_category: existingUser?.category ? existingUser?.category : null,
    user_links: get_links(user.signature),
    user_emails: get_email(user.signature),

    user_following: BigInt(user_stats.followingCount) || 0n,
    user_followers: BigInt(user_stats.followerCount) || 0n,
    user_likes: BigInt(user_stats.heart) || 0n,
    user_video_count: BigInt(user_stats.videoCount) || 0n,

    video_like_count: BigInt(video_stats.diggCount) || 0n,
    video_comment_count: BigInt(video_stats.commentCount) || 0n,
    video_share_count: BigInt(video_stats.shareCount) || 0n,
    video_play_count: BigInt(video_stats.playCount) || 0n,
    video_saved_count: BigInt(video_stats.collectCount) || 0n,

    video_id: video.id,
    video_created_at: data.createTime,
    video_duration: parseInt(video.duration) || 0,
    video_cover: video.cover,
    video_description: data.desc,
    video_address: video.playAddr,
    video_is_ad: data.isAd,
    video_hashtags: getVideoHashtags(challenges),
    video_likes_to_followers_ratio: parseInt(video_stats.diggCount) / parseInt(user_stats.followerCount),
    video_music_id: music.id,
    video_music_title: music.title,
    video_music_coverLarge: music.coverLarge,
  };
}

function getVideoHashtags(challenges) {
  return challenges
    .filter((challenge) => challenge.hashtagName.trim() !== "")
    .map((challenge) => ({
      title: challenge.hashtagName,
      id: challenge.hashtagId,
    }));
}

function meetsCriteria(obj) {
  return obj.user_followers > 3000 && obj.video_play_count > 200 && obj.video_like_count > 50;
}



function get_email(description) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return description.match(emailRegex) || [];
}

function get_links(description) {
  const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
  return description.match(urlRegex) || [];
}
function get_platform(link) {
  const platformRegex = /(tiktok|instagram|youtube|facebook|twitter|linkedin)/i;
  const platformMatch = link.match(platformRegex);

  if (platformMatch) {
    return platformMatch[0].toLowerCase();
  } else {
    const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i;
    const domainMatch = link.match(domainRegex);
    return domainMatch ? domainMatch[1].toLowerCase() : 'unknown';
  }
}
module.exports =
{
  get_email,
  get_platform,
  returnVideo,
  get_links,
  update_category
}