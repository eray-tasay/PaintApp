/* Elements */
const colorElms = document.querySelectorAll(".color-palette .color");
const shapeElms = document.querySelectorAll(".shapes .shape");
const selectableToolElms = document.querySelectorAll(".tools .tool.selectable");
const colorPickerElm = document.querySelector(".color-selector input");
const canvasContainerElm = document.querySelector(".canvas-container");
const paletteElm = document.querySelector(".palette");
const pencilToolElm = document.querySelector(".tool.pencil");
const eraserToolElm = document.querySelector(".tool.eraser");
const selectToolElm = document.querySelector(".tool.select");
const clearToolElm = document.querySelector(".tool.clear");
const textToolElm = document.querySelector(".tool.text");
const canvasElm = document.querySelector(".paint canvas");
const lineElms = document.querySelectorAll(".lines .container");
const linesElm = document.querySelector(".lines");
const strokeWidthToolElm = document.querySelector(".stroke-width");
const selectRectElm = document.querySelector(".select-rect");
const writeTextContainerElm = document.querySelector(".write-text-container");
const autoResizableTextarea = document.querySelector(".write-text-container auto-resizable-textarea")
const writeTextContainerResizeBtnElm = document.querySelector(".write-text-container .resize-btn");
const fileToolElm = document.querySelector(".tool.file");
const fileFormatListElm = document.querySelector(".tool.file .file-format-list");
const fileFormatElms = document.querySelectorAll(".tool.file .file-format-list li");

/* Enums */
const Tool = Object.freeze({
    NONE_SELECTED: 0,
    PENCIL: 1,
    ERASER: 2,
    FILL: 3,
    TEXT: 4,
    SELECT: 5
});

const Shape = Object.freeze({
    NONE_SELECTED: 0,
    ELLIPSE: 1,
    RECT: 2,
    LINE: 3
});

/* Global Variables */
const c = canvasElm.getContext("2d");
const dpr = window.devicePixelRatio;
let selectedTool = Tool.PENCIL; // default selected tool
let selectedShape = Shape.NONE_SELECTED;
let selectedColor = "black";
let lineWidth = 1;
let selectRectP1 = {};
let selectRectStartPoint, selectRectEndPoint;
let formerCanvas;
let selectedArea;
let clearedAreaPosition;
let clearedAreaDimension;
let writeTextContainerStartPoint = {};
let writeTextContainerActive = false;
let formerCanvasWidthCSS = undefined;
let formerCanvasHeightCSS = undefined;

function removeActiveClsFromNodes(nodes) { nodes.forEach(node => node.classList.remove("active")); }

function pushCanvasContainerDown(height)
{
    const margin = 15;
    canvasContainerElm.style.marginTop = `${height + margin}px`;
}

