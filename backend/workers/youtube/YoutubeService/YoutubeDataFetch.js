// Import the Knex database connection for performing CRUD operations
const db = require('../../../database/db.js');
const logger = require('../logger/logger.js');
// YoutubeDataFetch class that contains all the methods for fetching data from youtube database:
class YoutubeDataFetch {
    constructor() { }
    async getYtChannels() {
        try {
            const channels = await db('YT_CHANNELS').select('*');
            return channels;
        } catch (error) {
            logger.error(`❌ Error fetching YT_CHANNELS data: ${error}`);
        }
    }
    async getYtVideos() {
        try {
            const rows = await db('YT_VIDEOS').select('*');
            return rows;
        } catch (error) {
            logger.error(`❌ Error fetching YT_VIDEOS data: ${error}`);
        }
    }
    async getYtChannelMovies() {
        try {
            const rows = await db('YT_CHANNEL_MOVIES').select('*');
            return rows;
        } catch (error) {
            logger.error(`❌ Error fetching YT_CHANNEL_MOVIES data: ${error}`);
        }
    }
    async getYtVideoMetrics() {
        try {
            const rows = await db('YT_VIDEOMETRICS').select('*');
            return rows;
        } catch (error) {
            logger.error(`❌ Error fetching YT_VIDEOMETRICS data: ${error}`);
        }
    }

    async getYtVideoKeywords() {
        try {
            const rows = await db('YT_VIDEO_KEYWORDS').select('*');
            return rows;
        } catch (error) {
            logger.error(`❌ Error fetching YT_VIDEO_KEYWORDS data: ${error}`);
        }
    }

    async getYtChannelKeywords() {
        try {
            const rows = await db('YT_CHANNEL_KEYWORDS').select('*');
            return rows;
        } catch (error) {
            logger.error(`❌ Error fetching YT_CHANNEL_KEYWORDS data: ${error}`);
        }
    }

    async getYtChannelSubscribers() {
        try {
            const rows = await db('YT_CHANNEL_SUBSCRIBERS')
                .select('*')
                .distinctOn('channel_id')
                .orderBy('channel_id')
                .orderBy('timestamp', 'desc');
            return rows;
        } catch (error) {
            logger.error(`❌ Error fetching YT_CHANNEL_SUBSCRIBERS data: ${error}`);
            return [];
        }
    }

}
module.exports = { YoutubeDataFetch };

