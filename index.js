/* jshint esversion: 8 */
/* jslint node: true */
"use strict";

const libTechreadClient = require('./src/techreadClient.js');
const {models} = require('./models/techread.js');

module.exports = {
    Hook: libTechreadClient.Hook,
    W24TechreadClient: libTechreadClient.W24TechreadClient,
    techread_models: models
};
