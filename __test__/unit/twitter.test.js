/**
 * NTwitBot - twitter.test.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const Twitter = require('../../src/twitter.js');
const Util    = require('../../src/util.js');

const twitter = new Twitter({}, new Util());

describe('Twitter', () => {
    describe('POST Requests', () => {
        let postRequestMock;

        beforeEach(() => {
            postRequestMock = jest.spyOn(twitter, 'postRequest');
        });

        afterEach(() => {
            postRequestMock.mockRestore();
        });

        describe('Request Success Handling', () => {
            it('should post a tweet correctly', () => {
                postRequestMock.mockReturnValueOnce(Promise.resolve());

                expect.assertions(1);
                return twitter.postTweet('Test tweet.').then(() => {
                    expect(postRequestMock).toHaveBeenCalledWith('statuses/update', { status: 'Test tweet.' });
                });
            });

            it('should post a reply tweet correctly', () => {
                postRequestMock.mockReturnValueOnce(Promise.resolve());

                expect.assertions(1);
                return twitter.postTweet('Test tweet.', '5001', 'user').then(() => {
                    expect(postRequestMock).toHaveBeenCalledWith(
                        'statuses/update', { status: '@user Test tweet.', in_reply_to_status_id: '5001' }
                    );
                });
            });

            it('should send a direct message correctly', () => {
                postRequestMock.mockReturnValueOnce(Promise.resolve());

                expect.assertions(1);
                return twitter.sendDM('Test message.', '001').then(() => {
                    expect(postRequestMock).toHaveBeenCalledWith(
                        'direct_messages/new', { text: 'Test message.', user_id: '001' }
                    );
                });
            });

            it('should make proper POST requests to the node-twitter package', () => {
                const postMock = jest.spyOn(twitter.twitterAPI, 'post')
                    .mockImplementationOnce((path, requestData, cb) => {
                        cb(undefined, [ 'data' ]);
                    });

                expect.assertions(2);
                return twitter.postRequest('test/path', { id: '001' }).then((data) => {
                    expect(data).toEqual([ 'data' ]);
                    expect(postMock).toHaveBeenCalledWith('test/path', { id: '001' }, expect.any(Function));
                });
            });
        });

        describe('Request Error Handling', () => {
            it('should handle a request error when trying to send a tweet', () => {
                postRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.postTweet('')).rejects.toEqual({ error: 'test' });
            });

            it('should handle a request error when trying to send a reply tweet', () => {
                postRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.postTweet('', '', '')).rejects.toEqual({ error: 'test' });
            });

            it('should handle a request error when trying to send a direct message', () => {
                postRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.sendDM('', '')).rejects.toEqual({ error: 'test' });
            });

            it('should handle a POST request error from the node-twitter package', () => {
                const postMock = jest.spyOn(twitter.twitterAPI, 'post')
                    .mockImplementationOnce((path, requestData, cb) => {
                        cb({ error: 'test' });
                    });

                expect.assertions(1);
                return twitter.postRequest('', {}).catch((error) => {
                    expect(error).toEqual({ error: 'test' });
                    postMock.mockRestore();
                });
            });
        });
    });

    describe('GET Requests', () => {
        let getRequestMock;

        beforeEach(() => {
            getRequestMock = jest.spyOn(twitter, 'getRequest');
        });

        afterEach(() => {
            getRequestMock.mockRestore();
        });

        describe('Request Success Handling', () => {
            it('should verify user secret data', () => {
                getRequestMock.mockReturnValueOnce(Promise.resolve({ id_str: '001' }));

                expect.assertions(2);
                return twitter.verify().then((ownID) => {
                    expect(ownID).toBe('001');
                    expect(getRequestMock).toHaveBeenCalledWith(
                        'account/verify_credentials', {
                            include_entities: false,
                            skip_status: true
                        }
                    );
                });
            });

            it('should get user mentions correctly', () => {
                getRequestMock.mockReturnValueOnce(Promise.resolve([ 'mention1' ]));

                expect.assertions(2);
                return twitter.getMentions({ since_id: '5001' }).then((mentions) => {
                    expect(mentions).toEqual([ 'mention1' ]);
                    expect(getRequestMock).toHaveBeenCalledWith('statuses/mentions_timeline', { since_id: '5001' });
                });
            });

            it('should get the list of followed users correctly', () => {
                getRequestMock.mockReturnValueOnce(Promise.resolve([ '002' ]));
                twitter.ownID = '001';

                expect.assertions(2);
                return twitter.getFollowing().then((following) => {
                    expect(following).toEqual([ '002' ]);
                    expect(getRequestMock).toHaveBeenCalledWith(
                        'friends/ids', { user_id: '001', stringify_ids: true }
                    );
                });
            });

            it('should get tweets from a specified user correctly', () => {
                getRequestMock.mockReturnValueOnce(Promise.resolve([ 'tweet1' ]));

                expect.assertions(2);
                return twitter.getTweets({ id_str: '001' }).then((tweets) => {
                    expect(tweets).toEqual([ 'tweet1' ]);
                    expect(getRequestMock).toHaveBeenCalledWith('statuses/user_timeline', { id_str: '001' });
                });
            });

            it('should make proper GET requests to the node-twitter package', () => {
                const getMock = jest.spyOn(twitter.twitterAPI, 'get')
                    .mockImplementationOnce((path, requestData, cb) => {
                        cb(undefined, [ 'data' ]);
                    });

                expect.assertions(2);
                return twitter.getRequest('test/path', { id: '001' }).then((data) => {
                    expect(data).toEqual([ 'data' ]);
                    expect(getMock).toHaveBeenCalledWith('test/path', { id: '001' }, expect.any(Function));
                });
            });
        });

        describe('Request Error Handling', () => {
            it('should handle a request error when trying to verify user secret data', () => {
                getRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.verify()).rejects.toEqual({ error: 'test' });
            });

            it('should handle a request error when trying to get user mentions', () => {
                getRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.getMentions({})).rejects.toEqual({ error: 'test' });
            });

            it('should handle a request error when trying to get the list of followed users', () => {
                getRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.getFollowing()).rejects.toEqual({ error: 'test' });
            });

            it('should handle a request error when trying to get tweets from a user', () => {
                getRequestMock.mockReturnValueOnce(Promise.reject({ error: 'test' }));

                expect.assertions(1);
                return expect(twitter.getTweets({})).rejects.toEqual({ error: 'test' });
            });

            it('should handle a GET request error from the node-twitter package', () => {
                const getMock = jest.spyOn(twitter.twitterAPI, 'get')
                    .mockImplementationOnce((path, requestData, cb) => {
                        cb({ error: 'test' });
                    });

                expect.assertions(1);
                return twitter.getRequest('', {}).catch((error) => {
                    expect(error).toEqual({ error: 'test' });
                    getMock.mockRestore();
                });
            });
        });
    });
});
