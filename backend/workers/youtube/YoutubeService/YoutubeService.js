// import modules:
const axios = require('axios');
// Import the Knex database connection for performing CRUD operations
const db = require('../../../database/db.js');
// importing custom logger module:
const logger = require('../logger/logger.js');
// YoutubeService class that contains all the methods for Youtube api calls:
class YoutubeService {
    constructor() {
        this.ytApiKeys = [
            // 'AIzaSyAUFOsLiv6AjXpyUsOfLJDTMyb8DkjIkN8',
            'AIzaSyA06CVrGPIkLKemQKhpcIVFdBl8b2Nbfmk',
            'AIzaSyAKlI5HjeI3oMuU0RUuASPZNpdUYKsy3wM',
            'AIzaSyAi05pSxCrCTYO7qHnAxT9TolnludyiVos',
            'AIzaSyBq1VTENc94928zk-hf6dMFpUs90rAcaPg',
            'AIzaSyDUud814bfFfWs7XMY3qLRzExrE4Atkb88',
            'AIzaSyBc_OLz5jYSmeQj56Io53sahYs3ArHlRN4',
              
        ];
        this.currentIndex = 0;
        this.tasksArray = [];
        this.queryResults = [];
        this.updateInterval = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds

    }
    async main(taskid) {
        // PURPOSE: main function that fetches a specific Youtube task by taskid, executes it, and updates its status in the tasks table
        // PARAMS: taskid - The ID of the task to be processed
        // RETURN: success message if execution is successful or an error message

        try {
            logger.info("🚀 Main function started!");
            let channelInfoArray;
            // Fetch the specific task by taskid
            const yt_task = await db('tasks').where({ task_id: taskid, platform: 'youtube' }).first();
            if (!yt_task) {
                logger.error(`❌ Task with ID ${taskid} not found for platform 'youtube'`);
                return { message: `Task with ID ${taskid} not found for platform 'youtube'` };
            }

            if (yt_task.status !== 'pending') {
                logger.info(`Task with ID ${taskid} is not pending. Current status: ${yt_task.status}`);
                return { message: `Task with ID ${taskid} is not pending. Current status: ${yt_task.status}` };
            }

            const query = yt_task.query;
            const movie_id = yt_task.movie_id;
            await db('tasks').where({ task_id: taskid, platform: 'youtube' }).update({ status: 'processing' });
            const movieResult = await db("movies").select(['title', 'release_date', 'overview']).where({ movieid: movie_id }).first();
            const movieActors = await db("movies_actor").select(['name']).where({ movieid: movie_id });
            let movie_data = {
                movie_title: movieResult.title,
                movie_release_date: movieResult.release_date,
                movie_overview: movieResult.overview,
                movie_actors: movieActors.map(actor => actor.name),
            };
            if (query) {
                const results = await this.getQueryResults(query, movie_id);
                logger.info(`Number of results for query '${query}': ${results.length}`);
                const filteredResults = await this.filterQueryResults(results, movie_data);
                logger.info(`Number of filtered results for query '${query}': ${filteredResults.length}`);

                // Save the filtered data to respective tables
                const savedData = await this.saveChannelData(filteredResults, taskid);

                // Array to track channel details: {channel_id, platform, channel_username}
                channelInfoArray = savedData.channel_info_array;
                if (savedData.success) {
                    logger.info("💿 Data saved successfully!");
                    // Find and update the channel category in the YT_CHANNELS table
                    await this.updateChannelCategory();
                    // Update totaldedupedusers in tasks table
                    const uniqueChannelIds = new Set(filteredResults.map(result => result.channelDetails.id));
                    const totalUniqueChannels = uniqueChannelIds.size;

                    try {
                        await db('tasks')
                            .where({ task_id: taskid, platform: 'youtube' })
                            .update({
                                totaldedupeduser: totalUniqueChannels,
                                status: 'completed'
                            });
                        logger.info(`🧑‍💼 Updated 'totaldedupedusers' to ${totalUniqueChannels} for task ID '${taskid}'`);
                        logger.info(`☑️ Updated status to 'completed' for task ID '${taskid}'`);
                    } catch (error) {
                        logger.error(`❌ Error updating tasks table for task ID '${taskid}': ${error}`);
                        await this.markTaskAsFailed(taskid);
                    }
                } else {
                    await this.markTaskAsFailed(taskid);
                }
            } else {
                logger.error(`❌ No query found for task ID '${taskid}'`);
                await this.markTaskAsFailed(taskid);
            }
            logger.info("🎉 Main function completed successfully!");
            return { message: "Main function executed successfully for task ID " + taskid, channelInfoArray: channelInfoArray };
        } catch (error) {
            logger.error(`❌ Error in executing main function for task ID ${taskid}: ${error}`);
            return { message: `Error in executing main function for task ID ${taskid}`, channelInfoArray: [] };
        }
    }
    async fillChannelData(stir_id, username) {
        logger.info(`🚀 Start fillchannelData method for username: ${username} and stir id: ${stir_id}`);
        let alreadyExists = false;
        try {
            const exists = await db('YT_CHANNELS').where({ username: username.replace(/@/, '').toLowerCase() }).orWhere({ yt_channel_id: username }).first();
            if (exists) {
                logger.info(`Channel already exists with username ${username}`);
                alreadyExists = true;
            }
        }
        catch (error) {
            logger.error(`❌ Error in checking if channel exists: ${error}`);
            return { data: null, success: false }
        }
        try {
            let channelDataForGemini
            let yt_channel_id;
            let channelData = null;
            let preparedData = {};
            let validCategory = null;
            let formattedKeywords = null;
            if (username.startsWith('@')) {
                console.log("username: ", username)
                let retries = 0;
                while (retries < this.ytApiKeys.length) {
                    try {
                        const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
                            params: {
                                part: 'snippet',
                                q: `${username}`,
                                type: 'channel',
                                key: this.ytApiKeys[this.currentIndex],
                                maxResults: 5
                            }
                        })
                        await this.storeCredits(`${username}`, '/search', 100);
                        if (res.data.items.length > 0) {
                            for (let i = 0; i < res.data.items.length; i++) {
                                yt_channel_id = res.data.items[i].id.channelId;
                                console.log("yt_channel_id: ", yt_channel_id)
                                try {
                                    const channelDetails = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
                                        params: {
                                            part: 'contentDetails,statistics,snippet,brandingSettings',
                                            id: yt_channel_id,
                                            key: this.ytApiKeys[this.currentIndex],
                                        }
                                    });
                                    await this.storeCredits(`${yt_channel_id}`, '/channel', 1);
                                    if (!channelDetails.data?.items?.length) {
                                        logger.info(`skipping channel ${yt_channel_id} as no data found`);
                                        channelData = null;
                                        continue;
                                    }
                                    logger.info(`current iteration channel username :${channelDetails.data.items[0].snippet.customUrl}`)
                                    // cross check the username is the same
                                    if (username.toLowerCase() === channelDetails.data.items[0].snippet.customUrl.toLowerCase()) {
                                        logger.info("username matched!")
                                        channelData = channelDetails.data.items[0];
                                        break;
                                    }
                                    else {
                                        console.log("not matched\n")
                                        channelData = null;
                                    }
                                }
                                catch (error) {
                                    if (error.response && error.response.status === 403) {
                                        this.rotateApiKey();
                                        retries++;
                                    }
                                    else {
                                        logger.error(`❌ Error in /channel api call for channel id ${yt_channel_id}: ${error}`)
                                        return { data: null, success: false };
                                    }
                                }
                            }
                        }
                        else {
                            return { data: null, success: false }
                        }
                        break;
                    }
                    catch (error) {
                        if (error.response && error.response.status === 403) {
                            this.rotateApiKey();
                            retries++;
                        }
                        else {
                            logger.error(`❌ Error in /search api call for username:${username}  ${error}`)
                            return { data: null, success: false };
                        }
                    }
                }
            }
            else {
                yt_channel_id = username;
                let retries = 0;
                while (retries < this.ytApiKeys.length) {
                    try {
                        const channelDetails = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
                            params: {
                                part: 'contentDetails,statistics,snippet,brandingSettings',
                                id: yt_channel_id,
                                key: this.ytApiKeys[this.currentIndex],
                            }
                        });
                        await this.storeCredits(`${yt_channel_id}`, '/channel', 1);
                        if (!channelDetails.data?.items?.length) {
                            logger.info(`skipping channel ${yt_channel_id} as no data found and channelData is set to null`);
                            channelData = null;
                            return { data: null, success: false };
                            // break;
                        }
                        if (channelDetails.data.items.length > 0) {
                            channelData = channelDetails.data.items[0];
                        }
                        else {
                            channelData = null;
                        }
                        break;
                    }
                    catch (error) {
                        if (error.response && error.response.status === 403) {
                            this.rotateApiKey();
                            retries++;
                        }
                        else {
                            logger.error(`❌ Error in /channel api call for channel id ${yt_channel_id}: ${error}`)
                            return { data: null, success: false };
                        }
                    }
                }
            }
            // return success false if no channel data is found
            if (!channelData) {
                return { data: null, success: false };
            }
            // format the channel keywords
            if (channelData.brandingSettings.channel.keywords) {
                const rawKeywords = channelData.brandingSettings.channel.keywords;

                const regex = /"([^"]*)"/g;
                const unquotedKeywords = rawKeywords.split(',').map(keyword => keyword.trim());
                const extractedKeywords = [];

                let match;
                while ((match = regex.exec(rawKeywords)) !== null) {
                    extractedKeywords.push(match[1].trim());
                }

                unquotedKeywords.forEach(keyword => {
                    if (!extractedKeywords.includes(keyword) && keyword.length > 0) {
                        extractedKeywords.push(keyword);
                    }
                });

                const uniqueKeywords = [...new Set(extractedKeywords.map(keyword => keyword.trim()))];
                formattedKeywords = uniqueKeywords
                    .map(keyword => `${keyword.replace(/"/g, '""')}`)
                    .join(', ');
            } else {
                formattedKeywords = null;
            }
            if (!alreadyExists) {
                // Get last 5 videos and fill channelDataForGemini
                const last5VideoTitles = await retry(() => this.getLast5VideosFromPlaylist(channelData.contentDetails.relatedPlaylists.uploads), 3, 1000);
                channelDataForGemini = {
                    description: channelData.snippet.description,
                    recentVideos: last5VideoTitles,
                    username: channelData.snippet.customUrl.replace(/@/, ''),
                }
                const category = await retry(() => geminiCategorize(channelDataForGemini), 3, 1000);
                validCategory = category?.category;
            }
            // prepare the data object to be stored
            preparedData = {
                yt_channel_id: yt_channel_id,
                username: channelData.snippet.customUrl.replace(/@/, ''),
                channel_name: channelData.snippet.title,
                channel_description: channelData.snippet.description,
                channel_country: channelData.snippet.country,
                channel_category: validCategory || null,
                thumbnail_link: channelData.snippet.thumbnails.default.url,
                trailer_id: channelData.brandingSettings.channel.unsubscribedTrailer,
                playlist_id: channelData.contentDetails.relatedPlaylists.uploads,
                email_id_button: false,
                created_at: new Date(channelData.snippet.publishedAt),
                subscriber_count: channelData.statistics.subscriberCount,
                channel_keywords: formattedKeywords || null,
            }
            // save the data to the database
            const success = await this.saveNonTaskChannelData(preparedData, alreadyExists);
            if (success.success) {
                logger.info(`Category of channel: ${success.channel_id} is : ${validCategory}`);
                const pass = await this.saveToRelationTable(stir_id, success.channel_id);
                if (pass) {
                    return { data: { platform: "youtube", channel_id: success.channel_id, yt_channel_id: yt_channel_id }, success: true };
                }
                else {
                    return { data: null, success: false };
                }
            }
            else {
                return { data: null, success: false };
            }

        }
        catch (error) {
            logger.error(`❌ Error in fillChannelData Method: ${error}`);
            return { data: null, success: false };
        }
    }
    async fetchYtQuery() {
        // PURPOSE: fetch all tasks with platform 'youtube' from Tasks Table
        // PARAMS: none
        // RETURN: array of tasks
        try {
            const tasks = await db('tasks').select('*').where({ platform: 'youtube' });
            return tasks;
        } catch (error) {
            logger.error(`❌ Error fetching tasks with platform 'youtube' from Tasks Table: ${error}`);
        }
    }
    async getQueryResults(query, movieId) {
        // PURPOSE: get results for a query from youtube api -> (/search,  /channels, /videos) and store results in queryResults array
        // PARAMS: query, movieId
        // RETURN: queryResults array 
        try {
            this.queryResults = [];
            // retrying if api key exhausted (403 error) && Max retry is Number of keys Present in ytApiKeys Array
            let retries = 0;
            while (retries < this.ytApiKeys.length) {
                try {
                    const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
                        params: {
                            part: 'snippet',
                            q: query,
                            key: this.ytApiKeys[this.currentIndex],
                            type: 'video',
                            maxResults: 50,
                        }
                    });
                    await this.storeCredits(`${query}`, '/search', 100);
                    for (let i = 0; i < response.data.items.length; i++) {
                        try {
                            const channelId = response.data.items[i].snippet.channelId;

                            const channelDetails = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
                                params: {
                                    part: 'contentDetails,statistics,snippet,brandingSettings',
                                    id: channelId,
                                    key: this.ytApiKeys[this.currentIndex],
                                }
                            });
                            await this.storeCredits(`${channelId}`, '/channel', 1);
                            if (!channelDetails.data?.items?.length) {
                                logger.info("❗ skipping to next iteration , channel details couldn't be found (channel doesn't exist)");
                                continue;
                            }
                            response.data.items[i].channelDetails = channelDetails.data.items[0];
                        } catch (error) {
                            if (error.response && error.response.status === 403) {
                                this.rotateApiKey();
                                retries++;
                            } else {
                                logger.error(`❌ Error in getting channel details: ${error}`);
                            }
                        }
                        try {
                            const videoId = response.data.items[i].id.videoId;
                            const videoDetails = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
                                params: {
                                    part: 'snippet,statistics,contentDetails',
                                    id: videoId,
                                    key: this.ytApiKeys[this.currentIndex],
                                }
                            });
                            await this.storeCredits(`${videoId}`, '/video', 1);
                            response.data.items[i].videoDetails = videoDetails.data.items[0];
                            // change here to time not varchar time
                            const durationISO = videoDetails.data.items[0].contentDetails.duration;
                            response.data.items[i].videoDetails.duration = parseISO8601Duration(durationISO);
                        } catch (error) {
                            if (error.response && error.response.status === 403) {
                                this.rotateApiKey();
                                retries++;
                            } else {
                                logger.error(`❌ Error in getting video details: ${error}`);
                            }
                        }
                        response.data.items[i].movieId = movieId;
                        this.queryResults.push(response.data.items[i]);
                    }
                    logger.info(`🟢 (getQueryResults function) Successfully fetched results for the query: ${query}`);
                    return this.queryResults;
                } catch (error) {
                    if (error.response && error.response.status === 403) {
                        this.rotateApiKey();
                        retries++;
                    } else {
                        logger.error(`❌ Error in fetching videos from the query = ${query} : ${error}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Error in getting results for the query: ${query}, Error: ${error}`);
            return [];
        }
    }
    async filterQueryResults(results, movie_data) {
        // PURPOSE: filter results array based on subscriber count >= 3000 , latest video upload date within six months and gemini spam video filter
        // PARAMS: results array
        // RETURN: filtered array
        try {
            const sixMonthsAgoFromNow = new Date();
            sixMonthsAgoFromNow.setMonth(sixMonthsAgoFromNow.getMonth() - 6);
            const filteredResults = [];
            for (const result of results) {
                const subscriberCount = result.channelDetails.statistics.subscriberCount;
                const uploadsPlaylistId = result.channelDetails.contentDetails.relatedPlaylists.uploads;
                const latestUploadDate = await this.getLatestVideoFromPlaylist(uploadsPlaylistId);
                const includeResult = subscriberCount >= 3000 &&
                    (latestUploadDate && latestUploadDate >= sixMonthsAgoFromNow);
                if (includeResult) {
                    const video_data = {
                        video_title: result.videoDetails.snippet.title,
                        video_description: result.videoDetails.snippet.description,
                        channel_name: result.channelDetails.snippet.title,
                        video_tags: result.videoDetails.snippet.tags,
                    }
                    const isSpam = await checkVideoSpam(video_data, movie_data);
                    if (!isSpam.spam) {
                        logger.info(`🗹 video is not a spam  : ${video_data.video_title} (${result.videoDetails.id}) and ${movie_data.movie_title}`);
                        logger.info(`reason : ${isSpam.reason}`);
                        filteredResults.push(result);
                    }
                    else {
                        logger.info(`🟠 video is a spam : ${video_data.video_title} (${result.videoDetails.id}) and ${movie_data.movie_title}`);
                        logger.info(`reason : ${isSpam.reason}`);
                    }
                }
            }
            logger.info(`🟢 (filterQueryResults function) Successfully filtered results`);
            return filteredResults;
        } catch (error) {
            logger.error(`❌ Error in filtering results: ${error}`);
        }
    }
    async getLatestVideoFromPlaylist(playlistId) {
        // PURPOSE: get the latest video upload date from the playlist using youtube API (/playlistItems)
        // PARAMS: playlistId
        // RETURN: date object
        try {
            let retries = 0;
            while (retries < this.ytApiKeys.length) {
                try {
                    // Fetch the latest video date from the playlist and get its upload date
                    const response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
                        params: {
                            part: 'snippet',
                            playlistId: playlistId,
                            maxResults: 1,
                            order: 'date',
                            key: this.ytApiKeys[this.currentIndex],
                        }
                    });
                    await this.storeCredits(`${playlistId} : playlistId for last video date`, '/playlistItems', 1);
                    if (response.data.items.length > 0) {
                        return new Date(response.data.items[0].snippet.publishedAt);
                    }
                    return null;
                } catch (error) {
                    if (error.response && error.response.status === 404) {
                        return null;
                    }
                    else if (error.response && error.response.status === 403) {
                        this.rotateApiKey();
                        retries++;
                    } else {
                        logger.error(`❌ Error fetching playlist items for last video upload date: ${error}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Error in getLatestVideoFromPlaylist: ${error}`);
        }
    }
    async getLast5VideosFromPlaylist(playlistId) {
        // PURPOSE: get the last 5 videos from the playlist using youtube API (/playlistItems)
        // PARAMS: playlistId
        // RETURN: array of last 5video titles for the respective channel
        try {
            let retries = 0;
            while (retries < this.ytApiKeys.length) {
                try {
                    const response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
                        params: {
                            part: 'snippet',
                            playlistId: playlistId,
                            maxResults: 5, // Fetch the last 5 videos
                            order: 'date',
                            key: this.ytApiKeys[this.currentIndex],
                        }
                    });
                    await this.storeCredits(`${playlistId} : playlistId for last 5 video titles`, '/playlistItems', 1);
                    return response.data.items.map(item => item.snippet.title);
                } catch (error) {
                    if (error.response && error.response.status === 403) {
                        this.rotateApiKey();
                        retries++;
                    }
                    else if (error.response && error.response.status === 404) {
                        return [];
                    }
                    else {
                        logger.error(`❌ Error fetching playlist items for last 5 videos: ${error}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Error in getLast5VideosFromPlaylist: ${error}`);
        }
    }
    async updateChannelCategory() {
        // PURPOSE: fetch channels with null category and update the channel category in the YT_CHANNELS table by finding category from gemini
        // PARAMS: none
        // RETURN: none
        try {
            // Fetch channels with null categories
            const channelsArr = await db('YT_CHANNELS').select('*').where({ channel_category: null });
            const channelData = {};
            for (const channel of channelsArr) {
                const channelId = channel.channel_id;
                const uploadsPlaylistId = channel.playlist_id;
                if (uploadsPlaylistId) {
                    // Fetch the last 5 videos from the uploads playlist with retry logic
                    const last5VideoTitles = await retry(() => this.getLast5VideosFromPlaylist(uploadsPlaylistId), 3, 1000);
                    // Prepare the channel data
                    channelData[channelId] = {
                        description: channel.channel_description,
                        recentVideos: last5VideoTitles,
                        username: channel.username,
                    };
                    // Pass the channel data to the Gemini function with retry logic
                    const category = await retry(() => geminiCategorize(channelData[channelId]), 3, 1000);
                    const validCategory = category?.category; // Use optional chaining to handle cases where category might be undefined

                    // Update the channel category in the database with retry logic
                    if (validCategory) {
                        await retry(() => db('YT_CHANNELS')
                            .where({ channel_id: channelId })
                            .update({ channel_category: validCategory }), 3, 1000);

                        logger.info(`Updated category for channel ${channelId} to ${validCategory}`);
                    } else {
                        logger.info(`No valid category found for channel ${channelId}`);
                    }
                } else {
                    // Handle case where playlist_id is not available
                    channelData[channelId] = {
                        description: channel.channel_description,
                        recentVideos: [] // No videos if playlist_id is not available
                    };
                }
            }
            logger.info(`🟢 (updateChannelCategory function) Successfully updated category`)
        } catch (error) {
            logger.error(`❌ Error in updating channel category: ${error}`);
        }
    }
    rotateApiKey() {
        // PURPOSE: rotate the api key if previous key is exhausted (error status 403)
        // PARAMS: none
        // RETURN: none
        logger.info(`↻ Rotating yt api key`);
        this.currentIndex = (this.currentIndex + 1) % this.ytApiKeys.length;
    }
    async saveChannelData(filteredData, taskid) {
        // PURPOSE: save channel data to database
        // PARAMS: filteredData array
        // RETURN: none
        const trx = await db.transaction(); // Start a transaction
        let channel_info_array = [];
        try {
            for (const data of filteredData) {
                const channel = data.channelDetails;
                const videoDetails = data.videoDetails;

                // Check if the channel already exists
                const existingChannel = await trx('YT_CHANNELS')
                    .select(['channel_id'])
                    .where({ yt_channel_id: channel.id })
                    .first();
                let channelID;
                let videoID;
                if (!existingChannel) {
                    // Save channel data to YT_CHANNELS table
                    const [result] = await trx('YT_CHANNELS').returning('channel_id').insert({
                        yt_channel_id: channel.id,
                        channel_name: channel.snippet.title,
                        channel_description: channel.snippet.description,
                        channel_country: channel.snippet.country || null,
                        channel_category: null,
                        thumbnail_link: channel.snippet.thumbnails.default.url,
                        trailer_id: channel.brandingSettings.channel.unsubscribedTrailer || null,
                        playlist_id: channel.contentDetails.relatedPlaylists.uploads || null,
                        email_id_button: channel.brandingSettings.channel.email || false,
                        username: channel.snippet.customUrl.replace(/@/, '') || null,
                        created_at: new Date(channel.snippet.publishedAt),
                        updated_at: new Date(),
                        subscriber_count: channel.statistics.subscriberCount || null,
                    });
                    channelID = result.channel_id;
                    logger.info(`channel_id: ${channelID}`);
                    // Keep track of channel info for yt_scraper
                    const channel_info = {
                        channel_id: channelID || result.channel_id,
                        yt_channel_id: channel.id,
                        platform: 'youtube',
                    }
                    channel_info_array.push(channel_info);
                    // Find email through source: channel_description and save it to the YT_EMAILS table 
                    const gmailRegex = /[a-zA-Z0-9._%+-]+@gmail\.com/g;
                    const description = channel.snippet.description;
                    const gmailsFound = description.match(gmailRegex);
                    if (gmailsFound && gmailsFound.length > 0) {
                        // Loop through each found Gmail and save it to the YT_EMAILS table
                        for (const gmail of gmailsFound) {
                            await trx('YT_EMAILS').insert({
                                channel_id: channelID || result.channel_id,
                                email: gmail,
                                source: 'description',
                            });
                            logger.info(`Saved Gmail: ${gmail}`);
                        }
                    } else {
                        logger.info('No Gmail address found in channel description');
                    }
                    // Save channel keywords to YT_CHANNEL_KEYWORDS table
                    if (channel.brandingSettings.channel.keywords) {
                        const rawKeywords = channel.brandingSettings.channel.keywords;
                        const regex = /"([^"]*)"/g;
                        const unquotedKeywords = rawKeywords.split(',').map(keyword => keyword.trim());
                        const extractedKeywords = [];

                        let match;
                        while ((match = regex.exec(rawKeywords)) !== null) {
                            extractedKeywords.push(match[1].trim());
                        }

                        unquotedKeywords.forEach(keyword => {
                            if (!extractedKeywords.includes(keyword) && keyword.length > 0) {
                                extractedKeywords.push(keyword);
                            }
                        });

                        const uniqueKeywords = [...new Set(extractedKeywords.map(keyword => keyword.trim()))];
                        const formattedKeywords = uniqueKeywords
                            .map(keyword => `${keyword.replace(/"/g, '""')}`)
                            .join(', ');

                        await trx('YT_CHANNEL_KEYWORDS').insert({
                            channel_id: channelID,
                            channel_keyword: formattedKeywords
                        });
                    } else {
                        await trx('YT_CHANNEL_KEYWORDS').insert({
                            channel_id: channelID,
                            channel_keyword: null
                        });
                    }
                }
                else {
                    // update tables data if channel already exists and if more than 6 days for last updated:
                    const lastUpdated = await trx('YT_CHANNELS').where({ yt_channel_id: channel.id }).select('updated_at').first();
                    if (new Date() - new Date(lastUpdated.updated_at) < this.updateInterval) {
                        logger.info(`Channel ${channel.id} already exists and last updated was less than 6 days ago. Skipping update.`);
                    }
                    else {
                        logger.info(`Channel ${channel.id} already exists and last updated was more than 6 days ago. Updating...`);
                        await trx('YT_CHANNELS').where({ yt_channel_id: channel.id }).update({
                            channel_name: channel.snippet.title,
                            channel_description: channel.snippet.description,
                            channel_country: channel.snippet.country || null,
                            // channel_category: channel.snippet.category || null,
                            thumbnail_link: channel.snippet.thumbnails.default.url,
                            trailer_id: channel.brandingSettings.channel.unsubscribedTrailer || null,
                            playlist_id: channel.contentDetails.relatedPlaylists.uploads || null,
                            email_id_button: channel.brandingSettings.channel.email || false,
                            username: channel.snippet.customUrl.replace(/@/, '') || null,
                            updated_at: new Date(),
                            subscriber_count: channel.statistics.subscriberCount || null,
                        });
                        const result = await trx('YT_CHANNELS').where({ yt_channel_id: channel.id }).first();
                        const channelIdExisting = result.channel_id;
                        // Keep track of channel info for yt_scraper
                        const channel_info = {
                            channel_id: channelIdExisting,
                            yt_channel_id: channel.id,
                            platform: 'youtube',
                        }
                        channel_info_array.push(channel_info);
                        if (channel.brandingSettings.channel.keywords) {
                            const rawKeywords = channel.brandingSettings.channel.keywords;
                            const regex = /"([^"]*)"/g;
                            const unquotedKeywords = rawKeywords.split(',').map(keyword => keyword.trim());
                            const extractedKeywords = [];

                            let match;
                            while ((match = regex.exec(rawKeywords)) !== null) {
                                extractedKeywords.push(match[1].trim());
                            }

                            unquotedKeywords.forEach(keyword => {
                                if (!extractedKeywords.includes(keyword) && keyword.length > 0) {
                                    extractedKeywords.push(keyword);
                                }
                            });

                            const uniqueKeywords = [...new Set(extractedKeywords.map(keyword => keyword.trim()))];
                            const formattedKeywords = uniqueKeywords
                                .map(keyword => `${keyword.replace(/"/g, '""')}`)
                                .join(', ');

                            await trx('YT_CHANNEL_KEYWORDS').where({ channel_id: channelIdExisting }).update({
                                channel_keyword: formattedKeywords
                            });
                        }
                        const gmailRegex = /[a-zA-Z0-9._%+-]+@gmail\.com/g;
                        const description = channel.snippet.description;
                        const gmailsFound = description.match(gmailRegex);
                        if (gmailsFound && gmailsFound.length > 0) {
                            // Loop through each found Gmail and save it to the YT_EMAILS table
                            for (const gmail of gmailsFound) {
                                const result = await trx('YT_EMAILS').where({ email: gmail, source: 'description', channel_id: channelIdExisting }).first();
                                if (!result) {
                                    await trx('YT_EMAILS').insert({
                                        channel_id: channelIdExisting,
                                        email: gmail,
                                        source: 'description',
                                    });
                                    logger.info(`Saved Gmail: ${gmail}`);
                                }
                            }
                        }
                    }
                }

                // Check if the video already exists
                const existingVideo = await trx('YT_VIDEOS')
                    .select('video_id')
                    .where({ yt_video_id: data.id.videoId })
                    .first();
                if (!existingVideo) {
                    // Save video data to YT_VIDEOS table
                    const [vidResult] = await trx('YT_VIDEOS').returning('video_id').insert({
                        yt_video_id: data.id.videoId,
                        channel_id: channelID || existingChannel.channel_id,
                        video_description: videoDetails.snippet.description,
                        video_name: data.snippet.title,
                        video_created_at: new Date(data.snippet.publishedAt),
                        video_duration: videoDetails.duration,
                        likes_to_views_ratio: videoDetails.statistics.likeCount / videoDetails.statistics.viewCount,
                        taskids: `"${taskid}"`
                    });
                    videoID = vidResult.video_id;
                    logger.info(`video_id: ${videoID}`);

                    // Save video keywords to YT_VIDEO_KEYWORDS table
                    if (videoDetails.snippet.tags) {
                        const keywords = videoDetails.snippet.tags
                            .map(keyword => keyword.trim())
                            .filter(keyword => keyword.length > 0);
                        const formattedKeywords = keywords.join(', ');
                        await trx('YT_VIDEO_KEYWORDS').insert({
                            video_id: videoID,
                            video_keyword: formattedKeywords
                        });
                    } else {
                        await trx('YT_VIDEO_KEYWORDS').insert({
                            video_id: videoID,
                            video_keyword: null
                        });
                    }

                    // Save video-channel-movies-relation to YT_CHANNEL_MOVIES table
                    await trx('YT_CHANNEL_MOVIES').insert({
                        channel_id: channelID || existingChannel.channel_id,
                        video_id: videoID || existingVideo.video_id,
                        movie_id: data.movieId,
                    });
                }
                else {
                    // update tables data if video already exists and video last updated more than 6 days:
                    const lastUpdatedVideo = await trx('YT_VIDEOS').select('updated_at', 'taskids').where({ yt_video_id: data.id.videoId }).first();
                    // Append new taskid to the existing taskids
                    let updatedTaskIds = appendTaskIds(lastUpdatedVideo.taskids, taskid);
                    if (new Date() - new Date(lastUpdatedVideo.updated_at) < this.updateInterval) {
                        await trx('YT_VIDEOS').where({ yt_video_id: data.id.videoId }).update({
                            taskids: updatedTaskIds
                        });
                        logger.info(`Video ${data.id.videoId} already exists and was updated less than 6 days ago. Skipping...`);
                    }
                    else {
                        logger.info(`Video ${data.id.videoId} already exists and was updated more than 6 days ago. Updating...`);
                        await trx('YT_VIDEOS').where({ yt_video_id: data.id.videoId }).update({
                            video_description: videoDetails.snippet.description,
                            video_name: data.snippet.title,
                            video_created_at: new Date(data.snippet.publishedAt),
                            video_duration: videoDetails.duration,
                            updated_at: new Date(),
                            likes_to_views_ratio: videoDetails.statistics.likeCount / videoDetails.statistics.viewCount,
                            taskids: updatedTaskIds
                        });
                        const result = await trx('YT_VIDEOS').where({ yt_video_id: data.id.videoId }).first();
                        const videoIdExisting = result.video_id;
                        if (videoDetails.snippet.tags) {
                            const keywords = videoDetails.snippet.tags
                                .map(keyword => keyword.trim())
                                .filter(keyword => keyword.length > 0);
                            const formattedKeywords = keywords.join(', ');
                            await trx('YT_VIDEO_KEYWORDS').where({ video_id: videoIdExisting }).update({
                                video_keyword: formattedKeywords
                            });
                        }
                    }
                }
                const currentDate = new Date();
                // Save video metrics to YT_VIDEOMETRICS table
                const latestVideoMetric = await trx('YT_VIDEOMETRICS').select('*').where({ video_id: videoID || existingVideo.video_id }).orderBy('timestamp', 'desc').first();
                if (!latestVideoMetric || (currentDate - new Date(latestVideoMetric.timestamp)) >= 24 * 60 * 60 * 1000) {
                    await trx('YT_VIDEOMETRICS').insert({
                        video_id: videoID || existingVideo.video_id,
                        video_views: videoDetails.statistics.viewCount,
                        video_likes: videoDetails.statistics.likeCount,
                        video_comment_count: videoDetails.statistics.commentCount,
                        timestamp: new Date()
                    });
                }
                // Save channel subscribers to YT_CHANNEL_SUBSCRIBERS table
                const latestChannelSubscriber = await trx('YT_CHANNEL_SUBSCRIBERS')
                    .select('*')
                    .where({ channel_id: channelID || existingChannel.channel_id })
                    .orderBy('timestamp', 'desc')
                    .first();

                if (!latestChannelSubscriber || (currentDate - new Date(latestChannelSubscriber.timestamp)) >= 24 * 60 * 60 * 1000) {
                    await trx('YT_CHANNEL_SUBSCRIBERS').insert({
                        channel_id: channelID || existingChannel.channel_id,
                        subscriber_count: channel.statistics.subscriberCount,
                        timestamp: currentDate
                    });
                }
            }
            await trx.commit(); // Commit transaction
            logger.info('🟢 (saveChannelData function) Filtered channel data saved successfully');
            return { channel_info_array: channel_info_array, success: true };
        } catch (error) {
            await trx.rollback(); // Rollback transaction in case of error
            logger.error(`❌ Error saving filtered channel data: ${error}`);
            return { channel_info_array: [], success: false };
        }
    }
    async storeCredits(query, endpoint, credit_used) {
        // PURPOSE: store credit usage in YT_CREDIT_USAGE table
        // PARAMS: query, endpoint, credit_used
        // RETURN: none
        try {
            await db('YT_CREDIT_USAGE').insert({ query: query, endpoint: endpoint, credit_used: credit_used });
        }
        catch (error) {
            logger.error(`❌ Error in saving data to YT_CREDIT_USAGE table: ${error}`);
        }
    }

    async markTaskAsFailed(taskid) {
        try {
            // Update the status to 'failed' for the task with the specified taskid
            await db('tasks')
                .where({ task_id: taskid })  // Use 'id' to match the task by its unique identifier
                .update({ status: 'failed' });

            logger.info(`Updated status to 'failed' for task ID '${taskid}'`);
        } catch (error) {
            logger.error(`❌ Error updating tasks table to 'failed' for task ID '${taskid}': ${error}`);
        }
    }
    async saveNonTaskChannelData(data, alreadyExists) {
        const transaction = await db.transaction();
        let retrieved_channel_id;
        let lastUpdated;
        try {
            if (alreadyExists) {
                try {
                    const [result] = await transaction("YT_CHANNELS").select("*").where({ yt_channel_id: data.yt_channel_id });
                    retrieved_channel_id = result.channel_id;
                    lastUpdated = new Date(result.updated_at);
                } catch (error) {
                    logger.error(`❌ Error in getting channel_id from YT_CHANNELS table: ${error}`);
                }
                if (!retrieved_channel_id) {
                    return { channel_id: null, success: false };
                }
                if (new Date() - lastUpdated < this.updateInterval) {
                    logger.info(`Skipping channel ${retrieved_channel_id} as it was updated less than 6 days ago.`);
                    return { channel_id: retrieved_channel_id, success: true };
                }
                try {
                    await transaction('YT_CHANNELS').update(
                        {
                            yt_channel_id: data.yt_channel_id,
                            channel_name: data.channel_name,
                            username: data.username || null,
                            channel_description: data.channel_description,
                            channel_country: data.channel_country,
                            // channel_category: data.channel_category,
                            thumbnail_link: data.thumbnail_link,
                            created_at: data.created_at,
                            email_id_button: data.email_id_button,
                            playlist_id: data.playlist_id,
                            trailer_id: data.trailer_id,
                            updated_at: new Date(),
                            subscriber_count: data.subscriber_count
                        }
                    ).where({ channel_id: retrieved_channel_id });
                }
                catch (error) {
                    logger.error(`❌ Error in updating data to YT_CHANNELS table: ${error}`);
                }
                try {
                    await transaction('YT_CHANNEL_SUBSCRIBERS').update(
                        {
                            subscriber_count: data.subscriber_count,
                            timestamp: new Date()
                        }
                    ).where({ channel_id: retrieved_channel_id });
                }
                catch (error) {
                    logger.error(`❌ Error in updating data to YT_CHANNEL_SUBSCRIBERS table: ${error}`);
                }
                try {
                    const gmailRegex = /[a-zA-Z0-9._%+-]+@gmail\.com/g;
                    const description = data.channel_description;
                    const gmailsFound = description.match(gmailRegex);
                    if (gmailsFound && gmailsFound.length > 0) {
                        // Loop through each found Gmail and save it to the YT_EMAILS table
                        for (const gmail of gmailsFound) {
                            const result = await transaction('YT_EMAILS').where({ email: gmail, source: 'description', channel_id: retrieved_channel_id }).first();
                            if (!result) {
                                await transaction('YT_EMAILS').insert({
                                    channel_id: retrieved_channel_id,
                                    email: gmail,
                                    source: 'description',
                                });
                                logger.info(`Saved Gmail: ${gmail}`);
                            }
                        }
                    }

                } catch (error) {
                    logger.error(`❌ Error in updating data to YT_EMAILS table: ${error}`);
                }
                try {
                    await transaction('YT_CHANNEL_KEYWORDS').update(
                        {
                            channel_keyword: data.channel_keywords
                        }
                    ).where({ channel_id: retrieved_channel_id });
                } catch (error) {
                    logger.error(`❌ Error in updating data to YT_CHANNEL_KEYWORDS table: ${error}`);
                }
                await transaction.commit();
                logger.info('Non-task id  channel data updated successfully');
                return { channel_id: retrieved_channel_id, success: true };
            }
            else {
                try {
                    const [result] = await transaction('YT_CHANNELS').returning('channel_id').insert(
                        {
                            yt_channel_id: data.yt_channel_id,
                            channel_name: data.channel_name,
                            username: data.username || null,
                            channel_description: data.channel_description,
                            channel_country: data.channel_country,
                            channel_category: data.channel_category,
                            thumbnail_link: data.thumbnail_link,
                            created_at: data.created_at,
                            email_id_button: data.email_id_button,
                            playlist_id: data.playlist_id,
                            trailer_id: data.trailer_id,
                            updated_at: new Date(),
                            subscriber_count: data.subscriber_count
                        }
                    );
                    retrieved_channel_id = result.channel_id;
                }
                catch (error) {
                    logger.error(`❌ Error in saving data to YT_CHANNELS table: ${error}`);
                }
                if (!retrieved_channel_id) {
                    return { channel_id: null, success: false };
                }
                try {
                    await transaction('YT_CHANNEL_SUBSCRIBERS').insert(
                        {
                            channel_id: retrieved_channel_id,
                            subscriber_count: data.subscriber_count,
                            timestamp: new Date()
                        }
                    )
                }
                catch (error) {
                    logger.error(`❌ Error in saving data to YT_CHANNEL_SUBSCRIBERS table: ${error}`);
                }
                try {
                    // Find email through source: channel_description and save it to the YT_EMAILS table 
                    const gmailRegex = /[a-zA-Z0-9._%+-]+@gmail\.com/g;
                    const description = data.channel_description;
                    const gmailsFound = description.match(gmailRegex);
                    if (gmailsFound && gmailsFound.length > 0) {
                        // Loop through each found Gmail and save it to the YT_EMAILS table
                        for (const gmail of gmailsFound) {
                            await transaction('YT_EMAILS').insert({
                                channel_id: retrieved_channel_id,
                                email: gmail,
                                source: 'description',
                            });
                            logger.info(`Saved Gmail: ${gmail}`);
                        }
                    } else {
                        logger.info('No Gmail address found in channel description');
                    }
                }
                catch (error) {
                    logger.error(`❌ Error in saving data to YT_EMAILS table: ${error}`);
                }
                try {
                    await transaction('YT_CHANNEL_KEYWORDS').insert(
                        {
                            channel_id: retrieved_channel_id,
                            channel_keyword: data.channel_keywords
                        }
                    )
                } catch (error) {
                    logger.error(`❌ Error in saving data to YT_CHANNEL_KEYWORDS table: ${error}`);
                }
                await transaction.commit();
                logger.info('Non-task id  channel data saved successfully');
                return { channel_id: retrieved_channel_id, success: true };
            }

        } catch (error) {
            await transaction.rollback();
            logger.error(`❌ Error saving non-task channel data: ${error}`);
            return { channel_id: null, success: false };
        }
    }
    async saveToRelationTable(stir_id, channel_id) {
        try {
            await db('platform_relation').update(
                {
                    yt_id: channel_id
                }
            ).where({ stir_id: stir_id });

            logger.info(`channel id ${channel_id} saved to platform_relation table successfully`);
            return true;
        } catch (error) {
            logger.error(`❌ Error in saving data to RELATIONS table: ${error}`);
            return false;
        }
    }

}
// helper functions:
let geminiKeyIndex = 0;
// api keys for gemini :
const apiKeyArr = [
    'AIzaSyBjg5G-dMkItjbKONQk53dWtsYjQHf_DGw',
    'AIzaSyBEYwa8o88qahK66n64qXqwPaAugcCqE_4',
    'AIzaSyA-2jD-oh-wrDf0BI5dE0BMDjNgyLsFtmo',
    'AIzaSyBDK3uLeO0qFvwSA8CGApYnN9HNoin7fdY',
    'AIzaSyDASZW-mmKjyUtncQfJZL6RC1X-G7w1UYQ',
    'AIzaSyCOM0XvLrhNvBwaRQJpxVId1XF5s3QJNOw',
    'AIzaSyBT4LaG3XciDNmEiQMenJxZ1qYkZ4fyujc',
    'AIzaSyBel6stDpKx_5tFEpauX2vpgZpn-EQi4fI',
    'AIzaSyBy_UYCtRGBODYIMLdrjel1hGpoqENiciU',
    'AIzaSyDzjbGe6_vE7J1OKebCD41hybdV9DtScmw',
    'AIzaSyAepV-4-Ock7-RWctm9Dbx93wdkFiYKBMM',
    'AIzaSyCCJ3hD4N98AV7HGzCFPjzjsDeCoJe-vrE',
    'AIzaSyCINaycOqFoAhtR5TzmP7eus3yUUrjhwQo',
    'AIzaSyDfje0BiLj2fr3V79q7fuix6zXROVYTOTQ',
    'AIzaSyDABK8UHJFXpsdMj8rQnKwbhlJ-d1vcMvU',
    'AIzaSyCYyaoEOplEXZBpLOUCyXaF27k5iV4UFjE',
    'AIzaSyA_OSKrIWcNX_s6ba83nnQizjXuHph7j5o',
    'AIzaSyBhOXFnHFplYX1moC49BrkgjT9AnbZAjm4',
    'AIzaSyD0BHpgnD23OMwIRynsikE81U6fpZjE-f4'
];
// spare keys by hamza:
// 'AIzaSyCxC8NAHnQrnz7RBCTEA6hHWPq0NS2sY04', 'AIzaSyCiUKO4DZ1haqZHyY0t8UrBAHOuA3D6Yno'
//     , 'AIzaSyB1dMNYSVpLisErahITSc83Jiggq5Mkvuc',
//     'AIzaSyD3_B7EOuXm-oUH7J-uIXH8QvKOlh8KjxM'
//     , 'AIzaSyB6l-US680jaE7Ph5KlfuiDWp-8acv7KuY',

