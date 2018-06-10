/**
 * NTwitBot - tweetbuilder.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const Chance = require('chance');
const chance = new Chance();

const Tweet  = require('./tweet.js');

module.exports = {

    /**
     * Generates a random tweet object.
     * @return {Tweet} A random tweet object.
     */
    generateRandomTweet() {
        const name = chance.name();

        return new Tweet(
            chance.string({ pool: '1234567890', length: 12 }),
            chance.sentence({ words: 16 }),
            chance.string({ pool: '1234567890', length: 7 }),
            name.toLowerCase().replace(/\s/g, '')
        ).withName(name);
    },

    /**
     * Generates an array of multiple random tweets.
     * @param {int} amount - The number of tweets to generate.
     * @return {Tweet[]} An array of random tweets.
     */
    generateRandomTweets(amount) {
        const tweets = [];

        for (let i = 0; i < amount; i++) {
            const name = chance.name();

            tweets.push(new Tweet(
                chance.string({ pool: '1234567890', length: 12 }),
                chance.sentence({ words: 16 }),
                chance.string({ pool: '1234567890', length: 7 }),
                name.toLowerCase().replace(/\s/g, '')
            ).withName(name).toAPIObject());
        }

        return tweets;
    },

    /**
     * Generates a random tweet ID.
     * @return {string} A random tweet ID.
     */
    genTweetID() {
        return chance.string({ pool: '1234567890', length: 15 });
    },

    /**
     * Generates a random sentence of length 12.
     * @return {string} A random sentence.
     */
    genText() {
        return chance.sentence({ words: 12 });
    },

    /**
     * Generates a random user ID.
     * @return {string} A random user ID.
     */
    genUserID() {
        return chance.string({ pool: '1234567890', length: 8 });
    },

    /**
     * Generates a random first and last name.
     * @return {string} A random name.
     */
    genName() {
        return chance.name();
    },

    /**
     * Generates a random username from a named by removing the spaces.
     * @param {string} name - The name to convert.
     * @return {string} The converted username.
     */
    toUsername(name) {
        return name.toLowerCase().replace(/\s/g, '');
    }

};
