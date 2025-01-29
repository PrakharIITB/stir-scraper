const amqp = require('amqplib');
const db = require('../db/db');
const QUEUE_NAME = 'insta_influencer_posts_queue';
const {createConnection} = require('./RMQ');

async function fetchInstaUsers() {
    try {
        // Fetch insta_influencers from db for us only
        const rows = await db('insta_users')
            .select('user_id', 'username', 'followers_count')
            .whereIn('country', ['United States', 'India', 'Canada'])
            .andWhere('followers_count', '>', 10000);
        // const rows = await db('insta_users').select('user_id', 'username', 'followers_count').where('country', 'United States');
        return rows; 
    } catch (error) {
        console.error('Error fetching Insta Users:', error);
        throw error;
    }
}

async function sendToQueue(user) {
    try {
        const connection = await createConnection();
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        // Add tasks to the queue
        // user = {user_id: 4544, username: 'rickyrampage', followers_count: 15739};
        const {user_id, username, followers_count} = user; 
        const [task] = await db('influencer_posts_tasks')
                            .insert({user_id, username, status: 'pending', followers_count})
                            .returning('task_id');
        const messagePayload = {
            task_id: task.task_id,
        }
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(messagePayload)));
        console.log(` [x] Sent message to queue '${QUEUE_NAME}':`, messagePayload);

        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error sending tasks to queue:', error);
        throw error;
    }
}

async function main() {
    try {
        const users = await fetchInstaUsers();
        // console.log(users.length);
       for(const user of users){
        await sendToQueue(users);
       }
    } catch (error) {
        console.error('Error in main function:', error);
    } finally {
        await db.destroy(); // Close the Knex connection
    }
}

main();
