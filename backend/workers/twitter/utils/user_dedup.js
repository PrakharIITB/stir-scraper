const axios = require('axios');
const logger = require('../logger/logger.js');
const knex = require("../../../database/db.js");
const { extractPlatformName, updateUserImages } = require("./data_insertion.js")
const {geminiCategorizeAndUpdate} = require("../gemini_twitter_worker.js")

async function user_dedup(stir_id, username) {
  const twitter_profile = username;
console.log(username,stir_id)
  const relation = await knex('platform_relationv2')
    .where('stir_id', stir_id)
    .first();
  
  if (relation == undefined || relation?.twitter_id) {
    return;
  }
  if (relation.twitter_id) {
    return;
  }

  const options = {
    method: 'GET',
    url: 'https://twitter241.p.rapidapi.com/user',
    params: { username: twitter_profile },
    headers: {
      'x-rapidapi-key': process.env.XAPI,
      'x-rapidapi-host': 'twitter241.p.rapidapi.com'
    }
  };

  let trx;
  try {
    trx = await knex.transaction();
    
    const existingUser = await trx('twitter_users').where('screen_name', twitter_profile).first();

    if (existingUser) {
      const existingRelation = await trx('platform_relationv2')
        .where('twitter_id', existingUser.id)
        .andWhere("stir_id", stir_id)
        .first();
        
      if (!existingRelation) {
        await trx('platform_relationv2')
          .where('stir_id', stir_id)
          .update({ twitter_id: existingUser.id });
      }
      await trx.commit();
      return;
    }

    const response = await axios.request(options);
    await knex("twitter_credit_usage").insert({
      endpoint: "https://twitter241.p.rapidapi.com/user",
      credit: 1,
      time: new Date()
  })
    const user = response?.data?.result?.data?.user?.result;
    if(!user || !user.legacy){
      await trx.commit();
      return;
    }
    const props = user.legacy;
    const entities = props?.entities;
    
    const urls = [];
    const emails = [];
    const emailRegex = /[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}/g;
    const emails_from_description = props?.description?.match(emailRegex) || [];
    emails.push(...emails_from_description);

    entities?.description?.urls?.forEach(item => urls.push(item.display_url));
    entities?.url?.urls?.forEach(item => {
      const foundEmails = item.display_url.match(emailRegex);
      if (foundEmails) {
        emails.push(...foundEmails);
      } else {
        urls.push(item.display_url);
      }
    });
    let profile = props.profile_image_url_https
    if(props.profile_image_url_https != null){
        profile = props.profile_image_url_https.includes("normal.jpg")
            ? props.profile_image_url_https.replace("normal.jpg", "400x400.jpg")
            : props.profile_image_url_https;
    }
    const obj = {
      rest_id: user.rest_id,
      verified: props.verified,
      can_dm: props.can_dm,
      description: props.description,
      fast_followers_count: props.fast_followers_count,
      favourites_count: props.favourites_count,
      followers_count: props.followers_count,
      friends_count: props.friends_count,
      listed_count: props.listed_count,
      location: props.location,
      media_count: props.media_count,
      name: props.name,
      profile_banner_url: props.profile_banner_url || "",
      normal_followers_count: props.normal_followers_count,
      profile_image_url_https: profile,
      screen_name: props.screen_name,
      statuses_count: props.statuses_count,
      creator_subscriptions_count: user.creator_subscriptions_count,
      urls: urls,
      possibly_sensitive: props.possibly_sensitive
    };
    
    try {
      let existingUser = await trx('twitter_users')
      .where('screen_name', obj.screen_name)
      .first()
    let id
    if (existingUser) {
      id = existingUser.id;
    } else {
      let newUser = await trx('twitter_users')
        .insert({
          name: obj.name,
          screen_name: obj.screen_name,
          profile_image_url_https: obj.profile_image_url_https,
          profile_banner_url: obj.profile_banner_url,
          description: obj.description,
          location: obj.location,
          can_dm: obj.can_dm,
          verified: obj.verified,
          rest_id: obj.rest_id
        })
        .returning('id');
    
      newUser = newUser[0];
      id = newUser.id;
    }    

      await trx('twitter_user_analytics').insert({
        user_id: id,
        fast_followers_count: parseInt(obj.fast_followers_count, 10),
        favourites_count: parseInt(obj.favourites_count, 10),
        followers_count: parseInt(obj.followers_count, 10),
        friends_count: parseInt(obj.friends_count, 10),
        listed_count: parseInt(obj.listed_count, 10),
        media_count: parseInt(obj.media_count, 10),
        normal_followers_count: parseInt(obj.normal_followers_count, 10),
        possibly_sensitive: obj.possibly_sensitive,
        statuses_count: parseInt(obj.statuses_count, 10),
        last_updated: new Date().toISOString(),
      });

      await trx('platform_relationv2')
        .where('stir_id', stir_id)
        .update({ twitter_id: id });

      for (const email of emails) {
        const existingEmail = await trx('twitter_emails')
          .where({ user_id: id, email: email })
          .first();
        if (!existingEmail) {
          await trx('twitter_emails').insert({
            user_id: id,
            email: email,
            source: 'twitter_bio',
            created_at: trx.fn.now()
          });
        }
      }

      for (const url of obj.urls) {
        const platform = extractPlatformName(url);
        const existingUrl = await trx('twitter_user_urls')
          .where({ url: url, source: "twitter" })
          .first();
        if (!existingUrl) {
          await trx('twitter_user_urls').insert({
            user_id: id,
            url: url,
            platform: platform,
            source: "twitter"
          });
        }
      }

      await trx.commit();

      const imageForUsers = [{
        profile_image_url_https: obj.profile_image_url_https,
        profile_banner_url: obj.profile_banner_url,
        id: id
    }]
    const userDetails = [{
        name: obj.name,
        description: obj.description,
        id: id,
    }]

    await updateUserImages(knex, imageForUsers);
    await geminiCategorizeAndUpdate(knex, userDetails);


    } catch (error) {
      await trx.rollback();
    console.log(error.message)
      await trx('platform_relationv2')
        .where('stir_id', stir_id)
        .del();
      logger.error(`🔴 Error during transaction:`, error);
    }
  } catch (error) {
    if (trx) {
      await trx.rollback();

    }
    console.log(error.message)

    await knex('platform_relationv2')
      .where('stir_id', stir_id)
      .del();
    logger.error(`🔴 Error during API request or transaction:`, error);
  }
}


module.exports = {
  user_dedup
}