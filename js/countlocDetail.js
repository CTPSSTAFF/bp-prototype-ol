// Prototype of next-gen bike-ped counts web application 'count location detail page' logic
//
// Data: 'all count locations' map data from WMS service
//       'selected count locations' - OpenLayers vector layer
//		 'counts' data - CSV file
// Mapping platform: OpenLayers
// Basemap: Open Street Map
//
// Author: Ben Krepp, bkrepp@ctps.org

// Data source: count data
var countsURL = 'data/csv/bp_counts.csv';

var counts4countloc = []	// counts for current count location
    count_ids =       [];	// count_id's for these counts
	
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
// parameters: 	loc_lat - latitude of count location
//              loc_lon - longitude of count location
function initialize_map(loc_lat, loc_lon) {
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
									
	var mapCenter = ol.proj.fromLonLat([loc_lon, loc_lat]);
	var mapZoom = 17; // Best guess, for now
    var mapView =  new ol.View({ center: mapCenter, zoom:  mapZoom });
	
	var vSource, feature, geom, props;
	
	vSource = selected_countlocs_layer.getSource();
	vSource.clear();
	geom = {};
	props = {}; // TBD
	geom =  new ol.geom.Point(ol.proj.fromLonLat([loc_lon, loc_lat]));
	// props = JSON.parse(JSON.stringify(cur_countloc.properties));
	feature = new ol.Feature({geometry: geom, properties: props});
	vSource.addFeature(feature);
	selected_countlocs_layer.setSource(vSource);
	
	ol_map = new ol.Map({ layers: [	osm_basemap_layer,
									// mgis_basemap_layers['topo_features'],
									// mgis_basemap_layers['structures'],
									// mgis_basemap_layers['basemap_features'],
									bp_countlocs_wms,
									selected_countlocs_layer	// this is an OL Vector layer
								],
					   target: 'map',
					   view:   mapView
					});
} // initialize_map

// Appends a <div> with a report for the given count_id into the report_div
// Question: Parameterize <div> into which the report is appended?
function report4countId(count_id) {
	console.log('Report for ' + count_id);
	
	var div_id, html;
	div_id = 'report_count_' + count_id;
	html = '<div ' + 'id=' + div_id + '>';
	html += '<h4>Report for count #' + count_id + '</h4>';
	html += '</div>';
	$('#report_div').append(html);
} // report4countId


function initialize() {
	var loc_id = getURLParameter('loc_id');
	var loc_lat = getURLParameter('loc_lat');
	var loc_lon = getURLParameter('loc_lon');
	
	var _DEBUG_HOOK = 0;
	
	// Temp stuff, for now
	var s = '<h3>Reports for counts at count location # ' + loc_id + '<h3>';
	$('#report_div').html(s);
	
	// Load count data from CSV file
	d3.csv(countsURL, rowConverter).then(
		function(data){
			initialize_map(loc_lat, loc_lon);
			// Extract the counts for the current countloc
			counts4countloc = _.filter(data, function(rec) { return rec.bp_loc_id == loc_id; });
			// Get count_id's of these counts
			count_ids = _.map(counts4countloc, function(rec) { return rec.count_id; });
			count_ids.forEach(function(count_id) {
				report4countId(count_id);
			});
			_DEBUG_HOOK = 1;
	});
	_DEBUG_HOOK = 2;
}