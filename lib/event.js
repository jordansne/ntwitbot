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

/* jshint esversion:6, node: true, -W018, -W083 */

const fs     = require('fs'),
      timers = require('timers');

module.exports = class Event {

    constructor(twitterPkg, actionHandler, dataHandler) {
        this.twitterPkg = twitterPkg;
        this.actionHandler = actionHandler;
        this.dataHandler = dataHandler;

        /* Dictionary with key & value: userID (int) : LastTweetIDProcessed' (int) */
        this.trackedUsers = {};
    }

    /*
     * Checks for any new followers that have been aquired &
     * processes any new tweets from the users.
     */
    runUpdate() {
        const self = this;
        const data = {
            user_id: JSON.parse(fs.readFileSync('./config/setup.json')).ownID,
            stringify_ids: true
        };

        // Retrieve a list of users that the bot is following
        this.twitterPkg.get('friends/ids', data, function(error, result, response) {
            const currentTrackedUsers = result.ids;

            // Check for new users the bot is following
            for (let i = 0; i < currentTrackedUsers.length; i++) {
                let user = currentTrackedUsers[i];

                // If the user is not in trackedUsers (ie new follow), add to dictionary
                // and give lastTweetID as 0.
                if (!(user in self.trackedUsers)) {
                    self.trackedUsers[user] = 0;
                }
            }

            // Check for users that the bot is no longer following
            for (let userID in self.trackedUsers) {
                const lastTweetID = self.trackedUsers[userID];

                // Check if userID exists in currentTrackedUsers, if it does not,
                // remove them from trackedUsers.
                if (!(currentTrackedUsers.indexOf(userID) > -1)) {
                    delete self.trackedUsers[userID];
                }
            }

            // Process any new tweets that users have made
            for (let userID in self.trackedUsers) {
                const lastTweetID = self.trackedUsers[userID];
                const data = {
                    user_id: userID,
                    include_rts: false
                };

                // If the user's tweet have been processed before..
                if (lastTweetID !== 0) {
                    data.since_id = lastTweetID;
                // .. otherwise, process their most recent tweets.
                } else {
                    data.count = 50;
                }

                // Pass all of the tweets to the data handler
                self.twitterPkg.get('statuses/user_timeline', data, function(error, tweets, response) {
                    console.log("[INFO] Found " + tweets.length + " new tweets from user: " + tweets[0].user.id);

                    for (let i = 0; i < tweets.length; i++) {
                        let tweet = tweets[i];

                        self.dataHandler.processTrackedTweet(tweet.text);
                    }
                });
            }
        });
    }

};
