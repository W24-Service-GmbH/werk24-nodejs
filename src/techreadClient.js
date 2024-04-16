"use strict";
const { v4: uuidv4 } = require('uuid');
const exceptions = require('./exceptions');
const techreadClientHttps = require('./techreadClientHttps');
const techreadClientWss = require('./techreadClientWss');
const authClient = require('./authClient.js');
const {models} = require('./models/techread.js');

const W24TechreadInitResponse = models["werk24.models.techread.W24TechreadInitResponse"];
const W24TechreadExceptionLevel = models["werk24.models.techread.W24TechreadExceptionLevel"];
const W24TechreadException = models["werk24.models.techread.W24TechreadException"];
const W24TechreadMessage = models["werk24.models.techread.W24TechreadMessage"];
const W24TechreadMessageType = models["werk24.models.techread.W24TechreadMessageType"];
const W24TechreadExceptionType = models["werk24.models.techread.W24TechreadExceptionType"];
/**
 * Default Endpoints
 */
let DEFAULT_SERVER_WSS =  "ws-api.w24.co";
let DEFAULT_SERVER_HTTPS = "support.w24.co";

/**
 * Map to translate the local exceptions to official
 * W24Exceptions. This allows us to mock consistent responses
 * even when the files are rejected before they reach the API
 */
const EXCEPTION_MAP = new Map([
    [exceptions.RequestTooLargeException, W24TechreadExceptionType.DRAWING_FILE_SIZE_TOO_LARGE],
    [exceptions.BadRequestException, W24TechreadExceptionType.DRAWING_FILE_SIZE_TOO_LARGE],
]);

class Hook {
    /**
     * A Utility class to register callback requests for a specific message_type or W24Ask.
     *
     * The 'Hook' object is used for handling and maintaining callback requests. Registering
     * an 'ask' should include a complete W24Ask definition, not just the ask type.
     *
     * Attributes:
     * ----------
     * message_type (Optional[W24TechreadMessageType]): Specifies the type of the message.
     * message_subtype (Optional[W24TechreadMessageSubtype]): Specifies the subtype of the message.
     * ask (Optional[W24Ask]): The complete definition of W24Ask, if any.
     * func (Callable): The callback function to be invoked when the resulting information
     *   is available.
     *
     * Note:
     * ----
     * Either a message_type or an ask must be registered. Be careful when registering an ask;
     * a complete W24Ask definition is required, not just the ask type.
     */
    constructor(message_type, message_subtype, ask, func) {
        this.message_type = message_type;
        this.message_subtype = message_subtype;
        this.func = func;
    }
};

class W24TechreadClient {
    constructor(
        techreadServerWss,
        techreadVersion,
        developmentKey = null,
        supportBaseUrl = DEFAULT_SERVER_HTTPS
    ) {
        /**
         * Initialize a new W24TechreadClient.
         *
         * If you wonder about any of the attributes, have a
         * look at the .env file that we provided to you.
         * They contain all the information that you will need.
         *
         * Args:
         * ----
         * techreadServerWss {str} -- domain name that
         *     is being used by the websocket client
         *
         * techreadVersion {str} -- version that you want to
         *     connect to
         *
         * developmentKey {str} -- key that allows you to submit
         *     your request to one of the internal architectures.
         *     You can try guessing or bruteforcing this key;
         *     we'll just charge you for every request you submit and
         *     transfer the money to the holiday bonus account.
         */

        this.developmentKey = developmentKey;

        /*
         * Create an empty reference to the authentication
         * service necessary for the Cognito Authentication.
         */
        this.authClient = null;

        /*
         * Create the necessary clients for the HTTPS and WSS
         */
        this.techreadClientHttps = new techreadClientHttps.TechreadClientHttps(
            techreadVersion,
            supportBaseUrl
        )
        this.techreadClientWss = new techreadClientWss.TechreadClientWss(
            techreadServerWss,
            techreadVersion
        )

    }

    async authenticate(region, token) {
        /**
         * Register with the token
         *
         * Args:
         * ----
         *  token {str} -- your user-specific access token.
         */
        this.authClient = new authClient.AuthClient(token);
        this.techreadClientHttps.setAuthClient(this.authClient);
        this.techreadClientWss.setAuthClient(this.authClient);
    }

