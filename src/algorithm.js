const _ = require('lodash');

const parameters = {
    humanMinMass: 100,
    alphaRangeByRadius: {
        2: { min: 0.7, max: 0.8 },
        3: { min: 0.6, max: 0.7 },
    },
    deviationRange: { min: 25, max: 60 },
    dimensions: { rows: 24, columns: 32 },
    humanRadii: [2, 3],
    minDistance: 4,
    minConfidence: 0.7
};
const REMOVED_VALUE = 0;

function clone(objOrArr) {
    if (Array.isArray(objOrArr)) {
        return [...objOrArr];
    }
    return { ...objOrArr };
}

function merge(objOrArr1, objOrArr2) {
    if (Array.isArray(objOrArr1) && Array.isArray(objOrArr2)) {
        return [...objOrArr1, ...objOrArr2];
    }
    return { ...objOrArr1, ...objOrArr2 };
}


function adjustCalibration(data, context) {
    const flatCalibration = _.flatten(context.calibration);
    return {
        data: data.map((value, index) => value - flatCalibration[index], 2),
        context: merge(clone(context), { raw: clone(data) }),
    };
}

function removeStencil(data, context) {
    return {
        data: data.map((value, index) => _.includes(context.stencilPixels, index) ? REMOVED_VALUE : value),
        context: clone(context),
    };
};

function convertToDeviationFromMean(data, context) {
    const mean = _.mean(_.filter(data, (__, index) => !_.includes(context.stencilPixels, index)));
    return {
        data: data.map((v, index) => !_.includes(context.stencilPixels, index) ? v - mean : 0),
        context: clone(context),
    };
}

function removeOutOfRangeDeviations(data, context) {
    return {
        data: data.map(v => (v < parameters.deviationRange.min || parameters.deviationRange.max < v) ? REMOVED_VALUE : v),
        context: clone(context),
    };
}

function getNeighbourIndices(currIndex, endRadius, startRadius = 0) {
    const rowIndex = Math.floor(currIndex / parameters.dimensions.columns);
    const columnIndex = currIndex % parameters.dimensions.columns;
    const rows = [];
    const columns = [];
    for (let radius = startRadius; radius <= endRadius; radius++) {
        _.forEach([-radius, radius], distance => {
            const row = rowIndex + distance;
            const column = columnIndex + distance;
            if (0 <= row && row < parameters.dimensions.rows) {
                rows.push(row);
            }
            if (0 <= column && column < parameters.dimensions.columns) {
                columns.push(column);
            }
        });
    }
    return _.uniq(_.flatten(rows.map(row => columns.map(col => row * parameters.dimensions.columns + col))));
}

function getDistance(index1, index2) {
    const row1 = Math.floor(index2 / parameters.dimensions.columns);
    const col1 = index2 % parameters.dimensions.columns;
    const row2 = Math.floor(index1 / parameters.dimensions.columns);
    const col2 = index1 % parameters.dimensions.columns;
    if (col1 === col2) {
        return Math.abs(row1 - row2);
    }
    if (row1 === row2) {
        return Math.abs(col1 - col2);
    }
    return Math.sqrt((row1 - row2) ** 2 + (col1 - col2) ** 2);
}

function detectHuman(data, context) {
    const { radius, index } = context;
    const neighbourIndices = getNeighbourIndices(index, radius);
    const { sigmaM, sigmaMR } = neighbourIndices.reduce((runningWeight, neighbor) => ({
        sigmaM: runningWeight.sigmaM + data[neighbor],
        sigmaMR: runningWeight.sigmaMR + data[neighbor] * getDistance(index, neighbor),
    }), {
        sigmaM: 0,
        sigmaMR: 0
    });
    const alpha = (sigmaMR / sigmaM) / radius;
    if (sigmaM > parameters.humanMinMass
        && parameters.alphaRangeByRadius[radius].min <= alpha
        && alpha <= parameters.alphaRangeByRadius[radius].max) {
        return true;
    }
    return false;
}

function detectObject(data, context) {
    let isHuman = false;
    let humanRadius = -1;
    for (let radius of parameters.humanRadii) {
        if (detectHuman(data, merge(clone(context), { radius }))) {
            isHuman = true;
            humanRadius = radius;
        } else {
            break;
        }
    }
    if (isHuman) {
        return {
            type: 'HUMAN',
            confidence: 1,
            index: context.index,
            radius: humanRadius
        };
    } else {
        return null;
    }
}

