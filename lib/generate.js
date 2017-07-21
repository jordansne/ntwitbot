/*
 * NTwitBot - generate.js
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

module.exports = class Generate {

    constructor(dataHandler, utils) {
        this.dataHandler = dataHandler;
        this.utils = utils;

        this.tweetWords = [];
        this.wordDict = null;
        this.firstWords = null;
    }

    /*
     * Generates and returns a response.
     *   Returns - String: The generated tweet.
     */
    generateResponse() {
        let result,
            doneGeneration = false,
            finishedMessage = false;

        this.wordDict = this.dataHandler.readDatabase();

        // Find first word object to use
        this.firstWords = this.getFirstWords();
        let firstWord = 0;

        // Generate tweetMessage
        while (!doneGeneration) {
            // Reset the message & push a first word to the tweetMessage
            this.tweetWords = [];
            this.tweetWords.push(...(this.firstWords[firstWord].split(" ")));

            // Construct the rest of the tweetMessage
            finishedMessage = false;
            while (!finishedMessage) {
                const length = this.tweetWords.length;
                const key = this.tweetWords[length - 2] + " " + this.tweetWords[length - 1];

                this.utils.logDebug("");
                this.utils.logDebug("***** Message: \"" + this.compileMessage() + "\" *****");

                // If the sentence naturally comes to an end
                if (this.utils.endsWithPunc(this.compileMessage())) {
                    this.utils.logDebug("    * Punctuation found");

                    // If adequite length, exit from generation
                    if (length >= 4 && this.compileMessage().length < 139) {
                        this.utils.logDebug("    * Message is aqequite length, ending message");
                        finishedMessage = true;
                        doneGeneration = true;

                    // Otherwise pop last word & mark as visited.
                    } else {
                        this.utils.logDebug("    * Message is not long enough");

                        if (this.tweetWords >= 3) {
                            this.utils.logDebug("    * Popping last word");
                            this.backtrace();
                            this.tweetWords.pop();
                        } else {
                            this.utils.logDebug("    * Message less than 3 words, restarting generation");
                            this.backtrace();
                            finishedMessage = true;
                        }
                    }

                // If the message is approaching tweet char. limit
                } else if (this.compileMessage().length >= 130) {
                    this.utils.logDebug("    * Message getting too long, restarting generation");
                    finishedMessage = true;

                // If there is a entry for a new word, add it to the message
                } else if (this.wordDict.hasOwnProperty(key)) {
                    const numOfWords = this.wordDict[key].length;
                    const randWordArray = this.utils.generateShuffledArray(numOfWords);

                    this.utils.logDebug("    * Attempting to add word");

                    // Search for a new word entry that hasn't been backtraced
                    let hasFoundNextWord = false;
                    for (let i = 0; !hasFoundNextWord && i < numOfWords; i++) {
                        const nextWord = randWordArray[i];
                        const wordEntry = this.wordDict[key][nextWord];

                        if (!wordEntry.backtraced) {
                            this.utils.logDebug("    * Word added");
                            this.tweetWords.push(this.wordDict[key][nextWord].word);
                            hasFoundNextWord = true;
                        }
                    }

                    // Pop last word or restart if could not find next word
                    if (!hasFoundNextWord) {
                        this.utils.logDebug("    * Could not find next word");

                        if (this.tweetWords.length >= 3) {
                            this.utils.logDebug("    * Popping last word");

                            this.backtrace();
                            this.tweetWords.pop();
                        } else {
                            this.utils.logDebug("    * Message less than 3 words, restarting generation");

                            this.backtrace();
                            finishedMessage = true;
                        }
                    }

                // If not, end the message
                } else {
                    this.utils.logDebug("    * No more word objects available");

                    finishedMessage = true;
                    doneGeneration = true;
                }
            }

            firstWord++;
        }

        // Compile and return the sentence
        result = this.compileMessage();
        if (!this.utils.endsWithPunc(result)) {
            result += ".";
        }

        return result;
    }

    /*
     * Sets the last word of tweetMessage as backtraced.
     */
    backtrace() {
        let word, key;
        const length = this.tweetWords.length;

        // If a word can be popped
        if (length >= 3) {
            key = this.tweetWords[length - 3] + " " + this.tweetWords[length - 2];
            word = this.tweetWords[length - 1];

            this.getObjectByWord(this.wordDict[key], word).backtraced = true;
        // If only 2 words in message, remove from first list
        } else {
            key = this.tweetWords[0] + " " + this.tweetWords[1];

            const index = this.firstWords.indexOf(key);
            this.firstWords.splice(index, 1);
        }
    }

    /*
     * Returns a list of possible first word entries.
     *  Returns  - Array:  A shuffled array of possible first word entries.
     */
    getFirstWords() {
        const first = [];

        for (let key in this.wordDict) {
            if (this.wordDict.hasOwnProperty(key)) {
                if (this.utils.isUpperCase(key.charAt(0))) {
                    first.push(key);
                }
            }
        }

        return this.utils.shuffleArray(first);
    }

    /*
     * Returns the object where the word variable is word.
     *   array   - Array:  Array to check.
     *   word    - String: The word to search for.
     *   Returns - Object: That contains word.
     */
    getObjectByWord(array, word) {
        for (let i = 0; i < array.length; i++) {
            if (array[i].word === word) {
                return array[i];
            }
        }

        return null;
    }

    /*
     * Compiles an array of strings into an array.
     *   array     - Array:  Array to compile into a string.
     *   seperator - String: The seperator between elements.
     *   Returns   - String: The compiled string.
     */
    compileMessage() {
        let result = "";

        for (let i = 0; i < this.tweetWords.length; i++) {
            result += this.tweetWords[i];

            if (i < this.tweetWords.length - 1) {
                result += " ";
            }
        }

        return result;
    }

};
