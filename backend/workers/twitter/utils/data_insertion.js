const axios = require('axios');
const logger = require('../logger/logger.js');
const { upload_link_to_scraper_queue } = require("./linktree.js");
const { geminiCategorizeAndUpdate } = require('../gemini_twitter_worker.js');
const knex = require("../../../database/db.js");

const insertAllData = async(db, obj, movie_id) => {
    /**
     * This is the insert Data function
     * Accepts Obj to be inserted
     * Movie Id as seprate parameter
     */
    const retryLimit = 1;
    let attempt = 0;
    let success = false;

    while (attempt <= retryLimit && !success) {
        attempt += 1;

        const trx = await knex.transaction();
        try {
            let userId;
            let tweetId;
            const existingUser = await trx('twitter_users').where('screen_name', obj.user_screen_name).first();

            if (existingUser) {
                await trx('twitter_users')
                    .where('id', existingUser.id)
                    .update({
                        name: obj.user_name,
                        screen_name: obj.user_screen_name,
                        profile_image_url_https: obj.user_profile_image_url_https,
                        profile_banner_url: obj.user_profile_banner_url,
                        description: obj.user_description,
                        location: obj.user_location,
                        can_dm: obj.user_can_dm,
                        verified: obj.user_verified,
                        ai_category: existingUser.ai_category,
                        rest_id: obj.user_rest_id
                    });

                userId = existingUser.id;
            } else {
                // Insert a new user and get the ID
                const [newUser] = await trx('twitter_users').insert({
                        name: obj.user_name,
                        screen_name: obj.user_screen_name,
                        profile_image_url_https: obj.user_profile_image_url_https,
                        profile_banner_url: obj.user_profile_banner_url,
                        description: obj.user_description,
                        location: obj.user_location,
                        can_dm: obj.user_can_dm,
                        verified: obj.user_verified,
                        ai_category: null,
                        rest_id: obj.user_rest_id
                    }).returning('id');

                userId = newUser.id;
            }

            // Check if userId is still undefined
            if (!userId) {
                throw new Error("User ID is undefined. Transaction cannot proceed.");
            }

            await trx('twitter_user_analytics').insert({
                user_id: userId,
                fast_followers_count: parseInt(obj.user_fast_followers_count, 10),
                favourites_count: parseInt(obj.user_favourites_count, 10),
                followers_count: parseInt(obj.user_followers_count, 10),
                friends_count: parseInt(obj.user_friends_count, 10),
                listed_count: parseInt(obj.user_listed_count, 10),
                media_count: parseInt(obj.user_media_count, 10),
                normal_followers_count: parseInt(obj.user_normal_followers_count, 10),
                possibly_sensitive: obj.user_possibly_sensitive,
                statuses_count: parseInt(obj.user_statuses_count, 10),
                last_updated: new Date().toISOString()
            });

            let tweet = await trx('twitter_tweets')
                .where({ id_str: obj.tweet_id_str })
                .first();
            if(tweet){
                const exists = `${tweet.tasks}`.includes(`"${obj.tweet_task_id}"`);
                if(!exists){
                    knex('twitter_tweets')
                    .where({ id_str: obj.tweet_id_str })
                    .first().update('tasks',`${tweet.tasks}"${obj.tweet_task_id}" `)
                }
            }

            if (!tweet) {
                [tweet] = await trx('twitter_tweets').insert({
                    user_id: userId,
                    created_at: obj.tweet_created_at,
                    bookmark_count: parseInt(obj.tweet_bookmark_count, 10),
                    conversation_id_str: obj.tweet_conversation_id_str,
                    favorite_count: parseInt(obj.tweet_favorite_count, 10),
                    full_text: obj.tweet_full_text,
                    id_str: obj.tweet_id_str,
                    tasks: `"${obj.tweet_task_id}" `,
                    movie_id: movie_id,
                    like_to_follower_ratio: parseInt(obj.user_followers_count, 10) > 0 ? parseInt(obj.tweet_favorite_count, 10) / parseInt(obj.user_followers_count, 10) : 0,
                    possibly_sensitive: obj.tweet_possibly_sensitive,
                    quote_count: parseInt(obj.tweet_quote_count, 10),
                    retweet_count: parseInt(obj.tweet_retweet_count, 10),
                    retweeted: obj.tweet_retweeted,
                    views_count: parseInt(obj.tweet_views, 10),
                    view_state: obj.tweet_view_state,
                }).returning('id');
            }
            tweetId = tweet.id;
            let media_id;
            if (obj.tweet_media.length > 0) {
                for (const mediaItem of obj.tweet_media) {
                    const existingMedia = await trx('twitter_tweet_media')
                        .where({ media_id: mediaItem.id_str })
                        .first();
                        
                    if (!existingMedia) {
                        const mediaData = {
                            tweet_id: tweetId,
                            display_url: mediaItem.display_url,
                            expanded_url: mediaItem.expanded_url,
                            media_key: mediaItem.media_key,
                            media_url_https: mediaItem.media_url_https,
                            media_id: mediaItem.id_str,
                        };
                        const [media] = await trx('twitter_tweet_media').insert(mediaData).returning("id");
                        media_id = media.id
                    }
                    else{
                        media_id =existingMedia.id
                    }
                }
            }

            const emailRegex = /[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}/g;
            const emails = obj.user_description.match(emailRegex);
            if (emails && emails.length > 0) {

                for (const email of emails) {
                    await trx('twitter_emails').insert({
                        user_id: userId,
                        email: email,
                        source: 'twitter_bio',
                        created_at: trx.fn.now()
                    });
                }
            }

            if (obj.tweet_urls.length > 0) {
                const urls = obj.tweet_urls.map(url => ({
                    tweet_id: tweetId,
                    url: url.url,
                    platform: url.platform || "twitter",
                }));

                const existingUrls = await trx('twitter_tweet_urls')
                    .whereIn(['tweet_id', 'url'], urls.map(u => [u.tweet_id, u.url]))
                    .select(['tweet_id', 'url']);

                const existingUrlsSet = new Set(existingUrls.map(u => `${u.tweet_id}-${u.url}`));

                const newUrls = urls.filter(u => !existingUrlsSet.has(`${u.tweet_id}-${u.url}`));

                if (newUrls.length > 0) {
                    await trx('twitter_tweet_urls').insert(newUrls);
                }
            }

            if (obj.tweet_hashtags.length > 0) {
                const hashtags = obj.tweet_hashtags.map(hashtag => ({
                    tweet_id: tweetId,
                    hashtag: hashtag,
                }));

                const existingHashtags = await trx('twitter_tweet_hashtags')
                    .whereIn(['tweet_id', 'hashtag'], hashtags.map(h => [h.tweet_id, h.hashtag]))
                    .select(['tweet_id', 'hashtag']);

                const existingHashtagsSet = new Set(existingHashtags.map(h => `${h.tweet_id}-${h.hashtag}`));

                const newHashtags = hashtags.filter(h => !existingHashtagsSet.has(`${h.tweet_id}-${h.hashtag}`));

                if (newHashtags.length > 0) {
                    await trx('twitter_tweet_hashtags').insert(newHashtags);
                }
            }

            if (obj.tweet_user_mentions.length > 0) {
                const mentions = obj.tweet_user_mentions.map(mention => ({
                    tweet_id: tweetId,
                    mentioned_user_id: mention.id_str,
                }));

                const existingMentions = await trx('twitter_tweet_mentions')
                    .whereIn(['tweet_id', 'mentioned_user_id'], mentions.map(m => [m.tweet_id, m.mentioned_user_id]))
                    .select(['tweet_id', 'mentioned_user_id']);

                const existingMentionsSet = new Set(existingMentions.map(m => `${m.tweet_id}-${m.mentioned_user_id}`));

                const newMentions = mentions.filter(m => !existingMentionsSet.has(`${m.tweet_id}-${m.mentioned_user_id}`));

                if (newMentions.length > 0) {
                    await trx('twitter_tweet_mentions').insert(newMentions);
                }
            }

            if (obj.user_urls.length > 0) {
                for (const urlObj of obj.user_urls) {
                    const url = urlObj.display_url;
                    const platform = extractPlatformName(url);

                    // Check if source+url already exists in the database
                    const existingUrl = await trx('twitter_user_urls')
                        .where({ url: url, source: "twitter" })
                        .first();

                    // If the source+url doesn't exist, proceed with insertion
                    if (!existingUrl) {
                        await trx('twitter_user_urls').insert({
                            user_id: userId,
                            url: url,
                            platform: platform,
                            source: "twitter"
                        });
                    }

                    // Check if the source+url exists before sending to the scraper queue
                    if (!existingUrl && (
                            url.includes("linktr.ee") ||
                            url.includes("fanlink.tv") ||
                            url.includes("linkin.bio") ||
                            url.includes("linkree") ||
                            url.includes("linkinbio")
                        )) {
                        upload_link_to_scraper_queue("twitter", url, userId);
                    }
                }
            }


            await trx.commit();
            success = true;
            // logger.info("Data inserted successfully!");
            const imageForUsers = [{
                profile_image_url_https: obj.user_profile_image_url_https,
                profile_banner_url: obj.user_profile_banner_url,
                id: userId
            }]
            const userDetails = [{
                name: obj.user_name,
                description: obj.user_description,
                id: userId,
            }]
            const mediaDetail = obj.tweet_media.map(item => {
                return {
                    media_url_https: item.media_url_https,
                    id: userId,
                    tweet_id: tweetId
                };
            });

            await updateUserImages(knex, imageForUsers);
            await updateTweetMediaUrls(knex,media_id, mediaDetail);
            await geminiCategorizeAndUpdate(knex, userDetails);

        } catch (error) {
            console.error(`🔴 Error inserting data (Attempt ${attempt}):`, error);
            await trx.rollback();
            // Retry if rollback occurred and retry attempts left
            if (attempt > retryLimit) {
                console.error("Max retries reached. Aborting operation.");
                return false;

                break;
            }
        }
    }
};




