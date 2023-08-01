// Prototype # of next-gen bike-ped counts web application
//
// Data: 'all count locations' map image tiles 'data' from WMS service
//       'selected count locations' - OpenLayers vector layer
//		 'counts' data - CSV file
// Mapping platform: OpenLayers
// Basemaps: MassGIS, Open Street Map, Stamen
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

// OpenLayers layer for Stamen basemap layer
var stamen_basemap_layer = null;


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

// Function to toggle basemap
function toggle_basemap(basemap_name) {
    switch(basemap_name) {
        case 'massgis_basemap':
			stamen_basemap_layer.setVisible(false);
            osm_basemap_layer.setVisible(false); 
            mgis_basemap_layers['topo_features'].setVisible(true);
            mgis_basemap_layers['structures'].setVisible(true);
            mgis_basemap_layers['basemap_features'].setVisible(true);
            break; 
        case 'osm_basemap':
            mgis_basemap_layers['topo_features'].setVisible(false);
            mgis_basemap_layers['structures'].setVisible(false);
            mgis_basemap_layers['basemap_features'].setVisible(false);
			stamen_basemap_layer.setVisible(false);
            osm_basemap_layer.setVisible(true);   
            break;
		case 'stamen_basemap':
            mgis_basemap_layers['topo_features'].setVisible(false);
            mgis_basemap_layers['structures'].setVisible(false);
            mgis_basemap_layers['basemap_features'].setVisible(false);
			osm_basemap_layer.setVisible(false);
			stamen_basemap_layer.setVisible(true);
			break;
        default:
            break;
    }
	$('#' + basemap_name).prop("checked", true);
} 
// On-change event handler for radio buttons to chose basemap
function toggle_basemap_handler (e) {
	var basemap_name = $(this).val();
	toggle_basemap(basemap_name);
}

// End of stuff for OpenLayers mapping  
///////////////////////////////////////////////////////////////////////////////


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
	var vSource, i, cur_countloc, feature, geom, props, extent, center, zoom, view;
	
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
	
	// Pan/zoom map to extent of selected count locations
	// Handle special case of 1 countloc
	if (selected_countlocs.length == 1) {
		center = ol.proj.fromLonLat([selected_countlocs[0].geometry.coordinates[0], selected_countlocs[0].geometry.coordinates[1]]);
		zoom = 12; // Arbitrary choice, for now
		view = new ol.View({center: center, zoom: zoom});
		ol_map.setView(view);
	} else {
	    // Get extent of selected countlocs, and pan/zoom map to it
	    extent = vSource.getExtent();
	    ol_map.getView().fit(extent, { size: ol_map.getSize(), duration: 1500 });
	}
} // update_map

