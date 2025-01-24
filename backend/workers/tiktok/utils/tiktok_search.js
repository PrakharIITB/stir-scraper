const axios = require('axios');
const fs = require('fs');
const knex = require("../../../database/db")
const logger = require("../logger/logger");
const { returnVideo } = require('./extra_utils');
async function fetchVideos(task_id_recivied=23,channel=null,msg=null) {
  try {
    let task_id = task_id_recivied;
    const task = await knex("tasks").where("task_id", task_id).select('*').first();
    if (task.status == 'completed' || !task) {
      console.error(`No task found with ID: ${task_id} OR already completed`);
      return;
    }
    let { query, movie_id } = task;
    if (!query || !movie_id) {
      console.error("Missing query or movie_id in the task.");
      return;
    }

    const movie = await knex("movies").where("movieid", movie_id).first();
    if (!movie) {
      console.error(`No movie found with ID: ${movie_id}`);
      return;
    }

    let loop = 6;
    let pagination = "0";
    let videos = [];
    let users = 0
    while (loop--) {
      const options = {
        method: 'GET',
        url: 'https://tiktok-api23.p.rapidapi.com/api/search/video',
        params: {
          keyword: query,
          cursor: pagination,
          search_id: '0'
        },
        headers: {
          'x-rapidapi-key': process.env.TIKTOK_API_KEY,
          'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
        }
      };

      const response = await axios.request(options);
      await knex("tiktok_credit_usage").insert({
        endpoint: "https://tiktok-api23.p.rapidapi.com/api/search/video",
        credit: 1,
    })
      if (response.data && response.data.item_list && Array.isArray(response.data.item_list) && response.data.item_list.length > 0) {
        const lookup = response.data.item_list;
        const {arr, user_count} =await returnVideo(lookup, movie)
        videos = [...videos,...arr];
        users+=user_count
        pagination = `${parseInt(pagination) + 1}`;
      } else {
        console.log("No more videos found or pagination went ahead.");
        break;
      }
      console.log("pagination went ahead.");

    }

    console.log(`Total videos collected: ${videos.length}`);
    console.log(`Total users collected: ${users}`);
    await knex("tasks")
    .where("task_id", task_id)
    .update({
        status: 'completed',
        totaldedupeduser: users
    });

    channel.ack(msg)
  } catch (error) {
    console.error('Error fetching TikTok user info:', error);
    channel.nack(msg)
  }
}
module.exports = {
  fetchVideos
}