const updateUserImages = async(db, imageForUsers) => {
    /**
     * This is responsible for updating user images 
     * Profile Image
     * Banner Image
     */
    try {
        const users = imageForUsers
        logger.info(`${users.length} users have image upload left`);

        for (const user of users) {
            let updatedProfileImageUrl;
            let updatedBannerUrl;

            // Internal check for 'createstir' URLs
            if (user.profile_image_url_https && !user.profile_image_url_https.startsWith('createstir')) {
                try {
                    const profileResponse = await axios.post(process.env.BUNNY_CDN_UPLOAD_URL || 'http://5.161.246.33/api/upload', {
                        file_name: `user-${user.id}-profile.jpg`,
                        storage_path: `\\twitter`,
                        url: user.profile_image_url_https
                    }, {
                        headers: {
                            'Authorization': process.env.BUNNY_CDN_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFua3VyQGNyZWF0ZXN0aXIuY29tIn0.u1i4HptY6xsg0OheQw3_y6lbv3rEPxEBfTt_oLleefg',
                            'Content-Type': 'application/json'
                        }
                    });

                    if (profileResponse.data && profileResponse.data.image_url) {
                        updatedProfileImageUrl = profileResponse.data.image_url;
                    }
                } catch (error) {
                    logger.error(`Error uploading profile image for user ${user.id}:`, error);
                }
            } else {
                logger.error(`Skipping profile image for user ${user.id} due to 'createstir' URL.`);
            }

            await wait(1000); // Wait for 2 seconds before processing next image

            if (user.profile_banner_url && !user.profile_banner_url.startsWith('createstir')) {
                try {
                    const bannerResponse = await axios.post(process.env.BUNNY_CDN_UPLOAD_URL || 'http://5.161.246.33/api/upload', {
                        file_name: `user-${user.id}-banner.jpg`,
                        storage_path: `\\twitter`,
                        url: user.profile_banner_url
                    }, {
                        headers: {
                            'Authorization': process.env.BUNNY_CDN_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFua3VyQGNyZWF0ZXN0aXIuY29tIn0.u1i4HptY6xsg0OheQw3_y6lbv3rEPxEBfTt_oLleefg',
                            'Content-Type': 'application/json'
                        }
                    });

                    if (bannerResponse.data && bannerResponse.data.image_url) {
                        updatedBannerUrl = bannerResponse.data.image_url;
                    }
                } catch (error) {
                    logger.error(`Error uploading banner image for user ${user.id}:`, error);
                }
            } else {
                logger.error(`Skipping banner image for user ${user.id} due to 'createstir' URL.`);
            }

            await wait(1000);

            if (updatedProfileImageUrl || updatedBannerUrl) {
                await db('twitter_users')
                    .where('id', user.id)
                    .update({
                        profile_image_url_https: updatedProfileImageUrl || user.profile_image_url_https,
                        profile_banner_url: updatedBannerUrl || user.profile_banner_url
                    });

                logger.info(`User ${user.id} image URLs updated successfully!`);
            } else {
                logger.info("error in repsonse")
            }

        }
    } catch (error) {
        logger.error(`Error updating user images:`, error);
    }
};



