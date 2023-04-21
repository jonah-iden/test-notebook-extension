import * as vscode from 'vscode';

interface RawNotebookData {
    cells: RawNotebookCell[]
}

interface RawNotebookCell {
    language: string;
    source: string[];
    cell_type: 'code' | 'markdown';
    editable?: boolean;
    outputs?: { data: Object }[]
}

export class TestNotebookSerializer implements vscode.NotebookSerializer {
    public async deserializeNotebook(data: Uint8Array, token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        var contents = new TextDecoder().decode(data);    // convert to String to make JSON object

        // Read file contents
        let raw: RawNotebookData;
        try {
            raw = <RawNotebookData>JSON.parse(contents);
        } catch {
            raw = { cells: [] };
        }

        // Create array of Notebook cells for the VS Code API from file contents
        const cells = raw.cells.map(item => new vscode.NotebookCellData(
            item.cell_type === 'code' ? vscode.NotebookCellKind.Code : vscode.NotebookCellKind.Markup,
            item.source.join(''),
            item.cell_type === 'code' ? 'python' : 'markdown'
        ));

        raw.cells.forEach((cell, index) => {
            if (cell.outputs && cell.outputs.length) {
                cells[index].outputs = cell.outputs.filter(output => output && output.data).map(output => <vscode.NotebookCellOutput>{
                    items: Object.entries(output.data).flatMap(([key, value]) => {
                        if (key === "text/plain" && value instanceof Array) {
                            return value.map(value => vscode.NotebookCellOutputItem.text(value));
                        }
                    }).filter(value => value !== undefined)
                });
            }
        });

        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new vscode.NotebookData(
            cells
        );
    }

    public async serializeNotebook(data: vscode.NotebookData, token: vscode.CancellationToken): Promise<Uint8Array> {
        // Map the Notebook data into the format we want to save the Notebook data as
        let contents: RawNotebookData = { cells: [] };

        for (const cell of data.cells) {
            contents.cells.push({
                cell_type: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
                language: cell.languageId,
                source: cell.value.split('\n')
            });
        }

        // Give a string of all the data to save and VS Code will handle the rest
        return new TextEncoder().encode(JSON.stringify(contents));
    }

}
