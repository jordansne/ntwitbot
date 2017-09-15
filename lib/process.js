/*
 * NTwitBot - process.js
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

const entities = require('html-entities').AllHtmlEntities;

/**
 * Tweet processor class. Processes new tweet data & saves it in the database.
 */
module.exports = class Process {

    /**
     * Initialize the class.
     * @param {Data} dataHandler - The data object for reading & writing to storage.
     * @param {Util} utils - The utilities object needed for logging, etc.
     */
    constructor(dataHandler, utils) {
        this.dataHandler = dataHandler;
        this.utils = utils;
    }

    /**
     * Process tracked tweets of the bot and save it in the database.
     * @param {Array} tweets - The array of tweets in strings to be processed.
     * @return {Promise} Resolves when done processing & saving data.
     */
    processTweets(tweets) {
        const newData = {};

        this.utils.log("Processing " + tweets.length + " new tweets (which do not include RTs)");

        // Process tweets
        for (let i = 0; i < tweets.length; i++) {
            const tweet = tweets[i];

            // Process "< > &" symbols
            tweet.text = entities.decode(tweet.text);

            let filteredWords = this.filterWords(tweet.text.split(" "));

            if (filteredWords.length >= 3) {

                this.capitalizeWords(filteredWords);
                this.appendPeriod(filteredWords);

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

        if (!this.utils.isEmpty(newData)) {
            return this.dataHandler.saveTweetData(newData);
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Removes usernames and links from an array of words.
     * @private
     * @param {Array} words - The array of words to filter through.
     * @return {Array} The array after removing the filtered words.
     */
    filterWords(words) {
        const filteredWords = [];

        for (let i = 0; i < words.length; i++) {
            let word = words[i];

            // Remove mentions & links
            if (word.startsWith("@") || word.startsWith("http")) {
                continue;
            }

            word = word.toLowerCase();
            filteredWords.push(word);
        }

        return filteredWords;
    }

    /**
     * Capitalizes beginning of tweet and senetences. Edits the array by reference.
     * @private
     * @param {Array} words - The array of words to capitalize.
     */
    capitalizeWords(words) {
        // Capitalize the first word
        words[0] = this.utils.capitalize(words[0]);

        // Capitalize any words after a sentence
        for (let i = 1; i < words.length; i++) {
            if (this.utils.endsWithPunc(words[i - 1])) {
                words[i] = this.utils.capitalize(words[i]);
            }
        }
    }

    /**
     * Appends a period to the end of tweet if not present.
     * @private
     * @param {Array} words - The array of words to append to.
     */
    appendPeriod(words) {
        let lastWord = words[words.length - 1];

        if (!this.utils.endsWithPunc(lastWord) && !lastWord.endsWith(",")) {
            words[words.length - 1] += ".";
        }
    }

};