// Update the jsGrid table with info about each selected count location
// NOTE: It would appear that jsGrid has a bug/feature such that it does
//       not render the first (i.e., index == 0) element in the data_array
//       passed to it. This was stumbled upon empirically.
//
function update_table(countlocs) {
	var _DEBUG_HOOK = 0;
	var i, cl, data_array = [];
	// Insert dummy 0th element into data_array, per comment above
	data_array.push({'countloc' : '', 'town' : '' });
	// Populate 'data' array with info about the selected count locations
	for (i = 0; i < countlocs.length; i++) {
		cl = countlocs[i];
		// NOTE: cl.properties.loc_id has the B-P count location ID
		var a_tag = '<a href=countlocDetail.html?loc_id=' + cl.properties.loc_id;
		a_tag += ' target="_blank">' + cl.properties.description +'</a>';
		_DEBUG_HOOK =1;
		data_array.push({'countloc' : a_tag, 'town' : cl.properties.town});
	}
		
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
// counts_to_selected_countlocs:
//
// Abstractly, given an array of count records, 'counts' return an array
// of the count locations for these counts. 
// In practice, 'counts' is an array of _currently selected_ set of counts records. 
// This function computes the array of count locations for these counts, i.e.,
// the 'selected countlocs'. It also computes the array of 'un-selected' count locations.
// Both of these are properties of an object, which is the return value of this function:
//
// var retval = { 'selected' : [], 'unselected' : [] };
//
function counts_to_selected_countlocs(counts) {
	var selected_countloc_ids, countloc_id_set, 
	    selected_countlocs, unselected_countlocs;
	var retval = { 'selected' : [], 'unselected' : [] };
	
	// HERE: We have an array of the selected counts
	//       We need to turn this into a set of selected count _locations_
	// Compute the 'selection set' of count locations.
	// God bless the people who wrote the ES6 language definition - performing these computations is easy now!
	selected_countloc_ids = counts_to_countloc_ids(counts);
	countloc_id_set = new Set(selected_countloc_ids);
	selected_countlocs = all_countlocs.filter(rec => countloc_id_set.has(rec.properties.loc_id));
	unselected_countlocs = all_countlocs.filter(rec => !countloc_id_set.has(rec.properties.loc_id));
	retval.selected = selected_countlocs;
	retval.unselected = unselected_countlocs;
	return retval;
}

// populate_town_control_from_list:
//
// Populate the select_town <select> element with the array of town aTowns
// If prepend_all_applic is TRUE, prepend the list of towns with 'All Applicable'
// If prepend_any is TRUE, prepend this list of towns with 'Any'
//
function populate_town_control_from_list(aTowns, prepend_all_applic, prepend_any) {
	// Disable on-change event handler for 'select_town'
	$('#select_town').off()
	// Clear-out, and populate pick list
	$('#select_town').empty();
	if (prepend_all_applic == true) {
		$('#select_town').append(new Option('All Applicable', 'All Applicable'));
	} 
	if (prepend_any == true) {
		$('#select_town').append(new Option('Any', 'Any'));	
	}
	aTowns.forEach(function(town) {
		$('#select_town').append(new Option(town, town));
	});
	// Re-enable on-change event handler for 'select_year'
	$('#select_town').on('change', year_pick_list_handler);	
}

// populate_year_control_from_list:
//
// Populate the select_year <select> element with the array of years, aYears
// If prepend_all_applic is TRUE, prepend the list of years with 'All Applicable'
// If prepend_any is TRUE, prepend this list of years with 'Any'
//
function populate_year_control_from_list(aYears, prepend_all_applic, prepend_any) {
	// Disable on-change event handler for 'select_year'
	$('#select_year').off()
	// Clear-out, and populate pick list
	$('#select_year').empty();
	if (prepend_all_applic == true) {
		$('#select_year').append(new Option('All Applicable', 'All Applicable'));
	} 
	if (prepend_any == true) {
		$('#select_year').append(new Option('Any', 'Any'));	
	}
	aYears.forEach(function(year) {
		$('#select_year').append(new Option(year, year));
	});
	// Re-enable on-change event handler for 'select_year'
	$('#select_year').on('change', year_pick_list_handler);	
}

// get unique_years_from_counts:
// 
// Given the input array of count records, 'counts',
// return an array of unique years (strings) sorted in _descending_ order
function get_uniqe_years_from_counts(counts) {
	var years, years_uniq;
	years = _.map(counts, function(count) { return count.count_date.substr(0,4); });
	years_uniq = _.uniq(years);
	years_uniq = years_uniq.sort().reverse();
	return years_uniq;
}

// get unique_towns_from_counts:
// 
// Given the input array of count records, 'counts',
// return an array of unique towns sorted in alphabetical order
function get_unique_towns_from_counts(counts) {
	var towns, towns_uniq;
	towns =  _.map(counts, function(count) { return count.municipality; });
	towns_uniq = _.uniq(towns);
	towns_uniq = towns_uniq.sort();	
	return towns_uniq;
} 


///////////////////////////////////////////////////////////////////////////////
// Event handlers for:
// 	1. 'change' event on 'town' pick-list
//  2. 'change' event on 'year' pick-list
//  3. 'click' event on 'clear filters' button
//  4. 'click event on OpenLayers map
//
// town_pick_list_handler: On-change event handler for pick-lists of towns
//
// The job of this function is to:
//     1. respond appropriately to 'change' events on the 'select_town' <select> element,
//        by updating the 'select_year' <select> element (UI operations)
//     2. compute the current 'selection set' (and possibly the current'un-selection set) 
//        of count locations
//     3. call update_map to update the OpenLayers map, and
//        call update_table to update the jsGrid table
//
// Pseudo-code of the algorithm for (1):
// 
// IF (town == 'Any') THEN
//     clear all filters
// ELSE IF (town == 'All Applicable') THEN
//     // this choice will be present only if there is a selected
//     //    value in the 'year' <select> control
//     filter data, but using the selection in the _other_ <select> control,
//        i.e., the 'year' <select> control
// ELSE 
//     // A specific town has been selected
//     filter ddata based on selected town
//     form list of these towns, alphabetized
//     append 'All Applicable' to the head of this list
//     update the 'town' <select> control with these values
// ENDIF
// 
// *** TO BE INVESTIGATED ***
// This function and year_pick_list_handler process a 'town' or 'year' selection
// in symmetrical ways, which suggests they could be combined into a single function.
//
function town_pick_list_handler(e) {
	var	town, year, years_uniq,
		filter_func, 
		selected_counts, otemp, selected_countlocs;

	town = $("#select_town").val();
	year = $("#select_year").val();
	
	if (town == 'Any') {
		// Note that we do NOT continue with the common logic after 
		// the if-elseif-else block: We are effectively resetting 
		// the application and need to ensure that _no_ countlocs
		// are selected.
		clear_filters_handler(null);
		return;
	} else if (town == 'All Applicable') {
		// This choice will be present only if there is a selected
		// value in the 'year' <select> control.
		// Filter data, but using the selection in the _other_ <select> control,
		// i.e., the 'year' <select> control.
		filter_func = function(count) { return count.count_date.substr(0,4) == year; };
		selected_counts = _.filter(selected_counts, filter_func);
		// years_uniq = get_uniqe_years_from_counts(selected_counts); - only one real year in the list
		initialize_year_pick_list(all_counts);
		// Set the 'selected' value in the years <select> list to the 
		// year that was selected, i.e., the contents of  the 'year' variable.
		$("#select_year option[value='" + year + "']").attr('selected', 'selected');
	} else {
		// A specific town has been selected 
		filter_func = function(count) { return count.municipality == town; };
		selected_counts = _.filter(all_counts, filter_func);
		// If a specific year is selected, further filter selected_counts on its value
		if (year != 'Any' && year != 'All Applicable') {
			filter_func = function(count) { return count.count_date.substr(0,4) == year; };
			selected_counts = _.filter(selected_counts, filter_func);
		} else {
			// Populate 'year' <select> control
		    // selected_counts = _.filter(selected_counts, filter_func);
		    years_uniq = get_uniqe_years_from_counts(selected_counts);
		    populate_year_control_from_list(years_uniq, true, false);			
		}
	}
		
	otemp = counts_to_selected_countlocs(selected_counts);
	update_map(otemp.selected);
	update_table(otemp.selected);	 
} // town_pick_list_handler


// year_pick_list_handler: On-change event handler for pick-lists of years
//
// The job of this function is to:
//     1. respond appropriately to 'change' events on the 'select_year' <select> element,
//        by updating the 'select_town' <select> element (UI operations)
//     2. compute the current 'selection set' (and possibly the current'un-selection set) 
//        of count locations
//     3. call update_map to update the OpenLayers map, and
//        call update_table to update the jsGrid table
//
// Pseudo-code of the algorithm for (1):
// 
// IF (year == 'Any') THEN
//     clear all filters
// ELSE IF (year == 'All Applicable') THEN
//     // this choice will be present only if there is a selected
//     //    value in the 'town' <select> control
//     filter data, but using the selection in the _other_ <select> control,
//        i.e., the 'town' <select> control
// ELSE 
//     // A specific year has been selected
//     filter data based on selected year
//     form list of these years, in descending order
//     append 'All Applicable' to the head of this list
//     update the 'year' <select> control with these values
// ENDIF
// 
// *** TO BE INVESTIGATED ***
// This function and town_pick_list_handler process a 'town' or 'year' selection
// in symmetrical ways, which suggests they could be combined into a single function.
// 
function year_pick_list_handler(e) {
	var	town, year, towns_uniq,
		filter_func, 
		selected_counts, otemp, selected_countlocs;

	town = $("#select_town").val();
	year = $("#select_year").val();
	
	if (year == 'Any') {
		// Note that we do NOT continue with the common logic after 
		// the if-elseif-else block: We are effectively resetting 
		// the application and need to ensure that _no_ countlocs
		// are selected.
		clear_filters_handler(null);
		return;
	} else if (year == 'All Applicable') {
		// This choice will be present only if there is a selected
		// value in the 'town' <select> control.
		// Filter data, but using the selection in the _other_ <select> control,
		// i.e., the 'town' <select> control.
		filter_func = function(count) { return count.municipality == town; };
		selected_counts = _.filter(all_counts, filter_func);
		initialize_town_pick_list(all_counts);
		// Set the 'selected' value in the towns <select> list to the 
		// town that was selected, i.e., the contents of  the 'town' variable.
		$("#select_town option[value='" + town + "']").attr('selected', 'selected');
	} else {
		// A specific year has been selected 
		filter_func = function(count) { return count.count_date.substr(0,4) == year; };
		selected_counts = _.filter(all_counts, filter_func);
		// If a specific town is selected, further filter selected_counts on its value
		if (town != 'Any' && town != 'All Applicable') {
			filter_func = function(count) { return count.municipality == town; };
			selected_counts = _.filter(selected_counts, filter_func);
		} else {
			// Populate 'town' <select> control
		    selected_counts = _.filter(selected_counts, filter_func);
		    towns_unique = get_unique_towns_from_counts(selected_counts);
		    populate_town_control_from_list(towns_unique, true, false);			
		}
	}
	
	otemp = counts_to_selected_countlocs(selected_counts);
	update_map(otemp.selected);
	update_table(otemp.selected);		
} // year_pick_list_handler

// clear_filters_handler: on-click event handler for 'clear filters' button
// 
function clear_filters_handler(e) {
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
} // on-click handler for 'clear filters'

// initialize_town_pick_list - helper function for initialize_pick_lists
function initialize_town_pick_list(counts) {
	var munis, munis_uniq;
	
	munis = _.map(counts, function(c) { return c.municipality; });
	munis_uniq = _.uniq(munis);
	munnis_uniq = munis_uniq.sort(); // Alphabetize list of towns!
	
	$('#select_town').empty();
	$('#select_town').append(new Option("Any", "Any"));
	munis_uniq.forEach(function(muni) {
		$('#select_town').append(new Option(muni, muni));
	});
}

// initialize_year_pick_list -- helper function for initialize_pick_list
function initialize_year_pick_list(counts) {
	var years, years_uniq;
	
	years = _.map(counts, function(c) { return c.count_date.substr(0,4); });
	years_uniq = _.uniq(years);
	// Reverse list of years so the latest year appears at the top-of-list
	years_uniq = years_uniq.sort().reverse();
	
	$('#select_year').empty();
	$('#select_year').append(new Option("Any", "Any"));
	years_uniq.forEach(function(year) {
		$('#select_year').append(new Option(year, year));
	})
}

// Populate the pick-lists with their initial values, based on all_counts
// (*not* all count locations, believe it or not)
// Note on passed-in parm:
// 		counts parameter == all_counts
function initialize_pick_lists(counts) {
	initialize_town_pick_list(counts);
	initialize_year_pick_list(counts);
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
	const hitTolerance = 50;	// hit-test tolerance, in pixels
		
	if (ol_map.hasFeatureAtPixel(pixel, { 'hitTolerance': hitTolerance }) === true) {
		ol_map.forEachFeatureAtPixel(pixel, function(feature, layer) {
			features.push(feature);
		}, { 'hitTolerance': hitTolerance } );
		
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
    $.ajax({ url: mgis_serviceUrls['topo_features'], jsonp: 'callback', dataType: 'jsonp', data: { f: 'json' }, 
             success: function(config) {     
        // Body of "success" handler starts here.
        // Get resolutions
        var tileInfo = config.tileInfo;
        var resolutions = [];
        for (var i = 0, ii = tileInfo.lods.length; i < ii; ++i) {
            resolutions.push(tileInfo.lods[i].resolution);
        }               
        // Get projection
        var epsg = 'EPSG:' + config.spatialReference.wkid;
        var units = config.units === 'esriMeters' ? 'm' : 'degrees';
        var projection = ol.proj.get(epsg) ? ol.proj.get(epsg) : new ol.proj.Projection({ code: epsg, units: units });                              
        // Get attribution
        var attribution = new ol.control.Attribution({ html: config.copyrightText });               
        // Get full extent
        var fullExtent = [config.fullExtent.xmin, config.fullExtent.ymin, config.fullExtent.xmax, config.fullExtent.ymax];
        
        var tileInfo = config.tileInfo;
        var tileSize = [tileInfo.width || tileInfo.cols, tileInfo.height || tileInfo.rows];
        var tileOrigin = [tileInfo.origin.x, tileInfo.origin.y];
        var urls;
        var suffix = '/tile/{z}/{y}/{x}';
        urls = [mgis_serviceUrls['topo_features'] += suffix];               
        var width = tileSize[0] * resolutions[0];
        var height = tileSize[1] * resolutions[0];     
        var tileUrlFunction, extent, tileGrid;               
        if (projection.getCode() === 'EPSG:4326') {
            tileUrlFunction = function tileUrlFunction(tileCoord) {
                var url = urls.length === 1 ? urls[0] : urls[Math.floor(Math.random() * (urls.length - 0 + 1)) + 0];
                return url.replace('{z}', (tileCoord[0] - 1).toString()).replace('{x}', tileCoord[1].toString()).replace('{y}', (-tileCoord[2] - 1).toString());
            };
        } else {
            extent = [tileOrigin[0], tileOrigin[1] - height, tileOrigin[0] + width, tileOrigin[1]];
            tileGrid = new ol.tilegrid.TileGrid({ origin: tileOrigin, extent: extent, resolutions: resolutions });
        }     

        // MassGIS basemap Layer 1 - topographic features
        var layerSource;
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });
                          
        mgis_basemap_layers['topo_features'] = new ol.layer.Tile();
        mgis_basemap_layers['topo_features'].setSource(layerSource);
        mgis_basemap_layers['topo_features'].setVisible(true);
        
        // We make the rash assumption that since this set of tiled basemap layers were designed to overlay one another,
        // their projection, extent, and resolutions are the same.
        
         // MassGIS basemap Layer 2 - structures
        urls = [mgis_serviceUrls['structures'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['structures'] = new ol.layer.Tile();
        mgis_basemap_layers['structures'].setSource(layerSource); 
        mgis_basemap_layers['structures'].setVisible(true);
        
        // MassGIS basemap Layer 3 - "detailed" features - these include labels
        urls = [mgis_serviceUrls['basemap_features'] += suffix];  
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });
        mgis_basemap_layers['basemap_features'] = new ol.layer.Tile();
        mgis_basemap_layers['basemap_features'].setSource(layerSource);
        mgis_basemap_layers['basemap_features'].setVisible(true);

                       
        // MassGIS basemap Layer 4 - parcels - WE (CURRENTLY) DO NOT USE THIS LAYER
        // Code retained for reference purposes only
	/*
        urls = [mgis_serviceUrls['parcels'] += suffix];
        layerSource = new ol.source.XYZ({ attributions: [attribution], projection: projection,
                                          tileSize: tileSize, tileGrid: tileGrid,
                                          tileUrlFunction: tileUrlFunction, urls: urls });;
        mgis_basemap_layers['parcels'] = new ol.layer.Tile();
        mgis_basemap_layers['parcels'].setSource(layerSource);  
        mgis_basemap_layers['parcels'].setVisible(true);
	*/
	
		// Create OpenStreetMap base layer
		osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM() });
		osm_basemap_layer.setVisible(false);
		
		// Create Stamen 'toner-lite' base layer
	    stamen_basemap_layer = new ol.layer.Tile({ source: new ol.source.Stamen({layer: 'toner-lite',
		                                                                          url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png" }) });
		stamen_basemap_layer.setVisible(false);
		
		
		// Create WMS layers
		var lrse_bikes_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230719', 
																							'STYLES': 'lrse_bikes_style_3',
																							'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Bicycle Facilities (MassDOT)',	
											visible: true
										});
		var ma_wo_brmpo_poly_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					    params	: { 'LAYERS': 'postgis:ctps_ma_wo_brmpo_poly', 
																								    'STYLES': 'polygon_gray_for_non_mpo_area',
																								   'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Bike-Ped Count Locations',	
											visible: true
										});
		var bp_countlocs_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					params	: { 'LAYERS': 'postgis:ctps_bp_count_locations_pt', 
																								'STYLES': 'a_point_blue',
																								'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Bike-Ped Count Locations',	
											visible: true
										});	
		
		ol_map = new ol.Map({ layers: [	mgis_basemap_layers['topo_features'],
										mgis_basemap_layers['structures'],
										mgis_basemap_layers['basemap_features'],
										osm_basemap_layer,
										stamen_basemap_layer,
										lrse_bikes_wms,
										ma_wo_brmpo_poly_wms,
										bp_countlocs_wms,
										selected_countlocs_layer	// this is an OL Vector layer
									],
							target: 'map',
						    view:   initMapView,
						    overlays: [overlay]
						});
						
		// Bind on-click event handler for OpenLayers map: interrogates selected_countlocs_layer
		ol_map.on('click', function(evt) { onclick_handler(evt); });

		// Cache initial map extent for use in 'clear_filters_handler'
		var v = ol_map.getView();
		initMapExtent = v.calculateExtent();		
	}});	
} // initialize_map


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
				// Bind on-change event handlers for pick-list controls
				$('#select_town').on('change', town_pick_list_handler);
				$('#select_year').on('change', year_pick_list_handler);
				// Bind on-change event handler for 'clear_filters' button 
				$('#clear_filters').on('click', clear_filters_handler);
				// Arm event handler for basemap selection
				$(".basemap_radio").change(toggle_basemap_handler);
				initialize_map();
				initialize_pick_lists(all_counts);
			}));
		});
	_DEBUG_HOOK = 3;
} // initialize
