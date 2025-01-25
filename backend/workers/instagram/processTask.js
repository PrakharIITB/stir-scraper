/**
 * processTask.js
 * This file contains the code for processing a task.
 * 
**/


const db = require('../../db/db');
const { geminiCheckSpam, geminiCategorize } = require('./gemini');
const logger = require('./logger'); 
const { DB_template_post, DB_template_user, DB_template_user_for_AI_Categorization, DB_template_post_for_AI_Categorization, DB_template_mentions } = require('./templates');
// const data = require('./data.json');
// importing dotenv
const amqp = require('amqplib');

const dotenv = require('dotenv');
dotenv.config();
const BUNNY_CDN_AUTH_TOKEN = process.env.BUNNY_CDN_AUTH_TOKEN;
const BUNNY_CDN_UPLOAD_URL = process.env.BUNNY_CDN_UPLOAD_URL;
const INSTA_RAPID_API_KEY = process.env.INSTA_RAPID_API_KEY;
const INSTA_RAPID_API_URL = process.env.INSTA_RAPID_API_URL;
const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL;


async function upload_link_to_scraper_queue(platform, url, userID) {
    /**
     * Publishes a message to the specified queue.
     */
    const datatoSend = { platform: platform, url: url, user_id: userID.toString() };
    const queueName = "scraper_queue";
    try {
      const url = RABBIT_MQ_URL ;
      const connection = await amqp.connect(url);
      const channel = await connection.createChannel();
      await channel.assertQueue(queueName, {
        durable: true
      });
      
      // Publish the message to the specified queue
      await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(datatoSend)));
    //   console.log(` [x] Sent url to Scraper queue '${queueName}'`);
      
      // Close the connection after a short delay
      setTimeout(() => {
        connection.close();
      }, 500);
    } catch (error) {
      console.error('Error:', error);
    }
  }

