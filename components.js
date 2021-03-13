export default class Components {
    static IconButton(icon) {
        const btn = document.createElement("div");
        btn.classList.add("icon-button");
        const iconElem = document.createElement("div");
        iconElem.classList.add(icon);
        btn.append(iconElem);
        return btn;
    }

    static BasicButton(innerHTML) {
        const btn = document.createElement("button");
        btn.classList.add("simple-button");
        btn.innerHTML = innerHTML;
        return btn;
    }

    static TextInput() {
        const input = document.createElement("input");
    }
    
    static LabeledCheckbox(value, onChange) {
        const container = document.createElement("label");
        container.classList.add("checkbox-container");
        const checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.value = value;
        checkbox.id = `option-${value}`;
        checkbox.onchange = onChange;
        container.append(checkbox);
        const customCheckbox = document.createElement("span");
        customCheckbox.classList.add("checkbox");
        container.append(customCheckbox);
        const title = document.createElement("span");
        title.classList.add("checkbox__label")
        title.innerText = value;
        container.append(title)
        return container;
    }

    static IntrinsicLabel(labelName) {
        const elem = Components.Label(labelName);
        elem.classList.add("intrinsic-label");
        return elem;
    }

    static Label(labelName) {
        const elem = document.createElement("span");
        elem.classList.add("bookmark__label");
        elem.innerText = labelName;
        return elem;
    }

    static LabelWithButton(labelName, btn) {
        const labelElem = Components.Label(labelName);
        labelElem.append(btn);
        return labelElem;
    }

}