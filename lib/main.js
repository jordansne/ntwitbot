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
      Retrieve      = require('./retrieve.js'),
      Twitter       = require('./twitter.js'),
      Util          = require('./util.js');

module.exports = class Main {

    constructor() {
        this.utils = new Util();
        this.utils.log("Starting NTwitBot " + process.env.npm_package_version + "..");

        this.dataHandler = new Data(this.utils);
        this.generator = new Generate(this.dataHandler, this.utils);

        this.loadConfig().then(() => {
            this.twitterHandler = new Twitter(this.twitterAPI, this.utils);
            this.retriever = new Retrieve(this.twitterHandler, this.dataHandler, this.generator, this.utils);

            this.start();
        });

        this.TWEET_INTERVAL = 15/*min*/ * 60/*s*/ * 1000/*ms*/;
    }

    /*
     * Loads and verifies configuration data.
     *   Returns - Promise: Resolves when complete.
     */
    loadConfig() {
        return new Promise((resolve, reject) => {
            // Read secret data from file
            this.utils.readJSONFromFile('./config/secret.json').then((secretData) => {
                if (secretData === null) {
                    throw new Error("No secret data provided.");
                }

                this.twitterAPI = new TwitterModule(secretData);
                return this.verifySecret(this.twitterAPI);

            // Verify the secret data with twitter's API
            }).then((userID) => {
                this.userID = userID;
                this.utils.log("Verified Bot credentials, User ID is: " + this.userID);

                return this.utils.readJSONFromFile('./config/setup.json');

            // Read setup data from file
            }).then((setupData) => {
                if (setupData === null) {
                    throw new Error("No setup data provided.");
                }

                this.utils.setDebug(setupData.debug);
                resolve();

            }).catch((error) => {
                this.utils.logError("FATAL: Failed to read or verify app configuration data");
                this.utils.logError("FATAL:     Error message: " + error.message);
                this.utils.logError("FATAL: Exiting..");

                process.exit(1);
            });
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

        // Reset update flags
        this.updateTweets = false;
        this.updateStatus = false;

        // Process any new tweets before performing other operations
        this.retriever.checkTrackedTweets().then((newStatusTweets) => {
            // Process any mentions
            this.retriever.checkMentions().then((newStatusMentions) => {
                // Save the status file if needed
                if (newStatusMentions !== null) {
                    this.dataHandler.saveStatus(newStatusMentions);
                } else if (newStatusTweets !== null) {
                    this.dataHandler.saveStatus(newStatusTweets);
                }
            });

            // Post a normal tweet
            this.twitterHandler.postTweet(this.generator.generateResponse());
        });
    }
};