(function setEventListeners()
{
    colorElms.forEach(colorElement => {
        colorElement.addEventListener("click", e => {
            removeActiveClsFromNodes(colorElms);
            e.currentTarget.classList.add("active");

            let computedStyle = window.getComputedStyle(e.currentTarget);
            selectedColor = computedStyle.backgroundColor;
        });
    });

    shapeElms.forEach(shape => {
        shape.onclick = e => {
            selectedTool = Tool.NONE_SELECTED;
            selectedShape = Shape[shape.classList.item(shape.classList.length - 1).toUpperCase()];

            removeActiveClsFromNodes(shapeElms);
            removeActiveClsFromNodes(selectableToolElms);

            shapeElms.forEach(shape => {
                shape.firstElementChild.setAttribute("stroke", "black");
                shape.firstElementChild.setAttribute("stroke-width", "1");
            });

            e.currentTarget.firstElementChild.setAttribute("stroke", "blue");
            e.currentTarget.firstElementChild.setAttribute("stroke-width", "3");
            e.currentTarget.classList.add("active");

            canvasElm.style.cursor = "crosshair";
        };
    });

    selectableToolElms.forEach(toolElement => {
        toolElement.addEventListener("click", e => {
            selectedShape = Shape.NONE_SELECTED;
            selectedTool = Tool[toolElement.getAttribute("data-tool").toUpperCase()];

            removeActiveClsFromNodes(selectableToolElms);
            removeActiveClsFromNodes(shapeElms);

            shapeElms.forEach(shape => {
                shape.firstElementChild.setAttribute("stroke", "black");
                shape.firstElementChild.setAttribute("stroke-width", "1");
            });

            e.currentTarget.classList.add("active");
        });
    });

    colorPickerElm.addEventListener("change", e => {
        colorElms.values().forEach(colorElement => {
            if (colorElement.classList.contains("active"))
                colorElement.style.backgroundColor = e.currentTarget.value;
        });
        selectedColor = e.currentTarget.value;
    });

    pencilToolElm.addEventListener("click", () => {
        canvasElm.style.cursor = "url(icons/pencil-solid-cursor.svg) 0 32, crosshair";
    });

    strokeWidthToolElm.addEventListener("click", () => {
        if (linesElm.style.display === "none") {
            linesElm.style.display = "block";
            setTimeout(() => linesElm.style.opacity = "1", 100);
        }
    });

    eraserToolElm.addEventListener("click", () => canvasElm.style.cursor = "url(icons/rect.svg), cell");
    selectToolElm.addEventListener("click", () => canvasElm.style.cursor = "default");
    textToolElm.addEventListener("click", () => canvasElm.style.cursor = "default");
    textToolElm.addEventListener("click", () => canvasElm.style.cursor = "text");
    clearToolElm.onclick = () => { clearRect(0, 0, canvasElm.width, canvasElm.height); };
    fileToolElm.onclick = () => {
        fileFormatListElm.style.display = "block";
        setTimeout(() => fileFormatListElm.style.opacity = "1", 100);
    };

    fileFormatElms.forEach(fileFormatElm => {
        fileFormatElm.addEventListener("click", (e) => {
            let imageType = e.target.getAttribute("data-image-type");

            canvasElm.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");

                a.href = url;
                a.download = `drawing.${imageType}`

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                URL.revokeObjectURL(url);
            }, `image/${imageType}`);
        });
    });

    canvasElm.addEventListener("mousedown", e => {
        switch (selectedTool) {
            case Tool.PENCIL:
                draw(e);
                break;
            case Tool.ERASER:
                erase(e);
                break;
            case Tool.SELECT:
                select(e);
                break;
            case Tool.TEXT:
                writeText(e);
                break;
            case Tool.NONE_SELECTED:
                drawShape(e);
                break;
        }
    });

    lineElms.forEach(lineElm => lineElm.addEventListener("click", e => {
        lineWidth = lineElm.getAttribute("data-width");
        removeActiveClsFromNodes(lineElms);
        e.currentTarget.classList.add("active");
        e.stopPropagation();
    }));

    document.addEventListener("click", e => {
        if (linesElm.style.display === "block") {
            linesElm.style.display = "none";
            linesElm.style.opacity = "0";

            if (!linesElm.contains(e.target))
                e.stopPropagation();
        }
    }, true);

    document.addEventListener("click", e => {
        if (fileFormatListElm.contains(e.target))
            return;

        if (fileFormatListElm.style.display === "block") {
            fileFormatListElm.style.display = "none";
            fileFormatListElm.style.opacity = "0";
            e.stopPropagation();
        }
    }, true);

    document.addEventListener("mousedown", e => {
        if (e.target !== selectRectElm && selectedTool === Tool.SELECT
            && selectRectElm.style.display === "block") {
            selectRectElm.style.width = "0";
            selectRectElm.style.height = "0";
            selectRectElm.style.display = "none";
            selectRectElm.style.cursor = "default";
        }
    }, true);

    selectRectElm.addEventListener("mousedown", e => {
        e.stopPropagation();
        e.preventDefault();

        let isDragging = true;
        selectRectElm.classList.add("dragging");

        selectRectElm.addEventListener("dragstart", (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, {once: true});

        let selectRectStartPointTemp = {...selectRectStartPoint};
        let selectRectEndPointTemp = {...selectRectEndPoint};
        let dragStart = {x: e.clientX, y: e.clientY};

        function selectRectElmMousemoveCallback(e)
        {
            e.stopPropagation();

            if (!isDragging)
                return;

            let dragEnd = {x: e.clientX, y: e.clientY};
            let dragOffsetX = dragEnd.x - dragStart.x;
            let dragOffsetY = dragEnd.y - dragStart.y;

            selectRectStartPointTemp.x = selectRectStartPoint.x + dragOffsetX;
            selectRectStartPointTemp.y = selectRectStartPoint.y + dragOffsetY;
            selectRectEndPointTemp.x = selectRectEndPoint.x + dragOffsetX;
            selectRectEndPointTemp.y = selectRectEndPoint.y + dragOffsetY;

            let selectRectStartPointTempOffset = getOffset(selectRectStartPointTemp, canvasElm);

            selectRectElm.style.left = selectRectStartPointTemp.x + "px";
            selectRectElm.style.top = selectRectStartPointTemp.y + "px";

            redrawCanvas(formerCanvas);
            clearRect(clearedAreaPosition.x, clearedAreaPosition.y, clearedAreaDimension.width, clearedAreaDimension.height);
            c.putImageData(selectedArea, selectRectStartPointTempOffset.x * dpr, selectRectStartPointTempOffset.y * dpr);
        }

        document.addEventListener("mousemove", selectRectElmMousemoveCallback);
        document.addEventListener("mouseup", (e) => {
            selectRectStartPoint = selectRectStartPointTemp;
            selectRectEndPoint = selectRectEndPointTemp;
            isDragging = false;

            selectRectElm.classList.remove("dragging");
            document.removeEventListener("mousemove", selectRectElmMousemoveCallback);
        }, {once: true});
    });

    writeTextContainerResizeBtnElm.onmousedown = (e) => {
        let canvasElmOffsetRight = canvasElm.offsetLeft + canvasElm.offsetWidth;

        document.documentElement.style.cursor = "ew-resize";
        canvasElm.style.cursor = "ew-resize";

        function resizeWriteTextContainerMousemoveCallback(e)
        {
            const minWidth = 30;
            let endPoint = {x: e.pageX, y: e.pageY};

            endPoint.x = clamp(writeTextContainerStartPoint.x, endPoint.x, canvasElmOffsetRight);
            let width = endPoint.x - writeTextContainerStartPoint.x;

            width = Math.max(width, minWidth);
            writeTextContainerElm.style.width =  width + "px";
            autoResizableTextarea.minimizeHeight();
        }

        document.addEventListener("mousemove", resizeWriteTextContainerMousemoveCallback);
        document.addEventListener("mouseup", () => {
            document.removeEventListener("mousemove", resizeWriteTextContainerMousemoveCallback);
            document.documentElement.style.cursor = "default";
            canvasElm.style.cursor = "text";
        }, {once: true});
    }

    document.addEventListener("mousedown", (e) => {
        if (writeTextContainerElm.contains(e.target))
            return;

        if (writeTextContainerActive) {
            if (autoResizableTextarea.value !== "")
                fillText();
            writeTextContainerActive = false;
            writeTextContainerElm.style.display = "none";
            e.stopPropagation();
        }
    }, true);
}());

