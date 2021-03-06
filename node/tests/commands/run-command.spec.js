require('jest-extended');
const runCommand = require('../../src/commands/run-command');
const configManager = require('../../src/lib/config-manager');
const { options } = require('../../src/config/constants');
const deploy = require('../../src/commands/deploy');
const destroy = require('../../src/commands/destroy');
const approve = require('../../src/commands/approve');
const cancel = require('../../src/commands/cancel');

jest.mock('../../src/commands/deploy');
jest.mock('../../src/commands/destroy');
jest.mock('../../src/commands/approve');
jest.mock('../../src/commands/cancel');
jest.mock('../../src/lib/deploy-utils');
jest.mock('../../src/lib/config-manager');

const { API_KEY, API_SECRET, ORGANIZATION_ID, PROJECT_ID, ENVIRONMENT_NAME, REQUIRES_APPROVAL } = options;

const mockRequiredOptions = {
  [PROJECT_ID]: 'proj0',
  [ORGANIZATION_ID]: 'org0',
  [API_KEY]: 'key0',
  [API_SECRET]: 'secret0',
  [ENVIRONMENT_NAME]: 'env0'
};

describe('run command', () => {
  beforeEach(() => {
    jest.spyOn(configManager, 'read').mockReturnValue(mockRequiredOptions);
  });

  describe('configuration', () => {
    beforeEach(async () => {
      await runCommand('deploy', mockRequiredOptions);
    });

    it('should read configuration and merge with input options', async () => {
      expect(configManager.read).toBeCalledWith(mockRequiredOptions);
    });

    it('should not overwrite configuration', async () => {
      expect(configManager.write).not.toBeCalled();
    });
  });

  describe('when there are missing required options', () => {
    it('should fail with proper error message', async () => {
      jest.spyOn(configManager, 'read').mockReturnValue({});
      await expect(runCommand('deploy', {})).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('Missing required options') })
      );
    });
  });

  describe('requires approval argument', () => {
    it.each`
      requiresApprovalValue
      ${'true'}
      ${'false'}
      ${undefined}
    `(
      'should succeed when requires approval argument has a value of $requiresApprovalValue',
      async ({ requiresApprovalValue }) => {
        const options = { ...mockRequiredOptions, [REQUIRES_APPROVAL]: requiresApprovalValue };
        jest.spyOn(configManager, 'read').mockReturnValue(options);

        await expect(runCommand('deploy', options)).toResolve();
      }
    );

    it('should fail when requires approval argument has an invalid value', async () => {
      const options = { ...mockRequiredOptions, [REQUIRES_APPROVAL]: 'something' };
      jest.spyOn(configManager, 'read').mockReturnValue(options);

      await expect(runCommand('deploy', options)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('Bad argument') })
      );
    });
  });

  describe('when all required options exist', () => {
    describe.each`
      command      | mock
      ${'deploy'}  | ${deploy}
      ${'destroy'} | ${destroy}
      ${'approve'} | ${approve}
      ${'cancel'}  | ${cancel}
    `('when command is $command', ({ command, mock }) => {
      beforeEach(async () => {
        await runCommand(command, mockRequiredOptions);
      });

      it('should call proper callback', () => {
        expect(mock).toBeCalledWith(mockRequiredOptions, undefined);
      });
    });
  });
});
