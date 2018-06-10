/**
 * NTwitBot - generate.js
 * @file Message generator.
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const Utils = require('./utils.js');

/**
 * Tweet generator class.
 */
module.exports = class Generate {

    constructor() {
        // Minimum words for a message
        this.MIN_WORDS = 4;
        // Maximum characters a message can be
        this.MAX_CHARS = 140;
    }

    /**
     * Generates a tweet message.
     * @param {Object} wordDB - The database object of tweets.
     * @return {string} The generated message.
     */
    generateTweet(wordDB) {
        let wordStack, firstWord = 0;
        const firstWords = this.getFirstWords(wordDB);

        let done = false;
        while (!done) {
            // Initialize the word stack with two first words
            wordStack = firstWords[firstWord].split(' ').slice(0);

            // Construct the rest of the tweet
            while (true) {
                const nextMoves = this.getPossibleMoves(wordDB, wordStack);

                if (nextMoves.length === 0) {
                    break;
                }

                const randomMove = Math.floor(Math.random() * nextMoves.length);
                const move = nextMoves[randomMove];

                if (move.startsWith('FINISH_WITH:')) {
                    wordStack.push(move.split(':')[1]);
                    done = true;
                    break;

                } else if (move.startsWith('ADD_WORD:')) {
                    wordStack.push(move.split(':')[1]);
                    continue;

                } else if (move.startsWith('POP_WORD:')) {
                    this.popWord(wordStack, wordDB);
                    continue;
                }
            }

            firstWord++;
            // If no more available, no further possibilities
            if (firstWord >= firstWords.length && !done) {
                return null;
            }
        }

        return this.compileMessage(wordStack);
    }

    /**
     * Returns the key for the next word to be added to the wordStack.
     * @private
     * @param {string[]} wordStack - The stack of words for the tweet.
     * @return {string} The key for the next word.
     */
    keyOf(wordStack) {
        return `${wordStack[wordStack.length - 2]} ${wordStack[wordStack.length - 1]}`;
    }

    /**
     * Get a list of possible first words.
     * @private
     * @param {Object} wordDB - The database object of tweets.
     * @return {string[]} A shuffled array of possible first words.
     */
    getFirstWords(wordDB) {
        const first = [];

        for (const key in wordDB) {
            if (wordDB.hasOwnProperty(key)) {
                if (Utils.isUpperCase(key.charAt(0))) {
                    first.push(key);
                }
            }
        }

        return Utils.shuffleArray(first);
    }

    /**
     * Generates an array with all possible next moves in the tweet generation.
     * @private
     * @param {Object} wordDB - The database object of tweets.
     * @param {string[]} wordStack - The stack of words for the tweet.
     * @return {string[]} An array of possible moves.
     */
    getPossibleMoves(wordDB, wordStack) {
        const nextMoves = [];
        const key = this.keyOf(wordStack);

        if (wordStack.length === 0) {
            return [];
        }

        if (wordDB.hasOwnProperty(key)) {
            const nextWords = this.getRandomWords(wordDB, key);

            if (nextWords.length > 0) {
                for (const word of nextWords) {
                    if (Utils.endsWithPunc(word)) {
                        nextMoves.push(`FINISH_WITH:${word}`);
                    } else {
                        nextMoves.push(`ADD_WORD:${word}`);
                    }
                }
            } else {
                nextMoves.push('POP_WORD:');
            }
        } else {
            nextMoves.push('POP_WORD:');
        }

        return nextMoves;
    }

    /**
     * Returns a random word from the wordDB that has the specified key.
     * @private
     * @param {Object} wordDB - The database object of tweets.
     * @param {string} key - The key to be used for the wordDB.
     * @return {string} A random word. Null if no word exists.
     */
    getRandomWords(wordDB, key) {
        const result = [];
        const numOfWords = wordDB[key].length;
        const randWordArray = Utils.generateShuffledArray(numOfWords);

        // Search for a new word entry that hasn't been popped
        for (let i = 0; i < numOfWords; i++) {
            const nextWord = randWordArray[i];
            const wordEntry = wordDB[key][nextWord];

            if (!wordEntry.beenPopped) {
                result.push(wordEntry.word);
            }
        }

        return result;
    }

    /**
     * Compiles the word stack into a single string.
     * @private
     * @param {string[]} wordStack - The stack of words for the tweet.
     * @return {string} The compiled string.
     */
    compileMessage(wordStack) {
        let result = '';

        for (let i = 0; i < wordStack.length; i++) {
            result += wordStack[i];

            if (i < wordStack.length - 1) {
                result += ' ';
            }
        }

        if (!Utils.endsWithPunc(result)) {
            result += '.';
        }

        return result;
    }

    /**
     * Pops the last word or the only two words off the stack and marks the entries as beenPopped.
     * @private
     * @param {string[]} wordStack - Current array of strings (words).
     * @param {Object} wordDB - The database object of tweets.
     * @returns {void}
     */
    popWord(wordStack, wordDB) {
        const numOfWords = wordStack.length;

        if (numOfWords >= 3) {
            const key = `${wordStack[numOfWords - 3]} ${wordStack[numOfWords - 2]}`;
            const word = wordStack[numOfWords - 1];

            this.getWordEntry(wordDB[key], word).beenPopped = true;
            wordStack.pop();
        } else {
            wordStack.splice(0);
        }
    }

    /**
     * Returns the entry where the word attribute is equal to the specified word parameter.
     * @private
     * @param {Object[]} entryList - The array of database entries.
     * @param {string} word - The word to search for.
     * @return {Object} The entry that contains the word. Null if not found.
     */
    getWordEntry(entryList, word) {
        for (const entry of entryList) {
            if (entry.word === word) {
                return entry;
            }
        }

        return null;
    }

};
