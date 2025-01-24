const { default: axios } = require("axios");
const fs = require("fs")
const knex = require("../../../database/db");
const { get_links, get_email } = require("./extra_utils");
const { categorizeUser } = require("./category_checker");
const { insert_user_dedup_data } = require("./insert_data");
async function fetch_user(stir_id,username) {
  console.log(stir_id,username)
    const relation = await knex('platform_relationv2')
      .where('stir_id', stir_id)
      .first();
  
      const options = {
        method: 'GET',
        url: 'https://tiktok-api23.p.rapidapi.com/api/user/info',
        params: {
          uniqueId: username
        },
        headers: {
          'x-rapidapi-key': process.env.TIKTOK_API_KEY,
          'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
        }
      }
    try {
        const response = await axios.request(options)
      await knex("tiktok_credit_usage").insert({
        endpoint: "https://tiktok-api23.p.rapidapi.com/api/user/info",
        credit: 1,
    })
      const responseData = response.data;
      const object = await createObject(responseData);
      const id = await insert_user_dedup_data(object);
      await knex('platform_relationv2')
      .where('stir_id', stir_id)
      .update({
        tiktok_id: id
      });
    
    } catch (error) {
      console.log
      (error)
      await knex('platform_relationv2').where('stir_id', stir_id).del();
    }
  }
  

async function createObject(data){
try{
  let user_info = data?.userInfo
  let user = user_info?.user
  let user_stats = user_info?.stats
  let user_urls = []
  if(user?.bioLink && user?.bioLink?.link){
      user_urls.push(user.bioLink.link)
  }
  if(!user_info|| !user ||  !user_stats ){
    console.log(user_info)
  }
  return {
      user_id : user.id,
      username : user.uniqueId,
      user_name:user.nickname,
      user_category: await categorizeUser({
          username: user.uniqueId,
          user_name: user.nickname,
          user_description: user.signature,
      }),
      user_profile:user.avatarMedium,
      user_description : user.signature,
      user_verified:user.verified,
      user_secUid:user.secUid,
      user_region:user.region,
      user_created_at:user.createTime,
      user_links : [...user_urls,...get_links(user.signature)],
      user_emails : get_email(user.signature),

      user_followers : user_stats.followerCount,
      user_following : user_stats.followingCount,
      user_likes : user_stats.heart,
      user_video_count : user_stats.videoCount,
      user_friend_count : user_stats.friendCount,
  }
}catch(e){
  throw new Error(e)
}
}
module.exports ={
    fetch_user
}