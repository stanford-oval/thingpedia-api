"use strict";

// load everything in process so we have a global view of code coverage
require('..');

process.on('unhandledRejection', (up) => { throw up; });
process.env.TEST_MODE = '1';

async function seq(array) {
    for (let el of array) {
        console.log(`Running tests for ${el}`);
        await require(el)();
    }
}

seq([
    ('./test_version'),
    ('./test_class'),
    ('./test_object_set'),
    ('./test_http'),
    ('./test_rss'),
    ('./test_polling'),
    ('./test_refcounted'),
    ('./test_content')
]);
