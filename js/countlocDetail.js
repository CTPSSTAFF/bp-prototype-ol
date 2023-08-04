// Prototype of next-gen bike-ped counts web application 'count location detail page' logic
//
// Data: 'all count locations' map data from WMS service
//       'selected count locations' - OpenLayers vector layer
//		 'counts' data - CSV file
// Mapping platform: OpenLayers
// Basemaps: MassGIS, Open Street Map, Stamen
//
// Author: Ben Krepp, bkrepp@ctps.org

// Data source: count data
var countsURL = 'data/csv/bp_counts.csv';

// Data source: count locations 
var countlocsURL = 'data/json/ctps_bp_count_locations_pt.geo.json';

var counts4countloc = []	// counts for current count location
    count_ids =       [];	// count_id's for these counts
	
// Array of 'all counts' (needed by on-click handler)
var all_counts = [];

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

// Vector point layer for selected count location
var selected_countlocs_style = new ol.style.Style({ image: new ol.style.Circle({ radius: 7.0,
                                                                                 fill: new ol.style.Fill({color: 'gold'}),
																				 stroke: new ol.style.Stroke({color: 'black', width: 1.0})
																				}) 
                                                                             });
var selected_countlocs_layer = new ol.layer.Vector({ title: 'Selected Count Locations',
								                     source	: new ol.source.Vector({ wrapX: false }),
								                     style: selected_countlocs_style
								                   });											   

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

// onclick_handler: on-click event handler for OpenLayers map
//
// If there is a feature at the clicked location, calls
// make_popup_content to generate content for an OpenLayers
// popup, and then sets the popup's position on the map.
var onclick_handler = function(evt) {
	var pixel = evt.pixel,
	    features = [], feature, content, coordinate;
	const hitTolerance = 150;	// hit-test tolerance, in pixels
		
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


// Utility function to return the value of the parameter named 'sParam' from the window's URL
function getURLParameter(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	var i;
	for (i = 0; i < sURLVariables.length; i++ ) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam) {
			return sParameterName[1];
		}
	}
	// If we get here, parameter not found
	return('');
} // gtetURLParameter()

