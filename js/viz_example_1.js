// Prototype generating a 'classified' bar chart of B-P count data with Plotly.js library

// Data source: count data
var sample_data_URL = 'data/csv/sample-data-for-viz-1.csv';

var count_data = [];


function generate_hourly_viz(target_div_id, count_records) {
	var _DEBUG_HOOK = 0;
	var o = summarize_set_of_counts_by_quarter_hour(count_records);
	_DEBUG_HOOK = 1;
	var x_domain = ['6:30', '6:45',
	                '7:00', '7:15', '7:30', '7:45',
					'8:00', '8:15', '8:30', '8:45',
					'9:00', '9:15', '9:30', '9:45',
					'10:00', '10:15', '10:30', '10:45',
					'11:00', '11:15', '11:30', '11:45',
					'12:00', '12:15', '12:30', '12:45',
					'1:00', '1:15', '1:30', '1:45',
					'2:00', '2:15', '2:30', '2:45',
					'3:00', '3:15', '3:30', '3:45',
					'4:00', '4:15', '4:30', '4:45',
					'5:00', '5:15', '5:30', '5:45',
					'6:00', '6:15', '6:30', '6:45',
					'7:00', '7:15', '7:30', '7:45',
					'8:00', '8:15', '8:30', '8:45'];
					
	var y_values = [o.cnt_0630, o.cnt_0645,
					o.cnt_0700, o.cnt_0715, o.cnt_0730, o.cnt_0745,
					o.cnt_0800, o.cnt_0815, o.cnt_0830, o.cnt_0845,
					o.cnt_0900, o.cnt_0915, o.cnt_0930, o.cnt_0945,
					o.cnt_1000, o.cnt_1015, o.cnt_1030, o.cnt_1045,
					o.cnt_1100, o.cnt_1115, o.cnt_1130, o.cnt_1145,
					o.cnt_1200, o.cnt_1215, o.cnt_1230, o.cnt_1245,
					o.cnt_1300, o.cnt_1315, o.cnt_1330, o.cnt_1345,
					o.cnt_1400, o.cnt_1415, o.cnt_1430, o.cnt_1445,
					o.cnt_1500, o.cnt_1515, o.cnt_1530, o.cnt_1545,
					o.cnt_1600, o.cnt_1615, o.cnt_1630, o.cnt_1645,
					o.cnt_1700, o.cnt_1715, o.cnt_1730, o.cnt_1745,
					o.cnt_1800, o.cnt_1815, o.cnt_1830, o.cnt_1845,
					o.cnt_1900, o.cnt_1915, o.cnt_1930, o.cnt_1945,
					o.cnt_2000, o.cnt_2015, o.cnt_2030, o.cnt_2045];
					
	var data = [ { x: x_domain, y: y_values, type: 'bar' } ];

	Plotly.newPlot(target_div_id, data);
					
} // generate_hourly_viz

function generate_classified_viz(target_div_id, count1, count2) {
	var x_domain = ['Bicycle', 'Jogger', 'Skater', 'Wheelchair', 'Other', 'Baby Carriage'];
	
	// WARNING: HACK HERE - we know that the 2 counts differ in Date
	var date1 = count1[0].count_date.substr(0,10);
	var date2 = count2[0].count_date.substr(0,10);
	
	var trace1 = {
	  x: x_domain,
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
	  x: x_domain,
	  y: [0, 0 , 0, 0, 0, 0],
	  name: date2,
	  type: 'bar'
	};
	
	// Populate the array of 'y' values for count2
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

	Plotly.newPlot(target_div_id, data, layout);

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
			generate_classified_viz('viz_1', count_1, count_2);
			generate_hourly_viz('viz_2', count_1);
		});

	_DEBUG_HOOK = 2;
} // generate_viz

