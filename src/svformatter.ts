import {
    FormattingOptions,
    Range,
    TextEdit
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';

import {
    ConnectionLogger
} from './genutils';

import * as child from 'child_process';
export class SystemVerilogFormatter {
    private _command: string;

    constructor(command?: string) {
        this._command = command;
    }

    public setCommand(command: string) {
        this._command = command;
    }

    public format(document: TextDocument, range: Range, options: FormattingOptions): Promise<TextEdit[]> {
        if (!this._command) {
            ConnectionLogger.error("Format command not provided");
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            try {
                let stdout: string = '';
                let stderr: string = '';
                let rangeArg: string = !!range ? ` --lines=${range.start.line + 1}-${range.end.line + 1}` : "";
                let commandArgs: string[] = (this._command + rangeArg + " -").split(/\s+/);
                let command: string = commandArgs.shift();
                let formatProc = child.spawn(command, commandArgs);
                formatProc.stdout.on('data', (chunk) => {
                    stdout += chunk;
                });
                formatProc.stderr.on('data', (chunk) => {
                    stderr += chunk;
                });
                formatProc.on('error', (err) => {
                    if (err && (<any>err).code === 'ENOENT') {
                        ConnectionLogger.error(`The format command "${this._command}" is not available.`);
                        resolve([]);
                    }
                });
                formatProc.on('close', (code) => {
                    if (stderr.length !== 0) {
                        ConnectionLogger.error(`Formatting gave errors`);
                        resolve([]);
                    }

                    if (code !== 0) {
                        ConnectionLogger.error(`Format command failed`);
                        resolve([]);
                    }

                    resolve([{
                        range: Range.create(0, 0, document.lineCount - 1, 0),
                        newText: stdout
                    }]);
                });
                formatProc.stdin.end(document.getText());
            } catch (error) {
                ConnectionLogger.error(error);
                resolve([]);
            }
        });
    }
}
