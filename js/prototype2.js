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
// Sledgehammer to enable/disable creation of popup
var popup_on = true;

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
function update_table(countlocs) {
	var _DEBUG_HOOK = 0;
	var i, cl, data_array = [];
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

///////////////////////////////////////////////////////////////////////////////
// Event handlers for:
// 	1. 'change' event to pick-lists
//  2. 'click' event on 'clear filters' button
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
																							'STYLES': 'lrse_bikes_style',
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
						
		// Proof-of-concept code to display 'popup' overlay:
		if (popup_on == true) {
			ol_map.on('click', function(evt) { onclick_handler(evt); });
		}

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
				// Bind on-change event handler(s) for pick-list controls
				$('#select_town,#select_year').on('change', pick_list_handler);
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