// initialize_map
// parameter: this_countloc  - record for count location
//
function initialize_map(this_countloc) {
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
	
		var mgis_basemap_layer_group = new ol.layer.Group({  title: 'MassGIS Basemap', 
													         type: 'base',
															 combine: true,
													         layers: [mgis_basemap_layers['topo_features'],
															          mgis_basemap_layers['structures'],
																	  mgis_basemap_layers['basemap_features'] ] });
		
		// Create OpenStreetMap base layer
		var osm_basemap_layer = new ol.layer.Tile({ source: new ol.source.OSM(),
												    type: 'base',
												    title: 'Open Street Map' });
		osm_basemap_layer.setVisible(false);
		
		// Create Stamen 'toner-lite' base layer
	    stamen_basemap_layer = new ol.layer.Tile({ source: new ol.source.Stamen({layer: 'toner-lite',
		                                                                          url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png" }), 
												  type: 'base',
												  title: 'Stamen' });
		stamen_basemap_layer.setVisible(false);
		
		var basemap_layer_group = new ol.layer.Group( { title: 'Basemaps',
														layers: [ mgis_basemap_layer_group,
														          osm_basemap_layer,
																  stamen_basemap_layer ] });
	
		// Create WMS layers
		var lrse_bikes_shared_use_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				          params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230719', 
																							            'STYLES': 'lrse_bikes_shared_use_path',
																							            'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Shared Use Bicycle Paths (MassDOT)',	
											visible: true
										});
		var lrse_bikes_protected_lane_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				               params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230719', 
																							                'STYLES': 'lrse_bikes_protected_bike_lane',
																							                'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'On-road Protected Bicycle Lane (MassDOT)',	
											visible: true
										});	
		var lrse_bikes_on_road_lane_wms = new ol.layer.Tile({ source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																				               params	: { 'LAYERS': 'postgis:massdot_lrse_bikes_20230719', 
																							                'STYLES': 'lrse_bikes_on_road_bike_lane',
																							                'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'On-road Bicycle Lane (MassDOT)',	
											visible: true
										});	
		var bike_layer_group = new ol.layer.Group({ title: 'Bicycle Facilities (MassDOT)', 
													fold: 'open',
													layers: [lrse_bikes_shared_use_wms,
															 lrse_bikes_protected_lane_wms,
															 lrse_bikes_on_road_lane_wms] });
		
		var ma_wo_brmpo_poly_wms = new ol.layer.Tile({	source: new ol.source.TileWMS({ url		: szWMSserverRoot,
																					params	: { 'LAYERS': 'postgis:ctps_ma_wo_brmpo_poly', 
																								'STYLES': 'polygon_gray_for_non_mpo_area',
																								'TRANSPARENT': 'true'
																					  }
																		}),
											title: 'Area Outside Boston Region MPO',	
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
										
		var mapCenter = ol.proj.fromLonLat([this_countloc.properties.longitude, this_countloc.properties.latitude]);
		var mapZoom = 17; // Best guess, for now
		var mapView =  new ol.View({ center: mapCenter, zoom:  mapZoom });
		
		var vSource, feature, geom, props;
		
		vSource = selected_countlocs_layer.getSource();
		vSource.clear();
		geom = {};
		props = {}; // TBD
		geom =  new ol.geom.Point(ol.proj.fromLonLat([this_countloc.properties.longitude, this_countloc.properties.latitude]));
		props = JSON.parse(JSON.stringify(this_countloc.properties));
		feature = new ol.Feature({geometry: geom, properties: props});
		vSource.addFeature(feature);
		selected_countlocs_layer.setSource(vSource);
		
		ol_map = new ol.Map({ layers: [	basemap_layer_group,
										ma_wo_brmpo_poly_wms,
										bike_layer_group,
										bp_countlocs_wms,
										selected_countlocs_layer	// this is an OL Vector layer
									],
						   target: 'map',
						   view:   mapView,
						   overlays: [overlay]
						});
						
		// Add layer switcher add-on conrol
		var layerSwitcher = new ol.control.LayerSwitcher({ tipLabel: 'Legend', // Optional label for button
                                                           groupSelectStyle: 'children', // Can be 'children' [default], 'group' or 'none'
														   activationMode: 'click',
                                                           startActive: true,
														   reverse: false // List layers in order they were added to the map
                                                         });						
		ol_map.addControl(layerSwitcher);
		
		// Bind on-click event handler for OpenLayers map: interrogates selected_countlocs_layer
		ol_map.on('click', function(evt) { onclick_handler(evt); });
	}});			
} // initialize_map


