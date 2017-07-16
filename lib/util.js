/*
 * NTwitBot - util.js
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

/* eslint no-unused-vars: "off" */

const colors = require('colors'),
      fs     = require('fs');

module.exports = class Util {

    constructor() {
        this.debug = false;
    }

    /*
     * Return config data, stop program if error occurs.
     *   path    - String:  Path to file.
     *   Returns - Promise: Resolves with parsed JSON data.
     */
    readJSONFromFile(path) {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(path)) {
                fs.readFile(path, (error, data) => {
                    if (error) {
                        reject(error);
                    }

                    resolve(JSON.parse(data));
                });
            } else {
                reject(new Error("Files doesn't exist."));
            }
        });
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
        if (this.debug) {
            console.error(this.getFormattedTime() + " " + " DEBUG ".black.bgCyan + " %s".cyan, message);
        }
    }

    /*
     * Sets the debug flag for logging.
     *   debug - Boolean: If debug should be enabled.
     */
    setDebug(debug) {
        this.debug = debug;
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
     * Generates an array with elements 0 to n - 1 elements of length n in random order.
     *   n       - Int:   The length of the array.
     *   Returns - Array: Randomly shuffled array.
     */
    generateShuffledArray(n) {
        let array = [];

        // Initialize the array
        for (let i = 0; i < n; i++) {
            array.push(i);
        }

        return this.shuffleArray(array);
    }

    /*
     * Shuffles the elements of an array.
     *   array  - Array: The length of the array.
     *   Return - Array: The shuffled array,
     */
    shuffleArray(array) {
        let swap, temp;

        for (let i = array.length; i > 0; i--) {
            swap = Math.floor(Math.random() * i);
            temp = array[i - 1];
            array[i - 1] = array[swap];
            array[swap] = temp;
        }

        return array;
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
