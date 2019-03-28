const ChartData = (function () {
    function getSpaceBetweenX() {
        return 10;
    }

    function findMaxXCoord(x, spaceBetweenX) {
        return spaceBetweenX * (x.length - 1);
    }

    function ChartData(data) {
        this.data = data;

        this.datasets = {};
        this.data.columns.forEach((column) => {
            const name = column[0];
            var datasetData = column.slice(1, column.length);
            if (name === "x")
                this.x = datasetData;
            else
                this.datasets[name] = {
                    data: datasetData,
                    name, 
                    color: this.data.colors[name],
                    visible: true
                };
        });

        this.spaceBetweenX = getSpaceBetweenX();
        this.maxXCoord = findMaxXCoord(this.x, this.spaceBetweenX);
    }

    ChartData.prototype.getColor = function (datasetName) {
        return this.data.colors[datasetName];
    };

    /**
     * @param {number} fromPercent from
     * @param {number} toPercent to
     * @returns {Array<number>} array of x
     */
    ChartData.prototype.getX = function (fromPercent = 0, toPercent = 1) {
        return this.x.slice(fromPercent * this.x.length, toPercent * this.x.length);
    };

    /**
     * @param {number} fromPercent from
     * @param {number} toPercent to
     * @returns {Array<string>} array of x values formatted to display
     */
    ChartData.prototype.getDisplayedX = function (fromPercent = 0, toPercent = 1) {
        return this.getX(fromPercent, toPercent).map((x) => new Date(x).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short"
        }));
    };

    ChartData.prototype.displayX = function (x) {
        return new Date(x).toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    }

    /**
     * @param {number} fromPercent start search from
     * @param {number} toPercent search to
     * @returns {number} max y coord
     */
    ChartData.prototype.findMaxY = function (fromPercent = 0, toPercent = 1) {
        let result = 0;
        for (const datasetKey of Object.keys(this.datasets)) {
            if (!this.datasets[datasetKey].visible)
                continue;

            let datasetPart = this.datasets[datasetKey].data;
            datasetPart = datasetPart.slice(fromPercent * datasetPart.length, toPercent * datasetPart.length);

            const dataSetMax = Math.max.apply(Math, datasetPart);
            if (dataSetMax > result)
                result = dataSetMax;
        }
        return result;
    };

    ChartData.prototype.toggleDatasetVisibility = function (datasetName) {
        this.datasets[datasetName].visible = !this.datasets[datasetName].visible;
    };

    return ChartData;
})();

const SvgHelpers = (function () {
    const svgNS = "http://www.w3.org/2000/svg";

    const generateDatasetPath = function (datasetName, dataset, color, spaceBetweenX, lineClass) {
        const path = document.createElementNS(svgNS, "polyline");

        let pathDefinition = "0 " + dataset[0] + "";

        for (let index = 1; index < dataset.length; index++) {
            const val = dataset[index];
            pathDefinition += `, ${spaceBetweenX*index} ${val}`;
        }

        path.setAttributeNS(null, "points", pathDefinition);
        path.setAttributeNS(null, "id", datasetName);
        path.setAttributeNS(null, "class", lineClass);
        path.setAttributeNS(null, "stroke", color);
        path.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

        return path;
    };

    const HEIGHT_SCALE_FACTOR = 1.1;

    const getHeight = function (svg) {
        return svg.viewBox.baseVal.height;
    };

    const setHeight = function (svg, height) {
        svg.viewBox.baseVal.height = HEIGHT_SCALE_FACTOR * height;
    };

    const setWidth = function (svg, width) {
        svg.viewBox.baseVal.width = width;
    };

    return {
        svgNS,
        generateDatasetPath,
        setWidth,
        setHeight,
        getHeight,
        HEIGHT_SCALE_FACTOR
    };
})();

