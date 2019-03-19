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
    }

    ChartData.prototype.getX = function () {
        return this.x;
    }

    ChartData.prototype.getDisplayedX = () => {
        return this.getX().map((x) => new Date(x).toLocaleDateString("en-US",
            {
                day: "numeric",
                month: "short"
            }));
    }

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
    }    

    ChartData.prototype.toggleDatasetVisibility = function(datasetName) {
        this.datasets[datasetName].visible = !this.datasets[datasetName].visible;
    }

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
    }

    const setHeight = function (svg, height) {
        svg.viewBox.baseVal.height = height;
    }

    const setWidth = function (svg, width) {
        svg.viewBox.baseVal.width = width;
    }

    return {
        svgNS,
        generateDatasetPath,
        setWidth,
        setHeight
    };
})();

const ChartContent = (function(){
    function ChartContent(container, chartData) {
        this.chartData = chartData;
        this.container = container;
    }

    const svgNS = SvgHelpers.svgNS;

    function generateChartSvg(options) {        
        const svg = document.createElementNS(svgNS, "svg");        
        
        svg.setAttributeNS(null, "viewBox", `0 0 ${0.25 * this.maxXCoord} ${this.chartData.findMaxY()}`);
        svg.setAttributeNS(null, "preserveAspectRatio", "none");

        return svg;
    }

    function generateScalesY() {
        const scalesYCount = 5;
        let scalesYStep = Math.ceil(this.chartData.findMaxY() / scalesYCount);
        scalesYStep -= (scalesYStep % 10);

        const result = [];
        for (let index = 0; index <= scalesYCount; index++) {
            const path = document.createElementNS(svgNS, "path");
            const scaleValue = index * scalesYStep;
            path.setAttributeNS(null, "d", `M0 ${scaleValue} H${this.maxXCoord}`);
            path.setAttributeNS(null, "class", "scale-y");
            path.setAttributeNS(null, "vector-effect", "non-scaling-stroke");

            const text = document.createElementNS(svgNS, "text");
            text.append(scaleValue);
            text.setAttributeNS(null, "x", 0);
            text.setAttributeNS(null, "y", scaleValue);
            text.setAttributeNS(null, "class", "scale-y__text");

            const group = document.createElementNS(svgNS, "g");
            group.appendChild(path);
            //group.appendChild(text);

            result.push(group);
        }        
        return result;
    }

    ChartContent.prototype.draw = function () {
        this.spaceBetweenX = this.chartData.spaceBetweenX;
        this.maxXCoord = this.chartData.maxXCoord;

        this.svg = generateChartSvg.call(this);
        this.svg.setAttributeNS(null, "class", "chart__content__lines")
        
        const scalesY = generateScalesY.call(this);
        //const scalesContainer = this.container.querySelector(".scales");        
        //scalesContainer.setAttributeNS(null, "preserveAspectRatio", "none");
        scalesY.forEach((scaleY, index) => {            
            this.svg.appendChild(scaleY);
        });

        for (let datasetName of Object.keys(this.chartData.datasets)) {
            const path = SvgHelpers.generateDatasetPath(datasetName, this.chartData.datasets[datasetName].data, this.chartData.getColor(datasetName), this.spaceBetweenX, "chart-line");
            this.svg.appendChild(path);
        }

        this.container.appendChild(this.svg);
    }

    const easingFunctions = {
        "linear": (t) => {
            return t;
        },
        "quadr": (t) => {
            return t*t;
        }
    }

    ChartContent.prototype.setViewBoxX = function(fromPercent, toPercent) {
        const newX = fromPercent * this.chartData.maxXCoord;
        const newWidth = (toPercent - fromPercent) * this.chartData.maxXCoord;

        if (newWidth > this.chartData.maxXCoord)
            newWidth = this.chartData.maxXCoord;

        this.svg.viewBox.baseVal.x = newX;
        SvgHelpers.setWidth(this.svg, newWidth);
    }

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

        //console.log(`from ${fromPercent} to ${toPercent} maxHeight ${newHeight}`);

        if (animate)
            this.animateViewBoxY();
        else
            SvgHelpers.setHeight(this.svg, newHeight);
    }

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

        this.container.classList.add("chart__content_animating");
        
        const animateViewBoxFunc = () => {            
            currentFrame++;

            SvgHelpers.setHeight(this.svg, diffY * easingFunction(currentFrame / totalFrames) + initialY);

            if (currentFrame < totalFrames)
                this.currentAnimation = setTimeout(animateViewBoxFunc, totalFrames);            
            else
                endAnimation();
        };
        this.currentAnimation = setTimeout(animateViewBoxFunc, totalFrames);
    };

    ChartContent.prototype.toggleDataset = function(datasetName) {
        const datasetPath = this.svg.getElementById(datasetName);
        datasetPath.classList.toggle("chart-line_hidden");

        //this.adjustViewBoxY();

        this.animateViewBoxY(200);
    }

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

        this.window = this.container.querySelector(".chart__map__window");

        this.borderLeft = document.createElement("div");
        this.borderLeft.className = "chart__map__window__border-left";        
        this.window.appendChild(this.borderLeft);

        this.borderRight = document.createElement("div");
        this.borderRight.className = "chart__map__window__border-right";
        this.window.appendChild(this.borderRight);

        this.overlayLeft = this.container.querySelector(".chart__map__overlay__left");
        this.overlayRight = this.container.querySelector(".chart__map__overlay__right");

        addEventListeners.call(this);
    }

    function addEventListeners() {
        const startListener = (ev) => {
            this.windowMoving = true;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;
            this.offsetX = this.window.offsetLeft - clientX;
            //console.log(`start ${clientX}`);
        };       

        const endHandler = () => {
            this.windowMoving = false;
            //console.log("stop");
        };        

        const moveHandler = (ev) => {
            if (!this.windowMoving)
                return;

            const clientX = ev instanceof TouchEvent ? ev.touches[0].clientX : ev.clientX;

            //console.log(`${clientX}`);

            const chartMapWidth = this.window.parentElement.clientWidth;
            let newX = clientX + this.offsetX;
            if (newX < 0)
                newX = 0;
            if (newX + this.window.clientWidth > this.window.parentElement.clientWidth)
                newX = chartMapWidth - this.window.clientWidth;
            
            this.window.style.left = newX + "px";
            this.overlayLeft.style.right = (chartMapWidth - newX) + "px";
            this.overlayRight.style.left = (newX + this.window.clientWidth) + "px";

            const fromPercent = newX / this.window.parentElement.clientWidth;
            const toPercent = (newX + this.window.clientWidth) / this.window.parentElement.clientWidth;
            const windowMoveEvent = new CustomEvent("windowmove", {
                detail: {
                    fromPercent,
                    toPercent
                }
            });

            document.dispatchEvent(windowMoveEvent);
        };

        this.container.addEventListener("mousedown", startListener);
        this.container.addEventListener("touchstart", startListener);
        document.body.addEventListener("mouseup", endHandler);
        document.body.addEventListener("touchend", endHandler);
        document.body.addEventListener("mousemove", moveHandler);
        document.body.addEventListener("touchmove", moveHandler);
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
    }

    ChartMap.prototype.toggleDataset = function(datasetName) {
        const datasetPath = this.svg.getElementById(datasetName);
        datasetPath.classList.toggle("chart-map-line_hidden");

        this.adjustViewBoxY();
    }

    ChartMap.prototype.adjustViewBoxY = function() {
        const newHeight = this.chartData.findMaxY();
        SvgHelpers.setHeight(this.svg, newHeight);
    }

    return ChartMap;
})();