async function upload_to_bunny_cdn_carousel(url, platform, id, mediaId, media_type) {
    /**
     * Uploads an image to the Bunny CDN.
     * Returns the URL of the uploaded image.
     */
    var filename;
    if(media_type === 'photo')
        filename = `${mediaId}.png`;
    else
        filename = `${mediaId}.mp4`;
    const storage_path = `/prakhar/${platform}`;

    const headers = {
        "Authorization": BUNNY_CDN_AUTH_TOKEN,
        "Content-Type": "application/json"  
    };

    const uploadData = {
        "file_name": filename,
        "url": url,
        "storage_path": storage_path
    };

    try {
        const response = await fetch(BUNNY_CDN_UPLOAD_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(uploadData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const data = await response.json();  // Wait for the JSON response
        if (!data?.image_url) {
            throw new Error('Failed to upload image');
        }
        if (data?.image_url){
            logger.info(`⚪ Success at upload_to_bunny_cdn( ${id}, ${mediaId}) | Data Stored Successfully`);
        }
        return {status: 200, message: 'Upload Successful', success: true, image_url: "https://" + data?.image_url || null};
    } catch (error) {
        return {status: 500, message: error.message, success: false};
    }
}



async function upload_to_bunny_cdn(url, platform, id, type) {
    /**
     * Uploads an image to the Bunny CDN.
     * Returns the URL of the uploaded image.
     */
    var filename
    if(type === 'video') filename = `${type}-${id}.mp4`;
    else filename = `${type}-${id}.png`;
    const storage_path = `/${platform}`;

    const headers = {
        "Authorization": BUNNY_CDN_AUTH_TOKEN,
        "Content-Type": "application/json"  
    };

    const uploadData = {
        "file_name": filename,
        "url": url,
        "storage_path": storage_path
    };

    try {
        const response = await fetch(BUNNY_CDN_UPLOAD_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(uploadData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const data = await response.json();  // Wait for the JSON response
        if (!data?.image_url) {
            throw new Error('Failed to upload image');
        }
        if (data?.image_url){
            logger.info(`⚪ Success at upload_to_bunny_cdn( ${id}, ${type}) | Data Stored Successfully`);
        }
        return {status: 200, message: 'Upload Successful', success: true, image_url: "https://" + data?.image_url || null};
    } catch (error) {
        return {status: 500, message: error.message, success: false};
    }
}


async function DB_get_userID(trx, insta_user_id) {
    /**
     * Retrieves the user ID associated with the given Instagram user ID.
     * If the Instagram user ID does not exist in the database, a new user is created.
     **/
    try {
        // Check if the insta_user_id exists in the insta_users table
        let user = await trx('insta_users')
            .select('user_id', 'ai_category', 'followers_count')
            .where('insta_user_id', insta_user_id)
            .first();
        if (user) {
            // Return existing user_id, ai_category, and follower_count
            return [user.user_id, user.ai_category, user.followers_count];
        } else {
            // Create a new user and return the new user_id
            const [newUser] = await trx('insta_users')
                .insert({ insta_user_id })
                .returning('user_id');

            // Return the new user_id with null values for the other fields
            return [newUser.user_id, null, null];
        }
    } catch (error) {
        // Handle any error that occurred during the transaction
        return [null, null, null];
    }
}
  

async function DB_store_hashtags(trx, hashtags, post_id) {
    /**
     * Stores the hashtags in the database.
     * If the hashtag already exists in the database, it is skipped.
    **/
    const existing_hashtags = await trx('insta_post_hashtags').select('hashtag').where('post_id', post_id);
    const existing_hashtag_list = existing_hashtags.map((hashtag) => hashtag.hashtag);
    const new_hashtag_list = hashtags.filter((hashtag) => !existing_hashtag_list.includes(hashtag));
    if (new_hashtag_list.length > 0) {
        await trx('insta_post_hashtags').insert(new_hashtag_list.map((hashtag) => ({ post_id: post_id, hashtag: hashtag })));
    }
}



async function DB_store_email(trx, email, source, user_id) {
    /**
     * Stores the email in the database.
     * If the email already exists in the database, it is skipped.
    **/
    if (email.length > 2) {

    const count = await trx('insta_users_emails').where({ email, source, user_id: user_id }).count({ count: '*' });
    if (parseInt(count[0].count, 10) === 0) {
      await trx('insta_users_emails')
        .insert({ email, source, user_id: user_id });
    } 
}
}

async function get_platform_and_Upload_link_to_scraper_queue(url, user_id) {
    if (url.includes("x.com") || url.includes("twitter.com")) {
        return "twitter";
    } else if (url.includes("youtube.com")) {
        return "youtube";
    } else if (url.includes("instagram.com")) {
        return "instagram";
    } else if (url.includes("tiktok.com")) {
        return "tiktok";
    } else if (url.includes("facebook.com")) {
        return "facebook";
    } else if (url.includes("linktr.ee")) {
        await upload_link_to_scraper_queue("instagram", url, user_id);
        logger.info(`⚪ Success at get_platform_and_Upload_link_to_scraper_queue( ${url}, ${user_id}) | Sent To Scraper Queue`);
        return "linktree";
    } else if (url.includes("fanlink.tv")) {
        logger.info(`⚪ Success at get_platform_and_Upload_link_to_scraper_queue( ${url}, ${user_id}) | Sent To Scraper Queue`);
        await upload_link_to_scraper_queue("instagram", url, user_id);
        return "fanlink";
    } else if (url.includes("linkin.bio")) {
        logger.info(`⚪ Success at get_platform_and_Upload_link_to_scraper_queue( ${url}, ${user_id}) | Sent To Scraper Queue`);
        await upload_link_to_scraper_queue("instagram", url, user_id);
        return "linkin.bio";
    } else {
        return null;
    }
}

async function DB_store_link(trx, url, source, user_id) {
    /**
     * Stores the link in the database.
     * If the link already exists in the database, it is skipped.
    **/

    // This function right now also handles linktree etc links and add them to scraper queue
    const platform =  await get_platform_and_Upload_link_to_scraper_queue(url, user_id)
    if (url.length > 2) {
    const count = await trx('insta_users_links').where({ url, source, user_id: user_id }).count({ count: '*' });
    if (parseInt(count[0].count, 10) === 0) {
      await trx('insta_users_links')
        .insert({ url, source, user_id: user_id, platform: platform });
    }
    }
}



async function DB_store_mentions(trx, mentions, post_id) {
    /**
     * Stores the mentions in the database.
     * If the mention already exists in the database, it is skipped.
    **/
    // Getting Existing Mentions
    const existing_mentions = await trx('insta_post_mentions').select('*').where('post_id', post_id);
    //Combinging existing and new mentions
    const all_mentions = existing_mentions.concat(mentions);
    // Pushing unique mentions
    const new_mentions = all_mentions.filter((mention) => !existing_mentions.some((existing_mention) => existing_mention.username === mention.username && existing_mention.mention_type === mention.mention_type));
    if (new_mentions.length > 0) {
        await trx('insta_post_mentions').insert(new_mentions.map((mention) => ({ post_id: post_id, username: (mention.username).replace('@', ''), mention_type: mention.mention_type, insta_user_id: mention.insta_user_id })));
    }

}

async function saveCarouselMedia(carousel_media, post_id, trx) {
    /**
     * Saves the carousel photos to the database.
     * If the post is a carousel post, the photos are saved.
     **/
    for(const media of carousel_media) {
        try {
            if(media['video_url'] == null) {
                const bunnyCDNURL = (await upload_to_bunny_cdn_carousel(media['thumbnail_url'], 'instagram', post_id, media.id, 'photo')).image_url;
                await trx('insta_posts_media').insert({ post_id: post_id, thumbnail_url: bunnyCDNURL, media_type: 'image' });
            }
            else{
                const thumbnailBunnyCDNURL = (await upload_to_bunny_cdn_carousel(media['thumbnail_url'], 'instagram', post_id, media.id, 'video')).image_url;
                const videoBunnyCDNURL = (await upload_to_bunny_cdn_carousel(media['video_url'], 'instagram', post_id, media.id, 'video')).image_url;
                await trx('insta_posts_media').insert({ post_id: post_id, thumbnail_url: thumbnailBunnyCDNURL, video_url: videoBunnyCDNURL, media_type: 'video' });
            }
        } catch (error) {
            console.log(error, "couldnt store carousel media");
            // return {status: 500, success: false, message: error.message};
        }
    }
}

async function DB_store_post(trx, postData ,task_id) {
    /**
     * Stores the post in the database.
     * If the post already exists in the database, it is updated.
     * If the post doesn't exist in the database, it is inserted. 
    **/
    try {
        const movie_id = (await db('tasks').where('task_id', task_id).select('movie_id').first()).movie_id;
        // Getting UserID from Insta User ID
        const insta_user_id = postData['user']['id'];
        const [ user_id, ai_category, follower_count] = await DB_get_userID(trx, insta_user_id);
        if (user_id == null) {
            trx.rollback();
            return { status: 500, success: false, message: 'Cudnt Add User' };
        }

        const template = DB_template_post(postData, movie_id, user_id, follower_count);
        // checking if the post exists
        let post_id = null;
        // If post doesn't exist, insert a new record with null values and get the new post_id
        const existingPost = (await trx('insta_posts').select('post_id').where('insta_post_id', postData['id']).first());
        if (!existingPost) {
            post_id = (await trx('insta_posts').insert(template).returning('post_id'))[0].post_id;
            await trx('insta_posts').update({taskids: `"${task_id}"`}).where('post_id', post_id);
        }else{
            const taskids = (await trx('insta_posts').select('taskids').where('post_id', existingPost.post_id).first()).taskids;
            let taskidsArray = taskids ? taskids.split(',').map(id => id.trim().replace(/['"]+/g, '')) : [];
            taskidsArray.push(task_id.toString());
            const newTaskids = taskidsArray.map(id => `"${id}"`).join(', ');
            await trx('insta_posts').update({taskids: newTaskids}).where('post_id', existingPost.post_id);
            post_id = (await trx('insta_posts').update(template).where('post_id', existingPost.post_id).returning('post_id'))[0].post_id;
        }

        if (postData['media_name'] == 'album') {
            await saveCarouselMedia(postData['resources'], post_id, trx);    
        }
        else{
            const bunnyCDNURL = (await upload_to_bunny_cdn(template['thumbnail_img'], 'prakhar/instagram', post_id, 'post')).image_url;
            await trx('insta_posts').update({thumbnail_img: bunnyCDNURL}).where('post_id', post_id);
            if(template['video_url']){
                const videoBunnyCDNURL = (await upload_to_bunny_cdn(template['video_url'], 'prakhar/instagram', post_id, 'video')).image_url;
                await trx('insta_posts').update({video_url: videoBunnyCDNURL}).where('post_id', post_id);
            }
        }
        if (template['music_cover_img'] != null) {
            const bunnyCDNURLforMusic = (await upload_to_bunny_cdn(template['music_cover_img'], 'prakhar/instagram', post_id, 'music')).image_url;
            console.log(bunnyCDNURLforMusic);
            if (bunnyCDNURLforMusic == null) {
                logger.warn(`🟡 Error in uploading music cover image for post ${post_id}`);
            }
            if (bunnyCDNURLforMusic != null){
                await trx('insta_posts').update({music_cover_img: bunnyCDNURLforMusic}).where('post_id', post_id);
            }
        }
        // Using POST_ID , storing the mentions and hashtags
        const hashtags = postData['caption_hashtags'].map((hashtag) => (hashtag.split('#')[1]));
        const mentions = postData['caption_mentions'];
        const tagged_users = postData['tagged_users'].map((user) => ({ username: user.user.username, id: user.user.id }));        

        // Storing hashtags
        if (hashtags) {
            await DB_store_hashtags(trx, hashtags, post_id);
        }
        
        // Storing Mentions
        if (mentions || tagged_users) {
            const all_mentions = DB_template_mentions(mentions, tagged_users, post_id);
            await DB_store_mentions(trx, all_mentions, post_id);
        }
        return {status: 200, success: true,message: "User Stored Successfully"};

    } catch (error) {
        return { status: 500, success: false, message: error.message };
    }

}

async function DB_store_user(trx, userData ,task_id) {
    /**
     * Stores the user in the database.
     * If the user already exists in the database, it is updated.
     * If the user doesn't exist in the database, it is inserted.
     * User data is also sent to AI for categorization  
    **/
    try {
        // Setting template
        
        
        const insta_user_id = userData['id'];

        let [ user_id, ai_category, follower_count] = await DB_get_userID(trx, insta_user_id);
        console.log(`User ID = ${user_id} | AI Category = ${ai_category} | Follower Count = ${follower_count}`);
        if (ai_category == null) {
            try{
                const template_for_AI = DB_template_user_for_AI_Categorization(userData);
                ai_category = (await geminiCategorize(template_for_AI))?.category;
                logger.info(`⚪ Success at geminiCategorize(${userData['id']}) | AI Category = ${ai_category}`);
            }
            catch(error){
                ai_category = null;
                logger.error(`🔴 Error at geminiCategorize(${userData['id']}) : ${error}`);
            }
        }
        const template = DB_template_user(userData, ai_category);

        if (user_id == null) {
            trx.rollback();
            return { status: 500, success: false, message: 'Cudnt Add User' };
        }
        await trx('insta_users').update(template).where('user_id', user_id);     
        // Storing Emails if Available in template , along with their source
        if (template['biography_email'] || template['business_email']) {
            if (template['biography_email']) {
                await DB_store_email(trx, template['biography_email'], 'biography', user_id);
            }
            if (template['business_email']) {
                await DB_store_email(trx, template['business_email'], 'business', user_id);
            }
            
        }   
        
        const bunnyCDNURL = (await upload_to_bunny_cdn(template['profile_photo_hd'], 'prakhar/instagram', user_id, 'user')).image_url;
        //pushing to db
        await trx('insta_users').update({profile_photo_hd: bunnyCDNURL}).where('user_id', user_id);
        // Storing links along with the source, here all source will be bio_links
        // if ((userData['bio_links']).length > 0) {
        //     for (const link of userData['bio_links']) {
        //         if( (link.url !== null) || (link.url !== '') || ((link.url).length > 2) ) {
        //             await DB_store_link(trx,  link.url,  'bio_links', user_id);
        //         }
        //     }
        // }
        
        return {status: 200, success: true,message: "User Stored Successfully", user_id: user_id};

    } catch (error) {
        console.log(error, "couldnt store user");
        return {status: 500, success: false, message: error.message};
    }

}



function apply_like_filter(hashtag, hashtagData, like_count) {
    /**
     * Filters the posts based on the like count
     */
    const filtered_posts = hashtagData.filter(post => post.like_count >= like_count);
    logger.info(`⚪ Success at apply_like_filter(${hashtag}, ${like_count} ) | Received ${filtered_posts.length} posts`);
    return filtered_posts;
  }

function apply_valid_user_filter(hashtag, hashtagData) {
    /**
     * Retrieves the Unique User Ids and non private users 
     */
    const non_private_users = hashtagData.filter(post => !post.user.is_private);
    const unique_user_ids = [...new Set(non_private_users.map(item => item.user.id))];
    logger.info(`⚪ Success at apply_valid_user_filter(${hashtag}) | Received ${unique_user_ids.length} users`);
    return unique_user_ids;    
}


async function getHashtag(tag, pageCount = 1) {
    /**
     * Fetches the hashtag data
     * Also does the pagination for infinite scrolling
     * Retries the API call up to 3 times in case of failure
     */

    const INSA_RAPID_API_GET_OPTIONS = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': INSTA_RAPID_API_KEY,
            'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
    };
    creditLogger("v1.1/hashtag", tag, "No Additional Params", 1);

    let endpoint = `${INSTA_RAPID_API_URL}/v1.1/hashtag?hashtag=${tag}`;
    let hashtagDataList = [];
    const maxRetries = 3;

    for (let i = 0; i < pageCount; i++) {
        let success = false;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(endpoint, INSA_RAPID_API_GET_OPTIONS);
                if (response.status !== 200) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                const data = await response.json();
                hashtagDataList = hashtagDataList.concat(data.data.items);

                if (data.pagination_token && i < pageCount - 1) {
                    endpoint = `${INSTA_RAPID_API_URL}/v1.1/hashtag?hashtag=${tag}&pagination_token=${data.pagination_token}`;
                } else {
                    success = true;
                    break;
                }

            } catch (error) {
                logger.warn(`🟡 Attempt ${attempt} failed for getHashtag(tag=${tag}, pageCount=${pageCount}) with error: ${error.message}`);

                if (attempt === maxRetries) {
                    logger.error(`🔴 Error at getHashtag(tag=${tag}, pageCount=${pageCount}) after ${maxRetries} attempts`);
                    if (hashtagDataList.length === 0) {
                        return { status: 500, success: false, error: error.message, message: `🔴 Error at getHashtag(tag=${tag}, pageCount=${pageCount}) after ${maxRetries} attempts` };
                    }
                }
            }
        }

        if (!success) {
            break;
        }
    }
    // console.log("Check",hashtagDataList.length);
    const removeUndefined = hashtagDataList.filter(item => item !== undefined);
    const newHashtagDataList = removeUndefined.filter((item, index) => {
        return index === hashtagDataList.findIndex(obj => obj.code === item.code);
    });

    logger.info(`⚪ Success at getHashtag(tag=${tag}, pageCount=${pageCount}) | Received ${newHashtagDataList.length} posts`);
    return { status: 200, success: true, data: newHashtagDataList, count: newHashtagDataList.length, message: `⚪ Success at getHashtag(tag=${tag}, pageCount=${pageCount}) | Received ${newHashtagDataList.length} posts` };
}


async function getUser(username) {
    /**
     * Fetches the entire user data for a given username
     * Retries the API call up to 3 times in case of failure
     * */

    const INSA_RAPID_API_GET_OPTIONS = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': INSTA_RAPID_API_KEY,
            'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
    };

    let endpoint = `${INSTA_RAPID_API_URL}/v1/info?username_or_id_or_url=${username}&include_about=true`;
    let success = false;
    let data = {};
    creditLogger("v1.1/info?username_or_id_or_url", username, "include_about=true", 1);
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(endpoint, INSA_RAPID_API_GET_OPTIONS);
            if (response.status !== 200) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            data = await response.json();
            success = true;
            break;
        } catch (error) {   
            logger.warn(`🟡 Attempt ${attempt} failed for getUser(username=${username}) with error: ${error.message}`);

            if (attempt === 3) {
                logger.error(`🔴 Error at getUser(username=${username}) after ${attempt} attempts`);
                return { status: 500, success: false, error: error.message, message: `🔴 Error at getUser(username=${username}) after ${attempt} attempts` };
            }
        }
    }

    if (!success) {
        logger.error(`🔴 Error at getUser(username=${username}) after ${attempt} attempts`);
        return { status: 500, success: false, error: error.message, message: `🔴 Error at getUser(username=${username}) after ${attempt} attempts` };
    }

    return { status: 200, success: true, data: data, count: 1, message: `⚪ Success at getUser(username=${username})` };
}
async function getUsers(hashtag, userids, followerCount) {
    /**
     * Fetches the entire user data along with About
     * Also does the filtering based on the follower count
     * Retries the API call up to 3 times in case of failure
     */
    let usersDataList = [];

    try {
        
        const INSA_RAPID_API_GET_OPTIONS = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': INSTA_RAPID_API_KEY,
                'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        };
        const maxRetries = 3;
        
        
        for (const userid of userids) {
            let endpoint = `${INSTA_RAPID_API_URL}/v1/info?username_or_id_or_url=${userid}&include_about=true`;
            let success = false;
            
            creditLogger("v1.1/info?username_or_id_or_url", userid, "include_about=true", 2);
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = await fetch(endpoint, INSA_RAPID_API_GET_OPTIONS);
                    if (response.status !== 200) {
                        throw new Error(`Request failed with status ${response.status}`);
                }
                
                const data = await response.json();
                logger.info(`⚪ Success at getUsers(hashtag = ${hashtag} userid=${userid}) | User has ${data.data.follower_count} followers`);
                
                if (data.data.follower_count >= followerCount) {
                    usersDataList.push(data.data);
                }
                
                success = true;
                break;
                
            } catch (error) {
                logger.warn(`🟡 Attempt ${attempt} failed for getUsers(hashtag=${hashtag}, userid=${userid}) with error: ${error.message}`);
                
                if (attempt === maxRetries) {
                    logger.error(`🔴 Error at getUsers(hashtag = ${hashtag}, userid=${userid}) after ${maxRetries} attempts`);
                }
            }
        }
        
        if (!success) {
            logger.error(`🔴 Skipping user ${userid} after ${maxRetries} failed attempts`);
        }
    }
    
    const newUserIds = usersDataList.map(user => user.id);
    
    if (usersDataList.length === 0) {
        logger.warn(`🟡 No Users Found at getUsers(hashtag = ${hashtag}) | Could not get any users`);
        return { status: 200, success: true, message: `Could not get any users`, data: [], count: 0, userIDList: [] };
    } else if (usersDataList.length > 0) {
        logger.info(`⚪ Success at getUsers(hashtag = ${hashtag}) | Received ${usersDataList.length} users`);
        return { status: 200, success: true, data: usersDataList, count: usersDataList.length, userIDList: newUserIds };
    }
} catch (error) {
    logger.error(`🔴 Error at getUsers(hashtag = ${hashtag}) | ${error.message}`);
    return { status: 500, success: false,  count: 0, error: error.message, message: `🔴 Error at getUsers(hashtag = ${hashtag}) | ${error.message}` }``;
}
}

