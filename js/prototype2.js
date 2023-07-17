// Prototype # of next-gen bike-ped counts web application
//
// Data: 'all count locations' map data from WMS service
//       'selected count locations' - OpenLayers vector layer
//		 'counts' data - CSV file
// Mapping platform: OpenLayers
// Basemap: Open Street Map
//
// Author: Ben Krepp, bkrepp@ctps.org

var bDebug = true; // Debug/diagnostics toggle

// Data source: count data
var countsURL = 'data/csv/bp_counts.csv';

// Data source: count locations 
var countlocsURL = 'data/json/ctps_bp_count_locations_pt.geo.json';

// Array of GeoJSON features for ALL count locations
var all_countlocs = [];

// Array of 'all counts' and 'selected counts'
var all_counts = [],
    selected_counts = [];

///////////////////////////////////////////////////////////////////////////////
// Stuff for OpenLayers mapping
//

// URLs for MassGIS basemap layer services
var mgis_serviceUrls = { 
    'topo_features'     :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Topographic_Features_for_Basemap/MapServer",
    'basemap_features'  :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Basemap_Detailed_Features/MapServer",
    'structures'        :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Structures/MapServer",
    'parcels'           :  "https://tiles.arcgis.com/tiles/hGdibHYSPO59RG1h/arcgis/rest/services/MassGIS_Level3_Parcels/MapServer"
};

// OpenLayers layers for MassGIS basemap layers used in our map
var mgis_basemap_layers = { 'topo_features'     : null,     // bottom layer
                            'structures'        : null,     
                            'basemap_features'  : null,     // on top of 'structures' so labels aren't obscured
                            'parcels'           : null      // unused; not populated
};

// OpenLayers layer for OpenStreetMap basesmap layer
var osm_basemap_layer = null; 


// Vector point layer for selected count locations
var selected_countlocs_style = new ol.style.Style({ image: new ol.style.Circle({ radius: 7.0,
                                                                                 fill: new ol.style.Fill({color: 'gold'}),
																				 stroke: new ol.style.Stroke({color: 'black', width: 1.0})
																				}) 
                                                                             });
var selected_countlocs_layer = new ol.layer.Vector({ title: 'Selected Count Locations',
								                     source	: new ol.source.Vector({ wrapX: false }),
								                     style: selected_countlocs_style
								                   });
												   

// Varioius things for WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
var szServerRoot = location.protocol + '//' + location.hostname;
var nameSpace;
if (location.hostname.includes('appsrvr3')) {   
    szServerRoot += ':8080/geoserver/';  
	nameSpace = 'ctps_pg';
} else {
	// Temp hack to allow working from home
    // szServerRoot += '/maploc/';
	szServerRoot = 'https://www.ctps.org/maploc/';
	nameSpace = 'postgis';
}
var szWMSserverRoot = szServerRoot + '/wms'; 
var szWFSserverRoot = szServerRoot + '/wfs'; 

// OpenLayers 'map' object:
var ol_map = null;
var initMapCenter = ol.proj.fromLonLat([-71.0589, 42.3601]);
var initMapZoom = 10;
var initMapView =  new ol.View({ center: initMapCenter, zoom:  initMapZoom });
var initMapExtent = []; // populated in initialize_map

// Elements that make up an OpenLayers popup 'overlay'
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

// Add a click handler to hide the popup
closer.onclick = function () { 
	overlay.setPosition(undefined);
	closer.blur();
	return false;
};

// Create an overlay to anchor the popup to the map
var overlay = new ol.Overlay({ element: container,
                               autoPan: { animation: { duration: 250 } }
                             });
// Sledgehammer to enable/disable creation of popup
var popup_on = true;

// End of stuff for OpenLayers mapping  
///////////////////////////////////////////////////////////////////////////////


// summarize_set_of_counts_by_year_range:
// Given a set of counts, 'c', and a 'start_year' and 'end_year',
// return an array of (end_year - start_year + 1) elements,
// the value of each element being the total count for the given year.
function summarize_set_of_counts_by_year_range(c, start_year, end_year) {
	var retval = [], year, year_counts, year_sum;
	
	for (year = start_year; year <= end_year; year++) {
		year_counts = _.filter(c, function(rec) { return rec.count_date.substr(0,4) == year; });
		year_sum = year_counts.length == 0 ? 0
		                                   : _.sum(_.map(year_counts, function(c) { return c.cnt_total; }));
		retval.push(year_sum);
	}
	return retval;
}


