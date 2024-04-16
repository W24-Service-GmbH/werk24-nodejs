const fs = require('fs');
const { jsonSchemaToZod } = require("json-schema-to-zod");

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
    // Read the file and automatically convert it to JSON
    const jsonString = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(jsonString);
    return parseJsonData(jsonData.schemata);
}

const models = readJsonFileSync('./assets/werk24_json_schema.json');

module.exports ={
    models
}