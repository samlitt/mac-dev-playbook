"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestFile = exports.getContentFromFilesystem = exports.testData = void 0;
const util_1 = require("util");
const vscode = require("vscode");
// import { parseMarkdown } from './parser';
const textDecoder = new util_1.TextDecoder('utf-8');
exports.testData = new WeakMap();
let generationCounter = 0;
const getContentFromFilesystem = async (uri) => {
    try {
        const rawContent = await vscode.workspace.fs.readFile(uri);
        return textDecoder.decode(rawContent);
    }
    catch (e) {
        console.warn(`Error providing tests for ${uri.fsPath}`, e);
        return '';
    }
};
exports.getContentFromFilesystem = getContentFromFilesystem;
class TestFile {
    constructor() {
        this.didResolve = false;
    }
    async updateFromDisk(controller, item) {
        try {
            const content = await (0, exports.getContentFromFilesystem)(item.uri);
            item.error = undefined;
            this.updateFromContents(controller, content, item);
        }
        catch (e) {
            item.error = e.stack;
        }
    }
    /**
     * Parses the tests from the input text, and updates the tests contained
     * by this file to be those from the text,
     */
    updateFromContents(controller, content, item) {
        const ancestors = [{ item, children: [] }];
        const thisGeneration = generationCounter++;
        this.didResolve = true;
        console.log(content);
        const ascend = (depth) => {
            while (ancestors.length > depth) {
                const finished = ancestors.pop();
                finished.item.children.replace(finished.children);
            }
        };
        // parseMarkdown(content, {
        //     onTest: (range, a, operator, b, expected) => {
        //         const parent = ancestors[ancestors.length - 1];
        //         const data = new TestCase(
        //             a,
        //             operator as Operator,
        //             b,
        //             expected,
        //             thisGeneration
        //         );
        //         const id = `${item.uri}/${data.getLabel()}`;
        //         const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
        //         testData.set(tcase, data);
        //         tcase.range = range;
        //         parent.children.push(tcase);
        //     },
        //     onHeading: (range, name, depth) => {
        //         ascend(depth);
        //         const parent = ancestors[ancestors.length - 1];
        //         const id = `${item.uri}/${name}`;
        //         const thead = controller.createTestItem(id, name, item.uri);
        //         thead.range = range;
        //         testData.set(thead, new TestHeading(thisGeneration));
        //         parent.children.push(thead);
        //         ancestors.push({ item: thead, children: [] });
        //     },
        // });
        const testItem = controller.createTestItem('abc', 'ciao', item.uri);
        testItem.range = new vscode.Range(new vscode.Position(10, 0), new vscode.Position(10, 10));
        console.log('testitem', testItem);
        ascend(0); // finish and assign children for all remaining items
    }
}
exports.TestFile = TestFile;
//# sourceMappingURL=tree.js.map