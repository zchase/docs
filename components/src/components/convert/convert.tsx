import { Component, Element, h, Prop, State } from '@stencil/core';
import { awsEC2Ubuntu } from "./examples/tf";

import CodeMirror from "codemirror";

import "codemirror/mode/javascript/javascript";
import "codemirror/mode/ruby/ruby";

interface CannedExample {
    [key: string]: string;
}

export type ConvertSourceKind = "tf" | "k8s" | "arm";
export type EditorLanguage = "hcl" | "json" | "yaml";

@Component({
    tag: "pulumi-convert",
    styleUrl: "./convert.scss",
    shadow: false
})
export class Convert {

    @Prop()
    from: ConvertSourceKind;

    @Prop()
    endpoint: string;

    @Element()
    el: HTMLElement;

    @State()
    fetching: boolean = false;

    // Canned examples
    private tf: CannedExample = {
        awsEC2Ubuntu,
    }

    componentDidLoad() {
        if (this.from === "tf") {
            this.prepareEditors(this.tf.awsEC2Ubuntu);
            this.submit();
        }
    }

    inputEditor: CodeMirror.EditorFromTextArea;
    outputEditor: CodeMirror.EditorFromTextArea;

    private get inputEditorEl() {
        return (this.el.querySelector("#editor-input") as HTMLTextAreaElement);
    }

    private get outputEditorEl() {
        return (this.el.querySelector("#editor-output") as HTMLTextAreaElement);
    }

    private get outputLangEl() {
        return (this.el.querySelector("#code-output-language") as HTMLTextAreaElement);
    }

    private setOutput(_filename: string, value: string) {
        this.outputEditor.setValue(value);
    }

    private async fetchResult(code: string, language: string) {
        this.fetching = true;

        try {
            const response = await fetch(`${this.endpoint}/${this.endpointPath}`, {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({
                    code,
                    language,
                }),
            });

            // TODO: Type the result.
            const result: any = await response.json();
            const filenames = Object.keys(result.files);
            const filename = filenames[0];

            if (filename) {
                this.setOutput(filename, result.files[filename]);
            }
        }
        catch(e) {
            console.error(e);
        }

        this.fetching = false;
    }

    private prepareEditors(code: string) {
        this.inputEditorEl.value = code;

        this.inputEditor = CodeMirror.fromTextArea(this.inputEditorEl, {
            lineNumbers: true,
            theme: "material",
        });

        this.outputEditor = CodeMirror.fromTextArea(this.outputEditorEl, {
            lineNumbers: true,
            theme: "material",
            readOnly: true,
        });

        this.inputEditor.setOption("mode", this.inputEditorLanguage);

        this.inputEditor.on("blur", (_event) => {
            this.submit();
        });
    }

    private submit() {
        this.fetchResult(this.inputEditor.getValue(), this.outputLangEl.value);
    }

    private get inputEditorLanguage(): EditorLanguage | undefined {
        switch (this.from) {
            case "tf":
                return "hcl";
            case "k8s":
                return "yaml";
            case "arm":
                return "json";
        }
    }

    private get inputEditorLanguageName(): string | undefined {
        switch (this.from) {
            case "tf":
                return "Terraform";
            case "k8s":
                return "Kubernetes YAML";
            case "arm":
                return "ARM template";
        }
    }

    private get endpointPath(): string {
        switch (this.from) {
            case "tf":
                return "convert";
            case "arm":
                return "convertARM";
            case "k8s":
                return "convertKube";
        }
    }

    render() {
        return (
            <div>
                <p>
                    <span>
                        Convert your { this.inputEditorLanguageName } code to
                    </span>
                    <select id="code-output-language" onChange={this.submit.bind(this)}>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="go">Go</option>
                        <option value="csharp">C#</option>
                    </select>
                    <span>
                        with Pulumi!
                    </span>
                </p>
                <div id="editors">
                    <textarea id="editor-input"></textarea>
                    <textarea id="editor-output"></textarea>
                </div>
            </div>
        );
    }
}
