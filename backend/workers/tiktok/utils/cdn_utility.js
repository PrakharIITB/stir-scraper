const { default: axios } = require("axios");
const logger = require("../logger/logger")

const uploadToCdn = async (url, userId, platformName, type = "user",post_id=null) => {
    const maxRetries = 3;
    let attempt = 0;
    let uploadedUrl = null;

    while (attempt < maxRetries) {
        try {
            let fileName = `${type}-${userId}.jpg`;
            if(type != "user" && post_id != null) fileName = `${type}-${userId}-${post_id}.jpg`;
            const response = await axios.post(process.env.BUNNY_CDN_UPLOAD_URL || 'http://5.161.246.33/api/upload', {
                file_name: fileName,
                storage_path: `\\${platformName}`,
                url: url
            }, {
                headers: {
                    'Authorization': process.env.BUNNY_CDN_AUTH_TOKEN || 'your_auth_token',
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.image_url) {
                uploadedUrl = response.data.image_url;
                break;
            }
        } catch (error) {
            logger.error(`Error uploading ${type} image for user ${userId}:`, error);
            attempt++;

            if (attempt < maxRetries) {
                await wait(1000);
            }
        }
    }

    return uploadedUrl; 
};


module.exports = {
    uploadToCdn
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

