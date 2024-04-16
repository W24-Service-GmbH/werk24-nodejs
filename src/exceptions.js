class TechreadException extends Error {
    constructor(message) {
        super(message);
        this.name = "TechreadException";
        this.cliMessageHeader = "Techread Error";
        this.cliMessageBody = "An error occurred while processing your request";
    }
}

class UnauthorizedException extends TechreadException {
    constructor(message = "Unauthorized access or action forbidden.") {
        super(message);
        this.name = "UnauthorizedException";
    }
}

class UnknownException extends TechreadException {
    constructor(message = "An unexpected error occurred.") {
        super(message);
        this.name = "UnknownException";
    }
}

class RequestTooLargeException extends TechreadException {
    constructor(message = "The request size exceeds the maximal request size of 10MB.") {
        super(message);
        this.name = "RequestTooLargeException";
        this.cliMessageHeader = "Request Too Large";
        this.cliMessageBody = `The request size exceeds the maximal request size of 10MB.
Please check https://docs.werk24.io/limitations/drawing_file_size.html
for the most up-to-date information on the maximal request size.`;
    }
}

class ServerException extends TechreadException {
    constructor(message = "A server error occurred.") {
        super(message);
        this.name = "ServerException";
        this.cliMessageHeader = "Server Error";
        this.cliMessageBody = `A Server Error occurred while processing your request.
This indicates a problem with the server. The Werk24 service team has been notified and
will investigate the issue. Please try again later. If the problem persists, please
contact us at info@werk24.io.`;
    }
}

class BadRequestException extends TechreadException {
    constructor(message = "The request body cannot be interpreted.") {
        super(message);
        this.name = "BadRequestException";
    }
}

class ResourceNotFoundException extends TechreadException {
    constructor(message = "Resource not found.") {
        super(message);
        this.name = "ResourceNotFoundException";
    }
}

class UnsupportedMediaType extends TechreadException {
    constructor(message = "The file format is not supported.") {
        super(message);
        this.name = "UnsupportedMediaType";
        this.cliMessageHeader = "Unsupported Media Type";
        this.cliMessageBody = `The file format you uploaded is not supported by Werk24.
Please check https://docs.werk24.io/limitations/drawing_file_format.html
for a current list of supported file formats.`;
    }
}

class LicenseError extends TechreadException {
    constructor(message = "License verification failed.") {
        super(message);
        this.name = "LicenseError";
        this.cliMessageHeader = "License Error";
        this.cliMessageBody = `An error occurred while verifying the license information.
Please ensure that the license information is in a location where it can be found
by the client. The client is currently looking for the license information in the
following locations:

1. The environment variables W24_AUTH_TOKEN
2. The file werk24_license.txt in the current directory, and
3. for backwards compatibility in the file .werk24 in the current directory`;
    }
}

class SSLCertificateError extends TechreadException {
    constructor(message = "SSL Certificate validation failed.") {
        super(message);
        this.name = "SSLCertificateError";
        this.cliMessageHeader = "SSL Certificate Error";
        this.cliMessageBody = `An error occurred while verifying the SSL certificate.
This typically can have two reasons:

1. Your IT department has activated Packet Inspection in your firewall.
    This is a common practice in companies to prevent employees from accessing
    certain websites.

2. You might have a virus on your computer that is trying to intercept your
    internet traffic.

In both cases, please contact your IT department to resolve the issue.
Please understand, that this topic is outside of Werk24's influence.`;
    }
}

// Export classes if needed
module.exports = {
    TechreadException,
    UnauthorizedException,
    UnknownException,
    RequestTooLargeException,
    ServerException,
    BadRequestException,
    ResourceNotFoundException,
    UnsupportedMediaType,
    LicenseError,
    SSLCertificateError
};
