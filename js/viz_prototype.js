// Prototype generating bar chart with Plotly.js library

// bar_chart - generate SVG bar chart using Plotly.js library
// parameters:	div_id - ID of HTML <div> into which to insert SVG viz
// data:		object containing arrays of x- and y-values,
//              keyed by 'x' and 'y' respectively
//

function bar_chart(div_id, data) {
	var data4plotly = [ { x: data.years, y: data.counts, type: 'bar' } ];
	Plotly.newPlot(div_id, data);
}

