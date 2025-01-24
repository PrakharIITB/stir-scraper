// importing modules:
const amqp = require('amqplib');
const logger = require("./logger/logger");
const { YoutubeService } = require('./YoutubeService/YoutubeService');
require('dotenv').config();
const youtubeService = new YoutubeService();
async function consume_youtube_process() {
    try {
        // const connection = await amqp.connect(`amqp://localhost/`);
        const channel = await global.connection.createChannel();

        const queue = 'youtube_queue';  // Define the queue name
        const yt_scraper_queue = 'yt_scraper_queue';

        await channel.assertQueue(queue, {
            durable: true  // Make sure the queue survives RabbitMQ restarts
        });
        await channel.assertQueue(yt_scraper_queue, {
            durable: true  // Make sure the queue survives RabbitMQ restarts
        });
        channel.prefetch(1);
        console.log(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);
        // logger.info(`🖥 [*] Waiting for messages in ${queue}. To exit press CTRL+C`);

        // Consume messages from the queue
        channel.consume(queue, async (msg) => {
            if (msg == null) {
                return;
            }
            const messageData = (JSON.parse(msg.content.toString()));
            // msgType = 0: Search/Hashtag Task , 1: User Task 
            const msgType = parseInt(messageData.msgType, 10); 
            
            const platform = messageData.platform; 
            if (msgType === 0) {
                const task_id = parseInt(messageData.task_id, 10);
                console.log(`[x] Received: Task for search/hashtag: ${task_id}`);
                const result = await youtubeService.main(task_id);
                if (result.channelInfoArray && result.channelInfoArray.length > 0) {
                    for (let i = 0; i < result.channelInfoArray.length; i++) {
                        const payload = JSON.stringify(result.channelInfoArray[i]);
                        await channel.sendToQueue(yt_scraper_queue, Buffer.from(payload));
                    }
                }
            }
            else if (msgType === 1) {
                const stir_id = parseInt(messageData.stir_id, 10); 
                const username = messageData.username;
                console.log(`[x] Received: Task for user: ${username} for stir_id: ${stir_id}`);    
                const result = await youtubeService.fillChannelData(stir_id, username);
                // console.log(result);
                if(result.success){
                    logger.warn(` Sending msg to YT_SCRAPER_QUEUE for ${username}`);
                    const payload=JSON.stringify(result.data);                    
                    await channel.sendToQueue(yt_scraper_queue, Buffer.from(payload));
                }else{
                    logger.warn(` Failed to send msg to YT_SCRAPER_QUEUE for ${username}`);
                }       
            }
            
            
            // Acknowledge the message
            channel.ack(msg);
            logger.info(`✅ [x] Acknowledged msg`);
        }, {
            noAck: false  // Ensure messages are acknowledged only after processing
        });
    } catch (error) {
        logger.error(`❌ Error in worker: ${error}`);
    }
}

module.exports = { consume_youtube_process }