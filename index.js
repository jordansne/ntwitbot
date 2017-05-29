/*
 * NTwitBot - index.js
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

const TwitterModule = require('twitter'),
      fs            = require('fs'),
      Action        = require('./lib/action.js'),
      Data          = require('./lib/data.js'),
      Event         = require('./lib/event.js'),
      Generate      = require('./lib/generate.js'),
      Util          = require('./lib/util.js');

const utils         = new Util(),
      secretData    = readFileObject('./config/secret.json'),
      setupData     = readFileObject('./config/setup.json'),
      twitter       = new TwitterModule(secretData);

utils.log("Starting NTwitBot..");

const dataHandler   = new Data(twitter, utils),
      generator     = new Generate(dataHandler, utils),
      actionHandler = new Action(generator, twitter, utils),
      eventHandler  = new Event(twitter, actionHandler, dataHandler, generator, utils);

const userData = {
    include_entities: false,
    skip_status: true
};

/*
 * Return secret data, stop program if error occurs.
 *   path    - String: Path to file.
 *   Returns - Object: JSON Object representation of the file contents.
 */
function readFileObject(path) {
    let read, data = null;

    try {
        read = fs.readFileSync(path);
        data = JSON.parse(read);
    } catch (err) {
        utils.logError("FATAL: Failed to verify configuration");
        utils.logError("FATAL:     Error message: " + err.message);
    }

    if (data !== null) {
        console.log(data);
        return data;
    } else {
        process.exit(1);
    }
}

// Enable debug flag if required
if (setupData.debug) {
    utils.setDebug(true);
}

// Verify secret data
twitter.get('account/verify_credentials', userData, (error, account, response) => {
    if (error) {
        if (error.code === 32) {
            utils.logError("FATAL: Incorrect secret data provided, please edit ./config/secret.json");
        } else {
            utils.logError("FATAL: Failed to verify credentials");
            utils.logError("FATAL:     Error message: " + error.message);
        }

        utils.logError("FATAL: Exiting..");
        process.exit(1);
    }

    utils.log("Verified Bot credentials, User ID is: " + account.id_str);
    dataHandler.ownID = account.id_str;

    eventHandler.start();
});
