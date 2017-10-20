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

/* eslint no-unused-vars: 'off' */
/* eslint no-console: 'off' */

const colors = require('colors'),
      fs     = require('fs');

/**
 * Utilities class. Contains logging and helper methods.
 */
module.exports = class Util {

    constructor() {
        this.debug = false;
    }

    /**
     * Logs a normal message to console.
     * @param {string} message - The message to log.
     */
    log(message) {
        if (process.env.NODE_ENV !== 'test') {
            console.log(this.getFormattedTime() + ' ' + ' INFO '.black.bgWhite + ' %s', message);
        }
    }

    /**
     * Logs an error message to console.
     * @param {string} message - The message to log.
     */
    logError(message) {
        console.error(this.getFormattedTime() + ' ' + ' ERROR '.black.bgRed + ' %s'.red, message);
    }

    /**
     * Logs a debug message to console.
     * @param {string} message - The message to log.
     */
    logDebug(message) {
        if (process.env.NODE_ENV !== 'test' && this.debug) {
            console.error(this.getFormattedTime() + ' ' + ' DEBUG '.black.bgCyan + ' %s'.cyan, message);
        }
    }

    /**
     * Sets the debug flag for logging.
     * @param {boolean} debug - The new status of the debug flag.
     */
    setDebug(debug) {
        this.debug = debug;

        if (debug) {
            this.logDebug('Debug flag set');
        }
    }

    /**
     * Gets the current date & time to the minute.
     * @return {int} The current time in form: YYYYMMDDhhmm
     */
    getTime() {
        let result = '';
        const date = new Date();

        const year = date.getFullYear();
        result += year;

        const month = date.getMonth() + 1;
        result += (month < 10 ? '0' : '') + month;

        const day = date.getDate();
        result += (day < 10 ? '0' : '') + day;

        const hour = date.getHours();
        result += (hour < 10 ? '0' : '') + hour;

        const minute = date.getMinutes();
        result += (minute < 10 ? '0' : '') + minute;

        return parseInt(result);
    }

    /**
     * Gets the current date & time to the second.
     * @return {string} The current time in form: 'MM/DD/YYYY hh:mm:ss'
     */
    getFormattedTime() {
        let result = '';
        const date = new Date();

        const month = date.getMonth() + 1;
        result += (month < 10 ? '0' : '') + month + '/';

        const day = date.getDate();
        result += (day < 10 ? '0' : '') + day + '/';

        const year = date.getFullYear();
        result += year + ' ';

        const hour = date.getHours();
        result += (hour < 10 ? '0' : '') + hour + ':';

        const minute = date.getMinutes();
        result += (minute < 10 ? '0' : '') + minute + ':';

        const seconds = date.getSeconds();
        result += (seconds < 10 ? '0' : '') + seconds;

        return result;
    }

    /**
     * Capitalizes the first letter of a word.
     * @param {string} word - The word to capitalize.
     * @return {string} The capitalized word.
     */
    capitalize(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    /**
     * Checks if a character in upper case.
     * @param {char} char - The letter to check.
     * @return {boolean} True if the character is upper case.
     */
    isUpperCase(char) {
        return char == char.toUpperCase();
    }

    /**
     * Check if an object is in an array.
     * @param {Array} array - The array to check.
     * @param {Object} object - The object to check.
     * @return {boolean} True if object in in the array.
     */
    isInArray(array, object) {
        return array.indexOf(object) !== -1;
    }

    /**
     * Generates an array with elements 0 to n - 1 elements of length n in random order.
     * @param {int} n - The length of the array.
     * @return {Array} The randomly shuffled array.
     */
    generateShuffledArray(n) {
        let array = [];

        // Initialize the array
        for (let i = 0; i < n; i++) {
            array.push(i);
        }

        return this.shuffleArray(array);
    }

    /**
     * Shuffles the elements of an array. Does not alter original array.
     * @param {Array} array - The array to shuffle.
     * @return {Array} The shuffled array.
     */
    shuffleArray(array) {
        const shuffleArray = array.slice(0);
        let swap, temp;

        for (let i = shuffleArray.length; i > 0; i--) {
            swap = Math.floor(Math.random() * i);
            temp = shuffleArray[i - 1];
            shuffleArray[i - 1] = shuffleArray[swap];
            shuffleArray[swap] = temp;
        }

        return shuffleArray;
    }

    /**
     * Check if the end of a string ends with a punctuation symbol.
     * @param {string} string - The string to check.
     * @return {boolean} True if the string ends with a punctuation symbol.
     */
    endsWithPunc(string) {
        return string.endsWith('.') || string.endsWith('!') || string.endsWith('?');
    }

};
