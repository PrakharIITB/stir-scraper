const amqp = require('amqplib');
const axios = require('axios');
const logger = require('./logger/logger.js');
const moment = require("moment")
const { user_dedup } = require("./utils/user_dedup.js")
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { search } = require("./utils/search.js");
async function consume_twitter_process(db) {
  /**
   * Consumer's Main Function
   * Connected to Rabbit MQ Process
   */
  try {
    const channel = await global.connection.createChannel();
    const queue = 'twitter_queue';
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
          const task_id = parseInt(messageData.task_id, 10);
          await search(task_id, channel,msg)
        }
        else if (msgType === 1) {
          //If msg 1 then user search will occur
          console.log("starting user for dedup");
          const stir_id = parseInt(messageData.stir_id, 10);
          const username = messageData.username;
          await user_dedup(stir_id, username)
          channel.ack(msg)
        }     
      }
    }, {
      noAck: false
    });
  } catch (error) {
    logger.error(`🔴 Error in worker:`, error);

  }
}


module.exports = {
  consume_twitter_process
}