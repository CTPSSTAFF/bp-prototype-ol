// utils.js
//
// Note: This file REQUIRES that the d3.js library is loaded before it.

// TEMP - the following function is for use during development only
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

// 
var getJson = function(url) { return $.get(url, null, 'json'); };

// rowConverter function for parsing input CSV file of count records
var rowConverter = function(d) {
	return {
		id:				+d.id,
		bp_loc_id:		+d.bp_loc_id,
		count_id:		+d.count_id,
		municipality:	d.municipality,
		facility_name:	d.facility_name,
		street_1:		d.street_1,
		street_2:		d.street_2,
		street_3:		d.street_3,
		street_4:		d.street_4,
		street_5:		d.street_5,
		street_6:		d.street_6,
		description:	d.description,
		temperature:	+d.temperature,
		sky:			d.sky,
		facility_type:	d.facility_type,
		count_type:		d.count_type,
		from_st_name:	d.from_st_name,
		from_st_dir:	d.from_st_dir,
		to_st_name:		d.to_st_name,
		to_st_dir:		d.to_st_dir,
		count_date:		d.count_date,
		count_dow:		d.count_dow,
		cnt_0630:		+d.cnt_0630,
		cnt_0645:		+d.cnt_0645,
		cnt_0700:		+d.cnt_0700,
		cnt_0715:		+d.cnt_0715,
		cnt_0730:		+d.cnt_0730,
		cnt_0745:		+d.cnt_0745,
		cnt_0800:		+d.cnt_0800,
		cnt_0815:		+d.cnt_0815,
		cnt_0830:		+d.cnt_0830,
		cnt_0845:		+d.cnt_0845,
		cnt_0900:		+d.cnt_0900,
		cnt_0915:		+d.cnt_0915,
		cnt_0930:		+d.cnt_0930,
		cnt_0945:		+d.cnt_0945,
		cnt_1000:		+d.cnt_1000,
		cnt_1015:		+d.cnt_1015,
		cnt_1030:		+d.cnt_1030,
		cnt_1045:		+d.cnt_1045,
		cnt_1100:		+d.cnt_1100,
		cnt_1115:		+d.cnt_1115,
		cnt_1130:		+d.cnt_1130,
		cnt_1145:		+d.cnt_1145,
		cnt_1200:		+d.cnt_1200,
		cnt_1215:		+d.cnt_1215,
		cnt_1230:		+d.cnt_1230,
		cnt_1245:		+d.cnt_1245,
		cnt_1300:		+d.cnt_1300,
		cnt_1315:		+d.cnt_1315,
		cnt_1330:		+d.cnt_1330,
		cnt_1345:		+d.cnt_1345,
		cnt_1400:		+d.cnt_1400,
		cnt_1415:		+d.cnt_1415,
		cnt_1430:		+d.cnt_1430,
		cnt_1445:		+d.cnt_1445,
		cnt_1500:		+d.cnt_1500,
		cnt_1515:		+d.cnt_1515,
		cnt_1530:		+d.cnt_1530,
		cnt_1545:		+d.cnt_1545,
		cnt_1600:		+d.cnt_1600,
		cnt_1615:		+d.cnt_1615,
		cnt_1630:		+d.cnt_1630,
		cnt_1645:		+d.cnt_1645,
		cnt_1700:		+d.cnt_1700,
		cnt_1715:		+d.cnt_1715,
		cnt_1730:		+d.cnt_1730,
		cnt_1745:		+d.cnt_1745,
		cnt_1800:		+d.cnt_1800,
		cnt_1815:		+d.cnt_1815,
		cnt_1830:		+d.cnt_1830,
		cnt_1845:		+d.cnt_1845,
		cnt_1900:		+d.cnt_1900,
		cnt_1915:		+d.cnt_1915,
		cnt_1930:		+d.cnt_1930,
		cnt_1945:		+d.cnt_1945,
		cnt_2000:		+d.cnt_2000,
		cnt_2015:		+d.cnt_2015,
		cnt_2030:		+d.cnt_2030,
		cnt_2045:		+d.cnt_2045,
		cnt_total:		+d.cnt_total
	};
} // rowConverter

