(function(){
//pseudo-global variables
    //variables for data join
    var attrArray = ["AFFGEOID", 
                    "NAMELABEL", 
                    "Impervious surface growth, 2000-2019", 
                    "New acres of impervious surface, 2000-2019", 
                    "Households with no car, 2020", 
                    "Households with at least 2 cars, 2020", 
                    "Population per square mile, 2020", 
                    "Population that is white, 2020"];
    var dropdownArray = ["Impervious surface growth, 2000-2019", 
                        "New acres of impervious surface, 2000-2019", 
                        "Households with no car, 2020", 
                        "Households with at least 2 cars, 2020", 
                        "Population per square mile, 2020", 
                        "Population that is white, 2020"];
    var expressed = attrArray[2]; //initial attribute
    //hard code max value for initial value
    var max = 100
 
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var colorClasses = [
        "#f7f7f7",
        "#cccccc",
        "#969696",
        "#636363",
        "#252525"
    ];

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 110]);

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.47,
            height = 580;

        //create new svg container for the map
        var map = d3.select("#map")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)

        //create a rectangle for map background fill
        var mapBackground = map.append("rect")
        .attr("class", "mapBackground")
        .attr("width", width)
        .attr("height", height)

        //create projection centered on MSP.
        var projection = d3.geoAlbers()
            .center([.12, 45])
            .rotate([93.38, .025, 0])
            .parallels([44.96, 44.96])
            .scale(37000)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];
            promises.push(d3.csv("data/msp_data.csv"));                    
            promises.push(d3.json("data/msp_geo.json")); 
            promises.push(d3.json("data/rivers.json"));                   
            promises.push(d3.json("data/lakes.json")); 
            promises.push(d3.json("data/interstates.json"));       
            promises.push(d3.json("data/roads.json"));                                                                   
        Promise.all(promises).then(callback);

        function callback(data) {
            var mspData = data[0], mspGeo = data[1], rivers = data[2], lakes = data[3], interstates = data[4], roads = data[5];
            //translate TopoJSON
            var mspGeo = topojson.feature(mspGeo, mspGeo.objects.msp_geo).features,
                rivers = topojson.feature(rivers, rivers.objects.rivers),
                lakes = topojson.feature(lakes, lakes.objects.lakes),
                interstates = topojson.feature(interstates, interstates.objects.interstates),
                roads = topojson.feature(roads, roads.objects.roads);

            //add rivers to map
            var rivers = map.append("path")
            .datum(rivers)
            .attr("class", "rivers")
            .attr("d", path);

            //add lakes to map
            var lakes = map.append("path")
            .datum(lakes)
            .attr("class", "lakes")
            .attr("d", path);
            
            //add interstates to map
            var interstates = map.append("path")
            .datum(interstates)
            .attr("class", "interstates")
            .attr("d", path);

            //add roads to map
            var roads = map.append("path")
            .datum(roads)
            .attr("class", "roads")
            .attr("d", path);

            //join the csv and geojson data
            joinData(mspData, mspGeo)

            //make the color scale
            var colorScale = makeColorScale(mspData);

            //add enumeration units to the map
            setEnumerationUnits(map, mspGeo, path, colorScale)

            //add coordinated visualization to the map
            setChart(mspData, colorScale);
            createDropdown(mspData);
        };
    };

    function joinData(mspData, mspGeo) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<mspData.length; i++){
            var csvMuni = mspData[i]; //the current region
            var csvKey = csvMuni.AFFGEOID; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<mspGeo.length; a++){

                var geojsonMuni = mspGeo[a].properties; //the current region geojson properties
                var geojsonKey = geojsonMuni.AFFGEOID; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        
                        if (attr != "AFFGEOID" && attr != "NAMELABEL"){
                        var val = parseFloat(csvMuni[attr]); //get csv attribute value
                        geojsonMuni[attr] = val; //assign attribute and value to geojson properties
                        } else {
                        var val = csvMuni[attr]; //get csv attribute value
                        geojsonMuni[attr] = val; //assign attribute and value to geojson properties
                        }
                    });
                };
            };
        };
    };

    //function to create color scale generator
    function makeColorScale(data){

        //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            };

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);

        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });

        numericClasses = clusters.map(function (d) {
            return d3.max(d);
        });

        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };

    function setEnumerationUnits(map, mspGeo, path, colorScale) {
        //add municipalities to map
        var municipalities = map.selectAll(".municipalities")
            .data(mspGeo)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "municipalities d" + d.properties.AFFGEOID;
            })
            .attr("d", path)
            .style("fill", function(d){            
                var value = d.properties[expressed];            
                if(value) {            	
                    return colorScale(d.properties[expressed]);            
                } else {            	
                    return "#ccc";            
                }  
            })
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight();
            })
            .on("mousemove", moveLabel);
    };

    //function to create coordinated bar chart
    function setChart(mspData, colorScale){ 
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("#chart")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
            var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 100]);

         //set bars for each municipality
         var bars = chart.selectAll(".bar")
            .data(mspData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar d" + d.AFFGEOID;
            })
            .attr("width", chartInnerWidth / mspData.length - 1)
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight();
            })
            .on("mousemove", moveLabel);
 
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")

            //create vertical axis generator
            var yAxis = d3.axisLeft()
                .scale(yScale);

            //place axis
            var axis = chart.append("g")
                .attr("class", "axis")
                .attr("transform", translate)
                .call(yAxis);

            //create frame for chart border
            var chartFrame = chart.append("rect")
                .attr("class", "chartFrame")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);

        //set bar positions, heights, and colors, 30 is so conditional doesn't break because Loretto is 100% white.
        updateChart(bars, mspData.length, colorScale, 30);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(mspData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, mspData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");
        
        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(dropdownArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, mspData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(mspData);

        var domainArray = [];
        for (var i=0; i<mspData.length; i++){
            var val = parseFloat(mspData[i][expressed]);
            domainArray.push(val);
        };

        max = Math.max(...domainArray)
        //Conditionals to adjust scale and axis for percent vs nonpercent attributes.
        if (max <= 100) {
            max = 100
            //change y-axis
            yScale = d3.scaleLinear()
                .range([463, 0])
                .domain([0, max]); 
            var yAxis = d3.axisLeft()
                .scale(yScale);
        };

        if (max > 1000) {
            //change y-axis
            yScale = d3.scaleLinear()
                .range([463, 0])
                .domain([0, max]);
            var yScale2 = d3.scaleLinear()
                .range([463, 0])
                .domain([0, max/1000]); 
            var yAxis = d3.axisLeft()
                .scale(yScale2);
        };

        //place axis
        var axis = d3.select(".axis")
        .call(yAxis);

        //recolor enumeration units
        var regions = d3.selectAll(".municipalities")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
        });
        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 5
            })
            .duration(500);

        //set bar positions, heights, and colors
        updateChart(bars, mspData.length, colorScale, max);
    };
 
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale, max){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
           });
           if (max <= 100) {
           var chartTitle = d3.select(".chartTitle")
           .text(expressed);
           } else {
            var chartTitle = d3.select(".chartTitle")
            .text(expressed);
           }
    };

    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        var selected = d3.selectAll(".d" + props.AFFGEOID)
            .style("stroke", "#F7FF0A")
            .style("stroke-width", "3.5")
            .style("stroke-opacity", "1");
        setLabel(props);
    };

   //function to reset the element style on mouseout
    function dehighlight(){
        //change stroke
        var municipalities = d3.selectAll(".municipalities")
            .style("stroke", "#303030")
            .style("stroke-width", "0.75")
            .style("stroke-opacity", "0.8");
        var municipalities = d3.selectAll(".bar")
            .style("stroke", "#303030")
            .style("stroke-width", "1")
            .style("stroke-opacity", "0.8")
            .style("opacity", ".65")
        //remove info label
        d3.select(".infolabel")
        .remove();
    };

    //function to create dynamic label
    function setLabel(props){
        //label content
        if (max <= 100) {
        var labelAttribute = "<h1>" + props[expressed] + "%" +
            "</h1><b>" + expressed + "</b>";
        } else {
            var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";
        }
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.AFFGEOID + "_label")
            .html(labelAttribute);

        var muniName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.NAMELABEL);
    };

    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };



})();