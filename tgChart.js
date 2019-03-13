
function ChartData(data) {
    this.data = data;

    this.datasets = {};
    this.data.columns.forEach((column) => {        
        const name = column[0];
        var dataset = column.slice(1, column.length);
        if (name === "x")
            this.x = dataset;            
        else
            this.datasets[name] = dataset;
    });

    function findMaxY(datasets) {
        let maxY = 0;
        for (const datasetKey of Object.keys(datasets)) {
            const dataSetMax = Math.max.apply(Math, datasets[datasetKey]);
            if (dataSetMax > maxY)
                maxY = dataSetMax;
        }
        return maxY;
    }

    this.maxY = findMaxY(this.datasets);

    this.getColor = (datasetName) => {
        return this.data.colors[datasetName];
    }

    this.getX = () => {
        return this.x;
    }

    this.getDisplayedX = () => {
        return this.getX().map((x) => new Date(x).toLocaleDateString("en-US",
            {
                day: "numeric",
                month: "short"
            }));
    }
}

/**
 * @param {HTMLDivElement} container 
 * @param {ChartData} chartData 
 * @param {Object} options 
 */
function ChartMap(container, chartData, options) {
    this.container = container;    
    this.canvas = this.container.querySelector("canvas");
    this.context = this.canvas.getContext("2d");
    this.chartData = chartData;
    this.options = options || {};

    function drawDataset(canvas, canvasContext, dataset, color) {
        canvasContext.strokeStyle = color;

        canvasContext.beginPath();
        canvasContext.moveTo(0, dataset[0]);

        const spaceBetweenPoints = canvas.width / dataset.length;
        dataset.forEach((val, index) => {
            canvasContext.lineTo(spaceBetweenPoints*(index+1), val);
        });

        canvasContext.stroke();        
        canvasContext.closePath();
    }

    this.draw = () => {
        this.canvas.width = 640;
        this.canvas.height = 100;
        this.context.translate(0, this.canvas.height);        
        this.context.scale(1, -1);
        this.context.scale(1, 0.9 * this.canvas.height / this.chartData.maxY);

        for (const datasetName of Object.keys(this.chartData.datasets))
            drawDataset(this.canvas, this.context, this.chartData.datasets[datasetName], this.chartData.getColor(datasetName));
    }
}

/**
 * @param {HTMLCanvasElement} canvas 
 * @param {ChartData} chartData 
 */
function Chart(canvas, chartData, options) {
    this.canvas = canvas;
    this.context = this.canvas.getContext("2d");
    this.options = options || {};
    this.chartData = chartData;

    this.spaceBetweenPoints = this.canvas.width / this.chartData.getX().length;

    this.scalesYCount = 5;

    let drawScalesY = (canvasContext) => {
        let scalesStep = Math.ceil(this.chartData.maxY / this.scalesYCount);
        scalesStep -= (scalesStep % 10);

        canvasContext.strokeStyle = this.options.scalesColor;

        for (let index = 0; index <= this.scalesYCount; index++) {
            const scaleValue = index*scalesStep;

            canvasContext.beginPath();

            const scaleY = this.canvas.height - scaleValue;

            canvasContext.moveTo(0, scaleY);
            canvasContext.lineTo(this.canvas.width, scaleY);
            canvasContext.stroke();

            canvasContext.closePath();

            canvasContext.fillStyle = this.options.scalesTextColor;
            canvasContext.font = this.options.scalesFontStyle;
            canvasContext.textBaseline = "bottom";

            canvasContext.fillText(scaleValue, 0, scaleY);
        }
    }

    const drawScalesX = (canvasContext) => {
        const drawEveryNth = 10;

        this.chartData.getDisplayedX().forEach((x, index) => {
            if (index % drawEveryNth !== 0)
                return;

            canvasContext.fillStyle = this.options.scalesTextColor;
            canvasContext.font = this.options.scalesFontStyle;
            canvasContext.textBaseline = "top";

            canvasContext.fillText(x, index * this.spaceBetweenPoints, this.canvas.height + 5);
        });
    }

    function drawScales(canvasContext) {
        drawScalesX(canvasContext);
        drawScalesY(canvasContext);
    }

    function drawData(canvas, canvasContext, dataset, color) {
        canvasContext.strokeStyle = color;

        canvasContext.beginPath();
        canvasContext.moveTo(0, canvas.height - dataset[0]);

        const spaceBetweenPoints = canvas.width / dataset.length;
        dataset.forEach((val, index) => {
            canvasContext.lineTo(spaceBetweenPoints*(index+1), canvas.height - val);
        });

        canvasContext.stroke();
        canvasContext.closePath();
    }

    this.draw = () => {
        this.context.translate(0, -this.canvas.height);
        this.context.scale(this.canvas.height / this.chartData.maxY, this.canvas.height / this.chartData.maxY);

        drawScales(this.context);

        for (const datasetKey of Object.keys(this.chartData.datasets)) {
            drawData(this.canvas, this.context, this.chartData.datasets[datasetKey], this.chartData.getColor(datasetKey));
        }   
    }
}


