const amqp = require('amqplib');
const db = require('../db/db');


const RABBIT_MQ_URL = process.env.RABBIT_MQ_URL;
const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': process.env.INSTA_RAPID_API_KEY,
    'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
  }
};


async function fetchUsers() {
    try {
        // Fetch movie IDs and hashtags from the database
        const rows = await db('insta_users').select('user_id', 'username');
        return rows; // [{ movie_id: 1, hashtag: '#example' }, { movie_id: 2, hashtag: '#test' }]
    } catch (error) {
        console.error('Error fetching hashtags:', error);
        throw error;
    }
}

// async function sendToQueue(tasks) {
//     try {
//         // Connect to RabbitMQ

//         // Add tasks to the queue
//         tasks.forEach(task => {
//             channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(task)), {
//                 persistent: true,
//             });
//             console.log(`Task added to queue: ${JSON.stringify(task)}`);
//         });

//         await channel.close();
//         await connection.close();
//     } catch (error) {
//         console.error('Error sending tasks to queue:', error);
//         throw error;
//     }
// }

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
      await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(datatoSend)));
    //   console.log(` [x] Sent url to Scraper queue '${queueName}'`);
      
      // Close the connection after a short delay
      setTimeout(() => {
        connection.close();
      }, 500);
    } catch (error) {
      console.error('Error:', error);
    }
  }

async function get_platform_and_Upload_link_to_scraper_queue(url, user_id) {
    if (url.includes("x.com") || url.includes("twitter.com")) {
        return "twitter";
    } else if (url.includes("youtube.com")) {
        return "youtube";
    } else if (url.includes("instagram.com")) {
        return "instagram";
    } else if (url.includes("tiktok.com")) {
        return "tiktok";
    } else if (url.includes("facebook.com")) {
        return "facebook";
    } else if (url.includes("linktr.ee")) {
        await upload_link_to_scraper_queue("instagram", url, user_id);
        console.log(`⚪ Success at get_platform_and_Upload_link_to_scraper_queue( ${url}, ${user_id}) | Sent To Scraper Queue`);
        return "linktree";
    } else if (url.includes("fanlink.tv")) {
        console.log(`⚪ Success at get_platform_and_Upload_link_to_scraper_queue( ${url}, ${user_id}) | Sent To Scraper Queue`);
        await upload_link_to_scraper_queue("instagram", url, user_id);
        return "fanlink";
    } else if (url.includes("linkin.bio")) {
        console.log(`⚪ Success at get_platform_and_Upload_link_to_scraper_queue( ${url}, ${user_id}) | Sent To Scraper Queue`);
        await upload_link_to_scraper_queue("instagram", url, user_id);
        return "linkin.bio";
    } else {
        return null;
    }
}

async function DB_store_link(trx, url, source, user_id) {
    /**
     * Stores the link in the database.
     * If the link already exists in the database, it is skipped.
    **/

    // This function right now also handles linktree etc links and add them to scraper queue
    const platform =  await get_platform_and_Upload_link_to_scraper_queue(url, user_id)
    if (url.length > 2) {
    const count = await trx('insta_users_links').where({ url, source, user_id: user_id }).count({ count: '*' });
    if (parseInt(count[0].count, 10) === 0) {
      await trx('insta_users_links')
        .insert({ url, source, user_id: user_id, platform: platform });
    }
    }
}

async function main() {
    try {
        const users = await fetchUsers();
        console.log(users.length);
        
        for(var i = 0; i<users.length; i++){
            if(users[i]['username'] === 'sinefesto'){
                console.log(i);
            }
        }
        // const trx = await db.transaction(); 
        // for (var i = 185; i<users.length; i++) {
        //     const {username, user_id} = users[i];
        //     console.log(username);
        //     const url = `${process.env.INSTA_RAPID_API_URL}/v1/info?username_or_id_or_url=${username}`
        //     const response = await fetch(url, options);
        //     const userData = await response.json();
        //     if (response.status !== 200) {
        //         throw new Error(`Request failed with status ${response.status}`);
        //     }

        //     if (userData.data['bio_links'].length > 0) {
        //         for (const link of userData.data['bio_links']) {
        //             if( (link.url !== null) || (link.url !== '') || ((link.url).length > 2) ) {
        //                 await DB_store_link(trx,  link.url,  'bio_links', user_id);
        //                 console.log(link.url, user_id);
        //             }
        //         }
        //     }

        // }
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main();
