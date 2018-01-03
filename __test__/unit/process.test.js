/**
 * NTwitBot - process.test.js
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const Process = require('../../src/process.js');
const Util    = require('../../src/util.js');

const processor = new Process(new Util());

const MOCK_TIME           =  201710302350;
const MOCK_TIME_FORMATTED = '10/30/2017 23:50:15';

describe('Process', () => {
    beforeAll(() => {
        processor.utils.getTime = jest.fn(() => MOCK_TIME);
        processor.utils.getFormattedTime = jest.fn(() => MOCK_TIME_FORMATTED);
    });

    it('should filter mentions and links from words', () => {
        const words = [ 'good', '@bad', 'http://bad.ca', 'good2' ];
        const filtered = processor.filterWords(words);

        expect(filtered).toEqual([ 'good', 'good2' ]);
    });

    it('should convert words to lowercase', () => {
        const words = [ 'Test', 'sentENCE.' ];
        processor.convertToLowercase(words);

        expect(words).toEqual([ 'test', 'sentence.' ]);
    });

    it('should capitalize sentences', () => {
        const words = [ 'test', 'one.', 'test', 'two!', 'test', 'three?', 'final' ];
        processor.capitalizeSentences(words);

        expect(words).toEqual([ 'Test', 'one.', 'Test', 'two!', 'Test', 'three?', 'Final' ]);
    });

    it('should append periods to the end of tweets', () => {
        const words = [ 'Test', 'sentence' ];
        processor.appendPeriod(words);

        expect(words).toEqual([ 'Test', 'sentence.' ]);
    });

    it('should add new keys in a data object', () => {
        const data = {};
        const words = [ 'Test', 'sentence', 'one.' ];

        processor.appendData(data, words);

        expect(data).toEqual({
            'Test sentence': [{ word: 'one.', time: MOCK_TIME }]
        });
    });

    it('should append to existing keys in a data object', () => {
        const data = { 'Test sentence': [{ word: 'one.', time: MOCK_TIME }] };
        const words = [ 'Test', 'sentence', 'two.' ];

        processor.appendData(data, words);

        expect(data).toEqual({
            'Test sentence': [{ word: 'one.', time: MOCK_TIME }, { word: 'two.', time: MOCK_TIME }]
        });
    });

    it('should convert raw tweets into a data object', () => {
        const tweets = [
            { text: 'test sentence one. tEst sentence two' },
            { text: 'Another sentence one.' }
        ];
        const data = processor.processTweets(tweets);

        expect(data).toEqual({
            'Test sentence': [{ word: 'one.', time: MOCK_TIME }, { word: 'two.', time: MOCK_TIME }],
            'sentence one.': [{ word: 'Test', time: MOCK_TIME }],
            'one. Test': [{ word: 'sentence', time: MOCK_TIME }],
            'Another sentence': [{ word: 'one.', time: MOCK_TIME }]
        });
    });
});