function extractPlatformName(url) {
    /**
     * This is responsible for extracting the platform name from the link
     */
    url = url.replace(/^https?:\/\/(www\.)?/, '');
    const pattern = /^([^\/]+)/;
    const match = url.match(pattern);
    if (match) {
        return match[1];
    } else {
        return null;
    }
}

const updateTweetMediaUrls = async(db, media_id, imageForUsers) => {
    /**
     * This function updates the tweet's media as a seprate process
     * Accepts an object of images of user's tweet media
     */
    try {
        const mediaRecords = imageForUsers
        logger.info(`${mediaRecords.length} Number of media's left`)
        for (const media of mediaRecords) {
            let updatedMediaUrl;

            if (media.media_url_https && !media.media_url_https.startsWith('createstir')) {
                try {
                    const mediaResponse = await axios.post(process.env.BUNNY_CDN_UPLOAD_URL || 'http://5.161.246.33/api/upload', {
                        file_name: `${media.tweet_id}-${media.id}.jpg`,
                        storage_path: `\\twitter\\tweets`,
                        url: media.media_url_https
                    }, {
                        headers: {
                            'Authorization': process.env.BUNNY_CDN_AUTH_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFua3VyQGNyZWF0ZXN0aXIuY29tIn0.u1i4HptY6xsg0OheQw3_y6lbv3rEPxEBfTt_oLleefg',
                            'Content-Type': 'application/json'
                        }
                    });
                    if (mediaResponse.data && mediaResponse.data.image_url) {
                        updatedMediaUrl = mediaResponse.data.image_url;
                    }
                } catch (error) {
                    logger.error(`Error uploading media for tweet ${media.tweet_id} and media ${media.id}:`, error);
                }
            } else {
                logger.error(`Skipping media upload for tweet ${media.tweet_id} and media ${media.id} due to 'createstir' URL.`);
            }
            if (updatedMediaUrl) {
                await db('twitter_tweet_media')
                    .where('id', media_id)
                    .update({
                        media_url_https: updatedMediaUrl
                    });

                logger.info(`Tweet ${media.tweet_id} media ${media.id} URL updated successfully!`);
                logger.info(updatedMediaUrl, media.id)
            } else {
                logger.info("not recieving the image from bunnycdn")
            }

        }
    } catch (error) {
        logger.error(`Error updating media URLs:`, error);
    }
};

module.exports = {
    insertAllData,
    updateUserImages,
    updateTweetMediaUrls,
    extractPlatformName
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

