function clearRect(x, y, width, height)
{
    let former = c.fillStyle;

    c.fillStyle = "rgb(255 255 255)";
    c.fillRect(x, y, width, height);
    c.fillStyle = former;
}

function fillText()
{
    const padding = 8;
    const lineHeight = 18;
    const coords = getOffset(writeTextContainerStartPoint, canvasElm);
    const limit = autoResizableTextarea.getBoundingClientRect().width - padding * 2 - autoResizableTextarea.scrollbarWidth;
    const tokenRegex = /(\S+)|([ \t]+)|((\n\r)|\n|\r)/g;
    const spaceTokenRegex = /^[ \t]+$/;
    const lineTerminatorTokenRegex = /(\n\r)|\n|\r/
    const tokens = autoResizableTextarea.value.match(tokenRegex);

    let lineCoordsX = coords.x + 9;
    let lineCoordsY = coords.y + 13;
    let line = "";
    let tempLine = "";
    let wrapped;

    c.font = "12px/1.5 sans-serif";
    c.textBaseline = "top";
    c.fillStyle = selectedColor;

    for (let i = 0; i < tokens.length;) {
        if (lineTerminatorTokenRegex.test(tokens[i])) {
            c.fillText(line, lineCoordsX, lineCoordsY);
            tempLine = line = "";
            lineCoordsY += lineHeight;
            i++;
        }

        tempLine += tokens[i];

        if (c.measureText(tempLine).width > limit) {
            if (spaceTokenRegex.test(tokens[i])) {
                i++;
                continue;
            }

            if (wrapped) {
                let token = tokens[i];
                let newTokens = [];
                let newToken = "";
                let tempToken = "";

                let k = 0;
                while (k < token.length) {
                    while (k < token.length) {
                        tempToken += token[k];

                        if (c.measureText(tempToken).width > limit)
                            break;

                        newToken = tempToken;
                        k++;
                    }
                    newTokens.push(newToken);
                    tempToken = newToken = "";
                }

                tokens.splice(i, 1, ...newTokens);
                wrapped = false;
            }

            if (line === "") {
                tempLine = "";
                wrapped = true;
                continue;
            }

            c.fillText(line, lineCoordsX, lineCoordsY);
            tempLine = line = "";
            lineCoordsY += lineHeight;
        }
        else {
            wrapped = false;
            line = tempLine;
            i++;

            if (i === tokens.length)
                c.fillText(line, lineCoordsX, lineCoordsY);
        }
    }
}

