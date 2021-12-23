var vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerTextEditorCommand('extension.pxTovwAndVwToPx', function (textEditor, textEditorEdit) {
        var regexStr = "([0-9]*\\.?[0-9]+)(px)|vw.*:";
		const config = vscode.workspace.getConfiguration("px-to-vw");
		const viewportWidth = config.get('viewportWidth');
        placeholder(regexStr, (match, value, unit, respond) => unit === 'vw' ? `${vw2Px(value, viewportWidth)}px` : `vw(${value}${unit}, ${respond})`, textEditor, textEditorEdit);
    });
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('px-media-convertor-scss.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from px-media-convertor-scss!');
	});
    context.subscriptions.push(disposable);
}

function deactivate() {
}

// function px2Vw(px, viewportWidth) {
//     if (viewportWidth == 0) { return 0; }
//     const config = vscode.workspace.getConfiguration("px-to-vw");
//     var unitPrecision = config.get('unitPrecision');
//     const value = parseFloat(((px * 100)/ viewportWidth).toFixed(unitPrecision));
//     return value;
// }

function vw2Px(vw, viewportWidth) {
    const config = vscode.workspace.getConfiguration("px-to-vw");
    var unitPrecision = config.get('unitPrecision');
    const value = parseFloat(((vw / 100) * viewportWidth).toFixed(unitPrecision));
    return value;
}

function placeholder(regexString, replaceFunction, textEditor) {
    let regexExpG = new RegExp(regexString, "ig");
	const findIsVwFunctionReg = new RegExp(/vw.+px.*;/, "g");

    const selections = textEditor.selections;
    if (selections.length == 0 || selections.reduce((acc, val) => acc || val.isEmpty), false) { return; }
    const changesMade = new Map();
    textEditor.edit(builder => {
        let numOcurrences = 0;
        selections.forEach((selection) => {
            for (var index = selection.start.line; index <= selection.end.line; index++) {
                let start = 0, end = textEditor.document.lineAt(index).range.end.character;
                if (index === selection.start.line) {
                    let tmpSelection = selection.with({ end: selection.start });
                    let range = findValueRangeToConvert(tmpSelection, regexString, textEditor);
					// let range2 = findValueRangeToConvert(tmpSelection, findIsVwFunctionReg, textEditor);
                    if (range) {
                        start = range.start.character;
                    } else {
                        start = selection.start.character;
                    }

					// if(range2) {
					// 	start = range2.start.character;
					// } else {
					// 	start = selection.start.character;
					// }
                }

                if (index === selection.end.line) {
                    let tmpSelection = selection.with({ start: selection.end });
                    let range = findValueRangeToConvert(tmpSelection, regexString, textEditor);
					let range2 = findValueRangeToConvert(tmpSelection, findIsVwFunctionReg, textEditor);
					console.log(range2);
                    if (range) {
                        end = range.end.character;
                    } else {
                        end = selection.end.character;
                    }

					// if(range2) {
					// 	end = range2.end.character;
					// } else {
					// 	end = selection.end.character;
					// }
                }

				let findMediaQuery;
				let counter = index || 0;
				while(counter > 0) {
					const currentLineEnd = textEditor.document.lineAt(counter).range.end.character;
					let currentLine = textEditor.document.lineAt(counter).text.slice(0, currentLineEnd);
					const matchQuery = /respond-to.+[sm|md|lg|xl]/g
					const matchValue = currentLine.match(matchQuery);
					if(matchValue) {
						const breakpoints = /sm|md|lg|xl/g
						const findBreakpoint = matchValue[0].match(breakpoints);
						if(findBreakpoint) {
							findMediaQuery = findBreakpoint[0];
							break;
						} 
					}
					
					counter--;
				}

                let text = textEditor.document.lineAt(index).text.slice(start, end);
				// let fullText = textEditor.document.lineAt(index).text;
				
				// console.log(textEditor.document.lineAt(index).text);
				// console.log(isAlreadyAVwfunction);
                const matches = text.match(regexExpG);
                numOcurrences += matches ? matches.length : 0;
                if (numOcurrences == 0) { continue; }
                const regex = regexExpG;
				// const fullTextRegex = findIsVwFunctionReg;
                // let newText = fullText.replace(fullTextRegex, (...args) => {
				// 	console.log(`args`, args);
				// 	return replaceFunction(args[0], args[1], args[2], findMediaQuery)
				// });
				// if(!newText) {
				// 	newText = text.replace(regex, (...args) => {
				// 		console.log(`args`, args);
				// 		return replaceFunction(args[0], args[1], args[2], findMediaQuery)
				// 	});
				// }
				let newText = text.replace(regex, (...args) => {
					console.log(`args`, args);
					return replaceFunction(args[0], args[1], args[2], findMediaQuery)
				});

                const selectionTmp = new vscode.Selection(index, start, index, end);
                const key = `${index}-${start}-${end}`;
                if (!changesMade.has(key)) {
                    changesMade.set(key, true);
                    builder.replace(selectionTmp, newText);
                }
            }
            return;
        }, this);
        if (numOcurrences == 0) {
            vscode.window.showWarningMessage("There were no values to transform");
        }
    })
        .then(success => {
            textEditor.selections.forEach((selection, index) => {
                if (selections[index].start.isEqual(selections[index].end)) {
                    const newPosition = selection.end;
                    const newSelection = new vscode.Selection(newPosition, newPosition);
                    textEditor.selections[index] = newSelection;
                }
            });
            textEditor.selections = textEditor.selections;
            if (!success) {
                console.log(`Error: ${success}`);
            }
        });
};

function findValueRangeToConvert(selection, regexString, textEditor) {
    const line = selection.start.line;
    const startChar = selection.start.character;
    const text = textEditor.document.lineAt(line).text;
    const regexExpG = new RegExp(regexString, "ig");

    var result;
    while ((result = regexExpG.exec(text))) {
        const resultStart = result.index;
        const resultEnd = result.index + result[0].length;
        if (startChar >= resultStart && startChar <= resultEnd) {
            return new vscode.Range(line, resultStart, line, resultEnd);
        }
    }
    return null;
}

module.exports = {
	deactivate,
	activate
};