// Various utilities for summarizing count data

// summarize_set_of_counts_by_quarter_hour: 
// Given an input array of 'counts' records, calculate the summary across all
// records for each 15-minute time period and return it in an object,
// keyed by of the form 'cnt_<hhmm>'.
function summarize_set_of_counts_by_quarter_hour(counts) {
	retval = { 'cnt_0630' : 0, 'cnt_0645' : 0,
               'cnt_0700' : 0, 'cnt_0715' : 0, 'cnt_0730' : 0, 'cnt_0745' : 0,
               'cnt_0800' : 0, 'cnt_0815' : 0, 'cnt_0830' : 0, 'cnt_0845' : 0,
               'cnt_0900' : 0, 'cnt_0915' : 0, 'cnt_0930' : 0, 'cnt_0945' : 0,
               'cnt_1000' : 0, 'cnt_1015' : 0, 'cnt_1030' : 0, 'cnt_1045' : 0,
               'cnt_1100' : 0, 'cnt_1115' : 0, 'cnt_1130' : 0, 'cnt_1145' : 0,
               'cnt_1200' : 0, 'cnt_1215' : 0, 'cnt_1230' : 0, 'cnt_1245' : 0,
               'cnt_1300' : 0, 'cnt_1315' : 0, 'cnt_1330' : 0, 'cnt_1345' : 0,
               'cnt_1400' : 0, 'cnt_1415' : 0, 'cnt_1430' : 0, 'cnt_1445' : 0,
               'cnt_1500' : 0, 'cnt_1515' : 0, 'cnt_1530' : 0, 'cnt_1545' : 0,
               'cnt_1600' : 0, 'cnt_1615' : 0, 'cnt_1630' : 0, 'cnt_1645' : 0,
               'cnt_1700' : 0, 'cnt_1715' : 0, 'cnt_1730' : 0, 'cnt_1745' : 0,
               'cnt_1800' : 0, 'cnt_1815' : 0, 'cnt_1830' : 0, 'cnt_1845' : 0,
               'cnt_1900' : 0, 'cnt_1915' : 0, 'cnt_1930' : 0, 'cnt_1945' : 0,
               'cnt_2000' : 0, 'cnt_2015' : 0, 'cnt_2030' : 0, 'cnt_2045' : 0
	}

	retval.cnt_0630 =  _.sum(_.map(counts, 'cnt_0630'));
	retval.cnt_0645 =  _.sum(_.map(counts, 'cnt_0645'));
	
	retval.cnt_0700 =  _.sum(_.map(counts, 'cnt_0700'));
	retval.cnt_0715 =  _.sum(_.map(counts, 'cnt_0715'));	
	retval.cnt_0730 =  _.sum(_.map(counts, 'cnt_0730'));	
	retval.cnt_0745 =  _.sum(_.map(counts, 'cnt_0745'));	

	retval.cnt_0800 =  _.sum(_.map(counts, 'cnt_0800'));	
	retval.cnt_0815 =  _.sum(_.map(counts, 'cnt_0815'));	
	retval.cnt_0830 =  _.sum(_.map(counts, 'cnt_0830'));	
	retval.cnt_0845 =  _.sum(_.map(counts, 'cnt_0845'));
	
	retval.cnt_0900 =  _.sum(_.map(counts, 'cnt_0900'));	
	retval.cnt_0915 =  _.sum(_.map(counts, 'cnt_0915'));	
	retval.cnt_0930 =  _.sum(_.map(counts, 'cnt_0930'));	
	retval.cnt_0945 =  _.sum(_.map(counts, 'cnt_0945'));	

	retval.cnt_1000 =  _.sum(_.map(counts, 'cnt_1000'));	
	retval.cnt_1015 =  _.sum(_.map(counts, 'cnt_1015'));	
	retval.cnt_1030 =  _.sum(_.map(counts, 'cnt_1030'));	
	retval.cnt_1045 =  _.sum(_.map(counts, 'cnt_1045'));	

	retval.cnt_1100 =  _.sum(_.map(counts, 'cnt_1100'));	
	retval.cnt_1115 =  _.sum(_.map(counts, 'cnt_1115'));	
	retval.cnt_1130 =  _.sum(_.map(counts, 'cnt_1130'));	
	retval.cnt_1145 =  _.sum(_.map(counts, 'cnt_1145'));	

	retval.cnt_1200 =  _.sum(_.map(counts, 'cnt_1200'));	
	retval.cnt_1215 =  _.sum(_.map(counts, 'cnt_1215'));	
	retval.cnt_1230 =  _.sum(_.map(counts, 'cnt_1230'));	
	retval.cnt_1245 =  _.sum(_.map(counts, 'cnt_1245'));	

	retval.cnt_1300 =  _.sum(_.map(counts, 'cnt_1300'));	
	retval.cnt_1315 =  _.sum(_.map(counts, 'cnt_1315'));	
	retval.cnt_1330 =  _.sum(_.map(counts, 'cnt_1330'));	
	retval.cnt_1345 =  _.sum(_.map(counts, 'cnt_1345'));	

	retval.cnt_1400 =  _.sum(_.map(counts, 'cnt_1400'));	
	retval.cnt_1415 =  _.sum(_.map(counts, 'cnt_1415'));	
	retval.cnt_1430 =  _.sum(_.map(counts, 'cnt_1430'));	
	retval.cnt_1445 =  _.sum(_.map(counts, 'cnt_1445'));	

	retval.cnt_1500 =  _.sum(_.map(counts, 'cnt_1500'));	
	retval.cnt_1515 =  _.sum(_.map(counts, 'cnt_1515'));	
	retval.cnt_1530 =  _.sum(_.map(counts, 'cnt_1530'));	
	retval.cnt_1545 =  _.sum(_.map(counts, 'cnt_1545'));	

	retval.cnt_1600 =  _.sum(_.map(counts, 'cnt_1600'));	
	retval.cnt_1615 =  _.sum(_.map(counts, 'cnt_1615'));	
	retval.cnt_1630 =  _.sum(_.map(counts, 'cnt_1630'));	
	retval.cnt_1645 =  _.sum(_.map(counts, 'cnt_1645'));	

	retval.cnt_1700 =  _.sum(_.map(counts, 'cnt_1700'));	
	retval.cnt_1715 =  _.sum(_.map(counts, 'cnt_1715'));	
	retval.cnt_1730 =  _.sum(_.map(counts, 'cnt_1730'));	
	retval.cnt_1745 =  _.sum(_.map(counts, 'cnt_1745'));	

	retval.cnt_1800 =  _.sum(_.map(counts, 'cnt_1800'));	
	retval.cnt_1815 =  _.sum(_.map(counts, 'cnt_1815'));	
	retval.cnt_1830 =  _.sum(_.map(counts, 'cnt_1830'));	
	retval.cnt_1845 =  _.sum(_.map(counts, 'cnt_1845'));	

	retval.cnt_1900 =  _.sum(_.map(counts, 'cnt_1900'));	
	retval.cnt_1915 =  _.sum(_.map(counts, 'cnt_1915'));	
	retval.cnt_1930 =  _.sum(_.map(counts, 'cnt_1930'));	
	retval.cnt_1945 =  _.sum(_.map(counts, 'cnt_1945'));	
	
	retval.cnt_2000 =  _.sum(_.map(counts, 'cnt_2000'));	
	retval.cnt_2015 =  _.sum(_.map(counts, 'cnt_2015'));	
	retval.cnt_2030 =  _.sum(_.map(counts, 'cnt_2030'));	
	retval.cnt_2045 =  _.sum(_.map(counts, 'cnt_2045'));	

	return retval;
} // summarize_set_of_counts_by_quarter_hour