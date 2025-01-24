const { Logger } = require('winston');
const db = require('./../../database/db');

const logger = require('./logger'); 
const {processTask, setTask, processUser} = require('./processTask');
const { createTables } = require('./createTable');

async function createTask(task_id) {
    // Create tables if not exists
    await createTables();
    const taskExists = (await db.select('task_id').from('tasks').where('task_id', task_id).first());
    if (!taskExists) {
        logger.error(`🔴 Task#${task_id} doesn't exists`);
        return { success: false };
    }    
    //check if task already completed
    const taskStatus = (await db.select('status').from('tasks').where('task_id', task_id).first()).status;
    if (taskStatus === "completed") {
        logger.warn(`🟡 Task#${task_id} already completed`);
        return { success: true };
    }

    logger.info(`🎌 Task#${task_id} Initialized !`);
    // setting the status to processing
    await setTask(task_id, "processing", null);
    
    const hashtagName = (await db.select('query').from('tasks').where('task_id', task_id).first()).query;
    const taskResponse = await processTask(hashtag = hashtagName, hashtagPageLimit = 4, task_id = task_id, likesLimit = 50, followersLimit = 3000);
    if (taskResponse.success) {
        await setTask(task_id, "completed", taskResponse.totaldedupeduser);
        logger.info(`🟢 Completed  Task#${task_id}`);
        return { success: true };
    } else {
        await setTask(task_id, "failed", null);
        logger.error(`🔴 Failed  Task#${task_id}`);
        return { success: false };
    }
}

async function createUser(stir_id , username) {
    const response  =  await processUser(stir_id, username);
    if (!response.success) {
        logger.error(`🔴 Failed  User#${stir_id}`);
        return { success: false};
    }
    const user_id = response.user_id;
    logger.info(`🟢 Completed  User#${stir_id} and saved ${user_id}`);
    return { success: true};
}


// clearTablesforFreshTesting()

module.exports = {createTask, createUser};