const ChartContent = (function () {

    /**
     * @param {HTMLElement} container element to contain chart
     * @param {ChartData} chartData data of chart
     */
    function ChartContent(container, chartData) {
        this.chartData = chartData;
        this.container = container;
    }

    const svgNS = SvgHelpers.svgNS;

    /**     
     * @returns {Element} svg element
     */
    function generateChartSvg() {
        const svg = document.createElementNS(svgNS, "svg");

        svg.setAttributeNS(null, "preserveAspectRatio", "none");

        this.fromPercent = null;
        this.toPercent = null;

        return svg;
    }

    function getFirstTwoDigits(n) {
        let i = 0;
        while (n > 100) {
            n /= 10;
            i++;
        }
        n = Math.floor(n);
        return {
            n,
            i
        };
    }

    function generateScalesYValues(fromPercent = 0, toPercent = 1, scalesYCount = 5) {
        let maxY = this.chartData.findMaxY(fromPercent, toPercent);

        let {
            n,
            i
        } = getFirstTwoDigits(maxY);
        maxY = n * Math.pow(10, i);

        let scalesYStep = Math.round(maxY / scalesYCount);

        const result = [];
        for (let index = 0; index <= scalesYCount; index++) {
            const scaleValue = index * scalesYStep;
            result.push(scaleValue);
        }
        return result;
    }

    function generateScalesYLines(scalesValues) {
        const result = [];
        scalesValues.forEach((scaleValue) => {
            const path = document.createElementNS(svgNS, "path");
            path.setAttributeNS(null, "d", `M0 ${scaleValue} H${this.maxXCoord}`);
            path.setAttributeNS(null, "class", "scale-y");
            path.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

            result.push(path);
        });
        return result;
    }

    const SCALE_ANIMATION_DURATION = 150;

    function clearScalesY() {
        const removeScales = () => {
            const scalesLines = this.svg.querySelectorAll(".scale-y_hidden");
            scalesLines.forEach((line) => {
                line.parentNode.removeChild(line);
            });

            const scalesTexts = this.scalesTextContainer.querySelectorAll(".scale-y-text_hidden");
            scalesTexts.forEach((text) => {
                text.parentNode.removeChild(text);
            });
        };

        const scalesLines = this.svg.querySelectorAll(".scale-y");
        scalesLines.forEach((line) => {
            line.classList.add("scale-y_hidden");
        });
        const scaleText = this.scalesTextContainer.querySelectorAll(".scale-y-text");
        scaleText.forEach((scaleText) => {
            scaleText.classList.add("scale-y-text_hidden");
        });

        setTimeout(removeScales, SCALE_ANIMATION_DURATION);
    }

    function generateScalesY(fromPercent = 0, toPercent = 1) {
        const scalesYValues = generateScalesYValues.call(this, fromPercent, toPercent);

        clearScalesY.call(this, scalesYValues);
        
        const lines = generateScalesYLines.call(this, scalesYValues);
        lines.forEach((line) => {
            this.svg.insertBefore(line, this.svg.firstChild);
        });

        const maxY = this.chartData.findMaxY(fromPercent, toPercent);
        scalesYValues.forEach((scaleYValue) => {
            const scalePosition = getScaleYPositionFromValue(scaleYValue, maxY);
            const text = formatScaleYValue(scaleYValue);
            this.scalesTextContainer.innerHTML += `<span class="scale-y-text" style="bottom: ${scalePosition}%">${text}</span>`;
        });
    }

    function formatScaleYValue(value) {
        let result = value;
        if (value / 1000 > 1)
            result = `${Math.floor(value / 1000)}k`;
        return result;
    }

    function getScaleYPositionFromValue(value, maxY) {
        return 100 * value / maxY / SvgHelpers.HEIGHT_SCALE_FACTOR;
    }

    function getScaleXPositionFromIndex(index, max) {
        return index / max;
    }

    function updatesScalesX(fromPercent, toPercent) {
        const scaleXWidth = this.svg.clientWidth / this.svg.viewBox.baseVal.width * this.chartData.maxXCoord;
        this.scalesXContainer.style.width = `${scaleXWidth}px`;

        const scales = this.scalesXContainer.querySelectorAll(".scale-x-text");

        const fromIndex = Math.round(fromPercent * scales.length);
        const toIndex = Math.round(toPercent * scales.length);
        const maxScaleCount = Math.floor(this.scalesXScrollContainer.clientWidth / this.maxXScaleWidth);
        const showEveryNth = Math.round((toIndex - fromIndex) / maxScaleCount);
        const indexShift = -Math.round(showEveryNth / 2);
        for (let index = 0; index < -indexShift; index++) {
            scales[index].classList.add("scale-x-text_hidden");
        }
        for (let index = showEveryNth; index + indexShift < scales.length; index++) {
            if (index % showEveryNth !== 0)
                scales[index + indexShift].classList.add("scale-x-text_hidden");
            else
                scales[index + indexShift].classList.remove("scale-x-text_hidden");
        }

        const newScrollX = this.scalesXContainer.clientWidth * fromPercent;
        this.scalesXScrollContainer.scroll(newScrollX, 0);
    }

    function generateScalesX() {
        const xValues = this.chartData.getDisplayedX();
        for (let i = 0; i < xValues.length; i++) {
            let xValue = xValues[i];
            const position = getScaleXPositionFromIndex.call(this, i, xValues.length);
            this.scalesXContainer.innerHTML += `<span class="scale-x-text scale-x-text_hidden" style="left: ${position * 100}%">${xValue}</span>`;
        }
        const scaleTexts = Array.prototype.slice.call(this.scalesXContainer.querySelectorAll(".scale-x-text"));
        const scaleTextWidths = scaleTexts.map((el) => el.clientWidth);
        this.maxXScaleWidth = Math.max(...scaleTextWidths);
    }

    ChartContent.prototype.draw = function () {
        this.spaceBetweenX = this.chartData.spaceBetweenX;
        this.maxXCoord = this.chartData.maxXCoord;

        this.svg = generateChartSvg.call(this);
        this.svg.setAttributeNS(null, "class", "chart__content__lines");

        for (let datasetName of Object.keys(this.chartData.datasets)) {
            const path = SvgHelpers.generateDatasetPath(datasetName, this.chartData.datasets[datasetName].data, this.chartData.getColor(datasetName), this.spaceBetweenX, "chart-line");
            this.svg.appendChild(path);
        }

        const scalesTextContainer = document.createElement("div");
        scalesTextContainer.className = "scales";
        this.scalesTextContainer = scalesTextContainer;
        this.container.append(scalesTextContainer);

        this.scalesXContainer = document.createElement("div");
        this.scalesXContainer.className = "scales-x";
        this.scalesXScrollContainer = document.createElement("div");
        this.scalesXScrollContainer.className = "scales-x-scroll-container";
        this.scalesXScrollContainer.appendChild(this.scalesXContainer);
        this.container.appendChild(this.scalesXScrollContainer);

        generateScalesY.call(this);
        generateScalesX.call(this);

        this.cursor = generateCursor.call(this);
        this.svg.insertBefore(this.cursor, this.svg.firstChild);

        this.cursorPanel = document.createElement("div");
        this.cursorPanel.className = "cursor-panel cursor-panel_hidden";
        this.cursorPanel.innerHTML = "<div class='cursor-panel__x'></div>" + "<div class='cursor-panel__y'>" + generateDatasetsValuesHtml(this.chartData) + "</div>";
        this.container.appendChild(this.cursorPanel);

        this.container.addEventListener("mouseenter", (ev) => cursorStartHandler.call(this, ev));
        this.container.addEventListener("mousemove", (ev) => cursorMoveHandler.call(this, ev));
        this.container.addEventListener("mouseleave", (ev) => cursorEndHandler.call(this, ev));

        this.container.appendChild(this.svg);
    };

    function generateDatasetsValuesHtml(chartData) {
        let result = "";
        for (let datasetName of Object.keys(chartData.datasets)) {
            result += `<div class='cursor-panel__y__info' style='color: ${chartData.getColor(datasetName)}'>`;
            result += `<div class='cursor-panel__y__value'></div>`;
            result += `<div class='cursor-panel__y__name'>${chartData.data.names[datasetName]}</div>`;
            result += `</div>`;
        }
        return result;
    }

    function cursorStartHandler(ev) {
        this.cursor.classList.remove("cursor_hidden");
        for (let datasetName of Object.keys(this.chartData.datasets)) {
            if (this.chartData.datasets[datasetName].visible)
                this.cursorPoints[datasetName].classList.remove("cursor-point_hidden");
        };
        
        this.cursorPanel.classList.remove("cursor-panel_hidden");
    }

    function cursorEndHandler(ev) {
        this.cursor.classList.add("cursor_hidden");
        for (let datasetName of Object.keys(this.chartData.datasets)) {
            this.cursorPoints[datasetName].classList.add("cursor-point_hidden");
        };
        
        this.cursorPanel.classList.add("cursor-panel_hidden");
    }

    function cursorMoveHandler(ev) {
        const t = ev.offsetX / ev.target.clientWidth;
        const cursorPositionPercent = (this.toPercent - this.fromPercent) * t + this.fromPercent;
        const cursorPositionX = this.chartData.maxXCoord * cursorPositionPercent;
        const closestIndex = Math.floor(cursorPositionPercent * this.chartData.x.length);
        const closestXToCursor = this.chartData.x[closestIndex];

        this.cursor.setAttributeNS(null, "x1", closestIndex * this.chartData.spaceBetweenX);
        this.cursor.setAttributeNS(null, "x2", closestIndex * this.chartData.spaceBetweenX);

        const datasetValues = [];
        for (let datasetName of Object.keys(this.chartData.datasets)) {
            const datasetValue = this.chartData.datasets[datasetName].data[closestIndex];
            this.cursorPoints[datasetName].setAttributeNS(null, "cx", closestIndex * this.chartData.spaceBetweenX);
            this.cursorPoints[datasetName].setAttributeNS(null, "cy", datasetValue);
            datasetValues.push(datasetValue);
        }

        updateCursorPanel.call(this, {
            x: closestXToCursor,
            y: datasetValues,
            xCoord: ev.offsetX
        });
    }

    function updateCursorPanel(values) {
        this.cursorPanel.querySelector(".cursor-panel__x").innerText = this.chartData.displayX(values.x);
        this.cursorPanel.querySelectorAll(".cursor-panel__y__value").forEach((elem, index) => {
            elem.innerText = values.y[index];
        })

        const style = window.getComputedStyle(this.container);
        const paddingLeft = parseInt(style.getPropertyValue("padding-left"));
        const maxX = this.svg.clientWidth - this.cursorPanel.clientWidth / 2;
        const minX = this.cursorPanel.clientWidth / 2;

        if (values.xCoord < minX) {
            this.cursorPanel.style.left = `${paddingLeft}px`;
        } 
        else if (values.xCoord > maxX) {
            this.cursorPanel.style.left = `${this.svg.clientWidth - this.cursorPanel.clientWidth}px`;
        }
        else {
            this.cursorPanel.style.left = `${values.xCoord + paddingLeft - this.cursorPanel.clientWidth / 2}px`;
        }
    }

    function generateCursor() {
        var cursor = document.createElementNS(svgNS, "line");
        cursor.setAttributeNS(null, "x1", "0");
        cursor.setAttributeNS(null, "y1", "0");
        cursor.setAttributeNS(null, "x2", "0");
        cursor.setAttributeNS(null, "y2", this.chartData.findMaxY() * SvgHelpers.HEIGHT_SCALE_FACTOR);
        cursor.setAttributeNS(null, "class", "cursor cursor_hidden");
        cursor.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

        this.cursorPoints = {};
        for (let datasetName of Object.keys(this.chartData.datasets)) { 
            const cursorPoint = document.createElementNS(svgNS, "circle");
            cursorPoint.setAttributeNS(null, "class", "cursor-point cursor-point_hidden");
            cursorPoint.setAttributeNS(null, "cx", "0");
            cursorPoint.setAttributeNS(null, "cy", "0");
            cursorPoint.setAttributeNS(null, "r", "2");
            cursorPoint.setAttributeNS(null, "vector-effect", "non-scaling-stroke");
            cursorPoint.setAttributeNS(null, "stroke", this.chartData.getColor(datasetName));
            this.cursorPoints[datasetName] = cursorPoint;

            const chartLine = this.svg.getElementById(datasetName);
            this.svg.insertBefore(cursorPoint, chartLine.nextSibling);
        }

        return cursor;
    }

    const easingFunctions = {
        "linear": (t) => {
            return t;
        },
        "quadr": (t) => {
            return t * t;
        },
        "cubic": (t) => {
            return --t * t * t + 1;
        }
    };

    /**
     * @param {number} fromPercent new start X
     * @param {number} toPercent new end X
     */
    ChartContent.prototype.setViewBoxX = function (fromPercent, toPercent) {
        const newX = fromPercent * this.chartData.maxXCoord;
        let newWidth = (toPercent - fromPercent) * this.chartData.maxXCoord;

        if (newWidth > this.chartData.maxXCoord)
            newWidth = this.chartData.maxXCoord;

        this.svg.viewBox.baseVal.x = newX;
        SvgHelpers.setWidth(this.svg, newWidth);

        updatesScalesX.call(this, fromPercent, toPercent);
    };

    let prevMaxY = null;
    /**
     * @param {number} fromPercent new start X
     * @param {number} toPercent new end X
     * @param {boolean} animate perform with animation
     */
    ChartContent.prototype.adjustViewBoxY = function (fromPercent, toPercent, animate) {
        if (typeof fromPercent !== "undefined") {
            this.fromPercent = fromPercent;
        } else {
            fromPercent = this.fromPercent;
        }

        if (typeof toPercent !== "undefined") {
            this.toPercent = toPercent;
        } else {
            toPercent = this.toPercent;
        }

        const newHeight = this.chartData.findMaxY(fromPercent, toPercent);
        if (newHeight === prevMaxY)
            return;
        else
            prevMaxY = newHeight;

        if (animate) {
            this.animateViewBoxY();
        }
        else {
            SvgHelpers.setHeight(this.svg, newHeight);
            generateScalesY.call(this, this.fromPercent, this.toPercent);
        }
    };

    ChartContent.prototype.animateViewBoxY = function (animationDuration = 100) {
        const endAnimation = () => {
            this.currentAnimation = null;
        };

        if (this.currentAnimation) {
            clearTimeout(this.currentAnimation);
            endAnimation();
        }

        const newMaxY = this.chartData.findMaxY(this.fromPercent, this.toPercent);
        let newY = newMaxY * SvgHelpers.HEIGHT_SCALE_FACTOR;

        const fps = 60;
        const frameDuration = 1000 / fps;
        const totalFrames = animationDuration / frameDuration;
        let currentFrame = 0;

        const initialY = SvgHelpers.getHeight(this.svg);
        const diffY = newY - initialY;
        if (diffY === 0)
            return;

        const easingFunction = easingFunctions["quadr"];

        const animateViewBoxFunc = () => {
            currentFrame++;

            this.svg.viewBox.baseVal.height = diffY * easingFunction(currentFrame / totalFrames) + initialY;

            if (currentFrame < totalFrames)
                this.currentAnimation = setTimeout(animateViewBoxFunc, totalFrames);
            else {
                endAnimation();
                generateScalesY.call(this, this.fromPercent, this.toPercent);
            }
        };
        this.currentAnimation = setTimeout(animateViewBoxFunc, frameDuration);
    };

    ChartContent.prototype.toggleDataset = function (datasetName) {
        const datasetPath = this.svg.getElementById(datasetName);
        datasetPath.classList.toggle("chart-line_hidden");

        if (!this.chartData.datasets[datasetName].visible)
            this.cursorPoints[datasetName].classList.add("cursor-point_hidden");

        this.adjustViewBoxY(this.fromPercent, this.toPercent, true);
    };

    return ChartContent;
})();