async function geminiCategorize(customChannelData) {
    const promptTemplate = ` 	
    #USER DATA :
    ${JSON.stringify(customChannelData)}

#INSTRUCTION :
Which of the following tags does this user belong to and select only one CATEGORY from below.

["Media", "Cinema Chain", "Film Festival", "Production Company", "Celebrity/Director", "Celebrity/Producer", "Celebrity/Actor", "Movie Critic/Journalist", "Normal Influencer",“Streaming Service”, “Record Label”]

Note that if it doesn't belong to any then select {category:'"Normal Influencer"}

#RETURN INSTRUCTION :
ALWAYS RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. BE STRAIGHTFORWARD.

#SAMPLE RESPONSE ( //JUST A SAMPLE ) :
{ category: 'Normal Influencer'}

#RESPONSE :
    `;
    const ReturnData = {
        "contents": [{
            "parts": [{
                "text": promptTemplate
            }]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
        ],
    };


    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeyArr[geminiKeyIndex]}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(ReturnData),
    });

    const responseData = await response.json();
    // for checking the response if there is rate limit error 429 (debuggind purposes)
    if (responseData.error && responseData.error.code === 429) {
        geminiKeyIndex = (geminiKeyIndex + 1) % apiKeyArr.length;
        logger.info(` ↻ Retrying with new gemini API key `);
        return geminiCategorize(customChannelData); // Retry with next API key
    }

    return JSON.parse(responseData['candidates'][0]['content']['parts'][0]['text']);


}
function parseISO8601Duration(duration) {
    // PURPOSE: Parse ISO 8601 duration string to total duration in seconds as an integer
    // PARAMS: ISO 8601 duration string
    // RETURN: Total duration in seconds as an integer

    // Define the regex to capture hours, minutes, and seconds
    const regex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    const match = duration.match(regex);

    if (match) {
        // Parse hours, minutes, and seconds from the regex match
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const seconds = match[3] ? parseInt(match[3], 10) : 0;

        // Calculate total duration in seconds
        return (hours * 3600) + (minutes * 60) + seconds;
    }
    return 0; // Return 0 if the duration is not valid
}

