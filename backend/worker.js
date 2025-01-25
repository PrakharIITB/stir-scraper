// const { consume_twitter_process } = require("./workers/twitter/twitter_consumer");
// const { consume_youtube_process } = require("./workers/youtube/youtube_consumer");
const { consume_instagram_process } = require("./workers/instagram/instagram_consumer");
const { createConnection } = require("./utilities/RMQ");
// const { consume_tiktok_process } = require("./workers/tiktok/consumer");



async function runWorker() {
    // await consume_twitter_process();
    // await consume_youtube_process();
    await consume_instagram_process();
    // await consume_tiktok_process()
}
(async () => {
    try {
        await createConnection()
        await runWorker();

    } catch (error) { console.error('Error in the process:', error); 

        console.log("Retrying in 1 seconds");
        setTimeout(() => {
            runWorker();
        }, 100);
    }
  })();
  
  