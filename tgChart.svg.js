const ChartData = (function () {
    function findMaxY(datasets) {
        let maxY = 0;
        for (const datasetKey of Object.keys(datasets)) {
            const dataSetMax = Math.max.apply(Math, datasets[datasetKey]);
            if (dataSetMax > maxY)
                maxY = dataSetMax;
        }
        return maxY;
    }
    
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

        this.maxY = findMaxY(this.datasets);
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

    return ChartData;    
})();

const TgChart = (function () {

    function TgChart(containerId, data) {
        this.container = document.getElementById(containerId);
        this.chartData = new ChartData(data);
    }

    function generateLayout({}) {
        var chartElement = document.createElement("div");
        chartElement.className = "chart__content";
        this.container.appendChild(chartElement);
        
        var chartMapElement = document.createElement("div");
        chartMapElement.className = "chart__map";

        var chartMapCanvas = document.createElement("div");
        chartMapCanvas.className = "chart__map__canvas";
        chartMapElement.appendChild(chartMapCanvas);

        chartMapElement.innerHTML += "<div class='chart__map__overlay__left'></div>";

        var chartMapWindow = document.createElement("div");
        chartMapWindow.className = "chart__map__window";
        chartMapElement.appendChild(chartMapWindow);

        chartMapElement.innerHTML += "<div class='chart__map__overlay__right'></div>";

        this.container.appendChild(chartMapElement);

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

        this.container.appendChild(legendElement);

        return {
            chartMap: chartMapElement,
            chart: chartElement,
            legend: legendElement
        }
    }

    function getSpaceBetweenX() {
        return 10;
    }

    function generatePath(datasetName, dataset) {
        const path = document.createElement("path");

        let pathDefinition = "M0 " + dataset[0];

        for (let index = 1; index < dataset.length; index++) {
            const val = dataset[index];
            pathDefinition += ` L${spaceBetween*index} ${val}`;
        }

        pathDefinition += " Z";

        path.setAttribute("d") = pathDefinition;
        path.setAttribute("id", datasetName);

        return path;
    }

    function generateSvg() {
        const svg = document.createElement("svg");
        
        for (let datasetName of Object.keys(this.chartData.datasets)) {
            const path = generatePath(datasetName, this.chartData.datasets[datasetName]);
            svg.appendChild(path);
        }

        return svg;
    }

    TgChart.prototype.init = function(options) {
        this.spaceBetweenX = getSpaceBetweenX();
        
        generateLayout.call(this, options);
        const svg = generateSvg.call(this);
        this.container.appendChild(svg);
    };

    return TgChart;
})();