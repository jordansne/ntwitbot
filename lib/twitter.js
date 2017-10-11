/*
 * NTwitBot - twitter.js
 * Copyright (C) 2016-2017 Jordan Sne
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const TwitterModule = require('twitter');

/**
 * Twitter API interactor class. Gets data directly from Twitter.
 */
module.exports = class Twitter {

    /**
     * Initialize the class.
     * @param {Object} secretData - The secret data for the Twitter API.
     * @param {Util} utils - The utilities object needed for logging, etc.
     */
    constructor(secretData, utils) {
        this.twitterAPI = new TwitterModule(secretData);
        this.utils = utils;
    }

    /**
     * Verifies secret data with Twitter's API.
     * @return {Promise} Resolves with the bot's user ID.
     */
    verify() {
        const userData = {
            include_entities: false,
            skip_status: true
        };

        return new Promise((resolve, reject) => {
            /* eslint no-unused-vars: 'off' */
            this.twitterAPI.get('account/verify_credentials', userData, (error, account, response) => {
                if (error) {
                    this.utils.logError('FATAL: Failed to verify twitter configuration');
                    reject(error);
                    return;
                }

                this.ownID = account.id_str;
                resolve(this.ownID);
            });
        });
    }

    /**
     * Posts a tweet on the bot's account.
     * @param {string} tweetMessage - The tweet to be posted.
     * @param {string} [idToReply] - The ID of which the tweet should be replying to.
     * @param {string} [userToReply] - The username of the user that is being replied to.
     * @return {Promise} Resolve if successful sending tweet.
     */
    postTweet(tweetMessage, idToReply, userToReply) {
        const data = {
            status: tweetMessage
        };

        if (idToReply) {
            data.in_reply_to_status_id = idToReply;
            data.status = '@' + userToReply + ' ' + data.status;
        }

        return new Promise((resolve, reject) => {
            this.twitterAPI.post('statuses/update', data, (error, tweet, response) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Sends a Direct Message from the bot to another user.
     * @param {string} message - The message to be sent.
     * @param {int} userID - The user ID of the recipient.
     * @return {Promise} Resolves on successful send.
     */
    sendDM(message, userID) {
        const data = {
            text: message,
            user_id: userID
        };

        return new Promise((resolve, reject) => {
            this.twitterAPI.post('direct_messages/new', data, (error, result, response) => {
                if (error) {
                    this.utils.logError('Failed to send Direct Message to: ' + userID);
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Retrieves and returns mentions of the bot.
     * @param {Object} requestData - The request data to be sent with request.
     * @return {Promise} Resolves with the mention data.
     */
    getMentions(requestData) {
        return new Promise((resolve, reject) => {
            this.twitterAPI.get('statuses/mentions_timeline', requestData, (error, mentions, response) => {
                if (error) {
                    this.utils.logError('Failed to retrieve mentions from bot');
                    reject(error);
                    return;
                }

                resolve(mentions);
            });
        });
    }

    /**
     * Retrieves a list of following users of the bot.
     * @param {string} userID - User ID of the user to check.
     * @return {Promise} Resolves with the following list.
     */
    getFollowing() {
        const requestData = {
            user_id: this.ownID,
            stringify_ids: true
        };

        return new Promise((resolve, reject) => {
            this.twitterAPI.get('friends/ids', requestData, (error, following, response) => {
                if (error) {
                    this.utils.logError('Failed to retrieve following list of bot');
                    reject(error);
                    return;
                }

                resolve(following);
            });
        });
    }

    /**
     * Retrieves tweets from the specified request data.
     * @param {Object} requestData - Data to be sent with the API request.
     * @return {Promise} Resolves with the tweet list.
     */
    getTweets(requestData) {
        return new Promise((resolve, reject) => {
            this.twitterAPI.get('statuses/user_timeline', requestData, (error, tweets, response) => {
                if (error) {
                    this.utils.logError('Failed to retrieve tweets from user: ' + requestData.user_id);
                    reject(error);
                    return;
                }

                resolve(tweets);
            });
        });
    }

};
