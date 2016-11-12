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

        // Flags set to true when file update is needed
        this.updateTweets = false;
        this.updateStatus = false;

        /* Holds trackedUsers dictionary & last mention data. Used for easier file saving. */
        this.botStatus = this.dataHandler.readStatus();

        // If the result was null (ie no saved bot status)..
        if (this.botStatus === null) {
            this.botStatus = {
                /* Dictionary with key & value: userID (int) : LastTweetIDProcessed' (int) */
                trackedUsers:  {},

                /* Last mention that was processed. */
                lastMention: 0
            };
        }
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
        console.log("[INFO] Update: Running update [", this.dataHandler.getTime(), "]..");

        // Reset update flags
        this.updateTweets = false;
        this.updateStatus = false;

        this.checkMentions();
        this.checkTrackedTweets();
    }

    /*
     * Retrieves and processed mentions of the bot.
     */
    checkMentions() {
        const mentionData = {};

        // If the mention tweets have been processed before..
        if (this.botStatus.lastMention !== 0) {
            mentionData.since_id = this.botStatus.lastMention;
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

            if (mentions.length > 0) {
                console.log("[INFO] Update: %d new mentions found", mentions.length);

                for (let i = 0; i < mentions.length; i++) {
                    this.actionHandler.handleMention(mentions[i]);
                }

                this.updateStatus = true;
            } else {
                console.log("[INFO] Update: No new mentions found");
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
                if (!(user in this.botStatus.trackedUsers)) {
                    this.botStatus.trackedUsers[user] = 0;
                }
            }

            // Check for users that the bot is no longer following
            for (let userID in this.botStatus.trackedUsers) {
                // Check if userID exists in currentTrackedUsers, if it does not,
                // remove them from trackedUsers.
                if (!(currentTrackedUsers.indexOf(userID) > -1)) {
                    delete this.botStatus.trackedUsers[userID];
                }
            }

            // Process any new tweets that users have made
            for (let userID in this.botStatus.trackedUsers) {
                const lastTweetID = this.botStatus.trackedUsers[userID];
                const userData = {
                    user_id: userID,
                    include_rts: false,
                    count: 200
                };

                // If the user's tweet have been processed before..
                if (lastTweetID !== 0) {
                    userData.since_id = lastTweetID;

                    console.log("[INFO] Update: Retrieving new tweets from: '%s'", userData.user_id);

                    tweetRetrievals.push(
                        new Promise(
                            (resolve) => this.retrieveTweetsSince(userData, tweetsToProcess, resolve),
                            (reject)  => console.log("[ERROR] Update: Failed to retrieve new tweets (PROMISE REJECTED)")
                        )
                    );

                // If the user has never been processed..
                } else {
                    // Only retrieve needed tweet number
                    userData.count = this.TWEETS_TO_TRACK >= 200 ? 200 : this.TWEETS_TO_TRACK;

                    console.log("[INFO] Update: New user: '%s' added", userData.user_id);
                    console.log("[INFO] Update:     Retrieving most recent %d tweets", this.TWEETS_TO_TRACK);

                    tweetRetrievals.push(
                        new Promise(
                            (resolve) => this.retrieveTweetsNew(userData, tweetsToProcess, this.TWEETS_TO_TRACK, resolve),
                            (reject)  => console.log("[ERROR] Update: Failed to retrieve recent tweets (PROMISE REJECTED)")
                        )
                    );
                }
            }

            // Process the tweets & save trackedUsers to file when all retrievals are finished
            Promise.all(tweetRetrievals).then(() => {
                if (this.updateTweets) {
                    this.dataHandler.processTrackedTweets(tweetsToProcess);
                }
                if (this.updateTweets || this.updateStatus) {
                    this.dataHandler.saveStatus(this.botStatus);
                }
            });
        });
    }

    /* Retrieves new tweets from a user and adds tweets to tweetsToProcess. */
    retrieveTweetsSince(userData, tweetsToProcess, setDone) {
        this.twitterPkg.get('statuses/user_timeline', userData, (error, tweets, response) => {
            if (error) {
                console.error("[ERROR] Update: Failed to retrieve tweets from user: %d", userData.user_id);
                console.error("[ERROR] Update:     Error message: %s", error[0].message);
                return;
            }

            if (tweets.length <= 200 && tweets.length > 0) {
                // Add tweets to processing list
                for (let i = 0; i < tweets.length; i++) {
                    let tweet = tweets[i];

                    // Do not include retweets.
                    if (!tweet.retweetedStatus) {
                        tweetsToProcess.push(tweets[i]);
                    }
                }

                // Save the most recent tweet ID in case the final batch adds to 200 perfectly and ..
                this.botStatus.trackedUsers[userData.user_id] = tweets[0].id_str;
                // .. and set the update flag for the same reason.
                this.updateTweets = true;

                // Continue processing the rest of the tweets
                userData.since_id = tweets[0].id_str;
                this.retrieveTweetsSince(userData, tweetsToProcess, setDone);

            // Reached end of tweets
            } else {
                setDone();
            }
        });
    }

    /* Retrieves new tweets from a user and adds tweets to tweetsToProcess. */
    retrieveTweetsNew(userData, tweetsToProcess, tweetsRemaining, setDone) {
        this.twitterPkg.get('statuses/user_timeline', userData, (error, tweets, response) => {
            if (error) {
                console.error("[ERROR] Update: Failed to retrieve tweets from user: %d", userData.user_id);
                console.error("[ERROR] Update:     Error message: %s", error[0]);
                return;
            }

            // If it is the first time calling the method (in which max_id would not be set)
            if (!userData.max_id && tweets.length > 0) {
                // Set the most recent tweet as last
                this.botStatus.trackedUsers[userData.user_id] = tweets[0].id_str;
            }

            if (tweets.length <= 200 && tweets.length > 0) {
                let tweetsAdded = 0;

                // Add tweets to processing list
                // Exclude final tweet as it will be used in next method iteration
                for (let i = 0; i < tweets.length; i++) {
                    let tweet = tweets[i];

                    // Do not include retweets.
                    if (!tweet.retweetedStatus) {
                        tweetsToProcess.push(tweets[i]);
                        tweetsAdded++;
                    }
                }

                if (tweetsAdded > 0) {
                    this.updateTweets = true;
                }

                tweetsRemaining -= tweetsAdded;

                if (tweetsRemaining > 0) {
                    // Continue processing the rest of the tweets
                    userData.max_id = tweets[tweets.length - 1].id_str;

                    // Avoid retrieving unneeded tweets
                    if (tweetsRemaining < 200) {
                        userData.count = tweetsRemaining;
                    }

                    this.retrieveTweetsNew(userData, tweetsToProcess, tweetsRemaining, setDone);
                } else {
                    setDone();
                }

            // Reached end of tweets
            } else {
                setDone();
            }
        });
    }

};