function writeText(e)
{
    const minHeight = 36;
    const minWidth = 30;
    const borderWidth = 1;
    const paddingSize = 8;

    let left = e.pageX;
    let top = e.pageY;
    let canvasElmPageRight = canvasElm.offsetLeft + canvasElm.offsetWidth;
    let canvasElmPageBottom = canvasElm.offsetTop + canvasElm.offsetHeight;
    let width = Math.min(160, canvasElmPageRight - left);
    let maxHeight = canvasElmPageBottom - top - borderWidth * 2 - paddingSize * 2;

    if (width < minWidth)
        return;

    if (canvasElmPageBottom - top < minHeight)
        return;

    writeTextContainerStartPoint.x = left;
    writeTextContainerStartPoint.y = top;
    writeTextContainerElm.style.display = "block";
    writeTextContainerElm.style.left = `${left}px`;
    writeTextContainerElm.style.top = `${top}px`;
    writeTextContainerElm.style.width = `${width}px`;
    autoResizableTextarea.style.setProperty("--field-max-height", `${maxHeight}px`);
    autoResizableTextarea.style.color = selectedColor;
    autoResizableTextarea.value = "";
    writeTextContainerActive = true;

    requestAnimationFrame(() => {
        let textarea = document.querySelector(".canvas-container auto-resizable-textarea");
        textarea.focus();
    });
}

(function setResizeObserverForPaletteElm() {
    let oldHeight = undefined;
    let resizeObserver = new ResizeObserver(entries => {
        let entry = entries[Symbol.iterator]().next().value;
        let newHeight = entry.contentRect.height;

        if (entry.target === paletteElm && oldHeight !== newHeight) {
            oldHeight = newHeight;
            pushCanvasContainerDown(newHeight);
        }
    });

    resizeObserver.observe(paletteElm);
}());

(function setResizeObserverForCanvasContainerElm() {
    let resizeObserver = new ResizeObserver(entries => {
        let entry = entries[Symbol.iterator]().next().value;
        let newHeightCSS = entry.contentRect.height;
        let newWidthCSS = entry.contentRect.width;

        if (entry.target === canvasContainerElm) {
            if (!formerCanvasWidthCSS && !formerCanvasHeightCSS) {
                formerCanvasWidthCSS = newWidthCSS;
                formerCanvasHeightCSS = newHeightCSS;

                initializeCanvas(newWidthCSS * dpr, newHeightCSS * dpr);
                return;
            }

            let imageData = c.getImageData(0, 0, formerCanvasWidthCSS * dpr, formerCanvasHeightCSS * dpr);

            initializeCanvas(newWidthCSS * dpr, newHeightCSS * dpr);
            c.putImageData(imageData, 0, 0);
            formerCanvasWidthCSS = newWidthCSS;
            formerCanvasHeightCSS = newHeightCSS;
        }
    });

    resizeObserver.observe(canvasContainerElm);
}());

