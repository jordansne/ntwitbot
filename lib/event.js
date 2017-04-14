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

    constructor(twitterPkg, actionHandler, dataHandler, generator, utils) {
        this.twitterPkg = twitterPkg;
        this.actionHandler = actionHandler;
        this.dataHandler = dataHandler;
        this.generator = generator;
        this.utils = utils;

        this.TWEETS_TO_TRACK = 3000;

        // File-update-required flags
        this.updateTweets = false;
        this.updateStatus = false;

        // Object containing trackedUsers dictionary & last mention data
        this.botStatus = this.dataHandler.readStatus();

        // If no existing bot status
        if (this.botStatus === null) {
            this.botStatus = {
                // Dictionary with key & value: userID (int) : LastTweetIDProcessed' (int)
                trackedUsers:  {},

                // Last mention (tweet ID) that was processed
                lastMention: 0
            };
        }
    }

    /*
     * Starts the event handler. Occurs when the app has finished setup.
     */
    start() {
        // Run immediately..
        this.runUpdate();

        // .. then schedule 15 min interval
        timers.setInterval(() => {
            this.runUpdate();
        }, 900000);
    }

    /*
     * Scheduled 15 min interval bot update.
     */
    runUpdate() {
        this.utils.log("");
        this.utils.log("******************* Running update ******************* ");
        this.utils.log("");

        // Reset update flags
        this.updateTweets = false;
        this.updateStatus = false;

        this.checkMentions();

        // Process any new tweets before generating & posting one
        new Promise((resolve, reject) => {
            this.checkTrackedTweets(resolve);
        }).then(() => {
            this.actionHandler.postTweet(this.generator.generateResponse());
        });
    }

    /*
     * Retrieves and processed mentions of the bot.
     */
    checkMentions() {
        const mentionData = {};

        // Retrieve since last mention or last 200
        if (this.botStatus.lastMention !== 0) {
            mentionData.since_id = this.botStatus.lastMention;
        } else {
            mentionData.count = 200;
        }

        this.twitterPkg.get('statuses/mentions_timeline', mentionData, (error, mentions, response) => {
            if (error) {
                this.utils.logError("Failed to retrieve mentions");
                this.utils.logError("    Error: " +  error[0].message);
                return;
            }

            // Process new mentions, if there is any
            if (mentions.length > 0) {
                this.utils.log(mentions.length + " new mentions found");

                for (let i = 0; i < mentions.length; i++) {
                    this.actionHandler.handleMention(mentions[i]);
                }

                this.updateStatus = true;
            } else {
                this.utils.log("No new mentions found");
            }
        });
    }

    /*
     * Retrieves and processed new tweets of tracked users.
     *   done - Function: Function to call when done retrieving, processing & saving tweets.
     */
    checkTrackedTweets(done) {
        const tweetsToProcess = [];
        const tweetRetrievals = [];
        const data = {
            user_id: this.dataHandler.ownID,
            stringify_ids: true
        };

        // Retrieve a list of users that the bot is following
        this.twitterPkg.get('friends/ids', data, (error, result, response) => {
            if (error) {
                this.utils.logError("Failed to retrieve following list of bot");
                this.utils.logError("    Error: " + error[0].message);
                return;
            }

            const following = result.ids;

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
                        new Promise(
                            (resolve) => this.retrieveTweetsSince(userData, tweetsToProcess, resolve),
                            (reject)  => this.utils.logError("Failed to retrieve new tweets (PROMISE REJECTED)")
                        )
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
                            (resolve) => this.retrieveTweetsNew(userData, tweetsToProcess, this.TWEETS_TO_TRACK, resolve),
                            (reject)  => this.utils.logError("Failed to retrieve recent tweets (PROMISE REJECTED)")
                        )
                    );
                }
            }

            // When all retrievals are finished, process the tweets & save trackedUsers to file
            Promise.all(tweetRetrievals).then(() => {
                if (this.updateTweets) {
                    this.dataHandler.processTrackedTweets(tweetsToProcess, done);
                } else {
                    this.utils.log("No new tweets to process");
                }

                if (this.updateTweets || this.updateStatus) {
                    this.dataHandler.saveStatus(this.botStatus);
                }
            });
        });
    }

    /*
     * Retrieves new tweets from a user and adds tweets to tweetsToProcess.
     *   userData             - Object: User information to retrieve tweets from.
     *   tweetsToProcess      - Array:  To be filled with retrieved tweets.
     *   setDone              - Object: Callback function.
     *   tweetsRetrievedTotal - Used by recursive call, do not specify in initial call.
     */
    retrieveTweetsSince(userData, tweetsToProcess, setDone, tweetsRetrievedTotal) {
        this.twitterPkg.get('statuses/user_timeline', userData, (error, tweets, response) => {
            if (error) {
                this.utils.logError("Failed to retrieve tweets from user: " + userData.user_id);
                this.utils.logError("    Error: " + error[0].message);
                return;
            }

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

                // Save most recent tweet ID & set update flag
                this.botStatus.trackedUsers[userData.user_id] = tweets[0].id_str;
                this.updateTweets = true;

                userData.since_id = tweets[0].id_str;

                // Continue processing the rest of the tweets
                this.utils.log("    Retrieved " + tweetsRetrievedTotal + " tweets");
                this.retrieveTweetsSince(userData, tweetsToProcess, setDone, tweetsRetrievedTotal);

            // Reached end of tweets
            } else {
                this.utils.log("    Finished retrieving tweets");
                setDone();
            }
        });
    }

    /*
     * Retrieves new tweets from a user and adds tweets to tweetsToProcess.
     *   userData        - Object: User information to retrieve tweets from.
     *   tweetsToProcess - Array:  To be filled with retrieved tweets.
     *   numOfTweets     - Int:    Numer of tweets to retrieve.
     *   setDone         - Object: Callback function.
     */
    retrieveTweetsNew(userData, tweetsToProcess, numOfTweets, setDone) {
        this.twitterPkg.get('statuses/user_timeline', userData, (error, tweets, response) => {
            if (error) {
                this.utils.logError("Failed to retrieve tweets from user: " + userData.user_id);
                this.utils.logError("    Error: " + error[0]);
                return;
            }

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
                setDone();
                return;
            }

            let tweetsAdded = 0;

            // Add tweets to processing list
            // Exclude final tweet as it will be used in next method iteration
            for (let i = 0; i < tweets.length - 1; i++) {
                let tweet = tweets[i];

                // Do not include retweets.
                if (!tweet.hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweets[i]);
                    tweetsAdded++;
                }
            }

            if (tweetsAdded > 0) {
                this.updateTweets = true;
            }

            if (numOfTweets > 0) {
                // Continue processing the rest of the tweets
                userData.max_id = tweets[tweets.length - 1].id_str;

                // Avoid retrieving unneeded tweets
                if (numOfTweets < 200) {
                    userData.count = numOfTweets;
                }

                this.utils.log("    Retrieved " + tweetsRetrievedTotal + "/" + this.TWEETS_TO_TRACK + " tweets");
                this.retrieveTweetsNew(userData, tweetsToProcess, numOfTweets, setDone);
            } else {
                // Add the last tweet if no other retrievals are being done
                if (!tweets[tweetsRetrieved - 1].hasOwnProperty("retweeted_status")) {
                    tweetsToProcess.push(tweets[tweetsRetrieved - 1]);
                }

                this.utils.log("    Retrieved " + tweetsRetrievedTotal + "/" + this.TWEETS_TO_TRACK + " tweets");
                setDone();
            }
        });
    }

};