const ChartMap = (function () {
    const ChartMap = function (container, chartData) {
        this.container = container;
        this.chartData = chartData;
    };

    ChartMap.prototype.init = function () {
        this.svg = document.createElementNS(SvgHelpers.svgNS, "svg");
        this.svg.setAttributeNS(null, "class", "chart__map__canvas");
        this.svg.setAttributeNS(null, "preserveAspectRatio", "none");

        SvgHelpers.setHeight(this.svg, this.chartData.findMaxY());
        SvgHelpers.setWidth(this.svg, this.chartData.maxXCoord);

        this.container.appendChild(this.svg);

        this.overlayLeft = document.createElement("div");
        this.overlayLeft.className = "chart__map__overlay-left";
        this.container.appendChild(this.overlayLeft);

        this.borderLeft = document.createElement("div");
        this.borderLeft.className = "chart__map__border-left";
        this.container.appendChild(this.borderLeft);

        this.window = document.createElement("div");
        this.window.className = "chart__map__window";
        this.container.appendChild(this.window);

        this.borderRight = document.createElement("div");
        this.borderRight.className = "chart__map__border-right";
        this.container.appendChild(this.borderRight);

        this.overlayRight = document.createElement("div");
        this.overlayRight.className = "chart__map__overlay-right";
        this.container.appendChild(this.overlayRight);

        addMoveEventListeners.call(this);
        addResizeEventListeners.call(this);
    };

    function addMoveEventListeners() {
        const startHandler = (ev) => {
            ev.preventDefault();
            this.windowMoving = true;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;
            this.offsetX = this.window.offsetLeft - clientX;
        };

        const endHandler = (ev) => {
            ev.preventDefault();
            this.windowMoving = false;
        };

        const moveHandler = (ev) => {
            if (!this.windowMoving)
                return;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;
            const windowWidth = this.window.clientWidth + this.borderLeft.clientWidth + this.borderRight.clientWidth;
            var { fromPercent, toPercent } = calcNewPercents(clientX + this.offsetX, this.container.clientWidth, windowWidth);

            setFromTo.call(this, fromPercent, toPercent);

            const windowMoveEvent = new CustomEvent("windowmove", {
                detail: {
                    fromPercent,
                    toPercent,
                    type: "move"
                }
            });

            this.container.dispatchEvent(windowMoveEvent);
        };

        this.window.addEventListener("mousedown", startHandler);
        this.window.addEventListener("touchstart", startHandler);
        document.body.addEventListener("mouseup", endHandler);
        document.body.addEventListener("touchend", endHandler);
        document.body.addEventListener("mousemove", moveHandler);
        document.body.addEventListener("touchmove", moveHandler);
    }

    function calcNewPercents(newX, mapWidth, windowWidth) {
        if (newX < 0)
            newX = 0;

        const maxX = mapWidth - windowWidth;
        if (newX > maxX)
            newX = maxX;

        const fromPercent = newX / mapWidth;
        const toPercent = (newX + windowWidth) / mapWidth;

        return {
            fromPercent,
            toPercent
        };
    }

    function setFromTo(fromPercent, toPercent) {
        this.overlayLeft.style.width = `${fromPercent*100}%`;
        this.window.style.width = `calc(${(toPercent - fromPercent)*100}% - ${this.borderLeft.clientWidth + this.borderRight.clientWidth}px)`;
    }

    function addResizeEventListeners() {
        const startLeftHandler = (ev) => {
            ev.preventDefault();
            this.windowResizingLeft = true;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;
            this.offsetX = this.borderLeft.offsetLeft - clientX;
        };

        const startRightHandler = (ev) => {
            ev.preventDefault();
            this.windowResizingRight = true;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;
            this.offsetX = this.borderRight.offsetLeft - clientX;
        };

        const endLeftHandler = (ev) => {
            ev.preventDefault();
            this.windowResizingLeft = false;
        };

        const endRightHandler = (ev) => {
            ev.preventDefault();
            this.windowResizingRight = false;
        };

        const minWidth = 0.1;

        const moveLeftHandler = (ev) => {
            if (!this.windowResizingLeft)
                return;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;

            var newX = clientX + this.offsetX;
            if (newX < 0)
                newX = 0;

            const windowWidth = this.window.clientWidth + this.borderLeft.clientWidth + this.borderRight.clientWidth;
            const maxX = this.borderRight.offsetLeft + this.borderRight.clientWidth;
            if (newX > maxX)
                newX = maxX;

            let fromPercent = newX / this.container.clientWidth;
            const toPercent = (this.borderLeft.offsetLeft + windowWidth) / this.container.clientWidth;

            let newWindowWidth = toPercent - fromPercent;
            if (newWindowWidth < minWidth)
                fromPercent = toPercent - minWidth;

            setFromTo.call(this, fromPercent, toPercent);

            const windowMoveEvent = new CustomEvent("windowmove", {
                detail: {
                    fromPercent,
                    toPercent,
                }
            });

            this.container.dispatchEvent(windowMoveEvent);
        };

        const moveRightHandler = (ev) => {
            if (!this.windowResizingRight)
                return;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;

            const windowWidth = this.window.clientWidth + this.borderLeft.clientWidth + this.borderRight.clientWidth;

            var newX = clientX + this.offsetX;
            const minX = this.borderLeft.offsetLeft + 0.1 * windowWidth;
            if (newX < minX)
                newX = minX;

            const maxX = this.container.clientWidth;
            if (newX > maxX)
                newX = maxX;

            const fromPercent = this.borderLeft.offsetLeft / this.container.clientWidth;
            let toPercent = newX / this.container.clientWidth;

            let newWindowWidth = toPercent - fromPercent;
            if (newWindowWidth < minWidth)
                toPercent = fromPercent + minWidth;

            setFromTo.call(this, fromPercent, toPercent);

            const windowMoveEvent = new CustomEvent("windowmove", {
                detail: {
                    fromPercent,
                    toPercent
                }
            });

            this.container.dispatchEvent(windowMoveEvent);
        };

        this.borderLeft.addEventListener("mousedown", startLeftHandler);
        this.borderRight.addEventListener("mousedown", startRightHandler);
        document.body.addEventListener("mousemove", moveLeftHandler);
        document.body.addEventListener("mousemove", moveRightHandler);
        document.body.addEventListener("mouseup", endLeftHandler);
        document.body.addEventListener("mouseup", endRightHandler);

        this.borderLeft.addEventListener("touchstart", startLeftHandler);
        this.borderRight.addEventListener("touchstart", startRightHandler);
        document.body.addEventListener("touchmove", moveLeftHandler);
        document.body.addEventListener("touchmove", moveRightHandler);
        document.body.addEventListener("touchend", endLeftHandler);
        document.body.addEventListener("touchend", endRightHandler);
    }

    ChartMap.prototype.draw = function () {
        this.init();

        for (const datasetName of Object.keys(this.chartData.datasets)) {
            const path = SvgHelpers.generateDatasetPath(datasetName,
                this.chartData.datasets[datasetName].data,
                this.chartData.getColor(datasetName),
                this.chartData.spaceBetweenX,
                "chart-map-line");
            this.svg.appendChild(path);
        }
    };

    ChartMap.prototype.toggleDataset = function (datasetName) {
        const datasetPath = this.svg.getElementById(datasetName);
        datasetPath.classList.toggle("chart-map-line_hidden");

        this.adjustViewBoxY();
    };

    ChartMap.prototype.adjustViewBoxY = function () {
        const newHeight = this.chartData.findMaxY();
        SvgHelpers.setHeight(this.svg, newHeight);
    };

    return ChartMap;
})();

