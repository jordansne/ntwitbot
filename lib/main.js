/*
 * NTwitBot - main.js
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

const Event   = require('./event.js'),
      Twitter = require('./twitter.js');

module.exports = class Main {

    constructor(twitterPkg, dataHandler, generator, utils) {
        this.twitterHandler = new Twitter(generator, twitterPkg, utils);
        this.eventHandler = new Event(twitterPkg, this.twitterHandler, dataHandler, generator, utils);
        this.dataHandler = dataHandler;
        this.generator = generator;
        this.utils = utils;

        this.TWEET_INTERVAL = 15/*min*/ * 60/*s*/ * 1000/*ms*/;
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
        this.eventHandler.checkTrackedTweets().then((newStatusTweets) => {
            // Process any mentions
            this.eventHandler.checkMentions().then((newStatusMentions) => {
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
