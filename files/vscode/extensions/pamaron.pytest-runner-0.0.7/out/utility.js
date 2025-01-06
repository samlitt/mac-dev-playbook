"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utility = void 0;
const vscode = require("vscode");
const constants_1 = require("./constants");
const fs = require("fs");
class Utility {
    static async getPythonPath(document) {
        try {
            const extension = vscode.extensions.getExtension('ms-python.python');
            if (!extension) {
                return constants_1.Constants.python;
            }
            const usingNewInterpreterStorage = extension.packageJSON?.featureFlags?.usingNewInterpreterStorage;
            if (usingNewInterpreterStorage) {
                if (!extension.isActive) {
                    await extension.activate();
                }
                const execCommand = extension.exports.settings.getExecutionDetails
                    ? extension.exports.settings.getExecutionDetails(document?.uri)
                        .execCommand
                    : extension.exports.settings.getExecutionCommand(document?.uri);
                return execCommand ? execCommand.join(' ') : constants_1.Constants.python;
            }
            else {
                return this.getConfiguration('python', document).get('pythonPath');
            }
        }
        catch (error) {
            return constants_1.Constants.python;
        }
    }
    static getConfiguration(section, document) {
        if (document) {
            return vscode.workspace.getConfiguration(section, document.uri);
        }
        else {
            return vscode.workspace.getConfiguration(section);
        }
    }
    static async getDefaultPytestCmd(document) {
        const pythonPath = await this.getPythonPath(document);
        if (pythonPath) {
            let pytestPath = `${pythonPath.split('/').slice(0, -1).join('/')}/${constants_1.Constants.pytest}`;
            return this._checkPytest(pytestPath);
        }
        else {
            let pytestPath = constants_1.Constants.pytest;
            return this._checkPytest(pytestPath);
        }
    }
    static _checkPytest(path) {
        if (fs.existsSync(path)) {
            return path;
        }
        else {
            return;
        }
    }
}
exports.Utility = Utility;
//# sourceMappingURL=utility.js.map