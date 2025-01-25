const amqp = require('amqplib');
const db = require('../db/db');
const { RMQ_Publish_Message } = require("./RMQ")
const QUEUE_NAME = 'instagram_queue';

async function fetchHashtags() {
    try {
        // Fetch movie IDs and hashtags from the database
        const rows = await db('movie_hashtags').select('movie_id', 'hashtag');
        return rows; // [{ movie_id: 1, hashtag: '#example' }, { movie_id: 2, hashtag: '#test' }]
    } catch (error) {
        console.error('Error fetching hashtags:', error);
        throw error;
    }
}

async function sendToQueue(tasks) {
    try {
        // Connect to RabbitMQ

        // Add tasks to the queue
        tasks.forEach(task => {
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)), {
                persistent: true,
            });
            console.log(`Task added to queue: ${JSON.stringify(task)}`);
        });

        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error sending tasks to queue:', error);
        throw error;
    }
}

async function main() {
    try {
        const tasks = await fetchHashtags();
        for (var i = 3; i < 4; i++) {
            const task = tasks[i];
            const {movie_id, hashtag} = task;
            const [newTask] = await db('tasks').insert({
                query: hashtag,
                platform: "instagram",
                status: 'pending',
                movie_id: movie_id
              }).returning('task_id');
            try {
                await RMQ_Publish_Message("instagram_queue", newTask.task_id);
            } catch (error) {
                console.error("Error adding to queue: ", error);   
            }
        }
    } catch (error) {
        console.error('Error in main function:', error);
    } finally {
        await db.destroy(); // Close the Knex connection
    }
}

main();