function apply_follower_filter(hashtagData, userIDList) {
    /**
     * Filters the posts based on the follower count
     */
    const filteredHashtagData = hashtagData.filter(post => userIDList.includes(post.user.id));
    logger.info(`⚪ Success at apply_follower_filter( hashtag = ${hashtag}) | Recieved ${filteredHashtagData.length} posts `);
    return filteredHashtagData;
}


async function apply_spam_filter(posts, task_id) {
    /**
     * Filters the posts based on the spam filter
     * Post is sent to AI to check if it is spam or not
     */
    try {
        let spam_filter_posts = [];
        const movie_id = (await db('tasks').where('task_id', task_id).select('movie_id').first()).movie_id;
        const Movie_Data_Raw = (await db('movies').where('id', movie_id).select('original_title', 'imdb_id', 'origin_release_date').first());
        const Movie_Actors = await db('movie_crew')
            .join('crew', 'movie_crew.crew_id', 'crew.id') // Join movie_crew with crew on crew_id
            .where('movie_crew.movie_id', movie_id)        // Filter by movie_id
            .andWhere(function () {
                this.where('crew.job', 'actor').orWhere('crew.job', 'actress'); // Filter by job as 'actor' or 'actress'
            })
            .select('crew.full_name as name'); 
        const Movie_Data = { ...Movie_Data_Raw, popular_characters: Movie_Actors };
        for (const post of posts) {
            const PostData_for_AI = DB_template_post_for_AI_Categorization(post);
            try{
                const is_spam = (await geminiCheckSpam(PostData_for_AI, Movie_Data))
                if (is_spam.spam === false) {
                    spam_filter_posts.push(post);
                    logger.info(`⚪ Success at apply_spam_filter(post_shortcode= ${PostData_for_AI.shortcode}, task_id = ${task_id}) | NOT SPAM`);
                }else {
                    logger.info(`⚪ Success at apply_spam_filter(post_shortcode= ${PostData_for_AI.shortcode}, task_id = ${task_id}) | SPAM `);
                }
            }
            catch (error) {
                logger.error(`🔴 Error at apply_spam_filter(post_shortcode= ${PostData_for_AI.shortcode}, task_id = ${task_id}) | ${error.message} `);
            }
        }
        logger.info(`⚪ Success at apply_spam_filter(task_id = ${task_id}) | Recieved ${spam_filter_posts.length} posts `);
        if (spam_filter_posts.length < 0 ) {
            logger.error(`🔴 Error at apply_spam_filter(task_id = ${task_id}) | Most of the Posts Spam Check Failed | Total Post feeded: ${posts.length} `);
            return {status: 500, success: false, message : `🔴 Error at apply_spam_filter(task_id = ${task_id}) | ${error.message}`};
        }   
        return {status: 200, success: true, data: spam_filter_posts, count: spam_filter_posts.length, userIDs: spam_filter_posts.map(post => post.user.id)};
    }
    catch (error) {
        logger.error(`🔴 Error at apply_spam_filter(task_id = ${task_id}`)
        
        return {status: 500, success: false, error: error.message , message : `🔴 Error at apply_spam_filter(task_id = ${task_id}) | ${error.message}`};
    }
}   