// For all counts (or count_summaries) in the input array 'c',
// compute the sum of all count values for the AM peak peroid,
// and return it.
// The AM peak period defined as: 0630 to 0900 hours.
function calc_am_peak(c) {
	retval = ((c.cnt_0630 != null) ? c.cnt_0630 : 0) + 
	         ((c.cnt_0645 != null) ? c.cnt_0645 : 0) +
	         ((c.cnt_0700 != null) ? c.cnt_0700 : 0) +
			 ((c.cnt_0715 != null) ? c.cnt_0715 : 0) +
			 ((c.cnt_0730 != null) ? c.cnt_0730 : 0) + 
			 ((c.cnt_0745 != null) ? c.cnt_0745 : 0) +
		     ((c.cnt_0800 != null) ? c.cnt_0800 : 0) +
			 ((c.cnt_0815 != null) ? c.cnt_0815 : 0) +
			 ((c.cnt_0830 != null) ? c.cnt_0830 : 0) + 
			 ((c.cnt_0845 != null) ? c.cnt_0845 : 0);
	return retval;
}

// For all counts (or count_summaries) in the input array 'c',
// compute the sum of all count values for the PM peak peroid,
// and return it.
// The PM peak period defined as: 1600 to 1900 hours.
function calc_pm_peak(c) {
	retval = ((c.cnt_1600 != null) ? c.cnt_1600 : 0) +
	         ((c.cnt_1615 != null) ? c.cnt_1615 : 0) + 
			 ((c.cnt_1630 != null) ? c.cnt_1630 : 0) + 
			 ((c.cnt_1645 != null) ? c.cnt_1645 : 0) +
	         ((c.cnt_1700 != null) ? c.cnt_1700 : 0) + 
			 ((c.cnt_1715 != null) ? c.cnt_1715 : 0) +
			 ((c.cnt_1730 != null) ? c.cnt_1730 : 0) + 
			 ((c.cnt_1745 != null) ? c.cnt_1745 : 0) +
			 ((c.cnt_1800 != null) ? c.cnt_1800 : 0) +
		     ((c.cnt_1815 != null) ? c.cnt_1815 : 0) +
			 ((c.cnt_1830 != null) ? c.cnt_1830 : 0) +
			 ((c.cnt_1845 != null) ? c.cnt_1845 : 0);
	return retval;
}

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

	retval.cnt_0630 =  _.sum(_.map(counts, function(c) { return c.cnt_0630; }));
	retval.cnt_0645 =  _.sum(_.map(counts, function(c) { return c.cnt_0645; }));
	
	retval.cnt_0700 =  _.sum(_.map(counts, function(c) { return c.cnt_0700; }));
	retval.cnt_0715 =  _.sum(_.map(counts, function(c) { return c.cnt_0715; }));	
	retval.cnt_0730 =  _.sum(_.map(counts, function(c) { return c.cnt_0730; }));	
	retval.cnt_0745 =  _.sum(_.map(counts, function(c) { return c.cnt_0745; }));	

	retval.cnt_0800 =  _.sum(_.map(counts, function(c) { return c.cnt_0800; }));	
	retval.cnt_0815 =  _.sum(_.map(counts, function(c) { return c.cnt_0815; }));	
	retval.cnt_0830 =  _.sum(_.map(counts, function(c) { return c.cnt_0830; }));	
	retval.cnt_0845 =  _.sum(_.map(counts, function(c) { return c.cnt_0845; }));
	
	retval.cnt_0900 =  _.sum(_.map(counts, function(c) { return c.cnt_0900; }));	
	retval.cnt_0915 =  _.sum(_.map(counts, function(c) { return c.cnt_0915; }));	
	retval.cnt_0930 =  _.sum(_.map(counts, function(c) { return c.cnt_0930; }));	
	retval.cnt_0945 =  _.sum(_.map(counts, function(c) { return c.cnt_0945; }));	

	retval.cnt_1000 =  _.sum(_.map(counts, function(c) { return c.cnt_1000; }));	
	retval.cnt_1015 =  _.sum(_.map(counts, function(c) { return c.cnt_1015; }));	
	retval.cnt_1030 =  _.sum(_.map(counts, function(c) { return c.cnt_1030; }));	
	retval.cnt_1045 =  _.sum(_.map(counts, function(c) { return c.cnt_1045; }));	

	retval.cnt_1100 =  _.sum(_.map(counts, function(c) { return c.cnt_1100; }));	
	retval.cnt_1115 =  _.sum(_.map(counts, function(c) { return c.cnt_1115; }));	
	retval.cnt_1130 =  _.sum(_.map(counts, function(c) { return c.cnt_1130; }));	
	retval.cnt_1145 =  _.sum(_.map(counts, function(c) { return c.cnt_1145; }));	

	retval.cnt_1200 =  _.sum(_.map(counts, function(c) { return c.cnt_1200; }));	
	retval.cnt_1215 =  _.sum(_.map(counts, function(c) { return c.cnt_1215; }));	
	retval.cnt_1230 =  _.sum(_.map(counts, function(c) { return c.cnt_1230; }));	
	retval.cnt_1245 =  _.sum(_.map(counts, function(c) { return c.cnt_1245; }));	

	retval.cnt_1300 =  _.sum(_.map(counts, function(c) { return c.cnt_1300; }));	
	retval.cnt_1315 =  _.sum(_.map(counts, function(c) { return c.cnt_1315; }));	
	retval.cnt_1330 =  _.sum(_.map(counts, function(c) { return c.cnt_1330; }));	
	retval.cnt_1345 =  _.sum(_.map(counts, function(c) { return c.cnt_1345; }));	

	retval.cnt_1400 =  _.sum(_.map(counts, function(c) { return c.cnt_1400; }));	
	retval.cnt_1415 =  _.sum(_.map(counts, function(c) { return c.cnt_1415; }));	
	retval.cnt_1430 =  _.sum(_.map(counts, function(c) { return c.cnt_1430; }));	
	retval.cnt_1445 =  _.sum(_.map(counts, function(c) { return c.cnt_1445; }));	

	retval.cnt_1500 =  _.sum(_.map(counts, function(c) { return c.cnt_1500; }));	
	retval.cnt_1515 =  _.sum(_.map(counts, function(c) { return c.cnt_1515; }));	
	retval.cnt_1530 =  _.sum(_.map(counts, function(c) { return c.cnt_1530; }));	
	retval.cnt_1545 =  _.sum(_.map(counts, function(c) { return c.cnt_1545; }));	

	retval.cnt_1600 =  _.sum(_.map(counts, function(c) { return c.cnt_1600; }));	
	retval.cnt_1615 =  _.sum(_.map(counts, function(c) { return c.cnt_1615; }));	
	retval.cnt_1630 =  _.sum(_.map(counts, function(c) { return c.cnt_1630; }));	
	retval.cnt_1645 =  _.sum(_.map(counts, function(c) { return c.cnt_1645; }));	

	retval.cnt_1700 =  _.sum(_.map(counts, function(c) { return c.cnt_1700; }));	
	retval.cnt_1715 =  _.sum(_.map(counts, function(c) { return c.cnt_1715; }));	
	retval.cnt_1730 =  _.sum(_.map(counts, function(c) { return c.cnt_1730; }));	
	retval.cnt_1745 =  _.sum(_.map(counts, function(c) { return c.cnt_1745; }));	

	retval.cnt_1800 =  _.sum(_.map(counts, function(c) { return c.cnt_1800; }));	
	retval.cnt_1815 =  _.sum(_.map(counts, function(c) { return c.cnt_1815; }));	
	retval.cnt_1830 =  _.sum(_.map(counts, function(c) { return c.cnt_1830; }));	
	retval.cnt_1845 =  _.sum(_.map(counts, function(c) { return c.cnt_1845; }));	

	retval.cnt_1900 =  _.sum(_.map(counts, function(c) { return c.cnt_1900; }));	
	retval.cnt_1915 =  _.sum(_.map(counts, function(c) { return c.cnt_1915; }));	
	retval.cnt_1930 =  _.sum(_.map(counts, function(c) { return c.cnt_1930; }));	
	retval.cnt_1945 =  _.sum(_.map(counts, function(c) { return c.cnt_1945; }));	
	
	retval.cnt_2000 =  _.sum(_.map(counts, function(c) { return c.cnt_2000; }));	
	retval.cnt_2015 =  _.sum(_.map(counts, function(c) { return c.cnt_2015; }));	
	retval.cnt_2030 =  _.sum(_.map(counts, function(c) { return c.cnt_2030; }));	
	retval.cnt_2045 =  _.sum(_.map(counts, function(c) { return c.cnt_2045; }));	

	return retval;
} // summarize_set_of_counts_by_quarter_hour