// prepare_data_for_quarter_hour_viz: 
// given a count record 'count_rec', return a data structure containing the count record's 
// data packaged in a form suitable for input to the Plotly bar-chart visualization engine.
//
function prepare_data_for_quarter_hour_viz(rec) {
	var retval = {	'times' : [' 6:00 AM', ' 6:15 AM', ' 6:30 AM', ' 6:45 AM', 
	                           ' 7:00 AM', ' 7:15 AM', ' 7:30 AM', ' 7:45 AM',
							   ' 8:00 AM', ' 8:15 AM', ' 8:30 AM', ' 8:45 AM',
							   ' 9:00 AM', ' 9:15 AM', ' 9:30 AM', ' 9:45 AM',
								'10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
								'11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
                                '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
								' 1:00 PM', ' 1:15 PM', ' 1:30 PM', ' 1:45 PM',
								' 2:00 PM', ' 2:15 PM', ' 2:30 PM', ' 2:45 PM',
								' 3:00 PM', ' 3:15 PM', ' 3:30 PM', ' 3:45 PM',
								' 4:00 PM', ' 4:15 PM', ' 4:30 PM', ' 4:45 PM',
								' 5:00 PM', ' 5:15 PM', ' 5:30 PM', ' 5:45 PM',
                                ' 6:00 PM', ' 6:15 PM', ' 6:30 PM', ' 6:45 PM',
							    ' 7:00 PM', ' 7:15 PM', ' 7:30 PM', ' 7:45 PM',
								' 8:00 PM', ' 8:15 PM', ' 8:30 PM', ' 8:45 PM'
							],
					'counts' : [] 
				};
	
	retval.counts.push(0); // at least right now, we never have any data for 0600
	retval.counts.push(0); // at least right now, we never have any data for 0615
	retval.counts.push(rec.cnt_0630);
	retval.counts.push(rec.cnt_0645);
	retval.counts.push(rec.cnt_0700);
	retval.counts.push(rec.cnt_0715);
	retval.counts.push(rec.cnt_0730);
	retval.counts.push(rec.cnt_0745);
	retval.counts.push(rec.cnt_0800);
	retval.counts.push(rec.cnt_0815);
	retval.counts.push(rec.cnt_0830);
	retval.counts.push(rec.cnt_0845);
	retval.counts.push(rec.cnt_0900);
	retval.counts.push(rec.cnt_0915);
	retval.counts.push(rec.cnt_0930);
	retval.counts.push(rec.cnt_0945);
	retval.counts.push(rec.cnt_1000);
	retval.counts.push(rec.cnt_1015);
	retval.counts.push(rec.cnt_1030);
	retval.counts.push(rec.cnt_1045);
	retval.counts.push(rec.cnt_1100);
	retval.counts.push(rec.cnt_1115);
	retval.counts.push(rec.cnt_1130);
	retval.counts.push(rec.cnt_1145);
	retval.counts.push(rec.cnt_1200);
	retval.counts.push(rec.cnt_1215);
	retval.counts.push(rec.cnt_1230);
	retval.counts.push(rec.cnt_1245);
	retval.counts.push(rec.cnt_1300);
	retval.counts.push(rec.cnt_1315);
	retval.counts.push(rec.cnt_1330);
	retval.counts.push(rec.cnt_1345);
	retval.counts.push(rec.cnt_1400);
	retval.counts.push(rec.cnt_1415);
	retval.counts.push(rec.cnt_1430);
	retval.counts.push(rec.cnt_1445);
	retval.counts.push(rec.cnt_1500);
	retval.counts.push(rec.cnt_1515);
	retval.counts.push(rec.cnt_1530);
	retval.counts.push(rec.cnt_1545);
	retval.counts.push(rec.cnt_1600);
	retval.counts.push(rec.cnt_1615);
	retval.counts.push(rec.cnt_1630);
	retval.counts.push(rec.cnt_1645);
	retval.counts.push(rec.cnt_1700);
	retval.counts.push(rec.cnt_1715);
	retval.counts.push(rec.cnt_1730);
	retval.counts.push(rec.cnt_1745);
	retval.counts.push(rec.cnt_1800);
	retval.counts.push(rec.cnt_1815);
	retval.counts.push(rec.cnt_1830);
	retval.counts.push(rec.cnt_1845);
	retval.counts.push(rec.cnt_1900);
	retval.counts.push(rec.cnt_1915);
	retval.counts.push(rec.cnt_1930);
	retval.counts.push(rec.cnt_1945);
	retval.counts.push(rec.cnt_2000);
	retval.counts.push(rec.cnt_2015);
	retval.counts.push(rec.cnt_2030);
	retval.counts.push(rec.cnt_2045);
	
	return retval;
} // prepare_data_for_quarter_hour_viz


