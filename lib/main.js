/*
 * NTwitBot - main.js
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

const timers        = require('timers');

const Data          = require('./data.js'),
      Generate      = require('./generate.js'),
      Process       = require('./process.js'),
      Retrieve      = require('./retrieve.js'),
      Twitter       = require('./twitter.js'),
      Util          = require('./util.js');

const secretData    = require('../config/secret'),
      setupData     = require('../config/setup');

/**
 * Primary class of the bot. Handles all primary functions.
 */
module.exports = class Main {

    /**
     * Initialize, setup and start the bot.
     */
    constructor() {
        this.TWEET_INTERVAL = 15 /*min*/ * 60 /*s*/ * 1000 /*ms*/;

        this.utils = new Util();
        this.utils.log("Starting NTwitBot " + process.env.npm_package_version + "..");
        this.utils.setDebug(setupData.debug);

        this.dataHandler    = new Data(this.utils);
        this.processor      = new Process(this.utils);
        this.generator      = new Generate(this.utils);
        this.twitterHandler = new Twitter(secretData, this.utils);
        this.retriever      = new Retrieve(this.twitterHandler, this.utils);

        this.twitterHandler.verify().then((userID) => {
            this.utils.log("Verified Bot credentials, User ID is: " + userID);

            return this.initState();
        }).then(() => {
            return this.dataHandler.createDataDir();
        }).catch((error) => {
            this.utils.logError("FATAL: Failed to initialize bot");
            this.utils.logError("FATAL:     " + error.stack);
            this.utils.logError("FATAL: Exiting..");
            process.exit(1);
        }).then(() => {
            this.start();
        });
    }

    /**
     * Initializes the bot's state object.
     * @return {Promise} Resolves when done retrieving or setting up the state in memory.
     */
    initState() {
        this.dataHandler.readState().then((state) => {
            if (state === null) {
                this.state = {
                    trackedUsers: {}, // String dictionary with format 'userID : lastTweetID'
                    lastMention: 0    // Tweet ID of Last mention
                };
            } else {
                this.state = state;
            }
        });
    }

    /**
     * Starts the event handler.
     */
    start() {
        this.runUpdate();

        timers.setInterval(() => {
            this.runUpdate();
        }, this.TWEET_INTERVAL);
    }

    /**
     * Scheduled 15 min interval bot update.
     */
    runUpdate() {
        this.utils.log("");
        this.utils.log("******************* Running update ******************* ");
        this.utils.log("");

        this.handleTweets().then((newTweets) => {

            this.handleMentions().then((newMentions) => {
                if (newTweets || newMentions) {
                    return this.dataHandler.saveState(this.state);
                }

            }).catch((error) => {
                this.utils.logError("Failed to handle new mentions");
                this.utils.logError("    " + error.stack);
                this.utils.logError("Skipping mentions until next update");
            });

            this.sendTweet();
        });
    }

    /**
     * Handles any new tweets from tracked users. Terminates bot upon save failure.
     * @return {Promise} Resolves with a boolean if new tweets were retrievd when done processing.
     */
    handleTweets() {
        return this.updateTracked().then(() => {
            return this.retriever.retrieveTweets(this.state.trackedUsers);

        }).then((retrievals) => {
            const tweets = [];
            let updateState = false;

            for (const retrieval of retrievals) {
                if (retrieval.length > 0) {
                    const firstTweet = retrieval[0];
                    this.state.trackedUsers[firstTweet.user.id_str] = firstTweet.id_str;
                    updateState = true;

                    // Don't process retweets
                    for (const tweet of retrieval) {
                        if (!tweet.hasOwnProperty("retweeted_status")) {
                            tweets.push(tweet);
                        }
                    }
                }
            }

            if (tweets.length > 0) {
                this.utils.log("Retrieved tweets: " + tweets.length + " tweets to process");
                return this.dataHandler.saveTweetData(this.processor.processTweets(tweets));
            } else {
                this.utils.log("Retrieved tweets: No tweets to process");

                if (!updateState) {
                    return Promise.reject();
                }
            }
        }, (error) => {
            this.utils.logError("Failed to retrieve new tweets");
            this.utils.logError("    " + error.stack);
            this.utils.logError("Skipping tweet retrievals until next update");

        }).then(() => {
            return true;
        }, (error) => {
            if (error) {
                this.utils.logError("FATAL: Failed to save tweet data in database");
                this.utils.logError("FATAL:     " + error.stack);
                this.utils.logError("FATAL: Exiting..");
                process.exit(1);
            }

            return false;
        });
    }

    /**
     * Updates the currently tracked users with the bot's following list.
     * @return {Promise} Resolves when done updating.
     */
    updateTracked() {
        return this.twitterHandler.getFollowing().then((following) => {
            const ids = following.ids;

            // Add any new follows to the trackedUsers list
            for (const user of ids) {
                if (!(user in this.state.trackedUsers)) {
                    this.state.trackedUsers[user] = 0;
                }
            }

            // Remove any trackedUsers that the bot is no longer following
            for (const user in this.state.trackedUsers) {
                if (!this.utils.isInArray(ids, user)) {
                    delete this.state.trackedUsers[user];
                }
            }
        });
    }

    /**
     * Handles any new mentions of the bot.
     * @return {Promise} Resolves with a boolean if new mentions were found when done retrieving and handling metions.
     */
    handleMentions() {
        return this.retriever.retrieveMentions(this.state.lastMention).then((mentions) => {
            const tweetsToSend = [];

            if (mentions.length > 0) {
                this.utils.log("Retrieved mentions: " + mentions.length + " new tweets found");

                for (const mention of mentions) {
                    tweetsToSend.push({
                        replyToID: mention.id_str,
                        replyToName: mention.user.screen_name
                    });
                }

                this.state.lastMention = mentions[0].id_str;
                return tweetsToSend;
            } else {
                this.utils.log("Retrieved mentions: No new tweets found");
                return Promise.reject();
            }
        }, (error) => {
            this.utils.logError("Failed to retrieve new mentions");
            this.utils.logError("    " + error.stack);
            this.utils.logError("Skipping mention checks until next update");

        }).then((tweetsToSend) => {
            // Send tweets
            for (const tweet of tweetsToSend) {
                this.sendTweet(tweet.replyToID, tweet.replyToName);
            }

            return true;
        }, (error) => {
            return false;
        });
    }

    /**
     * Generate and sends a tweet. Terminates bot upon database failure.
     * @param {string} [replyID] The ID of the user to reply to.
     * @param {string} [replyUser] The username of the user to reply to.
     * @return {Promise} Resolves when complete (successful or not)
     */
    sendTweet(replyID, replyUser) {
        return this.dataHandler.readTweetData().then((data) => {
            const tweet = this.generator.generateTweet(data);

            return this.twitterHandler.postTweet(tweet, replyID, replyUser).then(() => {
                this.utils.log("Generated & sent tweet: " + tweet);
            }, (error) => {
                this.utils.logError("Failed to send tweet: Posting tweet");
                this.utils.logError("    " + error.stack);
                this.utils.logError("Skipping tweet");
                // TODO Determine if retryable and retry/exit depending on result
            });

        }, (error) => {
            this.utils.logError("FATAL: Failed to send tweet: Database error");
            this.utils.logError("FATAL:     " + error.stack);
            this.utils.logError("FATAL: Exiting..");
            process.exit(1);
        });
    }

};
