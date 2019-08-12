// {} needed when module does not export default, I think.
// Uncaught TypeError: ... is not a function
import React from 'react';
import fs from 'fs';
import {spawn} from 'child_process';

// import MODEL_ARGS from './HRA_args';
import {MODEL_ARGS, MODEL_NAME} from './valid_HRA_args'; // just for testing
import validate from './validate';

// const INVEST_EXE = 'C:/InVEST_3.7.0_x86/invest-3-x86/invest.exe'
const INVEST_EXE = 'C:/Users/dmf/Miniconda3/envs/invest-env/Scripts/invest.exe'
const TEMP_DIR = 'C:/Users/dmf/projects/workbench_proto/invest-electron/'

function argsToJSON(currentArgs) {
  // make simple args json for passing to python cli
  let args_dict = {};
  for (const argname in currentArgs) {
    args_dict[argname] = currentArgs[argname]['value']
  }
  const datastack = { // keys expected by datastack.py
    args: args_dict,
    model_name: MODEL_NAME,
    invest_version: '3.7.0',
  };

  const jsonContent = JSON.stringify(datastack, null, 2);
  fs.writeFile(TEMP_DIR + 'datastack.json', jsonContent, 'utf8', function (err) {
    if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
    }
    console.log("JSON file has been saved.");
  });
}

export class InvestJob extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            args: MODEL_ARGS,
            workspace: null,
            jobid: null,
            argStatus: 'invalid', // (invalid, valid)
            jobStatus: 'incomplete' // (incomplete, then whatever exit code returned by cli.py)
        };
        this.handleChange = this.handleChange.bind(this);
        this.checkArgStatus = this.checkArgStatus.bind(this);
        this.executeModel = this.executeModel.bind(this);
    }

    componentDidMount() {
      // nice to validate on load, if it's possible to load with default args.
      let openingArgs = this.state.args
      for (const argname in openingArgs) {
        const argument = openingArgs[argname];
        openingArgs[argname]['valid'] = validate(argument.value, argument.validationRules)
      }

      this.setState(
          {args: openingArgs}
      );      
      this.checkArgStatus(this.state.args);
      // console.log('from DidMount:');
      // console.log(JSON.stringify(this.state, null, 2));
    }

    executeModel() {
      argsToJSON(this.state.args);  // first write args to datastack file

      const options = {
        cwd: TEMP_DIR,
        shell: true, // without this, IOError when datastack.py loads json
      };
      const cmdArgs = [MODEL_NAME, '--headless -y -vvv', '-d ' + TEMP_DIR + 'datastack.json']
      const python = spawn(INVEST_EXE, cmdArgs, options);

      python.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      python.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });

      python.on('close', (code) => {
        this.setState({
          jobStatus: code,
        });
        // console.log('from execute close:');
        // console.log(JSON.stringify(this.state, null, 2));
      });
    }

    handleChange(event) {
      const target = event.target;
      const value = target.value;
      const name = target.name;
      const required = target.required;

      let current_args = Object.assign({}, this.state.args);
      current_args[name]['value'] = value
      current_args[name]['valid'] = validate(value, current_args[name]['validationRules'])

      this.setState(
          {args: current_args}
      );      

      this.checkArgStatus(this.state.args)
    }

    checkArgStatus(args) {
      let valids = [];
      let argStatus = '';

      for (const key in args) {
        valids.push(args[key]['valid'])
      }

      if (valids.every(Boolean)) {
          argStatus = 'valid';
      } else {
          argStatus = 'invalid';
      }    
      this.setState(
          {argStatus: argStatus}
      );
    }

    renderForm() {
        console.log('from InvestJob:')
        console.log(JSON.stringify(this.state, null, 2));
        return(
            <ArgsForm 
                args={this.state.args}
                handleChange={this.handleChange} 
            />
        );
    }

    render () {
        const argStatus = this.state.argStatus;
        const args = this.state.args;
        let submitButton = <button 
            onClick={this.executeModel}
            disabled>
                execute
            </button>
        
        if (argStatus === 'valid') {
            submitButton = <button 
            onClick={this.executeModel}>
                execute
            </button>
        }

        return(
            <div>
              {this.renderForm()}
              {submitButton}
            </div>
        );
    }
}

class ArgsForm extends React.Component {

  render() {
    const current_args = Object.assign({}, this.props.args)
    let formItems = [];
    for (const arg in current_args) {
      const argument = current_args[arg];
      if (argument.type !== 'select') {
        formItems.push(
          <form>
            <label>
              {argument.argname}
              <input 
                name={argument.argname}
                type={argument.type}
                value={argument.value}
                required={argument.required}
                onChange={this.props.handleChange}/>
            </label>
          </form>)
      } else {
        formItems.push(
          <form>
            <label>
              {argument.argname}
              <select 
                name={argument.argname}
                value={argument.value}
                required={argument.required}
                onChange={this.props.handleChange}>
                  {argument.options.map(opt =>
                    <option value={opt}>{opt}</option>
                  )}
              </select>
            </label>
          </form>)
      }
    }

    return (
      <div>{formItems}</div>
    );
  }
}

