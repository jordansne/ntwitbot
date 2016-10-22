/*
 * NTwitBot - data.js
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

const fs = require('fs');

module.exports = class Data {

    constructor(twitterPkg) {
        this.twitterPkg = twitterPkg;
        this.DATABASE_DIR = './data';
    }

    /*
     * Processes tracked tweets of the bot.
     * (Saves in database, etc.)
     *
     *   tweets - Array of Strings: The Tweets to be processed.
     */
    processTrackedTweets(tweets) {
        const newData = {};

        // For every tweet to process..
        for (let i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];
            const tweetWords = tweet.text.split(" ");
            const filteredWords = [];

            for (let i = 0; i < tweetWords.length; i++) {
                let word = tweetWords[i];

                // Remove mentions & links.
                if (word.startsWith("@") || word.startsWith("http")) {
                    continue;
                }

                word = word.toLowerCase();
                filteredWords.push(word);
            }

            if (filteredWords.length >= 3) {
                for (let i = 0; i < filteredWords.length - 2; i++) {
                    let key = filteredWords[i] + " " + filteredWords[i + 1];

                    // If the key doesn't exist, create a new array..
                    if (!(key in newData)) {
                        newData[key] = [{
                            word: filteredWords[i + 2],
                            time: this.getTime()
                        }];
                    // .. otherwise add it to the existing array
                    } else {
                        newData[key].push({
                            word: filteredWords[i + 2],
                            time: this.getTime()
                        });
                    }
                }
            }
        }

        // Save the data in the database
        fs.readFile(this.DATABASE_DIR + '/db.json', (error, data) => {
            if (error) {
                if (error.code === "ENOENT") {
                    console.log("[INFO] No database found, creating a new one.");
                    this.inputToEmpty(newData);
                } else {
                    console.error("[ERROR] Failed to open database file (" + this.DATABASE_DIR + "/data.json)");
                    console.error("[ERROR]     Error Message: ", error.Error);
                }
            } else {
                this.inputToExisting(JSON.parse(data), newData);
            }
        });
    }

    /*
     * Saves the new data into a blank database.
     */
    inputToEmpty(data) {
        // Create new directory if it doesnt exist
        if (!fs.existsSync(this.DATABASE_DIR)) {
            fs.mkdirSync(this.DATABASE_DIR);
        }

        // Create an empty database.
        fs.open(this.DATABASE_DIR + '/db.json', 'w', (error, fd) => {
            if (error) {
                console.error("[ERROR] Failed create new database file (" + this.DATABASE_DIR + "/data.json')");
                console.error("[ERROR]     Error Message: ", error.code);
                return;
            }

            fs.closeSync(fd);

            // Save the data to the database.
            fs.writeFile(this.DATABASE_DIR + '/db.json', JSON.stringify(data), (error, data) => {
                if (error) {
                    console.error("[ERROR] Failed to write new data to database file (" + this.DATABASE_DIR + "/data.json')");
                    console.error("[ERROR]     Error code: ", error.code);
                    return;
                }

                console.log("[INFO] Saved tweet data in database");
            });
        });
    }

    /*
     * Adds the data to an existing database.
     *
     *   data    - Object: The data that was in the database.
     *   newData - Object: The data to be appended to the database.
     */
    inputToExisting(data, newData) {
        // For each key in the new data..
        for (let key in newData) {
            // .. check if the it exists in existing data
            if (key in data) {
                // If so, push (append), new data to exist array
                for (let i = 0; i < newData[key].length; i++) {
                    data[key].push(newData[key][i]);
                }
            // .. if not, declare new array in existing data
            } else {
                data[key] = newData[key];
            }
        }

        // Save the data to the database.
        fs.writeFile(this.DATABASE_DIR + '/db.json', JSON.stringify(data), (error, data) => {
            if (error) {
                console.error("[ERROR] Failed to append new data to database file (" + this.DATABASE_DIR + "/data.json')");
                console.error("[ERROR]     Error code: ", error.code);
                return;
            }

            console.log("[INFO] Appended new tweet data to database");
        });
    }

    /*
     * Generates a response to be tweeted.
     *
     *   Returns - String: The generated tweet.
     */
    generateResponse() {
        let tweetMessage = "";

        // ...

        return tweetMessage;
    }

    saveTrackedUsers(trackedUsers) {
        // Save the data to the database.
        fs.writeFile(this.DATABASE_DIR + '/tracked.json', JSON.stringify(trackedUsers), (error, data) => {
            if (error) {
                console.error("[ERROR] Failed to append new data to database file (" + this.DATABASE_DIR + "/data.json')");
                console.error("[ERROR]     Error code: ", error.code);
            }
            console.log("[INFO] Appended new tweet data to database");
        });
    }

    /*
     * Gets the current date & time to the minute.
     *
     *   Returns - int: the current time in form: YYYYMMDDhhmm
     */
    getTime() {
        let result = "";
        const date = new Date();

        const year = date.getFullYear();
        result += year;

        const month = date.getMonth() + 1;
        result += (month < 10 ? "0" : "") + month;

        const day = date.getDate();
        result += (day < 10 ? "0" : "") + day;

        const hour = date.getHours();
        result += (hour < 10 ? "0" : "") + hour;

        const minute = date.getMinutes();
        result += (minute < 10 ? "0" : "") + minute;

        return parseInt(result);
    }

};