async function DB_Store_Posts_and_Users(POSTS, USERS, task_id) {
    /**
     * Store the posts and users in the database
     */
    const trx = await db.transaction(); 
    try {
        for (const user of USERS) {
            const DB_response = await DB_store_user(trx, user, task_id);
            if (!DB_response.success) {
                await trx.rollback();
                logger.error(`🔴 Error storing User at DB_Store_Posts_and_Users(task_id = ${task_id}, userid=${user}) | ${DB_response.message}`);
                return {status: 500, success: false, message: DB_response.message};
            }
        }      
        
        for (const post of POSTS) {
            const DB_response = await DB_store_post(trx, post, task_id);
            if (!DB_response.success) {
                await trx.rollback();
                logger.error(`🔴 Error storing Post at DB_Store_Posts_and_Users(task_id = ${task_id}, postid=${post}) | ${DB_response.message}`);
                return {status: 500, success: false, message: DB_response.message};
            }
        }
        await trx.commit();
        logger.info(`⚪ Success at DB_Store_Posts_and_Users(task_id = ${task_id}) | Data Stored Successfully`);
        return {status: 200, success: true};
    } catch (error) {
        await trx.rollback();
        logger.error(`🔴 Error at DB_Store_Posts_and_Users(task_id = ${task_id}) | ${error.message}`);
        return {status: 500, success: false, message: error.message};
    }
}