function generate_quarter_hour_viz(target_div_id, count_record) {
	var o, x_domain, y_values, data, max_count, layout;
	
	o = prepare_data_for_quarter_hour_viz(count_record);
	x_domain = o.times;
	y_values = o.counts;
	
	// Set bar color based on 'type' of count:  group similar count 'types'
	// to avoid having too large a color palette.
	//
	// Color palette from: https://colorbrewer2.org/#type=qualitative&scheme=Set2&n=4
	switch(count_record.count_type) {
	case 'B':
		color = '#8da0cb';
		break;
	case 'P':
	case 'J':
		color = '#fc8d62';
		break;
	case 'S':
	case 'C':
	case 'W':
		color = '#e78ac3';
		break;
	case 'O':
	default:
		color = '#66c2a5';
		break;
	}
	
	data = [ { x: x_domain, 
	           y: y_values, 
			   type: 'bar',
			   marker: { color: color }
			 } ];
	
	
	// The following folderol was needed in order to get Plotly to render:
	// 1. the Y-axis with non-negative values when all the Y data values are 0 and
	// 2. to provide a (somewhat) reasonable scale of integral values for the Y axis.
	max_count = _.max(o.counts);
	if (max_count === 0) {
		layout = { yaxis: { title: { text: 'Traffic Count' },
				            rangemode: 'nonnegative', 
							range: [0, 5] 
						  } 
				 };
	} else {
		layout = { yaxis: { title: { text: 'Traffic Count'},
				            rangemode: 'nonnegative', 
							autorange: true 
						  } 
			     };
	}

	Plotly.newPlot(target_div_id, data, layout);
} // generate_quarter_hour_viz


// Return string for encoded value of 'sky'
function sky_condition(code) {
	retval = 'Sky condition not recorded';
	switch (code) {
	case 1:
		retval = 'Sunny';
		break;
	case 2:
		retval = 'Partly cloudy';
		break;
	case 3:
		retval = 'Overcast';
		break;
	case 4:
		retval = 'Precipitation';
		break;
	case -99:
		retval = 'Sky condition not recorded';
		break;
	}
	return retval;
}

// Return string for encoded value of 'count_type
function count_type(code) {
	retval = 'Unknown';
	switch (code) {
	case 'B':
		retval = 'Bicycle';
		break;
	case 'P':
		retval = 'Pedestrian';
		break;
	case 'J':
		retval = 'Jogger';
		break;
	case 'S':
		retval = 'Skateboarder, rollerblader';
		break;
	case 'C':
		retval = 'Baby carriage';
		break;
	case 'W':
		retval = 'Wheelchair';
		break;
	case 'O':
		retval = 'Other';
		break;
	}
	return retval;
}

// generate_report_for_count_id:
// Appends a <div> with a report for the given count_id into the report_div.
//
// Note that there is some data that is common to ALL count-records for
// a given count_id; 'hoist' this data and put it in a header for the count.
function generate_report_for_count_id(count_id, count_recs) {
	var count1, html, count_div_id;
	
	count_div_id = 'count_' + count_id + '_report';
	html = '<div ' + count_div_id + '</div>';
	html += '<span>' + 'Report for count ID ' + count_id + '</span>';
	html += '</br>';
	
	// Stuff common to all count records for this count
	count1 = count_recs[0]; // 1st record should be as good as any one
	html += '<span class="report_header_date">Date: ' + count1.count_date.substr(0,10) + '</span>';
	html += '</br>';
	html += '<span class="report_header_date">Town: ' + count1.municipality + '</span>';
	html += '</br>';
	html += '<span class="report_header_facility_info">' + count1.facility_name + ' ' + count1.facility_type + '</span>';
	html += '</br>';
	html += '<span class="report_header_weather_info">' + count1.temperature + '&deg;&comma;&nbsp;' + sky_condition(count1.sky) + '</span>';
	html += '</div>';
	$('#report_div').append(html);
	
	// Generate a report for each 'count record' associated with the given count_id
	console.log('Generating report for count_id ' + count_id);
	count_recs.forEach(function(rec) {
		
		console.log('    Generating report for record id ' + rec.id);
		var rec_id, caption_div_id, viz_div_id, html, o;
		rec_id = rec.id;
		
		caption_div_id = 'count_' + count_id + '_rec_' + rec_id + '_caption';
		viz_div_id = 'count_' + count_id + '_rec_' + rec_id + '_viz';
		
		// Create and append a <div> for the caption of the viz for this count record
		html = '<div ' + 'id=' + caption_div_id + '>';
		html += '<p>Visualization of data for count record ID # ' + rec.id + '</p>';
		html += '<span>';
		html += '<strong>From:</strong> ' + rec.from_st_name + '&nbsp;' + rec.from_st_dir + '&nbsp;&nbsp;';
		html += '<strong>To: </strong>' + rec.to_st_name + '&nbsp;' + rec.to_st_dir + '&nbsp;&nbsp;';
		html += '</span>';
		html += '</br>';
		html += '<span>';
		html += 'Traffic count type: <strong>&nbsp;' + count_type(rec.count_type) + '</strong>';
		html += '</span>';
		html += '</div>';
		$('#report_div').append(html);
		
		// Create and append a <div> for the visualization itself.
		html = '<div ' + 'id=' + viz_div_id + '>';
		html += '</div>';
		$('#report_div').append(html);
		
		generate_quarter_hour_viz(viz_div_id, rec);
	}); // forEach count_rec 
} // generate_report_for_count_id


