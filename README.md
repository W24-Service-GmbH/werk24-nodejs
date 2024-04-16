
# BETA Version!

## Read a drawing synchronously
```nodejs
const asks = [W24AskPageThumbnail.parse({})];
const drawing = getDrawing(); // Assume getDrawing is implemented
const model = getModel(); // Assume getModel is implemented

const client = await W24TechreadClient.makeFromEnv(null);
for await (const msg of client.readDrawing(drawing, asks, model)) {
    console.log(msg);
}
```
## Read a drawing asynchronously
```nodejs
const drawing = getDrawing();
var message = null;

const client = await W24TechreadClient.makeFromEnv();
const hooks = [
    new Hook({
        ask:W24AskTitleBlock.parse({}),
        func: async (result) => {message = result;}
    })
];

await client.readDrawingWithHooks(drawing, hooks);
console.log(message);
```

## Read a drawing with a webhook as callback
```nodejs
const asks = [W24AskPageThumbnail.parse({})];
const drawingBytes = getDrawing();

const client = await W24TechreadClient.makeFromEnv();
await client.readDrawingWithCallback(
    drawingBytes,
    asks,
    "https://werk24.io",
    5
)
```