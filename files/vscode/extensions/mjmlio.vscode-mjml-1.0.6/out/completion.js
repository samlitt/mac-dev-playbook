"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const snippets_1 = require("./snippets");
function createCompletionItem(snippet, detail, kind) {
    const snippetCompletion = new vscode_1.CompletionItem(snippet.prefix);
    snippetCompletion.detail = detail;
    snippetCompletion.documentation = new vscode_1.MarkdownString(snippet.description);
    snippetCompletion.insertText = new vscode_1.SnippetString(snippet.body);
    snippetCompletion.kind = kind;
    return snippetCompletion;
}
function isWithinTags(document, position, regex) {
    const docText = document.getText();
    const tagMatches = docText.match(regex);
    if (!tagMatches)
        return false;
    const offset = document.offsetAt(position);
    let isWithinOpeningTag = false;
    let isWithinClosingTag = false;
    let indexOfPos = 0;
    tagMatches.forEach((tag) => {
        if (isWithinOpeningTag && isWithinClosingTag)
            return;
        const tagIndex = docText.indexOf(tag, indexOfPos);
        const tagLength = tagIndex + tag.length;
        const isHTMLTag = tag[0] === '<';
        indexOfPos = tagLength;
        if ((isHTMLTag && tag[1] !== '/') || tag === '{') {
            isWithinOpeningTag = tagLength < offset;
        }
        else if (tag[1] === '/' || tag === '}') {
            isWithinClosingTag = tagIndex > offset - 1;
        }
    });
    if (isWithinOpeningTag && isWithinClosingTag)
        return true;
    else
        return false;
}
function isWithinOpeningTag(document, position, regex) {
    const docText = document.getText();
    const tagMatches = docText.match(regex);
    if (!tagMatches)
        return false;
    const cursorPos = document.offsetAt(position);
    let isWithinOpeningTag = false;
    let indexOfPos = 0;
    tagMatches.forEach((tag) => {
        const tagStart = docText.indexOf(tag, indexOfPos);
        const tagEnd = tagStart + tag.length;
        indexOfPos = tagEnd;
        if (cursorPos > tagStart && cursorPos <= tagEnd) {
            isWithinOpeningTag = true;
        }
    });
    return isWithinOpeningTag;
}
class Completion {
    constructor(subscriptions) {
        const attributeProvider = vscode_1.languages.registerCompletionItemProvider('mjml', {
            provideCompletionItems(document, position) {
                const tagRegex = /<[^/](?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/gm;
                if (!isWithinOpeningTag(document, position, tagRegex))
                    return;
                return snippets_1.tagAttributes.map((attr) => createCompletionItem(attr, 'MJML'));
            },
        });
        const cssPropertyProvider = vscode_1.languages.registerCompletionItemProvider('mjml', {
            provideCompletionItems(document, position) {
                const { text: lineText } = document.lineAt(position);
                const lastLineChar = lineText[position.character];
                if (lastLineChar === ';')
                    return;
                const tagRegex = /<\/?mj-style(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/gm;
                const bracketRegex = /{|}/gm;
                if (!isWithinTags(document, position, tagRegex))
                    return;
                if (!isWithinTags(document, position, bracketRegex))
                    return;
                return snippets_1.cssProperties.map((prop) => {
                    const snippetCompletion = createCompletionItem(prop, 'MJML (CSS)');
                    snippetCompletion.command = {
                        command: 'editor.action.triggerSuggest',
                        title: '',
                    };
                    return snippetCompletion;
                });
            },
        });
        const cssValueProvider = vscode_1.languages.registerCompletionItemProvider('mjml', {
            provideCompletionItems(document, position) {
                const snippetCompletions = [];
                snippets_1.cssProperties.forEach((prop) => {
                    const formattedBody = prop.body.split('$1').join('');
                    if (!document.lineAt(position).text.includes(formattedBody))
                        return;
                    prop.values.forEach((val) => {
                        snippetCompletions.push(createCompletionItem({ prefix: val, body: val }, '', 11));
                    });
                });
                return snippetCompletions;
            },
        });
        const htmlTagProvider = vscode_1.languages.registerCompletionItemProvider('mjml', {
            provideCompletionItems(document, position) {
                const mjTextRegex = /<\/?mj-text(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/gm;
                const htmlTagRegex = /<\/?[^/?mj\-.*](?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/gm;
                if (!isWithinTags(document, position, mjTextRegex))
                    return;
                if (isWithinOpeningTag(document, position, htmlTagRegex))
                    return;
                return snippets_1.htmlTags.map((tag) => createCompletionItem(tag, 'MJML (HTML)'));
            },
        });
        subscriptions.push(attributeProvider, cssPropertyProvider, cssValueProvider, htmlTagProvider);
    }
}
exports.default = Completion;
//# sourceMappingURL=completion.js.map