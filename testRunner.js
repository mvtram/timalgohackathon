const testRunner = require('./src/testRunner');
const testData = require(`./src/test-data/data`);
const stencil = process.env.NO_STENCIL === undefined;
const { results } = testRunner(testData, stencil);
console.log(`pass% > ${100 * results.passed / (results.total)}, errors > ${results.errors}, failed > ${results.failed}, passed > ${results.passed},total > ${results.passed + results.failed}`);
