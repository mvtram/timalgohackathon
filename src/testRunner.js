const algorithm = require('./algorithm');
const results = {
    passed: 0,
    failed: 0,
    errors: 0
};

const testCasesByCount = {};

module.exports = function runner(testData, stencil = true) {
    testData.forEach(testCase => {
        if (!stencil) {
            testCase.stencilPixels = [];
        }
        const result = algorithm(testCase.data, testCase);
        testCase.result = result;
        try {
            if (result.objects.length === testCase.expectedCount) {
                testCase.passed = true;
                results.passed++;
            } else {
                results.errors += Math.abs(result.objects.length - testCase.expectedCount);
                results.failed++;
            }
        } catch (ex) {
            results.failed++;
            console.error(ex);
        }
        if (testCasesByCount[testCase.expectedCount]) {
            testCasesByCount[testCase.expectedCount].push(testCase);
        }
        else {
            testCasesByCount[testCase.expectedCount] = [testCase];
        }
    });
    results.total = results.passed + results.failed;
    return { testCases: testData, results, testCasesByCount };
}