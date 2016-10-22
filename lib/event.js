/*
 * NTwitBot - event.js
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

const timers = require('timers');

module.exports = class Event {

    constructor(twitterPkg, actionHandler, dataHandler) {
        this.twitterPkg = twitterPkg;
        this.actionHandler = actionHandler;
        this.dataHandler = dataHandler;

        this.TWEETS_TO_TRACK = 500;

        /* Dictionary with key & value: userID (int) : LastTweetIDProcessed' (int) */
        this.trackedUsers = {};
        /* Last mention that was processed. */
        this.lastMention = 0;
    }

    /*
     * Starts the event handler. Occurs when the app has finished setup.
     */
    start() {
        // Set a 15 min interval to run 'runUpate()'
        timers.setInterval(() => {
            this.runUpdate();
        }, 900000);
    }

    /*
     * Scheduled 15 min interval bot update.
     */
    runUpdate() {
        console.log("[INFO] Running update..");

        this.checkMentions();
        this.checkTrackedTweets();
    }

    /*
     * Retrieves and processed mentions of the bot.
     */
    checkMentions() {
        const mentionData = {};

        // If the mention tweets have been processed before..
        if (this.lastMention !== 0) {
            mentionData.since_id = this.lastMention;
        // .. otherwise, process their most recent tweets.
        } else {
            mentionData.count = 200;
        }

        this.twitterPkg.get('statuses/mentions_timeline', mentionData, (error, mentions, response) => {
            if (error) {
                console.error("[ERROR] Update: Failed to retrieve mentions");
                console.error("[ERROR] Update:     Error message: %s", error[0].message);
                return;
            }

            console.log("[INFO] Update: %d new mentions found", mentions.length);

            for (let i = 0; i < mentions.length; i++) {
                this.actionHandler.handleMention(mentions[i]);
            }
        });
    }

    /*
     * Retrieves and processed new tweets of tracked users.
     */
    checkTrackedTweets() {
        const tweetsToProcess = [];
        const tweetRetrievals = [];
        const data = {
            user_id: this.dataHandler.ownID,
            stringify_ids: true
        };

        // Retrieve a list of users that the bot is following
        this.twitterPkg.get('friends/ids', data, (error, result, response) => {
            if (error) {
                console.error("[ERROR] Update: Failed to retrieve following list of bot");
                console.error("[ERROR] Update:     Error message: %s", error[0].message);
                return;
            }

            const currentTrackedUsers = result.ids;

            // Check for new users the bot is following
            for (let i = 0; i < currentTrackedUsers.length; i++) {
                let user = currentTrackedUsers[i];

                // If the user is not in trackedUsers (ie new follow), add to dictionary
                // and give lastTweetID as 0.
                if (!(user in this.trackedUsers)) {
                    this.trackedUsers[user] = 0;
                }
            }

            // Check for users that the bot is no longer following
            for (let userID in this.trackedUsers) {
                // Check if userID exists in currentTrackedUsers, if it does not,
                // remove them from trackedUsers.
                if (!(currentTrackedUsers.indexOf(userID) > -1)) {
                    delete this.trackedUsers[userID];
                }
            }

            // Process any new tweets that users have made
            for (let userID in this.trackedUsers) {
                const lastTweetID = this.trackedUsers[userID];
                const userData = {
                    user_id: userID,
                    include_rts: false
                };

                // If the user's tweet have been processed before..
                if (lastTweetID !== 0) {
                    userData.since_id = lastTweetID;
                // .. otherwise, process their most recent tweets.
                } else {
                    userData.count = this.TWEETS_TO_TRACK;
                }

                // Push a list of promises to list to ensure all tweets are retrieved before procesing
                tweetRetrievals.push(
                    new Promise(
                        (resolve) => this.retrieveUserTweets(userData, tweetsToProcess, resolve),
                        (reject)  => console.log("[ERROR] Update: Failed to retrieve tweets (PROMISE REJECTED)")
                    )
                );
            }

            // Process the tweets & save trackedUsers to file when all retrievals are finished
            Promise.all(tweetRetrievals).then(() => {
                this.dataHandler.processTrackedTweets(tweetsToProcess);
                this.dataHandler.saveTrackedUsers(this.trackedUsers);
            });
        });
    }

    /* Retrieves new tweets from a user and adds tweets to tweetsToProcess. */
    retrieveUserTweets(userData, tweetsToProcess, done) {
        this.twitterPkg.get('statuses/user_timeline', userData, (error, tweets, response) => {
            if (error) {
                console.error("[ERROR] Update: Failed to retrieve tweets from user: %d", userData.userID);
                console.error("[ERROR] Update:     Error message: %s", error[0].message);
                return;
            }

            console.log("[INFO] Update: Found %d new tweets from user: %s", tweets.length, tweets[0].user.id);

            tweetsToProcess.push(...tweets);
            done();
        });
    }

};
