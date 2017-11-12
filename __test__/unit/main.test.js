/*
 * NTwitBot - main.test.js
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

const Main = require('../../lib/main.js');
const main = new Main({}, { debug: false });

describe('Main', () => {
    describe('Initialization', () => {
        let verifyMock, initStateMock, createDataDirMock;

        beforeAll(() => {
            verifyMock = jest.spyOn(main.twitterHandler, 'verify').mockReturnValue(Promise.resolve('001'));
            initStateMock = jest.spyOn(main, 'initState').mockReturnValue(Promise.resolve());
            createDataDirMock = jest.spyOn(main.dataHandler, 'createDataDir').mockReturnValue(Promise.resolve());
        });

        afterEach(() => {
            verifyMock.mockClear();
            initStateMock.mockClear();
            createDataDirMock.mockClear();
        });

        afterAll(() => {
            verifyMock.mockRestore();
            initStateMock.mockRestore();
            createDataDirMock.mockRestore();
        });

        it('should initialize the state on twitter verification success', () => {
            expect.assertions(2);
            return main.init().then(() => {
                expect(verifyMock).toHaveBeenCalledTimes(1);
                expect(initStateMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should create a blank directory', () => {
            expect.assertions(1);
            return main.init().then(() => {
                expect(createDataDirMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should throw an Error if an error occurs verifying twitter data', () => {
            verifyMock.mockReturnValueOnce(Promise.reject({}));

            expect.assertions(1);
            return expect(main.init()).rejects.toEqual(expect.any(Error));
        });
    });

    describe('State Initialization', () => {
        let readStateMock;

        beforeEach(() => {
            readStateMock = jest.spyOn(main.dataHandler, 'readState');
        });

        afterEach(() => {
            readStateMock.mockRestore();
        });

        it('set the saved state if a state file does exist', () => {
            const state = { trackedUsers: { '001': '5001' }, lastMention: 5003 };
            readStateMock.mockReturnValue(Promise.resolve(state));

            expect.assertions(2);
            return main.initState().then(() => {
                expect(readStateMock).toHaveBeenCalledTimes(1);
                expect(main.state).toBe(state);
            });
        });

        it('set a blank state if a state file does not exist', () => {
            readStateMock.mockReturnValue(Promise.resolve(null));

            expect.assertions(2);
            return main.initState().then(() => {
                expect(readStateMock).toHaveBeenCalledTimes(1);
                expect(main.state).toEqual({ trackedUsers: {}, lastMention: 0 });
            });
        });
    });

    describe('Update', () => {
        let saveStateMock, sendTweetMock, handleTweetsMock, handleMentionsMock;

        beforeAll(() => {
            saveStateMock = jest.spyOn(main.dataHandler, 'saveState').mockReturnValue(Promise.resolve());
            sendTweetMock = jest.spyOn(main, 'sendTweet').mockReturnValue(Promise.resolve(true));
            handleTweetsMock = jest.spyOn(main, 'handleTweets').mockReturnValue(Promise.resolve(true));
            handleMentionsMock = jest.spyOn(main, 'handleMentions').mockReturnValue(Promise.resolve(true));
        });

        afterEach(() => {
            saveStateMock.mockClear();
            sendTweetMock.mockClear();
            handleTweetsMock.mockClear();
            handleMentionsMock.mockClear();
        });

        afterAll(() => {
            saveStateMock.mockRestore();
            sendTweetMock.mockRestore();
            handleTweetsMock.mockRestore();
            handleMentionsMock.mockRestore();
        });

        it('should request to handle new tweets', () => {
            expect.assertions(1);
            return main.runUpdate().then(() => {
                expect(handleTweetsMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should request to handle new mentions', () => {
            expect.assertions(1);
            return main.runUpdate().then(() => {
                expect(handleMentionsMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should save the state if there is new tweets', () => {
            handleMentionsMock.mockReturnValueOnce(Promise.resolve(false));

            expect.assertions(2);
            return main.runUpdate().then(() => {
                expect(saveStateMock).toHaveBeenCalledTimes(1);
                expect(saveStateMock).toHaveBeenCalledWith(main.state);
            });
        });

        it('should save the state if there is new mentions', () => {
            handleTweetsMock.mockReturnValueOnce(Promise.resolve(false));

            expect.assertions(2);
            return main.runUpdate().then(() => {
                expect(saveStateMock).toHaveBeenCalledTimes(1);
                expect(saveStateMock).toHaveBeenCalledWith(main.state);
            });
        });

        it('should send a tweet', () => {
            expect.assertions(1);
            return main.runUpdate().then(() => {
                expect(sendTweetMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should properly handle an error trying to handle tweets', () => {
            handleMentionsMock.mockReturnValueOnce(Promise.reject());

            expect.assertions(1);
            return expect(main.runUpdate()).resolves.toBeUndefined();
        });
    });

    describe('Tweet Handling', () => {
        let updateTrackedMock, retrieveTweetsMock, processRetrievalsMock, saveTweetDataMock, processTweetsMock;

        beforeAll(() => {
            updateTrackedMock = jest.spyOn(main, 'updateTracked').mockReturnValue(Promise.resolve());
            retrieveTweetsMock = jest.spyOn(main.retriever, 'retrieveTweets').mockReturnValue(Promise.resolve([]));
            processRetrievalsMock = jest.spyOn(main, 'processRetrievals').mockReturnValue([]);
            saveTweetDataMock = jest.spyOn(main.dataHandler, 'saveTweetData').mockReturnValue(Promise.resolve());
            processTweetsMock = jest.spyOn(main.processor, 'processTweets').mockReturnValue([]);
        });

        afterEach(() => {
            updateTrackedMock.mockClear();
            retrieveTweetsMock.mockClear();
            processRetrievalsMock.mockClear();
            saveTweetDataMock.mockClear();
            processTweetsMock.mockClear();
        });

        afterAll(() => {
            updateTrackedMock.mockRestore();
            retrieveTweetsMock.mockRestore();
            processRetrievalsMock.mockRestore();
            saveTweetDataMock.mockRestore();
            processTweetsMock.mockRestore();
        });

        it('should update tracked users', () => {
            expect.assertions(1);
            return main.handleTweets().then(() => {
                expect(updateTrackedMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should retrieve new tweets', () => {
            expect.assertions(1);
            return main.handleTweets().then(() => {
                expect(retrieveTweetsMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should process new tweet retrievals', () => {
            expect.assertions(1);
            return main.handleTweets().then(() => {
                expect(processRetrievalsMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should save tweet data if there is new tweets', () => {
            const tweets = [{ text: 'Some tweet' }];
            processRetrievalsMock.mockReturnValueOnce(tweets);
            processTweetsMock.mockReturnValueOnce(tweets);

            expect.assertions(4);
            return main.handleTweets().then(() => {
                expect(processTweetsMock).toHaveBeenCalledTimes(1);
                expect(processTweetsMock).toHaveBeenCalledWith(tweets);
                expect(saveTweetDataMock).toHaveBeenCalledTimes(1);
                expect(saveTweetDataMock).toHaveBeenCalledWith(tweets);
            });
        });

        it('should properly handle if an error occurs updating tracked users', () => {
            updateTrackedMock.mockReturnValueOnce(Promise.reject({}));

            expect.assertions(1);
            return expect(main.handleTweets()).resolves.toBe(false);
        });

        it('should throw an Error if an error occurs saving tweet data', () => {
            const tweets = [{ text: 'Some tweet' }];
            processRetrievalsMock.mockReturnValueOnce(tweets);
            saveTweetDataMock.mockReturnValueOnce(Promise.reject({}));

            expect.assertions(1);
            return expect(main.handleTweets()).rejects.toEqual(expect.any(Error));
        });
    });

    describe('Retrieval Processing', () => {
        const retrievals = [
            [{ user: { id_str: '001' }, text: 'Test one.', id_str: '5001' }],
            [{ user: { id_str: '002' }, text: 'Test two.', id_str: '5002' }]
        ];
        const combined = [ retrievals[0][0], retrievals[1][0] ];

        beforeEach(() => {
            main.state = {
                trackedUsers: {},
                lastMention: 0
            };
        });

        it('should combine the tweets from retrievals into a single array', () => {
            expect(main.processRetrievals(retrievals)).toEqual(combined);
        });

        it('should update the state with the most recent tweet ID', () => {
            main.processRetrievals(retrievals);
            expect(main.state).toEqual({
                trackedUsers: { '001': '5001', '002': '5002' },
                lastMention: 0
            });
        });

        it('should ignore retweeted tweets', () => {
            const retrievalsWithRT = [
                [{ user: { id_str: '001' }, text: 'Test one.', id_str: '5001', retweeted_status: true }]
            ];

            expect(main.processRetrievals(retrievalsWithRT)).toEqual([]);
        });
    });

    describe('Updating Tracked Users', () => {
        let getFollowingMock;

        beforeEach(() => {
            getFollowingMock = jest.spyOn(main.twitterHandler, 'getFollowing');
            main.state = { trackedUsers: {}, lastMention: 0 };
        });

        afterEach(() => {
            getFollowingMock.mockRestore();
        });

        it('should retrieve a list of followed users', () => {
            getFollowingMock.mockReturnValueOnce(Promise.resolve({ ids: [] }));

            expect.assertions(1);
            return main.updateTracked().then(() => {
                expect(getFollowingMock).toHaveBeenCalledTimes(1);
            });
        });

        it('should add any new users to the state', () => {
            getFollowingMock.mockReturnValueOnce(Promise.resolve({ ids: [ '001' ] }));

            expect.assertions(1);
            return main.updateTracked().then(() => {
                expect(main.state).toEqual({ trackedUsers: { '001': 0 }, lastMention: 0 });
            });
        });

        it('should remove any unfollowed users from the state', () => {
            main.state = { trackedUsers: { '001': '5001' }, lastMention: 0 };
            getFollowingMock.mockReturnValueOnce(Promise.resolve({ ids: [] }));

            expect.assertions(1);
            return main.updateTracked().then(() => {
                expect(main.state).toEqual({ trackedUsers: {}, lastMention: 0 });
            });
        });
    });

    describe('Mention Handling', () => {
        let sendTweetMock, retrieveMentionsMock;

        beforeAll(() => {
            sendTweetMock = jest.spyOn(main, 'sendTweet').mockReturnValue(Promise.resolve());
        });

        beforeEach(() => {
            retrieveMentionsMock = jest.spyOn(main.retriever, 'retrieveMentions');
        });

        afterEach(() => {
            sendTweetMock.mockClear();
            retrieveMentionsMock.mockRestore();
        });

        afterAll(() => {
            sendTweetMock.mockRestore();
        });

        it('should retrieve recents mentions', () => {
            retrieveMentionsMock.mockReturnValueOnce(Promise.resolve([]));

            return main.handleMentions().then(() => {
                expect(retrieveMentionsMock).toHaveBeenCalledTimes(1);
                expect(retrieveMentionsMock).toHaveBeenCalledWith(main.state.lastMention);
            });
        });

        it('should resolve with true if there are new mentions', () => {
            retrieveMentionsMock.mockReturnValueOnce(
                Promise.resolve([{ id_str: '5001', user: { screen_name: 'testuser' } }])
            );

            expect.assertions(1);
            return main.handleMentions().then((newMentions) => {
                expect(newMentions).toBe(true);
            });
        });

        it('should resolve with false if there are no new mentions', () => {
            retrieveMentionsMock.mockReturnValueOnce(Promise.resolve([]));

            expect.assertions(1);
            return main.handleMentions().then((newMentions) => {
                expect(newMentions).toBe(false);
            });
        });

        it('should send a tweet for each mention', () => {
            retrieveMentionsMock.mockReturnValueOnce(
                Promise.resolve([{ id_str: '5001', user: { screen_name: 'testuser' } }])
            );

            expect.assertions(2);
            return main.handleMentions().then(() => {
                expect(sendTweetMock).toHaveBeenCalledTimes(1);
                expect(sendTweetMock).toHaveBeenCalledWith('5001', 'testuser');
            });
        });

        it('should update the state with the most recent mention', () => {
            retrieveMentionsMock.mockReturnValueOnce(
                Promise.resolve([
                    { id_str: '5001', user: { screen_name: 'testuser1' } },
                    { id_str: '5002', user: { screen_name: 'testuser2' } }
                ])
            );

            expect.assertions(1);
            return main.handleMentions().then(() => {
                expect(main.state.lastMention).toBe('5001');
            });
        });

        it('should properly handle a retrieval error', () => {
            retrieveMentionsMock.mockReturnValueOnce(Promise.reject({}));

            expect.assertions(1);
            return expect(main.handleMentions()).resolves.toBeUndefined();
        });
    });

    describe('Sending tweets', () => {
        const tweetData = { tweet: 'test' };
        let readTweetDataMock, generateTweetMock, postTweetMock;

        beforeAll(() => {
            readTweetDataMock = jest.spyOn(main.dataHandler, 'readTweetData').mockReturnValue(Promise.resolve(tweetData));
            generateTweetMock = jest.spyOn(main.generator, 'generateTweet').mockReturnValue('tweet');
            postTweetMock = jest.spyOn(main.twitterHandler, 'postTweet').mockReturnValue(Promise.resolve());
        });

        afterEach(() => {
            readTweetDataMock.mockClear();
            generateTweetMock.mockClear();
            postTweetMock.mockClear();
        });

        afterAll(() => {
            readTweetDataMock.mockRestore();
            generateTweetMock.mockRestore();
            postTweetMock.mockRestore();
        });

        it('should generate a tweet from tweet data', () => {
            expect.assertions(3);
            return main.sendTweet().then(() => {
                expect(readTweetDataMock).toHaveBeenCalledTimes(1);
                expect(generateTweetMock).toHaveBeenCalledTimes(1);
                expect(generateTweetMock).toHaveBeenCalledWith(tweetData);
            });
        });

        it('should properly send a random tweet', () => {
            expect.assertions(2);
            return main.sendTweet().then(() => {
                expect(postTweetMock).toHaveBeenCalledTimes(1);
                expect(postTweetMock).toHaveBeenCalledWith('tweet', undefined, undefined);
            });
        });

        it('should properly send a random reply tweet', () => {
            expect.assertions(2);
            return main.sendTweet('001', 'testuser').then(() => {
                expect(postTweetMock).toHaveBeenCalledTimes(1);
                expect(postTweetMock).toHaveBeenCalledWith('tweet', '001', 'testuser');
            });
        });

        it('should properly handle if an error occurs posting the tweet', () => {
            postTweetMock.mockReturnValueOnce(Promise.reject({}));

            expect.assertions(1);
            return expect(main.sendTweet()).resolves.toBeUndefined();
        });

        it('should throw an Error if an error occurs reading the database', () => {
            readTweetDataMock.mockReturnValueOnce(Promise.reject({}));

            expect.assertions(1);
            return expect(main.sendTweet()).rejects.toEqual(expect.any(Error));
        });
    });
});
