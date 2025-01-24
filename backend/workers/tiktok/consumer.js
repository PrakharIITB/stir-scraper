const amqp = require('amqplib');
const logger = require('./logger/logger.js');
const { fetchVideos } = require('./utils/tiktok_search.js');
const {fetch_user} = require("./utils/tiktok_user_search.js")
async function consume_tiktok_process() {
  /**
   * Consumer's Main Function
   * Connected to Rabbit MQ Process
   */
  try {

    const channel = await global.connection.createChannel();
    const queue = 'tiktok_queue';
    await channel.assertQueue(queue, {
      durable: true
    });
    channel.prefetch(1)
    console.log(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        //If msg 0 then the tweet search will occur
        const messageData = (JSON.parse(msg.content.toString()));
        // msgType = 0: Search/Hashtag Task , 1: User Task 
        const msgType = parseInt(messageData.msgType, 10);
        const platform = messageData.platform;
        console.log("start 0");
        console.log(messageData)
        if (msgType === 0) {
          const task_id = parseInt(messageData.task_id.task_id || messageData.task_id, 10);
          await fetchVideos(task_id, channel,msg)
        }
        else if (msgType === 1) {
          //If msg 1 then user search will occur
          console.log("starting user for dedup");
          const stir_id = parseInt(messageData.stir_id, 10);
          const username = messageData.username;
          await fetch_user(stir_id, username)
          channel.ack(msg)
        }
      }
    }, {
      noAck: false,
    });
  } catch (error) {
    logger.error(`🔴 Error in worker:`, error);
  }
}
module.exports = {
  consume_tiktok_process
}