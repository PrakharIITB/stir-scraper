const { default: axios } = require('axios');
const logger = require("../logger/logger")
let index = 0;
const keys = [
'AIzaSyCiVKK_c6YVmb7iCAMYNI65jMNCzQzgL7g',
'AIzaSyCMS5nG-cglV50Y7xZUPtihh03dfOd_X6A',
'AIzaSyDyBJSzMsRUwRiiXP3ENG3WI-rd8GGvppc',
'AIzaSyAu4guQDN5Ic3Nm_E_j61FHNTp4wwP3xL8',
'AIzaSyD5G3pBWrspJJVTh2Mf-bxsf1daZ698A4I',
'AIzaSyA4W-YaihcHFDQB3HMsDPUgelhEIbITjWo',
'AIzaSyC51JfWiMmQZpLgUWV-Np_58DNke80v5-k',
'AIzaSyA70Blio_vkwOyorMSglREnBo8wiAdImNs',
'AIzaSyBFMB5HlRNBkREPPbs9Y4z5UDg1KTzKeNI',
'AIzaSyCE5tZbRnQAeLPGDkT5fSZcYexu87mOPKc',
'AIzaSyCszW3wv2V1N3sVtK-_VBSarTIwT8TeHYo',
'AIzaSyCszW3wv2V1N3sVtK-_VBSarTIwT8TeHYo',
'AIzaSyCavSI6Qt3uKfNGY1L0m5StBWAN4XjIOzA',
'AIzaSyBfWDuUxOePUCZUuv6DXxuZFWI42G6XvFg',
'AIzaSyAaz3DHWPYN1P63i2OWnlop8DJqi00AF3c',
'AIzaSyD2vHV08A6LIRZJgqWM94oXVDX0_xcpCp4'
];
// const keys = ["AIzaSyA_oT20AK6I8cXXNDGazFjlHx5Yo2ttEWM", "AIzaSyBs9lyiGJ1bQ9mV4snxJ075X4FoIjT0VNg"];
async function spam_check(TikTok_Post, movie) {
    const promptTemplate = `
    #TIKTOK POST DATA :
    ${JSON.stringify(TikTok_Post)}
  
    #MOVIE DATA :
    ${JSON.stringify(movie)}
    #INSTRUCTION :
    Check if this TikTok_Post really relates to the Movie, or is just spam... [truncated for brevity]

    #RESPONSE :
    `;
    const returnData = {
        "contents": [{
            "parts": [{
                "text": promptTemplate
            }]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys[index]}`;
        const response = await axios.post(url, returnData, {
            headers: { 'Content-Type': 'application/json' }
        });

        let responseData = response?.data;
        
        if (responseData.error && response.status === 429) {
            if (index === keys.length - 1) index = 0;
            else index += 1;
            console.log("Waiting for rate limit to reset...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            return spam_check(TikTok_Post, movie);
        } else if (responseData.error) {
            return true;
        }

        const spam = JSON.parse(responseData['candidates'][0]['content']['parts'][0]['text']).spam;
        return spam;
    } catch (err) {
        if (err.status === 429) {
            if (index === keys.length - 1) index = 0;
            else index += 1;
            console.log("Waiting for rate limit to reset...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            return spam_check(TikTok_Post, movie);
        } else {
            return true;
        }
    }
}

module.exports = {
    spam_check
};
