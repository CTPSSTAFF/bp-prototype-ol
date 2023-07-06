// Prototype of next-gen bike-ped counts web application 'count location detail page' logic
//
// Data: 'all count locations' map data from WMS service
//       'selected count locations' - OpenLayers vector layer
//		 'counts' data - CSV file
// Mapping platform: OpenLayers
// Basemap: Open Street Map
//
// Author: Ben Krepp, bkrepp@ctps.org


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


function initialize() {
	var loc_id = getURLParameter('loc_id');
	var s = 'Count location ID is: ' + loc_id + '.';
	$('#temp_output').html(s);
}