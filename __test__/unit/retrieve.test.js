/**
 * NTwitBot - retrieve.test.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const Retrieve  = require('../../src/retrieve.js');
const Twitter   = require('../../src/twitter.js');
const tweetBuilder = require('../builders/tweetbuilder.js');

const retriever = new Retrieve(new Twitter({}));

describe('Retrieve', () => {
    describe('Mention Retrievals', () => {
        let getMentionsSpy;

        beforeEach(() => {
            getMentionsSpy = jest.spyOn(retriever.twitterHandler, 'getMentions');
        });

        afterEach(() => {
            getMentionsSpy.mockRestore();
        });

        it('should retrieve all mentions of the user', () => {
            getMentionsSpy.mockReturnValueOnce(Promise.resolve([ 'mention1' ]));

            expect.assertions(2);
            return retriever.retrieveMentions(0).then((mentions) => {
                expect(mentions).toEqual([ 'mention1' ]);
                expect(getMentionsSpy).toHaveBeenCalledWith({ count: 200 });
            });
        });

        it('should retrieve all mentions since a specified ID of the user', () => {
            getMentionsSpy.mockReturnValueOnce(Promise.resolve([ 'mention1' ]));

            expect.assertions(2);
            return retriever.retrieveMentions('5001').then((mentions) => {
                expect(mentions).toEqual([ 'mention1' ]);
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
                retrieveForExistingSpy.mockReturnValue(Promise.resolve([]));

                expect.assertions(3);
                return retriever.retrieveTweets(users).then(() => {
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
                getTweetsSpy.mockReturnValue(Promise.resolve([]));

                expect.assertions(3);
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
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 5)))
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(4, 5)));

                    expect.assertions(3);
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
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 5)))
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(4, 5)));

                    expect.assertions(1);
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
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 200)))
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(199, 210)))
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(209, 210)));

                    expect.assertions(4);
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
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 200)))
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(199, 210)))
                        .mockReturnValueOnce(Promise.resolve(mockTweets.slice(209, 210)));

                    expect.assertions(1);
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
                retrieveForNewSpy.mockReturnValue(Promise.resolve([]));

                expect.assertions(3);
                return retriever.retrieveTweets(users).then(() => {
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 5)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(4, 5)));

                        expect.assertions(3);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 5)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(4, 5)));

                        expect.assertions(1);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 10)));

                        expect.assertions(2);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 10)));

                        expect.assertions(1);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 200)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(199, 210)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(209, 210)));

                        expect.assertions(4);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 200)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(199, 210)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(209, 210)));

                        expect.assertions(1);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 200)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(199, 220)));

                        expect.assertions(3);
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
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(0, 200)))
                            .mockReturnValueOnce(Promise.resolve(mockTweets.slice(199, 220)));

                        expect.assertions(1);
                        return retriever.retrieveTweets(users).then((tweets) => {
                            expect(tweets).toEqual([ mockTweets.slice(0, 210) ]);
                        });
                    });
                });
            });
        });
    });
});
