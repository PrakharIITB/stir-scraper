const db = require('./../../db/db');
const {processTask, setTask} = require('./processTask');
const logger = require('./logger'); 

async function createTask(task_id) {
    try {
        const taskExists = (await db.select('*').from('influencer_posts_tasks').where('task_id', task_id).first());
        if(!taskExists){
            logger.error(`🔴 Task#${task_id} doesn't exists`);
            return { success: false };
        }
        if(taskExists.status === "completed"){
            logger.warn(`🟡 Task#${task_id} already completed`);
            return { success: true };
        }
        logger.info(`🎌 Task#${task_id} initialized`);
        await db('influencer_posts_tasks').where('task_id', task_id).update({status: 'processing'});
        const {user_id, username, followers_count} = taskExists;
        const response = await processTask(task_id, user_id, username, followers_count, post_limit=1000);

        if (response.success) {
            await setTask(task_id, "completed", response.total_posts);
            logger.info(`🟢 Completed  Task#${task_id}`);
            return { success: true };
        } else {
            await setTask(task_id, "failed", null);
            logger.error(`🔴 Failed  Task#${task_id}`);
            return { success: false };
        }
        // set the task status to completed
    } catch (error) {
        await setTask(task_id, "failed");
        logger.error(`🔴 Task#${task_id} failed`);
        return { success: false };
    }
}

module.exports = createTask