// TEMP - for use during development only!
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}


function make_popup_content(feature) {
	var props, loc_id, counts, 
	    oldest_count_date, newest_count_date, 
	    newest_counts = [], newest_count_summary = {}, 
	    am_peak = 0,  pm_peak = 0;
		
	props = feature.getProperties().properties;
	loc_id = props.loc_id;
	counts = _.filter(all_counts, function(c) { return c.bp_loc_id == loc_id; });
	
	// Defensive programming:
	// Believe it or not, there are some count locations with no counts!
	if (counts.length == 0) {
		content = 'No counts with count loc_id == ' + loc_id + ' found.';
		return content;
	}
	
	counts = _.sortBy(counts, [function(o) { return o.count_date.substr(0,10); }]);
	oldest_count_date = counts[0].count_date.substr(0,10);
	newest_count_date = counts[counts.length-1].count_date.substr(0,10);
	newest_counts = _.filter(counts, function(c) { return c.count_date.substr(0,10) == newest_count_date; });
	
	// Debug 
	// console.log(loc_id + ' #newest_counts = ' + newest_counts.length);
	
	newest_count_summary = summarize_set_of_counts_by_quarter_hour(newest_counts);
	// AM and PM peak for newest count
	am_peak = calc_am_peak(newest_count_summary);
	pm_peak = calc_pm_peak(newest_count_summary);
		  
	content = 'Location ID ' + loc_id + '</br>';
    content += props.description + '</br>';
	content += 'Most recent count : ' + newest_count_date + '</br>';
	content += 'Total volume AM peak : ' + am_peak + '</br>';
	content += 'Total volume PM peak : ' + pm_peak + '</br>';
	content += 'Oldest count : ' + oldest_count_date + '</br>';		
	
	return content;
} // make_popup_content


