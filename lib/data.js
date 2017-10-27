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
    createDataDir() {
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
     * @param {Object} newData - The new tweet data to be saved.
     * @return {Promise} Resolves when done saving data
     */
    saveTweetData(newData) {
        return this.readFile(this.DATABASE_FILE).then((rawData) => {
            let data;

            try {
                data = JSON.parse(rawData);
            } catch (error) {
                this.utils.logError('I/O: Failed to parse state data');
                throw error;
            }

            this.insertData(data, newData);

            return data;
        }, (error) => {
            if (error.code === 'ENOENT') {
                return newData;
            } else {
                throw error;
            }

        }).then((dataToSave) => {
            return new Promise((resolve, reject) => {
                fs.writeFile(this.DATABASE_FILE, JSON.stringify(dataToSave), (error) => {
                    if (error) {
                        this.utils.logError('I/O: Failed to write data to database file (' + this.DATABASE_FILE + ')');
                        reject(error);
                        return;
                    }

                    this.utils.log('I/O: Saved tweet data to database');
                    resolve();
                });
            });
        });
    }

    /**
     * Inserts new data to a data object. Add to the existingData by reference.
     * @private
     * @param {Object} newData - The new tweet data to be saved.
     */
    insertData(data, newData) {
        for (const key in newData) {
            if (key in data) {
                for (const entry of newData[key]) {
                    data[key].push(entry);
                }
            } else {
                data[key] = newData[key];
            }
        }
    }

    /**
     * Reads the tweet data from the database.
     * @return {Object} The tweet data object from the database.
     */
    readTweetData() {
        return this.readFile(this.DATABASE_FILE).then((data) => {
            try {
                return JSON.parse(data);
            } catch (error) {
                this.utils.logError('I/O: Failed to parse database data');
                throw error;
            }
        }, (error) => {
            if (error.code === 'ENOENT') {
                this.utils.logError('I/O: No database file found');
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
                    this.utils.logError('I/O: Failed to save bot state to file');
                    reject(error);
                    return;
                }

                this.utils.log('I/O: Saved bot state to database');
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
                this.utils.logError('I/O: Failed to parse state data');
                throw error;
            }
        }, (error) => {
            if (error.code === 'ENOENT') {
                return null;
            } else {
                this.utils.logError('I/O: Failed to read data from state file');
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
            // Check that file exists first
            fs.stat(filePath, (error) => {
                if (error) {
                    reject(error);
                    return;
                }

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
