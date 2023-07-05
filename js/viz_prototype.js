// Prototype generating D3 bar chart

// bar_chart - generate SVG bar chart using D3.js library
// parameters:	div_id - ID of HTML <div> into which to insert SVG viz
// data:		array of { year, count } pairs
//
function bar_chart(div_id, data) {
	// Set graph margins and dimensions
	var margin = {top: 20, right: 20, bottom: 30, left: 40},
		width = 960 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;
		
	// Set ranges
	var x = d3.scaleBand()
			  .range([0, width])
			  .padding(0.1);
	var y = d3.scaleLinear()
			  .range([height, 0]);
			  
	var svg = d3.select('#' + div_id).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", 
			  "translate(" + margin.left + "," + margin.top + ")");

	// Scale the range of the data in the domains
	x.domain(data.map(function(d) { return d.year; }));
	y.domain([0, d3.max(data, function(d) { return d.count; })]);
	
	// Append rectangles for bar chart
	svg.selectAll(".bar")
		.data(data)
		.enter().append("rect")
		  .attr("class", "bar")
		  .attr("x", function(d) { return x(d.year); })
		  .attr("width", x.bandwidth())
		  .attr("y", function(d) { return y(d.year); })
		  .attr("height", function(d) { return height - y(d.year); });
		  
	// Add x axis
	svg.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x));

	// Add y axis
	svg.append("g")
		.call(d3.axisLeft(y));
} // bar_chart