    async *readDrawing(
        drawing,
        asks,
        model,
        maxPages=1,
        drawingFilename=null,
    ) {
        /**
         * Send a Technical Drawing to the W24 API to read it.
         *
         * Args:
         * ----
         * drawing (bytes): binary representation of a technical drawing.
         *     Please refer to the API - documentation to learn which mime
         *     types are supported.
         *
         * model (bytes): binary representation of the 3d model (typically
         *     step). This is currently not being used and may come back
         *     later again.
         *
         * asks (List[W24Ask]): List of Asks that are requested from the API.
         *     They must derive from the W24Ask object. Refer to the API
         *     documentation for a full list of supported W24AskTypes
         *
         * maxPages (int): Maximum number of pages that are being processed
         *     of the submitted file. This protects platform users from
         *     costly requests caused by a user uploading a single file with
         *     many pages.
         *
         * drawingFilename (str|null): Optional information about the
         *     filename of the drawing. Frequently this contains information
         *     about the drawing id and you can make that information
         *     available to us through this parameter. If you don't know the
         *     filename, don't worry, it will still work.
         *
         *
         * Yields:
         * ------
         * W24TechreadMessage -- Response object obtained from the API
         *     that indicates the state of your request. Be sure to pass this
         *     to the read_drawing_listen method
         *
         * Raises:
         * ------
         * DrawingTooLarge -- Exception is raised when the drawing was too
         *     large to be processed. At the time of writing. The upload
         *     limit lies at 6 MB (including overhead).
         *
         * UnsupportedMediaType -- Exception is raised when the drawing or
         *     model is submitted in any data type other than bytes.
         */
        try {
            await this.techreadClientWss.connect();

            // Send the initiation command
            const initResult = await this.initRequest(asks, maxPages, drawingFilename);
            yield initResult[0];

            // Stop if the response is unsuccessful
            if (initResult[1].exceptions.length > 0) {
                return;
            }

            // Start reading the file
            for await (const message of this.readRequest(initResult[1], asks, drawing, model)) {
                yield message;
            }
        } finally {
            this.techreadClientWss.disconnect();
        }
    }

    async initRequest(asks, maxPages, drawingFilename) {
        const request = {
            asks: asks,
            developmentKey: this.developmentKey,
            maxPages: maxPages,
            drawingFilename: drawingFilename,
        };

        // Send initialization command to WebSocket server
        await this.techreadClientWss.sendCommand('INITIALIZE', request);

        // Receive message from WebSocket server
        const message = await this.techreadClientWss.recvMessage();

        // Validate the received message
        try {
            const response = W24TechreadInitResponse.parse(message.payload_dict);
            return [message, response];
        } catch (exception) {
            const errorMessage = message.payload?.message;
            if (errorMessage) {
                throw new Error(errorMessage);
            }
            throw exception;
        }
    }

    async *readRequest(initResponse, asks, drawing, model = null) {

        // Upload drawing and optionally the model in parallel
        try {
            // Assuming uploadAssociatedFile returns a Promise
            await this.techreadClientHttps.uploadAssociatedFile(initResponse.drawing_presigned_post, drawing);

            if (model !== null) {
                await this.techreadClientHttps.uploadAssociatedFile(initResponse.drawing_presigned_post, model);
            }
        } catch (error) {
            // Handle exceptions specifically if the payload is too large
            if (error instanceof exceptions.BadRequestException || error instanceof exceptions.RequestTooLargeException) {
                for await (const message of this.triggerAsksException(asks, error)) {
                    yield message;
                }
                return;
            }
            throw error; // Rethrow other unexpected errors
        }

        // Notify the server that all files have been uploaded and start the reading process
        for await (const message of this.sendCommandRead()) {
            yield message;
        }
    }

    async *triggerAsksException(asks, exceptionRaw){
        let exceptionType;
        try {
            exceptionType = EXCEPTION_MAP[exceptionRaw.constructor.name];
        } catch (error) {
            // If we encounter an unexpected exception type, let's raise an error
            throw new Error(`Unknown exception type passed: ${exceptionRaw.constructor.name}`);
        }

        // Translate the raw exception into an official structured exception
        const exception = W24TechreadException.parse({
            exception_level: W24TechreadExceptionLevel.ERROR,
            exception_type: exceptionType
        });

        // Yield a message for each of the requested asks
        for (let curAsk of asks) {
            yield W24TechreadMessage.parse({
                request_id: uuidv4(),
                message_type: W24TechreadMessageType.ASK,
                message_subtype: curAsk.askType,
                excpetions: [exception]
            });
        }
    }

