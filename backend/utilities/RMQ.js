require('dotenv').config();
const amqp = require('amqplib');
const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL;
global.connection = null;

async function createConnection() {
  console.log(RABBIT_MQ_URL);
  
  try {
    if (!global.connection) {
      const url = RABBIT_MQ_URL;
      global.connection = await amqp.connect(url);
    }
    return global.connection;
  } catch (error) {
    console.error('Error establishing connection to RabbitMQ:', error);
    throw error;
  }
}

async function RMQ_Publish_Message(queueName, taskId) {
  try {
    const connection = await createConnection();
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    const platformMap = {
      twitter_queue: "twitter",
      tiktok_queue: "tiktok",
      instagram_queue: "instagram",
      youtube_queue: "youtube",
    };
    const platform = platformMap[queueName] || "unknown";

    const messagePayload = {
      msgType: 0, // Search/Hashtag task
      platform: platform,
      task_id: taskId,
    };

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(messagePayload)));
    console.log(` [x] Sent message to queue '${queueName}':`, messagePayload);
  } catch (error) {
    console.error('Error in RMQ_Publish_Message:', error);
  }
}

async function RMQ_Add_User_task(queueName, username, stir_id) {
  try {
    const connection = await createConnection();
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    const platformMap = {
      twitter_queue: "twitter",
      tiktok_queue: "tiktok",
      instagram_queue: "instagram",
      youtube_queue: "youtube",
    };
    const platform = platformMap[queueName] || "unknown";

    const messagePayload = {
      msgType: 1, // User task
      platform: platform,
      username: username,
      stir_id: stir_id,
    };

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(messagePayload)));
    console.log(` [x] Sent message to queue '${queueName}':`, messagePayload);
  } catch (error) {
    console.error('Error in RMQ_Add_User_task:', error);
  }
}

module.exports = {
  createConnection,
  RMQ_Publish_Message,
  RMQ_Add_User_task,
};