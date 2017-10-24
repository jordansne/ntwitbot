/*
 * NTwitBot - retrieve.test.js
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

const Retrieve  = require('../../lib/retrieve.js');
const Twitter   = require('../../lib/twitter.js');
const Util      = require('../../lib/util.js');
const tweetBuilder = require('../builders/tweetbuilder.js');

const utils = new Util();
const retriever = new Retrieve(new Twitter({}, utils), utils);

describe('Retrieve', () => {

    describe('Mention Retrievals', () => {
        const getMentionsSpy = jest.spyOn(retriever.twitterHandler, 'getMentions');

        afterEach(() => {
            getMentionsSpy.mockReset();
        });

        it('should retrieve all mentions of the user', () => {
            getMentionsSpy.mockImplementation(() => Promise.resolve({}));

            return retriever.retrieveMentions(0).then((mentions) => {
                expect(mentions).toBeDefined();
                expect(getMentionsSpy).toHaveBeenCalledWith({ count: 200 });
            });
        });

        it('should retrieve all mentions since a specified ID of the user', () => {
            getMentionsSpy.mockImplementation(() => Promise.resolve({}));

            return retriever.retrieveMentions('5001').then((mentions) => {
                expect(mentions).toBeDefined();
                expect(getMentionsSpy).toHaveBeenCalledWith({ since_id: '5001' });
            });
        });
    });

    describe('Tweet Retrievals', () => {
        describe('Existing Users', () => {
            let retrieveForExistingSpy, getTweetsSpy;

            beforeEach(() => {
                retrieveForExistingSpy = jest.spyOn(retriever, 'retrieveForExisting');
                getTweetsSpy = jest.spyOn(retriever.twitterHandler, 'getTweets');
            });

            afterEach(() => {
                retrieveForExistingSpy.mockRestore();
                getTweetsSpy.mockRestore();
            });

            it('should specify the correct parameters for a retrieval', () => {
                const users = { '001': '5001', '002': '5002' };
                retrieveForExistingSpy.mockImplementation(() => Promise.resolve({}));

                return retriever.retrieveTweets(users).then((tweets) => {
                    expect(tweets).toEqual([ {}, {} ]);
                    expect(retrieveForExistingSpy).toHaveBeenCalledTimes(2);
                    expect(retrieveForExistingSpy).toHaveBeenCalledWith({
                        user_id: '001',
                        since_id: '5001',
                        count: 200,
                        trim_user: true
                    });
                    expect(retrieveForExistingSpy).toHaveBeenCalledWith({
                        user_id: '002',
                        since_id: '5002',
                        count: 200,
                        trim_user: true
                    });
                });
            });

            it('should handle no new tweets correctly', () => {
                const users = { '001': '5001' };
                getTweetsSpy.mockImplementation(() => Promise.resolve([]));

                return retriever.retrieveTweets(users).then((tweets) => {
                    expect(tweets).toEqual([ [] ]);
                    expect(getTweetsSpy).toHaveBeenCalledTimes(1);
                    expect(getTweetsSpy).toHaveBeenCalledWith({
                        user_id: '001',
                        since_id: '5001',
                        trim_user: true,
                        count: 200
                    });
                });
            });

            describe('when receivable tweets < 200', () => {
                it('should properly make Twitter API requests', () => {
                    const users = { '001': '5001' };
                    const mockTweets = tweetBuilder.generateRandomTweets(5);
                    getTweetsSpy
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 5)))
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(4, 5)));

                    return retriever.retrieveTweets(users).then(() => {
                        expect(getTweetsSpy).toHaveBeenCalledTimes(2);
                        expect(getTweetsSpy).toHaveBeenCalledWith({
                            user_id: '001',
                            since_id: '5001',
                            trim_user: true,
                            count: 200
                        });
                        expect(getTweetsSpy).toHaveBeenCalledWith({
                            user_id: '001',
                            since_id: '5001',
                            trim_user: true,
                            count: 200,
                            max_id: mockTweets[4].id_str
                        });
                    });
                });

                it('should return the correct tweets', () => {
                    const users = { '001': '5001' };
                    const mockTweets = tweetBuilder.generateRandomTweets(5);
                    getTweetsSpy
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 5)))
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(4, 5)));

                    return retriever.retrieveTweets(users).then((tweets) => {
                        expect(tweets).toEqual([ mockTweets ]);
                    });
                });
            });

            describe('when receivable tweets > 200', () => {
                it('should properly make Twitter API requests', () => {
                    const users = { '001': '5001' };
                    const mockTweets = tweetBuilder.generateRandomTweets(220);
                    getTweetsSpy
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 200)))
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(199, 210)))
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(209, 210)));

                    return retriever.retrieveTweets(users).then(() => {
                        expect(getTweetsSpy).toHaveBeenCalledTimes(3);
                        expect(getTweetsSpy).toHaveBeenCalledWith({
                            user_id: '001',
                            since_id: '5001',
                            trim_user: true,
                            count: 200
                        });
                        expect(getTweetsSpy).toHaveBeenCalledWith({
                            user_id: '001',
                            since_id: '5001',
                            trim_user: true,
                            count: 200,
                            max_id: mockTweets[199].id_str
                        });
                        expect(getTweetsSpy).toHaveBeenCalledWith({
                            user_id: '001',
                            since_id: '5001',
                            trim_user: true,
                            count: 200,
                            max_id: mockTweets[209].id_str
                        });
                    });
                });

                it('should return the correct tweets', () => {
                    const users = { '001': '5001' };
                    const mockTweets = tweetBuilder.generateRandomTweets(210);
                    getTweetsSpy
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 200)))
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(199, 210)))
                        .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(209, 210)));

                    return retriever.retrieveTweets(users).then((tweets) => {
                        expect(tweets).toEqual([ mockTweets ]);
                    });
                });
            });
        });

        describe('New Users', () => {
            let retrieveForNewSpy, getTweetsSpy;

            beforeEach(() => {
                retrieveForNewSpy = jest.spyOn(retriever, 'retrieveForNew');
                getTweetsSpy = jest.spyOn(retriever.twitterHandler, 'getTweets');
            });

            afterEach(() => {
                retrieveForNewSpy.mockRestore();
                getTweetsSpy.mockRestore();
            });

            it('should specify the correct parameters for a retrieval', () => {
                const users = { '001': 0, '002': 0 };
                retrieveForNewSpy.mockImplementation(() => Promise.resolve({}));

                return retriever.retrieveTweets(users).then((tweets) => {
                    expect(tweets).toEqual([ {}, {} ]);
                    expect(retrieveForNewSpy).toHaveBeenCalledTimes(2);
                    expect(retrieveForNewSpy).toHaveBeenCalledWith({
                        user_id: '001',
                        trim_user: true
                    });
                    expect(retrieveForNewSpy).toHaveBeenCalledWith({
                        user_id: '002',
                        trim_user: true
                    });
                });
            });

            describe('when receivable tweets < 200', () => {
                describe('when tracked tweets > receivable tweets', () => {
                    it('should properly make Twitter API requests', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(5);
                        retriever.TWEETS_TO_TRACK = 500;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 5)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(4, 5)));

                        return retriever.retrieveTweets(users).then(() => {
                            expect(getTweetsSpy).toHaveBeenCalledTimes(2);
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200
                            });
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200,
                                max_id: mockTweets[4].id_str
                            });
                        });
                    });

                    it('should return the correct tweets', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(5);
                        retriever.TWEETS_TO_TRACK = 500;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 5)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(4, 5)));

                        return retriever.retrieveTweets(users).then((tweets) => {
                            expect(tweets).toEqual([ mockTweets ]);
                        });
                    });
                });

                describe('when tracked tweets < receivable tweets', () => {
                    it('should properly make Twitter API requests', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(10);
                        retriever.TWEETS_TO_TRACK = 5;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 10)));

                        return retriever.retrieveTweets(users).then(() => {
                            expect(getTweetsSpy).toHaveBeenCalledTimes(1);
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200
                            });
                        });
                    });

                    it('should return the correct tweets', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(10);
                        retriever.TWEETS_TO_TRACK = 5;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 10)));

                        return retriever.retrieveTweets(users).then((tweets) => {
                            expect(tweets).toEqual([ mockTweets.slice(0, 5) ]);
                        });
                    });
                });
            });

            describe('when receivable tweets > 200', () => {
                describe('when tracked tweets > receivable tweets', () => {
                    it('should properly make Twitter API requests', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(210);
                        retriever.TWEETS_TO_TRACK = 500;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 200)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(199, 210)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(209, 210)));

                        return retriever.retrieveTweets(users).then(() => {
                            expect(getTweetsSpy).toHaveBeenCalledTimes(3);
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200
                            });
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200,
                                max_id: mockTweets[199].id_str
                            });
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200,
                                max_id: mockTweets[209].id_str
                            });
                        });
                    });

                    it('should return the correct tweets', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(210);
                        retriever.TWEETS_TO_TRACK = 500;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 200)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(199, 210)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(209, 210)));

                        return retriever.retrieveTweets(users).then((tweets) => {
                            expect(tweets).toEqual([ mockTweets ]);
                        });
                    });
                });

                describe('when tracked tweets < receivable tweets', () => {
                    it('should properly make Twitter API requests', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(220);
                        retriever.TWEETS_TO_TRACK = 210;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 200)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(199, 220)));

                        return retriever.retrieveTweets(users).then(() => {
                            expect(getTweetsSpy).toHaveBeenCalledTimes(2);
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200
                            });
                            expect(getTweetsSpy).toHaveBeenCalledWith({
                                user_id: '001',
                                trim_user: true,
                                count: 200,
                                max_id: mockTweets[199].id_str
                            });
                        });
                    });

                    it('should return the correct tweets', () => {
                        const users = { '001': 0 };
                        const mockTweets = tweetBuilder.generateRandomTweets(220);
                        retriever.TWEETS_TO_TRACK = 210;
                        getTweetsSpy
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(0, 200)))
                            .mockImplementationOnce(() => Promise.resolve(mockTweets.slice(199, 220)));

                        return retriever.retrieveTweets(users).then((tweets) => {
                            expect(tweets).toEqual([ mockTweets.slice(0, 210)] );
                        });
                    });
                });
            });
        });
    });
});
