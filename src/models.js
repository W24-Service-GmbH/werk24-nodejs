const fs = require('fs');
const { jsonSchemaToZod } = require("json-schema-to-zod");
const path = require('path');

function deserializeJsonSchema(jsonSchema) {
    return eval(jsonSchemaToZod(jsonSchema, { module: "cjs" }));
}

function parseJsonData(jsonData) {
    const results = {}
    for (const moduleName in jsonData) {
        const c_module = jsonData[moduleName];
        results[moduleName] = deserializeJsonSchema(c_module);
    }
    return results;
}

function readJsonFileSync(filePath) {
    const jsonString = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(jsonString);
    return parseJsonData(jsonData.schemata);
}

const schemaPath = path.resolve(__dirname, '../assets/werk24_json_schema.json')
const models = readJsonFileSync(schemaPath);

module.exports ={
    models
}