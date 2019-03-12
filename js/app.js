"use strict"

var	$app = document.getElementById('app'),
		xhr = new XMLHttpRequest();

xhr.open('GET', './chart_data.json', true);
xhr.send();

xhr.onreadystatechange = function() {
	if (xhr.readyState != 4) return;

	if( xhr.status === 200 ) {
		let chart_data = JSON.parse(xhr.responseText);
		// console.log(chart_data);

		var Chart = new ChartBuilder({
			container: $app,
			chart_data: chart_data
		});


	} else {
		console.error(xhr.status + ' ' + xhr.statusText);
	}	
}
