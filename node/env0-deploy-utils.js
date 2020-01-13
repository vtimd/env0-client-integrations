const Env0ApiClient = require('./api-client');

const apiClient = new Env0ApiClient();

class DeployUtils {
  static async init(options) {
    await apiClient.init(options.apiKey, options.apiSecret);
  }

  async getEnvironment(environmentName, projectId) {
    console.log(`getting all environments projectId: ${projectId}`);
    const environments = await apiClient.callApi('get', `environments?projectId=${projectId}`);
    const environment = environments.find(env => env.name === environmentName);
    console.log(`returning this environment: ${JSON.stringify(environment)}`);
    return environment;
  }

  async createEnvironment(environmentName, organizationId, projectId) {
    const environment = await apiClient.callApi('post', 'environments', {
      data: {
        name: environmentName,
        organizationId: organizationId,
        projectId: projectId,
        lifespanEndAt: null
      }
    });
    console.log(`Created environment ${environment.id}`);
    return environment;
  }

  async setConfiguration(environment, blueprintId, configurationName, configurationValue) {
    const configuration = {
      isSensitive: false,
      name: configurationName,
      organizationId: environment.organizationId,
      scope: 2,
      scopeId: environment.id,
      type: 0,
      value: configurationValue
    };

    console.log(`getting configuration for environmentId: ${environment.id}`);
    const params = { organizationId: environment.organizationId, blueprintId, environmentId: environment.id };
    const configurations = await apiClient.callApi('get', 'configuration', { params });
    const existingConfiguration = configurations.find(config => config.name === configurationName);

    if (existingConfiguration) {
      console.log(`found a configuration that matches the configurationName: ${configurationName}, existingConfiguration: ${JSON.stringify(existingConfiguration)}`);
      configuration.id = existingConfiguration.id;
    }

    console.log(`setting the following configuration: ${JSON.stringify(configuration)}`);
    await apiClient.callApi('post', 'configuration', {data: {...configuration, projectId: undefined}});
  }

  async deployEnvironment(environment, blueprintRevision, blueprintId) {
    console.log(`starting to deploy environmentId: ${environment.id}, blueprintId: ${blueprintId}`);
    const deployment = await apiClient.callApi('post', `environments/${environment.id}/deployments`,
        {data: {blueprintId, blueprintRevision}});

    console.log(`Started deployment ${deployment.id}`);
  }

  async destroyEnvironment(environment) {
    console.log(`Starting to destroy environmentId: ${environment.id}`);
    const deployment = await apiClient.callApi('delete', `environments/deployments/${environment.latestDeploymentLogId}`);
    console.log(`Started destroy ${deployment.id}`);
  }


  async pollEnvironmentStatus(environmentId) {
    const deployEndStatuses = ['CREATED', 'ACTIVE', 'INACTIVE', 'FAILED', 'TIMEOUT'];
    const maxRetryNumber = 90; //waiting for 15 minutes (90 * 10 seconds)
    let retryCount = 0;

    console.log(`Starting status polling for environment status for ${environmentId}, maxRetryNumber: ${maxRetryNumber}`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const environment = await apiClient.callApi('get', `environments/${environmentId}`);
      if (deployEndStatuses.includes(environment.status)) {
        return environment.status;
      } else if (retryCount >= maxRetryNumber) {
        throw new Error('Polling environment reached max retries');
      }
      console.log(`Polling environment status, retryCount: ${retryCount}, environmentStatus: ${environment.status}`);
      retryCount++;
      await apiClient.sleep(10000);
    }
  }

  async archiveIfInactive(environmentId) {
    const envRoute = `environments/${environmentId}`;
    const environment = await apiClient.callApi('get', envRoute);
    if (environment.status !== 'INACTIVE') throw new Error('Environment did not reach INACTIVE status');
    await apiClient.callApi('put', envRoute, { data: { isArchived: true }});
    console.log(`Environment ${environment.name} has been archived`);
  }
}
module.exports = DeployUtils;
