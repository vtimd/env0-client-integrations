const { createLogger, format, transports } = require('winston');
const _ = require('lodash');
const { argumentsMap } = require('../config/arguments');

const SECURE_STRING = '**********';

let secrets = [];

const setSecrets = options => {
  secrets = _(argumentsMap)
    .pickBy(({ secret }) => secret)
    .keys()
    .map(opt => options[opt])
    .compact()
    .value();
};

const masker = format(info => {
  let message = _.cloneDeep(info.message);

  secrets.forEach(secret => {
    if (message.includes(secret)) message = message.split(secret).join(SECURE_STRING);
  });

  info.message = message;
  return info;
});

const logger = createLogger({
  format: format.combine(
    masker(),
    format.splat(),
    format.printf(info => info.message)
  ),
  transports: [new transports.Console({ showLevel: false })]
});

logger.setSecrets = setSecrets;

module.exports = logger;
