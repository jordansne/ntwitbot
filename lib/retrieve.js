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

/**
 * Data retriever class. Retrieves and pre-processes data from Twitter.
 */
module.exports = class Retrieve {

    /**
     * Intialize the class.
     * After instantiating, call init().
     * @param {Twitter} twitterHandler - The Twitter API object for making API calls.
     * @param {Data} dataHandler - The data object for reading & writing to storage.
     * @param {Util} utils - The utilities object needed for logging, etc.
     */
    constructor(twitterHandler, dataHandler, utils) {
        this.twitterHandler = twitterHandler;
        this.dataHandler = dataHandler;
        this.utils = utils;

        this.TWEETS_TO_TRACK = 3000;
    }

    /**
     * Initializes the retrieve object.
     * @return {Promise} Resolves when done initializing and reading state from storage.
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
        });
    }

    /**
     * Retrieves new mentions of the bot, and saves the current state if needed.
     * @return {Promise} Resolves with any new mentions of the bot.
     */
    retrieveMentions() {
        const mentionData = {};

        // Retrieve since last mention or last 200
        if (this.state.lastMention !== 0) {
            mentionData.since_id = this.state.lastMention;
        } else {
            mentionData.count = 200;
        }

        return this.twitterHandler.getMentions(mentionData).then((mentions) => {
            if (mentions.length > 0) {
                this.state.lastMention = mentions[0].id_str;
                this.dataHandler.saveState(this.state).then(() => {
                    this.utils.log("I/O: Saved bot state to file");
                }, (error) => {
                    this.utils.logError("I/O: Failed to save bot state to file");
                    this.utils.logError("I/O:    Error code: " +  error.code);
                });
            }

            return mentions;
        });
    }

    /**
     * Retrieves and processed new tweets of tracked users.
     * @return {Promise} Resolves with the new tweets.
     */
    retrieveTweets() {
        const tweetRetrievals = [];

        // Retrieve a list of users that the bot is following
        return this.twitterHandler.getFollowing(this.dataHandler.ownID).then((following) => {
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
                    tweetRetrievals.push(this.retrieveForExisting(requestData));

                // If the user has NOT been processed before
                } else {
                    this.utils.log("New user with ID: '" + requestData.user_id + "' added");
                    this.utils.log("    Retrieving most recent " + this.TWEETS_TO_TRACK + " tweets");

                    // Retrieve defined number of tweets if less than 200
                    requestData.count = this.TWEETS_TO_TRACK >= 200 ? 200 : this.TWEETS_TO_TRACK;
                    tweetRetrievals.push(this.retrieveForNew(requestData, this.TWEETS_TO_TRACK));
                }
            }

            // Wait until all retrievals are done
            return Promise.all(tweetRetrievals);

        // Process tweets & save trackedUsers to file
        }).then((retrievals) => {
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

            return tweets;
        });
    }

    /**
     * Updates the currently tracked users with the current list of followed users.
     * @private
     * @param {Array} following - Users that the bot is currently following.
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

    /**
     * Retrieves new tweets from an existing user.
     * @private
     * @param {Object} userData - The request data to retrieve tweets with.
     * @return {Promise} Resolves with an object (The tweet data and total number of tweets retrieved).
     */
    retrieveForExisting(userData, tweetsToProcess, tweetsRetrievedTotal) {
        return this.twitterHandler.getTweets(userData).then((tweets) => {
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

                return {
                    done: false,
                    userData: userData,
                    tweetsToProcess: tweetsToProcess,
                    tweetsRetrievedTotal: tweetsRetrievedTotal
                };

            // Reached end of tweets
            } else {
                this.utils.log("    Finished retrieving tweets");

                // Done retrieving
                return {
                    done: true,
                    tweets: tweetsToProcess,
                    totalRetrieved: tweetsRetrievedTotal
                };
            }
        }).then((next) => {
            if (!next.done) {
                return this.retrieveForExisting(next.userData, next.tweetsToProcess, next.tweetsRetrievedTotal);
            } else {
                delete next.done;
                return next;
            }
        });
    }

    /**
     * Retrieves new tweets from a newly added user.
     * @private
     * @param {Object} userData The request data to retrieve tweets with.
     * @param {int} numOfTweets - The total number of tweets to retrieve.
     * @return {Promise} Resolves with an object (The tweet data and total number of tweets retrieved).
     */
    retrieveForNew(userData, numOfTweets, tweetsToProcess) {
        return this.twitterHandler.getTweets(userData).then((tweets) => {
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

                // Done processing
                return {
                    done: true,
                    tweets: tweetsToProcess,
                    totalRetrieved: tweetsRetrievedTotal
                };
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

                return {
                    done: false,
                    userData: userData,
                    numOfTweets: numOfTweets,
                    tweetsToProcess: tweetsToProcess
                };
            } else {
                // Add the last tweet if no other retrievals are being done
                if (!tweets[tweetsRetrieved - 1].hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweets[tweetsRetrieved - 1]);
                }

                this.utils.log("    Finished retrieving tweets");

                return {
                    done: true,
                    tweets: tweetsToProcess,
                    totalRetrieved: tweetsRetrievedTotal
                };
            }
        }).then((next) => {
            if (!next.done) {
                return this.retrieveForNew(next.userData, next.numOfTweets, next.tweetsToProcess);
            } else {
                delete next.done;
                return next;
            }
        });
    }

};