// Format the array of data in 'counts' as CSV and download it
function download_data(counts) {
	var s; // string into which data to be downloaded in CSV format will be accumulated
	var header = "id,bp_loc_id,count_id,municipality,facility_name,";
		header += "street_1,street_2,street_3,street_4,street_5,street_6,";
		header += "description,temperature,sky,facility_type,count_type,";
		header += "from_st_name,from_st_dir,to_st_name,to_st_dir,count_date,count_dow,";
		header += "cnt_0630,cnt_0645,";
		header += "cnt_0700,cnt_0715,cnt_0730,cnt_0745,cnt_0800,cnt_0815,cnt_0830,cnt_0845,cnt_0900,cnt_0915,cnt_0930,cnt_0945,";
		header += "cnt_1000,cnt_1015,cnt_1030,cnt_1045,cnt_1100,cnt_1115,cnt_1130,cnt_1145,cnt_1200,cnt_1215,cnt_1230,cnt_1245,";
		header += "cnt_1300,cnt_1315,cnt_1330,cnt_1345,cnt_1400,cnt_1415,cnt_1430,cnt_1445,cnt_1500,cnt_1515,cnt_1530,cnt_1545,";
		header += "cnt_1600,cnt_1615,cnt_1630,cnt_1645,cnt_1700,cnt_1715,cnt_1730,cnt_1745,cnt_1800,cnt_1815,cnt_1830,cnt_1845,";
		header += "cnt_1900,cnt_1915,cnt_1930,cnt_1945,cnt_2000,cnt_2015,cnt_2030,cnt_2045,cnt_total";
		header += "\n";
		
		s = header;
		counts.forEach(function(c) {
            s += c.id + ',';
            s += c.bp_loc_id + ',';
            s += c.count_id + ',';
            s += c.municipality + ',';
            s += c.facility_name + ',';
            s += c.street_1 + ',';
            s += c.street_2 + ',';
            s += c.street_3 + ',';
            s += c.street_4 + ',';
            s += c.street_5 + ',';
            s += c.street_6 + ',';
            s += '"' + c.description + '",';
            s += c.temperature + ',';
            s += c.sky + ',';
            s += c.facility_type + ',';
            s += c.count_type + ',';
            s += c.from_st_name + ',';
            s += c.from_st_dir + ',';
            s += c.to_st_name + ',';
            s += c.to_st_dir + ',';
            s += '"' + c.count_date + '",';
            s += c.count_dow + ',';
            s += c.cnt_0630 + ',';
            s += c.cnt_0645 + ',';
            s += c.cnt_0700 + ',';
            s += c.cnt_0715 + ',';
            s += c.cnt_0730 + ',';
            s += c.cnt_0745 + ',';
            s += c.cnt_0800 + ',';
            s += c.cnt_0815 + ',';
            s += c.cnt_0830 + ',';
            s += c.cnt_0845 + ',';
            s += c.cnt_0900 + ',';
            s += c.cnt_0915 + ',';
            s += c.cnt_0930 + ',';
            s += c.cnt_0945 + ',';
            s += c.cnt_1000 + ',';
            s += c.cnt_1015 + ',';
            s += c.cnt_1030 + ',';
            s += c.cnt_1045 + ',';
            s += c.cnt_1100 + ',';
            s += c.cnt_1115 + ',';
            s += c.cnt_1130 + ',';
            s += c.cnt_1145 + ',';
            s += c.cnt_1200 + ',';
            s += c.cnt_1215 + ',';
            s += c.cnt_1230 + ',';
            s += c.cnt_1245 + ',';
            s += c.cnt_1300 + ',';
            s += c.cnt_1315 + ',';
            s += c.cnt_1330 + ',';
            s += c.cnt_1345 + ',';
            s += c.cnt_1400 + ',';
            s += c.cnt_1415 + ',';
            s += c.cnt_1430 + ',';
            s += c.cnt_1445 + ',';
            s += c.cnt_1500 + ',';
            s += c.cnt_1515 + ',';
            s += c.cnt_1530 + ',';
            s += c.cnt_1545 + ',';
            s += c.cnt_1600 + ',';
            s += c.cnt_1615 + ',';
            s += c.cnt_1630 + ',';
            s += c.cnt_1645 + ',';
            s += c.cnt_1700 + ',';
            s += c.cnt_1715 + ',';
            s += c.cnt_1730 + ',';
            s += c.cnt_1745 + ',';
            s += c.cnt_1800 + ',';
            s += c.cnt_1815 + ',';
            s += c.cnt_1830 + ',';
            s += c.cnt_1845 + ',';
            s += c.cnt_1900 + ',';
            s += c.cnt_1915 + ',';
            s += c.cnt_1930 + ',';
            s += c.cnt_1945 + ',';
            s += c.cnt_2000 + ',';
            s += c.cnt_2015 + ',';
            s += c.cnt_2030 + ',';
            s += c.cnt_2045 + ',';
            s += c.cnt_total + ',';
			s += "\n";
		});
		// HERE: 's' is the entire string to download
		download(s, 'bike_ped_counts', 'text/csv');
} // download_data


