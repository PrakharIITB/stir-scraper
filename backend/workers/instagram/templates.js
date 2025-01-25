

function DB_template_post ( postData, movie_id, user_id, follower_count ) {
    const template = {
        insta_post_id: postData?.id || null,
        location_id: postData?.location?.external_id || null,
        location_lat: postData?.location?.lat || null,
        location_lng: postData?.location?.lng || null,
        shortcode: postData?.code || null,
        user_id: user_id,
        movie_id: movie_id,
        post_type: postData?.media_name || null,
        taken_at: postData?.taken_at_ts ? new Date(postData?.taken_at_ts * 1000) : null,
        caption: postData?.caption_text || null,
        likes_count: postData?.like_count,
        likes_to_followers_ratio : postData?.like_count / follower_count,
        comments_count: postData?.comment_count,
        views_count: postData?.is_video === true ? postData?.view_count : null,
        plays_count: postData?.is_video === true ? postData?.play_count : null,
        video_duration: postData?.is_video === true ? parseInt(postData?.video_duration, 10) : null,
        thumbnail_img: postData?.thumbnail_url || postData?.resources?.[0]?.thumbnail_url || null,
        has_hashtags: postData?.caption_hashtags?.length > 0,
        has_mentioned: postData?.caption_mentions?.length > 0 || postData?.tagged_users?.length > 0,
        comments_disabled: postData?.comments_disabled,
        like_and_view_counts_disabled: postData?.like_and_view_counts_disabled,
        music_id: postData?.clips_metadata && postData?.clips_metadata?.audio_type == "licensed_music"? postData?.clips_metadata?.music_info?.music_asset_info?.audio_asset_id : null,
        music_name: postData?.clips_metadata && postData?.clips_metadata?.audio_type == "licensed_music"? postData?.clips_metadata?.music_info?.music_asset_info?.title : null,
        music_artist_name: postData?.clips_metadata && postData?.clips_metadata?.audio_type == "licensed_music"? postData?.clips_metadata?.music_info?.music_asset_info?.display_artist : null,
        music_cover_img: postData?.clips_metadata && postData?.clips_metadata?.audio_type == "licensed_music"? postData?.clips_metadata?.music_info?.music_asset_info?.cover_artwork_thumbnail_uri : null,
        video_url: postData?.video_url || null,
        last_update: new Date()
      }

      return template
}


function DB_template_user_for_AI_Categorization ( userData ) {
  const template = {
    username: userData['username'] || null,
    is_private: 'is_private' in userData ? userData['is_private'] : null,
    is_verified: 'is_verified' in userData ? userData['is_verified'] : null,
    name: userData['full_name'] || null,
    biography: userData['biography'] || null,
    external_url: userData['external_url'] || null,
    followers_count: userData['follower_count'] || null,
    followings_count: userData['following_count'] || null,
    posts_count: userData['media_count'] || null,
    is_business: 'is_business' in userData ? userData['is_business'] : null,
    business_email: userData['public_email'] || null,
    biography_email: userData['biography_email'] || null,
    business_countrycode: userData['public_phone_country_code'] || null,
    business_number: userData['public_phone_number'] || null,
    country: userData['about']?.country || null,
    has_anonymous_profile_picture :'has_anonymous_profile_picture' in userData ? userData['has_anonymous_profile_picture'] : null,

    }
    return template;
}
function DB_template_post_for_AI_Categorization ( postData ) { 
  const template = {
      insta_post_id: postData?.id || null,
      shortcode: postData?.code || null,
      post_type: postData?.media_name || null,
      taken_at: postData?.taken_at_ts ? new Date(postData?.taken_at_ts * 1000) : null,
      caption: postData?.caption_text || null,
      likes_count: postData?.like_count,
      comments_count: postData?.comment_count,
      views_count: postData?.is_video === true ? postData?.view_count : null,
      plays_count: postData?.is_video === true ? postData?.play_count : null,
      video_duration: postData?.is_video === true ? parseInt(postData?.video_duration, 10) : null,
      username: postData?.user?.username || null,
      full_name : postData?.user?.full_name || null,
    }

    return template
}


function DB_template_mentions(mentions , tagged_users, post_id) {
    let all_mentions = [];
    if (mentions) { 
        all_mentions = mentions.map((user) => {
            return {
                insta_user_id: null,
                username: user,
                mention_type: 'caption',
                post_id: post_id
            }
        })
    }

    if (tagged_users) {
        all_mentions = all_mentions.concat(tagged_users.map((user) => {
            return {
                insta_user_id: user.id,
                username: user.username,
                mention_type: 'tag',
                post_id: post_id
            }
        }))
    }

    return all_mentions;
}


function DB_template_user(userData, category) {
    const template = {
      insta_user_id: userData['id'] || null,
      username: userData['username'] || null,
      is_private: 'is_private' in userData ? userData['is_private'] : null,
      is_verified: 'is_verified' in userData ? userData['is_verified'] : null,
      name: userData['full_name'] || null,
      biography: userData['biography'] || null,
      profile_photo_hd: userData['profile_pic_url_hd'] || null,
      external_url: userData['external_url'] || null,
      followers_count: userData['follower_count'] || null,
      followings_count: userData['following_count'] || null,
      posts_count: userData['media_count'] || null,
      is_business: 'is_business' in userData ? userData['is_business'] : null,
      business_email: userData['public_email'] || null,
      biography_email: userData['biography_email'] || null,
      business_countrycode: userData['public_phone_country_code'] || null,
      business_number: userData['public_phone_number'] || null,
      country: userData['about']?.country || null,
      category: userData['category'] || null,
      ai_category: category || null,
      has_anonymous_profile_picture :'has_anonymous_profile_picture' in userData ? userData['has_anonymous_profile_picture'] : null,
      date_joined: userData['about']?.date_joined_as_timestamp ? new Date(userData['about'].date_joined_as_timestamp * 1000) : null,
      date_verified: userData['about']?.date_verified_as_timestamp ? new Date(userData['about'].date_verified_as_timestamp * 1000) : null,
      former_username_count : userData['about']?.former_usernames || null,
      latest_reel_media : userData?.latest_reel_media || null,
      last_update:  new Date(),
  
    };
    return template;
  }
  
  module.exports = {DB_template_post, DB_template_user, DB_template_user_for_AI_Categorization, DB_template_post_for_AI_Categorization, DB_template_mentions}