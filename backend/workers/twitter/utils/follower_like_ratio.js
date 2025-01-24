const logger = require("../logger/logger");

async function updateAllLikeToFollowerRatios() {
    try {
      const tweets = await knex('twitter_tweets')
        .select('id', 'favorite_count', 'user_id');
      if (!tweets || tweets.length === 0) {
        logger.info('No tweets found');
        return;
      }
      for (const tweet of tweets) {
        const { id: tweetId, favorite_count, user_id } = tweet;
  
        const userAnalytics = await knex('twitter_user_analytics')
          .where('user_id', user_id)
          .orderBy('last_updated', 'desc')
          .first();
  
        if (!userAnalytics) {
          logger.info(`No analytics found for user_id: ${user_id}, skipping tweet id: ${tweetId}`);
          continue;
        }

        const { followers_count } = userAnalytics;
        const likeToFollowerRatio = followers_count ? (favorite_count / followers_count) : 0;
        await knex('twitter_tweets')
          .where('id', tweetId)
          .update({ like_to_follower_ratio: likeToFollowerRatio });
        logger.info(`Updated tweet id: ${tweetId} with likes is ${favorite_count} with like_to_follower_ratio: ${likeToFollowerRatio} with the follower count of ${followers_count}`);
      }
      
      logger.info('All tweets processed and updated.');
    } catch (error) {
      logger.error('Error updating like_to_follower_ratios:', error.message);
    }
  }

  
module.exports ={
    updateAllLikeToFollowerRatios
}