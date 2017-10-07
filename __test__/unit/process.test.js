/*
 * NTwitBot - process.test.js
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

const Process = require('../lib/process.js');
const Util    = require('../lib/util.js');
let processor;

const MOCK_TIME           = 201710302350;
const MOCK_TIME_FORMATTED = "10/30/2017 23:50:15";

describe('Process', () => {
    beforeAll(() => {
        // Override time methods with time constants above
        const utilsMock = new Util();
        utilsMock.getTime = jest.fn(() => MOCK_TIME);
        utilsMock.getFormattedTime = jest.fn(() => MOCK_TIME_FORMATTED);

        processor = new Process(utilsMock);
    });

    it('should filter mentions and links from words', () => {
        const words = ["good", "@bad", "http://bad.ca", "good2"];
        const filtered = processor.filterWords(words);

        expect(filtered).toMatchObject(["good", "good2"]);
    });

    it('should convert words to lowercase', () => {
        const words = ["Test", "sentENCE."];
        processor.converToLowercase(words);

        expect(words).toMatchObject(["test", "sentence."]);
    });

    it('should capitalize sentences', () => {
        const words = ["test", "one.", "test", "two!", "test", "three?", "final"];
        processor.capitalizeSentences(words);

        expect(words).toMatchObject(["Test", "one.", "Test", "two!", "Test", "three?", "Final"]);
    });

    it('should append periods to the end of tweets', () => {
        const words = ["Test", "sentence"];
        processor.appendPeriod(words);

        expect(words).toMatchObject(["Test", "sentence."]);
    });

    it('should add new keys in a data object', () => {
        const data = {};
        const words = ["Test", "sentence", "one."];

        processor.appendData(data, words);

        expect(data).toMatchObject({
            "Test sentence": [{
                word: "one.",
                time: MOCK_TIME
            }]
        });
    });

    it('should append to existing keys in a data object', () => {
        const data = {
            "Test sentence": [{
                word: "one.",
                time: MOCK_TIME
            }]
        };
        const words = ["Test", "sentence", "two."];

        processor.appendData(data, words);

        expect(data).toMatchObject({
            "Test sentence": [{
                word: "one.",
                time: MOCK_TIME
            }, {
                word: "two.",
                time: MOCK_TIME
            }]
        });
    });

    it('should convert raw tweets into a data object', () => {
        const tweets = [
            { text: "test sentence one. tEst sentence two"},
            { text: "Another sentence one." }
        ];
        const data = processor.processTweets(tweets);

        expect(data).toMatchObject({
            "Test sentence": [{
                word: "one.",
                time: MOCK_TIME
            }, {
                word: "two.",
                time: MOCK_TIME
            }],
            "sentence one.": [{
                word: "Test",
                time: MOCK_TIME
            }],
            "one. Test": [{
                word: "sentence",
                time: MOCK_TIME
            }],
            "Another sentence": [{
                word: "one.",
                time: MOCK_TIME
            }]
        });
    });
});
