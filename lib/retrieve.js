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
     * Initialize the class.
     * @param {Twitter} twitterHandler - The Twitter API object for making API calls.
     * @param {Util} utils - The utilities object needed for logging, etc.
     */
    constructor(twitterHandler, utils) {
        this.twitterHandler = twitterHandler;
        this.utils = utils;

        this.TWEETS_TO_TRACK = 3000;
    }

    /**
     * Retrieves new mentions of the bot, and saves the current state if needed.
     * @param {string} lastID - The last mention that was received.
     * @return {Promise} Resolves with any new mentions of the bot.
     */
    retrieveMentions(lastID) {
        const mentionData = {};

        // Retrieve since last mention or last 200
        if (lastID !== 0) {
            mentionData.since_id = lastID;
        } else {
            mentionData.count = 200;
        }

        return this.twitterHandler.getMentions(mentionData).then((mentions) => {
            return mentions;
        });
    }

    /**
     * Retrieves and processed new tweets of tracked users.
     * @param {Dictionary} trackedUsers - The tracked users data from the state.
     * @return {Promise} Resolves with the new tweets.
     */
    retrieveTweets(trackedUsers) {
        const tweetRetrievals = [];

        for (const userID in trackedUsers) {
            const lastTweetID = trackedUsers[userID];
            const requestData = {
                user_id: userID,
                trim_user: true
            };

            // If the user has been processed before
            if (lastTweetID !== 0) {
                requestData.count = 200;
                requestData.since_id = lastTweetID;
                tweetRetrievals.push(this.retrieveForExisting(requestData));
            // .. or the user has NOT been processed before
            } else {
                tweetRetrievals.push(this.retrieveForNew(requestData));
            }
        }

        // Wait until all retrievals are done
        return Promise.all(tweetRetrievals);
    }

    /**
     * Retrieves new tweets from an existing user. Only specify one argument.
     * @private
     * @param {Object} requestData - The request data to retrieve tweets with.
     * @return {Array} Resolves with an array of tweets.
     */
    retrieveForExisting(requestData, tweetsRetrieved) {
        const firstReq = !requestData.hasOwnProperty('max_id');

        // Initialize recursive variables
        if (firstReq) {
            tweetsRetrieved = [];
            this.utils.log("Retrieving most recent tweets from user with ID: '" + requestData.user_id + "'");
        }

        return this.twitterHandler.getTweets(requestData).then((tweets) => {
            // Do not count the last tweet as it might be the first tweet of the next request
            const numRetrieved = tweets.length - 1;

            if (tweets.length === 0) {
                this.utils.log("    No new tweets found");

                return {
                    done: true,
                    tweets: tweetsRetrieved,
                    totalRetrieved: 0
                };
            }

            // If the max ID from the request is the oldest tweet in the request (i.e. only one tweet returned)
            // or only one tweet was found on the first request..
            if (requestData.max_id === tweets[tweets.length - 1].id_str || firstReq && tweets.length === 1) {
                tweetsRetrieved.push(tweets[0]);

                this.utils.log("    Retrieved 1 tweet");
                this.utils.log("    Finished retrieving " + tweetsRetrieved.length + " tweets");

                return {
                    done: true,
                    tweets: tweetsRetrieved
                };
            }

            for (let i = 0; i < numRetrieved; i++) {
                tweetsRetrieved.push(tweets[i]);
            }

            this.utils.log("    Retrieved " + numRetrieved + " tweets");

            // Set the max ID of the next request to the oldest tweet in the previous request
            requestData.max_id = tweets[tweets.length - 1].id_str;

            return {
                done: false,
                requestData: requestData,
                tweetsRetrieved: tweetsRetrieved
            };
        }).then((next) => {
            if (!next.done) {
                return this.retrieveForExisting(next.requestData, next.tweetsRetrieved);
            } else {
                return next.tweets;
            }
        });
    }

    /**
     * Retrieves new tweets from a newly added user. Only specify one argument.
     * @private
     * @param {Object} requestData The request data to retrieve tweets with.
     * @return {Promise} Resolves with an object (The tweet data and total number of tweets retrieved).
     */
    retrieveForNew(requestData, tweetsLeft, tweetsRetrieved) {
        // If first request..
        if (!requestData.hasOwnProperty('count')) {
            requestData.count = this.TWEETS_TO_TRACK >= 200 ? 200 : this.TWEETS_TO_TRACK;
            tweetsLeft = this.TWEETS_TO_TRACK;
            tweetsRetrieved = [];

            this.utils.log("New user with ID: '" + requestData.user_id + "' added");
            this.utils.log("    Retrieving most recent " + this.TWEETS_TO_TRACK + " tweets");
        }

        return this.twitterHandler.getTweets(requestData).then((tweets) => {
            const numRetrieved = tweets.length - 1;
            tweetsLeft -= numRetrieved;

            // If the max ID from the request is the oldest tweet in the request (i.e. only one tweet returned)..
            if (requestData.max_id === tweets[tweets.length - 1].id_str) {
                tweetsRetrieved.push(tweets[0]);

                this.utils.log("    Retrieved " + tweetsRetrieved.length + "/" + this.TWEETS_TO_TRACK + " tweets");
                this.utils.log("    Finished retrieving tweets");
                if (requestData.count > 1) {
                    this.utils.log("    Reached max tweet retrieval limit.");
                }

                return {
                    done: true,
                    tweets: tweetsRetrieved
                };
            }

            for (let i = 0; i < numRetrieved; i++) {
                tweetsRetrieved.push(tweets[i]);
            }

            this.utils.log("    Retrieved " + tweetsRetrieved.length + "/" + this.TWEETS_TO_TRACK + " tweets");

            // Set newest ID for next request to oldest ID of the previous request
            requestData.max_id = tweets[tweets.length - 1].id_str;
            if (tweetsLeft < 200) {
                requestData.count = tweetsLeft;
            }

            return {
                done: false,
                requestData: requestData,
                tweetsLeft: tweetsLeft,
                tweetsRetrieved: tweetsRetrieved
            };
        }).then((next) => {
            if (!next.done) {
                return this.retrieveForNew(next.requestData, next.tweetsLeft, next.tweetsRetrieved);
            } else {
                return next.tweets;
            }
        });
    }

};
