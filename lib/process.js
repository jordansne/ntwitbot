/*
 * NTwitBot - process.js
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

const entities = require('html-entities').AllHtmlEntities;

module.exports = class Process {

    constructor(dataHandler, utils) {
        this.dataHandler = dataHandler;
        this.utils = utils;
    }

    /*
     * Processes tracked tweets of the bot. (Saves in database, etc.)
     *   tweets  - Array (Strings): The Tweets to be processed.
     *   Returns - Promise:         Resolves when done processing & saving data.
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

        return this.dataHandler.saveData(newData);
    }

    /*
     * Filters a list of words. Removes usernames and links.
     *   words   - Array (String): List of words.
     *   Returns - Array (String): List of filtered words.
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

    /*
     * Capitalizes beginning of tweet and senetences.
     *   words   - Array (String): List of words to be capitalized.
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

    /*
     * Appends a period to the end of tweet if not present.
     *   words - Array (String): List of words to append to.
     */
    appendPeriod(words) {
        let lastWord = words[words.length - 1];

        if (!this.utils.endsWithPunc(lastWord) && !lastWord.endsWith(",")) {
            words[words.length - 1] += ".";
        }
    }

};
