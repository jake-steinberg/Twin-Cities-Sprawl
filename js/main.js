(function(){
//pseudo-global variables
//variables for data join
    var attrArray = ["AFFGEOID", "NAMELABEL", "pctnew", "newacres", "pct_no_cars", "pct_2_plus_cars", "totalpop", "pctwhite"];
    var expressed = attrArray[3]; //initial attribute

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 760;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create projection centered on MSP.
        var projection = d3.geoAlbers()
            .center([.12, 44.98])
            .rotate([93.26, 0, 0])
            .parallels([44.96, 44.96])
            .scale(48000)
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
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
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
                return "municipalities " + d.properties.AFFGEOID;
            })
            .attr("d", path)
            .style("fill", function(d){            
                var value = d.properties[expressed];            
                if(value) {            	
                    return colorScale(d.properties[expressed]);            
                } else {            	
                    return "#ccc";            
                }    
            });
    };

    //function to create coordinated bar chart
    function setChart(mspData, colorScale){ 
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
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

         //set bars for each province
         var bars = chart.selectAll(".bar")
            .data(mspData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.pct_new;
            })
            .attr("width", chartInnerWidth / mspData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / mspData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });
 
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");
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
    };


})();