function TgChart(containerId, data, options) {
    this.container = document.getElementById(containerId);
    this.options = options || {
        width: 800,
        height: 600,
        legendClass: "chart__legend",
        legendItemClass: "chart__legend__item"
    };

    this.data = data;
    this.chartData = new ChartData(this.data);    

    /**
     * @param {HTMLElement} container
     * @param {ChartData} chartData
     */
    function generateLayout(container, chartData, options) {
        var chartElement = document.createElement("canvas");
        chartElement.className = "chart__content";
        container.appendChild(chartElement);
        
        var chartMapElement = document.createElement("div");
        chartMapElement.className = "chart__map";

        var chartMapCanvas = document.createElement("canvas");
        chartMapCanvas.className = "chart__map__canvas";
        chartMapElement.appendChild(chartMapCanvas);

        chartMapElement.innerHTML += "<div class='chart__map__overlay__left'></div>";

        var chartMapWindow = document.createElement("div");
        chartMapWindow.className = "chart__map__window";
        chartMapElement.appendChild(chartMapWindow);

        chartMapElement.innerHTML += "<div class='chart__map__overlay__right'></div>";

        container.appendChild(chartMapElement);

        var legendElement = document.createElement("div");
        legendElement.className = "chart__legend";
        
        for (const datasetName of Object.keys(chartData.datasets)) {            
            var legendItem = document.createElement("span");            
            legendItem.className = options.legendItemClass;

            var indicator = document.createElement("span");
            indicator.className = "chart__legend__item__indicator";
            indicator.style.backgroundColor = chartData.getColor(datasetName);
            indicator.style.borderColor = chartData.getColor(datasetName);
            legendItem.appendChild(indicator);

            var itemText = document.createElement("span");
            itemText.className = "chart__legend__item__text";
            itemText.innerText = chartData.data.names[datasetName];
            legendItem.appendChild(itemText);

            legendElement.appendChild(legendItem);
        }

        container.appendChild(legendElement);

        chartElement.setAttribute("width", chartElement.offsetWidth);
        chartElement.setAttribute("height", chartElement.offsetHeight);

        chartMapCanvas.setAttribute("width", 640);
        chartMapCanvas.setAttribute("height", 100);

        return {
            chartMap: chartMapElement,
            chart: chartElement,
            legend: legendElement
        }
    }

    this.layout = generateLayout(this.container, this.chartData, {
        legendItemClass: this.options.legendItemClass
    });

    this.chartMap = new ChartMap(this.layout.chartMap, this.chartData, {
        width: 640,
        height: 100
    });
    this.chart = new Chart(this.layout.chart, this.chartData, {
        scalesColor: "#f2f4f5",
        scalesTextColor: "#96a2aa",
        scalesFontSize: 16,
        scalesFontStyle: "normal 16px Segoe UI"
    });
    
    this.draw = function() {        
        this.chartMap.draw();
        this.chart.draw();
    }  

    this.zoom = function(val) {
        this.context.scale(val, 1);
        this.clearCanvas();
        this.drawData();
    }

    this.pan = function(val) {
        this.context.translate(val, 0);
        this.clearCanvas();
        this.drawData();
    }

    this.clearCanvas = function() {
        // var start = this.context.transformedPoint(0,0);
        // var end = this.context.transformedPoint(this.canvas.width, this.canvas.height);
        // this.context.clearRect(start.x, start.y, end.x - start.x, end.y - start.y);

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}