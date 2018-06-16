/**
 * NTwitBot - retrieve.js
 * @file High level Twitter data retriever.
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const Utils = require('./utils.js');

/**
 * Data retriever class. Retrieves and pre-processes data from Twitter.
 */
class Retrieve {

    /**
     * Initialize the class.
     * @param {Twitter} twitterHandler - The Twitter API object for making API calls.
     */
    constructor(twitterHandler) {
        this.twitterHandler = twitterHandler;
        this.TWEETS_TO_TRACK = 3000;
    }

    /**
     * Retrieves new mentions of the bot, and saves the current state if needed.
     * @param {string} lastID - The last mention that was received.
     * @return {Promise} Resolves with any new mentions of the bot.
     */
    retrieveMentions(lastID) {
        const mentionData = {};

        // Retrieve since last mention or last 200
        if (lastID !== 0) {
            mentionData.since_id = lastID;
        } else {
            mentionData.count = 200;
        }

        return this.twitterHandler.getMentions(mentionData).then((mentions) => {
            return mentions;
        });
    }

    /**
     * Retrieves and processed new tweets of tracked users.
     * @param {Object} trackedUsers - The tracked users data from the state.
     * @return {Promise} Resolves with the new tweets.
     */
    retrieveTweets(trackedUsers) {
        const tweetRetrievals = [];

        for (const userID in trackedUsers) {
            const lastTweetID = trackedUsers[userID];
            const requestData = {
                user_id: userID,
                trim_user: true
            };

            // If the user has been processed before
            if (lastTweetID !== 0) {
                requestData.count = 200;
                requestData.since_id = lastTweetID;
                tweetRetrievals.push(this.retrieveForExisting(requestData));
            // .. or the user has NOT been processed before
            } else {
                tweetRetrievals.push(this.retrieveForNew(requestData));
            }
        }

        // Wait until all retrievals are done
        return Promise.all(tweetRetrievals);
    }

    /* eslint-disable no-param-reassign */
    /**
     * Retrieves new tweets from an existing user. Only specify one argument.
     * @private
     * @param {Object} params - The data to be used for making twitter requests.
     * @param {Object[]} [tweetsRetrieved] - Parameter used by recursive call. Leave undefined.
     * @return {Object[]} Resolves with an array of tweets.
     */
    retrieveForExisting(params, tweetsRetrieved) {
        // Copy object to allow for proper unit testing
        const request = Object.assign({}, params);
        const firstReq = !request.hasOwnProperty('max_id');

        // Initialize recursive variables
        if (firstReq) {
            tweetsRetrieved = [];
            Utils.log(`Retrieving most recent tweets from user with ID: "${request.user_id}"`);
        }

        return this.twitterHandler.getTweets(request).then((tweets) => {
            // Do not count the last tweet as it might be the first tweet of the next request
            const numRetrieved = tweets.length - 1;

            if (tweets.length === 0) {
                Utils.log('    No new tweets found');

                return {
                    done: true,
                    tweets: tweetsRetrieved,
                    totalRetrieved: 0
                };
            }

            // If the max ID from the request is the oldest tweet in the request (i.e. only one tweet returned)
            // or only one tweet was found on the first request..
            if (request.max_id === tweets[tweets.length - 1].id_str || firstReq && tweets.length === 1) {
                tweetsRetrieved.push(tweets[0]);

                Utils.log('    Retrieved 1 tweet');
                Utils.log(`    Finished retrieving ${tweetsRetrieved.length} tweets`);

                return {
                    done: true,
                    tweets: tweetsRetrieved
                };
            }

            for (let i = 0; i < numRetrieved; i++) {
                tweetsRetrieved.push(tweets[i]);
            }

            Utils.log(`    Retrieved ${numRetrieved} tweets`);

            // Set the max ID of the next request to the oldest tweet in the previous request
            const nextRequest = Object.assign({}, request);
            nextRequest.max_id = tweets[tweets.length - 1].id_str;

            return {
                done: false,
                request: nextRequest,
                tweetsRetrieved: tweetsRetrieved
            };
        }).then((next) => {
            if (!next.done) {
                return this.retrieveForExisting(next.request, next.tweetsRetrieved);
            } else {
                return next.tweets;
            }
        });
    }

    /**
     * Retrieves new tweets from a newly added user. Only specify one argument.
     * @private
     * @param {Object} params - The data to be used for making twitter requests.
     * @param {int} [tweetsLeft] - Used by recursive call. Leave undefined.
     * @param {Object[]} [tweetsRetrieved] - Used by recursive call. Leave undefined.
     * @return {Promise} Resolves with an object (The tweet data and total number of tweets retrieved).
     */
    retrieveForNew(params, tweetsLeft, tweetsRetrieved) {
        // Copy object to allow for proper unit testing
        const request = Object.assign({}, params);

        // If first request..
        if (!tweetsLeft) {
            request.count = 200;
            tweetsLeft = this.TWEETS_TO_TRACK;
            tweetsRetrieved = [];

            Utils.log(`New user with ID: "${request.user_id}" added`);
            Utils.log(`    Retrieving most recent ${this.TWEETS_TO_TRACK} tweets`);
        }

        return this.twitterHandler.getTweets(request).then((tweets) => {
            const numRetrieved = tweets.length - 1;

            // If only one tweet was returned and it was the max ID tweet requested..
            if (request.max_id === tweets[tweets.length - 1].id_str) {
                tweetsRetrieved.push(tweets[0]);

                Utils.log(`    Retrieved ${tweetsRetrieved.length}/${this.TWEETS_TO_TRACK} tweets`);
                Utils.log('    Reached twitter\'s max tweet retrieval limit.');
                Utils.log('    Finished retrieving tweets');

                return {
                    done: true,
                    tweets: tweetsRetrieved
                };
            }

            // If it retrieved more tweets than what was needed..
            if (numRetrieved + 1 >= tweetsLeft) {
                for (let i = 0; i < tweetsLeft; i++) {
                    tweetsRetrieved.push(tweets[i]);
                }

                Utils.log(`    Retrieved ${tweetsRetrieved.length}/${this.TWEETS_TO_TRACK} tweets`);
                Utils.log('    Finished retrieving tweets');
                return {
                    done: true,
                    tweets: tweetsRetrieved
                };
            }

            for (let i = 0; i < numRetrieved; i++) {
                tweetsRetrieved.push(tweets[i]);
            }
            tweetsLeft -= numRetrieved;

            Utils.log(`    Retrieved ${tweetsRetrieved.length}/${this.TWEETS_TO_TRACK} tweets`);

            // Set newest ID for next request to oldest ID of the previous request
            const nextRequest = Object.assign({}, request);
            nextRequest.max_id = tweets[tweets.length - 1].id_str;

            return {
                done: false,
                request: nextRequest,
                tweetsLeft: tweetsLeft,
                tweetsRetrieved: tweetsRetrieved
            };
        }).then((next) => {
            if (!next.done) {
                return this.retrieveForNew(next.request, next.tweetsLeft, next.tweetsRetrieved);
            } else {
                return next.tweets;
            }
        });
    }
    /* eslint-enable no-param-reassign */

}

module.exports = Retrieve;
