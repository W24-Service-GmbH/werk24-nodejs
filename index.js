/* jshint esversion: 8 */
/* jslint node: true */
"use strict";

const libTechreadClient = require('./src/techreadClient.js');
const {models} = require('./src/models.js');

module.exports = {
    Hook: libTechreadClient.Hook,
    W24TechreadClient: libTechreadClient.W24TechreadClient,
    w24Models: models
};