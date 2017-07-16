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

module.exports = class Twitter {

    constructor(twitterAPI, utils) {
        this.twitterAPI = twitterAPI;
        this.utils = utils;
    }

    /*
     * Posts a tweet on the bot's account.
     *   tweetMessage - String: The tweet to be posted.
     *   idToReply    - String: The id of which the tweet should be replying to.
     *   userToReply  - String: The username of the user that is being replied to.
     */
    postTweet(tweetMessage, idToReply, userToReply) {
        const data = {
            status: tweetMessage
        };

        if (idToReply !== undefined) {
            data.in_reply_to_status_id = idToReply;
            data.status = "@" + userToReply + " " + data.status;
        }

        this.twitterAPI.post('statuses/update', data, (error, tweet, response) => {
            if (error) {
                this.utils.logError("Failed to post tweet: \"" + tweetMessage + "\"");
                this.utils.logError("    Error: " + error[0].message);
                return;
            }

            this.utils.log("Sent tweet: \"" + tweetMessage + "\"");
        });
    }

    /*
     * Sends a Direct Message from the bot to another user.
     *   message - String: The message body to be sent.
     *   userID  - Int:    The user ID of the receiptent.
     */
    sendDM(message, userID) {
        const data = {
            text: message,
            user_id: userID
        };

        this.twitterAPI.post('direct_messages/new', data, (error, tweet, response) => {
            if (error) {
                this.utils.logError("Failed to send Direct Message to: " + userID);
                this.utils.logError("    .. with message: \"" + message + "\"");
                this.utils.logError("    Error: " + error[0].message);
                return;
            }

            this.utils.log("Sent Direct Message to: " + userID);
            this.utils.log("    Message: \"" + message + "\"");
        });
    }

    /*
     * Retrieves and returns mentions of the bot.
     *   requestData - Object:  Data to be sent with the API request.
     *   Returns     - Promise: Resolves when done processing mentions w/ the data as the resolve value.
     */
    retrieveMentions(requestData) {
        return new Promise((resolve, reject) => {
            this.twitterAPI.get('statuses/mentions_timeline', requestData, (error, mentions, response) => {
                if (error) {
                    this.utils.logError("Failed to retrieve mentions");
                    this.utils.logError("    Error: " +  error[0].message);
                    return; // TODO Write reject code
                }

                resolve(mentions);
            });
        });
    }

    /*
     * Retrieves a list of following users of the specified user ID.
     *   userID  - String:  User ID of the user to check.
     *   Returns - Promise: Resolves when done processing following w/ the list as the resolve value.
     */
    retrieveFollowing(userID) {
        const requestData = {
            user_id: userID,
            stringify_ids: true
        };

        return new Promise((resolve, reject) => {
            this.twitterAPI.get('friends/ids', requestData, (error, following, response) => {
                if (error) {
                    this.utils.logError("Failed to retrieve following list of bot");
                    this.utils.logError("    Error: " + error[0].message);
                    return; // TODO Write reject code
                }

                resolve(following);
            });
        });
    }

    /*
     * Retrieves tweets from the specified request data.
     *   requestData - Object:  Data to be sent with the API request.
     *   Returns     - Promise: Resolves when done processing tweets w/ the list as the resolve value.
     */
    retrieveTweets(requestData) {
        return new Promise((resolve, reject) => {
            this.twitterAPI.get('statuses/user_timeline', requestData, (error, tweets, response) => {
                if (error) {
                    this.utils.logError("Failed to retrieve tweets from user: " + requestData.user_id);
                    this.utils.logError("    Error: " + error[0].message);
                    return; // TODO Write reject code
                }

                resolve(tweets);
            });
        });
    }

};
