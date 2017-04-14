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

const twitterModule  = require('twitter'),
      fs             = require('fs'),
      action         = require('./lib/action.js'),
      data           = require('./lib/data.js'),
      event          = require('./lib/event.js'),
      generate       = require('./lib/generate.js'),
      util           = require('./lib/util.js');

const secretData = JSON.parse(fs.readFileSync('./config/secret.json')),
      twitterPkg = new twitterModule(secretData),
      utils      = new util(twitterPkg);

utils.log("Starting NTwitBot..");

const dataHandler   = new data(twitterPkg, utils),
      generator     = new generate(dataHandler, utils),
      actionHandler = new action(generator, twitterPkg),
      eventHandler  = new event(twitterPkg, actionHandler, dataHandler, utils);

const userData = {
    include_entities: false,
    skip_status: true
};

// Verify secret data
twitterPkg.get('account/verify_credentials', userData, (error, account, response) => {
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
