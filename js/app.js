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
			id_prefix: 'app',
			chart_data: chart_data,
			externalCss: false,
			title: 'Followers'
		});


	} else {
		console.error(xhr.status + ' ' + xhr.statusText);
	}	
}
