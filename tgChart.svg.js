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
            var data = column.slice(1, column.length);
            if (name === "x")
                this.x = data;
            else
                this.datasets[name] = { 
                    data,
                    name,
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
        return this.getX(fromPercent, toPercent).map((x) => new Date(x).toLocaleDateString("en-US",
            {
                day: "numeric",
                month: "short"
            }));
    };

    /**
     * @param {number} fromPercent start search from
     * @param {number} toPercent search to
     * @returns {number} max y coord
     */
    ChartData.prototype.findMaxY = function(fromPercent = 0, toPercent = 1) {
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

    ChartData.prototype.toggleDatasetVisibility = function(datasetName) {
        this.datasets[datasetName].visible = !this.datasets[datasetName].visible;
    };

    return ChartData;    
})();

const SvgHelpers = (function () {
    const svgNS = "http://www.w3.org/2000/svg";

    const generateDatasetPath = function(datasetName, dataset, color, spaceBetweenX, lineClass) {
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

    const setHeight = function (svg, height) {
        svg.viewBox.baseVal.height = height;
    };

    const setWidth = function (svg, width) {
        svg.viewBox.baseVal.width = width;
    };

    return {
        svgNS,
        generateDatasetPath,
        setWidth,
        setHeight
    };
})();

const ChartContent = (function(){

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
        
        svg.setAttributeNS(null, "viewBox", `0 0 ${0.25 * this.maxXCoord} ${this.chartData.findMaxY()}`);
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
        return {n, i};
    }

    function generateScalesYValues (fromPercent = 0, toPercent = 1, scalesYCount = 5) {
        let maxY = this.chartData.findMaxY(fromPercent, toPercent);

        let {n, i} = getFirstTwoDigits(maxY);
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
        clearScalesY.call(this);

        const scalesYValues = generateScalesYValues.call(this, fromPercent, toPercent);
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
        return value / maxY * 100;
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
        const maxScaleCount = this.scalesXScrollContainer.clientWidth / this.maxXScaleWidth;
        const showEveryNth = Math.round((toIndex - fromIndex) / maxScaleCount);
        const indexShift = -Math.round(showEveryNth / 2);
        for (let index = 1; index < -indexShift; index++) {
            scales[index].classList.add("scale-x-text_hidden");
        }
        for (let index = showEveryNth; index + indexShift < scales.length; index++) {
            if (index % showEveryNth !== 0)
                scales[index+indexShift].classList.add("scale-x-text_hidden");
            else
                scales[index+indexShift].classList.remove("scale-x-text_hidden");
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

        this.container.appendChild(this.svg);
    };

    const easingFunctions = {
        "linear": (t) => {
            return t;
        },
        "quadr": (t) => {
            return t*t;
        },
        "cubic": (t) => {
            return --t*t*t+1;
        }
    };

    /**
     * @param {number} fromPercent new start X
     * @param {number} toPercent new end X
     */
    ChartContent.prototype.setViewBoxX = function(fromPercent, toPercent) {
        const newX = fromPercent * this.chartData.maxXCoord;
        let newWidth = (toPercent - fromPercent) * this.chartData.maxXCoord;

        if (newWidth > this.chartData.maxXCoord)
            newWidth = this.chartData.maxXCoord;

        this.svg.viewBox.baseVal.x = newX;
        SvgHelpers.setWidth(this.svg, newWidth);

        updatesScalesX.call(this, fromPercent, toPercent);
    };

    /**
     * @param {number} fromPercent new start X
     * @param {number} toPercent new end X
     * @param {boolean} animate perform with animation
     */
    ChartContent.prototype.adjustViewBoxY = function(fromPercent, toPercent, animate) {
        if (typeof fromPercent !== "undefined") {
            this.fromPercent = fromPercent;
        }
        else {
            fromPercent = this.fromPercent;
        }

        if (typeof toPercent !== "undefined") {
            this.toPercent = toPercent;
        }
        else {
            toPercent = this.toPercent;
        }

        const newHeight = this.chartData.findMaxY(fromPercent, toPercent);

        if (animate)
            this.animateViewBoxY();
        else
            SvgHelpers.setHeight(this.svg, newHeight);

        generateScalesY.call(this, this.fromPercent, this.toPercent);
    };

    ChartContent.prototype.animateViewBoxY = function (animationDuration = 100) {
        const endAnimation = () => {
            this.currentAnimation = null;
            this.container.classList.remove("chart__content_animating");
        };

        if (this.currentAnimation) {
            clearTimeout(this.currentAnimation);
            endAnimation();
        }

        let newY = this.chartData.findMaxY(this.fromPercent, this.toPercent);

        const fps = 60;
        const frameDuration = 1000 / fps;
        const totalFrames = animationDuration / frameDuration;
        let currentFrame = 0;

        const initialY = this.svg.viewBox.baseVal.height;
        const diffY = newY - initialY;

        if (diffY === 0)
            return;

        const easingFunction = easingFunctions["quadr"];

        const animateViewBoxFunc = () => {
            currentFrame++;

            SvgHelpers.setHeight(this.svg, diffY * easingFunction(currentFrame / totalFrames) + initialY);

            if (currentFrame < totalFrames)
                this.currentAnimation = setTimeout(animateViewBoxFunc, totalFrames);
            else
                endAnimation();
        };        
        this.currentAnimation = setTimeout(animateViewBoxFunc, frameDuration);
    };

    ChartContent.prototype.toggleDataset = function(datasetName) {
        const datasetPath = this.svg.getElementById(datasetName);
        datasetPath.classList.toggle("chart-line_hidden");

        this.adjustViewBoxY(this.fromPercent, this.toPercent, true);
    };

    return ChartContent;
})();

const ChartMap = (function() {
    const ChartMap = function(container, chartData) {
        this.container = container;
        this.chartData = chartData;
    };

    ChartMap.prototype.init = function() {
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
            //console.log(`start ${clientX}`);
        };       

        const endHandler = (ev) => {
            ev.preventDefault();
            this.windowMoving = false;
            //console.log("stop");
        };        

        const moveHandler = (ev) => {
            if (!this.windowMoving)
                return;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;

            //console.log(`${clientX}`);

            const windowWidth = this.window.clientWidth + this.borderLeft.clientWidth + this.borderRight.clientWidth;
            var {fromPercent, toPercent} = calcNewPercents(clientX + this.offsetX, this.container.clientWidth, windowWidth);

            setFromTo.call(this, fromPercent, toPercent);
            
            const windowMoveEvent = new CustomEvent("windowmove", {
                detail: {
                    fromPercent,
                    toPercent
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
                    toPercent
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

    ChartMap.prototype.draw = function() {
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

    ChartMap.prototype.toggleDataset = function(datasetName) {
        const datasetPath = this.svg.getElementById(datasetName);
        datasetPath.classList.toggle("chart-map-line_hidden");

        this.adjustViewBoxY();
    };

    ChartMap.prototype.adjustViewBoxY = function() {
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

    function generateLayout({name} = {}) {
        if (name)
            this.container.innerHTML += `<h2 class="chart__title">${name}</h2>`;

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

        this.content.setViewBoxX(0, 0.25);
        this.content.adjustViewBoxY(0, 0.25);
    }

    TgChart.prototype.toggleDataset = function(item, datasetName) {
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