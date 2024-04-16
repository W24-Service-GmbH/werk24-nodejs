// Assuming we have equivalent functions and classes in Node.js
const { W24TechreadClient } = require('../src/techreadClient');

const fs = require('fs');
const {models} = require("../src/models/techread");
const W24AskTitleBlock = models["werk24.models.ask.W24AskTitleBlock"];
const W24AskPageThumbnail = models["werk24.models.ask.W24AskPageThumbnail"];

function getDrawing(filePath="__tests__/assets/test_drawing.pdf") {
    try {
        const buffer = fs.createReadStream(filePath);
        return buffer;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error; // Rethrow or handle as needed
    }
}

function getModel() {
    return null;
}

describe('TestTechreadClient', () => {


    test('Read with websocket?', async () => {
        const asks = [W24AskPageThumbnail.parse({})];
        const drawing = getDrawing(); // Assume getDrawing is implemented
        const model = getModel(); // Assume getModel is implemented

        const client = await W24TechreadClient.makeFromEnv(null);
        for await (const msg of client.readDrawing(drawing, asks, model)) {
        }
    }, 30000);


    test('Read with callback?', async () => {
        const asks = [W24AskPageThumbnail.parse({})];
        const drawingBytes = getDrawing();

        const client = await W24TechreadClient.makeFromEnv();
        await expect(client.readDrawingWithCallback(
            drawingBytes,
            asks,
            "https://werk24.io",
            5
        )).resolves.not.toThrow();
    });

});


