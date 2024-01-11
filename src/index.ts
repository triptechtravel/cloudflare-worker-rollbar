import ErrorStackParser from "error-stack-parser";

const rollbarUrl = `https://api.rollbar.com/api/1/item/`;

function Frame(stackFrame: ErrorStackParser.StackFrame) {
  const data: any = {};

  // data._stackFrame = stackFrame;

  data.filename = stackFrame.fileName;
  data.lineno = stackFrame.lineNumber;
  data.colno = stackFrame.columnNumber;
  data.method = stackFrame.functionName;
  data.args = stackFrame.args;

  return data;
}

interface Rollbar {
  token: string;
  environment: string;
}

class Rollbar {
  constructor(token?: string, environment?: string | null) {
    if (!token) {
      return;
    }

    this.token = token;
    this.environment = environment ?? "production";
  }

  async error(error: Error, description?: string | null) {
    if (!this?.token) {
      return;
    }

    const stack = ErrorStackParser.parse(error);
    const rollbarBody = {
      access_token: this.token,
      data: {
        environment: this.environment,
        body: {
          trace: {
            frames: stack.map((stackFrame) => Frame(stackFrame)),
            exception: {
              class: error.name,
              message: error.message,
            },
          },
        },
      },
    };

    if (description) {
      Object.assign(rollbarBody.data.body.trace.exception, {
        description: description,
      });
    }
    const rollbarRequest = new Request(rollbarUrl, {
      method: "POST",
      body: JSON.stringify(rollbarBody),
    });
    return await fetch(rollbarRequest);
  }

  async message(message: string, attributes?: {} | null) {
    if (!this?.token) {
      return;
    }

    const rollbarBody = {
      access_token: this.token,
      data: {
        environment: this.environment,
        body: {
          message: {
            body: message,
          },
        },
      },
    };

    if (attributes) {
      Object.assign(rollbarBody.data.body.message, attributes);
    }

    const rollbarRequest = new Request(rollbarUrl, {
      method: "POST",
      body: JSON.stringify(rollbarBody),
    });
    return await fetch(rollbarRequest);
  }
}

export default Rollbar;
