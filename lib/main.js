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

const timers        = require('timers'),
      TwitterModule = require('twitter');

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

        this.dataHandler = new Data(this.utils);
        this.processor = new Process(this.utils);

        this.dataHandler.init().then(() => {
            this.generator = new Generate(this.dataHandler, this.utils);

            return this.loadConfig();
        }).then(() => {
            this.twitterHandler = new Twitter(this.twitterAPI, this.utils);
            this.retriever = new Retrieve(this.twitterHandler, this.dataHandler, this.utils);

            return this.retriever.init();
        // Catch any start up errors
        }).catch((error) => {
            this.utils.logError("FATAL: Failed to initialize bot.");
            this.utils.logError("FATAL:   Error: " + error.message);
            this.utils.logError("FATAL: Exiting..");
            process.exit(1);
        }).then(() => {
            this.start();
        });
    }

    /**
     * Loads and verifies configuration data.
     * @return {Promise} Resolves when done verifying data.
     */
    loadConfig() {
        this.twitterAPI = new TwitterModule(secretData);
        this.utils.setDebug(setupData.debug);

        return this.verifySecret(this.twitterAPI).then((userID) => {
            this.userID = userID;
            this.utils.log("Verified Bot credentials, User ID is: " + this.userID);

        }, (error) => {
            if (error.code === 32) {
                this.utils.logError("Incorrect secret data provided, please edit the secret configuration");
            } else {
                this.utils.logError("Failed to read or verify app configuration data");
            }

            throw error;
        });
    }

    /**
     * Verifies secret data with Twitter's API.
     * @param {TwitterModule} twitterAPI - The Twitter API module.
     * @return {Promise} Resolves with the bot's user ID.
     */
    verifySecret(twitterAPI) {
        const userData = {
            include_entities: false,
            skip_status: true
        };

        return new Promise((resolve, reject) => {
            twitterAPI.get('account/verify_credentials', userData, (error, account, response) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(account.id_str);
            });
        });
    }

    /**
     * Starts the event handler.
     */
    start() {
        // Run immediately..
        this.runUpdate();

        // .. then schedule 15 min interval
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

        // Process any new tweets before performing other operations
        this.handleTweets().then(() => {
            // Process any mentions
            this.handleMentions();

            // Post a normal tweet
            this.sendTweet();
        });
    }

    /**
     * Handles any new tweets from tracked users. Terminates bot upon process or save failure.
     * @return {Promise} Resolves when done retrieving, processing, and saving the tweet data.
     */
    handleTweets() {
        return this.retriever.retrieveTweets().then((newTweets) => {
            this.utils.log("Finished retrieving all new tweet data");

            if (newTweets !== null) {
                const newData = this.processor.processTweets(newTweets);
                this.utils.log("Finished processing new tweet data");

                return this.dataHandler.saveTweetData(newData);
            } else {
                return false;
            }
        }, (error) => {
            this.utils.logError("Failed to retrieve tweets");
            this.utils.logError("    Error: " + error.message);
            this.utils.logError("Skipping tweet retrievals until next update");
            error.continue = true;
            throw error;

        }).then((didSave) => {
            if (didSave) {
                this.utils.log("I/O: Finished saving new tweet data in database");
            }
        }, (error) => {
            if (!error.continue) {
                this.utils.logError("FATAL: Failed to save tweet data in database");
                this.utils.logError("FATAL:    Error: " + error.message);
                this.utils.logError("FATAL: Exiting..");
                process.exit(1);
            }
        });
    }

    /**
     * Handles any new mentions of the bot.
     */
    handleMentions() {
        this.retriever.retrieveMentions().then((mentions) => {
            if (mentions.length > 0) {
                this.utils.log(mentions.length + " new mentions found");

                for (let i = 0; i < mentions.length; i++) {
                    const mention = mentions[i];

                    this.sendTweet(mention.id_str, mention.user.screen_name);
                }
            } else {
                this.utils.log("No new mentions found");
            }
        }, (error) => {
            this.utils.logError("Failed to retrieve new mentions");
            this.utils.logError("    Error: " + error.message);
            this.utils.logError("Skipping mention checks until next update");
        });
    }

    /**
     * Generate and sends a tweet. Terminates bot upon tweet generation failure.
     * @param {string} [replyToID] The ID of the user to reply to.
     * @param {string} [replyTo] The username of the user to reply to.
     * @return {Promise} Resolves when complete (successful or not)
     */
    sendTweet(replyToID, replyTo) {
        return this.generator.generateTweet().then((tweet) => {
            return this.twitterHandler.postTweet(tweet, replyToID, replyTo);
        }, (error) => {
            this.utils.logError("FATAL: Failed to generate a tweet");
            this.utils.logError("FATAL:    Error: " + error.Error);
            this.utils.logError("FATAL: Exiting..");
            process.exit(1);

        }).then(() => {
            this.utils.log("Generated & sent tweet");
        }, (error) => {
            this.utils.logError("Failed to post tweet");
            this.utils.logError("    Error: " + error.message);
            this.utils.logError("Skipping tweet");
            // TODO Determine if retryable and retry/exit depending on result
        });
    }

};
