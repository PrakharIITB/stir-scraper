const db = require("../db/db");
require("dotenv").config();
const logger = require("../logs/logger");
const INSTA_RAPID_API_URL = process.env.INSTA_RAPID_API_URL;
const INSTA_RAPID_API_KEY = process.env.INSTA_RAPID_API_KEY;

function DB_template_user(userData) {
  const template = {
    insta_user_id: userData['id'] || null,
    username: userData['username'] || null,
    is_private: 'is_private' in userData ? userData['is_private'] : null,
    is_verified: 'is_verified' in userData ? userData['is_verified'] : null,
    name: userData['full_name'] || null,
    biography: userData['biography'] || null,
    external_url: userData['external_url'] || null,
    followers_count: userData['follower_count'] || null,
    followings_count: userData['following_count'] || null,
    posts_count: userData['media_count'] || null,
    is_business: 'is_business' in userData ? userData['is_business'] : null,
    business_email: userData['public_email'] || null,
    biography_email: userData['biography_email'] || null,
    business_countrycode: userData['public_phone_country_code'] || null,
    business_number: userData['public_phone_number'] || null,
    country: userData['about']?.country || null,
    category: userData['category'] || null,
    has_anonymous_profile_picture :'has_anonymous_profile_picture' in userData ? userData['has_anonymous_profile_picture'] : null,
    date_joined: userData['about']?.date_joined_as_timestamp ? new Date(userData['about'].date_joined_as_timestamp * 1000) : null,
    date_verified: userData['about']?.date_verified_as_timestamp ? new Date(userData['about'].date_verified_as_timestamp * 1000) : null,
    former_username_count : userData['about']?.former_usernames || null,
    latest_reel_media : userData?.latest_reel_media || null,
    last_update: new Date(),

  };
  return template;
}

async function getInfluencers() {
  try {
    const influencers = await db("insta_users").select("username").limit(10);
    return influencers;
  } catch (err) {
    logger.error(err);
    return [];
  }
}

async function getCurrentInfluencerData(username) {
  //get current data for influencer
  const INSA_RAPID_API_GET_OPTIONS = {
    method: 'GET',
    headers: {
        'x-rapidapi-key': INSTA_RAPID_API_KEY,
        'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
    }
};
  const url = `${INSTA_RAPID_API_URL}/v1/info?username_or_id_or_url=${username}&include_about=true`;
  logger.info(url);
  
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
      logger.warn(`🟡 Attempt ${attempt} failed for getUser(username=${username}) with error: ${error.message}`);

      if (attempt === 3) {
        logger.error(`🔴 Error at getUser(username=${username}) after ${attempt} attempts` );
        return { status: 500, success: false, error: error.message, message: `🔴 Error at getUser(username=${username}) after ${attempt} attempts`};
      }
    }
  }

  if (!success) {
    logger.error(`🔴 Error at getUser(username=${username}) after ${attempt} attempts`);
    return { status: 500, success: false, error: error.message, message: `🔴 Error at getUser(username=${username}) after ${attempt} attempts`};
  }

  return { status: 200, success: true, data: data, count: 1, message: `⚪ Success at getUser(username=${username})`};
}

async function updateInfluencer(username) {
  try {
    const influencerData = await getCurrentInfluencerData(username);
    if (!influencerData.success) {
      return influencerData;
    }
    
    const data = influencerData.data.data;
    const template = DB_template_user(data);
    logger.info(template);
    // const response = await db("insta_users").where("username", username).update(template);
    return { status: 200, success: true, message: `✅ Updated influencer ${username}`};
  
  } catch (err) {
    logger.error(err);
    return { status: 500, success: false, error: err.message, message: `🔴 Error updating influencer ${username}`};
  }
}

async function main() {
  const influencers = await getInfluencers();
  logger.info(influencers);
  
  try {
    for (const influencer of influencers) {
      const username = influencer.username;
      const response = await updateInfluencer(username);
      if (response.status !== 200) {
        logger.error(`🔴 Error updating influencer ${username}`);
        continue;
      }
      logger.info(`✅ Updated influencer ${username}`);
    }
  } catch (error) {
    logger.error(`🔴 Error updating influencers`, error);
  }
}

main();