// update_map:
// 		1. clear out vector layer for 'selected' countlocs
// 		2. add selected count locs to vector layer, and render it
// 		3. set extent of map based on bounding box of the selected countlocs
// parameter 'countlocs' is the array of GeoJSON features for the selected countlocs
function update_map(selected_countlocs) {
	var vSource, i, cur_countloc, feature, geom, props, extent;
	
	vSource = selected_countlocs_layer.getSource();
	vSource.clear();
	
	for (i = 0; i < selected_countlocs.length; i++) {
		geom = {}, props = {};
		cur_countloc = selected_countlocs[i];
		geom =  new ol.geom.Point(ol.proj.fromLonLat([cur_countloc.geometry.coordinates[0], cur_countloc.geometry.coordinates[1]]));
		props = JSON.parse(JSON.stringify(cur_countloc.properties));
		feature = new ol.Feature({geometry: geom, properties: props});
		vSource.addFeature(feature);
	}
	selected_countlocs_layer.setSource(vSource);
	
	// Get extent of selected countlocs, and pan/zoom map to it
	extent = vSource.getExtent();
	ol_map.getView().fit(extent, { size: ol_map.getSize(), duration: 1500 });
} // update_map

// Update the jsGrid table with info about each selected count location
function update_table(countlocs) {
	var _DEBUG_HOOK = 0;
	var data_array = [];
	// Populate 'data' array with info about the selected count locations
	countlocs.forEach(function(cl) {
		// NOTE: cl.properties.loc_id has the B-P count location ID
		var a_tag = '<a href=countlocDetail.html?loc_id=' + cl.properties.loc_id;
		a_tag += ' target="_blank">' + cl.properties.description +'</a>';
		_DEBUG_HOOK =1;
		data_array.push({'countloc' : a_tag, 'town' : cl.properties.town});
	});
		
	$("#output_table").jsGrid({
			height: "30%",
			width: "80%", 
			sorting: true,
			paging: true,
			data: data_array,
			fields: [
				{ name: "countloc", title: "Count Location", type: "text", width: 300 },
				{ name: "town", title: "Town", type: "text", width: 100 }
			]
	});
	$('#output_table').show();
	var _DEBUG_HOOK = 2;
} // update_table

