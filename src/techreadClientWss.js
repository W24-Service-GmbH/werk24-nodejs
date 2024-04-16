const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const {models} = require("./models/techread");

const W24TechreadMessage = models["werk24.models.techread.W24TechreadMessage"];

class TechreadClientWss {
    constructor(techreadServerWss, techreadVersion) {
        this.techreadServerWss = techreadServerWss;
        this.techreadVersion = techreadVersion;
        this.endpoint = `wss://${this.techreadServerWss}/${this.techreadVersion}`;
        this.ws = null;
        this.authClient = null;
    }

    setAuthClient(authClient) {
        this.authClient = authClient;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const headers = this.authClient.getAuthHeaders();
            this.ws = new WebSocket(this.endpoint, { headers });

            this.ws.on('open', () => {
                resolve();
            });

            this.ws.on('error', (error) => {
                reject(error);
            });
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    async sendCommand(action, message = "{}") {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("The WebSocket connection is not open.");
        }

        const command = JSON.stringify({ action, message });
        await this.ws.send(command);
    }

    async recvMessage() {
        return new Promise((resolve, reject) => {
            this.ws.once('message', (data) => {
                try {
                    const message = this.processMessage(data);
                    resolve(W24TechreadMessage.parse(message));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    processMessage(messageRaw) {
        try {
            const message = JSON.parse(messageRaw);
            // Assuming the message needs to be validated or processed
            return message;
        } catch (error) {
            throw new Error("Failed to parse the message from the WebSocket.");
        }
    }

    async *listen() {
        // Set a flag to indicate the WebSocket's connection status
        const onClose = new Promise((resolve) => this.ws.on('close', resolve));

        while (this.ws.readyState === WebSocket.OPEN) {
            try {
                // Wait for either a new message or the WebSocket to close
        const message = await Promise.race([
            this.recvMessage(),
            onClose
        ]);

        // If the WebSocket closes, message will be undefined
        if (message === undefined) break;

        yield message;
    } catch (error) {
        // Handle any errors that might occur during message receiving
        console.error('Error receiving message:', error);
        break;
    }
}
    }
}



module.exports = {
    TechreadClientWss
}
