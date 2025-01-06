"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.codeGetTypstWsFontArgs = exports.getTypstWsFontArgs = exports.getTypstWsPath = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const cross_spawn_1 = require("cross-spawn");
const promises_1 = require("fs/promises");
const path = require("path");
const ws_1 = require("ws");
async function loadHTMLFile(context, relativePath) {
    const filePath = path.resolve(context.extensionPath, relativePath);
    const fileContents = await (0, promises_1.readFile)(filePath, 'utf8');
    return fileContents;
}
async function getTypstWsPath(extensionPath) {
    const state = getTypstWsPath;
    (!state.BINARY_NAME) && (state.BINARY_NAME = "typst-ws");
    (!state.getConfig) && (state.getConfig = (() => vscode.workspace.getConfiguration().get('typst-preview.executable')));
    const bundledPath = path.resolve(extensionPath || path.join(__dirname, ".."), "out", state.BINARY_NAME);
    const configPath = state.getConfig();
    if (state.bundledPath === bundledPath && state.configPath === configPath) {
        // console.log('getTypstWsPath cached', state.resolved);
        return state.resolved;
    }
    state.bundledPath = bundledPath;
    state.configPath = configPath;
    const executableExists = (path) => {
        return new Promise(resolve => {
            try {
                const spawnRet = (0, cross_spawn_1.spawn)(path, ['--help'], {
                    timeout: 1000, /// 1 second
                });
                spawnRet.on('error', () => resolve(false));
                spawnRet.on('exit', (code) => resolve(code === 0));
            }
            catch {
                resolve(false);
            }
        });
    };
    const resolvePath = async () => {
        console.log('getTypstWsPath resolving', bundledPath, configPath);
        if (configPath?.length) {
            return configPath;
        }
        if (await executableExists(bundledPath)) {
            return bundledPath;
        }
        vscode.window.showWarningMessage(`Failed to find ${state.BINARY_NAME} executable at ${bundledPath},` +
            `maybe we didn't ship it for your platform? Using ${state.BINARY_NAME} from PATH`);
        return state.BINARY_NAME;
    };
    return (state.resolved = await resolvePath());
}
exports.getTypstWsPath = getTypstWsPath;
function getTypstWsFontArgs(fontPaths) {
    return (fontPaths ?? []).flatMap((fontPath) => ["--font-path", fontPath]);
}
exports.getTypstWsFontArgs = getTypstWsFontArgs;
function codeGetTypstWsFontArgs() {
    return getTypstWsFontArgs(vscode.workspace.getConfiguration().get('typst-preview.fontPaths'));
}
exports.codeGetTypstWsFontArgs = codeGetTypstWsFontArgs;
function getProjectRoot(currentPath) {
    const checkIfPathContains = (base, target) => {
        const relativePath = path.relative(base, target);
        return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    };
    const paths = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath).filter(folder => checkIfPathContains(folder, currentPath));
    if (!paths || paths.length === 0) {
        return null;
    }
    else {
        return paths[0];
    }
}
const serverProcesses = [];
const activeTask = new Map();
const panelScrollTo = async (bindDocument, activeEditor) => {
    const tcb = activeTask.get(bindDocument);
    if (tcb === undefined) {
        return;
    }
    const { addonΠserver } = tcb;
    const scrollRequest = {
        'event': 'panelScrollTo',
        'filepath': bindDocument.uri.fsPath,
        'line': activeEditor.selection.active.line,
        'character': activeEditor.selection.active.character,
    };
    console.log(scrollRequest);
    addonΠserver.send(JSON.stringify(scrollRequest));
};
async function editorScrollTo(activeEditor, jump) {
    console.log("recv editorScrollTo request", jump);
    if (jump.start === null || jump.end === null) {
        return;
    }
    // open this file and show in editor
    const doc = await vscode.workspace.openTextDocument(jump.filepath);
    const editor = await vscode.window.showTextDocument(doc, activeEditor.viewColumn);
    const startPosition = new vscode.Position(jump.start[0], jump.start[1]);
    const endPosition = new vscode.Position(jump.end[0], jump.end[1]);
    const range = new vscode.Range(startPosition, endPosition);
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}
function syncEditorChanges(addonΠserver) {
    console.log("recv syncEditorChanges request");
    let files = {};
    vscode.workspace.textDocuments.forEach((doc) => {
        if (doc.isDirty) {
            files[doc.fileName] = doc.getText();
        }
    });
    addonΠserver.send(JSON.stringify({
        event: "syncMemoryFiles",
        files,
    }));
}
function runServer(command, args, outputChannel) {
    const serverProcess = (0, cross_spawn_1.spawn)(command, args, {
        env: {
            ...process.env,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            "RUST_BACKTRACE": "1",
        }
    });
    serverProcess.on('error', (err) => {
        console.error('Failed to start server process');
        vscode.window.showErrorMessage(`Failed to start typst-ws(${command}) process: ${err}`);
    });
    serverProcess.stdout.on('data', (data) => {
        outputChannel.append(data.toString());
    });
    serverProcess.stderr.on('data', (data) => {
        outputChannel.append(data.toString());
    });
    serverProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
            vscode.window.showErrorMessage(`typst-ws process exited with code ${code}`);
        }
        console.log(`child process exited with code ${code}`);
    });
    serverProcesses.push(serverProcesses);
    return new Promise((resolve, reject) => {
        serverProcess.stderr.on('data', (data) => {
            if (data.toString().includes("listening on")) {
                // port is 127.0.0.1:{port}, use regex
                const port = data.toString().match(/127\.0\.0\.1:(\d+)/)?.[1];
                if (port === undefined) {
                    reject("Failed to get port from log: " + data.toString());
                }
                else {
                    resolve([port, serverProcess]);
                }
            }
        });
    });
}
const launchPreview = async (task) => {
    let shadowDispose = undefined;
    let shadowDisposeClose = undefined;
    const { context, outputChannel, activeEditor, bindDocument, } = task;
    const filePath = bindDocument.uri.fsPath;
    const refreshStyle = vscode.workspace.getConfiguration().get('typst-preview.refresh') || "onSave";
    const scrollSyncMode = vscode.workspace.getConfiguration().get('typst-preview.scrollSync') || "never";
    const fontendPath = path.resolve(context.extensionPath, "out/frontend");
    await watchEditorFiles();
    const { serverProcess, port } = await launchTypstWs(task.kind === 'browser' ? fontendPath : null);
    const addonΠserver = new ws_1.WebSocket("ws://127.0.0.1:23626");
    addonΠserver.addEventListener("message", async (message) => {
        const data = JSON.parse(message.data);
        switch (data.event) {
            case "editorScrollTo": return await editorScrollTo(activeEditor, data /* JumpInfo */);
            case "syncEditorChanges": return syncEditorChanges(addonΠserver);
            default: {
                console.warn("unknown message", data);
                break;
            }
        }
    });
    const src2docHandler = (e) => {
        if (e.textEditor === activeEditor) {
            const kind = e.kind;
            console.log(`selection changed, kind: ${kind && vscode.TextEditorSelectionChangeKind[kind]}`);
            if (kind === vscode.TextEditorSelectionChangeKind.Mouse) {
                console.log(`selection changed, sending src2doc jump request`);
                panelScrollTo(bindDocument, activeEditor);
            }
        }
    };
    const src2docHandlerDispose = scrollSyncMode === "onSelectionChange"
        ? vscode.window.onDidChangeTextEditorSelection(src2docHandler, 500)
        : undefined;
    serverProcess.on('exit', (code) => {
        addonΠserver.close();
        if (activeTask.has(bindDocument)) {
            activeTask.delete(bindDocument);
        }
        src2docHandlerDispose?.dispose();
        shadowDispose?.dispose();
        shadowDisposeClose?.dispose();
    });
    switch (task.kind) {
        case 'browser': return launchPreviewInBrowser();
        case 'webview': return launchPreviewInWebView();
    }
    async function launchPreviewInBrowser() {
        // todo: may override the same file
        activeTask.set(bindDocument, {
            addonΠserver,
        });
    }
    async function launchPreviewInWebView() {
        const basename = path.basename(activeEditor.document.fileName);
        // Create and show a new WebView
        const panel = vscode.window.createWebviewPanel('typst-ws-preview', // 标识符
        `${basename} (Preview)`, // 面板标题
        vscode.ViewColumn.Beside, // 显示在编辑器的哪一侧
        {
            enableScripts: true, // 启用 JS
        });
        panel.onDidDispose(async () => {
            // todo: bindDocument.onDidDispose, but we did not find a similar way.
            activeTask.delete(bindDocument);
            serverProcess.kill();
            console.log('killed preview services');
            panel.dispose();
        });
        // 将已经准备好的 HTML 设置为 Webview 内容
        let html = await loadHTMLFile(context, "./out/frontend/index.html");
        html = html.replace(/\/typst-webview-assets/g, `${panel.webview
            .asWebviewUri(vscode.Uri.file(fontendPath))
            .toString()}/typst-webview-assets`);
        panel.webview.html = html.replace("ws://127.0.0.1:23625", `ws://127.0.0.1:${port}`);
        activeTask.set(bindDocument, {
            panel,
            addonΠserver,
        });
    }
    ;
    async function watchEditorFiles() {
        if (refreshStyle === "onType") {
            console.log('watch editor changes');
            shadowDispose = vscode.workspace.onDidChangeTextDocument(async (e) => {
                if (e.document.uri.scheme === "file") {
                    // console.log("... ", "updateMemoryFiles", e.document.fileName);
                    addonΠserver.send(JSON.stringify({
                        event: "updateMemoryFiles",
                        files: {
                            [e.document.fileName]: e.document.getText(),
                        },
                    }));
                }
            });
            shadowDisposeClose = vscode.workspace.onDidSaveTextDocument(async (e) => {
                if (e.uri.scheme === "file") {
                    console.log("... ", "saveMemoryFiles", e.fileName);
                    addonΠserver.send(JSON.stringify({
                        event: "removeMemoryFiles",
                        files: [e.fileName],
                    }));
                }
            });
        }
    }
    ;
    async function launchTypstWs(frontendPath) {
        const serverPath = await getTypstWsPath(context.extensionPath);
        console.log(`Watching ${filePath} for changes`);
        const projectRoot = getProjectRoot(filePath);
        const rootArgs = projectRoot ? ["--root", projectRoot] : [];
        const staticFileArgs = frontendPath ? ["--static-file-path", frontendPath] : [];
        const [port, serverProcess] = await runServer(serverPath, [
            "--data-plane-host", "127.0.0.1:23625",
            ...rootArgs,
            ...staticFileArgs,
            ...codeGetTypstWsFontArgs(),
            "watch", filePath,
        ], outputChannel);
        console.log('Launched server, port:', port);
        // window.typstWebsocket.send("current");
        return {
            serverProcess, port
        };
    }
    ;
};
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const outputChannel = vscode.window.createOutputChannel('typst-preview');
    let webviewDisposable = vscode.commands.registerCommand('typst-preview.preview', launchPrologue('webview'));
    let browserDisposable = vscode.commands.registerCommand('typst-preview.browser', launchPrologue('browser'));
    let syncDisposable = vscode.commands.registerCommand('typst-preview.sync', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        panelScrollTo(activeEditor.document, activeEditor);
    });
    context.subscriptions.push(webviewDisposable, browserDisposable, syncDisposable);
    process.on('SIGINT', () => {
        for (const serverProcess of serverProcesses) {
            serverProcess.kill();
        }
    });
    function launchPrologue(kind) {
        return async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }
            const bindDocument = activeEditor.document;
            launchPreview({
                kind,
                context,
                outputChannel,
                activeEditor,
                bindDocument,
            });
        };
    }
    ;
}
exports.activate = activate;
// This method is called when your extension is deactivated
async function deactivate() {
    console.log(activeTask);
    for (const [_, task] of activeTask) {
        task.panel?.dispose();
    }
    console.log('killing preview services');
    for (const serverProcess of serverProcesses) {
        serverProcess.kill();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map