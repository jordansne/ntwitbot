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

module.exports = class Data {

    constructor(utils) {
        this.utils = utils;

        this.DATABASE_DIR = './data';
    }

    /*
     * Sets up a new directory for data saving.
     *   Returns - Promise: Resolves when done creating the directory.
     */
    setup() {
        return new Promise((resolve, reject) => {
            fs.mkdir(this.DATABASE_DIR, (error) => {
                if (error) {
                    if (error.code !== "EEXIST") {
                        reject(error);
                        return;
                    }
                }

                resolve();
            });
        });
    }

    /*
     * Saves the new data into the database.
     *   newData - Object:   Data to be saved.
     *   Returns - Promise:  Resolves when done saving data.
     */
    saveData(newData) {
        return new Promise((resolve, reject) => {
            fs.readFile(this.DATABASE_DIR + '/db.json', (error, data) => {
                if (error) {
                    if (error.code === "ENOENT") {
                        this.utils.log("I/O: No database found, creating a new one");
                        this.inputToEmpty(newData, resolve);
                    } else {
                        this.utils.logError("I/O: Failed to open database file (" + this.DATABASE_DIR + "/db.json)");
                        this.utils.logError("I/O:    Error: " + error.Error);
                    }
                } else {
                    this.inputToExisting(JSON.parse(data), newData, resolve);
                }
            });
        });
    }

    /*
     * Saves the new data into a blank database.
     *   data - Object:   Data to be saved.
     *   done - Function: Function to be called when done saving tweets.
     */
    inputToEmpty(data, done) {
        // Create an empty database
        fs.open(this.DATABASE_DIR + '/db.json', 'w', (error, fd) => {
            if (error) {
                this.utils.logError("I/O: Failed create new database file (" + this.DATABASE_DIR + "/db.json)");
                this.utils.logError("I/O:    Error: " + error.code);
                return;
            }

            fs.closeSync(fd);

            // Save data to the database
            fs.writeFile(this.DATABASE_DIR + '/db.json', JSON.stringify(data), (error, data) => {
                if (error) {
                    this.utils.logError("I/O: Failed to write new data to database file (" + this.DATABASE_DIR + "/db.json)");
                    this.utils.logError("I/O:    Error code: " + error.code);
                    return;
                }

                this.utils.log("I/O: Saved tweet data in database");
                done();
            });
        });
    }

    /*
     * Adds the data to an existing database.
     *   data    - Object:   The data that was in the database.
     *   newData - Object:   The data to be appended to the database.
     *   done    - Function: Function to be called when done saving tweets.
     */
    inputToExisting(data, newData, done) {
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

        // Save data to database
        fs.writeFile(this.DATABASE_DIR + '/db.json', JSON.stringify(data), (error, data) => {
            if (error) {
                this.utils.logError("I/O: Failed to append new data to database file (" + this.DATABASE_DIR + "/db.json)");
                this.utils.logError("I/O:    Error code: " + error.code);
                return;
            }

            this.utils.log("I/O: Appended new tweet data to database");
            done();
        });
    }

    /*
     * Saves the state in file.
     *   state - Object: Data to be saved.
     */
    saveState(state) {
        fs.writeFile(this.DATABASE_DIR + '/state.json', JSON.stringify(state), (error) => {
            if (error) {
                this.utils.logError("I/O: Failed to save bot state to file (" + this.DATABASE_DIR + "/state.json)");
                this.utils.logError("I/O:    Error code: " +  error.code);
                return;
            }

            this.utils.log("I/O: Saved bot state to file");
        });
    }

    /*
     * Gets the state from the file.
     *   Returns - Promise: Resolves with state object.
     */
    readState() {
        const STATE_FILE = this.DATABASE_DIR + '/state.json';

        return new Promise((resolve, reject) => {
            // Check that file exists..
            fs.stat(STATE_FILE, (error, stats) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        // Resolve with null if file doesn't exist
                        resolve(null);
                    } else {
                        reject(error);
                    }

                    return;
                }

                // .. then read
                fs.readFile(STATE_FILE, 'utf8', (error, data) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    let result;
                    try {
                        result = JSON.parse(data);
                    } catch (error) {
                        this.utils.logError("I/O: Failed to read bot state from file");
                        reject(error);
                        return;
                    }

                    this.utils.log("I/O: Read bot state from file");
                    resolve(result);
                });
            });
        });
    }

    /*
     * Gets word data from the database file.
     *   Returns - Object: Object containing word dictionary.
     */
    readDatabase() {
        let data;

        // Read data from tweet database
        try {
            data = fs.readFileSync(this.DATABASE_DIR + '/db.json', 'utf8');
        } catch (error) {
            if (error.code === "ENOENT") {
                this.utils.logError("I/O: No database found, could not generate tweet");
            } else {
                this.utils.logError("I/O: Failed to open database file (" + this.DATABASE_DIR + "/db.json)");
                this.utils.logError("I/O:    Error: ", error.Error);
            }
        }

        return JSON.parse(data);
    }

};
