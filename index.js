/**
 * NTwitBot - index.js
 * @file App entry point.
 * @author Jordan Sne <jordansne@gmail.com>
 * @license MIT
 */

const secretData = require('./config/secret');
const setup      = require('./config/setup');

const Main = require('./src/main.js');
const main = new Main(secretData, setup);

main.init().then(() => {
    main.start();
});