async function DB_store_to_Stir_relation_table(trx, stir_id, user_id, platform = 'instagram') {
    /**
     * Store the stir_id and user_id in the database
     */
 
    try {
        await trx('platform_relationv2').where({ stir_id: stir_id }) .update({ insta_id: user_id });
        return {success: true};
    } catch (error) {
        return {success: false};
    
}
}

async function creditLogger(endpoint, query, extras, credits){
    /**
     * Credit Logger
     * Log the credits used for each API Calls
    **/
    await db('insta_credits_usage').insert({endpoint: endpoint, query: query, extras: extras, credits: credits});
   }

   

async function processTask( hashtag, hashtagPageLimit, task_id, likesLimit, followersLimit) {
    /**
     * Main Processing Function
     * Process the task
     */
    const hashtagDataFetch = await getHashtag(tag=hashtag,pageCount=hashtagPageLimit);
    
    if (!hashtagDataFetch.success) { 
        return { status: 500, success: false}; 
    }
    const hashtagData = hashtagDataFetch.data;
    
    const liked_filter_posts =  apply_like_filter(hashtag, hashtagData, likesLimit);
    
    const valid_users = apply_valid_user_filter(hashtag, liked_filter_posts);
    
    const users = await getUsers(hashtag , valid_users, followerCount=followersLimit);
    if (users.count === 0 && users.success === false){
        return { status: 500, success: false}; 

    }
    if (users.count === 0 && users.success === true){
        return { status: 200, success: true ,totaldedupeduser: 0};


    }
    
    const follower_filter_posts = apply_follower_filter(liked_filter_posts, users.userIDList);

    const spam_filter_posts = await apply_spam_filter(follower_filter_posts, task_id);
    if (spam_filter_posts.success === false) { 
        return { status: 500, success: false};
    }

    const POSTS = spam_filter_posts.data
    const USERS = users.data.filter(user => spam_filter_posts.userIDs.includes(user.id));

    const DATABASE_RESPONSE = await DB_Store_Posts_and_Users(POSTS, USERS, task_id=task_id);
    if (!DATABASE_RESPONSE.success) { 
        return { status: 500, success: false}; 
    }


    return { status: 200, success: true ,totaldedupeduser: USERS.length};

}


