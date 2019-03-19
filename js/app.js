"use strict"


document.addEventListener('DOMContentLoaded', function() {
	let Chart = null,
			chart_data = '',
			$app = document.getElementById('app'),
			$select = document.getElementById('select_chart'),
			xhr = new XMLHttpRequest();

	xhr.open('GET', './chart_data.json', true);
	xhr.send();

	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4) return;

		if( xhr.status === 200 ) {
			chart_data = xhr.responseText;
			// console.log(JSON.parse(chart_data));

			createSelectOptions(JSON.parse(chart_data));

			if( $select.value !== '' ) {
				Chart = new ChartBuilder({
					container: $app,
					id_prefix: 'app',
					chart_data: JSON.parse(chart_data)[$select.value],
					externalCss: false,
					title: 'Followers'
				});
			}
		} else {
			console.error(xhr.status + ' ' + xhr.statusText);
		}	
	}

	$select.addEventListener('change', function(e) {
		// console.log(e.target.value);
		Chart = new ChartBuilder({
			container: $app,
			id_prefix: 'app',
			chart_data: JSON.parse(chart_data)[e.target.value],
			externalCss: false,
			title: 'Followers'
		});
	}, false);



	function createSelectOptions(chart_data) {
		let select_html = '';
		chart_data.forEach(function(chart, i) {
			select_html += '<option value="'+ i +'"">Chart '+ i +'</option>';
		});
		$select.innerHTML = select_html;
	}
}, false);

