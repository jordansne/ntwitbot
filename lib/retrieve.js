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
    }

    /*
     * Initializes the retrieve object.
     *   Returns - Promise: Resolves when done initializing.
     */
    init() {
        // Read state from file or initialize with trackedUsers dictionary & last mention data
        return this.dataHandler.readState().then((state) => {
            if (state === null) {
                this.state = {
                    trackedUsers: {}, // Dictionary with key & value: userID (int) : LastTweetIDProcessed (int)
                    lastMention: 0    // Last mention (tweet ID) that was processed
                };
            } else {
                this.state = state;
            }
        }).catch((error) => {
            this.utils.logError("I/O: FATAL: Failed to read existing state.");
            this.utils.logError("I/O: FATAL:   Error: " + error);
            this.utils.logError("I/O: FATAL: Exiting..");
            process.exit(1);
        });
    }

    /*
     * Retrieves new mentions of the bot, and saves the current state if needed.
     *   Returns - Promise: Resolves w/ any new mentions.
     */
    retrieveMentions() {
        const mentionData = {};

        // Retrieve since last mention or last 200
        if (this.state.lastMention !== 0) {
            mentionData.since_id = this.state.lastMention;
        } else {
            mentionData.count = 200;
        }

        return new Promise((resolve, reject) => {
            this.twitterHandler.getMentions(mentionData).then((mentions) => {
                if (mentions.length > 0) {
                    this.state.lastMention = mentions[0].id_str;
                    this.dataHandler.saveState(this.state).then(() => {
                        this.utils.log("I/O: Saved bot state to file");
                    }, (error) => {
                        this.utils.logError("I/O: Failed to save bot state to file");
                        this.utils.logError("I/O:    Error code: " +  error.code);
                    });
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
        const tweetRetrievals = [];

        // Retrieve a list of users that the bot is following
        return new Promise((resolve, reject) => {
            this.twitterHandler.getFollowing(this.dataHandler.ownID).then((following) => {
                this.updateTrackList(following.ids);

                // Process any new tweets that users have made
                for (let userID in this.state.trackedUsers) {
                    const lastTweetID = this.state.trackedUsers[userID];
                    const requestData = {
                        user_id: userID,
                        count: 200
                    };

                    // If the user has been processed before
                    if (lastTweetID !== 0) {
                        this.utils.log("Retrieving new tweets from user with ID: '" + requestData.user_id + "'");

                        requestData.since_id = lastTweetID;
                        tweetRetrievals.push(
                            new Promise((resolve) => {
                                this.retrieveForExisting(requestData, resolve);
                            })
                        );

                    // If the user has NOT been processed before
                    } else {
                        this.utils.log("New user with ID: '" + requestData.user_id + "' added");
                        this.utils.log("    Retrieving most recent " + this.TWEETS_TO_TRACK + " tweets");

                        // Retrieve defined number of tweets if less than 200
                        requestData.count = this.TWEETS_TO_TRACK >= 200 ? 200 : this.TWEETS_TO_TRACK;
                        tweetRetrievals.push(
                            new Promise((resolve) => {
                                this.retrieveForNew(requestData, this.TWEETS_TO_TRACK, resolve);
                            })
                        );
                    }
                }

                // When all retrievals are finished, process the tweets & save trackedUsers to file
                Promise.all(tweetRetrievals).then((retrievals) => {
                    const tweets = [];
                    let updateState = false;

                    for (let tweetRetrieval of retrievals) {
                        tweets.push(...tweetRetrieval.tweets);

                        // Set update state flag
                        if (tweetRetrieval.totalRetrieved > 0) {
                            updateState = true;
                        }
                    }

                    // Update state if needed
                    if (updateState) {
                        this.dataHandler.saveState(this.state).then(() => {
                            this.utils.log("I/O: Saved bot state to file");
                        }, (error) => {
                            this.utils.logError("I/O: Failed to save bot state to file");
                            this.utils.logError("I/O:    Error code: " +  error.code);
                        });
                    }

                    resolve(tweets);
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

            if (!(user in this.state.trackedUsers)) {
                this.state.trackedUsers[user] = 0;
            }
        }

        // Remove any trackedUsers that the bot is no longer following
        for (let userID in this.state.trackedUsers) {
            if (!this.utils.isInArray(following, userID)) {
                delete this.state.trackedUsers[userID];
            }
        }
    }

    /*
     * Retrieves new tweets from a user and adds tweets to tweetsToProcess.
     *   userData             - Object:   User information to retrieve tweets from.
     *   resolve              - Function: Function to call when done retrieving tweets to resolve promise.
     *   tweetsToProcess      - Array:    Used by recursive call, do not specify in initial call.
     *   tweetsRetrievedTotal - Int:      Used by recursive call, do not specify in initial call.
     */
    retrieveForExisting(userData, resolve, tweetsToProcess, tweetsRetrievedTotal) {
        this.twitterHandler.getTweets(userData).then((tweets) => {
            const tweetsRetrieved = tweets.length;

            // Initialize recursive variables
            if (tweetsToProcess === undefined) {
                tweetsToProcess = [];
            }
            if (tweetsRetrievedTotal === undefined) {
                tweetsRetrievedTotal = 0;
            }

            tweetsRetrievedTotal += tweetsRetrieved;

            this.utils.log("    Retrieved " + tweetsRetrieved + " tweets");

            if (tweetsRetrieved > 0) {
                // Add tweets to processing list
                for (let i = 0; i < tweets.length; i++) {
                    let tweet = tweets[i];

                    // Do not include retweets
                    if (!tweet.hasOwnProperty("retweeted_status")) {
                        tweetsToProcess.push(tweet);
                    }
                }

                // Save most recent tweet ID
                this.state.trackedUsers[userData.user_id] = tweets[0].id_str;

                userData.since_id = tweets[0].id_str;
                this.retrieveForExisting(userData, resolve, tweetsToProcess, tweetsRetrievedTotal);

            // Reached end of tweets
            } else {
                this.utils.log("    Finished retrieving tweets");

                resolve({
                    tweets: tweetsToProcess,
                    totalRetrieved: tweetsRetrievedTotal
                });
            }
        });
    }

    /*
     * Retrieves new tweets from a user and adds tweets to tweetsToProcess.
     *   userData        - Object:   User information to retrieve tweets from.
     *   numOfTweets     - Int:      Numer of tweets to retrieve.
     *   resolve         - Function: Function to call when done retrieving tweets to resolve promise.
     *   tweetsToProcess - Array:    Used by recursive call, do not specify in initial call.
     */
    retrieveForNew(userData, numOfTweets, resolve, tweetsToProcess) {
        this.twitterHandler.getTweets(userData).then((tweets) => {
            const tweetsRetrieved = tweets.length;
            numOfTweets -= tweetsRetrieved;
            const tweetsRetrievedTotal = this.TWEETS_TO_TRACK - numOfTweets;

            // Initialize recursive variables
            if (tweetsToProcess === undefined) {
                tweetsToProcess = [];
            }

            this.utils.log("    Retrieved " + tweetsRetrievedTotal + "/" + this.TWEETS_TO_TRACK + " tweets");

            // If it is the first time calling the method (in which max_id would not be set)
            if (!userData.max_id && tweets.length > 0) {
                // Save most recent tweet ID
                this.state.trackedUsers[userData.user_id] = tweets[0].id_str;
            }

            // If oldest ID from the call is the same as the last (ie one tweet).
            if (userData.max_id === tweets[tweets.length - 1].id_str && userData.count > 1) {
                this.utils.log("    Reached max tweet retrieval limit.");
                this.utils.log("    Finished retrieving tweets");

                resolve({
                    tweets: tweetsToProcess,
                    totalRetrieved: tweetsRetrievedTotal
                });

                return;
            }

            // Add tweets to processing list (Exclude final tweet as it will be used in next method call)
            for (let i = 0; i < tweets.length - 1; i++) {
                let tweet = tweets[i];

                // Do not include retweets.
                if (!tweet.hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweet);
                }
            }

            if (numOfTweets > 0) {
                // Continue processing the rest of the tweets
                userData.max_id = tweets[tweets.length - 1].id_str;

                // Avoid retrieving unneeded tweets
                if (numOfTweets < 200) {
                    userData.count = numOfTweets;
                }

                this.retrieveForNew(userData, numOfTweets, resolve, tweetsToProcess);
            } else {
                // Add the last tweet if no other retrievals are being done
                if (!tweets[tweetsRetrieved - 1].hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweets[tweetsRetrieved - 1]);
                }

                this.utils.log("    Finished retrieving tweets");

                resolve({
                    tweets: tweetsToProcess,
                    totalRetrieved: tweetsRetrievedTotal
                });
            }
        });
    }

};