async function setTask(task_id, status, totaldedupeduser) {
    /**
     * Set the task status in the database
     */
    await db('tasks').where('task_id', task_id).update({status: status, totaldedupeduser: totaldedupeduser});

}

async function processUser(stir_id, username) {
    /**
     * Process the user
    **/
    try{
        const userDataFetch = await getUser(username);    
        if (!userDataFetch.success) { 
            return { status: 500, success: false}; 
        }

        const userData = userDataFetch.data;
        const trx = await db.transaction(); 
        const DB_response = await DB_store_user(trx, userData.data);
        if (DB_response.success === false) {
            await trx.rollback();
            logger.error(`🔴 Error storing User at processUser(${username}) db_store_user`);
            return {status: 500, success: false};
        }
        const user_id = DB_response.user_id;
        const DB_response_2 = await DB_store_to_Stir_relation_table(trx,stir_id, user_id);
        if (!DB_response_2.success) {
            logger.error(`🔴 Error storing User at processUser(${username}) db_store_user_to_stir_relation_table `);
            return { status: 500, success: false};
        }

        
        trx.commit();
        return {status: 200, success: true, user_id : DB_response.user_id};
    } catch (error) {
       return {status: 500, success: false}; 
    }
}
module.exports = {processTask,processUser, setTask}