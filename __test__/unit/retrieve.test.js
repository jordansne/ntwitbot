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
            let retrieveForExistingSpy;

            beforeEach(() => {
                retrieveForExistingSpy = jest.spyOn(retriever, 'retrieveForExisting');
            });

            afterEach(() => {
                retrieveForExistingSpy.mockRestore();
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
        });

        describe('New Users', () => {
            let retrieveForNewSpy;

            beforeEach(() => {
                retrieveForNewSpy = jest.spyOn(retriever, 'retrieveForNew');
            });

            afterEach(() => {
                retrieveForNewSpy.mockRestore();
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
        });

    });
});
