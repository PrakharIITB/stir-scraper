const logger = require("./logger");
let geminiKeyIndex = 0;

async function geminiCheckSpam(InstagramPost, MovieData) {
  const promptTemplate = ` 	
    #POST DATA :
    ${JSON.stringify(InstagramPost)}
  
    #MOVIE DATA :
    ${JSON.stringify(MovieData)}
  #INSTRUCTION :
  Check if this Post really relates to the Movie, or is just a spam. As we know that nowadays people are posting spam on Instagram using the popular movie names. So we need to fight this kind of spam. Only mark spam:true if its clearly a spam and not related to movie. If the user hasn't mentioned anything , then mark it as spam:false. You can also look for the Popular Characters and Actors name in the Post
  
  
  #RETURN INSTRUCTION :
  ALWAYS RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. BE STRAIGHTFORWARD. NO NEED TO PROVIDE ANY EXTRA INFORMATION BESIDE A SINGLE JSON RESPONSE.
  
  #SAMPLE RESPONSE ( //JUST A SAMPLE ) :
  // if it's a spam post (spam:true) return  
  { spam: true, movieID : 'tt1234567', postID : '1234567', codeURL : 'https://instagram.com/p/1234567', reason : 'The user just used random hashtags of the trending movies' } 
  
  //if it's not spam post (spam:false) return
  { spam: false, , movieID : 'tt2345678', postID : '2345678', codeURL : 'https://instagram.com/p/1234567', reason : 'The user mentioned about the movie and also used tags related to the actors' }

   //if it's not spam post (spam:false) return
  { spam: true, , movieID : 'tt2345672', postID : '2345677', codeURL : 'https://instagram.com/p/1234577', reason : 'The user didnt mention anything about the movie,but it looks spam as he has used hashtags of other movies as well' }
   
  
  #RESPONSE :
    `;
  const ReturnData = {
    contents: [
      {
        parts: [
          {
            text: promptTemplate,
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
    ],
  };

  const apiKeyArr = [
    "AIzaSyBjg5G-dMkItjbKONQk53dWtsYjQHf_DGw",
    "AIzaSyBEYwa8o88qahK66n64qXqwPaAugcCqE_4",
    "AIzaSyA-2jD-oh-wrDf0BI5dE0BMDjNgyLsFtmo",
    "AIzaSyBDK3uLeO0qFvwSA8CGApYnN9HNoin7fdY",
    "AIzaSyDASZW-mmKjyUtncQfJZL6RC1X-G7w1UYQ",
    "AIzaSyCOM0XvLrhNvBwaRQJpxVId1XF5s3QJNOw",
    "AIzaSyBT4LaG3XciDNmEiQMenJxZ1qYkZ4fyujc",
    "AIzaSyBel6stDpKx_5tFEpauX2vpgZpn-EQi4fI",
    "AIzaSyBy_UYCtRGBODYIMLdrjel1hGpoqENiciU",
    "AIzaSyDzjbGe6_vE7J1OKebCD41hybdV9DtScmw",
    "AIzaSyAepV-4-Ock7-RWctm9Dbx93wdkFiYKBMM",
    "AIzaSyCCJ3hD4N98AV7HGzCFPjzjsDeCoJe-vrE",
    "AIzaSyCINaycOqFoAhtR5TzmP7eus3yUUrjhwQo",
    "AIzaSyDfje0BiLj2fr3V79q7fuix6zXROVYTOTQ",
    "AIzaSyDABK8UHJFXpsdMj8rQnKwbhlJ-d1vcMvU",
    "AIzaSyCYyaoEOplEXZBpLOUCyXaF27k5iV4UFjE",
    "AIzaSyA_OSKrIWcNX_s6ba83nnQizjXuHph7j5o",
    "AIzaSyBhOXFnHFplYX1moC49BrkgjT9AnbZAjm4",
    "AIzaSyD0BHpgnD23OMwIRynsikE81U6fpZjE-f4",
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeyArr[geminiKeyIndex]}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ReturnData),
  });

  const responseData = await response.json();
  // for checking the response if there is rate limit error 429 (debuggind purposes)
  if (responseData.error && responseData.error.code === 429) {
    logger.info(`🟡 Gemini API Key Rotated `);
    geminiKeyIndex = (geminiKeyIndex + 1) % apiKeyArr.length;
    return geminiCheckSpam(InstagramPost, MovieData);
  }

  return JSON.parse(
    responseData["candidates"][0]["content"]["parts"][0]["text"]
  );
}

