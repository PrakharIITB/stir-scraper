const amqp = require('amqplib');

let RABBIT_MQ_URL = process.env.RABBIT_MQ_URL;

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
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(datatoSend)));
      
      setTimeout(() => {
        connection.close();
      }, 10);
    } catch (error) {
      console.error('Error:', error);
    }
}

module.exports = { upload_link_to_scraper_queue };
