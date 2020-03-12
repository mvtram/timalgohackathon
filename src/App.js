import React from 'react';
import 'semantic-ui-css/semantic.min.css'
import './App.css';
import testRunner from './testRunner';
import testData from './test-data/data-6';
import { Container, Button, Icon, Step, Dropdown } from 'semantic-ui-react';

const STENCIL = false;

const { results, testCases, testCasesByCount } = testRunner(testData, STENCIL);
console.log(results);


const options = [{ text: `All (${testCases.length} cases)`, value: '' },
...Object.keys(testCasesByCount).map(value => ({
  text: `${value} (${testCasesByCount[value].length} cases)`, value
}))];




class App extends React.Component {
  state = {
    selectedCount: ''
  }

  componentDidMount() {
    this.goToTestCase(1);
  }

  renderCell(cell, index) {
    const opacity = (cell == null ? 0 : (0.3 + Math.abs(cell) * 0.7 / 100));
    const color = cell === 0 || isNaN(cell) ? 'white' : cell > 0 ? 'red' : 'green';
    return <td key={index} className="cell"
      style={{
        width: 21,
        height: 28,
        border: 1,
        borderStyle: 'solid',
        borderColor: 'gray',
        textAlign: 'center',
        color: 'white',
        fontSize: 7,
        backgroundColor: color,
        opacity: opacity,
        filter: 'opacity(' + (opacity) + ')'
      }}
    > {isNaN(cell) ? "-" : cell.toFixed(0)}</td>;
  }

  renderRow(row, index) {
    return <tr key={index} className="row"
    >{row.map(this.renderCell)}</tr>;
  }

  to2D(frame1D) {
    const rows = 24, columns = 32;
    const frame2D = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < columns; j++) {
        row.push(frame1D[i * columns + j]);
      }
      frame2D.push(row);
    }
    return frame2D;
  }

  renderFrame(index) {
    const data = this.state.steps[index].data;
    const frame2D = this.to2D(data);
    return <table cellSpacing="0"
      cellPadding="0"
      className="frame"
      style={{

      }}
    ><tbody>{frame2D.map(this.renderRow.bind(this))}</tbody></table>;
  }

  goToStep(index) {
    this.setState({ currentStep: index })
  }


  goToTestCase(index, findFailed = false) {
    const currentStep = 0;
    const currentSet = this.state.selectedCount !== ''
      ? testCasesByCount[this.state.selectedCount]
      : testCases;
    if (!currentSet[index]) {
      console.log(index, currentSet[index]);
      return;
    }
    const currentTestData = currentSet[index];

    if (findFailed && currentTestData.passed) {
      return this.goToTestCase(index + 1, findFailed);
    }
    const result = currentTestData.result;
    const steps = result.steps;
    this.setState({ currentStep, currentTestCaseIndex: index, currentTestData, steps, result, tests: testCases });
  }

  renderStepMenu() {
    return <Step.Group>
      {
        this.state.steps.map((step, index) => <Step
          onClick={() => this.goToStep(index)}
          active={this.state.currentStep === index}
        >
          <Step.Content>
            <Step.Title>{step.label}</Step.Title>
          </Step.Content>
        </Step>
        )
      }

    </Step.Group>;
  }


  filterByCount(selectedCount) {
    console.log(selectedCount);
    this.setState({ selectedCount }, () => this.goToTestCase(0));
  }

  render() {
    if (!this.state.steps || this.state.steps.length === 0) {
      return 'Loading...';
    }
    return (
      <Container>
        {(100 * results.passed / results.total).toFixed(2)}% passed of {results.total}, {results.errors} errors<br />
        <Dropdown
          value={this.state.selectedCount}
          placeholder={`All (${testCases.length} cases)`} fluid selection options={options}
          onChange={(o, d) => this.filterByCount(d.value)} />
        after {this.state.steps[this.state.currentStep].label} ({this.state.currentStep + 1} of {this.state.steps.length} steps)<br />
        count actual: {this.state.result.objects.length}<br />
        count expected: {this.state.currentTestData.expectedCount}<br />
        {this.renderFrame(this.state.currentStep)}
        <Button icon labelPosition='left'
          onClick={() => this.goToStep(this.state.currentStep - 1)}
          disabled={this.state.currentStep === 0}
        >
          <Icon name='left arrow' />
          Previous Step
    </Button>
        <Button icon labelPosition='right'
          onClick={() => this.goToStep(this.state.currentStep + 1)}
          disabled={this.state.currentStep === this.state.steps.length - 1}>
          Next Step
      <Icon name='right arrow' />
        </Button>

        <Button icon labelPosition='left'
          onClick={() => this.goToTestCase(this.state.currentTestCaseIndex - 1)}
          disabled={this.state.currentTestCaseIndex === 0}
        >
          <Icon name='left arrow' />
          Previous Test
    </Button>
        <Button icon labelPosition='right'
          onClick={() => this.goToTestCase(this.state.currentTestCaseIndex + 1)}
          disabled={this.state.currentTestCaseIndex === this.state.tests.length - 1}>
          Next Test
      <Icon name='right arrow' />
        </Button>
        <Button icon labelPosition='right'
          onClick={() => this.goToTestCase(this.state.currentTestCaseIndex + 1, true)}
          disabled={this.state.currentTestCaseIndex === this.state.tests.length - 1}>
          Next Failed Test
      <Icon name='right arrow' />
        </Button>

      </Container>
    );
  }
}

export default App;