function initializeCanvas(width, height)
{
    canvasElm.width = width;
    canvasElm.height = height;
    c.scale(dpr, dpr);
    clearRect(0, 0, canvasElm.width, canvasElm.height);
}

function clamp(min, preferred, max) { return Math.min(Math.max(min, preferred), max); }

function getStartAndEndPointOfRect(p1, p2)
{
    /*
    * There is just one rectangle that passes through point p1 and point p2. This function gives the start point and end
    * point of that rectangle. Specifically, the top left and bottom right corners.
    * */
    let startPoint = {};

    startPoint.x = Math.min(p1.x, p2.x);
    startPoint.y = Math.min(p1.y, p2.y);

    let endPoint = {};

    endPoint.x = Math.max(p1.x, p2.x);
    endPoint.y = Math.max(p1.y, p2.y);

    return [startPoint, endPoint];
}

function displaySelectRect(p1, p2)
{
    [selectRectStartPoint, selectRectEndPoint] = getStartAndEndPointOfRect(p1, p2);

    selectRectElm.style.left = `${selectRectStartPoint.x}px`;
    selectRectElm.style.top = `${selectRectStartPoint.y}px`;
    selectRectElm.style.width = `${selectRectEndPoint.x - selectRectStartPoint.x}px`;
    selectRectElm.style.height = `${selectRectEndPoint.y - selectRectStartPoint.y}px`
    selectRectElm.style.display = "block";
}

function erase(e)
{
    function eraseMousemoveCallback(e)
    {
        const rectDimension = 16;

        c.fillStyle = "#fff";
        c.fillRect(e.offsetX, e.offsetY, rectDimension, rectDimension);
    }

    eraseMousemoveCallback(e);

    canvasElm.addEventListener("mousemove", eraseMousemoveCallback);
    document.addEventListener("mouseup", () => canvasElm.removeEventListener("mousemove", eraseMousemoveCallback), {once: true});
}

function draw(e)
{
    c.fillStyle = selectedColor;
    c.strokeStyle = selectedColor;
    c.lineWidth = lineWidth;

    c.fillRect(e.offsetX - (lineWidth / 2), e.offsetY - (lineWidth / 2), lineWidth, lineWidth);

    c.beginPath();
    c.moveTo(e.offsetX, e.offsetY);

    function drawMousemoveCallback(e)
    {
        c.lineTo(e.offsetX, e.offsetY);
        c.stroke();

        c.beginPath();
        c.moveTo(e.offsetX, e.offsetY);
    }

    function drawMouseEnterCallback(e) { c.moveTo(e.offsetX, e.offsetY); }

    canvasElm.addEventListener("mousemove", drawMousemoveCallback);
    canvasElm.addEventListener("mouseenter", drawMouseEnterCallback);

    document.addEventListener("mouseup", () => {
        canvasElm.removeEventListener("mousemove", drawMousemoveCallback);
        canvasElm.removeEventListener("mouseenter", drawMouseEnterCallback);
    }, {once: true});
}

function getOffset(p, element)
{
    let res = {};

    res.x = p.x - element.offsetLeft;
    res.y = p.y - element.offsetTop;

    return res;
}

