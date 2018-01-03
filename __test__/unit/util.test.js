/**
 * NTwitBot - util.test.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

/* eslint no-unused-vars: ['error', { 'varsIgnorePattern': 'colors' }] */

const colors = require('colors');

const Util = require('../../src/util.js');
const utils = new Util();

describe('Util', () => {
    it('should properly set the debug flag', () => {
        utils.setDebug(true);
        expect(utils.debug).toBe(true);

        utils.setDebug(false);
        expect(utils.debug).toBe(false);
    });

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

    describe('Logging', () => {
        let logMock, errorMock, getFormattedTimeMock, NODE_ENV_SAVE;

        beforeAll(() => {
            logMock = jest.spyOn(console, 'log').mockReturnValue();
            errorMock = jest.spyOn(console, 'error').mockReturnValue();
            getFormattedTimeMock = jest.spyOn(utils, 'getFormattedTime').mockReturnValue('06/03/2016 08:01:04');

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
            utils.log('test');
            expect(logMock).toHaveBeenCalledTimes(1);
            expect(logMock).toHaveBeenCalledWith('06/03/2016 08:01:04 ' + ' INFO '.black.bgWhite + ' %s', 'test');
        });

        it('should display error messages if NODE_ENV is not \'test\'', () => {
            utils.logError('test');
            expect(errorMock).toHaveBeenCalledTimes(1);
            expect(errorMock).toHaveBeenCalledWith('06/03/2016 08:01:04 ' + ' ERROR '.black.bgRed + ' %s'.red, 'test');
        });

        it('should display error messages if NODE_ENV is not \'test\' with an error object', () => {
            const error = { stack: 'error' };

            utils.logError('test', error);
            expect(errorMock).toHaveBeenCalledTimes(2);
            expect(errorMock).toHaveBeenCalledWith(
                '06/03/2016 08:01:04 ' + ' ERROR '.black.bgRed + ' %s'.red, 'test'
            );
            expect(errorMock).toHaveBeenCalledWith(
                '06/03/2016 08:01:04 ' + ' ERROR '.black.bgRed + '     %s'.red, error.stack
            );
        });

        it('should display debug messages if NODE_ENV is not \'test\' & the debug flag is true', () => {
            utils.debug = true;

            utils.logDebug('test');
            expect(logMock).toHaveBeenCalledTimes(1);
            expect(logMock).toHaveBeenCalledWith('06/03/2016 08:01:04 ' + ' DEBUG '.black.bgCyan + ' %s'.cyan, 'test');

            utils.debug = false;
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
