/*
 * NTwitBot - retrieve.js
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

module.exports = class Retrieve {

    constructor(twitterHandler, dataHandler, generator, utils) {
        this.twitterHandler = twitterHandler;
        this.dataHandler = dataHandler;
        this.generator = generator;
        this.utils = utils;

        this.TWEETS_TO_TRACK = 3000;

        // Read status from file or initialize with trackedUsers dictionary & last mention data
        if ((this.botStatus = this.dataHandler.readStatus()) === null) {
            this.botStatus = {
                trackedUsers: {}, // Dictionary with key & value: userID (int) : LastTweetIDProcessed (int)
                lastMention: 0    // Last mention (tweet ID) that was processed
            };
        }
    }

    /*
     * Retrieves new mentions of the bot, and saves the current status if needed.
     *   Returns - Promise: Resolves w/ any new mentions.
     */
    retrieveMentions() {
        const mentionData = {};

        // Retrieve since last mention or last 200
        if (this.botStatus.lastMention !== 0) {
            mentionData.since_id = this.botStatus.lastMention;
        } else {
            mentionData.count = 200;
        }

        return new Promise((resolve, reject) => {
            this.twitterHandler.getMentions(mentionData).then((mentions) => {
                if (mentions.length > 0) {
                    this.botStatus.lastMention = mentions[0].id_str;
                    this.dataHandler.saveStatus(this.botStatus);
                }

                resolve(mentions);
            });
        });
    }

    /*
     * Retrieves and processed new tweets of tracked users.
     *   Returns - Promise: Resolves with the new tweets.
     */
    retrieveTweets() {
        const tweetsToProcess = [];
        const tweetRetrievals = [];

        // Retrieve a list of users that the bot is following
        return new Promise((resolve, reject) => {
            this.twitterHandler.getFollowing(this.dataHandler.ownID).then((following) => {
                this.updateTrackList(following.ids);

                // Process any new tweets that users have made
                for (let userID in this.botStatus.trackedUsers) {
                    const lastTweetID = this.botStatus.trackedUsers[userID];
                    const userData = {
                        user_id: userID,
                        count: 200
                    };

                    // If the user has been processed before
                    if (lastTweetID !== 0) {
                        userData.since_id = lastTweetID;

                        this.utils.log("Retrieving new tweets from user with ID: '" + userData.user_id + "'");

                        tweetRetrievals.push(
                            new Promise((resolve) => this.retrieveTweetsSince(userData, tweetsToProcess, resolve))
                        );

                        // If the user has NOT been processed before
                    } else {
                        // Retrieve defined number of tweets if less than 200
                        userData.count = this.TWEETS_TO_TRACK >= 200 ? 200 : this.TWEETS_TO_TRACK;

                        this.utils.log("New user with ID: '" + userData.user_id + "' added");
                        this.utils.log("    Retrieving most recent " + this.TWEETS_TO_TRACK + " tweets");

                        // Add retrieval promise to list
                        tweetRetrievals.push(
                            new Promise(
                                (resolve) => this.retrieveTweetsNew(userData, tweetsToProcess, this.TWEETS_TO_TRACK, resolve)
                            )
                        );
                    }
                }

                // When all retrievals are finished, process the tweets & save trackedUsers to file
                Promise.all(tweetRetrievals).then(() => {
                    if (tweetsToProcess > 0) {
                        this.dataHandler.saveStatus(this.botStatus);
                    }

                    resolve(tweetsToProcess);
                });
            });
        });
    }

    /*
     * Updates the currently tracked users with the current list of followed users.
     *   following - List: Users that the account is currently following.
     */
    updateTrackList(following) {
        // Add any new follows to the trackedUsers list
        for (let i = 0; i < following.length; i++) {
            let user = following[i];

            if (!(user in this.botStatus.trackedUsers)) {
                this.botStatus.trackedUsers[user] = 0;
            }
        }

        // Remove any trackedUsers that the bot is no longer following
        for (let userID in this.botStatus.trackedUsers) {
            if (!this.utils.isInArray(following, userID)) {
                delete this.botStatus.trackedUsers[userID];
            }
        }
    }

    /*
     * Retrieves new tweets from a user and adds tweets to tweetsToProcess.
     *   userData             - Object:   User information to retrieve tweets from.
     *   tweetsToProcess      - Array:    To be filled with retrieved tweets.
     *   resolve              - Function: Function to call when done retrieving tweets to resolve promise.
     *   tweetsRetrievedTotal - Int:      Used by recursive call, do not specify in initial call.
     */
    retrieveTweetsSince(userData, tweetsToProcess, resolve, tweetsRetrievedTotal) {
        this.twitterHandler.getTweets(userData).then((tweets) => {
            const tweetsRetrieved = tweets.length;

            // Add retrieved tweets to counter
            if (tweetsRetrievedTotal === undefined) {
                tweetsRetrievedTotal = 0;
            }

            tweetsRetrievedTotal += tweetsRetrieved;

            if (tweetsRetrieved > 0) {
                // Add tweets to processing list
                for (let i = 0; i < tweets.length; i++) {
                    let tweet = tweets[i];

                    // Do not include retweets
                    if (!tweet.hasOwnProperty("retweeted_status")) {
                        tweetsToProcess.push(tweets[i]);
                    }
                }

                // Save most recent tweet ID
                this.botStatus.trackedUsers[userData.user_id] = tweets[0].id_str;

                userData.since_id = tweets[0].id_str;

                // Continue processing the rest of the tweets
                this.utils.log("    Retrieved " + tweetsRetrievedTotal + " tweets");
                this.retrieveTweetsSince(userData, tweetsToProcess, resolve, tweetsRetrievedTotal);

            // Reached end of tweets
            } else {
                this.utils.log("    Finished retrieving tweets");
                resolve();
            }
        });
    }

    /*
     * Retrieves new tweets from a user and adds tweets to tweetsToProcess.
     *   userData        - Object:   User information to retrieve tweets from.
     *   tweetsToProcess - Array:    To be filled with retrieved tweets.
     *   numOfTweets     - Int:      Numer of tweets to retrieve.
     *   resolve         - Function: Function to call when done retrieving tweets to resolve promise.
     */
    retrieveTweetsNew(userData, tweetsToProcess, numOfTweets, resolve) {
        this.twitterHandler.getTweets(userData).then((tweets) => {
            const tweetsRetrieved = tweets.length;
            numOfTweets -= tweetsRetrieved;
            const tweetsRetrievedTotal = this.TWEETS_TO_TRACK - numOfTweets;

            // If it is the first time calling the method (in which max_id would not be set)
            if (!userData.max_id && tweets.length > 0) {
                // Set the most recent tweet as last
                this.botStatus.trackedUsers[userData.user_id] = tweets[0].id_str;
            }

            // If oldest ID from the call is the same as the last (ie one tweet).
            if (userData.max_id === tweets[tweets.length - 1].id_str && userData.count > 1) {
                this.utils.log("    Retrieved " + tweetsRetrievedTotal + "/" + this.TWEETS_TO_TRACK + " tweets");
                this.utils.log("    Reached max tweet retrieval limit.");
                resolve();
                return;
            }

            // Add tweets to processing list
            // Exclude final tweet as it will be used in next method iteration
            for (let i = 0; i < tweets.length - 1; i++) {
                let tweet = tweets[i];

                // Do not include retweets.
                if (!tweet.hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweets[i]);
                }
            }

            if (numOfTweets > 0) {
                // Continue processing the rest of the tweets
                userData.max_id = tweets[tweets.length - 1].id_str;

                // Avoid retrieving unneeded tweets
                if (numOfTweets < 200) {
                    userData.count = numOfTweets;
                }

                this.utils.log("    Retrieved " + tweetsRetrievedTotal + "/" + this.TWEETS_TO_TRACK + " tweets");
                this.retrieveTweetsNew(userData, tweetsToProcess, numOfTweets, resolve);
            } else {
                // Add the last tweet if no other retrievals are being done
                if (!tweets[tweetsRetrieved - 1].hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweets[tweetsRetrieved - 1]);
                }

                this.utils.log("    Retrieved " + tweetsRetrievedTotal + "/" + this.TWEETS_TO_TRACK + " tweets");
                resolve();
            }
        });
    }

};
