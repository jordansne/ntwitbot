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

/* jshint esversion:6, node: true */

module.exports = class Action {

    constructor(twitterPkg) {
        this.twitterPkg = twitterPkg;
    }

    /*
     * Posts a tweet on the bot's account.
     *
     *   tweetMessage - String: The tweet to be posted.
     */
    postTweet(tweetMessage) {
        const data = {
            status: tweetMessage
        };

        this.twitterPkg.post('statuses/update', data, (error, tweet, response) => {
            if (!error) {
                console.log("[INFO] Sent tweet: \"" + tweetMessage + "\"");
            } else {
                console.log("[ERROR] Failed to post tweet: \"" + tweetMessage + "\"");
                console.log("[ERROR]     Error message: " + error[0].message);
            }
        });
    }

    /*
     * Sends a Direct Message from the bot to another user.
     *
     *   message - String: The message body to be sent.
     *   userID  - int   : The user ID of the receiptent.
     */
    sendDM(message, userID) {
        const data = {
            text: message,
            user_id: userID
        };

        this.twitterPkg.post('direct_messages/new', data, (error, tweet, response) => {
            if (!error) {
                console.log("[INFO] Sent Direct Message to: " + userID);
                console.log("[INFO]     Message: \"" + message + "\"");
            } else {
                console.log("[ERROR] Failed to send Direct Message to: " + userID);
                console.log("[ERROR]     .. with message: \"" + message + "\"");
                console.log("[ERROR]     Error message: " + error[0].message);
            }
        });
    }

    /*
     * Handles when user mentions (@'s') the bot.
     *
     *   tweet - Object: The tweet where the bot was mentioned.
     */
    handleMention(tweet) {
        // ...
    }

};
