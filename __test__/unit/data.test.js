/**
 * NTwitBot - data.test.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

jest.mock('fs');
const fsMock = require('fs');

const Data = require('../../src/data.js');
const dataHandler = new Data();

describe('Data', () => {
    afterAll(() => {
        jest.unmock('fs');
    });

    describe('Data Insertion', () => {
        it('should properly add word objects to data entries in existing data', () => {
            const existingData = { 'This is': [{ word: 'cool.' }] };
            const newData = { 'This is': [{ word: 'neat.' }] };

            dataHandler.insertData(existingData, newData);
            expect(existingData).toEqual({ 'This is': [{ word: 'cool.' }, { word: 'neat.' }] });
        });

        it('should properly create new entries in existing data', () => {
            const existingData = { 'This is': [{ word: 'cool.' }] };
            const newData = { 'It is': [{ word: 'neat.' }] };

            dataHandler.insertData(existingData, newData);
            expect(existingData).toEqual({
                'This is': [{ word: 'cool.' }],
                'It is': [{ word: 'neat.' }]
            });
        });
    });

    describe('Data Directory', () => {
        afterEach(() => {
            fsMock.mkdir.mockReset();
        });

        it('should properly create a data directory if it does not exist', () => {
            fsMock.mkdir.mockImplementationOnce((path, cb) => {
                cb();
            });

            expect.assertions(1);
            return dataHandler.createDataDir().then(() => {
                expect(fsMock.mkdir).toHaveBeenCalledWith(dataHandler.DATA_DIR, expect.any(Function));
            });
        });

        it('should resolve if the data directory already exists', () => {
            fsMock.mkdir.mockImplementationOnce((path, cb) => {
                cb({ code: 'EEXIST' });
            });

            expect.assertions(1);
            return dataHandler.createDataDir().then(() => {
                expect(fsMock.mkdir).toHaveBeenCalledWith(dataHandler.DATA_DIR, expect.any(Function));
            });
        });

        it('should reject if an error occurs when trying to create the data directory', () => {
            const errorMock = { code: 'ENOENT' };
            fsMock.mkdir.mockImplementationOnce((path, cb) => {
                cb(errorMock);
            });

            expect.assertions(1);
            return dataHandler.createDataDir().catch((error) => {
                expect(error).toBe(errorMock);
            });
        });
    });

    describe('Writing Data', () => {
        let readFileMock, writeFileMock;

        beforeEach(() => {
            readFileMock = jest.spyOn(dataHandler, 'readFile');
            writeFileMock = jest.spyOn(dataHandler, 'writeFile');
        });

        afterEach(() => {
            readFileMock.mockRestore();
            writeFileMock.mockRestore();
        });

        it('should properly save data with Node\'s fs', () => {
            const data = { test: 'value' };
            fsMock.writeFile.mockImplementationOnce((path, data, cb) => {
                cb();
            });

            expect.assertions(1);
            return dataHandler.writeFile('testPath', data).then(() => {
                expect(fsMock.writeFile).toHaveBeenCalledWith('testPath', JSON.stringify(data), expect.any(Function));
            });
        });

        it('should reject if an error occurs when trying to save data with Node\'s fs', () => {
            const errorMock = { code: 'test' };
            fsMock.writeFile.mockImplementationOnce((path, data, cb) => {
                cb(errorMock);
            });

            expect.assertions(1);
            return dataHandler.writeFile('', {}).catch((error) => {
                expect(error).toBe(errorMock);
            });
        });

        describe('State File', () => {
            it('should properly write to the state file', () => {
                const state = { lastID: '5001' };
                writeFileMock.mockReturnValueOnce(Promise.resolve());

                expect.assertions(1);
                return dataHandler.saveState(state).then(() => {
                    expect(writeFileMock).toHaveBeenCalledWith(dataHandler.STATE_FILE, state);
                });
            });
        });

        describe('Database File', () => {
            it('should properly write new data to the database file', () => {
                const data = { 'This is': [{ word: 'cool.' }] };
                readFileMock.mockReturnValueOnce(Promise.reject({ code: 'ENOENT' }));
                writeFileMock.mockReturnValueOnce(Promise.resolve());

                expect.assertions(2);
                return dataHandler.saveTweetData(data).then(() => {
                    expect(readFileMock).toHaveBeenCalledWith(dataHandler.DATABASE_FILE);
                    expect(writeFileMock).toHaveBeenCalledWith(dataHandler.DATABASE_FILE, data);
                });
            });

            it('should properly update an existing database file with new data', () => {
                const existingData = { 'This is': [{ word: 'cool.' }] };
                const newData = { 'This is': [{ word: 'neat.' }] };
                readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(existingData)));
                writeFileMock.mockReturnValueOnce(Promise.resolve());

                expect.assertions(1);
                return dataHandler.saveTweetData(newData).then(() => {
                    expect(writeFileMock).toHaveBeenCalledWith(
                        dataHandler.DATABASE_FILE, { 'This is': [{ word: 'cool.' }, { word: 'neat.' }] }
                    );
                });
            });

            it('should reject if an error occurs when trying to parse existing data from the database file', () => {
                const badData = 'bad json';
                readFileMock.mockReturnValueOnce(Promise.resolve(badData));

                expect.assertions(1);
                return dataHandler.saveTweetData({}).catch((error) => {
                    expect(error).toEqual(expect.any(SyntaxError));
                });
            });

            it('should reject if an error occurs when trying to read from the database file', () => {
                const errorMock = { code: 'test' };
                readFileMock.mockReturnValueOnce(Promise.reject(errorMock));

                expect.assertions(1);
                return dataHandler.saveTweetData({}).catch((error) => {
                    expect(error).toBe(errorMock);
                });
            });
        });
    });

    describe('Reading Data', () => {
        let readFileMock;

        beforeEach(() => {
            readFileMock = jest.spyOn(dataHandler, 'readFile');
        });

        afterEach(() => {
            readFileMock.mockRestore();
            fsMock.stat.mockReset();
            fsMock.readFile.mockReset();
        });

        it('should properly read data with Node\'s fs', () => {
            const dataMock = { test: 'value' };
            fsMock.stat.mockImplementationOnce((path, cb) => {
                cb();
            });
            fsMock.readFile.mockImplementationOnce((path, encoding, cb) => {
                cb(undefined, dataMock);
            });

            expect.assertions(3);
            return dataHandler.readFile('testPath').then((data) => {
                expect(data).toBe(dataMock);
                expect(fsMock.stat).toHaveBeenCalledWith('testPath', expect.any(Function));
                expect(fsMock.readFile).toHaveBeenCalledWith('testPath', 'utf8', expect.any(Function));
            });
        });

        it('should reject if an error occurs when trying to stat a file with Node\'s fs', () => {
            const errorMock = { code: 'test' };
            fsMock.stat.mockImplementationOnce((path, cb) => {
                cb(errorMock);
            });

            expect.assertions(1);
            return dataHandler.readFile('', {}).catch((error) => {
                expect(error).toBe(errorMock);
            });
        });

        it('should reject if an error occurs when trying to read data with Node\'s fs', () => {
            const errorMock = { code: 'test' };
            fsMock.stat.mockImplementationOnce((path, cb) => {
                cb();
            });
            fsMock.readFile.mockImplementationOnce((path, encoding, cb) => {
                cb(errorMock);
            });

            expect.assertions(1);
            return dataHandler.readFile('', {}).catch((error) => {
                expect(error).toBe(errorMock);
            });
        });

        describe('State File', () => {
            it('should properly read and parse from the state file', () => {
                const stateMock = { lastID: '5001' };
                readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(stateMock)));

                expect.assertions(2);
                return dataHandler.readState().then((state) => {
                    expect(state).toEqual(stateMock);
                    expect(readFileMock).toHaveBeenCalledWith(dataHandler.STATE_FILE);
                });
            });

            it('should resolve with null when the state file does not exist', () => {
                readFileMock.mockReturnValueOnce(Promise.reject({ code: 'ENOENT' }));

                expect.assertions(1);
                return dataHandler.readState().then((state) => {
                    expect(state).toBeNull();
                });
            });

            it('should reject if the data from the state file cannot be parsed to JSON', () => {
                const badData = 'bad json';
                readFileMock.mockReturnValueOnce(Promise.resolve(badData));

                expect.assertions(1);
                return dataHandler.readState().catch((error) => {
                    expect(error).toEqual(expect.any(SyntaxError));
                });
            });

            it('should reject if an error occurs when trying to read the state file', () => {
                const errorMock = { code: 'test' };
                readFileMock.mockReturnValueOnce(Promise.reject(errorMock));

                expect.assertions(1);
                return dataHandler.readState().catch((error) => {
                    expect(error).toBe(errorMock);
                });
            });
        });

        describe('Database File', () => {
            it('should properly read and parse from the database file', () => {
                const dataMock = { 'This is': [{ word: 'cool.' }] };
                readFileMock.mockReturnValueOnce(Promise.resolve(JSON.stringify(dataMock)));

                expect.assertions(2);
                return dataHandler.readTweetData().then((data) => {
                    expect(data).toEqual(dataMock);
                    expect(readFileMock).toHaveBeenCalledWith(dataHandler.DATABASE_FILE);
                });
            });

            it('should reject if the data from the database file cannot be parsed to JSON', () => {
                const badData = 'bad json';
                readFileMock.mockReturnValueOnce(Promise.resolve(badData));

                expect.assertions(1);
                return dataHandler.readTweetData().catch((error) => {
                    expect(error).toEqual(expect.any(SyntaxError));
                });
            });

            it('should reject if an error occurs when trying to read the database file', () => {
                const errorMock = { code: 'ENOENT' };
                readFileMock.mockReturnValueOnce(Promise.reject(errorMock));

                expect.assertions(1);
                return dataHandler.readTweetData().catch((error) => {
                    expect(error).toBe(errorMock);
                });
            });
        });
    });
});