function print(data, context) {
    // return;
    let line = '';
    for (let j = 0; j < parameters.dimensions.columns; j++) {
        line += '==\t';
    }
    // console.log(line);
    for (let i = 0; i < parameters.dimensions.rows; i++) {
        line = '';
        for (let j = 0; j < parameters.dimensions.columns; j++) {
            line += parseInt(data[i * parameters.dimensions.columns + j]) + ',\t';
        }
        // console.log(line);
    }
}

function removeNeighbors(data, context) {
    const { index, radius } = context;
    const processedData = clone(data);
    for (let neighbor of getNeighbourIndices(index, radius)) {
        processedData[neighbor] = REMOVED_VALUE;
    }
    return {
        data: processedData,
        context: clone(context),
    };
}

function findObjects(data, context) {
    let result = { data: clone(data), context: merge(clone(context), { objects: [] }) };
    const objects = [];
    const results = [];
    const indicesInTraverseOrder = _.orderBy(_.range(result.data.length), i => result.data[i], 'desc');
    for (let index of indicesInTraverseOrder) {
        if (result.data[index] === 0) {
            continue;
        }
        const object = detectObject(result.data, merge(result.context, { index }));
        if (object !== null && object.confidence > parameters.minConfidence) {
            objects.push(object);
            result = removeNeighbors(result.data, merge(result.context, { index, radius: object.radius }));
            results.push({ data: result.data, context: merge(result.context, { objects }) });
        }
    };
    if (results.length === 0) {
        return result;
    }
    return results;
}

function findNearestObjects(data, context) {
    const { objects } = context;
    if (objects.length < 2) {
        return null;
    }
    let nearest = { distance: Infinity };
    for (let i = 0; i < objects.length; i++) {
        let index1 = objects[i].index;
        for (let j = i + 1; j < objects.length; j++) {
            let index2 = objects[j].index;
            const distance = getDistance(index1, index2);
            if (distance <= nearest.distance) {
                const total = context.raw[index1] + context.raw[index2];
                if (distance === nearest.distance && total < nearest.total) {
                    continue;
                }
                nearest = { index1, index2, total, distance };
            }
        }
    }
    return nearest;
}

function correctNearbyObjects(data, context) {
    let result = { data: clone(data), context: merge(clone(context), { objects: clone(context.objects) }) };;
    const results = [];
    let nearest = null;
    while (true) {
        nearest = findNearestObjects(data, result.context);
        if (nearest === null || nearest.distance > parameters.minDistance) {
            return results;
        }
        const indexToRemove = context.raw[nearest.index1] > context.raw[nearest.index2] ? nearest.index2 : nearest.index1;
        result = { data: clone(result.data), context: merge(clone(result.context), { objects: clone(result.context.objects) }) };
        _.remove(result.context.objects, obj => indexToRemove === obj.index);
        results.push(markObjects(result.data, result.context));
    }
}

function markObjects(data, context) {
    return {
        data: _.range(data.length).map(i => _.some(context.objects, obj => obj.index === i) ? i : 0),
        context: clone(context),
    };
}



function run(data, config) {
    let lastResult = { data: _.flatten(data), context: merge(config, { objects: [] }) };

    // A transformer is a function which accepts a frame and returns the next frame, see adjustCalibration
    // Each transformation should return a new array, modifying the passed array will result in wrong info in visual tool
    // It also accepts a context and returns updated context
    // context can be used to save something that may be useful to consecutive transformer
    // think of context like a global storage between transformations
    // By the end of all transoformations, the context should have an objects array with indices of objects (people)    
    // A transoformation can return {data,context}
    // or if it has sub transformations, then an array of [{data,context},{data,context}], see findObjects

    const transformers = [
        adjustCalibration,
        removeStencil,
        convertToDeviationFromMean,
        removeOutOfRangeDeviations,
        findObjects,
        markObjects,
        correctNearbyObjects,
    ];


    // DO NOT CHANGE ANYTHING AFTER HERE

    let transformations = [lastResult];
    transformers.forEach(transformation => {
        let results = [];
        try {
            results = transformation(lastResult.data, lastResult.context);
        } catch (ex) {
            console.error('error in step, ' + transformation.name, ex);
        }
        if (Array.isArray(results)) {
            if (results.length > 0) {
                results.forEach((result, index) => {
                    transformations.push({ data: result.data, label: `${transformation.name} #${index}` });
                    // print(lastResult.data);
                });
                lastResult = _.last(results);
            }
        } else {
            transformations.push({ data: results.data, label: transformation.name });
            // print(lastResult.data);
            lastResult = results;
        }
    });
    return {
        steps: transformations,
        objects: lastResult.context.objects
    };
};

module.exports = run;
