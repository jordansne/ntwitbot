# NTwitBot | [![Build Status](https://travis-ci.org/jordansne/ntwitbot.svg?branch=develop)](https://travis-ci.org/jordansne/ntwitbot) [![Coverage Status](https://coveralls.io/repos/github/jordansne/ntwitbot/badge.svg)](https://coveralls.io/github/jordansne/ntwitbot) [![Maintainability](https://api.codeclimate.com/v1/badges/c88e615891e11275b7db/maintainability)](https://codeclimate.com/github/jordansne/ntwitbot/maintainability) [![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)

NTwitBot is an ongoing twitter ebooks bot project written in Node. It generates sentences from other user's tweet using a Markov's chain.

It is currently in **beta** stage and therefore might **carry bugs and unintended actions (example: replying to every mention that exists on a clean run all at once [will be fixed]..)**

## Features

* JSON based configuration
* Track multiple users (bot tracks tweets of any user that it's following)
* Replies to mentions
* More features coming..

## Installation & Setup

    $ git clone https://github.com/jordansne/ntwitbot
    $ cd ntwitbot
    $ npm install

Next you will need to create an app with Twitter. Twitter will provide you with a consumer key & secret and access key & secret. This should be added to config/secret.js. Example:

    // config/secret.js
    module.exports = {
        "consumer_key" : "SQzVswCxkuZxkSsIilpkaeZOVVyDxRrWVFpHQjzI",
        "consumer_secret": "nNguyAftInTJxCdVxliBCgClETnkfZFuJABHgyKh",
        "access_token_key": "jkiUfXmRegiPHEZemJwsUFZmCWPokCxEJAnpmIdz",
        "access_token_secret": "ILdlTtmPABFfixUBfivuMbFRojKkrlKkoLzhSZAn"
    };

## Usage

    $ npm start

## Contributing

Pull requests are welcome. Before a PR please `npm run test` to ensure all tests pass.

## License

This app is licensed under [GPL-v3](https://www.github.com/jordansne/ntwitbot/blob/develop/LICENSE).
