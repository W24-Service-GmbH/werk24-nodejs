const { v4: uuidv4 } = require('uuid');
const { URL } = require('url');
const axios = require('axios');
const https = require('https');
const exceptions = require('./exceptions');
const FormData = require('form-data');
const clientVersion = require('../package.json').version
const {models} = require('./models.js');

const W24TechreadWithCallbackPayload = models["werk24.models.techread.W24TechreadWithCallbackPayload"];

class TechreadClientHttps {
    constructor(techreadVersion, supportBaseUrl) {
        this.techreadVersion = techreadVersion;
        this.supportBaseUrl = supportBaseUrl;
        this.authClient = null; // This will hold the authClient similar to the Python code

    }

    setAuthClient(authClient) {
        this.authClient = authClient;
    }

    async uploadAssociatedFile(presignedPost, content) {
        if (content == null) {
            return; // Ignore if payload is empty
        }

        // Append the fields from the pre-signed POST data
        const formData = new FormData();
        Object.entries(presignedPost.fields).forEach(([key, value]) => {
            formData.append(key, value);
        });

        // Append the file; 'file' is the key used for the file content in S3 POST
        formData.append('file', content);

        // Make the POST request to the pre-signed POST URL
        try {
            const response = await axios.post(
                presignedPost.url,
                formData,
                {...formData.getHeaders()},
            );
            this._raiseForStatus(presignedPost.url, response.status);
        } catch (error) {
            this._raiseForStatus(presignedPost.url, error.response.status);
        }
    }

    async downloadPayload(payloadUrl) {
        try {
            const response = await axios.get(payloadUrl);
            this._raiseForStatus(payloadUrl, response.status);
            return response.data;
        } catch (error) {
            if (error.response) {
                this._handleError(error.response.status, payloadUrl);
            } else {
                throw new Error("Network or unknown error occurred");
            }
        }
    }

    _raiseForStatus(url, statusCode) {
        const errorClass = this._getErrorClassForStatusCode(statusCode);
        if (errorClass) {
            throw new errorClass(`Request failed '${url}' with code ${statusCode}`);
        }
    }

    _getErrorClassForStatusCode(statusCode) {
        if (statusCode >= 200 && statusCode < 300) return null;
        if (statusCode == 400) return exceptions.BadRequestException;
        if (statusCode >= 401 && statusCode < 404) return exceptions.UnauthorizedException;
        if (statusCode >= 404 && statusCode < 405) return exceptions.ResourceNotFoundException;
        if (statusCode == 413) return exceptions.RequestTooLargeException;
        if (statusCode == 415) return exceptions.UnsupportedMediaType;
        return ServerException;
    }


    async readDrawingWithCallback(
        drawingBytes,
        asks,
        callbackUrl,
        maxPages = 5,
        drawingFilename = 'drawing.pdf',
        callbackHeaders = null
    ) {
        const formData = new FormData();
        formData.append('drawing', drawingBytes, { filename: drawingFilename });

        const payload = W24TechreadWithCallbackPayload.parse({
            asks: asks,
            callback_url: callbackUrl,
            callback_headers: callbackHeaders,
            max_pages: maxPages,
            client_version: clientVersion,
            drawing_filename: drawingFilename
        });

        for (const [key, value] of Object.entries(payload)) {
            if (typeof value !== 'string') {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, value);
            }
        }

        // Make the headers
        var headers = {
            ...this.authClient.getAuthHeaders(),
            ...formData.getHeaders(),
        };

        // make the config
        const config = {
            headers: {...headers},
        };

        const url = this.makeSupportUrl("techread/read-with-callback")
        try {
            const response = await axios.post(url, formData, config);
            return uuidv4(response.data.requestId); // Assuming the server returns requestId
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    makeSupportUrl(path) {
        return new URL(path, `https://${this.supportBaseUrl}`).toString();
    }

}


module.exports = {
    TechreadClientHttps
}
