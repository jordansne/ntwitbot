/*
 * NTwitBot - tweetbuilder.js
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
            chance.string({ pool: '1234567890', length: 12}),
            chance.sentence({ words: 16 }),
            chance.string({ pool: '1234567890', length: 7}),
            name.toLowerCase().replace(/\s/g, '')
        ).withName(name);
    },


    /**
     * Generates an array of multiple random tweets.
     * @param {int} amount - The number of tweets to generate.
     * @return {Array} An array of random tweets.
     */
    generateRandomTweets(amount) {
        const tweets = [];

        for (let i = 0; i < amount; i++) {
            const name = chance.name();

            tweets.push(new Tweet(
                chance.string({ pool: '1234567890', length: 12}),
                chance.sentence({ words: 16 }),
                chance.string({ pool: '1234567890', length: 7}),
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
        return chance.string({ pool: '1234567890', length: 15});
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
        return chance.string({ pool: '1234567890', length: 8});
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
     * @return {string} The converted username.
     */
    toUsername(name) {
        return name.toLowerCase().replace(/\s/g, '');
    }

};
