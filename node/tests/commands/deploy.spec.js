const deploy = require('../../src/commands/deploy');
const DeployUtils = require('../../src/lib/deploy-utils');
const { options } = require('../../src/config/constants');

const { ENVIRONMENT_NAME, PROJECT_ID, ORGANIZATION_ID, TEMPLATE_ID, REVISION, WORKSPACE_NAME } = options;

const mockOptions = {
  [PROJECT_ID]: 'project0',
  [ENVIRONMENT_NAME]: 'environment0',
  [ORGANIZATION_ID]: 'organization0'
};

const mockOptionsWithRequired = {
  ...mockOptions,
  [WORKSPACE_NAME]: 'workspace0',
  [TEMPLATE_ID]: 'template0',
  [REVISION]: 'revision0'
};

const mockGetEnvironment = jest.fn();
const mockCreateAndDeployEnvironment = jest.fn();
const mockDeployEnvironment = jest.fn();
const mockPollDeploymentStatus = jest.fn();

jest.mock('../../src/lib/deploy-utils');
jest.mock('../../src/lib/logger');

const mockDeployment = { id: 'id0' };
const mockEnvironment = { id: 'environment0', latestDeploymentLog: mockDeployment };

describe('deploy', () => {
  beforeEach(() => {
    DeployUtils.mockImplementation(() => ({
      getEnvironment: mockGetEnvironment,
      createAndDeployEnvironment: mockCreateAndDeployEnvironment,
      deployEnvironment: mockDeployEnvironment,
      pollDeploymentStatus: mockPollDeploymentStatus,
      assertDeploymentStatus: jest.fn()
    }));
  });

  beforeEach(() => {
    mockDeployEnvironment.mockResolvedValue(mockDeployment);
    mockCreateAndDeployEnvironment.mockResolvedValue(mockEnvironment);
  });

  it('should get environment', async () => {
    await deploy(mockOptionsWithRequired);

    expect(mockGetEnvironment).toBeCalledWith(mockOptions[ENVIRONMENT_NAME], mockOptions[PROJECT_ID]);
  });

  it("should create environment when it doesn't exist", async () => {
    mockGetEnvironment.mockResolvedValue(undefined);

    await deploy(mockOptionsWithRequired);
    expect(mockCreateAndDeployEnvironment).toBeCalledWith(mockOptionsWithRequired, []);
  });

  describe('proper set of configuration changes', () => {
    const environmentVariables = [
      {
        name: 'foo',
        value: 'bar',
        sensitive: false
      },
      {
        name: 'baz',
        value: 'waldo',
        sensitive: true
      }
    ];

    const expectedConfigurationChanges = environmentVariables.map(variable => ({
      scope: 'DEPLOYMENT',
      name: variable.name,
      value: variable.value,
      isSensitive: variable.sensitive,
      type: 0
    }));

    it('on initial deploy', async () => {
      mockGetEnvironment.mockResolvedValue(undefined);

      await deploy(mockOptionsWithRequired, environmentVariables);

      expect(mockCreateAndDeployEnvironment).toBeCalledWith(mockOptionsWithRequired, expectedConfigurationChanges);
    });

    it('should redeploy with arguments', async () => {
      mockGetEnvironment.mockResolvedValue(mockEnvironment);
      const redeployOptions = { ...mockOptionsWithRequired, [WORKSPACE_NAME]: undefined };
      await deploy(redeployOptions, environmentVariables);

      expect(mockDeployEnvironment).toBeCalledWith(mockEnvironment, redeployOptions, expectedConfigurationChanges);
      expect(mockPollDeploymentStatus).toBeCalledWith(mockDeployment);
    });

    it('should not allow to redeploy with workspace name set', async () => {
      mockGetEnvironment.mockResolvedValue(mockEnvironment);

      await expect(deploy({ [WORKSPACE_NAME]: 'workspace0' }, environmentVariables)).rejects.toThrowError(
        'You may only set Terraform Workspace on the first deployment of an environment'
      );
    });
  });

  it('should fail when template is missing on initial deployment', async () => {
    mockGetEnvironment.mockResolvedValue(undefined);

    await expect(deploy(mockOptions)).rejects.toThrow(
      expect.objectContaining({ message: 'Missing template ID on initial deployment' })
    );
  });
});
