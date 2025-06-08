class AutoResizableTextArea extends HTMLElement {
    constructor()
    {
        super();

        this.attachShadow({mode: "open"});
        this.shadowRoot.append(AutoResizableTextArea.template.content.cloneNode(true));
        this.textarea = this.shadowRoot.querySelector("textarea");

        this.textarea.addEventListener("input", () => this.#minimizeHeight(this.textarea));
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        switch (name) {
            case "placeholder":
                this.textarea.placeholder = newValue;
                break;
            case "rows":
                this.textarea.rows = newValue;
                break;
            case "cols":
                this.textarea.cols = newValue;
                break;
            case "disabled":
                this.textarea.disabled = newValue !== null;
                break;
            case "value":
                this.textarea.value = newValue;
                break;
        }
    }

    focus() { this.textarea.focus(); }
    blur() { this.textarea.blur(); }
    click() { this.textarea.click(); }

    get placeholder() { return this.getAttribute("placeholder"); }
    set placeholder(value) { this.setAttribute("placeholder", value); }

    get rows() { return this.getAttribute("rows"); }
    set rows(value) { this.setAttribute("rows", value); }

    get cols() { return this.getAttribute("cols"); }
    set cols(value) { this.setAttribute("cols", value); }

    get disabled() { return this.getAttribute("disabled"); }
    set disabled(value)
    {
        if (value)
            this.setAttribute("disabled", "");
        else
            this.removeAttribute("disabled");
    }

    get value() { return this.textarea.value; }
    set value(value)
    {
        this.setAttribute("value", value);
        this.#minimizeHeight(this.textarea);
    }

    #minimizeHeight(textarea)
    {
        textarea.style.height = 'auto';
        textarea.style.height = this.textarea.scrollHeight + 'px';
    }

    minimizeHeight()
    {
        this.#minimizeHeight(this.textarea);
    }

    get scrollbarWidth() { return this.textarea.offsetWidth - this.textarea.clientWidth; }
}

AutoResizableTextArea.observedAttributes = ["placeholder", "rows", "cols", "disabled", "value"];

AutoResizableTextArea.template = document.createElement("template");
AutoResizableTextArea.template.innerHTML = `
    <style>
        :host {
            display: inline-block;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            font: 12px/1.5 sans-serif;
            --field-width: 150px;
            --field-max-height: none;
        }
    
        textarea {
            margin: 0;
            padding: 0;
            display: block;
            resize: none;
            transition: height 0.1s ease-out;
            overflow-y: auto;
            border: none;
            outline: none;
            width: var(--field-width);
            max-height: var(--field-max-height);
            font: inherit;
            color: inherit;
        }
    </style>
    
    <textarea rows="1"></textarea>
`;

window.customElements.define("auto-resizable-textarea", AutoResizableTextArea);
