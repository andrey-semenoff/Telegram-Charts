"use strict"

/**
	* Chart builder
	* 
	* Settings:
	* container   (string)  - (mandatory) ID of DOM element where to build charts
	* chart_data  (array)   - (mandatory) JSON object with data about charts
	* id_prefix   (string)  - (mandatory) namespace prefix for IDs of generated DOM elements
	* externalCss (boolean) - (optional, false by default) use external css file for styling elements, or generate styles via JS
	* title 			(string) -  (optional) showing title of charts
	*/
function ChartBuilder(settings) {
	let self = this,
			$container = null,
			chart_data = null,
			id_prefix = 'app',
			externalCss = false,
			title = null,

			active_set = 3,
			$app__main = null,
			$app__main_title = null,
			$app__main_holder = null,
			$app__main_wrapper = null,
			$svg_main = null,
			svg_main__computed = {},
			$app__scroll = null,
			$svg_scroll = null,
			$app__switchers = null,
			xmlns = "http://www.w3.org/2000/svg",
			$svg = null,
			charts = [],
			all_values = [],
			max_value_abs = null,
			min_value_abs = null,	
			timestamps = [],
			visible = {
				from: 0.75, 
				to: 1
			},
			breakpoints = 5,
			px_per_day = null,
			px_per_val = null,
			step_value = null,
			min_breakpoint_value = 0,
			koef = 1;

	/**
		* Constructor of Chart
		*/
	function constructor(settings) {
		$container	= settings.container;
		chart_data	= settings.chart_data;
		id_prefix		= settings.id_prefix;
		externalCss	= settings.externalCss;
		title 			= settings.title;

		if( !$container || !chart_data ) {
			console.error('Chart builder constructor error! Mandatory settings wasn\'t set!', settings);
			return false;
		}

		if ( !externalCss ) {
		// var css = 'h1 { background: red; }',
  //   head = document.head || document.getElementsByTagName('head')[0],
  //   style = document.createElement('style');

		// head.appendChild(style);

		// style.type = 'text/css';
		// if (style.styleSheet){
		//   // This is required for IE8 and below.
		//   style.styleSheet.cssText = css;
		// } else {
		//   style.appendChild(document.createTextNode(css));
		// }			
		}

		// console.log(chart_data);

		createLayouts();
		prepareData();
		calcVariables();
		drawValuesLines();
		drawBreakpoints();
		drawDates();
		drawCharts();
		drawScrollCharts();
		drawChartsSwitchers();
		createEvents();

		// console.log(charts);
		// console.log(timestamps);
	}

	this.createElementNS = function(ns, name, attributes, styles) {
		let $el = null;

		if( ns !== null ) {
			$el = document.createElementNS(ns, name);			
		} else {
			$el = document.createElement(name);			
		}

		for( let prop in attributes ) {
			$el.setAttribute(prop, attributes[prop]);
		}
		
		if( styles && styles instanceof Object && typeof styles === "object" ) {
			let cssText = '';
			for( let prop in styles ) {
				cssText += prop + ":" + styles[prop] + ";";
			}
			$el.style.cssText = cssText;
		}

		return $el;
	}


	/**
		* Create SVG and base elements
		*/
	function createLayouts() {
		$app__main = self.createElementNS(null, 'div', {
									id: id_prefix + '__main'
								});
		$app__scroll = self.createElementNS(null, 'div', {
									id: id_prefix + '__scroll'
								});
		$app__switchers = self.createElementNS(null, 'div', {
									id: id_prefix + '__switchers'
								});
		if( title ) {
			$app__main_title = self.createElementNS(null, 'div', {
										id: id_prefix + '__main-title'
									});			
			$app__main_title.innerHTML = title;
		}
		$app__main_holder = self.createElementNS(null, 'div', {
									id: id_prefix + '__main-holder'
								});
		$app__main_wrapper = self.createElementNS(null, 'div', {
									id: id_prefix + '__main-wrapper'
								});
		$svg_main = self.createElementNS(xmlns, 'svg', {
								width: (1 / (visible.to - visible.from)) * 100 +'%',
								height: '100%',
								id: id_prefix + '__main-svg'
							});
		$svg_scroll = self.createElementNS(xmlns, 'svg', {
									width: '100%',
									height: '100%',
									id: id_prefix + '__scroll-svg'
								});
		$container.appendChild($app__main);
		$container.appendChild($app__scroll);
		$container.appendChild($app__switchers);

		if( title ) {
			$app__main.appendChild($app__main_title);
		}

		$app__main.appendChild($app__main_holder);
		$app__main_holder.appendChild($app__main_wrapper);

		$app__main_wrapper.appendChild($svg_main);
		$app__scroll.appendChild($svg_scroll);
	}

	function prepareData() {
		let data = chart_data[active_set],
				dates_col_name = data.types.x;
		// Prepare data for charts
		for( let prop in data.names ) {
			let chart = {};
			chart.name = data.names[prop];
			chart.type = data.types[prop];
			chart.color = data.colors[prop];
			chart.column = data.columns.filter(function(column) {
				if ( column[0] === prop ) {
					column.shift();
					return column;
				}
			})[0];
			charts.push(chart);
		}

		// Get timestamps
		timestamps = data.columns.filter(function(column) {
			if ( column[0] === dates_col_name ) {
				column.shift();
				return column;
			}
		})[0];

		// Sort timestamps
		timestamps.sort(function(a,b) {
			if( a < b ) {
				return -1;
			} else if ( a > b ) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	function calcVariables() {
		let main_holder_params = $app__main_holder.getBoundingClientRect();

		svg_main__computed = getComputedStyle($svg_main);
		px_per_day = parseInt(svg_main__computed.width) / timestamps.length;

		charts.forEach(function(chart) {
			all_values = all_values.concat(chart.column);
		});

		let svg_main_height = parseInt(svg_main__computed.height);
		
		max_value_abs = Math.max.apply(null, all_values);
		min_value_abs = Math.min.apply(null, all_values);	
				
		step_value = Math.ceil(max_value_abs / breakpoints);

		let section = null,
				i = 0;

		while ( section !== 0 && i < 5 ) {
			for ( let b = 0; b <= breakpoints; b++ ) {
				if ( min_value_abs < step_value * b + min_breakpoint_value ) {
					min_breakpoint_value = (b - 1) * step_value + min_breakpoint_value;
					section = b - 1;
					break;
				}
			}
			i++;
			step_value = Math.ceil((max_value_abs - min_breakpoint_value) / breakpoints);
		} 

		koef = (svg_main_height - 70)/(max_value_abs - min_breakpoint_value);
		px_per_val = svg_main_height / ((max_value_abs - min_breakpoint_value) * koef);
	}

	function drawValuesLines() {
		let $group_lines = self.createElementNS(xmlns, 'g'),
				margin_bottom = 50,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		for ( let b = 0; b <= breakpoints; b++ ) {
			let y = start_height - (b * step_value * koef),
					$line = self.createElementNS(xmlns, 'line', {
									x1: 0,
									y1: y,
									x2: '100%',
									y2: y,
									stroke: '#ccc',
									'stroke-width': 0.5
								});
			$group_lines.appendChild($line);
		}

		$svg_main.appendChild($group_lines);
	}

	function drawBreakpoints() {
		let main_holder_params = $app__main_holder.getBoundingClientRect(),
				$svg_breakpoints = self.createElementNS(xmlns, 'svg', {
														id: id_prefix + '__breakpoints',
														width: '60px',
														height: main_holder_params.height + 'px'
													}),
				$group_breakpoints = self.createElementNS(xmlns, 'g'),
				margin_bottom = 50,
				line_height = 5,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		for ( let b = 0; b <= breakpoints; b++ ) {
			let y = start_height - line_height - (b * step_value * koef),
					$text = self.createElementNS(xmlns, 'text', {
										x: 0,
										y: y,
										fill: '#aaa'
									},
									{
										'font-size': '14px'
									});
			$text.append(b * step_value + min_breakpoint_value);
			$group_breakpoints.appendChild($text);
			$svg_breakpoints.appendChild($group_breakpoints);
		}

		$app__main_holder.appendChild($svg_breakpoints);
	}

	function drawDates() {
		let $app__main_svg = document.getElementById(id_prefix + '__main-svg'),
				date_diff = timestamps[timestamps.length - 1] - timestamps[0],
				date_diff_in_days = date_diff/(1000*60*60*24),
				draw_period = 7,
				periods = Math.ceil(date_diff_in_days / draw_period),
				$group_values = self.createElementNS(xmlns, 'g'),
				margin_bottom = 20,
				margin_right = 40,
				min_width = 55,
				y = parseInt(svg_main__computed.height) - margin_bottom,
				monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

		periods = Math.floor((parseInt(svg_main__computed.width) - margin_right) / (min_width + margin_right));
		draw_period = date_diff_in_days / periods;

		let index = 0;
		for ( let t = timestamps[0]; t <= timestamps[timestamps.length - 1]; t += draw_period*1000*60*60*24) {
			let $text = self.createElementNS(xmlns, 'text', {
									x: index * (min_width + margin_right),
									y: y,
									fill: '#aaa'
								},
								{
									'font-size': '14px'
								}),
					date = new Date(t),
					month = date.getMonth(),
					day = date.getDate();

			$text.append(monthNames[month] + ' ' + day);
			$group_values.appendChild($text);
			index++;
		}


		if( $app__main_svg.getBoundingClientRect().width < ((index + 1) * min_width) ) {
			$app__main_svg.setAttribute('width', timestamps.length * min_width + 'px');
		}

		$svg_main.appendChild($group_values);
	}

	function drawCharts() {
		// console.log(charts);
		let $group_charts = self.createElementNS(xmlns, 'g'),
				margin_bottom = 50,
				start_height = parseInt(svg_main__computed.height) - margin_bottom;

		charts.forEach(function(chart) {
			let points_string = '',
					start_ts = timestamps[0];
			chart.column.forEach(function(y, i) {
				let date_diff = timestamps[i] - start_ts,
						days_diff = 0;
				if ( date_diff > 0 ) {
					days_diff = date_diff/(1000*60*60*24);
				}
				points_string += (days_diff * px_per_day) + ',' + (start_height - (y - min_breakpoint_value) * koef) + ' ';
			});

			points_string.trim();

			let $chart_line = self.createElementNS(xmlns, 'polyline', {
													points: points_string
												},
												{
													fill: 'transparent', 
													stroke: chart.color,
													'stroke-width': 2
												});

			$group_charts.appendChild($chart_line);
		});

		$svg_main.appendChild($group_charts);	
	}

	function drawScrollCharts() {
		// console.log(charts);
		let $app__scroll_svg = document.getElementById(id_prefix + '__scroll-svg'),
				$group_charts = self.createElementNS(xmlns, 'g'),
				app__scroll_svg_params = $app__scroll_svg.getBoundingClientRect(),
				start_height = app__scroll_svg_params.height,
				px_scroll_per_day = app__scroll_svg_params.width / timestamps.length,
				koef_scroll = start_height/max_value_abs;

		charts.forEach(function(chart) {
			let points_string = '',
					start_ts = timestamps[0];
			chart.column.forEach(function(y, i) {
				let date_diff = timestamps[i] - start_ts,
						days_diff = 0;
				if ( date_diff > 0 ) {
					days_diff = date_diff/(1000*60*60*24);
				}
				points_string += (days_diff * px_scroll_per_day) + ',' + (start_height - (y * koef_scroll)) + ' ';
			});

			points_string.trim();

			let $chart_line = self.createElementNS(xmlns, 'polyline', {
													points: points_string
												},
												{
													fill: 'transparent', 
													stroke: chart.color,
													'stroke-width': 1
												});

			$group_charts.appendChild($chart_line);
		});

		$app__scroll_svg.appendChild($group_charts);	
	}

	function drawChartsSwitchers() {
		let $app__switchers = document.getElementById(id_prefix + '__switchers');

		charts.forEach(function(chart) {
			// console.log(chart);
			let $chart_switcher = self.createElementNS(null, 'div', {
													class: id_prefix + '-switcher checked'
												}),
					$chart_switcher__chbox = self.createElementNS(null, 'span', {
													class: id_prefix + '-switcher__chbox'
												},
												{
													'background-color': chart.color,
													'border': '2px solid ' + chart.color,
												}),
					$checkmark = self.createElementNS(xmlns, 'svg', {
													class: 'checkmark'
												}),
					$checkmark_line = self.createElementNS(xmlns, 'polyline', {
															points: '4,8 7,11 12,5'
														},
														{
															fill: 'transparent',
															stroke: 'white',
															'stroke-width': 1.5,
															'stroke-linecap': 'square'
														}),
					$chart_switcher__name = self.createElementNS(null, 'span', {
													class: id_prefix + '-switcher__name'
												});

			$chart_switcher__name.innerHTML = chart.name;

			$checkmark.appendChild($checkmark_line);
			$chart_switcher__chbox.appendChild($checkmark);
			$chart_switcher.appendChild($chart_switcher__chbox);
			$chart_switcher.appendChild($chart_switcher__name);
			$app__switchers.appendChild($chart_switcher);
		});
	}

	function createEvents() {
		let $chart_switchers = document.querySelectorAll('.app-switcher');

		$chart_switchers.forEach(function($switcher) {
			$switcher.addEventListener('click', function(e) {
				let $checked = document.querySelectorAll('.app-switcher.checked');
				
				if( $switcher.classList.contains('checked') ) {
					if( $checked.length > 1 ) {
						$switcher.classList.remove('checked');
						onChartSelectChange(document.querySelectorAll('.app-switcher.checked'));
					}
				} else {
					$switcher.classList.add('checked');
					onChartSelectChange(document.querySelectorAll('.app-switcher.checked'));
				}

				$checked = document.querySelectorAll('.app-switcher.checked');
				if( $checked.length === 1 ) {
					$checked[0].classList.add('disabled');
				} else {
					$checked.forEach(function($switcher) {
						$switcher.classList.remove('disabled');
					});
				}
			});
		});	


	}

	function onChartSelectChange($checked) {	
		console.log($checked);
	}

	constructor(settings);
}