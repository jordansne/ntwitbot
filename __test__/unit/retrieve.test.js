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

const retriever = new Retrieve(new Twitter(), new Util());

describe('Retrieve', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Mention Retrievals', () => {
        it('should retrieve all mentions of the user', () => {
            const getMentionsSpy =
                jest.spyOn(retriever.twitterHandler, 'getMentions').mockImplementation(() => Promise.resolve({}));

            expect.assertions(2);

            return retriever.retrieveMentions(0).then((mentions) => {
                expect(mentions).toBeDefined();
                expect(getMentionsSpy).toHaveBeenCalledWith({ count: 200 });
            });
        });

        it('should retrieve all mentions since a specified ID of the user', () => {
            const getMentionsSpy =
                jest.spyOn(retriever.twitterHandler, 'getMentions').mockImplementation(() => Promise.resolve({}));

            expect.assertions(2);

            return retriever.retrieveMentions("3423232321").then((mentions) => {
                expect(mentions).toBeDefined();
                expect(getMentionsSpy).toHaveBeenCalledWith({ since_id: "3423232321" });
            });
        });
    });

    describe('Tweet Retrievals', () => {
        it('should specify the correct request for tweets from new users', () => {
            const users = { "4243675": 0, "4243655": 0 };
            const retrieveForNewSpy =
                jest.spyOn(retriever, 'retrieveForNew').mockImplementation(() => Promise.resolve({}));

            expect.assertions(4);

            return retriever.retrieveTweets(users).then((tweets) => {
                expect(tweets).toBeDefined();
                expect(retrieveForNewSpy).toHaveBeenCalledTimes(2);
                expect(retrieveForNewSpy).toHaveBeenCalledWith({ user_id: "4243675", trim_user: true });
                expect(retrieveForNewSpy).toHaveBeenCalledWith({ user_id: "4243655", trim_user: true });
            });
        });

        it('should specify the correct request for tweets from existing users', () => {
            const users = { "4243675": "2324145663412", "4243655": "54643414213123" };
            const retrieveForExistingSpy =
                jest.spyOn(retriever, 'retrieveForExisting').mockImplementation(() => Promise.resolve({}));

            expect.assertions(4);

            return retriever.retrieveTweets(users).then((tweets) => {
                expect(tweets).toBeDefined();
                expect(retrieveForExistingSpy).toHaveBeenCalledTimes(2);
                expect(retrieveForExistingSpy).toHaveBeenCalledWith({
                    user_id: "4243675",
                    since_id: "2324145663412",
                    count: 200,
                    trim_user: true
                });
                expect(retrieveForExistingSpy).toHaveBeenCalledWith({
                    user_id: "4243655",
                    since_id: "54643414213123",
                    count: 200,
                    trim_user: true
                });
            });
        });
    });
});