    async *sendCommandRead() {
        // Submit the read command to the API via WebSocket
        await this.techreadClientWss.sendCommand('READ', "{}");

        // Listen for incoming messages from the WebSocket server
        for await (const message of this.techreadClientWss.listen()) {

            // Check if there's a payload URL and download the payload if present
            if (message.payloadUrl) {
                message.payloadBytes = await this.techreadClientHttps.downloadPayload(message.payloadUrl);
            }

            // Yield the message back to the caller
            yield message;

            // Break the loop if the message is a completion message
            if (message.messageType == "PROGRESS" && message.messageSubtype == "COMPLETED"){
                break;
            }
        }
    }

    static async makeFromEnv(version = "v2") {
        const token = process.env.W24TECHREAD_AUTH_TOKEN;
        return await this.makeFromToken(token, version);
    }


    static async makeFromToken(token, region = null, serverHttps = null, serverWss = null, version = "v2") {
        // Use default servers if not provided
        serverHttps = serverHttps || DEFAULT_SERVER_HTTPS;
        serverWss = serverWss || DEFAULT_SERVER_WSS;

        // Create a new instance of the client
        const client = new W24TechreadClient(serverWss, version);

        // Register the credentials (sets the variables, does not trigger a network request)
        await client.authenticate(region, token);

        // Return the new client instance
        return client;
    }

    async readDrawingWithCallback(drawing, asks, callbackUrl, maxPages = 5, drawingFilename = null, callbackHeaders = null) {
        const requestId = await this.techreadClientHttps.readDrawingWithCallback(
            drawing, asks, callbackUrl, maxPages, drawingFilename, callbackHeaders);
        return requestId;

    }

    async readDrawingWithHooks(drawing, hooks, maxPages = 5, drawingFilename = null) {
        // Filter the callback requests to only contain the ask types
        const asksList = hooks.filter(hook => hook.ask).map(hook => hook.ask);

        try {
            // Assuming `readDrawing` is an async generator in the `techreadClient`
            for await (const message of this.readDrawing(drawing, asksList, maxPages, drawingFilename)) {
                await this.callHooksForMessage(message, hooks);
            }
        } catch (error) {
            console.error("Server exception:", error.message);
            throw new Error("ServerException");
        }
    }

    async callHooksForMessage(message, hooks) {
        const hookFunction = this.getHookFunctionForMessage(message, hooks);
        if (!hookFunction) {
            return; // No hook function found, so just return
        }

        // Check if the hookFunction is a function
        if (typeof hookFunction !== 'function') {
            console.warn(`You registered a non-callable trigger of type '${typeof hookFunction}' with the message_type '${message.messageType}'. Please make sure that you are using a function.`);
            return;
        }

        // Call the hook function with the message
        // Check if the function is an async function and call accordingly
        if (hookFunction.constructor.name === 'AsyncFunction') {
            await hookFunction(message);
        } else {
            hookFunction(message);
        }
    }
    static getHookFunctionForMessage(message, hooks) {
        const hookFilter = (hook) => {
            if (message.messageType === W24TechreadMessageType.ASK) {
                return hook.ask !== null && message.messageSubtype.value === hook.ask.askType.value;
            } else {
                return hook.messageType !== null && hook.messageSubtype !== null &&
                       message.messageType === hook.messageType && message.messageSubtype === hook.messageSubtype;
            }
        };

        const foundHook = hooks.find(hookFilter);
        if (foundHook) {
            return foundHook.function;
        } else {
            // If no hook matches, log a warning and return null
            console.warn(`Ignoring message of type ${message.messageType}:${message.messageSubtype} - no hook registered`);
            return null;
        }
    }

    async createHelpdeskTask(task) {
        const createdTask = await this.techreadClientHttps.createHelpdeskTask(task);
        return createdTask;
    }


}

module.exports = {
    W24TechreadClient,
    Hook
};