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

/**
 * Tweet generator class.
 */
module.exports = class Generate {

    /**
     * Initialize the class.
     * @param {Data} dataHandler - The data object for reading & writing to storage.
     * @param {Util} utils - The utilities object needed for logging, etc.
     */
    constructor(dataHandler, utils) {
        // Minimum words for a message
        this.MIN_WORDS = 4;
        // Maximum characters a message can be
        this.MAX_CHARS = 140;

        this.dataHandler = dataHandler;
        this.utils = utils;
    }

    /**
     * Generates a tweet message.
     * @return {Promise} Resolves with the generated tweet.
     */
    generateTweet() {
        return this.dataHandler.readDatabase().then((data) => {
            return this.getGeneration(data);
        });
    }

    /**
     * Generates the tweet.
     * @private
     * @param {Object} wordDB - The database object of tweets.
     * @return {string} The generated message.
     */
    getGeneration(wordDB) {
        let tweetWords = [];

        // Find first word object to use
        const firstWords = this.getFirstWords(wordDB);
        let firstWord = 0;

        let doneGeneration = false;
        while (!doneGeneration) {
            // Reset the message & push the first two words to the tweetWords
            tweetWords = [];
            tweetWords.push(...(firstWords[firstWord].split(" ")));

            // Construct the rest of the tweet message
            let finishedMessage = false;
            while (!finishedMessage) {
                const length = tweetWords.length;
                const key = tweetWords[length - 2] + " " + tweetWords[length - 1];

                this.utils.logDebug("*** Message is now: \"" + this.compileMessage(tweetWords) + "\"");

                // If the sentence naturally comes to an end
                if (this.utils.endsWithPunc(tweetWords[tweetWords.length - 1])) {
                    this.utils.logDebug("  * Punctuation found");

                    // If adequite length, exit from generation
                    if (length >= this.MIN_WORDS) {
                        if (this.compileMessage(tweetWords).length <= this.MAX_CHARS) {
                            this.utils.logDebug("  * Message is adequite length, done");
                            finishedMessage = true;
                            doneGeneration = true;
                        } else {
                            this.utils.logDebug("  * Message is too long");
                            this.backtrace(tweetWords, wordDB, firstWords);
                        }
                    } else {
                        this.utils.logDebug("  * Message is not long enough");
                        this.backtrace(tweetWords, wordDB, firstWords);
                        // If tweetWords no longer has any words, restart generation
                        if (tweetWords.length === 0) {
                            finishedMessage = true;
                        }
                    }

                // If the message is approaching tweet char. limit
                } else if (this.compileMessage(tweetWords).length >= 130) {
                    this.utils.logDebug("  * Message getting too long, restarting generation");
                    finishedMessage = true;

                // If there is a entry for a new word, add it to the message
                } else if (wordDB.hasOwnProperty(key)) {
                    const numOfWords = wordDB[key].length;
                    const randWordArray = this.utils.generateShuffledArray(numOfWords);

                    this.utils.logDebug("  * Attempting to add word");

                    // Search for a new word entry that hasn't been backtraced
                    let hasFoundNextWord = false;
                    for (let i = 0; !hasFoundNextWord && i < numOfWords; i++) {
                        const nextWord = randWordArray[i];
                        const wordEntry = wordDB[key][nextWord];

                        if (!wordEntry.backtraced) {
                            this.utils.logDebug("  * Word added: " + wordEntry.word);
                            tweetWords.push(wordEntry.word);
                            hasFoundNextWord = true;
                        }
                    }

                    // Pop last word or restart if could not find next word
                    if (!hasFoundNextWord) {
                        this.utils.logDebug("  * Could not find next word");

                        this.backtrace(tweetWords, wordDB, firstWords);
                        // If tweetWords no longer has any words, restart generation
                        if (tweetWords.length === 0) {
                            finishedMessage = true;
                        }
                    }

                // If not, end the message
                } else {
                    this.utils.logDebug("  * No more words available");

                    finishedMessage = true;
                    doneGeneration = true;
                }
            }

            firstWord++;
        }

        return this.compileMessage(tweetWords);
    }

    /**
     * Compiles an array of strings into an array.
     * @private
     * @param {Array} tweetWords - The array of strings (words) to compile.
     * @return {string} The compiled string.
     */
    compileMessage(tweetWords) {
        let result = "";

        for (let i = 0; i < tweetWords.length; i++) {
            result += tweetWords[i];

            if (i < tweetWords.length - 1) {
                result += " ";
            }
        }

        if (!this.utils.endsWithPunc(result)) {
            result += ".";
        }

        return result;
    }

    /**
     * Helper method to set the last word of tweetWords as backtraced.
     * @private
     * @param {Array} tweetWords - Current array of strings (words).
     * @param {Object} wordDB - The database object of tweets.
     * @param {Array} firstWords - The array of possible first string (words).
     */
    backtrace(tweetWords, wordDB, firstWords) {
        let word, key;
        const length = tweetWords.length;

        // Pop last word only if >= 3 words
        if (length >= 3) {
            this.utils.logDebug("  * >= 3 words: Popping last word");

            key = tweetWords[length - 3] + " " + tweetWords[length - 2];
            word = tweetWords[length - 1];

            // Prevent reuse of word
            this.getWordObject(wordDB[key], word).backtraced = true;

            // Pop off last word
            tweetWords.pop();

        // If only 2 words in message, remove first two (i.e. one key)
        } else {
            this.utils.logDebug("  * < 3 words: Restarting generation");

            key = tweetWords[0] + " " + tweetWords[1];

            // Remove the first words from the the firstWords list
            firstWords.splice(firstWords.indexOf(key), 1);

            // Erase two words from array
            tweetWords.splice(0);
        }
    }

    /**
     * Get a list of possible first words.
     * @private
     * @param {Object} wordDB - The database object of tweets.
     * @return {Array} A shuffled array of possible first words.
     */
    getFirstWords(wordDB) {
        const first = [];

        for (let key in wordDB) {
            if (wordDB.hasOwnProperty(key)) {
                if (this.utils.isUpperCase(key.charAt(0))) {
                    first.push(key);
                }
            }
        }

        return this.utils.shuffleArray(first);
    }

    /**
     * Returns the object where the word attribute is equal to the specified word parameter.
     * @private
     * @param {Object} wordDB - The database object of tweets.
     * @param {string} word - The word to search for.
     * @return {Object} The entry that contains the word. Null if not found.
     */
    getWordObject(wordDB, word) {
        for (let i = 0; i < wordDB.length; i++) {
            if (wordDB[i].word === word) {
                return wordDB[i];
            }
        }

        return null;
    }

};
