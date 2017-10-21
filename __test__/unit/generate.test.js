/*
 * NTwitBot - generate.test.js
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

const Generate = require('../../lib/generate.js');
const Util     = require('../../lib/util.js');

const generator = new Generate(new Util());

describe('Generate', () => {
    it('should determine the next key from a word stack', () => {
        const wordStack = [ 'Test', 'message', 'list'];
        expect(generator.keyOf(wordStack)).toEqual('message list');
    });

    it('should return valid first words', () => {
        const wordDB = {
            'First one': [{}],
            'not first': [{}],
            'First two': [{}]
        };
        const firstWords = generator.getFirstWords(wordDB);

        expect(firstWords).toHaveLength(2);
        expect(firstWords).toContain('First one');
        expect(firstWords).toContain('First two');
    });

    describe('Getting Random Words from the Database', () => {
        it('should return a word for a key that hasn\'t been popped', () => {
            const wordDB = {
                'test message': [{
                    word: 'one',
                    beenPopped: true
                }, {
                    word: 'two'
                }]
            };

            expect(generator.getRandomWord(wordDB, 'test message')).toBe('two');
        });

        it('should return null when all words have been popped for a key', () => {
            const wordDB = {
                'test message': [{
                    word: 'one',
                    beenPopped: true
                }]
            };

            expect(generator.getRandomWord(wordDB, 'test message')).toBeNull();
        });
    });

    describe('Word Stack Compiling', () => {
        it('should correctly compile a word stack without ending punctuation', () => {
            const wordStack = [ 'Test', 'message', 'list' ];
            expect(generator.compileMessage(wordStack)).toEqual('Test message list.');
        });

        it('should correctly compile a word stack with ending punctuation', () => {
            const wordStack = [ 'Test', 'message', 'list!' ];
            expect(generator.compileMessage(wordStack)).toEqual('Test message list!');
        });
    });

    describe('Word Stack Popping', () => {
        it('should pop only one word when the stack size is >= 3', () => {
            const wordStack = [ 'Test', 'message', 'list' ];
            const wordDB = {
                'Test message': [{
                    word: 'list'
                }],
            };

            generator.popWord(wordStack, wordDB);
            expect(wordStack).toEqual([ 'Test', 'message' ]);
            expect(wordDB['Test message'][0]).toHaveProperty('beenPopped');
        });

        it('should pop all words when the stack size is < 3', () => {
            const wordStack = [ 'Test', 'message'];

            generator.popWord(wordStack, {});
            expect(wordStack).toEqual([]);
        });
    });

    describe('Getting Word Entries', () => {
        it('should return the entry to a corresponding word', () => {
            const entry = { word: 'test' };
            expect(generator.getWordEntry([ entry ], 'test')).toBe(entry);
        });

        it('should return null if with there is no corresponding word', () => {
            const entry = { word: 'test' };
            expect(generator.getWordEntry([ entry ], 'test2')).toBeNull();
        });
    });
});
