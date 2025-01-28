const amqp = require('amqplib');
const createTask = require('./createTask');
//importing dotenv
const dotenv = require('dotenv');
dotenv.config();

async function insta_influencer_posts_consumer(){
    try{
        const channel = await global.connection.createChannel();

        const queue = 'insta_influencer_posts_queue';  

        await channel.assertQueue(queue, {
            durable: true  
        });

        channel.prefetch(1);

        console.log(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

        channel.consume(queue, async (msg) => {
            if (msg === null) {
                return;
            }
            const messageData = (JSON.parse(msg.content.toString()));
            console.log(messageData);
            const task_id = parseInt(messageData.task_id, 10); 
            await createTask(task_id);
            channel.ack(msg);
        }, {
            noAck: false  // Ensure messages are acknowledged only after processing
        });
    }   
    catch(err){
        console.error('Error in worker:', error);
    }
}

module.exports = insta_influencer_posts_consumer;