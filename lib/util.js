/*
 * NTwitBot - util.js
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

/* eslint no-unused-vars: "off" */

const colors = require('colors');

module.exports = class Util {

    constructor(twitterPkg) {
        this.twitterPkg = twitterPkg;
    }

    /*
     * Logs a normal message to console.
     *   message - String: The message to log.
     */
    log(message) {
        console.log(this.getFormattedTime() + " " + " INFO ".black.bgWhite + " %s", message);
    }

    /*
     * Logs an error message to console.
     *   message - String: The message to log.
     */
    logError(message) {
        console.error(this.getFormattedTime() + " " + " ERROR ".black.bgRed + " %s".red, message);
    }

    /*
     * Logs a debug message to console.
     *   message - String: The message to log.
     */
    logDebug(message) {
        console.error(this.getFormattedTime() + " " + " DEBUG ".black.bgCyan + " %s".cyan, message);
    }

    /*
     * Gets the current date & time to the minute.
     *   Returns - Int: the current time in form: YYYYMMDDhhmm
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

    /*
     * Gets the current date & time to the second.
     *   Returns - String: the current time in form: "MM/DD/YYYY hh:mm:ss"
     */
    getFormattedTime() {
        let result = "";
        const date = new Date();

        const month = date.getMonth() + 1;
        result += (month < 10 ? "0" : "") + month + "/";

        const day = date.getDate();
        result += (day < 10 ? "0" : "") + day + "/";

        const year = date.getFullYear();
        result += year + " ";

        const hour = date.getHours();
        result += (hour < 10 ? "0" : "") + hour + ":";

        const minute = date.getMinutes();
        result += (minute < 10 ? "0" : "") + minute + ":";

        const seconds = date.getSeconds();
        result += (seconds < 10 ? "0" : "") + seconds;

        return result;
    }

    /*
     * Capitalizes the first letter of a word.
     *   word    - String: The word to capitalize
     *   Returns - String: The capitalized word
     */
    capitalize(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    /*
     * Checks if a character in upper case.
     *   char    - Character: The letter to check.
     *   Returns - Boolean:   true if upper case.
     */
    isUpperCase(char) {
        return char == char.toUpperCase();
    }

    /*
     * Check if an object is in an array.
     *   array   - Array:   Array to check.
     *   object  - Object:  Object to check.
     *   Returns - Boolean: True if object in in the array.
     */
    isInArray(array, object) {
        return array.indexOf(object) !== -1;
    }

    /*
     * Returns the object where the word variable is w.
     *   array   - Array:  Array to check.
     *   w       - String: The word to search for.
     *   Returns - Object: That contains w.
     */
    getObjectWithWord(array, w) {
        for (let i = 0; i < array.length; i++) {
            if (array[i].word === w) {
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
    compileString(array, seperator) {
        let result = "";

        for (let i = 0; i < array.length; i++) {
            result += array[i];

            if (i < array.length - 1) {
                result += seperator;
            }
        }

        return result;
    }

    /*
     * Check if the end of a string ends with a punctuation symbol.
     *   string  - String:  String to check.
     *   Returns - Boolean: True if the string ends with a punctuation symbol.
     */
    endsWithPunc(string) {
        return string.endsWith(".") || string.endsWith("!") || string.endsWith("?");
    }

};
