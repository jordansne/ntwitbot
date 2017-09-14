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

module.exports = class Main {

    constructor() {
        this.utils = new Util();
        this.utils.log("Starting NTwitBot " + process.env.npm_package_version + "..");

        this.dataHandler = new Data(this.utils);

        this.dataHandler.setup().then(() => {
            this.processor = new Process(this.dataHandler, this.utils);
            this.generator = new Generate(this.dataHandler, this.utils);

            return this.loadConfig();
        }).then(() => {
            this.twitterHandler = new Twitter(this.twitterAPI, this.utils);
            this.retriever = new Retrieve(this.twitterHandler, this.dataHandler, this.generator, this.utils);

            return this.retriever.init();
        }).then(() => {
            this.start();
        }, (error) => {
            this.utils.logError("I/O: FATAL: Failed to initialize bot.");
            this.utils.logError("I/O: FATAL:   Error: " + error);
            this.utils.logError("I/O: FATAL: Exiting..");
            process.exit(1);
        });

        this.TWEET_INTERVAL = 15/*min*/ * 60/*s*/ * 1000/*ms*/;
    }

    /*
     * Loads and verifies configuration data.
     *   Returns - Promise: Resolves when complete.
     */
    loadConfig() {
        // TODO Add error handling
        this.twitterAPI = new TwitterModule(secretData);
        this.utils.setDebug(setupData.debug);

        return this.verifySecret(this.twitterAPI).then((userID) => {
            this.userID = userID;
            this.utils.log("Verified Bot credentials, User ID is: " + this.userID);

        }, (error) => {
            this.utils.logError("FATAL: Failed to read or verify app configuration data");
            this.utils.logError("FATAL:     Error message: " + error.message);
            this.utils.logError("FATAL: Exiting..");

            process.exit(1);
        });
    }

    /*
     * Verifies secret data with Twitter's API.
     *   twitterAPI - Object:  Twitter API module.
     *   Returns    - Promise: Resolves with the bot's user ID.
     */
    verifySecret(twitterAPI) {
        const userData = {
            include_entities: false,
            skip_status: true
        };

        return new Promise((resolve, reject) => {
            twitterAPI.get('account/verify_credentials', userData, (error, account, response) => {
                if (error) {
                    if (error.code === 32) {
                        this.utils.logError("FATAL: Incorrect secret data provided, please edit ./config/secret.json");
                    }

                    reject(error);
                }

                resolve(account.id_str);
            });
        });
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
        }, this.TWEET_INTERVAL);
    }

    /*
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
            this.generator.generateTweet((tweet) => {
                this.twitterHandler.postTweet(tweet);
            });
        });
    }

    /*
     * Handles any new tweets from followed users.
     *   Returns - Promise: Resolves when complete.
     */
    handleTweets() {
        return new Promise((resolve, reject) => {
            this.retriever.retrieveTweets().then((newTweets) => {
                this.processor.processTweets(newTweets).then(() => {
                    resolve();
                });
            });
        });
    }

    /*
     * Handles any new mentions of the bot.
     */
    handleMentions() {
        this.retriever.retrieveMentions().then((mentions) => {
            this.utils.log(mentions.length + " new mentions found");

            if (mentions.length > 0) {
                for (let i = 0; i < mentions.length; i++) {
                    const mention = mentions[i];

                    this.generator.generateTweet().then((tweet) => {
                        this.twitterHandler.postTweet(tweet, mention.id_str, mention.user.screen_name);
                    });
                }
            }
        });
    }

};
