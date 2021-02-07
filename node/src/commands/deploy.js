const DeployUtils = require('../lib/deploy-utils');
const logger = require('../lib/logger');
const { options } = require('../config/constants');

const { TEMPLATE_ID, ENVIRONMENT_NAME, PROJECT_ID, WORKSPACE_NAME } = options;

const assertTemplateExistsOnInitialDeployment = options => {
  if (!options[TEMPLATE_ID]) throw new Error('Missing template ID on initial deployment');
};

const assertNoWorkspaceNameChanges = options => {
  if (options[WORKSPACE_NAME])
    throw new Error('You may only set Terraform Workspace on the first deployment of an environment');
};

const getConfigurationChanges = environmentVariables =>
  (environmentVariables || []).map(variable => ({
    scope: 'DEPLOYMENT',
    isSensitive: variable.sensitive,
    name: variable.name,
    value: variable.value,
    type: 0 // supporting only environment variable type ATM
  }));

const deploy = async (options, environmentVariables) => {
  const deployUtils = new DeployUtils();
  const configurationChanges = getConfigurationChanges(environmentVariables);

  let deployment;
  let environment = await deployUtils.getEnvironment(options[ENVIRONMENT_NAME], options[PROJECT_ID]);

  if (!environment) {
    logger.info('Initial deployment detected!');
    assertTemplateExistsOnInitialDeployment(options);

    environment = await deployUtils.createAndDeployEnvironment(options, configurationChanges);
    deployment = environment.latestDeploymentLog;
  } else {
    assertNoWorkspaceNameChanges(options);
    deployment = await deployUtils.deployEnvironment(environment, options, configurationChanges);
  }

  const status = await deployUtils.pollDeploymentStatus(deployment);

  deployUtils.assertDeploymentStatus(status);
};

module.exports = deploy;
