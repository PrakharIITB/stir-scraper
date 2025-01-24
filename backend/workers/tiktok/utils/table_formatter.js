const knex = require("../.././.././db")
const logger = require("../logger/logger")

async function createTables() {
    try {
        await knex.schema.createTable('tiktok_users', (table) => {
            table.increments('id').primary();
            table.string('tiktok_id', 255).unique().notNullable();
            table.string('username', 200);
            table.string('category', 255);
            table.string('name', 200);
            table.string('region', 200);
            table.text('description');
            table.text('photo');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.boolean('verified').defaultTo(false);
            table.string('secUid', 200);
            table.bigint('tiktok_user_created_at')
        });

        await knex.schema.createTable('tiktok_user_analytics', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('tiktok_users').onDelete('CASCADE');
            table.integer('following');
            table.integer('followers');
            table.integer('likes');
            table.integer('video_count');
            table.date('updated_at');
        });

        await knex.schema.createTable('tiktok_credit_usage', (table)=>{
            table.increments('id').primary();
            table.integer('credit')
            table.string('endpoint')
            table.timestamp('time').defaultTo(knex.fn.now());
        })

        await knex.schema.createTable('tiktok_posts', (table) => {
            table.increments('id').primary();
            table.string('tiktok_video_id', 100).unique().notNullable();
            table.integer('user_id').references('id').inTable('tiktok_users').onDelete('CASCADE');
            table.integer('duration');
            table.text('cover');
            table.float('likes_to_followers_ratio');
            table.text('address');
            table.boolean('is_ad').defaultTo(false);
            table.string('music_id', 100);
            table.string('music_title', 200);
            table.text('music_cover');
            table.integer('like_count');
            table.integer('movie_id').references('movieid').inTable('movies').onDelete('CASCADE');
            table.integer('comment_count');
            table.integer('share_count');
            table.integer('play_count');
            table.integer('saved_count');
            table.date('created_at');
            table.text('description');
        });

        await knex.schema.createTable('tiktok_post_hashtags', (table) => {
            table.increments('id').primary();
            table.string('hashtag_id', 200).unique().notNullable();
            table.string('hashtag', 200);
            table.integer('post_id').references('id').inTable('tiktok_posts').onDelete('CASCADE');
        });

        await knex.schema.createTable('tiktok_user_emails', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('tiktok_users').onDelete('CASCADE');
            table.string('email', 100).unique().notNullable();
        });

        await knex.schema.createTable('tiktok_user_urls', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('tiktok_users').onDelete('CASCADE');
            table.string('source', 255);
            table.string('platform', 255);
            table.text('link').notNullable();
        });

        console.log("Tables created successfully.");
    } catch (error) {
        console.error("Error creating tables:", error);
    } finally {
        knex.destroy();
    }
}

async function dropTables() {
    try {
        await knex.schema.dropTableIfExists('tiktok_user_urls');
        await knex.schema.dropTableIfExists('tiktok_user_emails');
        await knex.schema.dropTableIfExists('tiktok_post_hashtags');
        await knex.schema.dropTableIfExists('tiktok_posts');
        await knex.schema.dropTableIfExists('tiktok_user_analytics');
        await knex.schema.dropTableIfExists('tiktok_users');

        console.log("Tables dropped successfully.");
    } catch (error) {
        console.error("Error dropping tables:", error);
    } finally {
        knex.destroy();
    }
}


createTables()
