/**
 * NTwitBot - data.js
 * @file File & database IO interface.
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const fs = require('fs');
const Utils = require('./utils.js');

/**
 * Database & IO handler class.
 */
module.exports = class Data {

    constructor() {
        this.DATA_DIR = './data';
        this.DATABASE_FILE = this.DATA_DIR + '/db.json';
        this.STATE_FILE = this.DATA_DIR + '/state.json';
    }

    /**
     * Sets up the environment for proper data actions.
     * @return {Promise} Resolves when done setting up.
     */
    createDataDir() {
        return new Promise((resolve, reject) => {
            fs.mkdir(this.DATA_DIR, (error) => {
                if (error && error.code !== 'EEXIST') {
                    reject(error);
                    return;
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
                Utils.logError('I/O: Failed to parse state data');
                throw error;
            }

            this.insertData(data, newData);
            return this.writeFile(this.DATABASE_FILE, data);

        }, (error) => {
            if (error.code === 'ENOENT') {
                return this.writeFile(this.DATABASE_FILE, newData);
            } else {
                throw error;
            }
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
                Utils.logError('I/O: Failed to parse database data');
                throw error;
            }
        }, (error) => {
            if (error.code === 'ENOENT') {
                Utils.logError('I/O: No database file found');
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
        return this.writeFile(this.STATE_FILE, state);
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
                Utils.logError('I/O: Failed to parse state data');
                throw error;
            }
        }, (error) => {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        });
    }

    /**
     * Write data to a file.
     * @private
     * @param {string} filePath - The path to the file.
     * @param {Object} data - The data to be saved.
     * @return {Promise} Resolves upon success.
     */
    writeFile(filePath, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, JSON.stringify(data), (error) => {
                if (error) {
                    Utils.logError('I/O: Failed to write data to: ' + filePath);
                    reject(error);
                    return;
                }

                Utils.log('I/O: Wrote data to: ' + filePath);
                resolve();
            });
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
                        Utils.logError('I/O: Failed to read data from: ' + filePath);
                        reject(error);
                        return;
                    }

                    resolve(data);
                });
            });
        });
    }

};
