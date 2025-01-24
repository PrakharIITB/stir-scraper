const { default: axios } = require('axios');
const logger = require('../logger/logger');
const index = 0;
const keys = ["AIzaSyA_oT20AK6I8cXXNDGazFjlHx5Yo2ttEWM","AIzaSyBs9lyiGJ1bQ9mV4snxJ075X4FoIjT0VNg"]


async function spam_check(Tweet,movie){
    const promptTemplate = ` 	
    #TWEET DATA :
    ${JSON.stringify(Tweet)}
  
    #MOVIE DATA :
    ${JSON.stringify(movie)}
  #INSTRUCTION :
  Check if this Tweet really relates to the Movie, or is just a spam. As we know that nowadays people are Tweeting spam on Twitter using the popular movie names. So we need to fight this kind of spam. Only mark spam:true if its clearly a spam and not related to movie. If the user hasn't mentioned anything , then mark it as spam:false. You can also look for the Popular Characters and Actors name in the Tweet
  
  
  #RETURN INSTRUCTION :
  ALWAYS RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. BE STRAIGHTFORWARD. NO NEED TO PROVIDE ANY EXTRA INFORMATION BESIDE A SINGLE JSON RESPONSE.
  
  #SAMPLE RESPONSE ( //JUST A SAMPLE ) :
  // if it's a spam Tweet (spam:true) return  
  { spam: true, movieID : 'tt1234567', TweetID : '1234567',user_screen_name:'Name1', reason : 'The user just used random hashtags of the trending movies' } 
  
  //if it's not spam Tweet (spam:false) return
  { spam: false, movieID : 'tt2345678', TweetID : '2345678',user_screen_name:'Name2', reason : 'The user mentioned about the movie and also used tags related to the actors' }

   //if it's not spam Tweet (spam:false) return
  { spam: true, movieID : 'tt2345672', TweetID : '2345677',user_screen_name:'Name2', reason : 'The user didnt mention anything about the movie,but it looks spam as he has used hashtags of other movies as well' }
   
  
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
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
        ],
    };
  
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys[index]}`;
    const response = await axios.post(url, returnData, {
        headers: {
          'Content-Type': 'application/json',
        },
    });
    const responseData = await response?.data
    if (responseData.error && responseData.error.code === 429) {
        if(index === keys.length - 1) index = 0;
        else index+=1
        logger.warn("Rate limit hit, waiting for 1 minute...");
        logger.error(`🔴 Rate limit hit, waiting for 1 minute...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 1 minute
        return spam_check(obj); // Retry after 1 minute
    } else if (responseData.error) {
        logger.error(`🔴 Gemini API Error: ${responseData.error.message}`);
        return true;
    }

    try {
        const spam = JSON.parse(responseData['candidates'][0]['content']['parts'][0]['text']).spam
        
        return spam;
    } catch (err) {
        logger.error(`❌ Error parsing response: `, err);
        return true;
    }
}
module.exports = {
    spam_check
}









