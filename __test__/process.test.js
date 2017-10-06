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
        const words = ["Test", "@test", "Test2", "http://test.ca", "Test3"];
        const filtered = processor.filterWords(words);

        expect(filtered).toMatchObject(["Test", "Test2", "Test3"]);
    });

    it('should convert words to lowercase', () => {
        const words = ["This", "is", "A", "TEST."];
        processor.converToLowercase(words);

        expect(words[0]).toBe("this");
        expect(words[2]).toBe("a");
        expect(words[3]).toBe("test.");
    });

    it('should capitalize sentences', () => {
        const words = ["this", "is", "a", "sentence.", "another", "one!", "or", "is", "it?", "yes"];
        processor.capitalizeSentences(words);

        expect(words[0]).toBe("This");
        expect(words[4]).toBe("Another");
        expect(words[6]).toBe("Or");
        expect(words[9]).toBe("Yes");
    });

    it('should append periods to the end of tweets', () => {
        const words = ["This", "is", "a", "sentence"];
        processor.appendPeriod(words);

        expect(words[3]).toBe("sentence.");
    });
});
