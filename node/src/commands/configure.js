const inquirer = require('inquirer');
const configManager = require('../lib/config-manager');
const { argumentsMap } = require('../config/arguments');
const _ = require('lodash');

const emptyConfig = configManager.INCLUDED_OPTIONS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {});

const getQuestions = configuration => {
  return Object.entries(configuration).map(([key, value]) => ({
    name: key,
    message: argumentsMap[key].prompt,
    default: value,
    prefix: ''
  }));
};

const removeEmptyAnswers = answers => _.pickBy(answers, i => i);

const configure = async () => {
  const configuration = { ...emptyConfig, ...configManager.read() };

  const questions = getQuestions(configuration);

  const answers = await inquirer.prompt(questions);

  configManager.write(removeEmptyAnswers(answers));
};

module.exports = configure;
