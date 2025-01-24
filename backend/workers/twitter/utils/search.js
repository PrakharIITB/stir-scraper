const axios = require('axios');
const logger = require('../logger/logger.js');
const knex = require("../../../database/db.js");
const moment = require("moment")
const { geminiCategorizeAndUpdate } = require("../gemini_twitter_worker.js")
const { insertAllData, updateUserImages, updateTweetMediaUrls } = require("./data_insertion.js")
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fs = require("fs")
const {spam_check} = require("./spam_checker.js")
async function search(task_id, channel, msg) {
    /**
     * This function is responsible for running loops and searching tweets(relevant ones)
     * While passing them to the insert Functions
     */
    try {
        const task = await knex('tasks').where({ task_id: task_id }).first();
        if (!task) {
            logger.error(`🔴 Task with task_id ${task_id} not found.`);
            logger.info("Finished Twitter ")
            channel.ack(msg);
            return
        }
        let paginationtoken = undefined;
        let max = 5;
        let index = 0
        await knex('tasks')
            .where({ task_id })
            .update({ status: 'processing' })
        let query
        if(task.query.includes(" ")){
            query = task.query.split(" ");
        }
        else{
            query = [task.query]
        }
        const movie_id = task.movie_id;
        const movie = await knex('movies').where({ movieid: movie_id }).first();
        if (!movie) {
            logger.error(`🔴 Movie with movie_id ${movie_id} not found.`);
        }
        let filtered = [];
        let count_of_profiles = 0
        for(let i = 0; i<max;i++){
            const tempkeyword = query.map(item => `(${item})`).join(" OR ");
            let tempkeywords = [];
            tempkeywords.push(`${tempkeyword}`);
            let axiosOptions = {
                method: 'GET',
                url: 'https://twitter241.p.rapidapi.com/search',
                params: {
                    type: 'Top',
                    count: '20'
                },
                headers: {
                    'x-rapidapi-key': process.env.XAPI,
                    'x-rapidapi-host': 'twitter241.p.rapidapi.com'
                }
            }
            //Pagination token is responsible for getting the next Page data points
            if(paginationtoken != undefined){
                axiosOptions = {
                    method: 'GET',
                    url: 'https://twitter241.p.rapidapi.com/search',
                    params: {
                        type: 'Top',
                        count: '20',
                        cursor:`${paginationtoken}`
                    },
                    headers: {
                        'x-rapidapi-key': process.env.XAPI,
                        'x-rapidapi-host': 'twitter241.p.rapidapi.com'
                    }
                }
                logger.info("Pagination Token updated")
            }
    
            for (const query of tempkeywords){
                axiosOptions.params.query = query;
                await knex("twitter_credit_usage").insert({
                    endpoint: "https://twitter241.p.rapidapi.com/search",
                    credit: 1,
                    time: new Date()
                })
                try {
                    const response = await axios.request(axiosOptions);
                    paginationtoken=response.data?.cursor?.bottom || undefined
                    const entries = response.data.result.timeline.instructions[0].entries;
                    for (const item of entries) {
                        if (
                            item.content.__typename === "TimelineTimelineItem" &&
                            item.content.clientEventInfo.element === "tweet"
                        ) {
                            let issue_acces =
                                item.content.itemContent.tweet_results.result &&
                                item.content.itemContent.tweet_results.result.core ?
                                item.content.itemContent.tweet_results.result :
                                item.content.itemContent.tweet_results.result.tweet;
    
                            let issue_acces2 =
                                item.content.itemContent.tweet_results.result &&
                                item.content.itemContent.tweet_results.result.core ?
                                item.content.itemContent.tweet_results.result.core :
                                item.content.itemContent.tweet_results.result.tweet.core;
    
                            const user = issue_acces2.user_results.result.legacy;
                            const tweet = issue_acces.legacy;
                            const user_followers_count = user.followers_count;
                            const tweet_views = item.content.itemContent.tweet_results.result.views ?
                                item.content.itemContent.tweet_results.result.views.count || 0 :
                                item.content.itemContent.tweet_results.result.tweet.views.count || 0;
                            const tweet_likes = tweet.favorite_count;
                            const tweet_retweets = tweet.retweet_count;
                            let profile = user.profile_image_url_https
                            if(user.profile_image_url_https != null){
                                profile = user.profile_image_url_https.includes("normal.jpg")
                                    ? user.profile_image_url_https.replace("normal.jpg", "400x400.jpg")
                                    : user.profile_image_url_https;
                            }
                            if (user_followers_count >= 3000 && tweet_views > 80 && tweet_likes > 10 && tweet_retweets > 5) {
                                let obj = {
                                    user_can_dm: user.can_dm,
                                    user_description: user.description,
                                    user_urls: user.entities.description.urls,
                                    user_fast_followers_count: parseInt(user.fast_followers_count, 10),
                                    user_favourites_count: parseInt(user.favourites_count, 10),
                                    user_listed_count: parseInt(user.listed_count, 10),
                                    user_normal_followers_count: parseInt(user.normal_followers_count, 10),
                                    user_followers_count: parseInt(user.followers_count),
                                    user_friends_count: parseInt(user.friends_count, 10),
                                    user_location: user.location,
                                    user_statuses_count: parseInt(user.statuses_count, 10),
                                    user_media_count: parseInt(user.media_count, 10),
                                    user_name: user.name,
                                    user_possibly_sensitive: user.possibly_sensitive,
                                    user_profile_banner_url: user.profile_banner_url,
                                    user_profile_image_url_https: profile,
                                    user_screen_name: user.screen_name,
                                    user_verified: user.verified,
                                    user_rest_id: issue_acces2.user_results.result.rest_id,
                                    tweet_bookmark_count: tweet.bookmark_count,
                                    tweet_conversation_id_str: tweet.conversation_id_str,
                                    tweet_created_at: new Date(tweet.created_at).toISOString(),
                                    tweet_hashtags: tweet.entities.hashtags.map((hashtag) => hashtag.text),
                                    tweet_media: tweet.entities && tweet.entities.media && Array.isArray(tweet.entities.media) ?
                                        tweet.entities.media.map((mediaItem) => ({
                                            display_url: mediaItem.display_url,
                                            expanded_url: mediaItem.expanded_url,
                                            id_str: mediaItem.id_str,
                                            media_key: mediaItem.media_key,
                                            media_url_https: mediaItem.media_url_https,
                                        })) : [],
                                    tweet_urls: tweet.entities.urls,
                                    tweet_user_mentions: tweet.entities.user_mentions,
                                    tweet_full_text: tweet.full_text,
                                    tweet_id_str: tweet.id_str,
                                    tweet_task_id:task_id,
                                    tweet_possibly_sensitive: tweet.possibly_sensitive,
                                    tweet_retweeted: tweet.retweeted,
                                    tweet_favorite_count: parseInt(tweet.favorite_count, 10),
                                    tweet_retweet_count: parseInt(tweet.retweet_count, 10),
                                    tweet_quote_count: parseInt(tweet.quote_count, 10),
                                    tweet_views: parseInt(tweet_views, 10),
                                    tweet_view_state: item.content.itemContent.tweet_results.result.views ?
                                        item.content.itemContent.tweet_results.result.views.state : item.content.itemContent.tweet_results.result.tweet.views.state,
                                };
                                if (!filtered.some(item=>item.user_rest_id == obj.user_rest_id)) {
                                    count_of_profiles++
                                }                             
                                if (!filtered.some(item => item.tweet_id_str == obj.tweet_id_str)) {
                                    const tweet_Data = {
                                        user_screen_name:obj.user_screen_name,
                                        TweetID:obj.tweet_id_str,
                                        tweet_full_text: obj.tweet_full_text,
                                        tweet_user_mentions: obj.tweet_user_mentions,
                                        tweet_urls: obj.tweet_urls,
                                        tweet_hashtags: obj.tweet_hashtags,
                                        tweet_created_at: obj.tweet_created_at
                                    }
                                    const spam = await spam_check(tweet_Data,movie)
                                    if(spam) {
                                    logger.info("Rejected due to Spam");
                                    break;
                                    }
                                    filtered.push(obj);
                                    
                                    //Passing down the object into the insert Function
                                    const process = await insertAllData(knex, obj, movie_id);
                                    if (process === false) channel.nack(msg)
                                    logger.info("Data inserted successfully");
                                    await wait(1500);
                                }
                                else{
                                    logger.info("Already inserted");
                                }
     
                            } else {
                                logger.info("Nothing here, no one fits the final criteria");
                            }
                        } else {
                            logger.info("Nothing here, no one fits the basic criteria");
                        }
                    }
                } catch (error) {
                    logger.error(`🔴 Error processing query:`, error);
                }
    
                // Wait before proceeding to the next query
                await wait(1000);
                index++;
            }
            await wait(1000);
        }
        await knex('tasks')
            .where({ task_id })
            .update({
                totaldedupeduser: count_of_profiles,
                status: 'completed'
            })
        logger.info("Finished Twitter ")
        channel.ack(msg);

    } catch (error) {
        channel.nack(msg)
        logger.error(`🔴 Twitter Worker error: ${error}`);
        await knex('tasks')
            .where({ task_id })
            .update({ status: 'failed' })
    }
}

module.exports = {
    search
}