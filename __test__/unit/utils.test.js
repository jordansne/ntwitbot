/**
 * NTwitBot - utils.test.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

/* eslint no-unused-vars: ['error', { 'varsIgnorePattern': 'colors' }] */

const colors = require('colors');
const Utils = require('../../src/utils.js');

describe('Utils', () => {
    it('should properly set the debug flag', () => {
        Utils.setDebug(true);
        expect(Utils.debug).toBe(true);

        Utils.setDebug(false);
        expect(Utils.debug).toBe(false);
    });

    it('should capitalize words', () => {
        expect(Utils.capitalize('test')).toBe('Test');
        expect(Utils.capitalize('Test')).toBe('Test');
        expect(Utils.capitalize('#test')).toBe('#test');
    });

    it('should check capitalization of chars', () => {
        expect(Utils.isUpperCase('t')).toBe(false);
        expect(Utils.isUpperCase('T')).toBe(true);
    });

    it('should check if an object is in an array', () => {
        const someObject = { 'id': 2322 };
        const otherObject1 = { 'id': 3232 };
        const otherObject2 = { 'id': 4322 };

        const array1 = [someObject, otherObject1];
        const array2 = [otherObject1, otherObject2];

        expect(Utils.isInArray(array1, someObject)).toBe(true);
        expect(Utils.isInArray(array2, someObject)).toBe(false);
    });

    it('should generate shuffled arrays', () => {
        const shuffleMock = jest.spyOn(Utils, 'shuffleArray')
            .mockReturnValueOnce([2, 0, 1, 3 ]);

        expect(Utils.generateShuffledArray(4)).toEqual([ 2, 0, 1, 3 ]);
        expect(shuffleMock).toHaveBeenCalledWith([ 0, 1, 2, 3 ]);

        shuffleMock.mockRestore();
    });

    it('should not change any elements when shuffling an array', () => {
        const array = Utils.shuffleArray([ 1, 3, 5 ]);

        expect(array).toHaveLength(3);
        expect(array).toContain(1);
        expect(array).toContain(3);
        expect(array).toContain(5);
    });

    it('should check for ending punctuation', () => {
        expect(Utils.endsWithPunc('This is a test.')).toBe(true);
        expect(Utils.endsWithPunc('This is a test!')).toBe(true);
        expect(Utils.endsWithPunc('This is a test?')).toBe(true);
        expect(Utils.endsWithPunc('This is a test')).toBe(false);
    });

    describe('Logging', () => {
        let logMock, errorMock, getFormattedTimeMock, NODE_ENV_SAVE;

        beforeAll(() => {
            logMock = jest.spyOn(console, 'log').mockReturnValue();
            errorMock = jest.spyOn(console, 'error').mockReturnValue();
            getFormattedTimeMock = jest.spyOn(Utils, 'getFormattedTime').mockReturnValue('06/03/2016 08:01:04');

            NODE_ENV_SAVE = process.env.NODE_ENV;
            delete process.env.NODE_ENV;
        });

        afterEach(() => {
            logMock.mockClear();
            errorMock.mockClear();
            getFormattedTimeMock.mockClear();
        });

        afterAll(() => {
            logMock.mockRestore();
            errorMock.mockRestore();
            getFormattedTimeMock.mockRestore();

            process.env.NODE_ENV = NODE_ENV_SAVE;
        });

        it('should display log messages if NODE_ENV is not \'test\'', () => {
            Utils.log('test');
            expect(logMock).toHaveBeenCalledTimes(1);
            expect(logMock).toHaveBeenCalledWith('06/03/2016 08:01:04 ' + ' INFO '.black.bgWhite + ' %s', 'test');
        });

        it('should display error messages if NODE_ENV is not \'test\'', () => {
            Utils.logError('test');
            expect(errorMock).toHaveBeenCalledTimes(1);
            expect(errorMock).toHaveBeenCalledWith('06/03/2016 08:01:04 ' + ' ERROR '.black.bgRed + ' %s'.red, 'test');
        });

        it('should display error messages if NODE_ENV is not \'test\' with an error object', () => {
            const error = { stack: 'error' };

            Utils.logError('test', error);
            expect(errorMock).toHaveBeenCalledTimes(2);
            expect(errorMock).toHaveBeenCalledWith(
                '06/03/2016 08:01:04 ' + ' ERROR '.black.bgRed + ' %s'.red, 'test'
            );
            expect(errorMock).toHaveBeenCalledWith(
                '06/03/2016 08:01:04 ' + ' ERROR '.black.bgRed + '     %s'.red, error.stack
            );
        });

        it('should display debug messages if NODE_ENV is not \'test\' & the debug flag is true', () => {
            Utils.debug = true;

            Utils.logDebug('test');
            expect(logMock).toHaveBeenCalledTimes(1);
            expect(logMock).toHaveBeenCalledWith('06/03/2016 08:01:04 ' + ' DEBUG '.black.bgCyan + ' %s'.cyan, 'test');

            Utils.debug = false;
        });
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
                expect(Utils.getTime()).toBe(201606030801);
            });

            it('should generate the proper string representation', () => {
                expect(Utils.getFormattedTime()).toBe('06/03/2016 08:01:04');
            });
        });

        describe('when the date has double digit time & date numbers', () => {
            beforeAll(() => {
                global.Date = jest.fn(() => new Date_(2016, 10, 23, 13, 54, 23));
            });

            it('should generate the proper int representation', () => {
                expect(Utils.getTime()).toBe(201611231354);
            });

            it('should generate the proper string representation', () => {
                expect(Utils.getFormattedTime()).toBe('11/23/2016 13:54:23');
            });
        });
    });
});
