//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
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
        var mspData = data[0],
            mspGeo = data[1];
            rivers = data[2]
            lakes = data[3]
            interstates = data[4]
            roads = data[5]

        //translate TopoJSON
        var mspGeo = topojson.feature(mspGeo, mspGeo.objects.msp_geo).features,
            rivers = topojson.feature(rivers, rivers.objects.rivers);
            lakes = topojson.feature(lakes, lakes.objects.lakes);
            interstates = topojson.feature(interstates, interstates.objects.interstates);
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

        //add municipalities to map
        var municipalities = map.selectAll(".municipalities")
            .data(mspGeo)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "municipalities " + d.properties.AFFGEOID;
            })
            .attr("d", path);
   }
};