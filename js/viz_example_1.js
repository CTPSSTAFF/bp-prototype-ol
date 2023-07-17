// Prototype generating a 'classified' bar chart of B-P count data with Plotly.js library

// Data source: count data
var sample_data_URL = 'data/csv/sample-data-for-viz-1.csv';

var count_data = [];


// Wrapper around Plotly API - TO BE CHANGED
function bar_chart(div_id, data) {
	var data4plotly = [ { x: data.years, y: data.counts, type: 'bar' } ];
	Plotly.newPlot(div_id, data);
}

function generate_classified_viz(count1, count2) {
	
	// WARNING: HACK HERE - we know that the 2 counts differ in Date
	var date1 = count1[0].count_date.substr(0,10);
	var date2 = count2[0].count_date.substr(0,10);
	
	var trace1 = {
	  x: ['Bicycle', 'Jogger', 'Skater', 'Wheelchair', 'Other', 'Baby Carriage'],
	  y: [0, 0 , 0, 0, 0, 0],
	  name: date1,
	  type: 'bar'
	};
	
	// Populate the array of 'y' values for count1
	var temp;
	temp = _.find(count1, function(rec) { return rec.count_type == 'B' });
	trace1.y[0] = temp.cnt_total;
	
	temp = _.find(count1, function(rec) { return rec.count_type == 'J' });
	trace1.y[1] = temp.cnt_total;
	
	temp = _.find(count1, function(rec) { return rec.count_type == 'S' });
	trace1.y[2] = temp.cnt_total;
	
	temp = _.find(count1, function(rec) { return rec.count_type == 'W' });
	trace1.y[3] = temp.cnt_total;
	
	temp = _.find(count1, function(rec) { return rec.count_type == 'O' });
	trace1.y[4] = temp.cnt_total;
	
	// *** WARNING - HACK HERE - WE KNOW THERE IS NO 'C' RECORD AS PART OF THE 1ST COUNT
	temp = _.find(count1, function(rec) { return rec.count_type == 'C' });
	trace1.y[5] = 0
	
	
	var trace2 = {
	  x: ['Jogger', 'Skater', 'Wheelchair', 'Other', 'Baby Carriage'],
	  y: [0, 0 , 0, 0, 0, 0],
	  name: date2,
	  type: 'bar'
	};
	
	temp = _.find(count2, function(rec) { return rec.count_type == 'B' });
	trace2.y[0] = temp.cnt_total;
	
	temp = _.find(count2, function(rec) { return rec.count_type == 'J' });
	trace2.y[1] = temp.cnt_total;
	
	temp = _.find(count2, function(rec) { return rec.count_type == 'S' });
	trace2.y[2] = temp.cnt_total;
	
	temp = _.find(count2, function(rec) { return rec.count_type == 'W' });
	trace2.y[3] = temp.cnt_total;
	
	// *** WARNING - HACK HERE - WE KNOW THERE IS NO 'O' RECORD AS PART OF THE 2ND COUNT
	temp = _.find(count2, function(rec) { return rec.count_type ==' O' });
	trace2.y[4] = 0;
	
	temp = _.find(count2, function(rec) { return rec.count_type == 'C' });
	trace2.y[5] = temp.cnt_total;


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
			console.log('Number of unique counts = ' + uniq_count_ids.length); // should be 2
			
			var count_1 = _.filter(count_data, function(rec) { return rec.count_id == uniq_count_ids[0]; } );
			var count_2 = _.filter(count_data, function(rec) { return rec.count_id == uniq_count_ids[1]; } );
			generate_classified_viz(count_1, count_2);
		});

	_DEBUG_HOOK = 2;
} // generate_viz

