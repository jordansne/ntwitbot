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
const processor = new Process(new Util());

describe('Process', () => {
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
        // Use a mock utils object to mock the getTime function that is used by the processor
        const timeMock = jest.fn().mockReturnValue(201710302350);
        const processorMocked = new Process({ getTime: timeMock });
        const data = {};
        const words = ["Test", "sentence", "one."];

        processorMocked.appendData(data, words);

        expect(data).toHaveProperty(
            "Test sentence", [{
                word: "one.",
                time: 201710302350
            }]
        );
    });

    it('should append to existing keys in a data object', () => {
        // Use a mock utils object to mock the getTime function that is used by the processor
        const timeMock = jest.fn().mockReturnValue(201710302351);
        const processorMocked = new Process({ getTime: timeMock });
        const data = {
            "Test sentence": [{
                word: "one.",
                time: 201710302350
            }]
        };
        const words = ["Test", "sentence", "two."];

        processorMocked.appendData(data, words);

        expect(data).toHaveProperty(
            "Test sentence", [{
                word: "one.",
                time: 201710302350
            }, {
                word: "two.",
                time: 201710302351
            }]
        );
    });

    it('should convert raw tweets into a data object', () => {
        const utilsMock = new Util();
        const processorMocked = new Process(utilsMock);

        // Override getTime in utils
        utilsMock.getTime = () => 201710302350;

        const tweets = [
            { text: "test sentence one. tEst sentence two"},
            { text: "Another sentence one." }
        ];
        const data = processorMocked.processTweets(tweets);

        expect(data).toMatchObject({
            "Test sentence": [{
                word: "one.",
                time: 201710302350
            }, {
                word: "two.",
                time: 201710302350
            }],
            "sentence one.": [{
                word: "Test",
                time: 201710302350
            }],
            "one. Test": [{
                word: "sentence",
                time: 201710302350
            }],
            "Another sentence": [{
                word: "one.",
                time: 201710302350
            }]
        });
    });
});
