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

module.exports = class Data {

    constructor(twitterPkg) {
        this.twitterPkg = twitterPkg;
    }

    /*
     * Processes tracked tweets of the bot.
     * (Saves in database, etc.)
     *
     *   tweets - Array of Strings: The Tweets to be processed.
     */
    processTrackedTweets(tweets) {
     */
        // ...
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
