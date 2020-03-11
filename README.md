## Getting Started

- install depdendencies

    `npm install`

- Algorithm code is in `src/alogrithm.js`, this is the only file that will be required to be chnaged

- run all tests with stencil

    `npm run test`

- run all tests without stencil

    `npm run test2`

- break data file into smaller files (this is required for visualisation tool)
    > This breaks the json file into multiple parts, each part is suffixed by a number
    > There are also files that contain only failed frames, the suffix starts with f
    > For the failed test data to update on change of algorithm code, run the command again

    `npm run break`

- Update data file in `src/App.js` on line #5 to use appropriate part file in visual tool

    > import testData from './test-data/data-1';

- Start visualisation tool

    `npm start`

## Hackathon

- Every team will create their own branch with their team name
- At the start of hackathon, only partial data.js will be provided
- At the end of 2 hours of hackathon, the full data.js will be provided to everyone
- Jenkins will be used for judging the results
- Jenkins will always have the full data.js, hence results on local and jenkins will vary in the 1st half
- Everytime you make a change that you wish to submit, push the changes to your branch and build that branch on jenkins
- Jenkins Url @ https://build.afreespace.com/job/tim-hackathon/