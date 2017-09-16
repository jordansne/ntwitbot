/*
 * NTwitBot - data.js
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

const fs = require('fs');

/**
 * Database & IO handler class.
 */
module.exports = class Data {

    /**
     * Initialize the class.
     * After instantiating, call init().
     * @param {Util} utils - The utilities object needed for logging, etc.
     */
    constructor(utils) {
        this.DATA_DIR = './data';
        this.DATABASE_FILE = this.DATA_DIR + '/db.json';
        this.STATE_FILE = this.DATA_DIR + '/state.json';

        this.utils = utils;
    }

    /**
     * Sets up the environment for proper data actions.
     * @return {Promise} Resolves when done setting up.
     */
    init() {
        return new Promise((resolve, reject) => {
            fs.mkdir(this.DATA_DIR, (error) => {
                if (error) {
                    if (error.code !== 'EEXIST') {
                        reject(error);
                        return;
                    }
                }

                resolve();
            });
        });
    }

    /**
     * Saves new tweet data into the database.
     * @param {Object} data - The new tweet data to be saved.
     * @return {Promise} Resolves when done saving data with a true value
     */
    saveTweetData(data) {
        return new Promise((resolve, reject) => {
            fs.readFile(this.DATABASE_FILE, (error, oldData) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(oldData);
            });
        }).then((oldData) => {
            return this.inputToExisting(JSON.parse(oldData), data);
        }, (error) => {
            if (error.code === 'ENOENT') {
                return this.inputToEmpty(data);
            } else {
                this.utils.logError("I/O: Failed to open existing database file (" + this.DATABASE_FILE + ")");
                throw error;
            }
        });
    }

    /**
     * Saves new tweet data into a blank database.
     * @private
     * @param {Object} data - The new tweet data to be saved.
     * @return {Promise} Resolves when done saving data.
     */
    inputToEmpty(data) {
        this.utils.log("I/O: Saving new tweet data to new database");

        return new Promise((resolve, reject) => {
            // Create an empty database
            fs.open(this.DATABASE_FILE, 'w', (error, fd) => {
                if (error) {
                    this.utils.logError("I/O: Failed create new database file (" + this.DATABASE_FILE + ")");
                    reject(error);
                    return;
                }

                fs.closeSync(fd);

                // Save data to the database
                fs.writeFile(this.DATABASE_FILE, JSON.stringify(data), (error, data) => {
                    if (error) {
                        this.utils.logError("I/O: Failed to write new data to database file (" + this.DATABASE_FILE + ")");
                        reject(error);
                        return;
                    }

                    resolve(true);
                });
            });
        });
    }

    /**
     * Saves new tweet data into an existing database.
     * @private
     * @param {Object} data - The existing tweet data.
     * @param {Object} newData - The new tweet data to be saved.
     * @return {Promise} Resolves when done saving data.
     */
    inputToExisting(data, newData) {
        // For each key in the new data..
        for (let key in newData) {
            // If the it exists in existing data
            if (key in data) {
                // Push (append), new data to exist array
                for (let i = 0; i < newData[key].length; i++) {
                    data[key].push(newData[key][i]);
                }
            // .. if not, declare new array in existing data
            } else {
                data[key] = newData[key];
            }
        }

        this.utils.log("I/O: Saving new tweet data to existing database");

        return new Promise((resolve, reject) => {
            // Save data to database
            fs.writeFile(this.DATABASE_FILE, JSON.stringify(data), (error, data) => {
                if (error) {
                    this.utils.logError("I/O: Failed to append new data to database file (" + this.DATABASE_FILE + ")");
                    reject(error);
                    return;
                }

                resolve(true);
            });
        });
    }

    /**
     * Reads the tweet data from the database.
     * @return {Object} The tweet data object from the database.
     */
    readDatabase() {
        return this.readFile(this.DATABASE_FILE).then((data) => {
            try {
                return JSON.parse(data);
            } catch (error) {
                this.utils.logError("I/O: Failed to parse database data");
                throw error;
            }
        }, (error) => {
            if (error.code === 'ENOENT') {
                this.utils.logError("I/O: No database found, could not generate tweet");
            }
            throw error;
        });
    }

    /**
     * Saves the state in file.
     * @param {Object} state - The bot's state object.
     * @return {Promise} Resolves when done saving.
     */
    saveState(state) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.STATE_FILE, JSON.stringify(state), (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Gets the state from the saved state.
     * @return {Promise} Resolves with the read state object.
     */
    readState() {
        return this.readFile(this.STATE_FILE).then((data) => {
            try {
                return JSON.parse(data);
            } catch (error) {
                this.utils.logError("I/O: Failed to parse state data");
                throw error;
            }
        }, (error) => {
            // If no state file exists..
            if (error.code === 'ENOENT') {
                return null;
            } else {
                this.utils.logError("I/O: Failed to read data from state file");
                throw error;
            }
        });
    }
    /**
     * Reads data from a file.
     * @private
     * @param {string} filePath - The path to the file.
     * @return {Promise} Resolves with data read from the file.
     */
    readFile(filePath) {
        return new Promise((resolve, reject) => {
            // Check that file exists..
            fs.stat(filePath, (error, stats) => {
                if (error) {
                    reject(error);
                    return;
                }

                // .. then read
                fs.readFile(filePath, 'utf8', (error, data) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(data);
                });
            });
        });
    }

};
