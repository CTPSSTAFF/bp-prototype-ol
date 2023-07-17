// Prototype generating a 'classified' bar chart of B-P count data with Plotly.js library

// Data source: count data
var sample_data_URL = 'data/csv/sample-data-for-viz-1.csv';

var count_data = [];


// Wrapper around Plotly API - TO BE CHANGED
function bar_chart(div_id, data) {
	var data4plotly = [ { x: data.years, y: data.counts, type: 'bar' } ];
	Plotly.newPlot(div_id, data);
}

function generate_classified_viz(count) {
	var trace1 = {
	  x: ['giraffes', 'orangutans', 'monkeys'],
	  y: [20, 14, 23],
	  name: 'SF Zoo',
	  type: 'bar'
	};

	var trace2 = {
	  x: ['giraffes', 'orangutans', 'monkeys'],
	  y: [12, 18, 29],
	  name: 'LA Zoo',
	  type: 'bar'
	};

	var data = [trace1, trace2];

	var layout = {barmode: 'stack'};

	Plotly.newPlot('viz', data, layout);

} // generate_classified_viz

function generate_viz() {
	var _DEBUG_HOOK = 0;
	d3.csv(sample_data_URL, rowConverter).then(
		function(data){
			count_data = data;
			var uniq_counts = _.uniqBy(count_data, 'count_id');
			var uniq_count_ids = _.map(uniq_counts, 'count_id')
			_DEBUG_HOOK = 1;
			console.log('Number of unique counts = ' + uniq_count_ids.length);
			// Just process the 1st one to establish proof-of-concept, for now
			var count_id = uniq_count_ids[0];
			var count_to_process = _.filter(count_data, function(rec) { return rec.count_id == count_id; } );
			generate_classified_viz(count_to_process);
		});

	_DEBUG_HOOK = 2;
} // generate_viz

