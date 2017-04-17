/*
 * NTwitBot - actions.js
 * Copyright (C) 2016 Jordan Sne
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

module.exports = class Action {

    constructor(generator, twitterPkg, utils) {
        this.generator = generator;
        this.twitterPkg = twitterPkg;
        this.utils = utils;
    }

    /*
     * Posts a tweet on the bot's account.
     *   tweetMessage - String: The tweet to be posted.
     *   idToReply -    String: The id of which the tweet should be replying to.
     *   userToReply -  String: The username of the user that is being replied to.
     */
    postTweet(tweetMessage, idToReply, userToReply) {
        const data = {
            status: tweetMessage
        };

        if (idToReply !== undefined) {
            data.in_reply_to_status_id = idToReply;
            data.status = "@" + userToReply + " " + data.status;
        }

        this.twitterPkg.post('statuses/update', data, (error, tweet, response) => {
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
     *   userID  - Int   : The user ID of the receiptent.
     */
    sendDM(message, userID) {
        const data = {
            text: message,
            user_id: userID
        };

        this.twitterPkg.post('direct_messages/new', data, (error, tweet, response) => {
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
     * Handles when user mentions (@'s') the bot.
     *   tweet - Object: The tweet where the bot was mentioned.
     */
    handleMention(tweet) {
        this.postTweet(this.generator.generateResponse(), tweet.id_str, tweet.user.screen_name);
    }

};