async function geminiCategorize(instagramData) {
  const promptTemplate = ` 	
    #USER DATA :
    ${JSON.stringify(instagramData)}

#INSTRUCTION :
Which of the following tags does this user belong to and select only one CATEGORY from below.

["Media", "Cinema Chain", "Film Festival", "Production Company", "Celebrity/Director", "Celebrity/Producer", "Celebrity/Actor", "Movie Critic/Journalist", "Normal Influencer",“Streaming Service”, “Record Label”]

Note that if it doesn't belong to any then select {category:'"Normal Influencer"}

#RETURN INSTRUCTION :
ALWAYS RETURN RESPONSE IN JSON FORMAT AND NOTHING ELSE. BE STRAIGHTFORWARD.

#SAMPLE RESPONSE ( //JUST A SAMPLE ) :
{ category: 'Normal Influencer'}

#RESPONSE :
    `;
  const ReturnData = {
    contents: [
      {
        parts: [
          {
            text: promptTemplate,
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
    ],
  };

  const apiKeyArr = [
    "AIzaSyBjg5G-dMkItjbKONQk53dWtsYjQHf_DGw",
    "AIzaSyBEYwa8o88qahK66n64qXqwPaAugcCqE_4",
    "AIzaSyA-2jD-oh-wrDf0BI5dE0BMDjNgyLsFtmo",
    "AIzaSyBDK3uLeO0qFvwSA8CGApYnN9HNoin7fdY",
    "AIzaSyDASZW-mmKjyUtncQfJZL6RC1X-G7w1UYQ",
    "AIzaSyCOM0XvLrhNvBwaRQJpxVId1XF5s3QJNOw",
    "AIzaSyBT4LaG3XciDNmEiQMenJxZ1qYkZ4fyujc",
    "AIzaSyBel6stDpKx_5tFEpauX2vpgZpn-EQi4fI",
    "AIzaSyBy_UYCtRGBODYIMLdrjel1hGpoqENiciU",
    "AIzaSyDzjbGe6_vE7J1OKebCD41hybdV9DtScmw",
    "AIzaSyAepV-4-Ock7-RWctm9Dbx93wdkFiYKBMM",
    "AIzaSyCCJ3hD4N98AV7HGzCFPjzjsDeCoJe-vrE",
    "AIzaSyCINaycOqFoAhtR5TzmP7eus3yUUrjhwQo",
    "AIzaSyDfje0BiLj2fr3V79q7fuix6zXROVYTOTQ",
    "AIzaSyDABK8UHJFXpsdMj8rQnKwbhlJ-d1vcMvU",
    "AIzaSyCYyaoEOplEXZBpLOUCyXaF27k5iV4UFjE",
    "AIzaSyA_OSKrIWcNX_s6ba83nnQizjXuHph7j5o",
    "AIzaSyBhOXFnHFplYX1moC49BrkgjT9AnbZAjm4",
    "AIzaSyD0BHpgnD23OMwIRynsikE81U6fpZjE-f4",
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeyArr[geminiKeyIndex]}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ReturnData),
  });

  const responseData = await response.json();
  // for checking the response if there is rate limit error 429 (debuggind purposes)
  // console.log(responseData);
  if (responseData.error && responseData.error.code === 429) {
    geminiKeyIndex = (geminiKeyIndex + 1) % apiKeyArr.length;
    logger.info(`🟡 Gemini API Key Rotated `);
    return geminiCategorize(instagramData); // Retry with next API key
  } else if (responseData.error) {
    logger.error(`🔴 Gemini API Error: ${responseData.error.message}`);
    return {
      status: 500,
      success: false,
      error: responseData.error.message,
      message: `🔴 Gemini API Error: ${responseData.error.message}`,
    };
  }

  return JSON.parse(
    responseData["candidates"][0]["content"]["parts"][0]["text"]
  );
}

module.exports = { geminiCheckSpam, geminiCategorize };
