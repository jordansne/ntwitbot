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

    constructor(twitterPkg, utils) {
        this.twitterPkg = twitterPkg;
        this.utils = utils;

        this.DATABASE_DIR = './data';

        if (!fs.existsSync(this.DATABASE_DIR)) {
            fs.mkdirSync(this.DATABASE_DIR);
        }
    }

    /*
     * Processes tracked tweets of the bot. (Saves in database, etc.)
     *   tweets - Array (Strings): The Tweets to be processed.
     */
    processTrackedTweets(tweets) {
        const newData = {};

        this.utils.log("Processing " + tweets.length + " new tweets");

        // Process tweets
        for (let i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];
            const tweetWords = tweet.text.split(" ");
            const filteredWords = [];

            for (let i = 0; i < tweetWords.length; i++) {
                let word = tweetWords[i];

                // Remove mentions & links
                if (word.startsWith("@") || word.startsWith("http")) {
                    continue;
                }

                word = word.toLowerCase();
                filteredWords.push(word);
            }

            if (filteredWords.length >= 3) {
                // Capitalize the first word
                filteredWords[0] = this.utils.capitalize(filteredWords[0]);

                // Capitalize any words after a sentence
                for (let i = 1; i < filteredWords.length; i++) {
                    if (this.utils.endsWithPunc(filteredWords[i - 1])) {
                        filteredWords[i] = this.utils.capitalize(filteredWords[i]);
                    }
                }

                // Append period if no punctuation present
                let lastWord = filteredWords[filteredWords.length - 1];
                if (!this.utils.endsWithPunc(lastWord) && !lastWord.endsWith(",")) {
                    filteredWords[filteredWords.length - 1] += ".";
                }

                // Process words into data objects
                for (let i = 0; i < filteredWords.length - 2; i++) {
                    let key = filteredWords[i] + " " + filteredWords[i + 1];

                    // If the key doesn't exist, create a new array..
                    if (!(key in newData)) {
                        newData[key] = [{
                            word: filteredWords[i + 2],
                            time: this.utils.getTime()
                        }];
                    // .. otherwise add it to the existing array
                    } else {
                        newData[key].push({
                            word: filteredWords[i + 2],
                            time: this.utils.getTime()
                        });
                    }
                }
            }
        }

        // Save the data in the database
        fs.readFile(this.DATABASE_DIR + '/db.json', (error, data) => {
            if (error) {
                if (error.code === "ENOENT") {
                    this.utils.log("I/O: No database found, creating a new one");
                    this.inputToEmpty(newData);
                } else {
                    this.utils.logError("I/O: Failed to open database file (" + this.DATABASE_DIR + "/db.json)");
                    this.utils.logError("I/O:    Error: " + error.Error);
                }
            } else {
                this.inputToExisting(JSON.parse(data), newData);
            }
        });
    }

    /*
     * Saves the new data into a blank database.
     *   data - Object: Data to be saved.
     */
    inputToEmpty(data) {
        // Create an empty database
        fs.open(this.DATABASE_DIR + '/db.json', 'w', (error, fd) => {
            if (error) {
                this.utils.logError("I/O: Failed create new database file (" + this.DATABASE_DIR + "/db.json)");
                this.utils.logError("I/O:    Error: " + error.code);
                return;
            }

            fs.closeSync(fd);

            // Save data to the database
            fs.writeFile(this.DATABASE_DIR + '/db.json', JSON.stringify(data), (error, data) => {
                if (error) {
                    this.utils.logError("I/O: Failed to write new data to database file (" + this.DATABASE_DIR + "/db.json)");
                    this.utils.logError("I/O:    Error code: " + error.code);
                    return;
                }

                this.utils.log("I/O: Saved tweet data in database");
            });
        });
    }

    /*
     * Adds the data to an existing database.
     *   data    - Object: The data that was in the database.
     *   newData - Object: The data to be appended to the database.
     */
    inputToExisting(data, newData) {
        // For each key in the new data..
        for (let key in newData) {
            // If the it exists in existing data
            if (key in data) {
                // Push (append), new data to exist array
                for (let i = 0; i < newData[key].length; i++) {
                    data[key].push(newData[key][i]);
                }
            // .. if not, declare new array in existing data
            } else {
                data[key] = newData[key];
            }
        }

        // Save data to database
        fs.writeFile(this.DATABASE_DIR + '/db.json', JSON.stringify(data), (error, data) => {
            if (error) {
                this.utils.logError("I/O: Failed to append new data to database file (" + this.DATABASE_DIR + "/db.json)");
                this.utils.logError("I/O:    Error code: " + error.code);
                return;
            }

            this.utils.log("I/O: Appended new tweet data to database");
        });
    }

    /*
     * Generates and returns a response.
     *   Returns - String: The generated tweet.
     */
    generateResponse() {
        let tweetMessage = "";

        // ...

        return tweetMessage;
    }

    /*
     * Saves the botStatus in file.
     *   botStatus - Object: Data to be saved.
     */
    saveStatus(botStatus) {
        fs.writeFile(this.DATABASE_DIR + '/status.json', JSON.stringify(botStatus), (error, botStatus) => {
            if (error) {
                this.utils.logError("I/O: Failed to save bot status to file (" + this.DATABASE_DIR + "/status.json)");
                this.utils.logError("I/O:    Error code: " +  error.code);
                return;
            }

            this.utils.log("I/O: Saved bot status to file");
        });
    }

    /*
     * Gets the botStatus from the file.
     *   Returns - Object: Object containing current bot status.
     */
    readStatus() {
        let botStatus;

        try {
            botStatus = fs.readFileSync(this.DATABASE_DIR + '/status.json', 'utf8');
        } catch (error) {
            if (error.code == 'ENOENT') {
                return null;
            } else {
                this.utils.logError("I/O: FATAL: Failed to read botStatus file (" + this.DATABASE_DIR + "/status.json)");
                this.utils.logError("I/O: FATAL: Exiting..");
                process.exit(1);
            }
        }

        this.utils.log("I/O: Read bot status from file");
        return JSON.parse(botStatus);
    }

    /*
     * Gets word data from the database file.
     *   Returns - Object: Object containing word dictionary.
     */
    readDatabase() {
        let data;

        // Read data from tweet database
        try {
            data = fs.readFileSync(this.DATABASE_DIR + '/db.json', 'utf8');
        } catch (error) {
            if (error.code === "ENOENT") {
                this.utils.logError("I/O: No database found, could not generate tweet");
            } else {
                this.utils.logError("I/O: Failed to open database file (" + this.DATABASE_DIR + "/db.json)");
                this.utils.logError("I/O:    Error: ", error.Error);
            }
        }

        return JSON.parse(data);
    }

};
