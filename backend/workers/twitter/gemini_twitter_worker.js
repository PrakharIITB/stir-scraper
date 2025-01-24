const logger = require('./logger/logger');
let index = 0;
const keys = ["AIzaSyA_oT20AK6I8cXXNDGazFjlHx5Yo2ttEWM","AIzaSyBs9lyiGJ1bQ9mV4snxJ075X4FoIjT0VNg"]
const predefinedCategories = ["Media", "Cinema Chain", "Film Festival", "Production Company", "Celebrity/Director", "Celebrity/Producer", "Celebrity/Actor", "Movie Critic/Journalist", "Normal Influencer","Streaming Service", "Record Label"]

// Function to send one request at a time
async function singleGeminiRequest(dataToSend) {
    const promptTemplate = ` 	
    #USER DATA :
    ${JSON.stringify(dataToSend)}

	#INSTRUCTION :
	Which of the following tags does this user belong to and select only one CATEGORY from below.

    ["Media", "Cinema Chain", "Film Festival", "Production Company", "Celebrity/Director", "Celebrity/Producer", "Celebrity/Actor", "Movie Critic/Journalist", "Normal Influencer","Streaming Service", "Record Label"]
    
	Note that if it doesn't belong to any then select {category:'"Normal Influencer"}

	#RETURN INSTRUCTION :
	ALWAYS RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. BE STRAIGHTFORWARD.

	#SAMPLE RESPONSE ( //JUST A SAMPLE ) :
	{ category: 'Normal Influencer'}

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

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData),
    });

    const responseData = await response.json();
    if (responseData.error && responseData.error.code === 429) {
        if(index === keys.length - 1) index = 0;
        else index+=1
        logger.warn("Rate limit hit, waiting for 1 minute...");
        logger.error(`🔴 Rate limit hit, waiting for 1 minute...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return singleGeminiRequest(dataToSend); 
    } else if (responseData.error) {
        logger.error(`🔴 Gemini API Error: ${responseData.error.message}`);
        return null;
    }

    try {
        const category = JSON.parse(responseData['candidates'][0]['content']['parts'][0]['text']).category
        return category;
    } catch (err) {
        logger.error(`❌ Error parsing response: `, err);
        return null;
    }
}

async function geminiCategorizeAndUpdate(db,userDetails) {
    const users = userDetails
    logger.info("Gemini running")
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const user1 = await db('twitter_users').where('id', user.id).first();
        if(user1.ai_category) continue;
        const dataToSend = { name: user.name, description: user.description };
        const category = await singleGeminiRequest(dataToSend);
        
        const validCategory = predefinedCategories.includes(category) ? category : null;

        await db('twitter_users')
            .where('id', user.id)
            .update({ ai_category: validCategory });

        logger.info(`User ${user.id} categorized as: ${validCategory || 'null'}`);
        if ((i + 1) % 10 === 0) {
            logger.warn("Processed 10 requests, waiting for 1 minute...");
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        }
    }
    logger.info("every user ai cateogory updated")
}

module.exports = {
    geminiCategorizeAndUpdate
};
