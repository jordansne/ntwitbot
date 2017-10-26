/*
 * NTwitBot - util.test.js
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

const Util = require('../../lib/util.js');
const utils = new Util();

describe('Util', () => {
    it('should capitalize words', () => {
        expect(utils.capitalize('test')).toBe('Test');
        expect(utils.capitalize('Test')).toBe('Test');
        expect(utils.capitalize('#test')).toBe('#test');
    });

    it('should check capitalization of chars', () => {
        expect(utils.isUpperCase('t')).toBe(false);
        expect(utils.isUpperCase('T')).toBe(true);
    });

    it('should check if an object is in an array', () => {
        const someObject = { 'id': 2322 };
        const otherObject1 = { 'id': 3232 };
        const otherObject2 = { 'id': 4322 };

        const array1 = [someObject, otherObject1];
        const array2 = [otherObject1, otherObject2];

        expect(utils.isInArray(array1, someObject)).toBe(true);
        expect(utils.isInArray(array2, someObject)).toBe(false);
    });

    it('should generate shuffled arrays', () => {
        const shuffleMock = jest.spyOn(utils, 'shuffleArray')
            .mockReturnValueOnce([2, 0, 1, 3 ]);

        expect(utils.generateShuffledArray(4)).toEqual([ 2, 0, 1, 3 ]);
        expect(shuffleMock).toHaveBeenCalledWith([ 0, 1, 2, 3 ]);

        shuffleMock.mockRestore();
    });

    it('should not change any elements when shuffling an array', () => {
        const array = utils.shuffleArray([ 1, 3, 5 ]);

        expect(array).toHaveLength(3);
        expect(array).toContain(1);
        expect(array).toContain(3);
        expect(array).toContain(5);
    });

    it('should check for ending punctuation', () => {
        expect(utils.endsWithPunc('This is a test.')).toBe(true);
        expect(utils.endsWithPunc('This is a test!')).toBe(true);
        expect(utils.endsWithPunc('This is a test?')).toBe(true);
        expect(utils.endsWithPunc('This is a test')).toBe(false);
    });

    describe('Date', () => {
        const Date_ = Date;

        afterAll(() => {
            global.Date = Date_;
        });

        describe('when the date has single digit time & date numbers', () => {
            beforeAll(() => {
                global.Date = jest.fn(() => new Date_(2016, 5, 3, 8, 1, 4));
            });

            it('should generate the proper int representation', () => {
                expect(utils.getTime()).toBe(201606030801);
            });

            it('should generate the proper string representation', () => {
                expect(utils.getFormattedTime()).toBe('06/03/2016 08:01:04');
            });
        });

        describe('when the date has double digit time & date numbers', () => {
            beforeAll(() => {
                global.Date = jest.fn(() => new Date_(2016, 10, 23, 13, 54, 23));
            });

            it('should generate the proper int representation', () => {
                expect(utils.getTime()).toBe(201611231354);
            });

            it('should generate the proper string representation', () => {
                expect(utils.getFormattedTime()).toBe('11/23/2016 13:54:23');
            });
        });
    });
});
