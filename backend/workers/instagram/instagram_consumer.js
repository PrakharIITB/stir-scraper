const amqp = require('amqplib');
const {createTask, createUser} = require('./createTask');
//importing dotenv
const dotenv = require('dotenv');
dotenv.config();
async function consume_instagram_process() {
    try {
        // Connect to RabbitMQ server
        const channel = await global.connection.createChannel();

        const queue = 'instagram_queue';  

        await channel.assertQueue(queue, {
            durable: true  
        });

        channel.prefetch(1);

        console.log(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

        // Consume messages from the queue
        channel.consume(queue, async (msg) => {
            if (msg === null) {
                return;
            }
            const messageData = (JSON.parse(msg.content.toString()));
            // msgType = 0: Search/Hashtag Task , 1: User Task 
            const msgType = parseInt(messageData.msgType, 10); 
            const platform = messageData.platform; 
            if (msgType === 0) {
                const task_id = parseInt(messageData.task_id, 10); 
                console.log(`[x] Received: Task for search/hashtag: ${task_id}`);
                await createTask(task_id);
            }
            else if (msgType === 1) {
                const stir_id = parseInt(messageData.stir_id, 10); 
                const username = messageData.username;
                console.log(`[x] Received: Task for user: ${username} for stir_id: ${stir_id}`);
                await createUser(stir_id, username);
            }
            // Acknowledge the message
            channel.ack(msg);

        }, {
            noAck: false  // Ensure messages are acknowledged only after processing
        });
    } catch (error) {
        console.error('Error in worker:', error);
    }
}

module.exports = {consume_instagram_process}