function select(e)
{
    selectRectP1.x = e.pageX;
    selectRectP1.y = e.pageY;

    document.addEventListener("mousemove", selectMousemoveCallback);

    function selectMousemoveCallback(e)
    {
        let selectRectP2 = {};

        selectRectP2.x = clamp(canvasElm.offsetLeft, e.pageX, canvasElm.offsetLeft + canvasElm.offsetWidth);
        selectRectP2.y = clamp(canvasElm.offsetTop, e.pageY, canvasElm.offsetTop + canvasElm.offsetHeight);
        displaySelectRect(selectRectP1, selectRectP2);
    }

    const mouseupCallback = e => {
        document.removeEventListener("mousemove", selectMousemoveCallback);
        selectRectElm.style.cursor = "move";

        let selectRectStartPointOffset = getOffset(selectRectStartPoint, canvasElm);
        let selectRectEndPointOffset = getOffset(selectRectEndPoint, canvasElm)

        let x = selectRectStartPointOffset.x * dpr;
        let y = selectRectStartPointOffset.y * dpr;
        let width = (selectRectEndPointOffset.x - selectRectStartPointOffset.x) * dpr;
        let height = (selectRectEndPointOffset.y - selectRectStartPointOffset.y) * dpr;

        formerCanvas = c.getImageData(0, 0, canvasElm.width, canvasElm.height);
        selectedArea = c.getImageData(x, y, width, height);
        clearedAreaPosition = {x: selectRectStartPointOffset.x, y: selectRectStartPointOffset.y};
        clearedAreaDimension = {width: selectRectEndPointOffset.x - selectRectStartPointOffset.x,
            height: selectRectEndPointOffset.y - selectRectStartPointOffset.y};
    }

    document.addEventListener("mouseup", mouseupCallback, {once: true});
}

function redrawCanvas(imageData)
{
    clearRect(0, 0, canvasElm.width, canvasElm.height);
    c.putImageData(imageData, 0, 0);
}

function drawLine(e)
{
    let canvasBeforeDrawing = c.getImageData(0, 0, canvasElm.width, canvasElm.height);
    let lineP1 = {};

    lineP1.x = e.offsetX;
    lineP1.y = e.offsetY;

    function drawLineMousemoveCallback(e)
    {
        let lineP2 = getOffset({x: e.pageX, y: e.pageY}, canvasElm);

        redrawCanvas(canvasBeforeDrawing);

        c.strokeStyle = selectedColor;
        c.lineWidth = lineWidth;

        c.beginPath();
        c.moveTo(lineP1.x, lineP1.y);
        c.lineTo(lineP2.x, lineP2.y);
        c.stroke();
    }

    document.addEventListener("mousemove", drawLineMousemoveCallback);
    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", drawLineMousemoveCallback), {once: true});
}

function drawRect(e)
{
    let canvasBeforeDrawing = c.getImageData(0, 0, canvasElm.width, canvasElm.height);
    let lineP1 = {};

    lineP1.x = e.offsetX;
    lineP1.y = e.offsetY;

    function drawRectMousemoveCallback(e)
    {
        let lineP2 = getOffset({x: e.pageX, y: e.pageY}, canvasElm);
        let [startPoint, endPoint] = getStartAndEndPointOfRect(lineP1, lineP2);

        redrawCanvas(canvasBeforeDrawing);

        c.strokeStyle = selectedColor;
        c.lineWidth = lineWidth;
        c.strokeRect(startPoint.x, startPoint.y, endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    }

    document.addEventListener("mousemove", drawRectMousemoveCallback);
    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", drawRectMousemoveCallback), {once: true});
}

function drawEllipse(e)
{
    let canvasBeforeDrawing = c.getImageData(0, 0, canvasElm.width, canvasElm.height);
    let p1 = {};

    p1.x = e.offsetX;
    p1.y = e.offsetY;

    function drawEllipseMousemoveCallback(e)
    {
        let p2 = getOffset({x: e.pageX, y: e.pageY}, canvasElm);

        redrawCanvas(canvasBeforeDrawing);

        c.strokeStyle = selectedColor;
        c.lineWidth = lineWidth;

        c.beginPath();
        c.ellipse((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, Math.abs(p1.x - p2.x) / 2, Math.abs(p1.y - p2.y) / 2, 0, 0,  2 * Math.PI);
        c.stroke();
    }

    document.addEventListener("mousemove", drawEllipseMousemoveCallback);
    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", drawEllipseMousemoveCallback), {once: true});
}

function drawShape(e)
{
    switch (selectedShape) {
        case Shape.LINE:
            drawLine(e);
            break;
        case Shape.RECT:
            drawRect(e);
            break;
        case Shape.ELLIPSE:
            drawEllipse(e);
            break;
    }
}
