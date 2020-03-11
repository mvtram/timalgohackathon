const fs = require('fs');
const algorithm = require('./src/algorithm');
const sourceFileName = './src/test-data/data';
const testData = require(sourceFileName);

const MIN_FRAME_COUNT = 0;
const MAX_FRAME_COUNT = 2;
const MAX_FRAMES = 100;
const START_INDEX = 0;

let testCases = [];


[true, false].forEach(onlyFailed => {
    let parts = 1;
    testData.forEach((testCase, index) => {
        if (index >= START_INDEX && MIN_FRAME_COUNT <= testCase.expectedCount && testCase.expectedCount <= MAX_FRAME_COUNT) {
            if (onlyFailed) {
                const result = algorithm(testCase.data, testCase);
                try {
                    if (result.objects.length !== testCase.expectedCount) {
                        testCases.push(testCase);
                    }
                } catch (ex) {
                    testCases.push(testCase);
                    console.error(ex);
                }
            } else {
                testCases.push(testCase);
            }
        }
        if (testCases.length === MAX_FRAMES) {
            const suffix = onlyFailed ? `f${parts}` : `${parts}`;
            fs.writeFileSync(`${sourceFileName}-${suffix}.js`, 'module.exports = ' + JSON.stringify(testCases));
            testCases = [];
            parts++;
        }
    });
});

