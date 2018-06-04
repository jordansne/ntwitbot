/**
 * NTwitBot - main.js
 * @file Primary application logic.
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const timers        = require('timers');

const Data          = require('./data.js'),
      Generate      = require('./generate.js'),
      Process       = require('./process.js'),
      Retrieve      = require('./retrieve.js'),
      Twitter       = require('./twitter.js'),
      Utils         = require('./utils.js');

/**
 * Primary class of the bot. Handles all primary functions.
 */
module.exports = class Main {

    /**
     * Initialize bot modules.
     * @param {Object} secretData - The secret data for the Twitter API.
     * @param {Object} setup - The setup object from the config.
     */
    constructor(secretData, setup) {
        this.TWEET_INTERVAL = 15 /*min*/ * 60 /*s*/ * 1000 /*ms*/;

        this.secretData = secretData;
        this.setup = setup;

        Utils.log(`Starting NTwitBot ${process.env.npm_package_version}..`);
        Utils.setDebug(this.setup.debug);

        this.dataHandler    = new Data();
        this.processor      = new Process();
        this.generator      = new Generate();
        this.twitterHandler = new Twitter(this.secretData);
        this.retriever      = new Retrieve(this.twitterHandler);
    }

    /**
     * Initialize and setup bot.
     * @returns {Promise} Resolves when done setting up.
     */
    init() {
        return this.twitterHandler.verify().then((userID) => {
            Utils.log(`Verified Bot credentials, User ID is: ${userID}`);

            return this.initState();
        }).then(() => {
            return this.dataHandler.createDataDir();

        }).catch((error) => {
            Utils.logError('FATAL: Failed to initialize bot', error);
            throw new Error('Initializaion failure');
        });
    }

    /**
     * Initializes the state object.
     * @private
     * @return {Promise} Resolves when done setting the state.
     */
    initState() {
        return this.dataHandler.readState().then((state) => {
            if (state === null) {
                this.state = {
                    trackedUsers: {}, // String dictionary with format 'userID : lastTweetID'
                    lastMention: 0    // Tweet ID of Last mention
                };
            } else {
                this.state = state;
            }
        });
    }

    /**
     * Starts the event handler.
     */
    start() {
        this.runUpdate();

        timers.setInterval(() => {
            this.runUpdate();
        }, this.TWEET_INTERVAL);
    }

    /**
     * Scheduled 15 min interval bot update.
     */
    runUpdate() {
        let updateState = false;

        Utils.log('');
        Utils.log('******************* Running update ******************* ');
        Utils.log('');

        return this.handleTweets().then((newTweets) => {
            if (newTweets) {
                updateState = true;
            }

            return this.handleMentions();
        }).then((newMentions) => {
            if (newMentions) {
                updateState = true;
            }

            if (updateState) {
                return this.dataHandler.saveState(this.state);
            }
        }, (error) => {
            Utils.logError('Failed to handle new mentions (skipping until next update)', error);

        }).then(() => {
            this.sendTweet();
        });
    }

    /**
     * Handles any new tweets from tracked users. Terminates bot upon save failure.
     * @return {Promise} Resolves with a boolean if new tweets were retrievd when done processing.
     */
    handleTweets() {
        return this.updateTracked().then(() => {
            return this.retriever.retrieveTweets(this.state.trackedUsers);

        }).then((retrievals) => {
            const tweets = this.processRetrievals(retrievals);

            if (tweets.length > 0) {
                Utils.log(`Retrieved tweets: ${tweets.length} tweets to process`);
                return this.dataHandler.saveTweetData(this.processor.processTweets(tweets));
            } else {
                Utils.log('Retrieved tweets: No tweets to process');
                return Promise.reject();
            }
        }, (error) => {
            Utils.logError('Failed to retrieve new tweets, skipping until next update', error);
            return Promise.reject();

        }).then(() => {
            return true;
        }, (error) => {
            if (error) {
                Utils.logError('FATAL: Failed to save tweet data in database', error);
                throw new Error('Database error');
            }

            return false;
        });
    }

    /**
     * Combines tweet retrievals to a single array of tweets and updates the state.
     * @private
     * @param {2D Array} retrievals - An array of tweet retrievals (array).
     * @return {Array} The array of all received tweets.
     */
    processRetrievals(retrievals) {
        const tweets = [];

        for (const retrieval of retrievals) {
            if (retrieval.length > 0) {
                const firstTweet = retrieval[0];
                this.state.trackedUsers[firstTweet.user.id_str] = firstTweet.id_str;

                for (const tweet of retrieval) {
                    if (!tweet.hasOwnProperty('retweeted_status')) {
                        tweets.push(tweet);
                    }
                }
            }
        }

        return tweets;
    }

    /**
     * Updates the currently tracked users with the bot's following list.
     * @return {Promise} Resolves when done updating.
     */
    updateTracked() {
        return this.twitterHandler.getFollowing().then((following) => {
            const ids = following.ids;

            // Add any new follows to the trackedUsers list
            for (const user of ids) {
                if (!(user in this.state.trackedUsers)) {
                    this.state.trackedUsers[user] = 0;
                }
            }

            // Remove any trackedUsers that the bot is no longer following
            for (const user in this.state.trackedUsers) {
                if (!Utils.isInArray(ids, user)) {
                    delete this.state.trackedUsers[user];
                }
            }
        });
    }

    /**
     * Handles any new mentions of the bot.
     * @return {Promise} Resolves with a boolean if new mentions were found when done retrieving and handling metions.
     */
    handleMentions() {
        return this.retriever.retrieveMentions(this.state.lastMention).then((mentions) => {
            const tweetsToSend = [];

            if (mentions.length > 0) {
                Utils.log(`Retrieved mentions: ${mentions.length} new tweets found`);

                for (const mention of mentions) {
                    tweetsToSend.push({
                        replyToID: mention.id_str,
                        replyToName: mention.user.screen_name
                    });
                }

                this.state.lastMention = mentions[0].id_str;
                for (const tweet of tweetsToSend) {
                    this.sendTweet(tweet.replyToID, tweet.replyToName);
                }

                return true;
            } else {
                Utils.log('Retrieved mentions: No new tweets found');
                return false;
            }
        }, (error) => {
            Utils.logError('Failed to retrieve new mentions (skipping)', error);
        });
    }

    /**
     * Generate and sends a tweet. Terminates bot upon database failure.
     * @param {string} [replyID] The ID of the user to reply to.
     * @param {string} [replyUser] The username of the user to reply to.
     * @return {Promise} Resolves when complete (successful or not)
     */
    sendTweet(replyID, replyUser) {
        return this.dataHandler.readTweetData().then((data) => {
            const tweet = this.generator.generateTweet(data);

            return this.twitterHandler.postTweet(tweet, replyID, replyUser).then(() => {
                Utils.log(`Generated & sent tweet: ${tweet}`);
            }, (error) => {
                Utils.logError('Failed to send tweet: Posting tweet (skipping)', error);
                // TODO Determine if retryable and retry/exit depending on result
            });

        }, (error) => {
            Utils.logError('FATAL: Failed to send tweet: Database error', error);
            throw new Error('Database error');
        });
    }

};