// Return array of bp_loc_ids (B-P count locations) for a given set of counts
function counts_to_countloc_ids(counts) {
	var bp_loc_ids = _.map(counts, function(c) { return c.bp_loc_id; });
	bp_loc_ids = _.uniq(bp_loc_ids);
	return bp_loc_ids;
}

///////////////////////////////////////////////////////////////////////////////
// Event handlers for:
// 	1. 'change' event to pick-lists
//  2. 'click' event on 'reset' button
//  3. 'click event on OpenLayers map
//

// pick_list_handler: On-change event handler for pick-lists of towns and years.
//
// Aside from purely UI-related tasks, the primary job of this function is 
// to compute the current 'selection set' and 'un-selection set) of count locations.
// Once these sets have been computed, this function calls 'update_map' to update
// the leaflfet map accordingly.
//
function pick_list_handler(e) {
	var pick_list,   // ID of pick list that triggered event
	    town, year,
		towns = [], towns_uniq = [], years = [], years_uniq = [];
	
	pick_list = e.target.id; 
	town = $("#select_town").val();
	year = $("#select_year").val();
	
	// 1. apply whatever filters have been selected
	// 2. re-calcuate selected_counts
	// 3. re-populate 'other' select list if needed
	// 4. calculate selected_countlocs and unselected_countlocs
	// 5. call 'update_map' to update the map, accordingly
	
	if (town !== "Any") {
		filter_func = function(count) { return count.municipality == town; };
	} else {
		filter_func = function(count) { return true; };
	}	
	selected_counts = _.filter(all_counts, filter_func);
	
	if (year !== "Any") {
		filter_func = function(count) { return count.count_date.substr(0,4) == year; };
	} else {
		filter_func = function(count) { return true; };
	}
    selected_counts = _.filter(selected_counts, filter_func);	
	
	
	if (pick_list == "select_town") {
		years = _.map(selected_counts, function(count) { return count.count_date.substr(0,4); });
		years_uniq = _.uniq(years);
		years_uniq = years_uniq.sort().reverse();
		// Disable on-change event handler for 'select_year'
		$('#select_year').off()
		// Clear-out, and populate pick list
		$('#select_year').empty();
		// $('#select_year').append(new Option('Any', 'Any'));
		years_uniq.forEach(function(year) {
			$('#select_year').append(new Option(year, year));
		});
		// Re-enable on-change event handler for 'select_year'
		$('#select_year').on('change', pick_list_handler);
	} else if (pick_list == "select_year") {
		towns =  _.map(selected_counts, function(count) { return count.municipality; });
		towns_uniq = _.uniq(towns);
		towns_uniq = towns_uniq.sort();
		// Disable on-change event handler for 'select_town'
		$('#select_town').off()
		// Clear-out, and populate pick list
		$('#select_town').empty();	
		// $('#select_town').append(new Option('Any', 'Any'));
		towns_uniq.forEach(function(town) {
			$('#select_town').append(new Option(town, town));
		});
		// Re-enable on-change event handler for 'select_town'
		$('#select_town').on('change', pick_list_handler);
	} else {
		// ASSERT
		console.log('Invalid pick-list ID: ' + pick_list);
		return;
	}
	
	// HERE: We have an array of the selected counts
	//       We need to turn this into a set of selected count locations
	
	// Compute the 'selection set' of count locations.
	// God bless the people who wrote the ES6 language definition - performing these computations is easy now!
	var selected_countloc_ids = counts_to_countloc_ids(selected_counts);
	var countloc_id_set = new Set(selected_countloc_ids);
	// 
	var selected_countlocs = all_countlocs.filter(rec => countloc_id_set.has(rec.properties.loc_id));
	// var unselected_countlocs = all_countlocs.filter(rec => !countloc_id_set.has(rec.properties.loc_id));
	
	update_map(selected_countlocs);
	update_table(selected_countlocs);
} // pick_list_handler

// reset_handler: on-click event handler for 'reset' button
// 
function reset_handler(e) {
	// Re-initialize 'selected' countlocs layer
	var vSource;
	vSource = selected_countlocs_layer.getSource();
	vSource.clear();
	selected_counts = [];
	// Clear overlay popup - just in case
	overlay.setPosition(undefined);
	closer.blur();
	// Set map extent 
	ol_map.getView().fit(initMapExtent, { size: ol_map.getSize(), duration: 1000});
	initialize_pick_lists(all_counts);
	$('#output_table').hide();
} // on-click handler for 'reset'


