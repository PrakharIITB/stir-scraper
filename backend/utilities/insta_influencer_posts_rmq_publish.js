const amqp = require("amqplib");
const db = require("../db/db");
const QUEUE_NAME = "insta_influencer_posts_queue";
const { createConnection } = require("./RMQ");

async function fetchInstaUsers() {
  try {
    // Fetch insta_influencers from db for us only
    const rows = await db("insta_users")
      .select("user_id", "username", "followers_count")
      .whereIn("country", ["United States", "India", "Canada"])
      .andWhere("followers_count", ">", 10000);
    // const rows = await db('insta_users').select('user_id', 'username', 'followers_count').where('country', 'United States');
    return rows;
  } catch (error) {
    console.error("Error fetching Insta Users:", error);
    throw error;
  }
}

async function sendToQueue(user, channel) {
  try {
    
    // Add tasks to the queue
    // user = {user_id: 4544, username: 'rickyrampage', followers_count: 15739};
    console.log(user);
    const { user_id, username, followers_count } = user;
    if (user_id && username && followers_count) {
      const [task] = await db("influencer_posts_tasks")
        .insert({ user_id, username, status: "pending", followers_count })
        .returning("task_id");
      const messagePayload = {
        task_id: task.task_id,
      };
      channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(messagePayload))
      );
      console.log(
        ` [x] Sent message to queue '${QUEUE_NAME}':`,
        messagePayload
      );
    }
    
  } catch (error) {
    console.error("Error sending tasks to queue:", error);
    throw error;
  }
}

async function main() {
  try {
    const connection = await createConnection();
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    const users = await fetchInstaUsers();
    await sendToQueue(users[0], channel)
    // console.log(users.length);
    // for (var i=2; i<users.length; i++) {
    //     const user = users[i];
    //     await sendToQueue(user, channel);
    // }

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Error in main function:", error);
  } finally {
    await db.destroy(); // Close the Knex connection
  }
}

main();
