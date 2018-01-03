/**
 * NTwitBot - tweet.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

module.exports = class Tweet {

    /**
     * Create a new tweet object.
     * @param {string} tweetID - The ID of the tweet.
     * @param {string} text - The text body of the tweet.
     * @param {string} userID - The user's ID.
     * @param {string} username - The user's @ name.
     */
    constructor(tweetID, text, userID, username) {
        this.tweetID = tweetID;
        this.text = text;
        this.userID = userID;
        this.username = username;

        this.mentions = [];
        this.date = null;
        this.repliedUserID = null;
        this.repliedTweetID = null;
        this.repliedUsername = null;
    }

    /**
     * Adds in reply to properties to the tweet.
     * @param {string} repliedTweetID - The ID of the tweet that's being replied to.
     * @param {string} repliedUserID - The user ID of the tweet that's being replied to.
     * @param {string} repliedUsername - The username of the tweet that's being replied to.
     * @return {Tweet} Object instance for chaining.
     */
    inReplyTo(repliedTweetID, repliedUserID, repliedUsername) {
        this.repliedTweetID = repliedTweetID;
        this.repliedUserID = repliedUserID;
        this.repliedUsername = repliedUsername;
        return this;
    }

    /**
     * Add the display name of the user.
     * @param {string} name - The display name of the user.
     * @return {Tweet} Object instance for chaining.
     */
    withName(name) {
        this.name = name;
        return this;
    }

    /**
     * Adds the date to the tweet.
     * @param {string} weekday - The day of the week in proper form. Example: 'Mon'
     * @param {string} month - The month in proper form. Example: 'Feb'
     * @param {string} day - The day of the month in proper form. Example: '06'
     * @param {string} time - The time in proper form. Example: '08:15:45'
     * @param {string} year - The year in proper form. Example: '2017'
     * @return {Tweet} Object instance for chaining.
     */
    withDate(weekday, month, day, time, year) {
        this.date = weekday + ' ' + month + ' ' + day + ' ' + time + ' +0000 ' + year;
        return this;
    }

    /**
     * Adds a mention to the tweet data.
     * @param {string} username - The username of the user being mentioned.
     * @param {string} userID - The user ID of the user being mentioned.
     * @return {Tweet} Object instance for chaining.
     */
    includingMention(username, userID) {
        this.mentions.push({
            'id_str': userID,
            'username': username
        });
        return this;
    }

    /**
     * Converts the tweet to a string respresentation equivalent to what Twitter's API
     * would look like.
     * @return {Object} An generic object respresentation.
     */
    toAPIObject() {
        return JSON.parse(JSON.stringify({
            'created_at': this.date,
            'text': this.text,
            'id_str': this.tweetID,
            'in_reply_to_status_id_str': this.repliedTweetID,
            'in_reply_to_user_id_str': this.repliedUserID,
            'in_reply_to_screen_name': this.repliedUsername,
            'entities': {
                'user_mentions': this.mentions
            },
            'user': {
                'id_str': this.userID,
                'name': this.name,
                'screen_name': this.username
            }
        }));
    }

};
