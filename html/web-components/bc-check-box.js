const REFLECTED_PROPERTIES = ['checked'];
const REFLECTED_ATTRIBUTES = ['checked'];

const isTruthyAttributeValue = (attr, value) => {
    return value === 'true' || value === '' || value === attr;
};

class CheckBoxElement extends HTMLElement {
    constructor() {
        super();

        this._updating = false;
        this._connected = false;

        this.addEventListener('click', () => {
            this._updating = true;
            const checked = isTruthyAttributeValue('checked', this.getAttribute('checked'));
            this.setAttribute('checked', checked ? 'false' : 'true');
            this._updating = false;
        });
    }

    static get observedAttributes() {
        return REFLECTED_ATTRIBUTES;
    }

    connectedCallback() {
        if (!this._connected) {
            this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
                        <path d="M7,25L17.571,38,44,12"/>
                    </svg>
                `;

            this._connected = true;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._updating && REFLECTED_ATTRIBUTES.includes(name)) {
            this.setAttribute(name, String(isTruthyAttributeValue(name, newValue)));
        }
    }
}

for (const prop of REFLECTED_PROPERTIES) {
    Object.defineProperty(
        CheckBoxElement.prototype,
        prop,
        {
            get() {
                const value = this.getAttribute(prop);

                if (value === 'true' || value === 'false') {
                    return value === 'true';
                }

                return value;
            },
            set(value) {
                this._updating = true;
                this.setAttribute(prop, value);
                this._updating = false;
            }
        }
    );
}

customElements.define('bc-check-box', CheckBoxElement);