function initialize() {
	var loc_id = getURLParameter('loc_id');	
	
	// Temp stuff, for now
	var s = '<h3>Reports for counts at count location # ' + loc_id + '<h3>';
	$('#report_div').html(s);
	
	// Load count data from CSV file
	d3.csv(countsURL, rowConverter).then(
		function(counts_data){
			all_counts = counts_data;
			// Load GeoJSON for count locations
			// Use local file for now, WFS request in production
			// For WFS request - remember to reproject to EPSG:4326!
			$.when(getJson(countlocsURL).done(function(bp_countlocs) {
				var ok, temp, this_countloc, count_ids, count_id,
				    i, this_count_id, countrecs_for_this_count_id;
					
				ok = arguments[1] === 'success'; 
				if (ok === false) {
					alert("Failed to load GeoJSON for count locations successfully.");
					return; 
				} 
				temp = _.filter(bp_countlocs.features, function(rec) { return rec.properties.loc_id == loc_id; });
				this_countloc = temp[0];
				
				// Extract the counts for the current countloc
				counts4countloc = _.filter(counts_data, function(rec) { return rec.bp_loc_id == loc_id; });
				// Get list of unique count_id's of these counts
				count_ids = _.map(counts4countloc, function(rec) { return rec.count_id; });
				count_ids = _.uniqBy(count_ids, 'count_id');
				
				initialize_map(this_countloc);
				
				// Generate a 'report' for each count, by iterating over the selected count_ids
				count_ids.forEach(function(this_count_id) {
					countrecs_for_this_count_id = _.filter(counts_data, function(rec) { return rec.count_id == this_count_id; });
					generate_report_for_count_id(this_count_id, countrecs_for_this_count_id);
				});
			}));
			// Arm event handler for 'download' button
			$('#download_selected').on('click', function(e) { download_data(counts4countloc); });
	});
} // initialize