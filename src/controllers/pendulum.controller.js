const catchAsync = require('../utils/catchAsync');
const httpStatus = require('http-status');
const config = require('../config/config');
const logger = require('../config/logger');
const { client } = require('../redis');
const { pendulumService } = require('../services');

const getInstanceInformation = catchAsync(async (req, res) => {
    res.status(httpStatus.OK).send(`Currently pinging instance: ${config.port}`);
});

const configurePendulum = catchAsync(async (req, res) => {
    const pendulumConfig = req.body;

    logger.info(`Pendulum Received: ${JSON.stringify(pendulumConfig)}`);
    await pendulumService.addPendulumConfig(pendulumConfig);

    res.status(httpStatus.CREATED).send(pendulumConfig);
});

const getPendulumConfig = catchAsync(async (req, res) => {
    const pendulumConfig = await pendulumService.getPendulumConfig();
    res.status(httpStatus.OK).send(pendulumConfig);
});

const getCurrentPosition = catchAsync(async (req, res) => {
    const position = await pendulumService.getCurrentPosition();
    res.status(httpStatus.OK).send(position);
});

const updatePosition = catchAsync(async (req, res) => {
    const position = req.body;
    const response = await pendulumService.updatePosition(position);

    res.status(httpStatus.CREATED).send(response);
});

module.exports = {
    getInstanceInformation,
    configurePendulum,
    getPendulumConfig,
    getCurrentPosition,
    updatePosition
};