const TgChart = (function () {

    function TgChart(containerId, data, options) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.options = options;
        init.call(this, this.options);
    }

    function generateLayout({ name } = {}) {
        if (name)
            this.container.innerHTML += `<div class="chart__title">${name}</div>`;

        var chartElement = document.createElement("div");
        chartElement.className = "chart__content";
        this.container.appendChild(chartElement);

        var chartMapElement = document.createElement("div");
        chartMapElement.className = "chart__map";
        this.container.appendChild(chartMapElement);

        var legendElement = document.createElement("div");
        legendElement.className = "chart__legend";

        for (const datasetName of Object.keys(this.chartData.datasets)) {
            var legendItem = document.createElement("span");
            legendItem.className = "chart__legend__item";

            var indicator = document.createElement("span");
            indicator.className = "chart__legend__item__indicator";
            indicator.style.backgroundColor = this.chartData.getColor(datasetName);
            indicator.style.borderColor = this.chartData.getColor(datasetName);
            legendItem.appendChild(indicator);

            var itemText = document.createElement("span");
            itemText.className = "chart__legend__item__text";
            itemText.innerText = this.chartData.data.names[datasetName];
            legendItem.appendChild(itemText);

            const legendItemClickHandler = (ev) => {
                this.toggleDataset(ev.currentTarget, datasetName);
            };
            legendItem.addEventListener("click", legendItemClickHandler);
            legendItem.addEventListener("touchend", legendItemClickHandler);

            legendElement.appendChild(legendItem);
        }

        this.container.appendChild(legendElement);

        return {
            chartMap: chartMapElement,
            chart: chartElement,
            legend: legendElement
        };
    }

    function init(options) {
        this.chartData = new ChartData(this.data);

        this.layout = generateLayout.call(this, options);

        this.content = new ChartContent(this.layout.chart, this.chartData);
        this.content.draw();

        this.chartMap = new ChartMap(this.layout.chartMap, this.chartData);
        this.chartMap.draw();

        this.chartMap.container.addEventListener("windowmove", (ev) => {
            this.content.setViewBoxX(ev.detail.fromPercent, ev.detail.toPercent);
            this.content.adjustViewBoxY(ev.detail.fromPercent, ev.detail.toPercent, true);
        });

        const INITIAL_FROM_PERCENT = 0.0;
        const INITIAL_TO_PERCENT = 0.25;

        this.content.setViewBoxX(INITIAL_FROM_PERCENT, INITIAL_TO_PERCENT);
        this.content.adjustViewBoxY(INITIAL_FROM_PERCENT, INITIAL_TO_PERCENT);
    }

    TgChart.prototype.toggleDataset = function (item, datasetName) {
        item.classList.toggle("chart__legend__item_hidden");
        item.classList.add("chart__legend__item_animating");
        setTimeout(() => {
            item.classList.remove("chart__legend__item_animating");
        }, 500);
        this.chartData.toggleDatasetVisibility(datasetName);

        this.content.toggleDataset(datasetName);
        this.chartMap.toggleDataset(datasetName);
    };

    return TgChart;
})();