async function checkVideoSpam(videoData, movieData) {
    // PURPOSE: check whether the video is spam or not
    // PARAMS: videoData, movieData
    // RETURN: {spam: boolean, reason: string}
    const promptTemplate = ` 	
    # VIDEO DATA:
    ${JSON.stringify(videoData)}
    
    # MOVIE DATA:
    ${JSON.stringify(movieData)}
    
    # INSTRUCTION:
    You have to compare the video content with the movie data and check whether the video is talking about the provided movie or if it's irrelevant/spam. Sometimes videos appear that are not talking about the provided movie or are discussing another movie, place, or topic entirely. Mark the video as spam if it doesn't match the movie data.
    
    # EXAMPLE RESPONSES:
    { spam: false, reason: 'Not a spam because it's relevant to the movie' }
    { spam: true, reason: 'Definitely a Spam because the video content does not match the movie data' }
    
    # RETURN INSTRUCTIONS:
    spam: can only be true or false 
    reason: reason needs to be a string in one line.
    
    # RETURN FORMAT:
    Return a single JSON dictionary as described above without any other details.
    
    # YOUR RESPONSE:
        `;
    const ReturnData = {
        "contents": [{
            "parts": [{
                "text": promptTemplate
            }]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
        ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeyArr[geminiKeyIndex]}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(ReturnData),
    });

    const responseData = await response.json();

    if (responseData.error && responseData.error.code === 429) {
        geminiKeyIndex = (geminiKeyIndex + 1) % apiKeyArr.length;
        console.log(`↻ Retrying with new gemini API key`);
        return checkVideoSpam(videoData, movieData); // Retry with the next API key
    }

    return JSON.parse(responseData['candidates'][0]['content']['parts'][0]['text']);
}

const retry = async (fn, retries = 3, delay = 1000) => {
    //PURPOSE: Retry a function if it throws an error
    // PARAMS: fn(function to be retried), no. of retries, delay time in ms
    // RETURN: fn()
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) {
            console.error("Retries exhausted. Error:", error);
            return null; // Return null or handle as needed when retries are exhausted
        }

        logger.info(`↻ Retrying... (${retries} retries left). Error: ${error}`);
        await new Promise(res => setTimeout(res, delay));
        return retry(fn, retries - 1, delay);
    }
};
function appendTaskIds(existingTaskIds, newTaskId) {
    // Trim any extra spaces from the existing task IDs and append the new task ID
    const updatedTaskIds = `${existingTaskIds.trim()},"${newTaskId}"`;
    return updatedTaskIds;
}

// exporting functions and class as modules:
module.exports = { YoutubeService, geminiCategorize, parseISO8601Duration, retry };