const TgChart = (function () {

    function TgChart(containerId, data) {
        this.container = document.getElementById(containerId);
        this.data = data;        
    }

    function generateLayout({} = {}) {
        var chartElement = document.createElement("div");
        chartElement.className = "chart__content";
        //chartElement.innerHTML = "<svg class=\"scales\"></svg>";
        this.container.appendChild(chartElement);
        
        var chartMapElement = document.createElement("div");
        chartMapElement.className = "chart__map";
        chartMapElement.innerHTML += "<div class='chart__map__overlay__left'></div>";

        var chartMapWindow = document.createElement("div");
        chartMapWindow.className = "chart__map__window";
        chartMapElement.appendChild(chartMapWindow);

        chartMapElement.innerHTML += "<div class='chart__map__overlay__right'></div>";

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

            legendItem.addEventListener("click", (ev) => {
                this.toggleDataset(ev.currentTarget, datasetName);
            });

            legendElement.appendChild(legendItem);
        }

        this.container.appendChild(legendElement);

        return {
            chartMap: chartMapElement,
            chart: chartElement,
            legend: legendElement
        }
    }

    TgChart.prototype.init = function(options) {
        this.chartData = new ChartData(this.data);

        this.layout = generateLayout.call(this, options);                
        
        this.content = new ChartContent(this.layout.chart, this.chartData);
        this.content.draw();

        this.chartMap = new ChartMap(this.layout.chartMap, this.chartData);
        this.chartMap.draw();

        document.addEventListener("windowmove", (ev) => {
            this.content.setViewBoxX(ev.detail.fromPercent, ev.detail.toPercent);
            this.content.adjustViewBoxY(ev.detail.fromPercent, ev.detail.toPercent, true);
        });

        this.content.setViewBoxX(0, 0.25);
        this.content.adjustViewBoxY(0, 0.25);
    };

    TgChart.prototype.toggleDataset = function(item, datasetName) {
        item.classList.toggle("chart__legend__item_hidden");
        this.chartData.toggleDatasetVisibility(datasetName);        

        this.content.toggleDataset(datasetName);
        this.chartMap.toggleDataset(datasetName);
    }

    return TgChart;
})();