// Populate the pick-lists with their initial values, based on all_counts
// (*not* all count locations, believe it or not)
// Note on passed-in parm:
// 		counts parameter == all_counts
function initialize_pick_lists(counts) {
	// Towns pick-list
	var munis, munis_uniq, years, years_uniq;
	
	munis = _.map(counts, function(c) { return c.municipality; });
	munis_uniq = _.uniq(munis);
	munnis_uniq = munis_uniq.sort(); // Alphabetize list of towns!
	
	$('#select_town').empty();
	$('#select_town').append(new Option("Any", "Any"));
	munis_uniq.forEach(function(muni) {
		$('#select_town').append(new Option(muni, muni));
	});
	
	// Year pick-list
	years = _.map(counts, function(c) { return c.count_date.substr(0,4); });
	years_uniq = _.uniq(years);
	// Reverse list of years, latest year appears at top-of-list
	years_uniq = years_uniq.sort().reverse();
	
	$('#select_year').empty();
	$('#select_year').append(new Option("Any", "Any"));
	years_uniq.forEach(function(year) {
		$('#select_year').append(new Option(year, year));
	});
} // initialize_pick_lists


// onclick_handler: on-click event handler for OpenLayers map
//
// If there is a feature at the clicked location, calls
// make_popup_content to generate content for an OpenLayers
// popup, and then sets the popup's position on the map.
var onclick_handler = function(evt) {
	var _DEBUG_HOOK = 0;
	var pixel = evt.pixel,
	    features = [], feature, content, coordinate;
		
	if (ol_map.hasFeatureAtPixel(pixel) === true) {
		ol_map.forEachFeatureAtPixel(pixel, function(feature, layer) {
			features.push(feature);
		});
		// At least for now, we'll just work with the 1st feature
		feature = features[0];
		content = document.getElementById('popup-content');
		coordinate = evt.coordinate;
		content.innerHTML = make_popup_content(feature);
		overlay.setPosition(coordinate);
	} else {
		overlay.setPosition(undefined);
		closer.blur();
	}
	return; 
} // onclick_handler

function initialize_map() {
	// Create OpenStreetMap base layer
	const osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM() });
	osm_basemap_layer.setVisible(true);
	
	// Create WMS layer[s]
	var bp_countlocs_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				params	: { 'LAYERS': 'postgis:ctps_bp_count_locations_pt', 
																							'STYLES': 'a_point_blue',
																							'TRANSPARENT': 'true'
																				  }
																	}),
										title: 'Bike-Ped Count Locations',	
										visible: true
									});	
	
	ol_map = new ol.Map({ layers: [	osm_basemap_layer,
									// mgis_basemap_layers['topo_features'],
									// mgis_basemap_layers['structures'],
									// mgis_basemap_layers['basemap_features'],
									bp_countlocs_wms,
									selected_countlocs_layer	// this is an OL Vector layer
								],
					   target: 'map',
					   view:   initMapView,
					   overlays: [overlay]
					});
					
	// Proof-of-concept code to display 'popup' overlay:
	if (popup_on == true) {
		ol_map.on('click', function(evt) { onclick_handler(evt); });
	}
	
	// Cache initial map extent for use in 'reset_handler'
	var v = ol_map.getView();
	initMapExtent = v.calculateExtent();
} // initialize_map


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

var getJson = function(url) { return $.get(url, null, 'json'); };

function initialize() {
	var _DEBUG_HOOK = 0;
	// Load count data from CSV file
	d3.csv(countsURL, rowConverter).then(
		function(data){
			all_counts = data;
			_DEBUG_HOOK = 1;
			// Load GeoJSON for count locations
			// Use local file for now, WFS request in production
			// For WFS request - remember to reproject to EPSG:4326!
			$.when(getJson(countlocsURL).done(function(bp_countlocs) {
				var ok = arguments[1] === 'success'; 
				if (ok === false) {
					alert("Failed to load GeoJSON for count locations successfully.");
					return; 
				} 
				all_countlocs = bp_countlocs.features;
				_DEBUG_HOOK = 2
				// Bind on-change event handler(s) for pick-list controls
				$('#select_town,#select_year').on('change', pick_list_handler);
				// Bind on-change event handler for 'reset' button 
				$('#reset').on('click', reset_handler);
				initialize_map();
				initialize_pick_lists(all_counts);
			}));
		});
	_DEBUG_HOOK = 3;
} // initialize
